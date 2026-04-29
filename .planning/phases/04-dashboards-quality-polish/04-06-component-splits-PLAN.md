---
phase: 04-dashboards-quality-polish
plan: 06
type: execute
wave: 4
depends_on:
  - 03
files_modified:
  - src/pages/hiring/CandidateProfile.tsx
  - src/features/hiring-candidate-profile/components/CandidateHeader.tsx
  - src/features/hiring-candidate-profile/components/CandidateApplicationsSection.tsx
  - src/features/hiring-candidate-profile/components/CandidateFitSection.tsx
  - src/features/hiring-candidate-profile/components/CandidateDecisionSection.tsx
  - src/features/hiring-candidate-profile/components/CandidateAuditSection.tsx
  - src/components/hiring/JobOpeningForm.tsx
  - src/features/hiring-job-form/components/JobBasicsSection.tsx
  - src/features/hiring-job-form/components/JobContractSection.tsx
  - src/features/hiring-job-form/components/JobAddressSection.tsx
autonomous: true
requirements:
  - QUAL-04
tags:
  - refactor
  - component-split
  - phase-4

must_haves:
  truths:
    - "OneOnOneMeetingForm — Phase 3 split is verified post-execution (every match of `find src -iname 'OneOnOneMeetingForm*'` has line count < 800; if any file ≥ 800 lines, an additional split task is scheduled in this plan)"
    - "CandidateProfile.tsx (currently 1169 lines) is reduced to ≤ 350 lines (shell only) — sub-sections live in src/features/hiring-candidate-profile/components/"
    - "JobOpeningForm.tsx (currently 854 lines) is reduced to ≤ 400 lines (shell + Zod schema + react-hook-form orchestration) — sub-sections live in src/features/hiring-job-form/components/"
    - "Existing tests for CandidateProfile and JobOpeningForm flows still pass after the split (no functional regression)"
    - "All imports continue to work: external consumers of CandidateProfile and JobOpeningForm see the same default exports"
    - "Each new sub-component file is ≤ 350 lines AND renders JSX (not an empty stub) AND has at least one named export"
    - "CandidateProfile shell orchestrates the existing data hooks (no scavenger hunt for executors): grep for the canonical hook names returns ≥ 6 imports"
  artifacts:
    - path: src/pages/hiring/CandidateProfile.tsx
      provides: "Shell page that imports the 5 sub-section components and orchestrates layout via existing hooks (useCandidate, useApplicationsByCandidate, useFitResponse, useFitSurveys, useInterviewsByApplication, useAnonymizeCandidate, useJobForApplication, useMoveApplicationStage, useRejectApplication, useIssueFitLink)"
      max_lines: 350
    - path: src/features/hiring-candidate-profile/components/CandidateHeader.tsx
      provides: "Identity header (name, chips, contacts)"
      max_lines: 350
    - path: src/features/hiring-candidate-profile/components/CandidateApplicationsSection.tsx
      provides: "Applications + interviews list"
      max_lines: 350
    - path: src/features/hiring-candidate-profile/components/CandidateFitSection.tsx
      provides: "Cultural fit scores + viewer"
      max_lines: 350
    - path: src/features/hiring-candidate-profile/components/CandidateDecisionSection.tsx
      provides: "Hiring decision panel + admission"
      max_lines: 350
    - path: src/features/hiring-candidate-profile/components/CandidateAuditSection.tsx
      provides: "Background check + anonymize controls"
      max_lines: 350
    - path: src/components/hiring/JobOpeningForm.tsx
      provides: "Shell with Zod schema + react-hook-form orchestration"
      max_lines: 400
    - path: src/features/hiring-job-form/components/JobBasicsSection.tsx
      provides: "company, title, summary, sector"
      max_lines: 350
    - path: src/features/hiring-job-form/components/JobContractSection.tsx
      provides: "contract_type, work_mode, hours, salary"
      max_lines: 350
    - path: src/features/hiring-job-form/components/JobAddressSection.tsx
      provides: "address fields"
      max_lines: 350
  key_links:
    - from: "src/pages/hiring/CandidateProfile.tsx"
      to: "src/features/hiring-candidate-profile/components/*"
      via: "imports of split components"
      pattern: "from ['\"]@/features/hiring-candidate-profile"
    - from: "src/components/hiring/JobOpeningForm.tsx"
      to: "src/features/hiring-job-form/components/*"
      via: "imports of split sections"
      pattern: "from ['\"]@/features/hiring-job-form"
