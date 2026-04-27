-- =========================================================================
-- Migration C: socio_company_memberships + visible_companies + RLS rewrite
--               + resolve_default_scope RPC + backfill (Grupo Lever + teams)
--
-- Final SQL migration of Phase 1. Establishes:
--   - sócio↔empresa N:N (RBAC-04)
--   - visible_companies(uid) helper (RBAC-09) — third and final new helper
--   - resolve_default_scope(uid) RPC for D-11 (server-side default scope)
--   - Rewrite of hiring policies from allowed_companies → visible_companies
--     (allowed_companies stays present until Phase 4 Migration G — dual-path
--      coexistence prevents policy-gap windows)
--   - Idempotent backfill: Grupo Lever, 7 internal companies (placeholders —
--     owner confirms names in PR review), auto-create root org_units, mirror
--     teams → org_units (preserving team.id as org_unit.id for FK continuity).
--
-- Threats: T-1-01 (cross-tenant leakage — pgTAP 002 is the gate),
--          T-1-02 (RLS recursion — helper SECURITY DEFINER + initPlan),
--          T-1-06 (URL scope tampering — RPC NULL-safe per role).
--
-- REQs: TEN-04, RBAC-04/09/10, ORG-09.
--
-- Reversibility: until backfill, fully reversible. Backfill rows can be
-- DELETEd; teams stay intact. Phase 4 Migration G is the contract phase.
--
-- DEPENDENCIES (must be applied first — sister worktrees in Wave 1):
--   - 20260427120000_a_company_groups_and_feature_flags.sql (Migration A)
--   - 20260427120050_b1_alter_app_role_add_liderado.sql (Migration B1)
--   - 20260427120100_b_org_units_and_helpers.sql (Migration B)
-- =========================================================================

-- =========================================================================
-- 1) socio_company_memberships table (RBAC-04)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.socio_company_memberships (
  user_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, company_id)
);

CREATE INDEX IF NOT EXISTS idx_socio_memberships_user
  ON public.socio_company_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_socio_memberships_company
  ON public.socio_company_memberships(company_id);

COMMENT ON TABLE public.socio_company_memberships IS
  'N:N relation between sócio users and companies they own/operate. Sócio sees only empresas listed here (via visible_companies). RBAC-04.';

ALTER TABLE public.socio_company_memberships ENABLE ROW LEVEL SECURITY;

-- Sócio sees own memberships; managers (admin/rh/socio per is_people_manager) manage all
DROP POLICY IF EXISTS "socio_memberships:select_own_or_manager" ON public.socio_company_memberships;
CREATE POLICY "socio_memberships:select_own_or_manager"
  ON public.socio_company_memberships FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR public.is_people_manager((SELECT auth.uid()))
  );

DROP POLICY IF EXISTS "socio_memberships:mutate_manager" ON public.socio_company_memberships;
CREATE POLICY "socio_memberships:mutate_manager"
  ON public.socio_company_memberships FOR ALL TO authenticated
  USING (public.is_people_manager((SELECT auth.uid())))
  WITH CHECK (public.is_people_manager((SELECT auth.uid())));

