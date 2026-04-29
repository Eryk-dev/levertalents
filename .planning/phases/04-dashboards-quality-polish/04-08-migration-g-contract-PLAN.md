---
phase: 04-dashboards-quality-polish
plan: 08
type: execute
wave: 5
depends_on:
  - 03
  - 04
  - 05
  - 06
  - 07
files_modified:
  - supabase/migrations/20260507120000_g_contract_drop_legacy.sql
  - supabase/tests/012-data-access-log-cron.sql
  - .planning/codebase/ARCHITECTURE.md
  - .planning/codebase/CONCERNS.md
  - .planning/codebase/CONVENTIONS.md
autonomous: false
requirements:
  - QUAL-09
tags:
  - migration-g
  - contract
  - irreversible
  - blocking
  - phase-4

must_haves:
  truths:
    - "Migration G SQL exists and is reviewed BEFORE the operator runs db push"
    - "Go/no-go checklist is fulfilled (1+ semana de Phases 1-3 estável; pgTAP 002 + 011 verde; pg_cron data_access_log_retention_cleanup running ≥7 dias; zero incidentes críticos no Sentry referenciando teams ou allowed_companies)"
    - "Sanity-guard RAISE EXCEPTION blocks the migration if any unexpected residue is detected (orphan teams readers, NULL company_id post-NOT NULL)"
    - "After the migration: public.allowed_companies and public.allowed_companies_for_user functions DO NOT exist; public.teams and public.team_members tables DO NOT exist (or are renamed to *_legacy if a final review surfaces a hidden reader)"
    - "After the migration: applications.company_id and candidates.company_id are NOT NULL"
    - "pg_cron job 'data_access_log_retention_cleanup' is scheduled and active (verified by 012-data-access-log-cron.sql pgTAP test)"
    - ".planning/codebase/ARCHITECTURE.md, CONCERNS.md, CONVENTIONS.md updated to reflect the new model post-Migration G"
    - "Pre-migration audit SURFACES the useCostBreakdown blocker (P4-V11) — does NOT hide it"
  artifacts:
    - path: supabase/migrations/20260507120000_g_contract_drop_legacy.sql
      provides: "Contract migration: DROP allowed_companies functions; SET NOT NULL on applications.company_id and candidates.company_id; DROP teams + team_members CASCADE if zero readers; verify pg_cron retention job; sanity-guards"
      contains: "DROP FUNCTION IF EXISTS public.allowed_companies"
    - path: supabase/tests/012-data-access-log-cron.sql
      provides: "pgTAP test verifying pg_cron job is scheduled (read-only)"
      contains: "data_access_log_retention_cleanup"
    - path: .planning/codebase/ARCHITECTURE.md
      provides: "Updated to reflect dropped helpers and tables"
      contains: "Migration G"
  key_links:
    - from: "supabase/migrations/20260507120000_g_contract_drop_legacy.sql"
      to: "Phase 1 visible_companies helper"
      via: "documented as the replacement; allowed_companies references gone"
      pattern: "visible_companies"
    - from: "supabase/tests/012-data-access-log-cron.sql"
      to: "cron.job table"
      via: "EXISTS query"
      pattern: "data_access_log_retention_cleanup"
---

<objective>
[BLOCKING — IRREVERSIBLE] Final contract phase migration. After 1+ week of Phase 1-3 stability in production, drop legacy helpers (`allowed_companies`, `allowed_companies_for_user`), apply NOT NULL on `company_id` where still missing (applications, candidates), drop `teams` + `team_members` if zero callers remain, and verify pg_cron retention is operating. This is the only irreversible migration in the project — explicit operator gate via `autonomous: false` + a checkpoint that reviews the go/no-go checklist before the schema push.

Purpose: Reach the target architecture (single source of truth for company scoping = `visible_companies`; org structure = `org_units`). Close the door on the legacy parallel paths.

