---
phase: 03-performance-refactor
plan: 01
subsystem: testing
tags: [vitest, msw, pgtap, wave-0, scaffolding, performance, climate, 1on1, evaluation]

# Dependency graph
requires:
  - phase: 01-tenancy-backbone
    provides: "Vitest + RTL + MSW + pgTAP infrastructure (Plan 01-01); tests/ structure; supabase/tests/ pgTAP setup"
  - phase: 02-r-s-refactor
    provides: "MSW handler patterns (hiring-handlers.ts, server.ts); failing-by-default skeleton precedent (Plan 02-01)"
provides:
  - "3 Vitest stubs with describe.skip + it.todo (passwordGenerator, evaluationTemplate, climateAggregation) — 15 it.todo total"
  - "3 MSW handlers for Phase 3 (Edge Function create-user-with-temp-password + RPCs get_climate_aggregate + submit_climate_response)"
  - "phase3Handlers array exported from src/test/perf-mocks/index.ts, appended to tests/msw/handlers.ts"
  - "4 TypeScript fixtures with factory builders (templateSnapshot, evaluationCycle, oneOnOnePlaud, climateResponse)"
  - "5 pgTAP stubs (003-007) with SELECT skip covering INV-3-01..INV-3-23 DB invariants — 34 planned tests"
affects: [03-02, 03-03, 03-04, 03-05, 03-06, 03-07, 03-08, 03-09, 03-10, 03-11]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Failing-by-default skeleton: describe.skip + it.todo (vitest) | SELECT skip(N) (pgTAP) — zero failing, suite roda exit 0 sem implementação (Phase 2 precedent)"
    - "MSW handler hard-coded to ehbxpbeijofxtsbezwxd — guarantees intercept even if .env changes (T-02-01-02 accepted)"
    - "phase3Handlers array pattern — tests/msw/handlers.ts spreads phase3Handlers so all suites benefit"
    - "Fixtures with factory builders + overrides spread — type-safe, no `as any`, follows Phase 2 pattern"

key-files:
  created:
    - src/lib/__tests__/passwordGenerator.test.ts
    - src/lib/__tests__/evaluationTemplate.test.ts
    - src/lib/__tests__/climateAggregation.test.ts
    - src/test/perf-mocks/createUserWithTempPassword.ts
    - src/test/perf-mocks/getClimateAggregate.ts
    - src/test/perf-mocks/submitClimateResponse.ts
    - src/test/perf-mocks/index.ts
    - src/test/perf-fixtures/templateSnapshot.ts
    - src/test/perf-fixtures/evaluationCycle.ts
    - src/test/perf-fixtures/oneOnOnePlaud.ts
    - src/test/perf-fixtures/climateResponse.ts
    - supabase/tests/003_evaluation_cycles_snapshot.sql
    - supabase/tests/004_evaluations_rls.sql
    - supabase/tests/005_climate_anonymity.sql
    - supabase/tests/006_one_on_ones_rls.sql
    - supabase/tests/007_backfill_e.sql
  modified:
    - tests/msw/handlers.ts

key-decisions:
  - "Vitest stubs placed in src/lib/__tests__/ (plan spec) instead of tests/lib/ — vitest.config.ts includes both src/**/*.test.ts and tests/**/*.test.ts, both paths valid"
  - "MSW handlers placed in src/test/perf-mocks/ (plan spec) and referenced from tests/msw/handlers.ts via spread — unifies Phase 3 handlers with existing server setup"
  - "pgTAP files use underscore naming (003_xxx.sql) distinct from dash naming (003-xxx.sql) of Phase 1/2 files — no numbering conflict; Supabase CLI runs all *.sql in directory"
  - "supabase test db not verifiable in executor environment (no local DB) — consistent with Phase 2 Plan 02-01 precedent; SELECT skip(N) guarantees exit 0 locally"

requirements-completed: []  # Wave 0 — no REQs closed; each downstream wave removes .skip and closes REQs

# Metrics
duration: 4min
completed: 2026-04-28
---

# Phase 3 Plan 1: Wave 0 Test Scaffolding Summary

**16 failing-by-default files (3 Vitest stubs + 4 MSW/fixtures modules + 4 fixture files + 5 pgTAP stubs) establishing Nyquist coverage for Phase 3 Performance Refactor before any schema migration**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-04-28T19:19:54Z
- **Completed:** 2026-04-28T19:24:00Z
- **Tasks:** 2 (both auto-completed)
- **Files created:** 16 (11 TS/test + 5 pgTAP)
- **Files modified:** 1 (tests/msw/handlers.ts)

## Accomplishments

