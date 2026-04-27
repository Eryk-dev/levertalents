---
phase: 01-tenancy-backbone
plan: 04
subsystem: database
tags: [supabase, postgres, rls, plpgsql, security-definer, multi-tenant, rbac, backfill]

# Dependency graph
requires:
  - phase: 01-tenancy-backbone (sister plans, same wave)
    provides: |
      - 01-02 Migration A: company_groups table + companies.group_id/performance_enabled/rs_enabled columns
      - 01-03 Migration B1: 'liderado' added to app_role enum (separate file because ALTER TYPE ADD VALUE cannot run in a transaction)
      - 01-03 Migration B2: org_units / org_unit_members / unit_leaders tables + visible_org_units / org_unit_descendants helpers + anti-cycle triggers
provides:
  - socio_company_memberships(user_id, company_id) table with RLS
  - visible_companies(uid) helper (STABLE SECURITY DEFINER SET search_path=public)
  - resolve_default_scope(uid) RPC (LANGUAGE plpgsql STABLE SECURITY DEFINER) returning 'company:UUID' / 'group:UUID' / NULL per role
  - companies RLS rewritten: drops historical-churn variants, anon policy preserved, new "companies:select" + "companies:mutate_managers"
  - 10 hiring policies rewritten from allowed_companies → visible_companies, all callsites use (SELECT auth.uid()) initPlan idiom
  - Idempotent backfill: Grupo Lever upsert + 7 internal companies UPDATE (placeholders, TODO(owner-confirmation)) + auto-create root org_unit per company + mirror teams → org_units (preserving team.id) + team_members → org_unit_members + team_members.leader_id → unit_leaders
affects: [phase-01 wave-2, phase-02 R&S, phase-03 performance, phase-04 contract]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Migration C SQL: layered sections (table → helper → RPC → policy rewrites → backfill) inside one timestamp"
    - "PLpgSQL RPC for branching role logic (resolve_default_scope) — Phase 1 establishes precedent (existing helpers were LANGUAGE sql)"
    - "RLS dual-path coexistence: allowed_companies and visible_companies both live until Phase 4 Migration G drops the legacy helper"
    - "DO $$ ... END $$ idempotent backfill block — single transaction, all UPSERTs / NOT EXISTS guards, safe to re-run"
    - "Drop ALL historical policy-name variants before CREATE (covers naming churn from migrations 20251009193314 and 20251009205119) — anon policies left intact"
    - "Rule-1 deviation precedent: plan example referenced candidate_interactions; real schema has candidate_conversations; migration follows reality"

key-files:
  created:
    - supabase/migrations/20260427120200_c_socio_memberships_rls_rewrite_and_backfill.sql (564 lines)
  modified: []

key-decisions:
  - "DROP variants for companies policies cover historical churn ('Admin, Socio and RH can view all companies', 'Admin, Socio and RH can manage companies', 'Socio can manage companies', 'Socio and RH can view all companies', 'Everyone can view companies', 'Users can view companies', 'companies:select', 'companies:mutate_managers', 'Managers can manage companies') — anon-scope 'companies:anon_public_profile' is NOT touched because it serves the public hiring page (different trust boundary)."
  - "Rule-1 deviation: plan referenced candidate_interactions but the actual table is candidate_conversations (created by migration 20260422150000). Rewrote that policy against the real table name. Documented inline in the migration."
  - "Rewrote hiring:job_openings:delete despite it not using allowed_companies — preserves consistency under RBAC-10 audit (every callsite in this migration uses the (SELECT auth.uid()) idiom)."
  - "ZERO socio_company_memberships rows in backfill — RH explicitly assigns memberships via UI; sócio without membership lands on the D-09 empty state ('Sem empresa atribuída'). Established as Phase 1 D-discretion."
  - "kind='empresa' for auto-created root org_units (free-form text per Migration B's discretion); kind='time' for mirrored teams. Free-form labels vs enum mirrors the locked decision in 01-CONTEXT.md (empresas externas têm nomenclaturas heterogêneas)."

patterns-established:
  - "Pattern: helper signature visible_X(uid uuid) RETURNS uuid[] LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public — third helper following the same shape as visible_org_units / org_unit_descendants from Migration B."
  - "Pattern: RPC default-scope resolver — server-side resolves 'company:UUID' / 'group:UUID' / NULL per role; client (ScopeProvider) consumes during boot to avoid placeholder flash."
  - "Pattern: Idempotent backfill DO $$ ... END $$ block with grupo_lever_id captured upfront, downstream INSERTs guarded via NOT EXISTS / ON CONFLICT DO NOTHING / DO UPDATE."
  - "Pattern: TODO(owner-confirmation) inline marker beside placeholder data that owner must confirm in PR review — surfaces the human approval gate without blocking the migration from running."