Output: Migration applied; legacy artifacts gone; documentation refreshed; pgTAP retention test green.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/phases/04-dashboards-quality-polish/04-CONTEXT.md
@.planning/phases/04-dashboards-quality-polish/04-PATTERNS.md
@.planning/codebase/ARCHITECTURE.md
@.planning/codebase/CONCERNS.md
@.planning/codebase/CONVENTIONS.md
@CLAUDE.md
@supabase/migrations/20260427120200_c_socio_memberships_rls_rewrite_and_backfill.sql
@supabase/migrations/20260429125200_perf_pre_company_id_constrain.sql
@supabase/migrations/20260429120100_e2_teams_to_org_units_backfill.sql
@supabase/tests/002-cross-tenant-leakage.sql

<interfaces>
<!-- Surviving helper post-Migration G -->
public.visible_companies(actor uuid) RETURNS uuid[]
public.visible_org_units(actor uuid) RETURNS uuid[]
public.org_unit_descendants(unit_id uuid) RETURNS uuid[]

<!-- Tables being dropped (after zero-reader verification) -->
public.teams (will be DROPPED CASCADE)
public.team_members (will be DROPPED CASCADE)

<!-- Functions being dropped -->
public.allowed_companies(uuid) (DROP)
public.allowed_companies_for_user(uuid) (DROP — confirm if function exists; if not, skip)

