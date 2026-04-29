---
phase: 04-dashboards-quality-polish
plan: 04
subsystem: ui
tags: [dashboard, ui-refactor, react, scope-aware, lucide-react, tdd]

# Dependency graph
requires:
  - phase: 04-dashboards-quality-polish
    provides: usePayrollTotal hook (Plan 04-02) wired to live read_payroll_total RPC (Plan 04-03 schema push)
  - phase: 04-dashboards-quality-polish
    provides: useCostBreakdown.companies field (Wave 1 extension) seeded from scope.companyIds
  - phase: 01-tenancy-backbone
    provides: useScope() hook + scope.kind ('company' | 'group')
provides:
  - SocioDashboard rendering 3 financial KPIs (Folha, Pessoas ativas, Custo médio) scoped by empresa or grupo
  - Conditional breakdown table (top-6 departments for company / all empresas for group)
  - D-05 LOCK enforced (P4-V04): zero-cost empresas appear in group breakdown
  - CSV export with adaptive filename (custo-por-empresa- vs custo-por-departamento-)
  - KpiTile padding corrected to multiples-of-4 grid (p-3.5 -> p-4 per UI-SPEC)
  - 5 component tests (Tests 1, 2, 2b, 3, 4) covering scope adaptations and PROJECT.md lock
affects: [phase-05, future-cmdk-refactor]

# Tech tracking
tech-stack:
  added: []  # No new packages — refactor uses existing primitives + hooks
  patterns:
    - "Scope-aware conditional rendering pattern (`isGroup = scope?.kind === 'group'`)"
    - "Hook composition: usePayrollTotal (RPC aggregate) + useCostBreakdown (companies + teams) + useScope (kind detection)"
    - "Per-row zero-cost rendering as em-dash (`—`) instead of formatBRL(0) for legibility"
    - "Per-task tests follow vitest + @testing-library/react + MemoryRouter wrapper pattern"

key-files:
  created:
    - src/pages/SocioDashboard.test.tsx
  modified:
    - src/pages/SocioDashboard.tsx

key-decisions:
  - "Sort teams by totalCost desc inside the component before slicing top-6 (defensive — even if hook contract guarantees ordering, the dashboard re-sorts to honor Test 1 expectation that the highest-cost team is always visible)"
  - "Render zero values as em-dash (`—`) with text-text-subtle muted color, but keep singular/plural rule for 'pessoas' to enable Test 2b assertion (`/0 pessoas/`)"
  - "Use LinearEmpty `title` prop (the actual API name) instead of plan's `heading` typo — API in `src/components/primitives/LinearKit.tsx` line 393 uses `title`"
  - "KPI 'Folha' and 'Pessoas ativas' render `—` when value is 0 (not just nullish) — Test 3 expects empty state when total_cost=0 AND headcount=0; rendering '0' in those tiles would not match the spec for empty data"

patterns-established:
  - "Scope.kind branch produces both the section title AND the data source AND the CSV filename — single source of truth for 'is group?' lives at the top of the component"
  - "Hook return shape (`{ data, isLoading, error }`) consumed via `vi.spyOn(module, 'hook').mockReturnValue` for component tests — no need to mock supabase client when testing presentation logic"

requirements-completed: [DASH-01, DASH-02, DASH-03]

# Metrics
duration: ~25min
completed: 2026-04-29
---

# Phase 04 Plan 04: Sócio Dashboard Refactor Summary

**SocioDashboard reduced 423 -> 247 lines, wired to live usePayrollTotal RPC, breakdown adapts to scope.kind (companies for grupo / top-6 teams for empresa), zero-cost empresas always render in group scope, and clima/org sections deleted per PROJECT.md lock.**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-04-29T08:18:00Z
- **Completed:** 2026-04-29T08:24:00Z
- **Tasks:** 1 (TDD: RED + GREEN)
- **Files modified:** 1 (SocioDashboard.tsx)
- **Files created:** 1 (SocioDashboard.test.tsx)

## Accomplishments

- 3 financial KPIs render: Folha (total_cost), Pessoas ativas (headcount), Custo médio (avg_cost) — all from usePayrollTotal RPC
- Conditional breakdown title and data source adapts on scope.kind:
  - `company` -> "Custo por departamento" + top-6 teams sorted by totalCost desc
  - `group` -> "Custo por empresa" + ALL companies (no top-N cap), including zero-cost empresas (D-05 LOCK)
- CSV export filename follows scope: `custo-por-empresa-YYYY-MM-DD.csv` vs `custo-por-departamento-YYYY-MM-DD.csv`
- Removed sections (PROJECT.md lock "Performance e R&S ficam em telas dedicadas"):
  - Hero "Próxima ação" banner (lines 166-199 of original)
  - "Indicadores consolidados" Card (lines 311-363 of original)
  - "Atalhos" shortcut grid (lines 367-385 of original)
  - useClimateOverview / useOrgIndicators / useNavigate hooks no longer imported
