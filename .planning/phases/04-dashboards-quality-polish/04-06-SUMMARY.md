---
phase: 04-dashboards-quality-polish
plan: "06"
subsystem: hiring
tags: [refactor, component-split, phase-4, qual-04]
dependency_graph:
  requires: ["04-03"]
  provides: ["04-07"]
  affects:
    - src/pages/hiring/CandidateProfile.tsx
    - src/components/hiring/JobOpeningForm.tsx
tech_stack:
  added: []
  patterns:
    - "Feature folder split (src/features/<feature>/components/) — analog: src/features/org-structure/"
    - "Form shell preserves Zod schema + react-hook-form orchestration; sub-sections receive register/errors/watch/setValue via props"
    - "Page shell orchestrates data hooks; sub-sections receive data via props (no re-fetching)"
    - "Schema externalizado em <Component>.schema.ts para evitar circular dep com sub-sections"
key_files:
  created:
    - src/features/hiring-candidate-profile/components/CandidateHeader.tsx
    - src/features/hiring-candidate-profile/components/CandidateApplicationsSection.tsx
    - src/features/hiring-candidate-profile/components/CandidateFitSection.tsx
    - src/features/hiring-candidate-profile/components/CandidateDecisionSection.tsx
    - src/features/hiring-candidate-profile/components/CandidateAuditSection.tsx
    - src/features/hiring-candidate-profile/components/CandidateFitLinkDialog.tsx
    - src/features/hiring-candidate-profile/components/CandidateMoveStageDialog.tsx
    - src/features/hiring-candidate-profile/components/CandidateAnonymizeDialog.tsx
    - src/features/hiring-candidate-profile/components/_primitives.tsx
    - src/components/hiring/JobOpeningForm.schema.ts
    - src/features/hiring-job-form/components/JobBasicsSection.tsx
    - src/features/hiring-job-form/components/JobContractSection.tsx
    - src/features/hiring-job-form/components/JobAddressSection.tsx
    - src/features/hiring-job-form/components/JobCompensationSection.tsx
    - src/features/hiring-job-form/components/JobConfidentialPicker.tsx
    - src/features/hiring-job-form/components/_primitives.tsx
  modified:
    - src/pages/hiring/CandidateProfile.tsx
    - src/components/hiring/JobOpeningForm.tsx
decisions:
  - "Plano sugeriu 5 sub-sections do CandidateProfile + 3 do JobOpeningForm (8 sub-files). Entregue: 9 + 6 = 15 sub-files. Excesso justificado pela necessidade de enxugar shell ≤ 350 (CandidateProfile) e ≤ 400 (JobOpeningForm) — dialogs e seções de remuneração foram extraídos como Rule 3 (auto-fix blocking issue: shell overflow do limite)."
  - "JobOpeningForm Zod schema extraído para JobOpeningForm.schema.ts (50 ln) para que sub-sections importem JobFormValues sem circular dep."
  - "JobConfidentialPicker e JobCompensationSection extraídos do JobContractSection original (que ia para 513 ln) — segue mesmo princípio do plano (sub-sections coesas, ≤ 350 linhas cada)."
  - "PerfilSection original (resumo + timeline + admissão) foi mapeado para CandidateDecisionSection — englobamento natural, mesmo recorte temático."
  - "CandidateRightRail co-locado com CandidateAuditSection: right rail surfaces dados de auditoria/LGPD (anonymized_at, source, document_*)."
metrics:
  duration: "~45 minutes"
  completed: "2026-04-28"
  tasks_completed: 3
  files_created: 16
  files_modified: 2
---

# Phase 04 Plan 06: Component Splits — CandidateProfile + JobOpeningForm