<!-- Columns being constrained NOT NULL -->
public.applications.company_id (after backfill of any orphans)
public.candidates.company_id (after backfill of any orphans)
</interfaces>
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Pre-migration audit + write Migration G SQL + pgTAP test 012-data-access-log-cron.sql</name>
  <files>supabase/migrations/20260507120000_g_contract_drop_legacy.sql, supabase/tests/012-data-access-log-cron.sql</files>
  <read_first>
    - supabase/migrations/20260427120200_c_socio_memberships_rls_rewrite_and_backfill.sql (lines 246-540 — confirms hiring policies were already rewritten to visible_companies in Phase 1, so dropping allowed_companies is safe at the policy layer)
    - supabase/migrations/20260429125200_perf_pre_company_id_constrain.sql (full 37 lines — exact NOT NULL + sanity-guard pattern to clone)
    - supabase/migrations/20260429120100_e2_teams_to_org_units_backfill.sql (full file — confirms teams data was backfilled to org_units; teams is read-only from this point)
    - .planning/phases/04-dashboards-quality-polish/04-PATTERNS.md (section 5 — Migration G template + sanity-guard pattern)
    - supabase/tests/007-data-access-log.sql (analog for cron test pattern)
  </read_first>
  <action>
    Phase 1 — Pre-migration audit (run these greps and record results in the SUMMARY for the operator's review).

    **P4-V11 — the audit must SURFACE blockers, not hide them.** The earlier draft filtered `useCostBreakdown` out of the teams reference grep — that filter is REMOVED here. ANY teams reference in `src/` confirms Option A (deferred drop) is in effect; the audit is supposed to surface useCostBreakdown so the operator sees it explicitly:

    ```bash
    # 1) Confirm src/ has zero references to allowed_companies (frontend uses visible_companies)
    grep -rn "allowed_companies\b" src/ tests/ 2>&1
    # Expected: only in src/integrations/supabase/types.ts (auto-gen — will disappear on next regen)

    # 2) Audit src/ references to public.teams or team_members (P4-V11 — DO NOT filter useCostBreakdown).
    # Allowed: src/integrations/supabase/types.ts (auto-gen).
    # Any other match — including useCostBreakdown — confirms Option A (deferred drop) is in effect.
    grep -rn '"teams"\|public\.teams\|from(.teams.\|team_members' src/ tests/ 2>&1 | grep -v "supabase/types.ts"
    # Expected (Option A): src/hooks/useCostBreakdown.ts shows up. This is INFORMATIONAL — it tells the operator that DROP TABLE teams must remain commented out in this migration.

    # 3) Confirm migrations layer has rewritten allowed_companies references (CASCADE-time safety)
    grep -rn "allowed_companies" supabase/migrations/ 2>&1
    # Expected: present in 20260416193100, 20260416193300, 20260422150000, 20260427120200 (all created BEFORE Migration G — historical record)
    ```

    **Document audit findings in the SUMMARY (Task 1 output section):**
    - Quote the full output of grep #2 verbatim. If `useCostBreakdown` is the ONLY non-types.ts match, record: "Confirmed Option A — useCostBreakdown is the only active reader; DROP TABLE teams remains commented out."
    - If grep #2 surfaces ANY OTHER active reader besides useCostBreakdown and types.ts, STOP and surface to operator: additional consumers must be migrated before Migration G can be planned with the table drop.

    **CRITICAL FINDING (informational, expected):** `src/hooks/useCostBreakdown.ts` reads `public.teams` and `public.team_members` directly. This is the ONLY active consumer of those tables in the frontend. Migration G CANNOT drop these tables until useCostBreakdown is migrated to read from `org_units` + a new cost source.

    Decision tree for the operator (record in SUMMARY):
    - **OPTION A (recommended for v1 ship):** DEFER the `DROP TABLE public.teams` step in Migration G. Drop only `allowed_companies` functions + apply NOT NULL on applications/candidates. Schedule a follow-up plan (post-Phase-4) to migrate useCostBreakdown to use `org_unit_members` + a `team_members.cost`-equivalent column on the new model.
    - **OPTION B (full contract):** Plan an additional task BEFORE Migration G that migrates useCostBreakdown to read from a successor data source (e.g., `org_unit_members` joined with a `member_costs` table or `profiles.salary_cents`). Then proceed with the table drop.

    The planner recommends OPTION A. The migration below executes Option A; the table drop is COMMENTED OUT with a clear note. The operator can flip the comment if Option B is desired.

    Phase 2 — Write supabase/migrations/20260507120000_g_contract_drop_legacy.sql:

    ```sql
    -- =========================================================================
    -- Migration G: CONTRACT — drop legacy helpers + NOT NULL + (deferred) drop teams
    --
    -- IRREVERSIBLE — runs after 1+ week of Phases 1-3 stable in produção.
    -- Pre-conditions (planner-verified at Plan 04-08 time):
    --   1. supabase/tests/002-cross-tenant-leakage.sql passing in CI
    --   2. supabase/tests/011-payroll-total-rls.sql passing in CI (Plan 04-07)
    --   3. supabase/tests/012-data-access-log-cron.sql passing in CI (this plan)
    --   4. pg_cron job 'data_access_log_retention_cleanup' rodando ≥7 dias
    --   5. Backfill E (e2_teams_to_org_units_backfill) confirmado em produção
    --   6. Frontend: zero referências NOVAS a allowed_companies em src/ (auto-gen types.ts ok)
    --   7. Zero incidentes críticos no Sentry referenciando allowed_companies/teams nos últimos 7 dias
    -- Reversibility: NONE — owner deve PITR se houver regressão pós-apply.
    -- DEPENDENCIES: Phases 1, 2, 3 todas em produção; Plan 04-07 critical tests verdes
    -- =========================================================================

    -- ---------------------------------------------------------------------------
    -- Step 1 — DROP legacy allowed_companies helper functions
    -- These were marked deprecated in Phase 1 Migration C; hiring policies were
    -- rewritten to visible_companies in 20260427120200 lines 246-540.
    -- ---------------------------------------------------------------------------

    DROP FUNCTION IF EXISTS public.allowed_companies(uuid);
    DROP FUNCTION IF EXISTS public.allowed_companies_for_user(uuid);

    -- Sanity: confirm no surviving references in current pg_proc (none of our policies still reference)
    DO $$
    DECLARE v_refs int;
    BEGIN
      SELECT COUNT(*) INTO v_refs
        FROM pg_proc p
        JOIN pg_depend d ON d.objid = p.oid
       WHERE p.proname = 'allowed_companies';
      IF v_refs > 0 THEN
        RAISE EXCEPTION 'Migration G failed: % objects still depend on allowed_companies', v_refs;
      END IF;
    END $$;

    -- ---------------------------------------------------------------------------
    -- Step 2 — SET NOT NULL on company_id where still missing
    -- Verify zero NULLs first; abort with RAISE if any remain (operator must backfill manually).
    -- ---------------------------------------------------------------------------

    DO $$
    DECLARE
      v_apps_null  int;
      v_cand_null  int;
    BEGIN
      SELECT COUNT(*) INTO v_apps_null FROM public.applications WHERE company_id IS NULL;
      SELECT COUNT(*) INTO v_cand_null FROM public.candidates  WHERE company_id IS NULL;
      IF v_apps_null > 0 OR v_cand_null > 0 THEN
        RAISE EXCEPTION 'Migration G blocked: applications NULL=% candidates NULL=%. Backfill required before re-run.', v_apps_null, v_cand_null;
      END IF;
    END $$;

    ALTER TABLE public.applications ALTER COLUMN company_id SET NOT NULL;
    ALTER TABLE public.candidates   ALTER COLUMN company_id SET NOT NULL;

    -- Sanity post-constrain (defense-in-depth)
    DO $$
    DECLARE v_apps_null int; v_cand_null int;
    BEGIN
      SELECT COUNT(*) INTO v_apps_null FROM public.applications WHERE company_id IS NULL;
      SELECT COUNT(*) INTO v_cand_null FROM public.candidates  WHERE company_id IS NULL;
      IF v_apps_null > 0 OR v_cand_null > 0 THEN
        RAISE EXCEPTION 'Migration G failed post-constrain: applications NULL=% candidates NULL=%', v_apps_null, v_cand_null;
      END IF;
    END $$;

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
    -- BLOCKED by: src/hooks/useCostBreakdown.ts still reads `teams` + `team_members.cost`.
    -- Once useCostBreakdown is migrated to org_units + new cost source (out of Phase 4 scope),
    -- uncomment these statements and run as a follow-up contract migration.
    --
    -- DROP TABLE IF EXISTS public.team_members CASCADE;
    -- DROP TABLE IF EXISTS public.teams        CASCADE;
    -- ---------------------------------------------------------------------------

    -- Final sanity: verify visible_companies still functional (smoke test)
    DO $$
    DECLARE v_test_uid uuid;
    BEGIN
      -- Pick any user with at least one role to verify the helper is callable
      SELECT user_id INTO v_test_uid FROM public.user_roles LIMIT 1;
      IF v_test_uid IS NOT NULL THEN
        PERFORM public.visible_companies(v_test_uid);
      END IF;
      -- If helper was accidentally removed, this PERFORM would have failed
    END $$;

    COMMENT ON FUNCTION public.visible_companies(uuid)
      IS 'Canonical scope helper post-Migration G — replaces allowed_companies (dropped 2026-05-07).';
    ```

    Phase 3 — Write supabase/tests/012-data-access-log-cron.sql:

    ```sql
    -- ========================================================================
    -- 012-data-access-log-cron.sql — TAL-07 / QUAL-09 retention guarantee
    --
    -- Verifies pg_cron retention job for data_access_log is scheduled.
    -- This is a pre-condition for Migration G; this test must pass BEFORE
    -- the contract migration runs.
    -- REQs: TAL-07, QUAL-09
    -- ========================================================================
    begin;
    select plan(2);

    select isnt_empty(
      $$select 1 from cron.job where jobname = 'data_access_log_retention_cleanup'$$,
      'pg_cron retention job is scheduled'
    );

    select ok(
      (SELECT active FROM cron.job WHERE jobname = 'data_access_log_retention_cleanup'),
      'pg_cron retention job is active'
    );

    select * from finish();
    rollback;
    ```

    DO NOT run `supabase db push` in this task. The push is gated behind the operator checkpoint in Task 2.
  </action>
  <verify>
    <automated>test -f supabase/migrations/20260507120000_g_contract_drop_legacy.sql && test -f supabase/tests/012-data-access-log-cron.sql && echo "files exist"</automated>
  </verify>
  <acceptance_criteria>
    - File supabase/migrations/20260507120000_g_contract_drop_legacy.sql exists
    - `grep -c "DROP FUNCTION IF EXISTS public.allowed_companies" supabase/migrations/20260507120000_g_contract_drop_legacy.sql` returns at least 1
    - `grep -c "ALTER COLUMN company_id SET NOT NULL" supabase/migrations/20260507120000_g_contract_drop_legacy.sql` returns at least 2 (applications + candidates)
    - `grep -c "RAISE EXCEPTION" supabase/migrations/20260507120000_g_contract_drop_legacy.sql` returns at least 3 (pre-NOT-NULL guard, post-NOT-NULL guard, cron pre-condition; possibly more)
    - `grep -c "DROP TABLE.*teams\|DROP TABLE.*team_members" supabase/migrations/20260507120000_g_contract_drop_legacy.sql` returns 0 (the active drop is commented out per Option A)
    - `grep -c "BLOCKED by\|DEFERRED" supabase/migrations/20260507120000_g_contract_drop_legacy.sql` returns at least 1 (operator note)
    - File supabase/tests/012-data-access-log-cron.sql exists
    - `grep -c "data_access_log_retention_cleanup" supabase/tests/012-data-access-log-cron.sql` returns at least 2
    - `grep -c "select plan(2)" supabase/tests/012-data-access-log-cron.sql` returns 1
    - **P4-V11 — audit grep does NOT filter useCostBreakdown:** the audit grep #2 in Task 1 is `grep -rn '"teams"\|public\.teams\|from(.teams.\|team_members' src/ tests/ 2>&1 | grep -v "supabase/types.ts"` — there is NO `| grep -v useCostBreakdown` clause. The SUMMARY explicitly quotes the full unfiltered output of grep #2 (must include `useCostBreakdown` line).
  </acceptance_criteria>
  <done>Migration G SQL written (Option A: defer teams drop); pgTAP 012 written; pre-migration audit findings documented for operator review with the unfiltered useCostBreakdown reference visible (P4-V11).</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 2: Operator go/no-go checklist + supabase db push for Migration G</name>
  <what-built>
    Migration G SQL file (supabase/migrations/20260507120000_g_contract_drop_legacy.sql) and the pgTAP retention test (supabase/tests/012-data-access-log-cron.sql) are ready. They have NOT been pushed to the remote database. This is the irreversible step.
  </what-built>
  <how-to-verify>
    Operator (Eryk): review and check off each item BEFORE typing "approved":

    **1. Stability gate**
    - [ ] Phase 3 deployed to production for ≥ 7 dias
    - [ ] Sentry shows zero unresolved CRITICAL incidents in the last 7 days that mention `teams`, `allowed_companies`, or `company_id NULL`

    **2. Test gate**
    - [ ] Run: `supabase test db --linked` — confirm `002-cross-tenant-leakage.sql` passes
    - [ ] Run: `supabase test db --linked` — confirm `011-payroll-total-rls.sql` passes (Plan 04-07)
    - [ ] Run: `supabase test db --linked` — confirm `012-data-access-log-cron.sql` passes (Plan 04-08)

    **3. Frontend audit (acceptable: 0 new references; auto-gen types.ts ok)**
    - [ ] Run: `grep -rn "allowed_companies" src/ tests/ | grep -v "supabase/types.ts"` — should return 0 lines
    - [ ] **P4-V11 — UNFILTERED teams audit:** Run: `grep -rn '"teams"\|public\.teams\|from(.teams.\|team_members' src/ tests/ | grep -v "supabase/types.ts"` and confirm `src/hooks/useCostBreakdown.ts` is the ONLY remaining src/ reader of `teams`/`team_members`. (Migration G defers `DROP TABLE` until that hook is migrated; this is documented.)

    **4. Backfill verification**
    - [ ] Run on remote: `select count(*) from public.applications where company_id is null` — must be 0
    - [ ] Run on remote: `select count(*) from public.candidates  where company_id is null` — must be 0
    - [ ] Run on remote: `select count(*) from cron.job where jobname = 'data_access_log_retention_cleanup' and active = true` — must be 1

    **5. Migration review**
    - [ ] Read `supabase/migrations/20260507120000_g_contract_drop_legacy.sql` end-to-end
    - [ ] Confirm step 4 (DROP TABLE teams) is COMMENTED OUT (Option A — deferred until useCostBreakdown is migrated)
    - [ ] Sanity-guard RAISE EXCEPTION blocks are present in steps 1, 2, 3

    **6. Backup**
    - [ ] Note the current Supabase PITR window — if anything goes sideways, owner must restore via PITR.
    - [ ] Snapshot the current schema: `npx supabase db dump --linked > .planning/phases/04-dashboards-quality-polish/pre-migration-g-schema.sql` (operator runs this)

    **If all items checked**: type "approved" and the executor will run:
    ```bash
    npx supabase db push --linked --include-all
    npx supabase gen types typescript --linked 2>/dev/null > src/integrations/supabase/types.ts
    npm run build
    ```

    **If ANY item fails**: type the failing item ID (e.g., "blocked by frontend audit"). The executor will surface the gap and stop.
  </how-to-verify>
  <resume-signal>Type "approved" to proceed with the schema push, OR describe the blocker.</resume-signal>
</task>

<task type="auto" tdd="false">
  <name>Task 3: Apply schema push + regen types + update codebase docs</name>
  <files>src/integrations/supabase/types.ts, .planning/codebase/ARCHITECTURE.md, .planning/codebase/CONCERNS.md, .planning/codebase/CONVENTIONS.md</files>
  <read_first>
    - .planning/codebase/ARCHITECTURE.md (find sections referencing allowed_companies — replace with visible_companies)
    - .planning/codebase/CONCERNS.md (find references to "teams legacy" / "allowed_companies" — mark as RESOLVED)
    - .planning/codebase/CONVENTIONS.md (find scope conventions section — confirm visible_companies is the canonical helper)
  </read_first>
  <action>
    Only run AFTER Task 2 checkpoint is approved.

    1) Run schema push:

    ```bash
    npx supabase db push --linked --include-all
    ```

    Expected output: applies migration 20260507120000_g_contract_drop_legacy.sql. If any sanity-guard RAISE fires, the migration aborts with a clear message; do NOT manually retry — escalate to operator.

    2) Regen types:

    ```bash
    npx supabase gen types typescript --linked 2>/dev/null > src/integrations/supabase/types.ts
    ```

    Confirm allowed_companies is GONE from types.ts:
    ```bash
    grep -c "allowed_companies" src/integrations/supabase/types.ts
    # Expected: 0
    ```

    3) Build sanity:

    ```bash
    npm run build
    ```

    Expected: 0 TypeScript errors. If errors surface (e.g., a hook still calls `supabase.rpc('allowed_companies'...)`), surface as a follow-up.

    4) Update .planning/codebase/ARCHITECTURE.md:
    - In the section about scope helpers, replace any mention of `allowed_companies` with a note: "deprecated 2026-04-27 (Phase 1 Migration C); dropped 2026-05-07 (Phase 4 Migration G). Use `visible_companies(uid)` exclusively."
    - Add a new entry to the migration ledger (if such a section exists): "Migration G applied 2026-05-07: dropped allowed_companies* helpers; SET NOT NULL on applications.company_id and candidates.company_id; teams + team_members table drop DEFERRED until useCostBreakdown migration."

    5) Update .planning/codebase/CONCERNS.md:
    - Add a new "Resolved" subsection at the top noting "Migration G applied 2026-05-07; allowed_companies dropped; legacy NOT NULL gaps closed."
    - Add a "Outstanding" entry: "useCostBreakdown still reads `teams`/`team_members`; follow-up plan needed before final teams drop."

    6) Update .planning/codebase/CONVENTIONS.md:
    - In the scope helper section, confirm `visible_companies(uid)` is the only canonical helper.
    - Remove any code samples that reference `allowed_companies(uid)`.
  </action>
  <verify>
    <automated>grep -c "allowed_companies" src/integrations/supabase/types.ts && npm run build 2>&1 | tail -5</automated>
  </verify>
  <acceptance_criteria>
    - `npx supabase db push --linked --include-all` exits 0
    - `grep -c "allowed_companies" src/integrations/supabase/types.ts` returns 0
    - `npm run build 2>&1 | grep -E "error TS"` returns 0 lines
    - `wc -l < src/integrations/supabase/types.ts` > 3000 (regen produced full file)
    - `grep -c "Migration G\|allowed_companies dropped\|2026-05-07" .planning/codebase/ARCHITECTURE.md` returns at least 1
    - `grep -c "Migration G\|allowed_companies\|teams.*deferred" .planning/codebase/CONCERNS.md` returns at least 1
    - `grep -c "allowed_companies" .planning/codebase/CONVENTIONS.md` returns 0 (or only inside "deprecated/dropped" historical context)
    - Run pgTAP 011 + 012 + 002 against remote (operator confirms green): `npx supabase test db --linked` exits 0
  </acceptance_criteria>
  <done>Migration G applied to remote; types regenerated; allowed_companies symbol gone; codebase docs reflect new model; teams drop documented as deferred.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| local migrations → remote DB | Irreversible DDL; PITR is the only rollback |