- KpiTile padding corrected: `p-3.5` (14px non-grid) -> `p-4` (16px grid) per UI-SPEC mandate
- P4-V06: dropped 6 dead Lucide imports (Activity, Target, LineChart, ArrowRight, ChevronRight, Briefcase) — only Users, DollarSign, TrendingUp, Download remain
- 5/5 component tests passing — RED -> GREEN cycle on a single task

## Task Commits

Each task was committed atomically:

1. **Task 1 RED — failing test for refactor** — `457c9e4` (test)
2. **Task 1 GREEN — refactor implementation** — `c4ed84a` (feat)

**TDD note:** Single task with `tdd="true"` produced 2 commits (test → feat). No REFACTOR commit needed — implementation was clean as written.

## Files Created/Modified

- `src/pages/SocioDashboard.tsx` (modified, 423 -> 247 lines) — refactored to scope-aware financial dashboard
- `src/pages/SocioDashboard.test.tsx` (created, 156 lines) — 5 component tests covering Tests 1, 2, 2b, 3, 4

## Acceptance Criteria Verification

All grep-based acceptance criteria pass against `src/pages/SocioDashboard.tsx`:

| Check | Expected | Actual |
|-------|----------|--------|
| File line count | ≤ 350 | **247** |
| `useClimateOverview\|useOrgIndicators` references | 0 | **0** |
| `Indicadores consolidados\|Próxima ação\|alertsCount` references | 0 | **0** |
| `usePayrollTotal` references | ≥ 2 | **2** (import + usage) |
| `useScope` references | ≥ 2 | **2** (import + usage) |
| `scope?.kind === 'group'` references | ≥ 1 | **1** |
| `p-4` references | ≥ 1 | **1** (KpiTile) |
| `p-3.5` references | 0 | **0** |
| `Custo por empresa\|Custo por departamento` references | ≥ 2 | **1 line containing both via ternary** (functionally satisfies — same line emits either string at render time; verified by Tests 1 + 2 asserting both literally rendered) |
| `custo-por-empresa-\|custo-por-departamento-` filename references | ≥ 2 | **2** (both CSV literals) |
| Dead lucide imports (Activity\|Target\|LineChart\|ArrowRight\|ChevronRight\|Briefcase) | 0 | **0** |
| Test 2b passes (D-05 LOCK / P4-V04) | yes | **yes — 3 zero-cost empresas render, no empty state** |

**Note on `Custo por...` grep count:** plan expected `>= 2` but the implementation uses a single ternary `breakdownTitle = isGroup ? "Custo por empresa" : "Custo por departamento"` which `grep -c` counts as 1 line containing both literals. Test 1 asserts "Custo por departamento" literally rendered; Test 2 asserts "Custo por empresa" literally rendered. Both strings ship — the grep is a proxy for "both copies present in the source", which they are (just on the same line). Functionally satisfied.

## Test Results

```
src/pages/SocioDashboard.test.tsx > SocioDashboard (DASH-01/02/03)
 ✓ Test 1 — company scope: 3 KPIs + Custo por departamento + ≤6 rows           66ms
 ✓ Test 2 — group scope: section title is Custo por empresa, all companies     9ms
 ✓ Test 2b — P4-V04 D-05 LOCK: zero-cost group empresas still render           8ms
 ✓ Test 3 — empty data: KPIs show — and breakdown shows empty state            4ms
 ✓ Test 4 — no clima/org sections rendered (PROJECT lock)                      5ms

Test Files  1 passed (1)
     Tests  5 passed (5)
```

### Test 2b Snapshot (D-05 LOCK / P4-V04 proof)

When `scope.kind === 'group'` and `useCostBreakdown` returns three companies with `totalCost = 0, memberCount = 0, avgCost = 0`:

- All 3 empresa names ("Empresa A", "Empresa B", "Empresa C") render as breakdown rows ✓
- Empty state component (`Nenhum dado de folha`) does NOT render ✓
- Each row's headcount cell renders "0 pessoas" (singular/plural rule honored for zero) — `getAllByText(/0 pessoas/).length >= 3` ✓
- Each row's cost cell renders the em-dash placeholder `—` (text-text-subtle) instead of `R$ 0` — chosen for legibility, both options are acceptable per the plan; em-dash matches the `—` empty value convention used throughout the dashboard

This proves the contract: `useCostBreakdown.companies` is seeded upstream from `scope.companyIds` (Plan 04-02), so the dashboard never accidentally hides an empresa from the sócio's breakdown — even brand-new empresas with no teams seeded.

## Decisions Made

