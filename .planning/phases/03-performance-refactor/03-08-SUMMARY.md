---
phase: 03-performance-refactor
plan: "08"
subsystem: one-on-ones
tags: [split, hooks, plaud, rh-notes, casl, rtl-tests]
dependency_graph:
  requires: ["03-07"]
  provides: ["03-09"]
  affects: ["src/components/OneOnOneMeetingForm.tsx", "src/features/tenancy/lib/abilities.ts"]
tech_stack:
  added: []
  patterns:
    - "Component split orchestrator < 300 ln + 6 sub-components (D-18)"
    - "4 custom hooks extracted from monolith (D-19)"
    - "vi.hoisted() for Vitest mock factory shared state"
    - "SectionHeader uses title prop (not children)"
key_files:
  created:
    - src/hooks/useMeetingTimer.ts
    - src/hooks/useAgendaState.ts
    - src/hooks/useActionItemsState.ts
    - src/hooks/usePlaudInput.ts
    - src/components/OneOnOneAgenda.tsx
    - src/components/OneOnOneNotes.tsx
    - src/components/OneOnOneActionItems.tsx
    - src/components/OneOnOnePDIPanel.tsx
    - src/components/OneOnOneRHNote.tsx
    - src/components/OneOnOneRHVisibleBadge.tsx
    - src/components/__tests__/OneOnOneNotes.test.tsx
    - src/components/__tests__/OneOnOneActionItems.test.tsx
    - src/components/__tests__/OneOnOneMeetingForm.test.tsx
  modified:
    - src/components/OneOnOneMeetingForm.tsx
    - src/features/tenancy/lib/abilities.ts
decisions:
  - "SectionHeader API uses title prop (not children) — fixed across all 5 sub-components"
  - "OneOnOneRHNote uses inner RHNoteInner component to avoid hooks-in-conditional issue"
  - "vi.hoisted() used to share ability flag between vi.mock factory and test body (Vitest constraint)"
  - "PDIFormIntegrated takes onSubmit/isSubmitting (not userId/meetingId) — OneOnOnePDIPanel uses correct API"
  - "useAbility from @/features/tenancy/lib/abilityContext (not @/shared/data/useAbility as plan stated)"
  - "RhNote added as Subject in abilities.ts; rh role gets manage RhNote; admin inherits via manage all"
metrics:
  duration: "~10 minutes"
  completed: "2026-04-28"
  tasks_completed: 3
  files_created: 13
  files_modified: 2
  tests_added: 10
---

# Phase 03 Plan 08: OneOnOneMeetingForm Split + Plaud + RH Note Summary

Split OneOnOneMeetingForm.tsx (909 ln) into 6 sub-components + 4 custom hooks + orchestrator (141 ln); added Plaud paste textareas (D-12/D-14), RH visible badge (D-15), and RH-only notes via separate table (D-17).

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | 4 custom hooks | fc77ea7 | useMeetingTimer, useAgendaState, useActionItemsState, usePlaudInput |
| 2 | 6 sub-components | 9cb1a3c | OneOnOne{Agenda,Notes,ActionItems,PDIPanel,RHNote,RHVisibleBadge} + abilities.ts |
| 3 | Orchestrator refactor + 10 RTL tests | 3b1442b | OneOnOneMeetingForm.tsx (141 ln) + 3 test files |

## Metrics

- **Orchestrator size:** 141 lines (target < 300 — INV-3-15)
- **Custom hooks:** 4 (all < 100 ln — INV-3-24)
  - useMeetingTimer: 30 ln
  - useAgendaState: 41 ln
  - useActionItemsState: 53 ln
  - usePlaudInput: 32 ln
- **Sub-components:** 6
  - OneOnOneAgenda: 88 ln
  - OneOnOneNotes: 89 ln
  - OneOnOneActionItems: 100 ln
  - OneOnOnePDIPanel: 63 ln
  - OneOnOneRHNote: 70 ln
  - OneOnOneRHVisibleBadge: 31 ln
- **Tests:** 10 tests / 3 files — all green (539 total suite, zero regressions)

## Coverage

- ONE-01..06: 1:1 meeting form complete
- D-12/D-14: Plaud textareas (transcricao_plaud + resumo_plaud in meeting_structure JSONB)
- D-15: RH visible badge persistent in header (INV-3-12)
- D-17: RH notes in separate table one_on_one_rh_notes via useOneOnOneRhNotes
- D-18: Monolith split into orchestrator + 5 sub-sections
- D-19: 4 custom hooks extracted
- QUAL-04: Component > 800 lines touched and broken down

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] SectionHeader uses `title` prop, not children**
- **Found during:** Task 3 (RTL test failure — "Notas RH" not in DOM)
- **Issue:** Plan's example code passed children to SectionHeader (`<SectionHeader>Title</SectionHeader>`), but the actual LinearKit API is `<SectionHeader title="Title" />`
- **Fix:** Fixed across all 5 sub-components and OneOnOneRHNote (which uses JSX element as title)
- **Files modified:** OneOnOneNotes.tsx, OneOnOneAgenda.tsx, OneOnOneActionItems.tsx, OneOnOnePDIPanel.tsx, OneOnOneRHNote.tsx
- **Commit:** 3b1442b

