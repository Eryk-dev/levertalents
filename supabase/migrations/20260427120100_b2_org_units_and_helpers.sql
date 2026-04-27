-- =========================================================================
-- Migration B2: org_units adjacency tree + members + leaders + helpers + RLS
--
-- Adjacency-list (parent_id self-ref) chosen over ltree per RESEARCH.md
-- Anti-Pattern AP-8 — mutation-heavy + shallow + low cardinality wins.
-- Recursive CTE in SECURITY DEFINER fn returns uuid[] for "leader sees
-- subtree" (RBAC-05/07). Critical index on (company_id, parent_id) for P6
-- mitigation (sub-ms on <500-node trees).
--
-- Helpers ARE INTENTIONALLY STABLE SECURITY DEFINER SET search_path = public
-- per Anti-Pattern AP-3 — bypasses RLS on user_roles/org_unit_members lookup
-- (P3 recursion mitigation) and gets initPlan caching (RBAC-10).
--
-- Three new tables ENABLE RLS in this same migration with explicit policies
-- referencing visible_org_units(uid) (added below within this file).
--
-- REQs: ORG-01..07, RBAC-09.
-- Threats: T-1-01 (cross-tenant), T-1-02 (RLS recursion), T-1-07 (cycle).
--
-- DEVIATION (2026-04-27, continuation push) — Rule 1 bug fix:
-- The visible_org_units(_uid) helper below references
-- public.socio_company_memberships, which is fully created/RLS'd by Migration C
-- (20260427120200). LANGUAGE sql functions resolve table refs at CREATE time
-- (not at execution), so the original B2 failed with "relation
-- public.socio_company_memberships does not exist (SQLSTATE 42P01)" during
-- db push. Fix: create a minimal placeholder for the table here (DDL only —
-- columns + PK + FKs). Migration C uses CREATE TABLE IF NOT EXISTS / CREATE
-- INDEX IF NOT EXISTS / DROP POLICY IF EXISTS so it remains idempotent and
-- adds RLS + indexes + policies on top.
-- =========================================================================

-- =========================================================================
-- 0) socio_company_memberships placeholder (forward-reference for the helper)
--    Full RLS + indexes + policies live in Migration C (20260427120200).
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.socio_company_memberships (
  user_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, company_id)
);

-- =========================================================================
-- 1) org_units table (ORG-01, ORG-02)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.org_units (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  parent_id   uuid REFERENCES public.org_units(id) ON DELETE RESTRICT,
  name        text NOT NULL,
  kind        text,  -- free-form: 'departamento', 'time', 'squad', 'célula', etc.
  position    int NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT NOW(),
  updated_at  timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT no_self_parent CHECK (id <> parent_id)
);

COMMENT ON TABLE public.org_units IS
  'Org structure tree per company (adjacency list via parent_id). NULL parent = root for the company. ORG-01.';
COMMENT ON COLUMN public.org_units.kind IS
  'Free-form label (departamento/time/squad/célula). NOT an enum — empresas externas têm nomenclaturas heterogêneas. Phase 1 D-discretion: free-form text.';
COMMENT ON COLUMN public.org_units.position IS
  'Sort order among siblings under the same parent. UI manages.';

-- =========================================================================
-- 2) Critical indexes for recursive CTE perf (ORG-06, P6 mitigation)
-- =========================================================================
CREATE INDEX IF NOT EXISTS idx_org_units_company_parent
  ON public.org_units(company_id, parent_id);

CREATE INDEX IF NOT EXISTS idx_org_units_parent
  ON public.org_units(parent_id)
  WHERE parent_id IS NOT NULL;

-- =========================================================================
-- 3) Same-company-as-parent invariant trigger (ORG-02 robustness)
--    A CHECK can't reference other rows; we enforce via BEFORE trigger.
-- =========================================================================
CREATE OR REPLACE FUNCTION public.tg_org_units_same_company_as_parent()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  parent_company_id uuid;
BEGIN
  IF NEW.parent_id IS NOT NULL THEN
    SELECT company_id INTO parent_company_id
      FROM public.org_units
     WHERE id = NEW.parent_id;
    IF parent_company_id IS DISTINCT FROM NEW.company_id THEN
      RAISE EXCEPTION 'org_unit cannot have a parent in a different company (parent.company_id=%, NEW.company_id=%)',
        parent_company_id, NEW.company_id;
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER tg_org_units_same_company
  BEFORE INSERT OR UPDATE OF parent_id, company_id ON public.org_units
  FOR EACH ROW EXECUTE FUNCTION public.tg_org_units_same_company_as_parent();