| operator → schema push | Requires explicit approval (autonomous: false) |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-04-08-01 | Tampering | irreversible drop with hidden caller | mitigate | Pre-migration audit (Task 1) + checkpoint review (Task 2) + sanity-guards inside the migration that abort with RAISE EXCEPTION. P4-V11 ensures the audit SURFACES useCostBreakdown rather than filtering it. |
| T-04-08-02 | Denial of Service | NOT NULL fails on orphan rows | mitigate | Pre-NOT-NULL guard + post-NOT-NULL guard; both raise with row counts so operator knows what to fix |
| T-04-08-03 | Repudiation | retention job silently disabled | mitigate | pgTAP 012 verifies pg_cron job is scheduled AND active before the migration runs |
| T-04-08-04 | Information Disclosure | dropping helpers loses RLS coverage | mitigate | Phase 1 Migration C already rewrote all hiring policies to visible_companies (lines 246-540); allowed_companies is unreferenced at the policy layer; final smoke test PERFORMS visible_companies(uid) before completion |
| T-04-08-05 | Tampering | teams drop with active reader (useCostBreakdown) | mitigate | Drop is COMMENTED OUT (Option A); operator can flip the comment only after a follow-up plan migrates useCostBreakdown. Audit grep surfaces the dependency (P4-V11). |
</threat_model>