---

<objective>
Resolve QUAL-04 component-size debt. ROADMAP success criterion #4 explicitly lists three monoliths: CandidateProfile (1169), JobOpeningForm (854), and OneOnOneMeetingForm (909). Phase 3 SUMMARY 03-08 reports OneOnOneMeetingForm was already split to 141 lines + 6 sub-components — this plan VERIFIES that fact post-execution (Task 0) so QUAL-04 is verifiable. The remaining two are split here using the canonical "feature folder" pattern established in Phase 3 (`src/features/org-structure/`). The Zod schema and react-hook-form orchestration stay in the shell; sub-sections receive `register`, `errors`, `watch` via props.

Purpose: Address tech debt flagged in CONCERNS.md so future modifications are bounded, testable, and reviewable. No functional change — pure structural refactor with passing tests as the proof-of-equivalence.

Output: Verified OneOnOneMeetingForm split (Task 0) + 11 files (1 page shell + 5 candidate sub-sections + 1 form shell + 3 job-form sub-sections + extracted schema), all ≤ 350 lines except JobOpeningForm shell (≤ 400 because the Zod schema is dense). All pre-existing tests touching these files still green.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/04-dashboards-quality-polish/04-CONTEXT.md
@.planning/phases/04-dashboards-quality-polish/04-PATTERNS.md
@.planning/codebase/CONCERNS.md
@CLAUDE.md
@.planning/phases/03-performance-refactor/03-08-SUMMARY.md
@src/pages/hiring/CandidateProfile.tsx
@src/components/hiring/JobOpeningForm.tsx

<interfaces>
<!-- Reference pattern from Phase 3 -->
src/features/org-structure/
├── components/
│   ├── OrgUnitTree.tsx
│   └── OrgUnitForm.tsx
└── hooks/
    ├── useOrgUnits.ts
    └── useOrgUnitMutations.ts