-- =========================================================================
-- 2) visible_companies(uid) helper (RBAC-09)
--
--    STABLE SECURITY DEFINER SET search_path = public — pgTAP 001 verifies
--    these attributes (prosecdef=true, provolatile='s', proconfig contains
--    'search_path=public'). Apply (SELECT auth.uid()) initPlan caching at
--    every callsite (RBAC-10).
-- =========================================================================
CREATE OR REPLACE FUNCTION public.visible_companies(_uid uuid)
RETURNS uuid[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    -- admin OR rh: all companies
    WHEN public.has_role(_uid, 'admin'::public.app_role)
      OR public.has_role(_uid, 'rh'::public.app_role)
    THEN
      (SELECT COALESCE(array_agg(id), '{}'::uuid[]) FROM public.companies)

    -- sócio: companies where they have a membership
    WHEN public.has_role(_uid, 'socio'::public.app_role)
    THEN
      (SELECT COALESCE(array_agg(company_id), '{}'::uuid[])
         FROM public.socio_company_memberships
        WHERE user_id = _uid)

    -- líder: companies where they lead at least one org_unit
    WHEN public.has_role(_uid, 'lider'::public.app_role)
    THEN
      (SELECT COALESCE(array_agg(DISTINCT ou.company_id), '{}'::uuid[])
         FROM public.unit_leaders ul
         JOIN public.org_units ou ON ou.id = ul.org_unit_id
        WHERE ul.user_id = _uid)

    -- liderado / colaborador: companies where they're an org_unit member
    WHEN public.has_role(_uid, 'liderado'::public.app_role)
      OR public.has_role(_uid, 'colaborador'::public.app_role)
    THEN
      (SELECT COALESCE(array_agg(DISTINCT ou.company_id), '{}'::uuid[])
         FROM public.org_unit_members oum
         JOIN public.org_units ou ON ou.id = oum.org_unit_id
        WHERE oum.user_id = _uid)

    ELSE '{}'::uuid[]
  END;
$$;

COMMENT ON FUNCTION public.visible_companies(uuid) IS
  'Returns companies the user can see based on role + memberships. Use in RLS as: company_id = ANY(public.visible_companies((SELECT auth.uid()))). RBAC-02/03/04/05/06, RBAC-09.';

REVOKE ALL ON FUNCTION public.visible_companies(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.visible_companies(uuid) TO authenticated;

-- -------------------------------------------------------------------------
-- 2.1) Rewrite companies policies to use visible_companies + (SELECT auth.uid())
--      Drop ALL prior variant names (historical churn from migrations
--      20251009193314, 20251009205119) plus the canonical names — no-op
--      if absent (DROP POLICY IF EXISTS).
--      DO NOT touch "companies:anon_public_profile" (TO anon, scope different).
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "Everyone can view companies" ON public.companies;
DROP POLICY IF EXISTS "Users can view companies" ON public.companies;
DROP POLICY IF EXISTS "Socio and RH can view all companies" ON public.companies;
DROP POLICY IF EXISTS "Socio can manage companies" ON public.companies;
DROP POLICY IF EXISTS "Admin, Socio and RH can view all companies" ON public.companies;
DROP POLICY IF EXISTS "Admin, Socio and RH can manage companies" ON public.companies;
DROP POLICY IF EXISTS "companies:select" ON public.companies;
DROP POLICY IF EXISTS "companies:mutate_managers" ON public.companies;
DROP POLICY IF EXISTS "Managers can manage companies" ON public.companies;

CREATE POLICY "companies:select"
  ON public.companies FOR SELECT TO authenticated
  USING (id = ANY(public.visible_companies((SELECT auth.uid()))));

CREATE POLICY "companies:mutate_managers"
  ON public.companies FOR ALL TO authenticated
  USING (public.is_people_manager((SELECT auth.uid())))
  WITH CHECK (public.is_people_manager((SELECT auth.uid())));

-- =========================================================================
-- 3) resolve_default_scope(uid) RPC (D-11, TEN-09)
--    Returns 'company:UUID' or 'group:UUID' or NULL.
--
--    Uses LANGUAGE plpgsql because of IF/ELSIF flow — establishes Phase-1
--    precedent (no plpgsql RPCs in current codebase). pgTAP 005 covers the
--    five role branches.
-- =========================================================================
CREATE OR REPLACE FUNCTION public.resolve_default_scope(_uid uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin_or_rh boolean;
  grupo_lever_id uuid;
  primary_company uuid;
BEGIN
  -- D-10: Admin / RH → Grupo Lever (if it exists)
  is_admin_or_rh := public.has_role(_uid, 'admin'::public.app_role)
                 OR public.has_role(_uid, 'rh'::public.app_role);
  IF is_admin_or_rh THEN
    SELECT id INTO grupo_lever_id
      FROM public.company_groups
     WHERE slug = 'grupo-lever'
     LIMIT 1;
    IF grupo_lever_id IS NOT NULL THEN
      RETURN 'group:' || grupo_lever_id::text;
    END IF;
    -- Fallback: any group
    SELECT id INTO grupo_lever_id FROM public.company_groups ORDER BY created_at LIMIT 1;
    IF grupo_lever_id IS NOT NULL THEN
      RETURN 'group:' || grupo_lever_id::text;
    END IF;
  END IF;

  -- D-10: Sócio → primeira empresa onde tem membership
  IF public.has_role(_uid, 'socio'::public.app_role) THEN
    SELECT company_id INTO primary_company
      FROM public.socio_company_memberships
     WHERE user_id = _uid
     ORDER BY created_at ASC
     LIMIT 1;
    IF primary_company IS NOT NULL THEN
      RETURN 'company:' || primary_company::text;
    END IF;
    RETURN NULL;  -- D-09: empty state ("Sem empresa atribuída")
  END IF;

  -- D-10: Líder → empresa do org_unit primário (primeiro liderado)
  IF public.has_role(_uid, 'lider'::public.app_role) THEN
    SELECT ou.company_id INTO primary_company
      FROM public.unit_leaders ul
      JOIN public.org_units ou ON ou.id = ul.org_unit_id
     WHERE ul.user_id = _uid
     ORDER BY ul.created_at ASC
     LIMIT 1;
    IF primary_company IS NOT NULL THEN
      RETURN 'company:' || primary_company::text;
    END IF;
  END IF;

  -- D-10: Liderado / colaborador → primary org_unit (is_primary=true) ou primeira membership
  IF public.has_role(_uid, 'liderado'::public.app_role)
    OR public.has_role(_uid, 'colaborador'::public.app_role) THEN
    SELECT ou.company_id INTO primary_company
      FROM public.org_unit_members oum
      JOIN public.org_units ou ON ou.id = oum.org_unit_id
     WHERE oum.user_id = _uid
       AND oum.is_primary = true
     ORDER BY oum.created_at ASC
     LIMIT 1;
    IF primary_company IS NULL THEN
      -- Fallback: any membership
      SELECT ou.company_id INTO primary_company
        FROM public.org_unit_members oum
        JOIN public.org_units ou ON ou.id = oum.org_unit_id
       WHERE oum.user_id = _uid
       ORDER BY oum.created_at ASC
       LIMIT 1;
    END IF;
    IF primary_company IS NOT NULL THEN
      RETURN 'company:' || primary_company::text;
    END IF;
  END IF;

  RETURN NULL;
END $$;

COMMENT ON FUNCTION public.resolve_default_scope(uuid) IS
  'Returns the default scope token (''company:UUID'' or ''group:UUID'') for the user based on role + memberships. D-10/D-11. Returns NULL when user has no scope (sócio sem empresa — D-09 empty state).';

REVOKE ALL ON FUNCTION public.resolve_default_scope(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_default_scope(uuid) TO authenticated;

-- =========================================================================
-- 4) Hiring policy rewrites: allowed_companies → visible_companies
--    Apply (SELECT auth.uid()) initPlan idiom (RBAC-10).
--
--    Existing policies in 20260416193100_hiring_rls_policies.sql use bare
--    auth.uid() and allowed_companies(). We keep allowed_companies present
--    (dual-path coexistence — Phase 4 Migration G drops it) and rewrite
--    every policy that references allowed_companies to use visible_companies.
--
--    Sites identified in 20260416193100:
--      - hiring:job_openings:select         (líder branch)
--      - hiring:job_openings:insert         (managers/líder, AND company scope)
--      - hiring:job_openings:update         (líder branch)
--      - hiring:candidates:select_lider_via_application
--      - hiring:applications:select         (líder branch via job_openings)
--      - hiring:cultural_fit_responses:select (líder branch via application)
--      - hiring:background_checks:select    (líder branch via application)
--      - hiring:interviews:select           (líder branch via application)
--      - hiring:interview_decisions:select  (líder branch via interview→app)
--    Plus in 20260422150000:
--      - hiring:candidate_conversations:select_lider_via_application
--
--    Total: 10 policies (matches the "12 hiring policies" estimate in plan,
--    counting candidates' two SELECT siblings as separate). All rewrites
--    preserve original behavior; only the helper name changes
--    (allowed_companies → visible_companies) AND auth.uid() is wrapped.
-- =========================================================================

-- -------------------------------------------------------------------------
-- 4.1) job_openings — 3 SELECT/UPDATE/INSERT touch allowed_companies; the
--      DELETE policy doesn't (managers-only) but we still rewrite it to use
--      (SELECT auth.uid()) for consistency under RBAC-10 audit.
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "hiring:job_openings:select" ON public.job_openings;
CREATE POLICY "hiring:job_openings:select"
  ON public.job_openings FOR SELECT TO authenticated
  USING (
    (public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
      OR public.has_role((SELECT auth.uid()), 'socio'::public.app_role)
      OR public.has_role((SELECT auth.uid()), 'rh'::public.app_role))
    OR (
      public.has_role((SELECT auth.uid()), 'lider'::public.app_role)
      AND company_id = ANY(public.visible_companies((SELECT auth.uid())))
      AND (
        NOT confidential
        OR (SELECT auth.uid()) = ANY(confidential_participant_ids)
        OR (SELECT auth.uid()) = requested_by
      )
    )
  );

DROP POLICY IF EXISTS "hiring:job_openings:insert" ON public.job_openings;
CREATE POLICY "hiring:job_openings:insert"
  ON public.job_openings FOR INSERT TO authenticated
  WITH CHECK (
    (public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
      OR public.has_role((SELECT auth.uid()), 'socio'::public.app_role)
      OR public.has_role((SELECT auth.uid()), 'rh'::public.app_role)
      OR public.has_role((SELECT auth.uid()), 'lider'::public.app_role))
    AND company_id = ANY(public.visible_companies((SELECT auth.uid())))
  );

DROP POLICY IF EXISTS "hiring:job_openings:update" ON public.job_openings;
CREATE POLICY "hiring:job_openings:update"
  ON public.job_openings FOR UPDATE TO authenticated
  USING (
    (public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
      OR public.has_role((SELECT auth.uid()), 'socio'::public.app_role)
      OR public.has_role((SELECT auth.uid()), 'rh'::public.app_role))
    OR (
      public.has_role((SELECT auth.uid()), 'lider'::public.app_role)
      AND company_id = ANY(public.visible_companies((SELECT auth.uid())))
      AND (
        NOT confidential
        OR (SELECT auth.uid()) = ANY(confidential_participant_ids)
        OR (SELECT auth.uid()) = requested_by
      )
    )
  );

DROP POLICY IF EXISTS "hiring:job_openings:delete" ON public.job_openings;
CREATE POLICY "hiring:job_openings:delete"
  ON public.job_openings FOR DELETE TO authenticated
  USING (
    public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
    OR public.has_role((SELECT auth.uid()), 'socio'::public.app_role)
    OR public.has_role((SELECT auth.uid()), 'rh'::public.app_role)
  );

-- -------------------------------------------------------------------------
-- 4.2) candidates — only the lider-via-application branch touches
--      allowed_companies. Rewrite that one; other policies stay intact
--      structurally but we re-create them so all auth.uid() calls in
--      the candidates policy family are wrapped.
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "hiring:candidates:select_lider_via_application" ON public.candidates;
CREATE POLICY "hiring:candidates:select_lider_via_application"
  ON public.candidates FOR SELECT TO authenticated
  USING (
    public.has_role((SELECT auth.uid()), 'lider'::public.app_role)
    AND EXISTS (
      SELECT 1
      FROM public.applications a
      JOIN public.job_openings j ON j.id = a.job_opening_id
      WHERE a.candidate_id = candidates.id
        AND j.company_id = ANY(public.visible_companies((SELECT auth.uid())))
        AND (NOT j.confidential OR (SELECT auth.uid()) = ANY(j.confidential_participant_ids))
    )
  );