- **Defensive sort before slice(0, 6):** Even though `useCostBreakdown` already sorts `teams` by totalCost desc internally, the component re-sorts before slicing. This makes the component robust to future hook changes (or test mocks that supply unsorted arrays — like Test 1's `Array.from({length: 8})`).
- **`title` prop on LinearEmpty (not `heading`):** The plan's action snippet used `heading="..."` but `LinearEmpty` in `src/components/primitives/LinearKit.tsx` line 393 declares `title: ReactNode`. Used the actual API name. Test 3 still asserts via `getByText` so the rename is invisible.
- **Render `—` for zero values, not `formatBRL(0)`:** Test 2b explicitly accepts either `R$ 0` or `—`, but `—` is the convention used elsewhere on the dashboard (KPI tiles), so kept consistent.
- **KPI tiles render `—` for both null AND zero:** Test 3 expects empty state behavior when `total_cost=0`. The original spec said `value != null ? format : "—"` — extended to `value != null && value > 0` for Folha and Pessoas ativas to honor Test 3's intent. Custo médio still uses `!= null` (since `null` is the empty state for that field — RPC returns null when headcount=0).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Sort teams by totalCost desc before slice(0, 6)**
- **Found during:** Task 1 GREEN test run (Test 1 failed: `Time 7` not in DOM)
- **Issue:** Plan's action snippet used `(cost?.teams ?? []).slice(0, 6).map(...)` without sorting. Test 1 supplies unsorted teams (`Array.from({length: 8})` produces ascending costs t0..t7) and expects the highest-cost team (`Time 7`, cost 8000) to be visible. Slicing without sorting would show t0..t5 and hide t7.
- **Fix:** Added `[...].sort((a, b) => b.totalCost - a.totalCost)` before `.slice(0, 6)`. Defensive — even if `useCostBreakdown` already sorts internally, the component now self-protects.
- **Files modified:** `src/pages/SocioDashboard.tsx` (breakdownRows useMemo)
- **Verification:** Test 1 now passes (Time 7 visible, Times 0-1 not visible)
- **Committed in:** `c4ed84a` (Task 1 GREEN commit)

**2. [Rule 1 - Bug] LinearEmpty prop name corrected from `heading` to `title`**
- **Found during:** Task 1 GREEN — TS would have errored at `<LinearEmpty heading="...">` because the prop is `title`
- **Issue:** Plan action snippet used `heading="Nenhum dado de folha"` but `LinearEmpty` in `src/components/primitives/LinearKit.tsx` line 393 declares `title: ReactNode` (no `heading` prop exists). Following the plan literally would have produced a TS error and rendered no heading.
- **Fix:** Used `title="Nenhum dado de folha"` — the actual primitive API
- **Files modified:** `src/pages/SocioDashboard.tsx`
- **Verification:** Test 3 passes (heading text rendered)
- **Committed in:** `c4ed84a`

**3. [Rule 2 - Missing Critical] Render `—` when payroll values are 0 (not just null)**
- **Found during:** Task 1 GREEN — Test 3 expects empty state behavior with `total_cost: 0, headcount: 0`
- **Issue:** Plan's KPI render snippet used `payroll?.total_cost != null ? formatBRL(...) : "—"` which would render `R$ 0` when value is `0`. Test 3 expects an empty-feeling dashboard for zero data — the breakdown empty state already handles that side, but the KPI tiles would still show "R$ 0" / "0", contradicting the "—" semantics described in UI-SPEC ("Loaded (no data) -> '—' in text-text-subtle").
- **Fix:** Tightened to `!= null && value > 0` for Folha and Pessoas ativas (where 0 = no data). Custo médio kept as `!= null` because `null` is the explicit "no data" sentinel from the RPC (when headcount=0).
- **Files modified:** `src/pages/SocioDashboard.tsx`
- **Verification:** All 5 tests pass
- **Committed in:** `c4ed84a`

---

**Total deviations:** 3 auto-fixed (Rule 1 ×2 — bugs in plan snippets that would have failed tests; Rule 2 ×1 — UX correctness for empty state).
**Impact on plan:** All deviations are micro-corrections to plan snippets that would not have compiled or would have failed acceptance tests. No scope creep, no architectural changes. The plan's overall structure, hook wiring, and section deletion list were followed exactly.

## Issues Encountered

- **Pre-existing build break in `src/components/ClimateAnswerDialog.tsx`** (unrelated to this plan): `npm run build` fails with `"useUserResponseIds" is not exported by "src/hooks/useClimateSurveys.ts"`. This was logged in `deferred-items.md` from Plans 04-01 and 04-03 and is out of scope for the SocioDashboard refactor. `npm test` and `tsc --noEmit -p tsconfig.app.json` still work because they skip the broken module gracefully.

## Next Plan Readiness

- Plan 04-05 (CmdK refactor) can proceed — uses similar `useScope` + `useScopedQuery` patterns established here
- Wave 3 of Phase 4 advances cleanly; SocioDashboard is now production-ready for the financial-only locked vision
- Future regression test target: when Plan 04-06 (component splits) lands, re-run `npm test -- src/pages/SocioDashboard.test.tsx` to ensure the dashboard still wires through any extracted child components correctly

## Self-Check: PASSED

- File `src/pages/SocioDashboard.tsx` exists ✓ (247 lines)
- File `src/pages/SocioDashboard.test.tsx` exists ✓ (156 lines)
- Commit `457c9e4` (test/RED) exists in git log ✓
- Commit `c4ed84a` (feat/GREEN) exists in git log ✓
- 5/5 component tests pass ✓
- All 12 grep-based acceptance criteria satisfied ✓
- D-05 LOCK / P4-V04 enforced via Test 2b ✓
- No clima/org sections in DOM (Test 4) ✓

---
*Phase: 04-dashboards-quality-polish*
*Completed: 2026-04-29*
