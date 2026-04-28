---
phase: 03-performance-refactor
plan: "03"
subsystem: database
tags: [postgres, supabase, migrations, company_id, backfill, rls, multi-tenant, performance]

# Dependency graph
requires:
  - phase: 01-tenancy-backbone
    provides: companies table, org_units adjacency tree, org_unit_members membership table, visible_companies() helper
  - phase: 03-performance-refactor
    provides: Phase 3 Migration E (backfill E — companies + teams converted, org_unit_members populated)

provides:
  - "company_id UUID NULL column on evaluations (expand, not constrained yet — deferred to perf2)"
  - "company_id UUID NOT NULL column on one_on_ones (constrained in PRE.3)"
  - "company_id UUID NOT NULL column on climate_surveys (constrained in PRE.3)"
  - "3 performance indexes: idx_evaluations_company_id, idx_one_on_ones_company_id, idx_climate_surveys_company_id"
  - "Backfill logic via org_unit_members lookup (evaluator_user_id / leader_id+collaborator_id fallback / created_by)"
  - "Fail-fast contract: RAISE EXCEPTION if orphans remain in one_on_ones or climate_surveys before SET NOT NULL"

affects:
  - "03-04 (RLS rewrite for perf1/clim1/one1 — requires company_id NOT NULL for USING clauses)"
  - "03-05 (BLOCKING apply — applies all 3 migrations to remote; pgTAP validation gate)"
  - "03-07 (hooks rewrite — useScopedQuery will now find company_id on evaluations/one_on_ones/climate_surveys)"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "expand→backfill→contract migration pattern (established in Phase 2 F.1, reused here)"
    - "Fail-fast RAISE EXCEPTION in contract step (orphan rows block SET NOT NULL by design)"
    - "RAISE NOTICE sanity report in backfill (non-blocking; surfaces orphan count before contract)"
    - "Idempotent DDL: ADD COLUMN IF NOT EXISTS + WHERE company_id IS NULL"

key-files:
  created:
    - supabase/migrations/20260429125000_perf_pre_company_id_expand.sql
    - supabase/migrations/20260429125100_perf_pre_company_id_backfill.sql
    - supabase/migrations/20260429125200_perf_pre_company_id_constrain.sql
  modified: []

key-decisions:
  - "evaluations.company_id NOT NULL deferred to Plan 03-04 perf2: perf2 TRUNCATEs evaluations first (D-08), making SET NOT NULL trivial and safe — constraining here would fail if any orphan evaluation exists"
  - "one_on_ones fallback: if leader_id has no org_unit_membership, try collaborator_id — ensures maximum backfill coverage for preserved data tables"
  - "PRE.3 is intentionally fail-fast: RAISE EXCEPTION on orphan one_on_ones/climate_surveys forces owner to resolve before Plan 03-04 RLS rewrite can run"

patterns-established:
  - "expand→backfill→contract across 3 migrations for brownfield NOT NULL addition"
  - "Backfill via user→org_unit→company lookup chain (evaluator/leader/created_by → org_unit_members → org_units.company_id)"

requirements-completed:
  - PERF-01
  - PERF-04
  - PERF-06
  - ONE-01
  - ONE-02

# Metrics
duration: 2min
completed: "2026-04-28"
---

# Phase 03 Plan 03: Performance Pre-migration — company_id expand/backfill/constrain on evaluations, one_on_ones, climate_surveys

**3 idempotent migrations adding company_id FK to legacy performance tables via expand→backfill→contract: NULLABLE expand (PRE.1), user→org_unit→company backfill with NOTICE orphan report (PRE.2), fail-fast NOT NULL contract on one_on_ones+climate_surveys with evaluations deferred to perf2 TRUNCATE (PRE.3)**

## Performance

- **Duration:** 2 min
- **Started:** 2026-04-28T19:19:21Z
- **Completed:** 2026-04-28T19:21:30Z
- **Tasks:** 3
- **Files modified:** 3 (all new)

## Accomplishments