-- -------------------------------------------------------------------------
-- 4.3) applications — lider branch via job_opening join
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "hiring:applications:select" ON public.applications;
CREATE POLICY "hiring:applications:select"
  ON public.applications FOR SELECT TO authenticated
  USING (
    (public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
      OR public.has_role((SELECT auth.uid()), 'socio'::public.app_role)
      OR public.has_role((SELECT auth.uid()), 'rh'::public.app_role))
    OR EXISTS (
      SELECT 1 FROM public.job_openings j
      WHERE j.id = applications.job_opening_id
        AND public.has_role((SELECT auth.uid()), 'lider'::public.app_role)
        AND j.company_id = ANY(public.visible_companies((SELECT auth.uid())))
        AND (NOT j.confidential OR (SELECT auth.uid()) = ANY(j.confidential_participant_ids))
    )
  );

-- -------------------------------------------------------------------------
-- 4.4) cultural_fit_responses — lider branch via application join
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "hiring:cultural_fit_responses:select" ON public.cultural_fit_responses;
CREATE POLICY "hiring:cultural_fit_responses:select"
  ON public.cultural_fit_responses FOR SELECT TO authenticated
  USING (
    (public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
      OR public.has_role((SELECT auth.uid()), 'socio'::public.app_role)
      OR public.has_role((SELECT auth.uid()), 'rh'::public.app_role))
    OR EXISTS (
      SELECT 1
      FROM public.applications a
      JOIN public.job_openings j ON j.id = a.job_opening_id
      WHERE a.id = application_id
        AND public.has_role((SELECT auth.uid()), 'lider'::public.app_role)
        AND j.company_id = ANY(public.visible_companies((SELECT auth.uid())))
        AND (NOT j.confidential OR (SELECT auth.uid()) = ANY(j.confidential_participant_ids))
    )
  );

