---
phase: 02-r-s-refactor
plan: 08
subsystem: components
tags: [hiring, kanban, table, url-state, debounce, popover, cpf-dedup, lgpd, ui-wave-4]

# Dependency graph
requires:
  - phase: 02-r-s-refactor
    plan: 06
    provides: "useCardPreferences (D-08 hook), useCandidateByCpf (TAL-09 cross-empresa lookup), useCandidateByEmail (existing)"
  - phase: 02-r-s-refactor
    plan: 03
    provides: "OPTIONAL_FIELDS + isFieldEnabled (cardCustomization), normalizeCpf + isValidCpfFormat + formatCpf (cpf), daysSince (sla)"
  - phase: 02-r-s-refactor
    plan: 07
    provides: "CandidateCard KanbanApplication shape (consumido por CandidatesTable)"
  - phase: 01-tenancy-backbone
    provides: "react-router-dom v6.30 + useSearchParams precedent"
provides:
  - "PipelineFilters inline + URL state + 300ms debounce (RS-09) — substituindo modal date-range version"
  - "CandidatesTable: HTML <table> shadcn + sort manual 4 colunas (RS-13)"
  - "BoardTableToggle + useKanbanView hook: localStorage:leverup:rs:view:{jobId} (D-09)"
  - "CardFieldsCustomizer: popover de 6 OPTIONAL_FIELDS via useCardPreferences (D-08)"
  - "DuplicateCandidateDialog: matchedBy prop ('cpf' | 'email') com copy diferenciada (TAL-09)"
  - "CandidateForm: lookup CPF prioritário ANTES de email (TAL-09)"
  - "DashboardFilters inline em HiringDashboard (preserve analytics filter shape)"
affects: [02-09]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "useSearchParams como source of truth (URL share-friendly) com useEffect debounce 300ms para text input"
    - "useKanbanView pattern: useState + useEffect re-read on jobId change + try/catch silent fail no localStorage write"
    - "Sort manual em useMemo: switch/case sobre 4 SortField + ordering helper para empty values (next_interview empty stays last)"
    - "Popover + Checkbox primitives com label clicável + checked={isFieldEnabled(prefs, field)} pattern"
    - "Dedup pattern: useCandidateByCpf priority + useCandidateByEmail fallback; cpfMatch ?? emailMatch + matchedBy ternary"

key-files:
  created:
    - src/components/hiring/CandidatesTable.tsx
    - src/components/hiring/BoardTableToggle.tsx
    - src/components/hiring/CardFieldsCustomizer.tsx
    - .planning/phases/02-r-s-refactor/02-08-SUMMARY.md
  modified:
    - src/components/hiring/PipelineFilters.tsx
    - src/components/hiring/DuplicateCandidateDialog.tsx
    - src/components/hiring/CandidateForm.tsx
    - src/pages/hiring/HiringDashboard.tsx
    - tests/hiring/PipelineFilters.test.tsx
    - tests/hiring/BoardTableToggle.test.tsx

key-decisions:
  - "PipelineFilters foi rewritten — call site existing (HiringDashboard) usa um shape filter incompatível (date-range + companyId + managerId para analytics, NÃO vaga/fase/origem para o kanban). Movi o shape antigo inline em HiringDashboard como `DashboardFilters` para preservar o flow analytics. Domínios diferentes — não vale unificar."
  - "CandidatesTable usa KanbanApplication (não ApplicationWithCandidate) — esse é o shape canonical já consumido por CandidatesKanban (CandidateCard.tsx:7-22). Mantém props parity entre Quadro e Tabela."
  - "BoardTableToggle: ícones LayoutGrid + LayoutList (Lucide) são funcionais, NÃO brand stand-in. CLAUDE.md proíbe Lucide ArrowX como logo — esses ícones são OK pois representam visualmente os layouts board/list."
  - "CandidatesTable usa ArrowUp/ArrowDown como sort indicator — RESEARCH §11 prescreve esse uso. Não é brand stand-in (são ícones funcionais de header de tabela)."
  - "useKanbanView lê valor inicial via localStorage no useState lazy init, e RE-READ no useEffect quando jobId muda. Fallback para 'board' em qualquer caminho de erro (localStorage indisponível, valor inválido, exception). Resiliente a tampering (T-02-08-02 mitigation)."
  - "CandidateForm: cpfInput state separado de document_number form field. Sincronizo via register onChange callback quando documentType='cpf'. Limpo cpfInput quando troca para outro document_type (evita ghost match)."
  - "DuplicateCandidateDialog: default matchedBy='email' preserva backwards compat para call sites legados; só `CandidateForm` (atualizado nesse plan) passa matchedBy explicitamente. Nenhum call site existente quebrou."

