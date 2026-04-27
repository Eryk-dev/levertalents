---
phase: 1
plan: 03
type: execute
wave: 1
depends_on: [02]
files_modified:
  - supabase/migrations/20260427120050_b1_alter_app_role_add_liderado.sql
  - supabase/migrations/20260427120100_b2_org_units_and_helpers.sql
autonomous: true
requirements: [ORG-01, ORG-02, ORG-03, ORG-04, ORG-05, ORG-06, ORG-07, RBAC-09]
---

# Plan 03: Migration B — `org_units` Tree + Helpers + Anti-Cycle

<objective>
Ship Migration B: introduce the `org_units` adjacency-list tree (`parent_id` self-ref per company), `org_unit_members`, and `unit_leaders` tables. Add the SECURITY DEFINER helpers `org_unit_descendants(unit_id)` and `visible_org_units(uid)` that power the recursive-CTE queries used by RLS. Anti-cycle BEFORE INSERT/UPDATE trigger and same-company-as-parent invariant trigger. Critical indexes (`idx_org_units_company_parent`, `idx_org_units_parent`) for sub-ms recursive CTE performance (P6 mitigation). Also adds `'liderado'` to the `app_role` enum (RBAC-01) — split into a separate prep file because `ALTER TYPE ADD VALUE` cannot run inside a transaction (RESEARCH.md Pitfall 6).
</objective>

<requirements_addressed>
- **ORG-01**: `org_units` table created with `(id, company_id, parent_id, name, kind)` plus `position` and timestamps (adjacency list).
- **ORG-02**: `parent_id` is self-referential FK; root rows have `parent_id IS NULL`; `CHECK (id <> parent_id)` constraint.
- **ORG-03**: BEFORE INSERT/UPDATE trigger `tg_org_units_no_cycle` walks parent chain and rejects circular references.
- **ORG-04**: `org_unit_members(org_unit_id, user_id, is_primary)` table.
- **ORG-05**: `unit_leaders(org_unit_id, user_id)` table.
- **ORG-06**: `org_unit_descendants(uuid) RETURNS uuid[]` recursive CTE function.
- **ORG-07**: Helper `visible_org_units(uid)` uses `org_unit_descendants` to give líder transitive access to subtree.
- **RBAC-09**: All three new tables have RLS enabled; helpers are `STABLE SECURITY DEFINER SET search_path = public` per Pitfall AP-3.
</requirements_addressed>

<threat_model>
- **T-1-01 (HIGH) — Cross-tenant data leakage:** All three new tables (`org_units`, `org_unit_members`, `unit_leaders`) ship with `ENABLE ROW LEVEL SECURITY` + explicit policies in the SAME migration. No default-allow gap. Policies use `visible_org_units((SELECT auth.uid()))` (added in same migration).
- **T-1-02 (HIGH) — RLS recursion / privilege bypass:** Helpers are `STABLE SECURITY DEFINER SET search_path = public` (verified by pgTAP test 001-helpers-smoke.sql). Use `(SELECT auth.uid())` initPlan caching. `SECURITY DEFINER` bypasses RLS on `user_roles` lookup tables — eliminates recursive policy evaluation (P3 mitigation).
- **T-1-07 (LOW) — Cycle in org_units parent_id chain:** Mitigated by `tg_org_units_no_cycle` BEFORE INSERT/UPDATE trigger that walks parent chain (max 50 steps) and rejects circularity. pgTAP test `004-anti-cycle-trigger.sql` (Plan 01) verifies.
- **T-1-02 sub-threat (P6 — performance):** Recursive CTE on `org_units` blow-up if no index. Mitigated by `idx_org_units_company_parent` and partial `idx_org_units_parent`. CTE has `WHERE depth < 20` termination guard.
</threat_model>

<tasks>

<task id="03-01">
<action>
Create `supabase/migrations/20260427120050_b1_alter_app_role_add_liderado.sql` to add the `'liderado'` enum value SEPARATELY from Migration B. Per RESEARCH.md Pitfall 6 (lines 1894-1899), `ALTER TYPE ... ADD VALUE` cannot run inside a transaction block, so this MUST be its own migration file (Supabase CLI applies migrations serially and uses an outer transaction by default for each migration; small standalone files are the workaround).