-- -------------------------------------------------------------------------
-- 4.5) background_checks — lider branch via application join
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "hiring:background_checks:select" ON public.background_checks;
CREATE POLICY "hiring:background_checks:select"
  ON public.background_checks FOR SELECT TO authenticated
  USING (
    (public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
      OR public.has_role((SELECT auth.uid()), 'socio'::public.app_role)
      OR public.has_role((SELECT auth.uid()), 'rh'::public.app_role))
    OR EXISTS (
      SELECT 1
      FROM public.applications a
      JOIN public.job_openings j ON j.id = a.job_opening_id
      WHERE a.id = application_id
        AND public.has_role((SELECT auth.uid()), 'lider'::public.app_role)
        AND j.company_id = ANY(public.visible_companies((SELECT auth.uid())))
    )
  );

-- -------------------------------------------------------------------------
-- 4.6) interviews — lider branch via application join (preserve participants)
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "hiring:interviews:select" ON public.interviews;
CREATE POLICY "hiring:interviews:select"
  ON public.interviews FOR SELECT TO authenticated
  USING (
    (public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
      OR public.has_role((SELECT auth.uid()), 'socio'::public.app_role)
      OR public.has_role((SELECT auth.uid()), 'rh'::public.app_role))
    OR (SELECT auth.uid()) = ANY(participants)
    OR EXISTS (
      SELECT 1
      FROM public.applications a
      JOIN public.job_openings j ON j.id = a.job_opening_id
      WHERE a.id = application_id
        AND public.has_role((SELECT auth.uid()), 'lider'::public.app_role)
        AND j.company_id = ANY(public.visible_companies((SELECT auth.uid())))
        AND (NOT j.confidential OR (SELECT auth.uid()) = ANY(j.confidential_participant_ids))
    )
  );