requirements-completed: []  # NOT yet — see "Continuation Required" section. Requirements TEN-04, RBAC-04/09/10, ORG-09 are CODE-COMPLETE but only become "applied" once db push runs and pgTAP gate passes.

# Metrics
duration: 5min
completed: 2026-04-27
---

# Phase 01 Plan 04: Migration C — socio_company_memberships + RLS Rewrite + Backfill Summary

**Authored Migration C SQL: socio_company_memberships table, visible_companies helper, resolve_default_scope plpgsql RPC, rewrite of 10 hiring + 2 companies RLS policies (legacy allowed_companies → visible_companies, all callsites wrapped in (SELECT auth.uid())), and idempotent backfill (Grupo Lever upsert + 7-company UPDATE placeholder + auto-root org_units + teams→org_units mirror). PAUSED at the human-action checkpoint — db push and types regen DEFERRED to a continuation agent on main after sister Wave 1 worktrees merge back.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-04-27T19:16:04Z
- **Completed (paused):** 2026-04-27T19:21:10Z (approx)
- **Tasks completed in this worktree:** 1 of 4 (the SQL authoring task)
- **Tasks deferred to continuation:** 3 (db push, types regen, pgTAP verification)
- **Files modified:** 1 created, 0 modified

## Accomplishments

- Authored `supabase/migrations/20260427120200_c_socio_memberships_rls_rewrite_and_backfill.sql` (564 lines, 5 sections).
- Migration creates `socio_company_memberships` (RBAC-04) with RLS + 2 policies.
- Migration adds `visible_companies(uid)` — third and final new RLS helper, completing the trio with `visible_org_units` and `org_unit_descendants` from Migration B.
- Migration adds `resolve_default_scope(uid)` plpgsql RPC implementing D-10/D-11 server-side default-scope resolution per role.
- Rewrites 10 hiring policies + 2 companies policies from `allowed_companies` → `visible_companies` with `(SELECT auth.uid())` initPlan caching everywhere (RBAC-10).
- Idempotent backfill block ready to run on push: Grupo Lever upsert, 7-company UPDATE with TODO(owner-confirmation), auto-create root `org_units`, mirror legacy `teams` / `team_members` / `team_members.leader_id` into the new org-structure tables (preserving `team.id` for FK continuity).

## Task Commits

Atomic commit for the only task that ran in this worktree:

1. **Task 04-01: Author Migration C SQL** — `3078da1` (`feat(01-04): author Migration C — socio_company_memberships, visible_companies, RPC, RLS rewrite, backfill`)

**Plan metadata commit:** included in this commit (SUMMARY.md added in a separate metadata commit; see below).

_Tasks 04-02 (db push), 04-03 (types regen), 04-04 (pgTAP verification) are NOT executed in this worktree — see "Continuation Required" below._

## Files Created/Modified

- `supabase/migrations/20260427120200_c_socio_memberships_rls_rewrite_and_backfill.sql` — full Migration C: schema (socio_company_memberships) + helper (visible_companies) + RPC (resolve_default_scope) + 12 policy rewrites (10 hiring + 2 companies) + idempotent backfill (Grupo Lever, root org_units, teams→org_units mirror).

## Decisions Made

1. **Drop historical companies-policy variants explicitly** — covers naming churn from migrations `20251009193314` and `20251009205119` (`"Admin, Socio and RH can view all companies"`, `"Admin, Socio and RH can manage companies"`, `"Socio can manage companies"`, `"Socio and RH can view all companies"`). The `companies:anon_public_profile` policy (TO anon, from migration `20260420120200`) is NOT dropped — it serves a different trust boundary (public hiring page).
2. **Rewrote `hiring:job_openings:delete` even though it doesn't use `allowed_companies`** — RBAC-10 audit is "every callsite in this migration uses `(SELECT auth.uid())`", so it's consistent to update the delete policy too.
3. **Free-form `kind` labels for backfill org_units** — `'empresa'` for company root, `'time'` for mirrored teams. Aligns with Migration B's decision (kind is `text`, not enum, because empresas externas têm nomenclatura heterogênea — locked in CONTEXT.md).
4. **No socio_company_memberships seeded in backfill** — RH must assign explicitly via the UI (Phase 1 Plan 06 surfaces the panel). Sócios without membership land on the D-09 empty state.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] Real table is `candidate_conversations`, not `candidate_interactions`**
- **Found during:** Task 04-01 (authoring Section 4 — hiring policy rewrites)
- **Issue:** The plan's example SQL (Section 4.4) drops/creates policies on `candidate_interactions`. That table does not exist in the codebase. The actual table — created by migration `20260422150000_candidate_conversations.sql` and tracked in MEMORY (`project_talent_pool.md`) — is `candidate_conversations`. The migration as drafted in the plan would have errored on `DROP POLICY IF EXISTS ... ON public.candidate_interactions` (well, no — `IF EXISTS` is a no-op if the table is absent — but `CREATE POLICY ... ON public.candidate_interactions` would error: relation does not exist).
- **Fix:** Rewrote the policy section against `public.candidate_conversations` instead, preserving the original semantic (lider sees the conversation when there's an application of the candidate in a job in the lider's visible companies). Inline comment in the migration documents the deviation.
- **Files modified:** `supabase/migrations/20260427120200_c_socio_memberships_rls_rewrite_and_backfill.sql` (Section 4.8)
- **Verification:** Existing policy `hiring:candidate_conversations:select_lider_via_application` was confirmed at line 60 of `20260422150000_candidate_conversations.sql` and references `allowed_companies` — making it a legitimate candidate for rewrite.
- **Committed in:** `3078da1` (Task 04-01 commit)

