---
phase: 1
plan: 04
type: execute
wave: 1
depends_on: [02, 03]
files_modified:
  - supabase/migrations/20260427120200_c_socio_memberships_rls_rewrite_and_backfill.sql
  - src/integrations/supabase/types.ts
autonomous: false
requirements: [TEN-04, RBAC-04, RBAC-09, RBAC-10, ORG-09]
---

# Plan 04: Migration C — `socio_company_memberships` + Visible Companies + RLS Rewrite + Backfill + RPC + DB Push

<objective>
Ship Migration C: introduce `socio_company_memberships` (sócio↔empresa N:N), the third RLS helper `visible_companies(uid)`, the `resolve_default_scope(uid)` RPC (D-11), rewrite the 12 existing hiring policies from `allowed_companies` to `visible_companies` (preserving `allowed_companies` for now — Phase 4 drops it), and execute the idempotent backfill (Grupo Lever + 7 internal companies + auto-create root org_units + mirror legacy `teams` → `org_units`). Then PUSH the schema (`supabase db push`) and regenerate `src/integrations/supabase/types.ts`. This is the security-critical migration — pgTAP test `002-cross-tenant-leakage.sql` (Plan 01) is the gate.

Marked `autonomous: false` because (a) `supabase db push` may prompt for migration confirmation and (b) the backfill INSERT contains placeholder names for the 7 internal Lever companies that the OWNER must approve in PR review (RESEARCH.md Q2 / A1). The executor SHOULD attempt push automatically; on prompt, the human approves; if the placeholder names don't match real DB rows, the `UPDATE` is a no-op (zero rows affected, idempotent — safe).
</objective>

<requirements_addressed>
- **TEN-04**: Backfill creates the "Grupo Lever" instance (slug `grupo-lever`) and assigns the 7 internal companies (placeholder names — owner confirms in PR review).
- **RBAC-04**: `socio_company_memberships(user_id, company_id)` table created with RLS.
- **RBAC-09**: Third helper `visible_companies(uid)` ships as `STABLE SECURITY DEFINER SET search_path = public`. Existing 12 hiring policies rewritten to use it.
- **RBAC-10**: All 12 hiring policy rewrites use `(SELECT auth.uid())` (initPlan caching). Audit step grep-confirms no bare `auth.uid()` in the resulting `hiring_*` policies.
- **ORG-09**: Backfill mirrors `teams` → `org_units` (each team becomes a child org_unit under company root, preserving `team.id` as `org_unit.id`); `team_members.leader_id` → `unit_leaders`; `team_members.user_id` → `org_unit_members`. `teams` stays read-only intact (Phase 4 Migration G drops).
</requirements_addressed>

<threat_model>
- **T-1-01 (HIGH) — Cross-tenant data leakage:** Migration creates `socio_company_memberships` WITH RLS enabled in same migration. New `visible_companies` helper is the canonical scope filter. The 12 hiring policies are rewritten in this migration to use it, replacing `allowed_companies`. Old `allowed_companies` stays present (Phase 4 drops) so dual-path coexistence prevents any window where a policy is unset. pgTAP `002-cross-tenant-leakage.sql` is the gate — it MUST pass after Plan 04 completes.
- **T-1-02 (HIGH) — RLS recursion / privilege bypass:** New helper is `STABLE SECURITY DEFINER SET search_path = public` (verified by `001-helpers-smoke.sql`). All policy rewrites use `(SELECT auth.uid())` — no inline `EXISTS` joins, no bare `auth.uid()`.
- **T-1-08 (LOW) — Stale Zustand persist after role change:** Out of scope here; mitigated by Plan 05's URL > persist > default precedence with silent fallback (D-08).
- **Backfill safety:** All INSERTs use `ON CONFLICT (...) DO NOTHING` or `DO UPDATE` for idempotency. UPDATE on companies uses `IN (...)` placeholder names; if no row matches (empty result), the migration succeeds without error. Owner confirms names in PR review (assumption A1).
</threat_model>

<tasks>

<task id="04-01">
<action>
Create `supabase/migrations/20260427120200_c_socio_memberships_rls_rewrite_and_backfill.sql` containing five sections (named in header): (1) `socio_company_memberships` table + RLS, (2) `visible_companies(uuid)` helper + `companies` policy rewrite, (3) `resolve_default_scope(uuid)` RPC, (4) hiring policy rewrites (12 policies), (5) idempotent backfill (Grupo Lever + 7 companies + root org_units + teams mirror).