<verification>
- supabase db push exits 0
- supabase test db --linked passes 002, 011, 012
- npm run build exits 0
- grep allowed_companies in types.ts returns 0
- Codebase docs updated with Migration G timestamp
- P4-V11 audit unfiltered output captured in SUMMARY (useCostBreakdown line visible)
</verification>

<success_criteria>
- Migration G SQL reviewed + approved at the checkpoint
- Migration applied; allowed_companies functions gone; NOT NULL constraints present
- pg_cron retention job verified
- teams drop documented as deferred (Option A)
- Codebase planning docs reflect new model
- Pre-migration audit SURFACED the useCostBreakdown dependency (P4-V11)
</success_criteria>

<output>
After completion, create `.planning/phases/04-dashboards-quality-polish/04-08-SUMMARY.md` documenting:
- Pre-migration audit results (operator's checked items)
- **P4-V11 — verbatim unfiltered output of audit grep #2** (must include the useCostBreakdown line)
- supabase db push output
- npm run build result
- pgTAP test results (002, 011, 012)
- Confirmation `grep allowed_companies` in types.ts returns 0
- Codebase docs diff
- Outstanding follow-up: useCostBreakdown migration to org_units + then drop teams CASCADE
- Confirmation: Migration G is the LAST irreversible migration; no further contract phases planned
</output>
</output>