Per RESEARCH.md Open Question Q1 (lines 2171-2178), `'liderado'` is added as a NEW value coexisting with `'colaborador'`. The contract phase G (Phase 4) will rename and migrate; Phase 1 keeps both valid.

Exact content:

```sql
-- =========================================================================
-- Migration B1: Add 'liderado' to app_role enum
--
-- Standalone file because ALTER TYPE ADD VALUE cannot run inside a
-- transaction block (Postgres limitation; Supabase CLI wraps each migration
-- file in BEGIN/COMMIT). Splitting B into B1 (this) and B2 (org_units +
-- helpers) avoids the rollback-on-error trap documented in RESEARCH.md
-- Pitfall 6.
--
-- Coexistence per Open Question Q1 (RESEARCH.md): 'colaborador' stays valid
-- in Phase 1; helpers in Migration B2 treat both as synonymous. Phase 4
-- (Migration G) renames colaborador → liderado as the contract phase.
--
-- REQ: RBAC-01 (5 fixed roles; this enables 'liderado').
-- =========================================================================
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'liderado';
```

Use the timestamp `20260427120050` (between Migration A's `20260427120000` and Migration B2's `20260427120100`).
</action>
<read_first>
- `supabase/migrations/20251009205119_*.sql` — original `app_role` enum creation. Confirms current values: `socio, lider, rh, colaborador, admin`.
- `.planning/phases/01-tenancy-backbone/01-RESEARCH.md` lines 1894-1899 — Pitfall 6 explanation.
- `.planning/phases/01-tenancy-backbone/01-RESEARCH.md` lines 2171-2178 — Open Question Q1 recommendation (coexistence path).
- Quick grep `grep -rn "'colaborador'" supabase/migrations/ | head -5` — confirms current usage.
</read_first>
<acceptance_criteria>
- File `supabase/migrations/20260427120050_b1_alter_app_role_add_liderado.sql` exists.
- File contains EXACTLY one DDL line: `ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'liderado';` (plus header comment).
- File does NOT contain `BEGIN;` or `COMMIT;` (Supabase wraps automatically; explicit transactions break this DDL).
- File does NOT contain any other DDL or DML.
- File starts with header comment block (`-- =========================================================================`).
</acceptance_criteria>
<files>
- `supabase/migrations/20260427120050_b1_alter_app_role_add_liderado.sql`
</files>
<automated>
test -f supabase/migrations/20260427120050_b1_alter_app_role_add_liderado.sql && grep -q "ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'liderado'" supabase/migrations/20260427120050_b1_alter_app_role_add_liderado.sql && ! grep -E "^(BEGIN|COMMIT)" supabase/migrations/20260427120050_b1_alter_app_role_add_liderado.sql
</automated>
</task>

<task id="03-02">
<action>
Create `supabase/migrations/20260427120100_b2_org_units_and_helpers.sql` containing the org_units tree, members/leaders tables, anti-cycle and same-company-as-parent triggers, two helper functions, RLS enablement, and policies.

This is the largest single migration of Phase 1. Use the analog from `supabase/migrations/20260422130000_align_admin_role_policies.sql` (lines 14-32 for helper shape; lines 35-49 for policy rewrite pattern). The helper `visible_org_units` mirrors the structure of existing `allowed_companies` (`20260416193100_hiring_rls_policies.sql` lines 14-33) but with five role branches and recursive descendants traversal for líder.

Exact content:

```sql
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
-- =========================================================================

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
```

**Pattern notes (from PATTERNS.md):**
- Use lowercase `uuid`, `text`, `boolean`, `timestamptz` (PATTERNS.md anti-pattern: avoid uppercase `UUID[]`).
- Use `LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public` modifier order — exactly matches `is_people_manager` analog (lines 14-32 of `20260422130000_align_admin_role_policies.sql`).
- Use `_uid uuid` parameter naming (leading underscore convention from analog).
- Use `(SELECT auth.uid())` everywhere (RBAC-10 initPlan caching, NOT bare `auth.uid()`).
- Policy naming `<table>:<action>:<role>` style.
- `REVOKE ALL ... FROM PUBLIC` + `GRANT EXECUTE ... TO authenticated` after each helper (Pattern 1 from PATTERNS.md, RESEARCH.md line 1336-1337).