- 3 Vitest stubs (describe.skip + it.todo) covering INV-3-06 (buildZodFromTemplate), INV-3-09 (k-anon), INV-3-16 (passwordGenerator) — 15 it.todo total, CI green
- 3 MSW handlers (Edge Function + 2 RPCs) with realistic default responses and error simulation
- `phase3Handlers` array exported and spread into `tests/msw/handlers.ts` — all test suites get Phase 3 handlers automatically
- 4 TypeScript fixtures with factory builders (templateSnapshot D-07, evaluationCycle, oneOnOnePlaud with Plaud fields, climateResponse without user_id)
- 5 pgTAP stubs with 34 planned tests (8+8+6+5+7) — all skip until Wave 1/2 migrations; each stub has inline TODO comments mapping to exact invariant IDs

## Files Created

### Vitest stubs (src/lib/__tests__/)

| File | describe.skip | it.todo count | Invariant | Activated by |
|------|---------------|---------------|-----------|--------------|
| passwordGenerator.test.ts | passwordGenerator (Wave 3) | 4 | INV-3-16 | Wave 3 |
| evaluationTemplate.test.ts | buildZodFromTemplate (Wave 3) | 7 | INV-3-06 | Wave 3 |
| climateAggregation.test.ts | climateAggregation k-anon (Wave 3) | 4 | INV-3-09 | Wave 3 |

### MSW handlers (src/test/perf-mocks/)

| File | Handler | URL |
|------|---------|-----|
| createUserWithTempPassword.ts | createUserWithTempPasswordHandler | /functions/v1/create-user-with-temp-password |
| getClimateAggregate.ts | getClimateAggregateHandler | /rest/v1/rpc/get_climate_aggregate |
| submitClimateResponse.ts | submitClimateResponseHandler | /rest/v1/rpc/submit_climate_response |
| index.ts | phase3Handlers (array re-export) | — |

### TypeScript fixtures (src/test/perf-fixtures/)

| File | Factory | Schema ref |
|------|---------|------------|
| templateSnapshot.ts | buildTemplateSnapshot | D-07 (TemplateSnapshot type) |
| evaluationCycle.ts | buildEvaluationCycle | perf1 migration (Wave 2) |
| oneOnOnePlaud.ts | buildOneOnOne | one1 migration (Wave 2, Plaud fields) |
| climateResponse.ts | buildClimateResponse | clim1 post-migration (no user_id, D-09) |

### pgTAP stubs (supabase/tests/)

| File | plan(N) | INV-3-XX covered | Activated by |
|------|---------|-------------------|--------------|
| 003_evaluation_cycles_snapshot.sql | 8 | INV-3-01, INV-3-05, INV-3-23 | Wave 2 (perf1 + cron1) |
| 004_evaluations_rls.sql | 8 | INV-3-02, INV-3-03, INV-3-04, INV-3-07 | Wave 2 (perf2) |
| 005_climate_anonymity.sql | 6 | INV-3-08, INV-3-09 | Wave 2 (clim1 + clim2) |
| 006_one_on_ones_rls.sql | 5 | INV-3-14 | Wave 2 (one1) |
| 007_backfill_e.sql | 7 | INV-3-21, INV-3-22 | Wave 1 (Backfill E) |

## Invariant Coverage Map

| INV-3-XX | Description | Stub file |
|----------|-------------|-----------|
| INV-3-01 | Cycles refilter per company | 003_evaluation_cycles_snapshot.sql |
| INV-3-02 | direction CHECK constraint | 004_evaluations_rls.sql |
| INV-3-03 | Liderado RLS (evaluations) | 004_evaluations_rls.sql |
| INV-3-04 | Líder via org_unit_descendants | 004_evaluations_rls.sql |
| INV-3-05 | template_snapshot immutable | 003_evaluation_cycles_snapshot.sql |
| INV-3-06 | buildZodFromTemplate schema | evaluationTemplate.test.ts |
| INV-3-07 | Legacy columns dropped | 004_evaluations_rls.sql |
| INV-3-08 | climate_responses.user_id dropped | 005_climate_anonymity.sql |
| INV-3-09 | k-anon RPC + TS mirror | 005_climate_anonymity.sql + climateAggregation.test.ts |
| INV-3-14 | rh_notes RLS | 006_one_on_ones_rls.sql |
| INV-3-16 | Password alphabet (D-21) | passwordGenerator.test.ts |
| INV-3-21 | Backfill E completeness | 007_backfill_e.sql |
| INV-3-22 | Socios memberships | 007_backfill_e.sql |
| INV-3-23 | pg_cron auto-close | 003_evaluation_cycles_snapshot.sql |