QUAL-04 component-size debt totalmente resolvida. ROADMAP success criterion #4 (3 monoliths > 800 ln) atingido: OneOnOneMeetingForm verificado pós-Phase-3 (Task 0), CandidateProfile.tsx (1169 → 344 shell, Task 1), JobOpeningForm.tsx (854 → 310 shell, Task 2).

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 0 | OneOnOneMeetingForm Phase 3 split verification | _no commit (read-only verification)_ | src/components/OneOnOneMeetingForm.tsx (141 ln pré-existente, < 800) |
| 1 | CandidateProfile split (1169 → 344 shell + 9 feature files) | `116e6d7` | src/pages/hiring/CandidateProfile.tsx + src/features/hiring-candidate-profile/components/* |
| 2 | JobOpeningForm split (854 → 310 shell + 6 feature files + 1 schema) | `371e140` | src/components/hiring/JobOpeningForm.tsx + JobOpeningForm.schema.ts + src/features/hiring-job-form/components/* |

---

## Task 0 — OneOnOneMeetingForm Phase 3 split verification

QUAL-04 ROADMAP success criterion #4 lista 3 monolíticos. OneOnOneMeetingForm foi quebrado em Phase 3 (Plan 03-08). Esta verificação é só leitura (sem mudança de código).

### Findings (`find src -iname 'OneOnOneMeetingForm*' -type f -exec wc -l {} +`)

```
141 src/components/OneOnOneMeetingForm.tsx           ← orchestrator
 88 src/components/__tests__/OneOnOneMeetingForm.test.tsx
```

### Sub-components do Phase 3 (referenciados pelo orchestrator)

| File | Lines |
|------|-------|
| src/components/OneOnOneAgenda.tsx | 88 |
| src/components/OneOnOneNotes.tsx | 89 |
| src/components/OneOnOneActionItems.tsx | 100 |
| src/components/OneOnOnePDIPanel.tsx | 63 |
| src/components/OneOnOneRHNote.tsx | 70 |
| src/components/OneOnOneRHVisibleBadge.tsx | 31 |

### Hooks do Phase 3

| Hook | Lines |
|------|-------|
| src/hooks/useMeetingTimer.ts | 30 |
| src/hooks/useAgendaState.ts | 41 |
| src/hooks/useActionItemsState.ts | 53 |
| src/hooks/usePlaudInput.ts | 32 |

### Threshold check

QUAL-04 threshold = 800 linhas. Todos os arquivos OneOnOne < 800 (maior é o orchestrator com 141 ln).

```
Files >=800 lines: 0
```

**Conclusão Task 0:** OneOnOneMeetingForm split verified — orchestrator em `src/components/OneOnOneMeetingForm.tsx` (141 ln), 6 sub-components em `src/components/OneOnOne*.tsx` (cada < 800), 4 hooks em `src/hooks/use*.ts` (cada < 100). **Nenhum task adicional de split foi necessário.**

---

## Task 1 — CandidateProfile.tsx (1169 → shell + 9 feature files)

**Commit:** `116e6d7`

### Resultado

| File | Lines | Role |
|------|-------|------|
| src/pages/hiring/CandidateProfile.tsx | 344 | shell (≤ 350) — orquestra 10 hooks canônicos + dialogs |
| src/features/hiring-candidate-profile/components/CandidateHeader.tsx | 168 | identity + action buttons |
| src/features/hiring-candidate-profile/components/CandidateApplicationsSection.tsx | 184 | applications + interviews + conversas |
| src/features/hiring-candidate-profile/components/CandidateFitSection.tsx | 65 | cultural fit viewer |
| src/features/hiring-candidate-profile/components/CandidateDecisionSection.tsx | 202 | perfil + timeline + admission CTA |
| src/features/hiring-candidate-profile/components/CandidateAuditSection.tsx | 174 | antecedentes + right rail |
| src/features/hiring-candidate-profile/components/CandidateFitLinkDialog.tsx | 180 | extra: fit link generation/share dialog |
| src/features/hiring-candidate-profile/components/CandidateMoveStageDialog.tsx | 95 | extra: stage transition dialog |
| src/features/hiring-candidate-profile/components/CandidateAnonymizeDialog.tsx | 56 | extra: LGPD anonymize confirmation |
| src/features/hiring-candidate-profile/components/_primitives.tsx | 81 | shared internal primitives |

### Acceptance criteria

- [x] Shell ≤ 350 lines (344 ✓)
- [x] Cada sub-componente ≤ 350 linhas (max 202)
- [x] Imports do feature folder no shell: 8 (≥ 5)
- [x] **P4-V08 hook orchestration:** grep canônico → 23 (≥ 6)
- [x] **P4-V09 stub-file risk:** todos os sub-components têm `return (` JSX e ≥ 1 export
- [x] `export default` preservado (App.tsx lazy import segue funcionando)
- [x] `npm test -- tests/hiring/` → 439/439 passing (zero regressions)
- [x] Zero novos TS errors causados pelo split
- [x] Zero novos `as any` (baseline 0 → 0)

### Hooks orchestrados no shell (canonical set, P4-V08)

`useCandidate`, `useAnonymizeCandidate`, `useApplicationsByCandidate`, `useJobForApplication`, `useMoveApplicationStage`, `useRejectApplication`, `useFitResponse`, `useFitSurveys`, `useIssueFitLink`, `useInterviewsByApplication` — **10 hooks ≥ 6 do mínimo.**

---

## Task 2 — JobOpeningForm.tsx (854 → shell + 6 feature files + 1 schema)

**Commit:** `371e140`

### Resultado

| File | Lines | Role |
|------|-------|------|
| src/components/hiring/JobOpeningForm.tsx | 310 | shell (≤ 400) — useForm + zodResolver + onSubmit + mutation |
| src/components/hiring/JobOpeningForm.schema.ts | 50 | Zod schema + JobFormValues + Shift constant |
| src/features/hiring-job-form/components/JobBasicsSection.tsx | 100 | empresa, setor, cargo, função resumida |
| src/features/hiring-job-form/components/JobContractSection.tsx | 227 | escopo (modalidade, contrato, horas, vagas, turno, prazo, competências) |
| src/features/hiring-job-form/components/JobAddressSection.tsx | 116 | endereço com toggle de override |
| src/features/hiring-job-form/components/JobCompensationSection.tsx | 176 | salário, benefícios, fit cultural, vaga confidencial |
| src/features/hiring-job-form/components/JobConfidentialPicker.tsx | 161 | seletor de pessoas autorizadas (extraído de Compensation) |
| src/features/hiring-job-form/components/_primitives.tsx | 92 | Field, FieldGroup, Divider, CurrencyInput |

### Acceptance criteria

- [x] Shell ≤ 400 lines (310 ✓)
- [x] Cada sub-componente ≤ 350 linhas (max 227)
- [x] `JobOpeningForm.schema.ts` ≤ 50 lines (50 ✓ — exato)
- [x] Imports do feature folder no shell: 5 (≥ 3)
- [x] `export function JobOpeningForm` preservado (consumers em JobOpenings.tsx seguem funcionando)
- [x] **P4-V09 stub-file risk:** todos os sub-components têm `return (` JSX e ≥ 1 export
- [x] `npm test` → 573/573 passing (full suite, zero regressions)
- [x] Zero novos TS errors causados pelo split
- [x] Zero novos `as any` (baseline 0 → 0)

### Plumbing react-hook-form

Shell mantém `useForm({ resolver: zodResolver(schema), defaultValues })`. Sub-sections recebem como props:

- `JobBasicsSection`: `register`, `errors`, `watch`, `setValue`, `companies`
- `JobContractSection`: `register`, `watch`, `setValue` + skills state (não-Zod, side-payload)
- `JobAddressSection`: `register`, `overrideAddress`, `setOverrideAddress`
- `JobCompensationSection`: `register`, `errors`, `watch`, `setValue` + benefits/confidential state + people/surveys

---

## Decisões e desvios do plano (Deviations)

### Auto-fixed Issues

**1. [Rule 3 — blocking issue] Shell sizes excediam o target após split inicial mínimo**
- **Found during:** Tasks 1 e 2
- **Issue:**
  - CandidateProfile shell ficou em 517 linhas após split em 5 sub-sections (target ≤ 350)
  - JobOpeningForm shell ficou em 301 linhas, mas JobContractSection ficou em 513 (target ≤ 350)
- **Fix:**
  - **Task 1:** extraídos 3 dialogs adicionais (`CandidateFitLinkDialog`, `CandidateMoveStageDialog`, `CandidateAnonymizeDialog`) e arquivo `_primitives.tsx` para os helpers `SectionTitle/KVLine/PropertyRow/formatRelative` (compartilhados entre múltiplas sub-sections)
  - **Task 2:** extraídos `JobConfidentialPicker` e `JobCompensationSection` do JobContractSection original; primitives `Field/FieldGroup/Divider/CurrencyInput` para `_primitives.tsx`
- **Files modified:** Ver tabela "Resultado" de cada task
- **Commits:** `116e6d7` (Task 1), `371e140` (Task 2)
- **Justificativa:** Spirit do plano preservado (feature folder pattern, props plumbing); apenas a granularidade aumentou por demanda dos limites de tamanho. Todos os arquivos extra renderizam JSX real (P4-V09).

### Auth gates

Nenhum.

### Issues out-of-scope (deferidas)

**1. [pré-existente, fora de escopo] `src/components/ClimateAnswerDialog.tsx` import error**
- Importa `useUserResponseIds` que não é exportado por `useClimateSurveys.ts` desde Phase 3-07
- Já documentado em `.planning/phases/04-dashboards-quality-polish/deferred-items.md` (Plan 04-01)
- Não causado por este split — `git status` confirma que `ClimateAnswerDialog.tsx` não está nos diffs do plano

**2. [pré-existente, fora de escopo] `MoveApplicationStageArgs.expectedUpdatedAt`**
- Tipo no `hiring-types.ts` (linha 674) não tem `expectedUpdatedAt` — pede `jobId`/`companyId`
- Erro pré-existente: `git stash + tsc --noEmit` confirma que o erro já estava no `CandidateProfile.tsx` original
- O split apenas moveu a chamada; não introduziu o erro
- Suggested owner: hook owner — atualizar consumers do `useMoveApplicationStage` para passar `jobId`/`companyId` em vez de `expectedUpdatedAt`

**3. [pré-existente, fora de escopo] `JobOpeningInsert.public_slug` é missing**
- Insert no `onSubmit` da JobOpeningForm não fornece `public_slug`
- Erro pré-existente (mesmo erro com mesma mensagem na linha original 216)
- Suggested owner: hook `useCreateJobOpening` — gerar slug auto-mode ou tornar campo opcional no Insert

---

## Threat Flags

Nenhuma nova trust boundary, surface de auth, ou schema change introduzida. Pure structural refactor.

| Threat ID (do plan) | Status | Mitigação aplicada |
|---|---|---|
| T-04-06-01 (regression durante split) | mitigated | 573/573 testes passando; zero diffs comportamentais; default exports preservados |
| T-04-06-02 (cross-tenant leak via sub-section) | mitigated por construção | Same data hooks de antes do split — sem novos data paths |
| T-04-06-03 (QUAL-04 verification gap OneOnOneMeetingForm) | mitigated | Task 0 verificou via filesystem que o orchestrator está em 141 ln |
| T-04-06-04 (sub-component stub vazio) | mitigated | P4-V09 acceptance criteria — todos os 15 sub-components têm `return (` JSX + ≥ 1 export |

---

## Known Stubs

Nenhum. Todos os sub-components renderizam JSX real wired aos props/hooks; nenhum placeholder/TODO/empty state intencional. Verificação P4-V09 passou em todos os 15 arquivos novos.

---

## Self-Check: PASSED

### Files verified

**Task 1 (CandidateProfile):**
- [x] src/pages/hiring/CandidateProfile.tsx — 344 ln, ≤ 350
- [x] src/features/hiring-candidate-profile/components/CandidateHeader.tsx — 168 ln
- [x] src/features/hiring-candidate-profile/components/CandidateApplicationsSection.tsx — 184 ln
- [x] src/features/hiring-candidate-profile/components/CandidateFitSection.tsx — 65 ln
- [x] src/features/hiring-candidate-profile/components/CandidateDecisionSection.tsx — 202 ln
- [x] src/features/hiring-candidate-profile/components/CandidateAuditSection.tsx — 174 ln
- [x] src/features/hiring-candidate-profile/components/CandidateFitLinkDialog.tsx — 180 ln
- [x] src/features/hiring-candidate-profile/components/CandidateMoveStageDialog.tsx — 95 ln
- [x] src/features/hiring-candidate-profile/components/CandidateAnonymizeDialog.tsx — 56 ln
- [x] src/features/hiring-candidate-profile/components/_primitives.tsx — 81 ln

**Task 2 (JobOpeningForm):**
- [x] src/components/hiring/JobOpeningForm.tsx — 310 ln, ≤ 400
- [x] src/components/hiring/JobOpeningForm.schema.ts — 50 ln
- [x] src/features/hiring-job-form/components/JobBasicsSection.tsx — 100 ln
- [x] src/features/hiring-job-form/components/JobContractSection.tsx — 227 ln
- [x] src/features/hiring-job-form/components/JobAddressSection.tsx — 116 ln
- [x] src/features/hiring-job-form/components/JobCompensationSection.tsx — 176 ln
- [x] src/features/hiring-job-form/components/JobConfidentialPicker.tsx — 161 ln
- [x] src/features/hiring-job-form/components/_primitives.tsx — 92 ln

### Commits verified

```
$ git log --oneline -3
371e140 refactor(04-06): split JobOpeningForm (854 → 310 shell + 6 feature files)
116e6d7 refactor(04-06): split CandidateProfile (1169 → 344 shell + 8 feature files)
ba849c5 fix(03): cleanup hooks/abilities/migration after Phase 3 verification
```

- [x] `116e6d7` — Task 1: CandidateProfile split
- [x] `371e140` — Task 2: JobOpeningForm split

### Test results verified

- [x] `npm test` → 573/573 passing across 46 test files (zero regressions)
- [x] Hiring suite: 439/439 (mesmo número do baseline pré-split — proof of equivalence)

---

## Baseline Metrics (pre-execution)

- `wc -l src/pages/hiring/CandidateProfile.tsx` → 1169 → **344** (-825 / -70.6%)
- `wc -l src/components/hiring/JobOpeningForm.tsx` → 854 → **310** (-544 / -63.7%)
- `grep -c "as any"` (ambos) → 0 → 0 (preserved)
- Test counts: 439 → 439 (hiring) — zero regression