**2. [Rule 2 — Missing Critical] Cover historical companies-policy name variants in DROP IF EXISTS list**
- **Found during:** Task 04-01 (authoring Section 2.1)
- **Issue:** Plan's example listed only `"companies:select"`, `"Everyone can view companies"`, `"Users can view companies"`, `"companies:mutate_managers"`, `"Managers can manage companies"`. The actual prior policies on `public.companies` (auditable in migrations `20251009193314_2f116053…` and `20251009205119_1775aa2f…`) are `"Admin, Socio and RH can view all companies"`, `"Admin, Socio and RH can manage companies"`, `"Socio and RH can view all companies"`, `"Socio can manage companies"`. Without explicit DROP IF EXISTS for those, the new `companies:select` and `companies:mutate_managers` policies would coexist with the legacy ones — RLS evaluates as OR across all policies, so a stale legacy policy granting access via `has_role(...) OR has_role(...)` would defeat the new `visible_companies`-scoped restriction. This is a correctness/security requirement.
- **Fix:** Added `DROP POLICY IF EXISTS` for all four legacy variant names plus the existing canonical names. Anon-scope policy `"companies:anon_public_profile"` left untouched.
- **Files modified:** `supabase/migrations/20260427120200_c_socio_memberships_rls_rewrite_and_backfill.sql` (Section 2.1)
- **Verification:** Inspected `supabase/migrations/20251009205119_1775aa2f-fc28-43af-8461-2a385b0a71af.sql` and `supabase/migrations/20251009193314_*` to enumerate all prior policy names on `public.companies`. Inspected `20260420120200_public_hiring_access.sql` to confirm the anon policy.
- **Committed in:** `3078da1` (Task 04-01 commit)

---

**Total deviations:** 2 auto-fixed (1 Rule-1 bug, 1 Rule-2 missing-critical)
**Impact on plan:** Both deviations align the migration with the actual production schema and close a security gap that the plan's example SQL would have left open. No scope creep — both are correctness fixes within the plan's stated objective ("rewrite the 12 hiring policies from allowed_companies to visible_companies").

## Issues Encountered

None — the schema authoring was straightforward once the prior migrations (especially `20260416193100_hiring_rls_policies.sql`, `20260422150000_candidate_conversations.sql`, `20251009205119_*`, `20251009193314_*`) were enumerated to identify every callsite of `allowed_companies` and every legacy policy name on `public.companies`.

## Continuation Required

This plan is `autonomous: false`. The orchestrator paused execution after Task 04-01 because Tasks 04-02, 04-03, and 04-04 cannot run in this worktree:

| Deferred task | Why it can't run here | Where it must run |
| --- | --- | --- |
| **04-02 — `supabase db push`** | (a) The push requires migrations A (`20260427120000_a_*`), B1 (`20260427120050_b1_*`), B2 (`20260427120100_b_*`) to be present locally — those are still in sister Wave-1 worktrees and not merged. (b) Push needs auth credentials (`SUPABASE_ACCESS_TOKEN`) the worktree may not have. (c) Push is destructive against the live `ehbxpbeijofxtsbezwxd` project — must run from main with full Wave 1 context. | Continuation agent on `main` after Wave 1 merge |
| **04-03 — `supabase gen types typescript`** | Types regen reflects the live DB schema — only meaningful after Task 04-02 succeeds. Running it before push would generate types that don't match the in-flight migrations. | Continuation agent on `main` after 04-02 |
| **04-04 — `supabase test db` (pgTAP)** | The pgTAP suite — `001-helpers-smoke`, `002-cross-tenant-leakage`, `003-org-unit-descendants`, `004-anti-cycle-trigger`, `005-resolve-default-scope` — verifies behavior against the live DB. Must run after 04-02. `002-cross-tenant-leakage.sql` is the security gate for Phase 1; this is the closing acceptance for Plan 04 and Wave 1. | Continuation agent on `main` after 04-02 |

### Checkpoint Type: human-action