**DO NOT push the migration in this task** — push happens in Plan 04 task 04-05 (single batched push covering A+B1+B2+C). This task only writes the file.
</action>
<read_first>
- `supabase/migrations/20260422130000_align_admin_role_policies.sql` lines 14-50 — analog for helper signature, comment style, policy DROP/CREATE pattern.
- `supabase/migrations/20260416193100_hiring_rls_policies.sql` lines 14-33 — `allowed_companies` analog for the `RETURNS uuid[]` + CASE chain shape.
- `supabase/migrations/20260416193000_hiring_core_entities.sql` — analog for `ENABLE ROW LEVEL SECURITY` immediately after `CREATE TABLE` pattern.
- `.planning/phases/01-tenancy-backbone/01-RESEARCH.md` lines 322-580 — full Pattern 1 (RLS helpers) and Pattern 2 (org_units schema + triggers).
- `.planning/phases/01-tenancy-backbone/01-PATTERNS.md` lines 132-189 — analog references for helper functions and triggers.
- Quick grep `grep -n "CREATE TRIGGER tg_set_updated_at" supabase/migrations/*.sql | head -3` — confirms `tg_set_updated_at()` helper already exists in earlier migrations.
- Quick grep `grep -n "REFERENCES public.profiles" supabase/migrations/*.sql | head -3` — confirms `profiles` table is the canonical FK target (not `auth.users`).
</read_first>
<acceptance_criteria>
- File `supabase/migrations/20260427120100_b2_org_units_and_helpers.sql` exists.
- File contains `CREATE TABLE IF NOT EXISTS public.org_units` with columns: `id`, `company_id`, `parent_id`, `name`, `kind`, `position`, `created_at`, `updated_at`.
- File contains `CONSTRAINT no_self_parent CHECK (id <> parent_id)`.
- File contains `CREATE INDEX IF NOT EXISTS idx_org_units_company_parent` on `(company_id, parent_id)`.
- File contains `CREATE INDEX IF NOT EXISTS idx_org_units_parent` partial (`WHERE parent_id IS NOT NULL`).
- File contains `CREATE OR REPLACE FUNCTION public.tg_org_units_no_cycle()` with `LANGUAGE plpgsql`.
- File contains `CREATE TRIGGER tg_org_units_anti_cycle BEFORE INSERT OR UPDATE OF parent_id ON public.org_units`.
- File contains `CREATE OR REPLACE FUNCTION public.tg_org_units_same_company_as_parent()` and corresponding trigger.
- File contains `CREATE TABLE IF NOT EXISTS public.org_unit_members` with PK `(org_unit_id, user_id)` and `is_primary boolean NOT NULL DEFAULT false`.
- File contains `CREATE TABLE IF NOT EXISTS public.unit_leaders` with PK `(org_unit_id, user_id)`.
- File contains `CREATE OR REPLACE FUNCTION public.org_unit_descendants(_unit_id uuid) RETURNS uuid[]` with `LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public`.
- File contains the recursive CTE (`WITH RECURSIVE tree AS`) with `WHERE t.depth < 20` termination guard.
- File contains `CREATE OR REPLACE FUNCTION public.visible_org_units(_uid uuid) RETURNS uuid[]` with same modifier order.
- File contains the 5-branch CASE (admin OR rh / sócio / líder / liderado OR colaborador / ELSE).
- File contains `ALTER TABLE public.org_units ENABLE ROW LEVEL SECURITY` and same for `org_unit_members` and `unit_leaders`.
- File contains 6 policies total (2 per new table — select_visible, mutate_managers).
- File contains `REVOKE ALL ON FUNCTION ... FROM PUBLIC` and `GRANT EXECUTE ON FUNCTION ... TO authenticated` for both new helpers.
- File uses `(SELECT auth.uid())` everywhere — `grep -c "(SELECT auth.uid())"` returns ≥ 6, and `grep -E "[^(]auth\.uid\(\)[^)]"` returns 0 matches (no bare `auth.uid()`).
- File does NOT contain uppercase `UUID[]`.
- File contains `REFERENCES public.profiles(id) ON DELETE CASCADE` (not `auth.users`).
</acceptance_criteria>
<files>
- `supabase/migrations/20260427120100_b2_org_units_and_helpers.sql`
</files>
<automated>
F=supabase/migrations/20260427120100_b2_org_units_and_helpers.sql && test -f $F && grep -q "CREATE TABLE IF NOT EXISTS public.org_units" $F && grep -q "tg_org_units_no_cycle" $F && grep -q "RECURSIVE tree" $F && grep -q "depth < 20" $F && grep -q "visible_org_units" $F && grep -q "org_unit_descendants" $F && grep -q "ENABLE ROW LEVEL SECURITY" $F && grep -q "REVOKE ALL ON FUNCTION" $F && grep -q "GRANT EXECUTE ON FUNCTION" $F && [ "$(grep -c '(SELECT auth.uid())' $F)" -ge 6 ] && ! grep -E '[^(]auth\.uid\(\)[^)]' $F && ! grep -q 'UUID\[\]' $F
</automated>
</task>