# Metrics
duration: 12min
completed: 2026-04-28
---

# Phase 2 Plan 8: Wave 4 — UX-AUDIT Refinements + CPF Dedup Summary

**6 componentes (3 novos + 3 modificados) finalizam a UI Wave 4 do R&S: filtros inline com URL state (RS-09), tabela alternativa ao kanban (RS-13), customização de card (D-08), e dedup canonical por CPF (TAL-09). 19 testes Wave 0 ativados (PipelineFilters + BoardTableToggle), 0 regressões — destrava Plan 02-09 (drawer split + LGPD UI + pages).**

## Performance

- **Duration:** ~12 min (em worktree paralelo)
- **Tasks:** 4 (todos completados sem checkpoint)
- **Files created:** 3 (componentes) + 1 SUMMARY = 4
- **Files modified:** 6 (3 componentes + HiringDashboard + 2 testes ativados)

## Accomplishments

- **PipelineFilters.tsx** (REWRITE) — inline horizontal bar; URL como source of truth via `useSearchParams` (`?vaga=X&fase=Y&origem=Z&q=...`); 300ms debounce na busca textual antes de update da URL; chips active styling (`bg-accent-soft + text-accent-text + border-accent/30`); botão "Limpar filtros" condicional. Hook companion `usePipelineFilters` exporta os filtros para query consumers.
- **CandidatesTable.tsx** (NEW, 181 linhas) — HTML `<table>` shadcn; sort manual via `useMemo` em 4 colunas (Nome, Dias, Etapa, Próxima entrevista); sort default = dias-na-etapa DESC; empty `nextInterviewAt` ordena no fim sempre; selected row recebe `bg-accent-soft` + `data-selected="true"`; hover row + cursor-pointer; estado vazio "Nenhum candidato com esses filtros".
- **BoardTableToggle.tsx** (NEW, 106 linhas) — segmented control "Quadro · Tabela" com 2 tabs; hook `useKanbanView(jobId)` retorna `[view, setView]` persistindo em `localStorage.leverup:rs:view:{jobId}` isolado por vaga; resilient a localStorage indisponível (try/catch silent fail) e valores inválidos (fallback 'board'). Re-read on jobId change.
- **CardFieldsCustomizer.tsx** (NEW, 92 linhas) — popover com 6 checkboxes para `OPTIONAL_FIELDS`; usa `useCardPreferences` hook (Plan 02-06) para load/save em `localStorage.leverup:rs:card-fields:{userId}`. Trigger Sliders neutro (sem brand). Microcopy explicando persistência local.
- **DuplicateCandidateDialog.tsx** (MODIFY, 129 linhas) — adiciona prop `matchedBy?: 'cpf' | 'email'` (default 'email' para compat); title diferenciado ("Já existe um candidato com esse CPF" vs "Candidato já cadastrado"); display value formatado (`formatCpf` quando match='cpf', email quando match='email'); botão "Cadastrar com outro CPF" / "outro e-mail" alinha com matchedBy; copy de body adapta ("outro CPF" vs "outro e-mail").
- **CandidateForm.tsx** (MODIFY, 257 linhas) — lookup CPF prioritário via `useCandidateByCpf` ANTES de email via `useCandidateByEmail`; state `cpfInput` separado sincronizado com document_number quando type='cpf'; ternary `cpfMatch ?? emailMatch` decide qual mostrar; passa `matchedBy` correto para dialog. Hint inline "CPF precisa 11 dígitos" quando incompleto. Rule 3 fix: `cv_storage_path: null` no INSERT (latent error Plan 02-04).
- **HiringDashboard.tsx** (MODIFY) — `DashboardFilters` inline component preserva flow analytics (date-range + companyId + managerId); imports `Select`/`Input`/`useVisibleCompanies` movidos do antigo `PipelineFilters`. Domínio diferente do kanban filter (RS-09).

