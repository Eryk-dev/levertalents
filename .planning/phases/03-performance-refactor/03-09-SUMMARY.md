---
phase: 03-performance-refactor
plan: 09
subsystem: ui
tags: [react-hook-form, zod, dynamic-schema, evaluation-cycles, evaluation-templates, rtl, vitest]

# Dependency graph
requires:
  - phase: 03-07
    provides: useEvaluations, useEvaluationCycles, useEvaluationTemplates, useCreateCycle, useCreateEvaluation, useUpdateEvaluation hooks
  - phase: 03-06
    provides: buildZodFromTemplate, TemplateSnapshot, TemplateSection, TemplateQuestion from src/lib/evaluationTemplate.ts

provides:
  - EvaluationForm.tsx: orchestrator <300 ln with dynamic Zod resolver from buildZodFromTemplate (PERF-02, PERF-07)
  - EvaluationFormSection.tsx: renders one template section (Card + question iteration)
  - EvaluationFormQuestion.tsx: discriminated union render per question.type (scale_1_5 / text / choice)
  - CycleCard.tsx: card display per cycle with status chip and date range (PERF-01)
  - CreateCycleDialog.tsx: RHF + Zod dialog for creating cycles (template_id, name, starts_at, ends_at)
  - Evaluations.tsx: page listing cycles scoped by company via useEvaluationCycles; tabs Em andamento / Encerrados
  - RTL tests: 3 tests covering 3 question types + locked CTAs (INV-3-06)

affects:
  - 03-10
  - 03-11

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Dynamic Zod resolver via buildZodFromTemplate(templateSnapshot) wrapped in useMemo — zero as any casts (D-07 + Pattern 3)"
    - "EvaluationForm orchestrator pattern: <300 ln parent + Section/Question sub-components for question rendering"
    - "CycleCard with status chip logic (active/closed/draft/expiring-soon) derived from cycle.status + differenceInDays"
    - "CreateCycleDialog: cross-field Zod refinement for ends_at > starts_at with inline error message"

key-files:
  created:
    - src/components/EvaluationFormQuestion.tsx
    - src/components/EvaluationFormSection.tsx
    - src/components/CycleCard.tsx
    - src/components/CreateCycleDialog.tsx
    - src/components/__tests__/EvaluationForm.test.tsx
  modified:
    - src/components/EvaluationForm.tsx
    - src/pages/Evaluations.tsx

key-decisions:
  - "Card from LinearKit does not accept onClick — CycleCard wraps with a div with role=button for clickable behavior"
  - "SectionHeader from LinearKit takes title prop (not children) — EvaluationFormSection passes section.title as Card title prop instead"
  - "useScope() returns { scope } with scope.companyIds — Evaluations.tsx reads scope.companyIds[0] for firstCompanyId"
  - "EvaluationForm control cast via 'as unknown as ...' to satisfy Control<Record<string,unknown>> contract across Section/Question components"

patterns-established:
  - "Orchestrator + Section + Question decomposition for template-driven forms"
  - "Inline TemplateSnapshot in RTL tests (no external fixture import needed for component-level tests)"

requirements-completed: [PERF-01, PERF-02, PERF-03, PERF-04, PERF-07]

# Metrics
duration: 4min
completed: 2026-04-28
---

# Phase 03 Plan 09: EvaluationForm Dynamic Schema + Cycles UI Summary

**EvaluationForm refactored to 102-line orchestrator with dynamic Zod schema from template_snapshot; 5 new components for cycle listing, cycle creation, and form rendering; 3 RTL tests green**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-04-28T20:16:26Z
- **Completed:** 2026-04-28T20:19:56Z
- **Tasks:** 3
- **Files modified:** 7 (2 modified + 5 created)

## Accomplishments

- Refactored `EvaluationForm.tsx` from 773 lines to 102 lines; dynamic Zod resolver generated from `buildZodFromTemplate(templateSnapshot)` wrapped in `useMemo`; zero `as any` casts (PERF-07 / D-07)
- Created `EvaluationFormSection.tsx` + `EvaluationFormQuestion.tsx` presenters covering all 3 question types (scale_1_5 radio group, text textarea, choice select)
- Created `CycleCard.tsx` with status chips ("Em andamento" / "Encerra em Nd" / "Encerrado" / "Rascunho") and selected-state accent border
- Created `CreateCycleDialog.tsx` with RHF + Zod form; cross-field refinement validates `ends_at > starts_at`; locked copy "Abrir ciclo" / "Manter rascunho"
- Refactored `Evaluations.tsx` to list cycles via `useEvaluationCycles`; tabs "Em andamento" / "Encerrados"; empty state with CTA "Criar ciclo"
- 3 RTL tests green covering 3 question type renders + locked action bar CTAs (INV-3-06)

