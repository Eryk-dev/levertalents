---
phase: 03-performance-refactor
plan: 10
subsystem: climate-ui
tags: [k-anonymity, climate, privacy, ui, rtl-tests]
dependency_graph:
  requires: ["03-07"]
  provides: ["ClimateAggregateCard", "Climate page refactor"]
  affects: ["src/pages/Climate.tsx", "src/components/ClimateAggregateCard.tsx"]
tech_stack:
  added: []
  patterns: ["k-anonymity empty state", "TDD RED/GREEN", "useScopedQuery via useClimateSurveys"]
key_files:
  created:
    - src/components/ClimateAggregateCard.tsx
    - src/components/__tests__/ClimateAggregateCard.test.tsx
  modified:
    - src/pages/Climate.tsx
decisions:
  - "Used surface-paper div instead of Card LinearKit primitive to support flex layout on k-anon empty state"
  - "Fixed plan action s.name → s.title per actual DB schema climate_surveys.title"
  - "Preserved ClimateQuestionsDialog and ClimateAnswerDialog in refactored page (pre-Phase-3 components)"
metrics:
  duration: "~10 minutes"
  completed: "2026-04-28T20:18:41Z"
  tasks_completed: 2
  files_modified: 3
---

# Phase 3 Plan 10: ClimateAggregateCard k-anon + Climate page refactor Summary

**One-liner:** k-anonymity-aware ClimateAggregateCard (insufficient_data empty state, no partial count leak) + Climate page refactored with mandatory anônima banner and scoped survey grid.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 (TDD RED) | ClimateAggregateCard test | e46e649 | src/components/__tests__/ClimateAggregateCard.test.tsx |
| 1 (TDD GREEN) | ClimateAggregateCard implementation | 4b36c4c | src/components/ClimateAggregateCard.tsx (83 lines) |
| 2 | Climate.tsx page refactor | 272d4b9 | src/pages/Climate.tsx (154 lines, was 343) |

## Component Summary

### ClimateAggregateCard.tsx (83 lines)

Props interface:
```tsx
export interface ClimateAggregateCardProps {
  surveyId: string;
  orgUnitId?: string | null;
  surveyName: string;
  orgUnitName?: string;
}
```

States:
- **Loading:** shadcn Skeleton with `min-h-[160px]`
- **Insufficient (D-10):** empty state with `Users` icon + locked copy (UI-SPEC §k-anonymity rendering) — NO count exposed, NO CTA
- **Full aggregate:** avg (1 decimal) + count + distribution mini-bars (5 score buckets)

Threat T-3-02 (HIGH) mitigated: the `insufficient_data` branch never renders any count number. RTL test asserts `queryByText(/respostas/i)` is absent.

### Climate.tsx refactor (154 lines, down from 343)

- Mandatory banner `status-blue-soft` with "Esta pesquisa é 100% anônima." (INV-3-10)
- Active surveys grid of `ClimateAggregateCard` components (k-anon-aware via hook)
- All surveys list preserved for answer/manage actions
- `useClimateSurveys()` via `useScopedQuery` — company-scoped (PERF-06)
- Responder button `aria-label="Pesquisa de clima — anônima"` (D-11 UI signal)
- No `useUserProfile` in response flow — `ClimateAnswerDialog` submits via RPC (D-11)

## RTL Tests

3 tests in `src/components/__tests__/ClimateAggregateCard.test.tsx`:
1. `insufficient_data:true` → empty state visible + `queryByText(/respostas/i)` absent + no button
2. Full aggregate `count >= 3` → avg + count displayed
3. Loading → animate-pulse skeleton present

All 34 test files, 532 tests passing after refactor.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed s.name → s.title in Climate.tsx action code**
- **Found during:** Task 2
- **Issue:** Plan action code used `s.name` but `climate_surveys` DB schema has `title` column (verified in types.ts)
- **Fix:** Used `s.title` throughout Climate.tsx
- **Files modified:** src/pages/Climate.tsx
- **Commit:** 272d4b9

**2. [Rule 2 - Convention] Used surface-paper div instead of LinearKit Card for k-anon empty state**
- **Found during:** Task 1
- **Issue:** LinearKit `Card` component doesn't support HTML attrs on the outer element cleanly (takes `title/action/children/className/contentClassName`). The k-anon empty state needs `flex flex-col items-center justify-center` on the container itself, not wrapped inside `contentClassName`
- **Fix:** Used `surface-paper p-3.5 min-h-[160px]` div directly (same visual output as Card, matches existing Climate.tsx pattern)
- **Files modified:** src/components/ClimateAggregateCard.tsx
- **Commit:** 4b36c4c

## TDD Gate Compliance

- RED gate commit: e46e649 (`test(03-10): add failing test...`)
- GREEN gate commit: 4b36c4c (`feat(03-10): ClimateAggregateCard...`)
- REFACTOR: not needed — code was clean on first pass

## Known Stubs

None — ClimateAggregateCard wires directly to `useClimateAggregate` hook (Plan 03-07); Climate.tsx wires to `useClimateSurveys` (Plan 03-07). No hardcoded empty values flowing to UI.

## Threat Flags

No new threat surface introduced beyond what the plan's threat model covers. `ClimateAnswerDialog` was already updated in Plan 03-07 to use the anonymous RPC. No new network endpoints or auth paths in this plan.

## Requirements Coverage

| Requirement | Coverage |
|-------------|----------|
| PERF-05 (100% anônima UI) | Banner + locked copy in ClimateAggregateCard empty state |
| PERF-06 (company scope) | useClimateSurveys → useScopedQuery |
| D-10 (k-anonymity ≥3) | ClimateAggregateCard insufficient_data branch |
| D-11 (no user identity in form) | No useUserProfile in flow; RPC submit |
| INV-3-09 (RTL k-anon test) | 3 RTL tests green |
| INV-3-10 (banner anônima grep) | Verified: grep "Esta pesquisa é 100% anônima" passes |
| T-3-02 (no count leak in insufficient branch) | RTL anti-leak assertion + code structure |

## Self-Check: PASSED

- `src/components/ClimateAggregateCard.tsx`: FOUND
- `src/components/__tests__/ClimateAggregateCard.test.tsx`: FOUND
- `src/pages/Climate.tsx`: FOUND
- Commit e46e649: FOUND (git log)
- Commit 4b36c4c: FOUND (git log)
- Commit 272d4b9: FOUND (git log)
- 532 tests passing: CONFIRMED

## Next

Plan 03-11: CreateUser + WhatsApp + first-login + ProtectedRoute