## Task Commits

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | PipelineFilters rewrite + activate test + DashboardFilters inline | `ce81af4` | PipelineFilters.tsx (REWRITE), HiringDashboard.tsx (MODIFY), PipelineFilters.test.tsx (ACTIVATE) |
| 2 | CandidatesTable + BoardTableToggle + activate test | `68362b8` | CandidatesTable.tsx (NEW), BoardTableToggle.tsx (NEW), BoardTableToggle.test.tsx (ACTIVATE) |
| 3 | CardFieldsCustomizer popover | `8580fd8` | CardFieldsCustomizer.tsx (NEW) |
| 4 | DuplicateCandidateDialog matchedBy + CandidateForm CPF lookup | `b0870fd` | DuplicateCandidateDialog.tsx (MODIFY), CandidateForm.tsx (MODIFY) |

## Files Created/Modified

| File | Change | Notes |
|------|--------|-------|
| `src/components/hiring/PipelineFilters.tsx` | rewrite | useSearchParams + 300ms debounce + activeChip styling; hook companion usePipelineFilters |
| `src/components/hiring/CandidatesTable.tsx` | created | HTML table + sort manual 4 colunas (181 linhas) |
| `src/components/hiring/BoardTableToggle.tsx` | created | Segmented control + useKanbanView hook (106 linhas) |
| `src/components/hiring/CardFieldsCustomizer.tsx` | created | Popover de 6 OPTIONAL_FIELDS (92 linhas) |
| `src/components/hiring/DuplicateCandidateDialog.tsx` | modified | matchedBy prop + copy diferenciada |
| `src/components/hiring/CandidateForm.tsx` | modified | Lookup CPF prioritário + cv_storage_path null fix |
| `src/pages/hiring/HiringDashboard.tsx` | modified | DashboardFilters inline (preserve analytics flow) |
| `tests/hiring/PipelineFilters.test.tsx` | activated | 5 tests: read URL, debounce 300ms, Limpar filtros, usePipelineFilters shape |
| `tests/hiring/BoardTableToggle.test.tsx` | activated | 14 tests: useKanbanView (5) + BoardTableToggle UI (3) + CandidatesTable (6) |

## Verification Results

### Tests (vitest + RTL)

```
tests/hiring/PipelineFilters.test.tsx (5 tests) ✓
tests/hiring/BoardTableToggle.test.tsx (14 tests) ✓
```

Full suite Phase 2: **488 tests passing | 32 todo (skeletons fora deste plan) | 0 failures** (28 test files; 24 active + 4 skipped).

### TypeScript (`tsc --noEmit -p tsconfig.app.json`)

- ZERO errors em arquivos do plan: `PipelineFilters.tsx`, `CandidatesTable.tsx`, `BoardTableToggle.tsx`, `CardFieldsCustomizer.tsx`, `DuplicateCandidateDialog.tsx`, `CandidateForm.tsx`, `HiringDashboard.tsx`
- Errors restantes do `deferred-items.md` (Plans 02-04/05): `CandidatesKanban.tsx` (expectedUpdatedAt), `JobCard.tsx` (today), `JobOpeningForm.tsx` (public_slug), `PublicApplicationForm.tsx` (Resolver), `useCulturalFit.ts` / `useHiringMetrics.ts` / `useOptimisticVersion.ts` — escopo de Plan 02-09. NENHUM caused por este plan.

### Grep checks (do plan verification)

```
grep -c "useSearchParams" PipelineFilters.tsx → 3 (import + 2 usos)
grep -c "leverup:rs:view" BoardTableToggle.tsx → 2 (STORAGE_KEY + comment)
grep -c "matchedBy" DuplicateCandidateDialog.tsx → 9
grep -c "useCandidateByCpf" CandidateForm.tsx → 2 (import + uso)
grep -c "OPTIONAL_FIELDS" CardFieldsCustomizer.tsx → 3
```

### Brand fidelity

- ZERO Lucide `ArrowRight`/`ArrowLeft` usados como logo stand-in (o ArrowUp/ArrowDown em CandidatesTable são sort indicators per RESEARCH §11 — não brand)
- ZERO uso de `font-display custom` para wordmark
- LeverArrow primitive não foi necessário (escopo é UI controls puros)

## Decisions Made

- **PipelineFilters.tsx é REWRITE total — domínio mudou de analytics para kanban.** O call site existing (`HiringDashboard.tsx`) usa o componente antigo para filtros de date-range/empresa/gestor (analytics), NÃO para vaga/fase/origem (kanban). Em vez de criar um wrapper que tenta servir os dois, eu inlinei o shape antigo dentro de HiringDashboard como `DashboardFilters` — ficam side-by-side sem confusão de nome/escopo. Plan diz "REWRITE" e o consumer count antes era 2 (HiringDashboard), agora será 1 (CandidatesKanban — em Plan 02-09). Limpa.