*INV-3-10..13, 15, 17..20, 24 (Frontend RTL) — covered by Wave 3 plans (UI implementation)*

## Task Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Vitest stubs + MSW handlers + fixtures | 4d5c9a1 | 12 (11 new + handlers.ts modified) |
| 2 | pgTAP stubs (5 files: 003-007) | 200b133 | 5 new |

## Quick-access commands

```bash
# Listar TODOs pendentes nos stubs pgTAP Phase 3
grep -r "TODO Wave" supabase/tests/00{3,4,5,6,7}_*.sql

# Verificar que phase3Handlers foi adicionado ao server
grep "phase3Handlers" tests/msw/handlers.ts

# Verificar stubs Vitest (3 describe.skip)
grep -l "describe.skip" src/lib/__tests__/{password,evaluation,climate}*.test.ts

# Rodar testes (exit 0 — 3 suites skipped, 15 todo)
npm test
```

## Verification Results

- `npm test`: exit 0 — Test Files 30 passed | 3 skipped (33); Tests 515 passed | 15 todo (530)
- 3 Vitest stubs with `describe.skip` confirmed: passwordGenerator, evaluationTemplate, climateAggregation
- `phase3Handlers` exported from src/test/perf-mocks/index.ts: CONFIRMED
- 5 pgTAP stubs with `SELECT skip`: ALL PRESENT
- Zero production files modified (src/components/, src/hooks/, src/pages/, supabase/migrations/): CONFIRMED
- `supabase test db`: not executable locally (no local DB) — consistent with Phase 2 Plan 02-01 precedent; SELECT skip(N) guarantees exit 0 when CLI available locally

## Deviations from Plan

### Minor structural adjustments (not rule violations)

**1. Test directory placement**
- **Plan specified:** `src/lib/__tests__/` and `src/test/perf-mocks/`, `src/test/perf-fixtures/`
- **Actual:** Same paths as specified — vitest.config.ts includes both `src/**/*.test.ts` and `tests/**/*.test.ts`
- **Impact:** None — stubs appear in test run as expected (3 skipped suites)

**2. MSW handlers integration**
- **Plan specified:** "Append `...phase3Handlers` to `src/test/handlers/index.ts`"
- **Actual:** File does not exist in project; actual server is `tests/msw/server.ts` + `tests/msw/handlers.ts`. Appended `...phase3Handlers` to `tests/msw/handlers.ts` instead — equivalent functionality
- **Rule:** Rule 3 (auto-fix blocking issue)
- **Commit:** 4d5c9a1

**3. pgTAP file naming**
- **Plan specified:** `003_xxx.sql` (underscore) — files 003-007
- **Existing files:** `003-org-unit-descendants.sql` (dash) — different naming scheme
- **Decision:** Underscore naming (plan's spec) does not conflict with dash naming; both are valid SQL filenames; Supabase CLI runs all *.sql
- **No deviation from plan intent** — files created exactly as specified

## Known Stubs

All stubs are intentional Wave 0 structures:
- `src/lib/__tests__/passwordGenerator.test.ts` — stub by design; Wave 3 implements `src/lib/passwordGenerator.ts`
- `src/lib/__tests__/evaluationTemplate.test.ts` — stub by design; Wave 3 implements `buildZodFromTemplate`
- `src/lib/__tests__/climateAggregation.test.ts` — stub by design; Wave 3 implements TS mirror of k-anon RPC
- `supabase/tests/003-007_*.sql` — stub by design; Wave 1/2 migrations activate real tests

None of these stubs prevent plan goal achievement — this plan's goal IS to create failing-by-default stubs.

## Self-Check: PASSED

Verifications run after Summary creation:
- `[ -f src/lib/__tests__/passwordGenerator.test.ts ]`: FOUND
- `[ -f src/lib/__tests__/evaluationTemplate.test.ts ]`: FOUND
- `[ -f src/lib/__tests__/climateAggregation.test.ts ]`: FOUND
- `[ -f src/test/perf-mocks/index.ts ]`: FOUND
- `[ -f src/test/perf-fixtures/templateSnapshot.ts ]`: FOUND
- `[ -f supabase/tests/003_evaluation_cycles_snapshot.sql ]`: FOUND
- `[ -f supabase/tests/007_backfill_e.sql ]`: FOUND
- `git log | grep 4d5c9a1`: FOUND
- `git log | grep 200b133`: FOUND
- `npm test → exit 0 (33 files, 3 skipped, 15 todo)`: VERIFIED

---

*Phase: 03-performance-refactor*
*Completed: 2026-04-28*
