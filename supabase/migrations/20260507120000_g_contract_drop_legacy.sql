-- =========================================================================
-- Migration G: CONTRACT — drop legacy helpers + storage policy rewrite + cron check
--
-- IRREVERSIBLE — runs after 1+ week of Phases 1-3 stable in produção.
-- Pre-conditions (planner-verified at Plan 04-08 time):
--   1. supabase/tests/002-cross-tenant-leakage.sql passing in CI
--   2. supabase/tests/011-payroll-total-rls.sql passing in CI (Plan 04-07)
--   3. supabase/tests/012-data-access-log-cron.sql passing in CI (this plan)
--   4. pg_cron job 'data_access_log_retention_cleanup' rodando ≥7 dias
--   5. Backfill E (e2_teams_to_org_units_backfill) confirmado em produção
--   6. Frontend: zero referências NOVAS a allowed_companies em src/ (auto-gen types.ts ok;
--      src/lib/hiring/rlsScope.ts contém apenas comentário stale — não chama o helper DB)
--   7. Zero incidentes críticos no Sentry referenciando allowed_companies/teams nos últimos 7 dias
--
-- Pre-migration audit findings (Plan 04-08 Task 1):
--   • src/ usa team_members/teams em ~10 arquivos (useTeams.ts, useCostBreakdown.ts,
--     ManualOneOnOneForm, ManualPDIForm, AdmissionForm, GestorDashboard, MyTeam,
--     CollaboratorProfile, Profile, OneOnOnes, DevelopmentKanban, rlsScope.ts).
--     OPTION A em vigor — DROP TABLE teams permanece COMENTADO.
--   • storage.objects policies hiring_bucket:select e hiring_bucket:insert ainda
--     referenciam public.allowed_companies(auth.uid()) — Migration C reescreveu
--     somente policies em public.* (job_openings, candidates, etc.). Esta migração
--     fecha o gap reescrevendo as 2 storage policies para public.visible_companies
--     ANTES do DROP FUNCTION (sem essa reescrita o DROP falharia ou perderia RLS).
--   • Schema reality check (Rule 1 deviation): applications.company_id e
--     candidates.company_id NÃO EXISTEM. PRE.1 (perf_pre_company_id_expand) só
--     adicionou company_id em evaluations / one_on_ones / climate_surveys —
--     applications usa job_opening_id (escopo via JOIN com job_openings.company_id);
--     candidates é entidade global (mesmo email/CPF aplica em vagas de várias
--     empresas). REQ QUAL-09 exige apenas que Migration G seja a contract phase;
--     não exige NOT NULL específico nessas tabelas. Step 2 (NOT NULL em hiring
--     tables) REMOVIDO da migração — premissa errada do plano 04-08.
--
-- Reversibility: NONE — owner deve PITR se houver regressão pós-apply.
-- DEPENDENCIES: Phases 1, 2, 3 todas em produção; Plan 04-07 critical tests verdes
-- =========================================================================

-- ---------------------------------------------------------------------------
-- Step 0 — Reescrever storage.objects policies do bucket 'hiring' para
--          visible_companies (recovery do gap deixado pelo Migration C).
--
-- Sem este step o Step 1 (DROP FUNCTION allowed_companies) falharia com
-- "cannot drop function ... because other objects depend on it".
-- Pattern idêntico ao Migration C section 4.x — apenas estendido para storage.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "hiring_bucket:select" ON storage.objects;
CREATE POLICY "hiring_bucket:select"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'hiring'
    AND (
      public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
      OR public.has_role((SELECT auth.uid()), 'socio'::public.app_role)
      OR public.has_role((SELECT auth.uid()), 'rh'::public.app_role)
      OR (
        public.has_role((SELECT auth.uid()), 'lider'::public.app_role)
        AND public.hiring_object_company(name) = ANY(public.visible_companies((SELECT auth.uid())))
      )
    )
  );

DROP POLICY IF EXISTS "hiring_bucket:insert" ON storage.objects;
CREATE POLICY "hiring_bucket:insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'hiring'
    AND (
      public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
      OR public.has_role((SELECT auth.uid()), 'socio'::public.app_role)
      OR public.has_role((SELECT auth.uid()), 'rh'::public.app_role)
      OR (
        public.has_role((SELECT auth.uid()), 'lider'::public.app_role)
        AND public.hiring_object_company(name) = ANY(public.visible_companies((SELECT auth.uid())))
      )
    )
  );