**2. [Rule 1 - Bug] PDIFormIntegrated props mismatch**
- **Found during:** Task 2
- **Issue:** Plan suggested `<PDIFormIntegrated userId={collaboratorId} meetingId={meetingId} />` but the actual component interface is `onSubmit/isSubmitting/initialData`
- **Fix:** OneOnOnePDIPanel uses `usePDIIntegrated` + `createPDIFromOneOnOne` and passes correct props
- **Files modified:** src/components/OneOnOnePDIPanel.tsx
- **Commit:** 9cb1a3c

**3. [Rule 1 - Bug] useAbility import path**
- **Found during:** Task 2
- **Issue:** Plan referenced `@/shared/data/useAbility` but module lives at `@/features/tenancy/lib/abilityContext`
- **Fix:** All components use correct import path
- **Files modified:** src/components/OneOnOneRHNote.tsx
- **Commit:** 9cb1a3c

**4. [Rule 2 - Missing functionality] CASL RhNote subject absent**
- **Found during:** Task 2 implementation
- **Issue:** `abilities.ts` had no `RhNote` Subject; `can('read', 'rh_notes')` (plan) would always return false
- **Fix:** Added `RhNote` to Subject type; rh role gets `can('manage', 'RhNote')`; admin inherits via `manage all`
- **Files modified:** src/features/tenancy/lib/abilities.ts
- **Commit:** 9cb1a3c

**5. [Rule 1 - Bug] vi.mock factory can't close over mutable `let` in Vitest**
- **Found during:** Task 3 test authoring
- **Issue:** Vitest hoists `vi.mock()` before module-level `let` declarations, so closing over the variable gives stale reference
- **Fix:** Used `vi.hoisted()` to create a shared mutable object that both the mock factory and test body can mutate
- **Files modified:** src/components/__tests__/OneOnOneMeetingForm.test.tsx
- **Commit:** 3b1442b

## Threat Flags

No new network endpoints, auth paths, or schema changes introduced by this plan. All threat mitigations from the plan's STRIDE register were applied:

| Flag | File | Description |
|------|------|-------------|
| T-3-01 mitigated | OneOnOneRHNote.tsx | DOM-absent (not display:none) for liderado — `if (!ability.can('read', 'RhNote')) return null` |
| T-3-RH-01 mitigated | abilities.ts | CASL RhNote subject defined; RLS is security boundary |

## Known Stubs

None. All data flows wired: Plaud fields persist to `meeting_structure` via `useUpdateOneOnOne`; RH notes persist to `one_on_one_rh_notes` via `useUpsertOneOnOneRhNote`.

## Self-Check: PASSED

Files verified:

- [x] src/hooks/useMeetingTimer.ts — exists, 30 ln
- [x] src/hooks/useAgendaState.ts — exists, 41 ln
- [x] src/hooks/useActionItemsState.ts — exists, 53 ln
- [x] src/hooks/usePlaudInput.ts — exists, 32 ln
- [x] src/components/OneOnOneAgenda.tsx — exists, 88 ln
- [x] src/components/OneOnOneNotes.tsx — exists, 89 ln
- [x] src/components/OneOnOneActionItems.tsx — exists, 100 ln
- [x] src/components/OneOnOnePDIPanel.tsx — exists, 63 ln
- [x] src/components/OneOnOneRHNote.tsx — exists, 70 ln
- [x] src/components/OneOnOneRHVisibleBadge.tsx — exists, 31 ln
- [x] src/components/OneOnOneMeetingForm.tsx — 141 ln (< 300)
- [x] src/features/tenancy/lib/abilities.ts — RhNote subject added
- [x] src/components/__tests__/OneOnOneNotes.test.tsx — 4 tests green
- [x] src/components/__tests__/OneOnOneActionItems.test.tsx — 3 tests green
- [x] src/components/__tests__/OneOnOneMeetingForm.test.tsx — 3 tests green

Commits verified:

- [x] fc77ea7 — Task 1: 4 custom hooks
- [x] 9cb1a3c — Task 2: 6 sub-components + abilities.ts
- [x] 3b1442b — Task 3: orchestrator refactor + 10 RTL tests