## Task Commits

1. **Task 1: EvaluationForm orchestrator + Section + Question** - `13f429a` (feat)
2. **Task 2: CycleCard + CreateCycleDialog + Evaluations page** - `2b574a2` (feat)
3. **Task 3: RTL test EvaluationForm** - `28692a3` (test)

## Files Created/Modified

- `src/components/EvaluationForm.tsx` — Refactored: 773 → 102 ln; dynamic Zod resolver via buildZodFromTemplate; useCreateEvaluation/useUpdateEvaluation mutations
- `src/components/EvaluationFormSection.tsx` — New: renders one TemplateSection using Card + question iteration
- `src/components/EvaluationFormQuestion.tsx` — New: discriminated union on question.type; scale_1_5 / text / choice renderers
- `src/components/CycleCard.tsx` — New: cycle card with status chip; date range formatted with date-fns/ptBR
- `src/components/CreateCycleDialog.tsx` — New: Dialog form with RHF + Zod; ends_at > starts_at validation
- `src/pages/Evaluations.tsx` — Refactored: 380 → 90 ln; cycles list + tabs + create dialog trigger via useEvaluationCycles
- `src/components/__tests__/EvaluationForm.test.tsx` — New: 3 RTL tests (3 question types render, Salvar avaliação, Salvar rascunho)

## Decisions Made

- `Card` from LinearKit is a plain div without `onClick` support — `CycleCard` wraps content in a styled `div` with `role="button"` for keyboard/click semantics
- `SectionHeader` from LinearKit accepts `title` prop (not children text) — `EvaluationFormSection` passes `section.title` as `Card` title prop
- `useScope()` returns `{ scope }` with `scope.companyIds` array — `Evaluations.tsx` reads `scope?.companyIds?.[0]` for the dialog's `companyId` prop
- Form `control` cast via `as unknown as ...` to bridge `useForm<FormValues>` and the `Control<Record<string,unknown>>` type accepted by `EvaluationFormQuestion`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Card primitive onClick incompatibility**
- **Found during:** Task 2 (CycleCard)
- **Issue:** Plan code passed `onClick` directly to `Card` from LinearKit, but `Card` is a div-based component that does not forward `onClick` from its props interface
- **Fix:** Wrapped card content in a `div` with `role="button"`, `tabIndex`, `onClick`, and `onKeyDown` handlers
- **Files modified:** `src/components/CycleCard.tsx`
- **Verification:** tsc clean; component renders correctly
- **Committed in:** `2b574a2`

**2. [Rule 1 - Bug] SectionHeader children vs title prop**
- **Found during:** Task 1 (EvaluationFormSection)
- **Issue:** Plan code used `<SectionHeader>{section.title}</SectionHeader>` but LinearKit's `SectionHeader` takes a `title` prop, not children
- **Fix:** Used `<Card title={section.title}>` as the section wrapper (LinearKit Card renders title in its header section)
- **Files modified:** `src/components/EvaluationFormSection.tsx`
- **Verification:** tsc clean; renders section title correctly
- **Committed in:** `13f429a`

**3. [Rule 1 - Bug] useScope() API differs from plan code**
- **Found during:** Task 2 (Evaluations.tsx)
- **Issue:** Plan used `useScope().companyIds` but the hook returns `{ scope, ... }` and `companyIds` lives on `scope.companyIds`
- **Fix:** Destructured `const { scope } = useScope()` and accessed `scope?.companyIds?.[0]` / `scope?.kind === 'company'`
- **Files modified:** `src/pages/Evaluations.tsx`
- **Verification:** tsc clean; correct API usage
- **Committed in:** `2b574a2`

---

**Total deviations:** 3 auto-fixed (all Rule 1 — primitive API mismatches between plan code and actual LinearKit/ScopeProvider interfaces)
**Impact on plan:** All fixes necessary for correct API usage. Zero scope creep. All plan objectives fully delivered.

## Issues Encountered

None beyond the API mismatches documented as deviations above.

## Known Stubs

None — all components render real data from hooks (useEvaluationCycles, useEvaluationTemplates). No hardcoded empty arrays or placeholder text flowing to UI.

## Threat Flags

None — no new network endpoints, auth paths, or trust boundary surface introduced. Components consume existing hooks (Wave 3 Plan 03-07) which apply RLS via useScopedQuery.

## Next Phase Readiness

- EvaluationForm is now ready to accept `cycle.template_snapshot` as prop from any cycle drill-down view
- CycleCard + CreateCycleDialog are composable for embedding in drawer or full-page views
- Plan 03-10 (Climate) can proceed; no blockers from this plan

---
*Phase: 03-performance-refactor*
*Completed: 2026-04-28*