<!-- Phase 3 Plan 08 SUMMARY claim (P4-V01 verifies) -->
src/components/OneOnOneMeetingForm.tsx — reported 141 lines (orchestrator) post-Phase 3
</interfaces>
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 0: Verify OneOnOneMeetingForm Phase 3 split (QUAL-04 ROADMAP criterion #4)</name>
  <files>(verification only — no code change unless any file ≥ 800 lines)</files>
  <read_first>
    - .planning/phases/03-performance-refactor/03-08-SUMMARY.md (claim: OneOnOneMeetingForm.tsx orchestrator is 141 ln after split into 6 sub-components + 4 hooks)
    - The current OneOnOneMeetingForm location(s) discovered by `find src -iname 'OneOnOneMeetingForm*'`
  </read_first>
  <behavior>
    - Locate every file matching OneOnOneMeetingForm pattern (component, tests, hooks if filename matches)
    - Measure line counts of every match
    - Document the split structure (file paths + line counts) in the task output for the SUMMARY
    - If every match has line count < 800: Phase 3's split is verified — Task 0 passes; no further work needed for OneOnOneMeetingForm
    - If ANY match has line count ≥ 800: Phase 3's claim is invalid — escalate by splitting that file in this plan as an additional task; document in SUMMARY which file failed and how it was split
  </behavior>
  <action>
    Step 1 — Locate every OneOnOneMeetingForm-related file:

    ```bash
    find src -iname 'OneOnOneMeetingForm*' -type f
    ```

    Step 2 — For each match, run `wc -l` and capture the output:

    ```bash
    find src -iname 'OneOnOneMeetingForm*' -type f -exec wc -l {} +
    ```

    Step 3 — Document the split structure in the SUMMARY (Task 0 output section). Include:
    - Each file path discovered
    - Line count for each
    - Confirmation that every count < 800 (QUAL-04 threshold)
    - If Phase 3 renamed/split it across multiple files, list the canonical orchestrator filename + line count

    Step 4 — Branch:
    - **If all < 800 lines:** record "OneOnOneMeetingForm split verified — orchestrator at <path> (<N> lines), <K> sub-components in <folder> (each < 800)." Continue to Task 1.
    - **If any file ≥ 800 lines:** STOP. Add a new Task 1.5 to this plan that splits the failing file using the same `src/features/<feature-name>/components/` pattern as Tasks 1 and 2 below. Record the discovery in the SUMMARY.

    Note: This task does NOT modify code on the happy path; it only reads the filesystem and asserts an invariant from Phase 3. The current cwd's planning record (Phase 3 SUMMARY 03-08) claims the orchestrator is 141 lines — this task converts that claim into a verifiable acceptance criterion for Phase 4.
  </action>
  <verify>
    <automated>find src -iname 'OneOnOneMeetingForm*' -type f -exec wc -l {} + 2>&1</automated>
  </verify>
  <acceptance_criteria>
    - `find src -iname 'OneOnOneMeetingForm*' -type f | wc -l` returns at least 1 (file exists somewhere; Phase 3 may have renamed/relocated it)
    - For every match `f`: `wc -l < f` returns a number < 800. Concretely, run `find src -iname 'OneOnOneMeetingForm*' -type f -exec wc -l {} + | awk 'NR>0 && $1 >= 800 {n++} END {exit (n>0)}'` — exit code 0 means no file ≥ 800 lines.
    - SUMMARY task-0 section contains the exact list of paths + line counts (e.g., "src/components/OneOnOneMeetingForm.tsx — 141 lines; src/components/oneOnOne/MeetingHeader.tsx — 87 lines; ...")
    - If any file ≥ 800 lines: Task 1.5 is added to this plan and the failing file is split following the JobOpeningForm pattern (Task 2) — the failing-path branch must NOT silently pass.
  </acceptance_criteria>
  <done>OneOnOneMeetingForm verified ≤ 800 lines per file (Phase 3 split confirmed), structure documented in SUMMARY, OR a new split task added and executed if any file exceeded the threshold.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 1: Split CandidateProfile.tsx (1169 → shell + 5 sub-sections)</name>
  <files>src/pages/hiring/CandidateProfile.tsx, src/features/hiring-candidate-profile/components/CandidateHeader.tsx, src/features/hiring-candidate-profile/components/CandidateApplicationsSection.tsx, src/features/hiring-candidate-profile/components/CandidateFitSection.tsx, src/features/hiring-candidate-profile/components/CandidateDecisionSection.tsx, src/features/hiring-candidate-profile/components/CandidateAuditSection.tsx</files>
  <read_first>
    - src/pages/hiring/CandidateProfile.tsx (full 1169 lines — identify natural section boundaries: header/identity ~80-200, applications+interviews ~200-450, cultural fit ~450-700, hiring decision+admission ~700-900, background check+anonymize ~900-1169)
    - .planning/phases/04-dashboards-quality-polish/04-PATTERNS.md (section 11 — proposed split + folder structure mirrors `src/features/org-structure/`)
    - tests/hiring/ directory listing — find any test files that import CandidateProfile (likely none, but check)
    - src/features/org-structure/ folder structure (canonical pattern reference)
  </read_first>
  <action>
    Read the full file first. The split mechanic:

    1) Create `src/features/hiring-candidate-profile/components/` directory.

    2) For each section, extract the JSX + state into a sub-component file. Each sub-component receives the candidate's data via props (NOT re-fetching). The shell does ALL data fetching.

    Concrete contract for each sub-section:

    **CandidateHeader.tsx** — receives `{ candidate: CandidateRow; onAnonymize?: () => void }`. Renders identity row (full_name, chips for stage/source, contacts). NO data fetching inside.

    **CandidateApplicationsSection.tsx** — receives `{ candidateId: string; applications: ApplicationRow[]; jobs: Record<string, JobOpeningRow>; interviews: InterviewRow[] }`. Renders the applications + interviews list.

    **CandidateFitSection.tsx** — receives `{ candidateId: string; fitResponse: FitResponseRow | null; surveys: SurveyRow[]; onIssueLink: () => void }`. Renders fit score + viewer.

    **CandidateDecisionSection.tsx** — receives `{ application: ApplicationRow | null; onMove: ... ; onReject: ... }`. Hosts HiringDecisionPanel + admission actions.

    **CandidateAuditSection.tsx** — receives `{ candidate: CandidateRow; onAnonymize: () => void }`. Background check + anonymize controls.

    3) The shell file `src/pages/hiring/CandidateProfile.tsx` becomes a thin orchestrator that calls the existing hooks and passes their results to the sub-sections. The shell MUST call (and import) at least 6 of these canonical hooks (P4-V08 — explicit orchestration enumeration to prevent missed wiring):

    ```typescript
    // Canonical hook orchestration set — at least 6 of these MUST be present in the shell:
    import { useCandidate, useAnonymizeCandidate } from "@/hooks/hiring/useCandidates";
    import {
      useApplicationsByCandidate,
      useJobForApplication,
      useMoveApplicationStage,
      useRejectApplication,
    } from "@/hooks/hiring/useApplications";
    import {
      useFitResponse,
      useFitSurveys,
      useIssueFitLink,
    } from "@/hooks/hiring/useCulturalFit";
    import { useInterviewsByApplication } from "@/hooks/hiring/useInterviews";
    ```

    DO NOT consolidate into a "useCandidateProfile" mega-hook — that's a future polish, not in scope here. The shell composes the 5 sub-section components, passing data as props, and handles loading/error states at the shell level.

    4) Imports preservation — distribute ALL existing imports across the new files based on what each section actually uses. Keep TypeScript strict-ish: avoid `as any` casts; use proper types from `src/integrations/supabase/types.ts` and `src/integrations/supabase/hiring-types.ts`.

    5) Default export of CandidateProfile.tsx remains the page component (so App.tsx lazy import keeps working).

    6) Each sub-component file MUST render real JSX — not be an empty stub (P4-V09 — stub-file risk). Each must have at least one `return (` JSX expression and at least one named export.

    7) Run existing tests after split to confirm no regression. Specifically: `tests/hiring/CandidateDrawer.test.tsx` and any test that lazily renders CandidateProfile.

    Key technique: do NOT re-architect logic during the split. Just MOVE chunks of JSX + their narrowly-scoped local state. If a chunk uses a hook return value, lift the hook to the shell and pass the value as a prop.
  </action>
  <verify>
    <automated>wc -l src/pages/hiring/CandidateProfile.tsx src/features/hiring-candidate-profile/components/*.tsx 2>&1 && npm test -- tests/hiring/ 2>&1 | tail -10</automated>
  </verify>
  <acceptance_criteria>
    - File src/pages/hiring/CandidateProfile.tsx is ≤ 350 lines (`wc -l < src/pages/hiring/CandidateProfile.tsx | awk '{print ($1 <= 350)}'` returns 1)
    - Each of the 5 new files exists and is ≤ 350 lines (use `find src/features/hiring-candidate-profile/components -name '*.tsx' -exec wc -l {} +`)
    - `grep -c "from \"@/features/hiring-candidate-profile" src/pages/hiring/CandidateProfile.tsx` returns at least 5 (one import per sub-section)
    - **P4-V08 — hook orchestration completeness:** `grep -cE "use(Candidate|Applications|Fit|Interviews|Move|Reject|Issue|JobFor)" src/pages/hiring/CandidateProfile.tsx` returns at least 6 (matches at least 6 of: useCandidate, useApplicationsByCandidate, useFitResponse, useFitSurveys, useInterviewsByApplication, useAnonymizeCandidate, useJobForApplication, useMoveApplicationStage, useRejectApplication, useIssueFitLink)
    - **P4-V09 — stub-file risk:** for each new sub-component file F in src/features/hiring-candidate-profile/components/*.tsx, `grep -cE "return\\s*\\(" F` is at least 1 (file renders JSX, not empty stub) AND `grep -cE "^export (default |function |const |\\{)" F` is at least 1 (file has at least one named or default export)
    - `grep -c "export default" src/pages/hiring/CandidateProfile.tsx` returns 1 (preserves App.tsx lazy import)
    - `npm test -- tests/hiring/ 2>&1 | grep -E "Tests" | tail -1` shows 0 failed (all hiring tests still pass)
    - `npm run build 2>&1 | grep -E "error TS"` returns 0 (no TypeScript errors)
    - `grep -c "as any" src/pages/hiring/CandidateProfile.tsx src/features/hiring-candidate-profile/components/*.tsx` should not increase from baseline (run `grep -c "as any" src/pages/hiring/CandidateProfile.tsx` BEFORE the split to capture baseline; record in summary)
  </acceptance_criteria>
  <done>CandidateProfile shell ≤ 350 lines, 5 sub-sections in feature folder, all ≤ 350 lines each, hook orchestration ≥ 6 imports, every sub-component renders JSX with at least one export, hiring tests still pass, no new `as any`.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Split JobOpeningForm.tsx (854 → shell + 3 sub-sections)</name>
  <files>src/components/hiring/JobOpeningForm.tsx, src/features/hiring-job-form/components/JobBasicsSection.tsx, src/features/hiring-job-form/components/JobContractSection.tsx, src/features/hiring-job-form/components/JobAddressSection.tsx</files>
  <read_first>
    - src/components/hiring/JobOpeningForm.tsx (full 854 lines — identify Zod schema lines 59-80 to PRESERVE in shell; identify field groups: basics ~100-300, contract ~300-550, address ~550-700)
    - .planning/phases/04-dashboards-quality-polish/04-PATTERNS.md (section 11 — proposed split for JobOpeningForm; Zod schema preservation pattern)
    - tests/hiring/PublicApplicationForm.test.tsx (form test pattern reference)
    - Any tests that import JobOpeningForm (likely none in tests/, but check `grep -rn "JobOpeningForm" tests/ src/__tests__/ src/pages/__tests__/ 2>&1`)
  </read_first>
  <action>
    Read the full file first. The split mechanic:

    1) Create `src/features/hiring-job-form/components/` directory.

    2) Sub-section contracts (all receive `{ register, errors, watch, control, setValue, getValues }` via props — react-hook-form's standard plumbing):

    **JobBasicsSection.tsx** — fields: company_id, title, summary, sector. Renders the inputs/selects with their labels and error states.

    **JobContractSection.tsx** — fields: contract_type, work_mode, hours, salary_min_cents, salary_max_cents. Renders these grouped in a "Contrato" section.

    **JobAddressSection.tsx** — fields: address_street, address_city, address_state, address_zip, etc. Renders address fields.

    3) Shell `src/components/hiring/JobOpeningForm.tsx` retains:
    - The Zod schema (lines 59-80 — DO NOT MOVE)
    - `useForm({ resolver: zodResolver(schema), defaultValues })`
    - `onSubmit` handler with mutation
    - Composes the 3 sub-section components passing the rhf plumbing
    - Renders submit/cancel buttons

    4) Type the props interface for each sub-section using react-hook-form's generic types:
    ```typescript
    import type { UseFormRegister, UseFormWatch, FieldErrors, Control, UseFormSetValue, UseFormGetValues } from 'react-hook-form';
    import type { z } from 'zod';
    import { type schema } from '../JobOpeningForm.schema';

    type FormData = z.infer<typeof schema>;
    interface SectionProps {
      register: UseFormRegister<FormData>;
      errors: FieldErrors<FormData>;
      watch: UseFormWatch<FormData>;
      control: Control<FormData>;
      setValue: UseFormSetValue<FormData>;
    }
    ```

    Note on schema export: extract the Zod schema to `src/components/hiring/JobOpeningForm.schema.ts` so the sub-sections can import the FormData type without circular dependency. This is a thin file (~25 lines).

    5) Default export of JobOpeningForm.tsx stays as the form component (preserves consumer imports).

    6) Each sub-component file MUST render real JSX — not be an empty stub (P4-V09). Each must have at least one `return (` JSX expression and at least one named export.

    7) Run existing tests after split. There may be no direct JobOpeningForm test, but `npm run build` and `npm test` together prove no regression.
  </action>
  <verify>
    <automated>wc -l src/components/hiring/JobOpeningForm.tsx src/features/hiring-job-form/components/*.tsx 2>&1 && npm test 2>&1 | tail -10 && npm run build 2>&1 | tail -10</automated>
  </verify>
  <acceptance_criteria>
    - File src/components/hiring/JobOpeningForm.tsx is ≤ 400 lines (`wc -l < src/components/hiring/JobOpeningForm.tsx | awk '{print ($1 <= 400)}'` returns 1)
    - Each of the 3 new files exists and is ≤ 350 lines (use `find src/features/hiring-job-form/components -name '*.tsx' -exec wc -l {} +`)
    - File src/components/hiring/JobOpeningForm.schema.ts exists (≤ 50 lines)
    - `grep -c "from \"@/features/hiring-job-form" src/components/hiring/JobOpeningForm.tsx` returns at least 3 (one per sub-section)
    - `grep -c "export default\|export function JobOpeningForm" src/components/hiring/JobOpeningForm.tsx` returns at least 1 (preserves consumer imports)
    - **P4-V09 — stub-file risk:** for each new sub-component file F in src/features/hiring-job-form/components/*.tsx, `grep -cE "return\\s*\\(" F` is at least 1 AND `grep -cE "^export (default |function |const |\\{)" F` is at least 1
    - `npm test 2>&1 | grep -E "Tests" | tail -1` shows 0 failed
    - `npm run build 2>&1 | grep -E "error TS"` returns 0
    - `grep -c "as any" src/components/hiring/JobOpeningForm.tsx src/features/hiring-job-form/components/*.tsx` should not exceed baseline
  </acceptance_criteria>
  <done>JobOpeningForm shell ≤ 400 lines, 3 sub-sections in feature folder each ≤ 350 lines and rendering JSX, schema extracted to dedicated file, all tests still pass, build clean.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| (none new) | Pure structural refactor; no new trust boundaries introduced |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-04-06-01 | Tampering | regression during split | mitigate | Existing tests run after split; build clean; consumer imports preserved (default export, exports preserved) |
| T-04-06-02 | Information Disclosure | a sub-section accidentally renders cross-tenant data | accept | Same data hooks as before split; no new data paths introduced; existing RLS still gates |
| T-04-06-03 | Repudiation | QUAL-04 verification gap (OneOnOneMeetingForm) | mitigate | Task 0 verifies Phase 3's split claim post-execution; if invariant violated, an additional split task is scheduled |
| T-04-06-04 | Tampering | sub-component file is an empty stub | mitigate | Acceptance criteria require `return (` JSX and at least one export per sub-component (P4-V09) |
</threat_model>

<verification>
- Task 0 verifies OneOnOneMeetingForm < 800 lines per file
- All file size checks pass
- npm test exits 0 (no regression)
- npm run build exits 0
- Feature folder structure mirrors src/features/org-structure/
- Hook orchestration grep ≥ 6 in CandidateProfile shell
- Every new sub-component renders JSX and has at least one export
</verification>

<success_criteria>
- ROADMAP success criterion #4 (3 monoliths) is fully verifiable: OneOnOneMeetingForm via Task 0, CandidateProfile via Task 1, JobOpeningForm via Task 2
- CandidateProfile shell ≤ 350 lines + 5 sub-sections each ≤ 350 lines + ≥ 6 canonical hooks orchestrated in shell
- JobOpeningForm shell ≤ 400 lines + 3 sub-sections each ≤ 350 lines + extracted schema file
- Every new sub-component file renders JSX (not a stub) and exports at least one named/default symbol
- All existing tests still pass; build clean
- No increase in `as any` casts
</success_criteria>

<output>
After completion, create `.planning/phases/04-dashboards-quality-polish/04-06-SUMMARY.md` documenting:
- Task 0: list of OneOnOneMeetingForm-related files with line counts; explicit confirmation each is < 800 lines
- Line count before/after for each split file
- Test results
- Any data hook lifted to shell vs kept in sub-section (CandidateProfile)
- Any deviation from the proposed split structure
</output>
</output>