- **CandidatesTable usa `KanbanApplication`, não `ApplicationWithCandidate`.** O plan inline code referencia `ApplicationWithCandidate` (DB row + candidate embed), mas o pattern canonical do codebase é `KanbanApplication` (em CandidateCard.tsx) — esse é o shape que CandidatesKanban já produz e passa para CandidateCard. Para Quadro/Tabela ter API parity, ambos consumem o mesmo shape. `next_interview_at` e `desired_role` não existem em ApplicationRow no auto-gen types (verificado em src/integrations/supabase/types.ts) — KanbanApplication tem `nextInterviewAt` (camelCase, derivado/computed) e `desired_role` opcional; é o shape correto.

- **useKanbanView fallback resiliente: 'board' default + try/catch em localStorage write.** localStorage pode estar indisponível (modo privado/incognito) ou conter valor inválido (tampering). Em todos os caminhos de erro, retorna 'board' (default explícito) — UI nunca crasha. Test "valor inválido em localStorage → fallback para board" cobre o cenário de tampering.

- **CardFieldsCustomizer NÃO inclui mínimo fixo.** D-07 garante nome+cargo+dias+vaga sempre rendered no card; D-08 só governa os 6 OPTIONAL_FIELDS. CardFieldsCustomizer renderiza apenas OPTIONAL_FIELDS — isso é por design (RESEARCH §13/14 e cardCustomization.ts:8-13 docs). Tampering de localStorage para incluir campo extra é mitigado por Zod safeParse com `z.enum(OPTIONAL_FIELDS)` (T-02-08-03 mitigation, herdado de Plan 02-03).

- **Lookup CPF tem prioridade total sobre email — `cpfMatch ?? emailMatch`.** Quando ambos CPF e email casam (mesmo candidato), TAL-09 prescreve CPF como canonical. Quando CPF não casa mas email casa, mostra como email match. Quando neither, no dialog. Logica simples e determinística — covered pelo aviso inline diferenciado por matchedBy.

- **`cv_storage_path: null` no CandidateInsert (Rule 3 fix).** Latent error documentado em `deferred-items.md` (Plan 02-04 atribuiu Plan 02-08/09 como owner). Como toquei `CandidateForm.tsx` neste plan, fix é Rule 3 (blocking issue diretamente caused pelos meus changes ao serializar typecheck). Path real é populado depois via `useUploadCv` no onSuccess.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] HiringDashboard call site break por PipelineFilters rewrite**

- **Found during:** Task 1 (após reescrever PipelineFilters)
- **Issue:** `HiringDashboard.tsx:9,14,102` consumia `<PipelineFilters value={filters} onChange={setFilters} />` com shape `PipelineFiltersState` (companyId, managerId, preset, start, end). O plan REWRITE removeu esse shape — TypeScript reportaria erro e a página de dashboard quebraria em runtime.
- **Fix:** Inline `DashboardFilters` component dentro de HiringDashboard.tsx preservando o shape antigo (com `useVisibleCompanies` + Select empresa/gestor/preset/custom-date-range). Domínio diferente do kanban filter — não vale unificar.
- **Files modified:** `src/pages/hiring/HiringDashboard.tsx`
- **Verification:** tsc clean para HiringDashboard; HiringDashboard renderiza sem regressão visual
- **Committed in:** `ce81af4` (Task 1 commit)

**2. [Rule 3 - Blocking] cv_storage_path missing em CandidateInsert (latent Plan 02-04)**

- **Found during:** Task 4 tsc verification
- **Issue:** `CandidateInsert` shape (auto-gen Plan 02-04) requer `cv_storage_path: string | null` mas o `create.mutate({...})` no CandidateForm não passava esse campo. Erro latente documentado em `deferred-items.md` (Plan 02-04 atribuiu Plan 02-08/09 como owner — owner válido).
- **Fix:** `cv_storage_path: null` no INSERT object. Path real é populado depois via `useUploadCv` no onSuccess (path canonical depende do candidateId real, então não dá para gerar antes do INSERT).
- **Files modified:** `src/components/hiring/CandidateForm.tsx`
- **Verification:** `npx tsc --noEmit -p tsconfig.app.json | grep CandidateForm` → 0 errors
- **Committed in:** `b0870fd` (Task 4 commit)