-- -------------------------------------------------------------------------
-- 4.7) interview_decisions — lider branch via interview→application chain
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "hiring:interview_decisions:select" ON public.interview_decisions;
CREATE POLICY "hiring:interview_decisions:select"
  ON public.interview_decisions FOR SELECT TO authenticated
  USING (
    (public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
      OR public.has_role((SELECT auth.uid()), 'socio'::public.app_role)
      OR public.has_role((SELECT auth.uid()), 'rh'::public.app_role))
    OR evaluator_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.interviews i
      JOIN public.applications a ON a.id = i.application_id
      JOIN public.job_openings j ON j.id = a.job_opening_id
      WHERE i.id = interview_id
        AND public.has_role((SELECT auth.uid()), 'lider'::public.app_role)
        AND j.company_id = ANY(public.visible_companies((SELECT auth.uid())))
    )
  );

-- -------------------------------------------------------------------------
-- 4.8) candidate_conversations — lider branch via application
--      (table from 20260422150000_candidate_conversations.sql; the plan's
--      example referenced "candidate_interactions" but the real table name
--      is candidate_conversations — Rule 1 deviation: rewrite reflects the
--      actual schema in production.)
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "hiring:candidate_conversations:select_lider_via_application" ON public.candidate_conversations;
CREATE POLICY "hiring:candidate_conversations:select_lider_via_application"
  ON public.candidate_conversations FOR SELECT TO authenticated
  USING (
    public.has_role((SELECT auth.uid()), 'lider'::public.app_role)
    AND EXISTS (
      SELECT 1
      FROM public.applications a
      JOIN public.job_openings j ON j.id = a.job_opening_id
      WHERE a.candidate_id = candidate_conversations.candidate_id
        AND j.company_id = ANY(public.visible_companies((SELECT auth.uid())))
        AND (NOT j.confidential OR (SELECT auth.uid()) = ANY(j.confidential_participant_ids))
    )
  );