The Supabase CLI may prompt interactively during `supabase db push` (asking to confirm the four pending migration timestamps against the production project). Auto-mode is not active; the operator must approve.

### Acceptance gate (continuation must verify)

After the continuation agent runs 04-02 / 04-03 / 04-04, the following must hold:

- `supabase migration list` includes all four Phase-1 timestamps in REMOTE: `20260427120000`, `20260427120050`, `20260427120100`, `20260427120200`.
- Verification SQL in remote DB:
  - `SELECT to_regclass('public.company_groups'), to_regclass('public.org_units'), to_regclass('public.socio_company_memberships')` returns 3 non-null `regclass` rows.
  - `SELECT proname FROM pg_proc WHERE proname IN ('visible_companies','visible_org_units','org_unit_descendants','resolve_default_scope') AND pronamespace = 'public'::regnamespace ORDER BY proname` returns 4 rows.
  - `SELECT 'liderado' = ANY(enum_range(NULL::public.app_role)::text[])` returns `true`.
- `src/integrations/supabase/types.ts` regenerated; mtime newer than this commit; contains `company_groups`, `org_units`, `org_unit_members`, `unit_leaders`, `socio_company_memberships`, `resolve_default_scope`, `performance_enabled`.
- `npx tsc --noEmit -p tsconfig.app.json` exits 0.
- `supabase test db` exits 0; `002-cross-tenant-leakage.sql` reports all 6 assertions as `ok` (security gate GREEN).

### Owner action gate (parallel, non-blocking)

The 7 placeholder names in the backfill UPDATE (`'Lever Consult', 'Lever Outsourcing', 'Lever Gestão', 'Lever People', 'Lever Tech', 'Lever Talents', 'Lever Operations'`) are educated guesses. The owner must confirm them in PR review (RESEARCH.md A1 / Q2). If a name doesn't match an existing `companies.name`, the UPDATE is a no-op (idempotent — safe). No second migration needed; just a follow-up `UPDATE companies SET group_id = ... WHERE id IN (...)` after owner confirms ids.

## User Setup Required

None at this stage — the migration runs unattended once pushed. The `supabase db push` itself may require the operator to be authenticated to the Supabase CLI (interactive prompt during 04-02).

## Self-Check

Verifying claims before reporting completion.

```
[file] supabase/migrations/20260427120200_c_socio_memberships_rls_rewrite_and_backfill.sql → FOUND
[commit] 3078da1 (feat(01-04): author Migration C…) → FOUND
[file content checks]
  - socio_company_memberships → present
  - visible_companies(_uid uuid) RETURNS uuid[] LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public → present
  - 5-branch CASE (admin OR rh / sócio / líder / liderado OR colaborador / ELSE) → present
  - REVOKE ALL ON FUNCTION public.visible_companies(uuid) FROM PUBLIC + GRANT EXECUTE TO authenticated → present
  - resolve_default_scope LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public → present
  - REVOKE ALL ON FUNCTION public.resolve_default_scope(uuid) FROM PUBLIC + GRANT EXECUTE TO authenticated → present
  - DROP POLICY IF EXISTS for legacy companies variants ('Admin, Socio and RH …') → present
  - companies:select using visible_companies + (SELECT auth.uid()) → present
  - 10 hiring policies dropped + recreated against visible_companies → present (job_openings × 4, candidates × 1, applications × 1, cultural_fit_responses × 1, background_checks × 1, interviews × 1, interview_decisions × 1, candidate_conversations × 1)
  - All policy callsites use (SELECT auth.uid()) — 70 occurrences in file → ok
  - Bare auth.uid() outside SQL comments → 0 → ok
  - Uppercase UUID[] → absent → ok
  - Backfill: company_groups upsert ('grupo-lever') → present
  - Backfill: 7 placeholder names with TODO(owner-confirmation) → present
  - Backfill: auto-create root org_units kind='empresa' → present
  - Backfill: teams → org_units (preserving id) kind='time' → present
  - Backfill: team_members → org_unit_members ON CONFLICT DO NOTHING → present
  - Backfill: team_members.leader_id → unit_leaders ON CONFLICT DO NOTHING → present
```

## Self-Check: PASSED

## Next Phase Readiness

- Wave 1 SQL authoring complete across all three sister worktrees once this lands.
- Continuation agent (on main) takes over: merge worktrees → `supabase db push` → regen types → run pgTAP → close Plan 04 acceptance.
- Plan 05 (frontend chokepoint — ScopeProvider, useScopedQuery) is unblocked the moment `types.ts` is regenerated and `resolve_default_scope` RPC is callable.
- Plan 06 (scope selector UI) and Plan 07 (quality gates) wait on Plan 05.

---
*Phase: 01-tenancy-backbone*
*Plan: 04*
*Authored (paused at human-action checkpoint): 2026-04-27*