</tasks>

<verification>
1. Both migration files exist:
   - `supabase/migrations/20260427120050_b1_alter_app_role_add_liderado.sql`
   - `supabase/migrations/20260427120100_b2_org_units_and_helpers.sql`
2. B1 contains only the enum addition (no transaction blocks).
3. B2 contains: 3 tables (org_units, org_unit_members, unit_leaders), 4 indexes, 2 trigger functions + 3 triggers, 2 helper functions, 6 RLS policies, RLS enablement on all 3 tables.
4. Anti-pattern grep clean:
   - `grep -E '[^(]auth\.uid\(\)[^)]' supabase/migrations/20260427120100_*.sql` returns 0 (no bare auth.uid()).
   - `grep -q 'UUID\[\]' supabase/migrations/20260427120100_*.sql` returns no match.
5. Helper signatures match analogs: `LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public`.
6. Indexes for P6 mitigation are present: `idx_org_units_company_parent` and `idx_org_units_parent`.
7. Anti-cycle trigger walks parent chain with `steps < 50` guard.

Push happens in Plan 04 (which depends on this plan). pgTAP tests `003-org-unit-descendants.sql` and `004-anti-cycle-trigger.sql` (Plan 01) will validate behavior after push.
</verification>

<must_haves>
- `app_role` enum contains the value `'liderado'` (added separately in B1 to avoid transaction-block error).
- `org_units` table exists with adjacency-list shape (`parent_id` self-ref) and `(company_id, parent_id)` index.
- `org_unit_members` table exists with `is_primary` flag for default-scope resolution.
- `unit_leaders` table exists.
- Anti-cycle trigger `tg_org_units_anti_cycle` fires BEFORE INSERT OR UPDATE OF parent_id and walks the parent chain with depth-50 cap.
- Same-company-as-parent trigger blocks cross-company parent assignments.
- `org_unit_descendants(uuid) RETURNS uuid[]` runs a recursive CTE with depth-20 cap.
- `visible_org_units(uuid) RETURNS uuid[]` returns role-filtered org_unit ids; admin/rh see all, sócio sees membership companies' units, líder sees lateral subtree, liderado/colaborador see own units.
- Both helpers are `STABLE SECURITY DEFINER SET search_path = public`.
- RLS enabled + 2 policies per new table (select_visible, mutate_managers).
- REVOKE ALL FROM PUBLIC + GRANT EXECUTE TO authenticated on both new functions.
- All policies use `(SELECT auth.uid())` initPlan idiom.
</must_haves>

<success_criteria>
- Both migration files (`B1` enum addition, `B2` org_units + helpers) parseable PostgreSQL.
- File ordering correct (B1 before B2 by timestamp).
- B2 contains: 3 CREATE TABLE blocks, 4 CREATE INDEX, 3 CREATE TRIGGER (anti_cycle, same_company, updated_at), 2 trigger function CREATE OR REPLACE, 2 helper function CREATE OR REPLACE, 6 CREATE POLICY blocks, 3 ALTER TABLE ... ENABLE ROW LEVEL SECURITY.
- Helpers callable as `SELECT public.org_unit_descendants(uuid)` and `SELECT public.visible_org_units(uuid)` (signature matches expected).
- After Plan 04 push, pgTAP tests `001-helpers-smoke.sql`, `003-org-unit-descendants.sql`, `004-anti-cycle-trigger.sql` (created in Plan 01) all pass.
- No anti-patterns: bare `auth.uid()` absent, uppercase `UUID[]` absent, inline EXISTS for tenant scoping absent.
</success_criteria>
</content>
</invoke>