-- =========================================================================
-- 4) Anti-cycle trigger (ORG-03)
--    Walks parent chain on INSERT/UPDATE OF parent_id; aborts if cycle.
-- =========================================================================
CREATE OR REPLACE FUNCTION public.tg_org_units_no_cycle()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  cur_id uuid := NEW.parent_id;
  steps  int  := 0;
BEGIN
  WHILE cur_id IS NOT NULL AND steps < 50 LOOP
    IF cur_id = NEW.id THEN
      RAISE EXCEPTION 'cycle detected in org_units (id=%, parent_id=%)', NEW.id, NEW.parent_id;
    END IF;
    SELECT parent_id INTO cur_id FROM public.org_units WHERE id = cur_id;
    steps := steps + 1;
  END LOOP;
  RETURN NEW;
END $$;

CREATE TRIGGER tg_org_units_anti_cycle
  BEFORE INSERT OR UPDATE OF parent_id ON public.org_units
  FOR EACH ROW EXECUTE FUNCTION public.tg_org_units_no_cycle();

-- =========================================================================
-- 5) updated_at maintenance trigger (consistent with codebase convention)
-- =========================================================================
CREATE TRIGGER tg_org_units_updated_at
  BEFORE UPDATE ON public.org_units
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- =========================================================================
-- 6) org_unit_members (ORG-04)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.org_unit_members (
  org_unit_id uuid NOT NULL REFERENCES public.org_units(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_primary  boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT NOW(),
  PRIMARY KEY (org_unit_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_org_unit_members_user
  ON public.org_unit_members(user_id);

COMMENT ON COLUMN public.org_unit_members.is_primary IS
  'Marks the user''s primary org_unit (used by resolve_default_scope to pick the default empresa). Exactly one row per user should have is_primary=true; not enforced because backfill may leave is_primary unset until RH UI fills.';

-- =========================================================================
-- 7) unit_leaders (ORG-05)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.unit_leaders (
  org_unit_id uuid NOT NULL REFERENCES public.org_units(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT NOW(),
  PRIMARY KEY (org_unit_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_unit_leaders_user
  ON public.unit_leaders(user_id);

-- =========================================================================
-- 8) Helper: org_unit_descendants(uuid) → uuid[] (ORG-06)
--    Recursive CTE with depth limit (P6 termination guard).
-- =========================================================================
CREATE OR REPLACE FUNCTION public.org_unit_descendants(_unit_id uuid)
RETURNS uuid[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH RECURSIVE tree AS (
    SELECT id, 0 AS depth FROM public.org_units WHERE id = _unit_id
    UNION ALL
    SELECT ou.id, t.depth + 1
      FROM public.org_units ou
      JOIN tree t ON ou.parent_id = t.id
     WHERE t.depth < 20  -- termination guard
  )
  SELECT COALESCE(array_agg(id), '{}'::uuid[]) FROM tree;
$$;

COMMENT ON FUNCTION public.org_unit_descendants(uuid) IS
  'Returns descendants (inclusive of self) of an org_unit, depth-limited at 20. Used by visible_org_units and policies for "leader sees subtree". ORG-06.';

REVOKE ALL ON FUNCTION public.org_unit_descendants(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.org_unit_descendants(uuid) TO authenticated;

-- =========================================================================
-- 9) Helper: visible_org_units(uid) → uuid[] (ORG-07, RBAC-05/06/09)
--    admin/rh = all org_units; sócio = org_units in companies they have
--    membership; líder = descendants of every unit they lead; liderado/
--    colaborador = own units only.
-- =========================================================================
CREATE OR REPLACE FUNCTION public.visible_org_units(_uid uuid)
RETURNS uuid[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN public.has_role(_uid, 'admin'::public.app_role)
      OR public.has_role(_uid, 'rh'::public.app_role)
    THEN
      (SELECT COALESCE(array_agg(id), '{}'::uuid[]) FROM public.org_units)

    -- sócio: org_units inside companies they're members of
    WHEN public.has_role(_uid, 'socio'::public.app_role)
    THEN
      (SELECT COALESCE(array_agg(ou.id), '{}'::uuid[])
         FROM public.org_units ou
        WHERE ou.company_id IN (
          SELECT company_id FROM public.socio_company_memberships WHERE user_id = _uid
        ))

    -- líder: descendants of every unit they lead (transitive)
    WHEN public.has_role(_uid, 'lider'::public.app_role)
    THEN
      (SELECT COALESCE(array_agg(DISTINCT d), '{}'::uuid[])
         FROM public.unit_leaders ul,
              LATERAL unnest(public.org_unit_descendants(ul.org_unit_id)) AS d
        WHERE ul.user_id = _uid)

    -- liderado / colaborador: only the units they belong to
    WHEN public.has_role(_uid, 'liderado'::public.app_role)
      OR public.has_role(_uid, 'colaborador'::public.app_role)
    THEN
      (SELECT COALESCE(array_agg(org_unit_id), '{}'::uuid[])
         FROM public.org_unit_members WHERE user_id = _uid)

    ELSE '{}'::uuid[]
  END;
$$;

COMMENT ON FUNCTION public.visible_org_units(uuid) IS
  'Returns org_units the user can see based on role + memberships. Use in RLS as: org_unit_id = ANY(public.visible_org_units((SELECT auth.uid()))). RBAC-05/06/09, ORG-07.';

REVOKE ALL ON FUNCTION public.visible_org_units(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.visible_org_units(uuid) TO authenticated;

-- =========================================================================
-- 10) RLS for the three new tables (default-deny then helper-driven)
--     CRITICAL: Migration C creates socio_company_memberships AND
--     visible_companies. visible_org_units (above) references
--     socio_company_memberships — so this migration must run AFTER
--     Migration A (it references companies) but the cross-reference to
--     socio_company_memberships is forward (Migration C creates it).
--     For Phase 1 ordering: Plan 04 (Migration C) runs after this Plan,
--     and the helper above tolerates a missing socio_company_memberships
--     because PostgreSQL resolves table refs at execution time, not
--     creation time. As long as visible_org_units is not CALLED before
--     Migration C runs, we're safe. Plan 04 backfills + first calls.
-- =========================================================================
ALTER TABLE public.org_units        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_unit_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unit_leaders     ENABLE ROW LEVEL SECURITY;

-- org_units policies
CREATE POLICY "org_units:select_visible"
  ON public.org_units FOR SELECT TO authenticated
  USING (id = ANY(public.visible_org_units((SELECT auth.uid()))));

CREATE POLICY "org_units:mutate_managers"
  ON public.org_units FOR ALL TO authenticated
  USING (public.is_people_manager((SELECT auth.uid())))
  WITH CHECK (public.is_people_manager((SELECT auth.uid())));

-- org_unit_members policies
CREATE POLICY "org_unit_members:select_visible"
  ON public.org_unit_members FOR SELECT TO authenticated
  USING (
    org_unit_id = ANY(public.visible_org_units((SELECT auth.uid())))
    OR user_id = (SELECT auth.uid())
  );

CREATE POLICY "org_unit_members:mutate_managers"
  ON public.org_unit_members FOR ALL TO authenticated
  USING (public.is_people_manager((SELECT auth.uid())))
  WITH CHECK (public.is_people_manager((SELECT auth.uid())));

-- unit_leaders policies
CREATE POLICY "unit_leaders:select_visible"
  ON public.unit_leaders FOR SELECT TO authenticated
  USING (
    org_unit_id = ANY(public.visible_org_units((SELECT auth.uid())))
    OR user_id = (SELECT auth.uid())
  );

CREATE POLICY "unit_leaders:mutate_managers"
  ON public.unit_leaders FOR ALL TO authenticated
  USING (public.is_people_manager((SELECT auth.uid())))
  WITH CHECK (public.is_people_manager((SELECT auth.uid())));