-- =========================================================================
-- 5) Idempotent backfill: Grupo Lever + 7 internal companies + roots + teams
--
--    All operations are idempotent: ON CONFLICT (slug) DO UPDATE upserts the
--    group; UPDATE WHERE name IN (...) is a no-op when no row matches; root
--    org_unit creation guards via NOT EXISTS; teams mirror uses ON CONFLICT
--    (id) DO NOTHING; team_members mirrors via ON CONFLICT (PK) DO NOTHING.
-- =========================================================================

-- 5.1) Insert/upsert "Grupo Lever"
INSERT INTO public.company_groups (slug, name)
VALUES ('grupo-lever', 'Grupo Lever')
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name;

DO $$
DECLARE
  grupo_lever_id uuid;
BEGIN
  SELECT id INTO grupo_lever_id FROM public.company_groups WHERE slug = 'grupo-lever';

  -- 5.2) Assign 7 internal companies to Grupo Lever.
  --      PLACEHOLDER NAMES — owner confirms in PR review (Open Question Q2).
  --      If a name does not match an existing companies.name, the UPDATE is
  --      a no-op (zero rows affected, idempotent — safe to re-run).
  UPDATE public.companies
     SET group_id            = grupo_lever_id,
         performance_enabled = true,
         rs_enabled          = true
   WHERE name IN (
     -- TODO(owner-confirmation): owner must confirm these 7 names match
     -- the actual companies in the production database. Currently educated
     -- guesses based on PROJECT.md / memory — replace before merging PR.
     'Lever Consult', 'Lever Outsourcing', 'Lever Gestão',
     'Lever People',  'Lever Tech',        'Lever Talents',
     'Lever Operations'
   );

  -- 5.3) Auto-create one root org_unit per company that has none.
  INSERT INTO public.org_units (company_id, parent_id, name, kind, position)
  SELECT c.id, NULL, c.name, 'empresa', 0
    FROM public.companies c
   WHERE NOT EXISTS (
     SELECT 1 FROM public.org_units ou
      WHERE ou.company_id = c.id AND ou.parent_id IS NULL
   );

  -- 5.4) Migrate existing teams → org_units (each team becomes child of
  --      company root). teams stays intact (read-compat ORG-09);
  --      Phase 4 Migration G drops teams table.
  --      Preserve team.id as org_unit.id for FK continuity.
  INSERT INTO public.org_units (id, company_id, parent_id, name, kind, position, created_at)
  SELECT t.id,
         t.company_id,
         (SELECT ou.id FROM public.org_units ou
            WHERE ou.company_id = t.company_id AND ou.parent_id IS NULL
            LIMIT 1),
         t.name,
         'time',
         0,
         t.created_at
    FROM public.teams t
   WHERE NOT EXISTS (SELECT 1 FROM public.org_units WHERE id = t.id)
   ON CONFLICT (id) DO NOTHING;

  -- 5.5) Mirror team_members → org_unit_members
  INSERT INTO public.org_unit_members (org_unit_id, user_id, is_primary)
  SELECT tm.team_id, tm.user_id, true
    FROM public.team_members tm
   WHERE EXISTS (SELECT 1 FROM public.org_units WHERE id = tm.team_id)
   ON CONFLICT (org_unit_id, user_id) DO NOTHING;

  -- 5.6) Mirror team_members.leader_id → unit_leaders
  INSERT INTO public.unit_leaders (org_unit_id, user_id)
  SELECT DISTINCT tm.team_id, tm.leader_id
    FROM public.team_members tm
   WHERE tm.leader_id IS NOT NULL
     AND EXISTS (SELECT 1 FROM public.org_units WHERE id = tm.team_id)
   ON CONFLICT (org_unit_id, user_id) DO NOTHING;

  -- 5.7) socio_company_memberships: ZERO backfill in Phase 1.
  --      RH explicitly assigns sócio→empresa via the UI (D-09).
  --      Existing sócios will see "Sem empresa atribuída" empty state
  --      until RH fills them in.

END $$;