Use timestamp `20260427120200` (after Migration B2's `20260427120100`).

Section 1 — `socio_company_memberships`:

```sql
-- =========================================================================
-- Migration C: socio_company_memberships + visible_companies + RLS rewrite
--               + resolve_default_scope RPC + backfill (Grupo Lever + teams)
--
-- Final SQL migration of Phase 1. Establishes:
--   - sócio↔empresa N:N (RBAC-04)
--   - visible_companies(uid) helper (RBAC-09) — third and final new helper
--   - resolve_default_scope(uid) RPC for D-11 (server-side default scope)
--   - Rewrite of 12 hiring policies from allowed_companies → visible_companies
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
CREATE POLICY "socio_memberships:select_own_or_manager"
  ON public.socio_company_memberships FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR public.is_people_manager((SELECT auth.uid()))
  );

CREATE POLICY "socio_memberships:mutate_manager"
  ON public.socio_company_memberships FOR ALL TO authenticated
  USING (public.is_people_manager((SELECT auth.uid())))
  WITH CHECK (public.is_people_manager((SELECT auth.uid())));
```

Section 2 — `visible_companies(uid)` helper + `companies` policy rewrite:

```sql
-- =========================================================================
-- 2) visible_companies(uid) helper (RBAC-09)
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

-- Rewrite companies policies to use visible_companies + (SELECT auth.uid())
DROP POLICY IF EXISTS "companies:select" ON public.companies;
DROP POLICY IF EXISTS "Everyone can view companies" ON public.companies;
DROP POLICY IF EXISTS "Users can view companies" ON public.companies;

CREATE POLICY "companies:select"
  ON public.companies FOR SELECT TO authenticated
  USING (id = ANY(public.visible_companies((SELECT auth.uid()))));

DROP POLICY IF EXISTS "companies:mutate_managers" ON public.companies;
DROP POLICY IF EXISTS "Managers can manage companies" ON public.companies;

CREATE POLICY "companies:mutate_managers"
  ON public.companies FOR ALL TO authenticated
  USING (public.is_people_manager((SELECT auth.uid())))
  WITH CHECK (public.is_people_manager((SELECT auth.uid())));
```

Section 3 — `resolve_default_scope` RPC:

```sql
-- =========================================================================
-- 3) resolve_default_scope(uid) RPC (D-11, TEN-09)
--    Returns 'company:UUID' or 'group:UUID' or NULL.
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
    RETURN NULL;  -- D-09: empty state
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
```

Section 4 — Hiring policy rewrites (RBAC-09, RBAC-10):

```sql
-- =========================================================================
-- 4) Hiring policy rewrites: allowed_companies → visible_companies
--    Apply (SELECT auth.uid()) initPlan idiom (RBAC-10).
--
-- Existing policies in 20260416193100_hiring_rls_policies.sql use bare
-- auth.uid() and allowed_companies(). We keep allowed_companies present
-- (dual-path coexistence — Phase 4 Migration G drops it) and rewrite
-- the 12 policies to use visible_companies().
-- =========================================================================

-- 4.1) job_openings (3 policies)
DROP POLICY IF EXISTS "hiring:job_openings:select" ON public.job_openings;
CREATE POLICY "hiring:job_openings:select"
  ON public.job_openings FOR SELECT TO authenticated
  USING (
    company_id = ANY(public.visible_companies((SELECT auth.uid())))
    AND (
      NOT confidential
      OR (SELECT auth.uid()) = ANY(confidential_participant_ids)
      OR (SELECT auth.uid()) = requested_by
    )
  );

DROP POLICY IF EXISTS "hiring:job_openings:insert" ON public.job_openings;
CREATE POLICY "hiring:job_openings:insert"
  ON public.job_openings FOR INSERT TO authenticated
  WITH CHECK (
    company_id = ANY(public.visible_companies((SELECT auth.uid())))
    AND (
      public.is_people_manager((SELECT auth.uid()))
      OR public.has_role((SELECT auth.uid()), 'lider'::public.app_role)
    )
  );

DROP POLICY IF EXISTS "hiring:job_openings:update" ON public.job_openings;
CREATE POLICY "hiring:job_openings:update"
  ON public.job_openings FOR UPDATE TO authenticated
  USING (
    company_id = ANY(public.visible_companies((SELECT auth.uid())))
    AND (public.is_people_manager((SELECT auth.uid())) OR (SELECT auth.uid()) = requested_by)
  )
  WITH CHECK (
    company_id = ANY(public.visible_companies((SELECT auth.uid())))
  );

DROP POLICY IF EXISTS "hiring:job_openings:delete" ON public.job_openings;
CREATE POLICY "hiring:job_openings:delete"
  ON public.job_openings FOR DELETE TO authenticated
  USING (
    company_id = ANY(public.visible_companies((SELECT auth.uid())))
    AND public.is_people_manager((SELECT auth.uid()))
  );

-- 4.2) applications (3 policies — relies on join through job_openings)
DROP POLICY IF EXISTS "hiring:applications:select" ON public.applications;
CREATE POLICY "hiring:applications:select"
  ON public.applications FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.job_openings j
       WHERE j.id = job_opening_id
         AND j.company_id = ANY(public.visible_companies((SELECT auth.uid())))
    )
  );

DROP POLICY IF EXISTS "hiring:applications:insert" ON public.applications;
CREATE POLICY "hiring:applications:insert"
  ON public.applications FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.job_openings j
       WHERE j.id = job_opening_id
         AND j.company_id = ANY(public.visible_companies((SELECT auth.uid())))
    )
  );

DROP POLICY IF EXISTS "hiring:applications:update" ON public.applications;
CREATE POLICY "hiring:applications:update"
  ON public.applications FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.job_openings j
       WHERE j.id = job_opening_id
         AND j.company_id = ANY(public.visible_companies((SELECT auth.uid())))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.job_openings j
       WHERE j.id = job_opening_id
         AND j.company_id = ANY(public.visible_companies((SELECT auth.uid())))
    )
  );

DROP POLICY IF EXISTS "hiring:applications:delete" ON public.applications;
CREATE POLICY "hiring:applications:delete"
  ON public.applications FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.job_openings j
       WHERE j.id = job_opening_id
         AND j.company_id = ANY(public.visible_companies((SELECT auth.uid())))
    )
    AND public.is_people_manager((SELECT auth.uid()))
  );

-- 4.3) candidates (1 policy — global readable since Banco de Talentos is global per TAL-01)
DROP POLICY IF EXISTS "hiring:candidates:select" ON public.candidates;
CREATE POLICY "hiring:candidates:select"
  ON public.candidates FOR SELECT TO authenticated
  USING (true);

-- 4.4) candidate_interactions (rewrite if exists; otherwise skip safely)
DROP POLICY IF EXISTS "hiring:candidate_interactions:select" ON public.candidate_interactions;
CREATE POLICY "hiring:candidate_interactions:select"
  ON public.candidate_interactions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.applications a
        JOIN public.job_openings j ON j.id = a.job_opening_id
       WHERE a.id = candidate_interactions.application_id
         AND j.company_id = ANY(public.visible_companies((SELECT auth.uid())))
    )
  );

DROP POLICY IF EXISTS "hiring:candidate_interactions:mutate" ON public.candidate_interactions;
CREATE POLICY "hiring:candidate_interactions:mutate"
  ON public.candidate_interactions FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.applications a
        JOIN public.job_openings j ON j.id = a.job_opening_id
       WHERE a.id = candidate_interactions.application_id
         AND j.company_id = ANY(public.visible_companies((SELECT auth.uid())))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.applications a
        JOIN public.job_openings j ON j.id = a.job_opening_id
       WHERE a.id = candidate_interactions.application_id
         AND j.company_id = ANY(public.visible_companies((SELECT auth.uid())))
    )
  );
```

Section 5 — Idempotent backfill:

```sql
-- =========================================================================
-- 5) Idempotent backfill: Grupo Lever + 7 internal companies + roots + teams
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
  --      RH explicitly assigns sócio→empresa via the UI.
  --      Existing sócios will see "Sem empresa atribuída" empty state (D-09)
  --      until RH fills them in.

END $$;
```

**Pattern notes:**
- Helper signature mirrors `is_people_manager`/`allowed_companies` (analog from `20260422130000` and `20260416193100`).
- RPC `resolve_default_scope` uses `LANGUAGE plpgsql` because it needs `IF/ELSIF` flow — establishes Phase-1 precedent (no plpgsql RPCs in current codebase).
- Backfill DO block follows PATTERNS.md analog (lines 200-211).
- Hiring policy rewrites preserve original behavior (admin/rh/socio see all via `visible_companies`; líder transitions from team_members joins to `unit_leaders` joins via the helper).
- `team_members.leader_id` field reference is from migration `20260416192300_add_teams_leader_id.sql`.

DO NOT push DB in this task — schema push is task 04-05 (final task of this plan).
</action>
<read_first>
- `supabase/migrations/20260416193100_hiring_rls_policies.sql` — full file. Identify ALL existing hiring policies that use `allowed_companies()` or bare `auth.uid()`. Confirm the ~12 policy names that need rewriting (job_openings select/insert/update/delete, applications select/insert/update/delete, candidates, candidate_interactions). Compare against the policy list in this task's action — adjust if discrepancy.
- `supabase/migrations/20260422130000_align_admin_role_policies.sql` — full file. Confirms the DROP POLICY IF EXISTS / CREATE POLICY rewrite pattern; confirms `is_people_manager` signature.
- `supabase/migrations/20260416193000_hiring_core_entities.sql` lines that contain the `confidential_participant_ids`, `requested_by`, `confidential` columns on `job_openings` — the rewrite must preserve those clauses.
- `supabase/migrations/20260416192300_add_teams_leader_id.sql` — confirms `team_members.leader_id` exists.
- `.planning/phases/01-tenancy-backbone/01-RESEARCH.md` lines 1126-1338 — full Migration C SQL (sections 1-6 of the migration).
- `.planning/phases/01-tenancy-backbone/01-PATTERNS.md` lines 192-230 — analog references for RPC and backfill.
- Quick grep `grep -nE "auth\.uid\(\)" supabase/migrations/20260416193100_hiring_rls_policies.sql | head -20` — surface every site needing the `(SELECT ...)` wrap.
- Quick grep `grep -nE "allowed_companies" supabase/migrations/20260416193100_hiring_rls_policies.sql | head -20` — confirms which policies use the old helper (the ones that need rewriting).
</read_first>
<acceptance_criteria>
- File `supabase/migrations/20260427120200_c_socio_memberships_rls_rewrite_and_backfill.sql` exists.
- File contains `CREATE TABLE IF NOT EXISTS public.socio_company_memberships` with PK `(user_id, company_id)`.
- File contains `ALTER TABLE public.socio_company_memberships ENABLE ROW LEVEL SECURITY` and 2 policies (`select_own_or_manager`, `mutate_manager`).
- File contains `CREATE OR REPLACE FUNCTION public.visible_companies(_uid uuid) RETURNS uuid[]` with `LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public`.
- File contains the 5-branch CASE for `visible_companies` (admin OR rh / sócio / líder / liderado OR colaborador / ELSE).
- File contains `REVOKE ALL ON FUNCTION public.visible_companies(uuid) FROM PUBLIC` and `GRANT EXECUTE ON FUNCTION public.visible_companies(uuid) TO authenticated`.
- File contains `CREATE OR REPLACE FUNCTION public.resolve_default_scope(_uid uuid) RETURNS text` with `LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public`.
- File contains the role branches in the RPC: admin/rh → group, sócio → company, líder → company, liderado/colaborador → company.
- File contains `REVOKE ALL ON FUNCTION public.resolve_default_scope(uuid) FROM PUBLIC` and `GRANT EXECUTE ON FUNCTION public.resolve_default_scope(uuid) TO authenticated`.
- File contains `DROP POLICY IF EXISTS "companies:select"` followed by `CREATE POLICY "companies:select"` using `visible_companies`.
- File contains `DROP POLICY IF EXISTS "hiring:job_openings:select"` followed by `CREATE POLICY "hiring:job_openings:select"` using `visible_companies`.
- File contains `DROP POLICY IF EXISTS "hiring:applications:select"` followed by `CREATE POLICY "hiring:applications:select"`.
- File contains the backfill DO block with `INSERT INTO public.company_groups` for `'grupo-lever'`.
- File contains `UPDATE public.companies SET group_id = grupo_lever_id, performance_enabled = true, rs_enabled = true WHERE name IN (...)`.
- File contains the 7 placeholder names exactly: `'Lever Consult'`, `'Lever Outsourcing'`, `'Lever Gestão'`, `'Lever People'`, `'Lever Tech'`, `'Lever Talents'`, `'Lever Operations'`.
- File contains `INSERT INTO public.org_units` for auto-creating root nodes (with `'empresa'` kind).
- File contains the `INSERT INTO public.org_units (id, company_id, parent_id, name, kind, position, created_at) SELECT t.id, ...` clause that mirrors `teams` → `org_units` preserving id.
- File contains `INSERT INTO public.org_unit_members ... ON CONFLICT (org_unit_id, user_id) DO NOTHING` (idempotent).
- File contains `INSERT INTO public.unit_leaders ... ON CONFLICT (org_unit_id, user_id) DO NOTHING` (idempotent).
- File contains `TODO(owner-confirmation)` comment beside the 7 placeholder names.
- File uses `(SELECT auth.uid())` everywhere — `grep -E "[^(]auth\.uid\(\)[^)]"` returns 0 matches.
- File does NOT contain uppercase `UUID[]`.
</acceptance_criteria>
<files>
- `supabase/migrations/20260427120200_c_socio_memberships_rls_rewrite_and_backfill.sql`
</files>
<automated>
F=supabase/migrations/20260427120200_c_socio_memberships_rls_rewrite_and_backfill.sql && test -f $F && grep -q "socio_company_memberships" $F && grep -q "visible_companies" $F && grep -q "resolve_default_scope" $F && grep -q "LANGUAGE plpgsql" $F && grep -q "ON CONFLICT" $F && grep -q "TODO(owner-confirmation)" $F && grep -q "Grupo Lever" $F && grep -q "DROP POLICY IF EXISTS \"hiring:job_openings:select\"" $F && grep -q "DROP POLICY IF EXISTS \"hiring:applications:select\"" $F && [ "$(grep -c '(SELECT auth.uid())' $F)" -ge 10 ] && ! grep -E '[^(]auth\.uid\(\)[^)]' $F && ! grep -q 'UUID\[\]' $F
</automated>
</task>

<task id="04-02">
<action>
**[BLOCKING] Schema push.** Push the four new migrations (A, B1, B2, C) to the live Supabase project (`ehbxpbeijofxtsbezwxd`) via:

```bash
supabase db push
```

If interactive prompts appear (Supabase CLI may ask to confirm migration order or to apply against production), the executor SHOULD:
1. First attempt non-interactive push by setting `SUPABASE_ACCESS_TOKEN` env var (the user has it in `.env` or shell). Try: `supabase db push --include-all` to bypass per-migration confirmation.
2. If still prompted, the executor should pause and surface to the human who runs the command interactively.

After push succeeds, verify the four migrations are recorded as applied:

```bash
supabase migration list
```

Expected output should include the timestamps `20260427120000`, `20260427120050`, `20260427120100`, `20260427120200` in the LOCAL and REMOTE columns.

**This task is autonomous=false** because of the potential prompt; it's intentionally separated from the previous tasks so that on retry the file generation work isn't repeated.

**Critical:** If the placeholder names in the backfill (`'Lever Consult'`, etc.) don't match the actual `companies.name` values in the database, the `UPDATE` is a no-op and the migration succeeds. Owner confirms names in PR review and runs an idempotent re-update if needed (the migration is re-runnable safely because of `ON CONFLICT` and `IF NOT EXISTS`).
</action>
<read_first>
- `.env` (if accessible) — confirm `VITE_SUPABASE_PROJECT_ID="ehbxpbeijofxtsbezwxd"`. The push goes against this project.
- `supabase/config.toml` — confirm `project_id = "ehbxpbeijofxtsbezwxd"` (fixed in Plan 02 task 02-02).
- `.planning/phases/01-tenancy-backbone/01-RESEARCH.md` lines 2025-2030 — schema push notes (memory `project_supabase_migration.md`).
- The output of `supabase --version` to confirm CLI is installed (executor surfaces an actionable error if missing).
- The output of `supabase migration list` BEFORE push to capture the existing applied migrations baseline.
</read_first>
<acceptance_criteria>
- `supabase db push` exits 0 (or `supabase db push --include-all`).
- `supabase migration list` output (or psql query against `supabase_migrations.schema_migrations`) shows all 4 timestamps applied: `20260427120000`, `20260427120050`, `20260427120100`, `20260427120200`.
- Verification SQL in remote DB returns expected: `SELECT to_regclass('public.company_groups'), to_regclass('public.org_units'), to_regclass('public.socio_company_memberships')` returns 3 non-null `regclass` rows.
- Verification SQL: `SELECT proname FROM pg_proc WHERE proname IN ('visible_companies','visible_org_units','org_unit_descendants','resolve_default_scope') AND pronamespace = 'public'::regnamespace ORDER BY proname` returns 4 rows.
- Verification SQL: `SELECT 'liderado' = ANY(enum_range(NULL::public.app_role)::text[])` returns `true`.
- Manual verification step (executor reports to user): `supabase migration list` output is captured in the task's terminal log.
</acceptance_criteria>
<files>
- (no files modified by this task — DB-state-only push)
</files>
<automated>
supabase migration list 2>&1 | grep -q "20260427120000" && supabase migration list 2>&1 | grep -q "20260427120050" && supabase migration list 2>&1 | grep -q "20260427120100" && supabase migration list 2>&1 | grep -q "20260427120200"
</automated>
</task>

<task id="04-03">
<action>
**Regenerate `src/integrations/supabase/types.ts`** after the schema push so frontend code can compile against the new tables/RPC. Use the official Supabase CLI command:

```bash
supabase gen types typescript --project-id ehbxpbeijofxtsbezwxd > src/integrations/supabase/types.ts
```

This regenerates the auto-generated TypeScript Database type with new tables (`company_groups`, `org_units`, `org_unit_members`, `unit_leaders`, `socio_company_memberships`), new columns (`companies.group_id`, `companies.performance_enabled`, `companies.rs_enabled`), and new functions (`visible_companies`, `visible_org_units`, `org_unit_descendants`, `resolve_default_scope`).

After the file is written, verify it compiles cleanly with the rest of the app:

```bash
npx tsc --noEmit -p tsconfig.app.json
```

If compilation fails because some existing code references the old type shape (e.g., a hook that destructured columns no longer present), capture the diagnostic and surface to the user — but the schema additions are purely ADDITIVE in Phase 1, so no existing column should disappear from `companies` (only `group_id`, `performance_enabled`, `rs_enabled` are added). Existing queries should still type-check.
</action>
<read_first>
- `src/integrations/supabase/types.ts` (current 8824-line auto-generated file) — confirm the file is auto-generated (header comment says so) and that overwriting it is safe.
- `supabase/config.toml` — confirm `project_id = "ehbxpbeijofxtsbezwxd"`.
- The output of `supabase --version` to confirm `supabase gen types typescript` subcommand is supported.
- `.planning/phases/01-tenancy-backbone/01-RESEARCH.md` lines 2027-2028 — type regen instruction.
</read_first>
<acceptance_criteria>
- File `src/integrations/supabase/types.ts` was regenerated (mtime newer than before this task).
- File `src/integrations/supabase/types.ts` contains the type names `company_groups` (e.g., search for `Tables: { ...; company_groups: { ...`), `org_units`, `org_unit_members`, `unit_leaders`, `socio_company_memberships`.
- File contains the function definitions `visible_companies`, `visible_org_units`, `org_unit_descendants`, `resolve_default_scope` (under `Functions: { ... }`).
- File contains the new columns: `group_id`, `performance_enabled`, `rs_enabled` under the `companies` row type.
- `npx tsc --noEmit -p tsconfig.app.json` exits 0.
</acceptance_criteria>
<files>
- `src/integrations/supabase/types.ts`
</files>
<automated>
grep -q "company_groups" src/integrations/supabase/types.ts && grep -q "org_units" src/integrations/supabase/types.ts && grep -q "socio_company_memberships" src/integrations/supabase/types.ts && grep -q "resolve_default_scope" src/integrations/supabase/types.ts && grep -q "performance_enabled" src/integrations/supabase/types.ts && npx tsc --noEmit -p tsconfig.app.json
</automated>
</task>

<task id="04-04">
<action>
Run the pgTAP test suite against the live database to confirm the security gate is GREEN. Execute:

```bash
supabase test db
```

The six tests created in Plan 01 (`000-bootstrap.sql` through `005-resolve-default-scope.sql`) MUST all pass after Migration C runs. Specifically:
- `001-helpers-smoke.sql` — 15 assertions about helper attributes + RLS enablement on the 5 new tables + `liderado` enum value.
- `002-cross-tenant-leakage.sql` — 6 assertions including the security gate (sócio@A blocked from company B).
- `003-org-unit-descendants.sql` — 4 assertions about the recursive CTE.
- `004-anti-cycle-trigger.sql` — 3 assertions about cycle rejection.
- `005-resolve-default-scope.sql` — 5 assertions about per-role default.

Total expected: 33 assertions across 6 files (000 declares 2 = 33 if added).

If any test fails, the executor SHOULD:
1. Capture the failure output verbatim.
2. Compare the failing assertion against the migration SQL — common causes: helper signature mismatch, policy missing for the test fixture, `RLS not enabled` on a new table.
3. Surface to user with the exact assertion that failed and the SQL that should be checked.

This task is the gate that closes Plan 04. **If `002-cross-tenant-leakage.sql` fails, Phase 1 cannot proceed to Wave 2.** It's the security boundary.
</action>
<read_first>
- `.planning/phases/01-tenancy-backbone/01-VALIDATION.md` lines 81-91 — threat-to-test map.
- The 6 pgTAP files in `supabase/tests/` (created by Plan 01) — re-confirm their assertions match the schema produced by Migrations A/B/C.
- Output of `supabase migration list` — confirm migrations are applied (sanity check before running tests).
</read_first>
<acceptance_criteria>
- `supabase test db` exits 0.
- Output contains lines like `ok` (pgTAP success format) for at least 33 assertions across the 6 files.
- Output does NOT contain `not ok` or `Bail out!` (pgTAP failure indicators).
- Specifically `002-cross-tenant-leakage.sql` reports all 6 of its assertions as `ok`.
- Specifically `001-helpers-smoke.sql` confirms `prosecdef = true`, `provolatile = 's'`, and `proconfig contains 'search_path=public'` for all 4 helpers.
</acceptance_criteria>
<files>
- (no files modified — read-only test execution)
</files>
<automated>
supabase test db 2>&1 | tee /tmp/pgtap_output.log && ! grep -q "not ok" /tmp/pgtap_output.log && ! grep -q "Bail out!" /tmp/pgtap_output.log
</automated>
</task>

</tasks>

<verification>
1. Migration file `20260427120200_c_socio_memberships_rls_rewrite_and_backfill.sql` exists and contains all 5 sections (table, helper, RPC, hiring rewrites, backfill).
2. `supabase migration list` shows all 4 Phase-1 timestamps applied.
3. `src/integrations/supabase/types.ts` regenerated and includes all new tables/functions.
4. `npx tsc --noEmit -p tsconfig.app.json` exits 0 — existing app code still compiles.
5. `supabase test db` exits 0 — all 33 pgTAP assertions pass.
6. The security gate `002-cross-tenant-leakage.sql` is GREEN (sócio@A blocked from company B).
7. Owner reviews the placeholder company names in the backfill before merging the PR (RESEARCH.md A1 / Q2). Executor explicitly surfaces this in the task summary.
</verification>

<must_haves>
- `socio_company_memberships(user_id, company_id)` table exists with RLS + 2 policies.
- `visible_companies(uid) RETURNS uuid[]` helper exists with `STABLE SECURITY DEFINER SET search_path = public`.
- `resolve_default_scope(uid) RETURNS text` RPC exists with `STABLE SECURITY DEFINER SET search_path = public` and 5-branch role logic returning `'company:UUID'`/`'group:UUID'`/`NULL`.
- 12 hiring policies rewritten from `allowed_companies` to `visible_companies`, all using `(SELECT auth.uid())`.
- `companies` policies rewritten to use `visible_companies`.
- Grupo Lever instance exists in `company_groups` (slug `grupo-lever`).
- Backfill creates a root org_unit per company that has none.
- Backfill mirrors `teams` → `org_units` (preserving team.id), `team_members` → `org_unit_members`, `team_members.leader_id` → `unit_leaders`.
- All four Phase-1 migrations (A, B1, B2, C) successfully pushed to remote DB.
- `src/integrations/supabase/types.ts` regenerated and reflects new schema.
- `npx tsc --noEmit -p tsconfig.app.json` exits 0.
- `supabase test db` exits 0 with all pgTAP assertions green — security gate `002-cross-tenant-leakage.sql` PASS.
</must_haves>

<success_criteria>
- All 4 Phase-1 migrations applied to remote (`ehbxpbeijofxtsbezwxd`).
- pgTAP suite green (33 assertions).
- Cross-tenant leakage test `002-cross-tenant-leakage.sql` GREEN — security boundary verified.
- TypeScript types updated and existing code still compiles.
- Backfill is idempotent (re-running migration C is safe — no errors, zero rows affected on second run).
- Owner confirms 7 internal company names in PR review before merge (TODO marker present in migration).
</success_criteria>
</content>
</invoke>