-- Sanity 0: confirm zero pg_policies still reference allowed_companies in their src
DO $$
DECLARE v_pol_refs int;
BEGIN
  SELECT COUNT(*) INTO v_pol_refs
    FROM pg_policies
   WHERE qual ILIKE '%allowed_companies%' OR with_check ILIKE '%allowed_companies%';
  IF v_pol_refs > 0 THEN
    RAISE EXCEPTION 'Migration G blocked: % active policies still reference allowed_companies (must rewrite before DROP FUNCTION)', v_pol_refs;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Step 1 — DROP legacy allowed_companies helper functions
-- These were marked deprecated in Phase 1 Migration C; hiring policies were
-- rewritten to visible_companies in 20260427120200 lines 246-540. Storage
-- policies are now rewritten in Step 0 above.
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.allowed_companies(uuid);
DROP FUNCTION IF EXISTS public.allowed_companies_for_user(uuid);

-- Sanity 1: confirm no surviving objects reference allowed_companies in pg_proc
DO $$
DECLARE v_refs int;
BEGIN
  SELECT COUNT(*) INTO v_refs
    FROM pg_proc p
   WHERE p.proname IN ('allowed_companies', 'allowed_companies_for_user');
  IF v_refs > 0 THEN
    RAISE EXCEPTION 'Migration G failed: % allowed_companies* functions still exist post-DROP', v_refs;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Step 2 — REMOVED (Rule 1 deviation)
--
-- Original plan 04-08 specified ALTER TABLE applications/candidates ALTER COLUMN
-- company_id SET NOT NULL. Schema audit revealed those columns DO NOT EXIST:
--   • applications usa job_opening_id (escopo via JOIN com job_openings.company_id)
--   • candidates é entidade global (mesmo email/CPF aplica em vagas de várias
--     empresas)
--   • PRE.1 (perf_pre_company_id_expand) só adicionou company_id em
--     evaluations / one_on_ones / climate_surveys (Phase 3); essas três já
--     receberam SET NOT NULL via PRE.3 (Plan 03-04 perf2).
-- REQ QUAL-09 exige que Migration G seja a contract phase final — NÃO exige
-- NOT NULL específico em hiring tables. Step removido.
--
-- Pre-deviation push-attempt confirmed the failure ('column "company_id" does
-- not exist (SQLSTATE 42703)' on `public.candidates`).
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Step 3 — Verify pg_cron retention job is scheduled (read-only sanity)
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'data_access_log_retention_cleanup') THEN
    RAISE EXCEPTION 'Migration G pre-condition violated: pg_cron retention job not scheduled';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Step 4 — DEFERRED: DROP teams + team_members
--
-- BLOCKED by: ~10 active src/ readers of `teams` / `team_members`:
--   useTeams.ts (CRUD completo), useCostBreakdown.ts, ManualOneOnOneForm,
--   ManualPDIForm, AdmissionForm, GestorDashboard, MyTeam, CollaboratorProfile,
--   Profile, OneOnOnes, DevelopmentKanban, rlsScope.ts (lider join).
--
-- Once these readers are migrated to org_units + a new cost source
-- (out of Phase 4 scope), uncomment the statements below and run as a
-- follow-up contract migration.
--
-- DROP TABLE IF EXISTS public.team_members CASCADE;
-- DROP TABLE IF EXISTS public.teams        CASCADE;
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Step 5 — Final sanity: smoke-test visible_companies still callable
-- (defense against accidental drop of the surviving helper)
-- ---------------------------------------------------------------------------

DO $$
DECLARE v_test_uid uuid;
BEGIN
  SELECT user_id INTO v_test_uid FROM public.user_roles LIMIT 1;
  IF v_test_uid IS NOT NULL THEN
    PERFORM public.visible_companies(v_test_uid);
  END IF;
  -- Se a helper sumiu acidentalmente, o PERFORM acima teria falhado
END $$;

COMMENT ON FUNCTION public.visible_companies(uuid)
  IS 'Canonical scope helper post-Migration G — replaces allowed_companies (dropped 2026-05-07). admin/socio/rh see all; lider sees companies via org_unit_members + unit_leaders + memberships.';