- Migration PRE.1: Added `company_id UUID NULL FK companies` to `evaluations`, `one_on_ones`, `climate_surveys` with performance indexes — idempotent via `ADD COLUMN IF NOT EXISTS`
- Migration PRE.2: Backfill via `evaluator_user_id` / `leader_id` (with `collaborator_id` fallback) / `created_by` → `org_unit_members → org_units.company_id` — idempotent via `WHERE company_id IS NULL`, with RAISE NOTICE orphan count for owner awareness
- Migration PRE.3: `SET NOT NULL` on `one_on_ones` + `climate_surveys`; evaluations deferred to Plan 03-04 `perf2` (TRUNCATE there first); fail-fast RAISE EXCEPTION if any orphans remain

## Task Commits

Each task was committed atomically:

1. **Task 1: Migration PRE.1 — ADD COLUMN company_id NULLABLE FK** - `a3184db` (feat)
2. **Task 2: Migration PRE.2 — Backfill company_id via lookup user→org_unit→company** - `b9282c3` (feat)
3. **Task 3: Migration PRE.3 — SET NOT NULL company_id (contract step)** - `2fb43e0` (feat)

## Files Created/Modified

- `supabase/migrations/20260429125000_perf_pre_company_id_expand.sql` — Expand: 3x ADD COLUMN IF NOT EXISTS, 3x idx, 3x COMMENT; NULLABLE FK to companies ON DELETE RESTRICT
- `supabase/migrations/20260429125100_perf_pre_company_id_backfill.sql` — Backfill: 4 UPDATE via org_unit_members JOIN; collaborator_id fallback for one_on_ones; RAISE NOTICE sanity check; D-08 note
- `supabase/migrations/20260429125200_perf_pre_company_id_constrain.sql` — Contract: SET NOT NULL on one_on_ones + climate_surveys; evaluations deferred (commented); RAISE EXCEPTION if orphans

## Decisions Made

- **evaluations.company_id NOT NULL deferred to perf2:** Plan 03-04's `perf2` migration TRUNCATEs evaluations before the NOT NULL gate — constraining in PRE.3 would fail-fast unnecessarily if any seed/test evaluation row has no org_unit_membership for the evaluator. Deferred is safer and consistent with D-08.
- **one_on_ones collaborator_id fallback:** If a leader has no `org_unit_members` row, the fallback tries `collaborator_id` — critical for `one_on_ones` which are rows preserved through the phase (not truncated). Maximizes backfill coverage.
- **Fail-fast RAISE EXCEPTION in PRE.3:** Intentional design — one_on_ones and climate_surveys are never truncated, so any orphan here signals a real data gap that must be resolved by owner before Plan 03-04 RLS rewrite.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## Expected Warnings at Apply (Plan 03-05)

If production data contains users without org_unit_memberships, PRE.2 will emit NOTICE messages:

- `PRE.2 WARNING: N evaluations sem company_id após backfill`
- `PRE.2 WARNING: N one_on_ones sem company_id — verificar leader_id E collaborator_id sem memberships`
- `PRE.2 WARNING: N climate_surveys sem company_id — verificar created_by sem membership`

**Action required before PRE.3 applies:** Owner must run manual UPDATE to assign a fallback `company_id` to orphan rows in `one_on_ones` and `climate_surveys`, OR accept PITR recovery. Evaluations orphans are tolerated (TRUNCATE in perf2 clears them).

## pgTAP Gates for Plan 03-05

After applying PRE.1→PRE.2→PRE.3, the pgTAP tests in Plan 03-05 should validate:

- `one_on_ones.company_id` is NOT NULL (column constraint)
- `climate_surveys.company_id` is NOT NULL (column constraint)
- `evaluations.company_id` exists and is NULL-able (column exists, NOT NULL deferred)
- No `one_on_ones` rows with NULL `company_id` exist post-backfill
- No `climate_surveys` rows with NULL `company_id` exist post-backfill

## User Setup Required

None — migrations are written but not applied. Plan 03-05 [BLOCKING] handles apply to remote.

## Next Phase Readiness

- **Plan 03-04 (RLS rewrite):** Pre-condition met — `company_id` will be NOT NULL on `one_on_ones` + `climate_surveys` after Plan 03-05 apply. Evaluations NOT NULL will be set by `perf2` within Plan 03-04. RLS `USING (company_id = ANY(visible_companies(auth.uid())))` patterns are now unblocked.
- **Plan 03-05 [BLOCKING]:** 3 migration files ready to push to `ehbxpbeijofxtsbezwxd` remote. Orphan NOTICE output must be reviewed before PRE.3 applies.

---
*Phase: 03-performance-refactor*
*Completed: 2026-04-28*