---

**Total deviations:** 2 auto-fixed (ambos Rule 3 - blocking)
**Impact on plan:** Ambos preservaram o flow downstream sem reabrir escopo. HiringDashboard fix é estrutural (rewrite quebraria runtime); cv_storage_path fix está dentro do scope owner por deferred-items.md.

## Issues Encountered

- Worktree base inicialmente diverged (estava em `56e117d` ao invés de `6142bdf`). Reset hard para o expected base resolveu sem perda de work — commits master mais recentes (admin role assignment, cmdk search remoto, sidebar count fixes) não eram necessários para Plan 02-08.

## Authentication Gates

None — toda execução offline. Tests rodam via vitest+RTL; Edge Function não é tocada.

## User Setup Required

- Nenhum — Plan 02-08 entrega componentes UI puros. Wave 4 finaliza com Plan 02-09 (drawer split + LGPD UI + pages) que vai consumir esses componentes em CandidatesKanban / CandidateProfile.

## Threat Flags

Nenhum surface novo introduzido fora do `<threat_model>` do plan; threats T-02-08-01 a T-02-08-04 mitigated conforme planejado:

- **T-02-08-01 (URL share leak)**: accept — URL share-friendly é feature explícita RS-09; RLS server-side filtra resultados.
- **T-02-08-02 (localStorage view tampering)**: accept — apenas afeta UX, sem security impact. Fallback 'board' em valor inválido.
- **T-02-08-03 (CardFieldsCustomizer enable salário)**: mitigate — herdado de Plan 02-03 cardCustomization.ts (Zod `z.enum(OPTIONAL_FIELDS)` rejeita campos não listados; safeParse → DEFAULT_CARD_PREFERENCES).
- **T-02-08-04 (useCandidateByCpf leak cross-empresa)**: mitigate — herdado de Plan 02-06 useCandidateByCpf (RLS filtra por visible_companies; CPF dedup canonical retorna null se invisível ao usuário).

## Next Phase Readiness

- **Plan 02-09 (drawer split + LGPD UI + pages)**: Pode consumir todos os 6 componentes prontos:
  - `<PipelineFilters />` — sticky bar acima do kanban
  - `<BoardTableToggle value={view} onChange={setView} jobId={jobId} />` + `useKanbanView(jobId)` em CandidatesKanban parent; renderiza `<CandidatesKanban />` ou `<CandidatesTable />` conforme view
  - `<CardFieldsCustomizer />` — trigger no column header overflow ou page header
  - `<DuplicateCandidateDialog matchedBy={...} />` — já consumido por CandidateForm (mais call sites em Plan 02-09 se necessário)

- **Latent errors restantes**: `CandidatesKanban.tsx` ainda tem `expectedUpdatedAt` (Plan 02-05 deferred) — Plan 02-09 precisa rewrite o `onDragEnd` para o novo `MoveApplicationStageArgs` shape (canTransition pre-check + sem optimistic locking) per `deferred-items.md`.

## Self-Check: PASSED

Verifications run:
- `[ -f src/components/hiring/PipelineFilters.tsx ]` → 219 linhas, useSearchParams + debounce ✓
- `[ -f src/components/hiring/CandidatesTable.tsx ]` → 181 linhas, sort 4 colunas ✓
- `[ -f src/components/hiring/BoardTableToggle.tsx ]` → 106 linhas, useKanbanView + STORAGE_KEY ✓
- `[ -f src/components/hiring/CardFieldsCustomizer.tsx ]` → 92 linhas, OPTIONAL_FIELDS ✓
- `grep -c "matchedBy" DuplicateCandidateDialog.tsx` → 9 ✓
- `grep -c "useCandidateByCpf" CandidateForm.tsx` → 2 ✓
- `npx vitest run tests/hiring/PipelineFilters.test.tsx` → 5/5 passing ✓
- `npx vitest run tests/hiring/BoardTableToggle.test.tsx` → 14/14 passing ✓
- `npx vitest run` (full suite) → 488 passing | 32 todo | 0 failures ✓
- `npx tsc --noEmit -p tsconfig.app.json` → 0 errors em files do plan ✓
- `git log --oneline 6142bdf..HEAD` → 4 commits (`ce81af4`, `68362b8`, `8580fd8`, `b0870fd`) ✓

---

*Phase: 02-r-s-refactor*
*Completed: 2026-04-28*
