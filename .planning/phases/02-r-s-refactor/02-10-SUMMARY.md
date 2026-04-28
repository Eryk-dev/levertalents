---
phase: 02-r-s-refactor
plan: 10
subsystem: ui
tags: [hiring, gap-closure, wave4-wire-in, rs-09, rs-10, rs-13, lgpd]
gap_closure: true

# Dependency graph
requires:
  - phase: 02-r-s-refactor
    plan: 07
    provides: "LegacyStageWarning component (above-board banner via useLegacyStageCount)"
  - phase: 02-r-s-refactor
    plan: 08
    provides: "PipelineFilters (URL state), BoardTableToggle + useKanbanView (localStorage persist), CandidatesTable (HTML <table>), CardFieldsCustomizer (popover)"
  - phase: 02-r-s-refactor
    plan: 09
    provides: "src/pages/hiring/CandidatesKanban.tsx page orchestration baseline (drawer state, sessionStorage Encerradas, mobile overlay)"
  - phase: 02-r-s-refactor
    plan: 05
    provides: "useApplicationsByJob via useScopedQuery (cache shared between board, table view, and useTerminalApplications)"
provides:
  - "src/hooks/hiring/useTerminalApplications.ts — filtra terminais (admitido | reprovado_pelo_gestor | recusado) por jobId via useMemo, sem query DB extra"
  - "src/pages/hiring/CandidatesKanban.tsx — Wave 4 wire-in completo (filters + toggle + table + customizer + legacy warning) + Encerradas com lista real"
  - "tests/hiring/useTerminalApplications.test.ts — 3 tests"
  - "tests/hiring/CandidatesKanbanPage.test.tsx — 5 tests integração"
affects: [verify, manual-uat]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Hook derivation pattern (no extra DB query): useTerminalApplications consume useApplicationsByJob query e filtra/ordena via useMemo. Mesmo queryKey via useScopedQuery garante cache compartilhado entre board, CandidatesTable e Encerradas list — alternar Quadro/Tabela ou expandir Encerradas NÃO dispara refetch."
    - "Page-level wire-in: Page importa todos os componentes presentational da Wave 4 (PipelineFilters, BoardTableToggle, CandidatesTable, CardFieldsCustomizer, LegacyStageWarning) e gerencia apenas state cross-cutting (drawer, formOpen, view via useKanbanView, encerradas via sessionStorage)."
    - "Test isolation com persistência por storage: testes que tocam useKanbanView (localStorage) ou Encerradas (sessionStorage) DEVEM limpar ambos em beforeEach — vitest não isola storage entre tests do mesmo arquivo (jsdom global)."

key-files:
  created:
    - src/hooks/hiring/useTerminalApplications.ts
    - tests/hiring/useTerminalApplications.test.ts
    - tests/hiring/CandidatesKanbanPage.test.tsx
    - .planning/phases/02-r-s-refactor/02-10-SUMMARY.md
  modified:
    - src/pages/hiring/CandidatesKanban.tsx  # Wave 4 wire-in + Encerradas real list (TODO bloco removido, placeholder substituído)

key-decisions:
  - "TERMINAL_STAGES = [admitido, reprovado_pelo_gestor, recusado] — os 3 stages reais com array vazio em APPLICATION_STAGE_TRANSITIONS (statusMachine.ts:27-29). NÃO inclui os strings inexistentes 'reprovado'/'descartado' que apareciam no gap_to_close textual da verification — esses strings não existem no enum ApplicationStage."
  - "useTerminalApplications deriva via useMemo de useApplicationsByJob em vez de uma query DB nova. Justificativa: o board já carrega TODAS as applications da vaga (queryKey ['scope', scope.id, scope.kind, 'hiring', 'applications', 'by-job', jobId] via useScopedQuery). Nova query duplicaria payload + invalidaria cache compartilhado. Custo: O(n) filter+sort sobre ~50-200 applications típicas de uma vaga — negligível."
  - "Render inline (decisão (a) do user em 02-VERIFICATION.md gap RS-10) em vez de navegar para /hiring/jobs. Mantém Notion-style do feedback_ux.md — Encerradas vive aninhada no mesmo page que o board ativo."
  - "tableApplications transformação espelha o map que o componente board já faz internamente (CandidatesKanban.tsx:212-222). Em vez de extrair função helper compartilhada (over-engineering para 12 linhas duplicadas), repliquei inline no page. Próxima refactor pode extrair se houver 3+ consumers."
  - "sessionStorage/localStorage clear em beforeEach do page test: Encerradas (sessionStorage) e useKanbanView (localStorage) persistem entre tests do mesmo arquivo no jsdom. Limpar explicitamente é a forma idiomática (vi.clearAllMocks não toca storage). Sem isso, o teste de empty-state falhava porque o teste anterior deixava encerradasOpen=true → segundo click invertia para closed."

patterns-established:
  - "Gap closure plan: deriva 100% das decisões da VERIFICATION (não inventa scope), traz `gap_closure: true` flag, fecha exatamente os SCs marcados FAILED/PARTIAL"
  - "Custom hook derivation chain: useTerminalApplications → useApplicationsByJob (compartilha queryKey, evita refetch e query duplicada)"

requirements-completed:
  - RS-09  # PipelineFilters renderizado inline acima do board (Wave 4 wire-in)
  - RS-10  # Encerradas com lista real de terminais (substituiu placeholder)
  - RS-13  # BoardTableToggle + CandidatesTable renderizados, alternância funcional com persistência por jobId

# Metrics
duration: 6min
completed: 2026-04-28
---

# Phase 2 Plan 10: Gap closure RS-09/RS-10/RS-13 — Wave 4 wire-in + Encerradas reais Summary

**Fechou os dois gaps reportados em 02-VERIFICATION.md (SC-1 FAILED + SC-3 PARTIAL): wire-in completo dos componentes Wave 4 (PipelineFilters, BoardTableToggle, CandidatesTable, CardFieldsCustomizer, LegacyStageWarning) na page `src/pages/hiring/CandidatesKanban.tsx` (que tinha apenas TODO comment de Plans 02-07/08), e substituição do placeholder do CollapsibleContent das Encerradas por lista real de candidatos terminais via novo hook `useTerminalApplications` que deriva de `useApplicationsByJob` por useMemo (sem query DB extra).**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-04-28T11:57:31Z
- **Completed:** 2026-04-28T12:03:19Z
- **Tasks:** 3 auto (TDD: RED → GREEN para Task 1 e Task 2 + Task 3 fix de isolation)
- **Files created:** 3 (1 hook + 2 tests)
- **Files modified:** 1 (page CandidatesKanban.tsx)

## Accomplishments

### Task 1 — useTerminalApplications hook (TDD)

- **`src/hooks/hiring/useTerminalApplications.ts`** (46 linhas):
  - `TERMINAL_STAGES = ["admitido", "reprovado_pelo_gestor", "recusado"] as const satisfies readonly ApplicationStage[]` — exatamente os 3 stages com array vazio em `APPLICATION_STAGE_TRANSITIONS`
  - `isTerminalStage(s)` type guard
  - `useTerminalApplications(jobId)` — wrapper sobre `useApplicationsByJob` que retorna `{ ...query, data: filtered+sorted }` via useMemo. Sort: `stage_entered_at` DESC (recentes primeiro).
- **`tests/hiring/useTerminalApplications.test.ts`** (107 linhas, 3 tests):
  - Test 1: TERMINAL_STAGES tuple === [admitido, reprovado_pelo_gestor, recusado] + isTerminalStage por stage
  - Test 2: filtra 5 applications (3 terminais + 2 ativas) → length 3 ordenadas DESC por stage_entered_at
  - Test 3: jobId=undefined → data: [] (sem crash)

### Task 2 — Page wire-in (Wave 4 + RS-10 Encerradas)

**`src/pages/hiring/CandidatesKanban.tsx`** — reescrito:

Imports adicionados:
```typescript
import { LegacyStageWarning } from "@/components/hiring/LegacyStageWarning";
import { PipelineFilters } from "@/components/hiring/PipelineFilters";
import { BoardTableToggle, useKanbanView } from "@/components/hiring/BoardTableToggle";
import { CandidatesTable } from "@/components/hiring/CandidatesTable";
import { CardFieldsCustomizer } from "@/components/hiring/CardFieldsCustomizer";
import { useApplicationsByJob, useReuseCandidateForJob } from "@/hooks/hiring/useApplications";
import { useTerminalApplications } from "@/hooks/hiring/useTerminalApplications";
import { APPLICATION_STAGE_LABELS } from "@/lib/hiring/statusMachine";
import { formatBRDate } from "@/lib/formatBR";
```

Wire-in (substituiu TODO comment):
- `<LegacyStageWarning jobId={job.id} />` acima do board (banner de migração F.1)
- `<PipelineFilters />` inline (URL state — `?vaga=&fase=&origem=&q=`)
- Toolbar `<Row>` com `<BoardTableToggle jobId={job.id} value={view} onChange={setView} />` + `<CardFieldsCustomizer />`
- Conditional render: `view === "table" ? <CandidatesTable ... /> : <CandidatesKanban ... />`
- `tableApplications` derivado por useMemo de `useApplicationsByJob` (cache compartilhado com board)

Encerradas — substituiu placeholder por componente local `TerminalApplicationsList`:
- Loading: "Carregando…"
- Empty: "Nenhum candidato em etapa final desta vaga."
- Lista: `<ul>` com `<button>` por candidato — name + APPLICATION_STAGE_LABELS[stage] + formatBRDate(stage_entered_at); onClick → handleOpenCandidate (abre drawer)
- Removido: link `/hiring/jobs`, texto "Etapas terminais (admitido/recusado/reprovado)", "Lista detalhada vive em..."

Preservado intocado: drawer split (Plan 02-09 re-export), sessionStorage Encerradas open/closed persist, mobile overlay drawer, dialog Novo candidato + useReuseCandidateForJob.

### Task 3 — Page integration test

**`tests/hiring/CandidatesKanbanPage.test.tsx`** (193 linhas, 5 tests):

1. Smoke — `<CandidatesKanbanPage />` renderiza com job mockado (h1 "Vaga Teste")
2. Toolbar render — role search "filtros" + role tablist "visualização" + button "customizar campos"
3. Toggle Quadro/Tabela — clicar "Tabela" mostra `getByRole('table')`; clicar "Quadro" remove
4. Encerradas lista terminais reais — 3 mocks (Maria=admitido, João=recusado, Ana=apto_entrevista_rh) → expand → Maria + João visíveis com labels Admitido/Recusado, Ana ausente, placeholder antigo ausente
5. Encerradas empty — sem terminais → "Nenhum candidato em etapa final desta vaga."

## Task Commits

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 RED | Failing test for useTerminalApplications | `741148c` | tests/hiring/useTerminalApplications.test.ts |
| 1 GREEN | Implement useTerminalApplications | `29c95d9` | src/hooks/hiring/useTerminalApplications.ts |
| 3 RED | Failing integration test for page (4/5 fail) | `6191816` | tests/hiring/CandidatesKanbanPage.test.tsx |
| 2 GREEN | Wire Wave 4 components + Encerradas real list | `9e679e1` | src/pages/hiring/CandidatesKanban.tsx |
| 3 fix | Clear sessionStorage/localStorage between tests | `69bdca7` | tests/hiring/CandidatesKanbanPage.test.tsx |

Total: 5 commits.

## Verification Results

### Tests (vitest + RTL)

```
tests/hiring/useTerminalApplications.test.ts (3 tests) ✓
  - TERMINAL_STAGES tuple correto
  - filtra + ordena DESC
  - jobId undefined → data: []

tests/hiring/CandidatesKanbanPage.test.tsx (5 tests) ✓
  - smoke: renderiza com job carregado
  - toolbar: PipelineFilters + BoardTableToggle + CardFieldsCustomizer
  - toggle entre Quadro e Tabela
  - Encerradas lista terminais reais (Maria, João; sem Ana; sem placeholder antigo)
  - Encerradas empty state PT-BR
```

Full suite: **515 passing | 0 failures** (30 test files). Confirma a previsão do plan: 507 (pre) + 3 + 5 = 515.

### TypeScript (`tsc --noEmit -p tsconfig.app.json`)

ZERO errors em arquivos do plan:
- `src/hooks/hiring/useTerminalApplications.ts`
- `tests/hiring/useTerminalApplications.test.ts`
- `src/pages/hiring/CandidatesKanban.tsx`
- `tests/hiring/CandidatesKanbanPage.test.tsx`

(Errors pre-existentes em `src/pages/Index.tsx`, `src/components/hiring/CandidatesKanban.tsx` linha 219 e `src/components/hiring/AllCandidatesKanban.tsx` linha 252 listados em deferred-items.md — não tocam este plan.)

### ESLint

Zero warnings/errors em todos os 4 arquivos do plan (`npx eslint src/pages/hiring/CandidatesKanban.tsx src/hooks/hiring/useTerminalApplications.ts tests/hiring/useTerminalApplications.test.ts tests/hiring/CandidatesKanbanPage.test.tsx`).

### Grep guards (must_haves.truths)

```
grep -q "<PipelineFilters" src/pages/hiring/CandidatesKanban.tsx       → ✓
grep -q "<BoardTableToggle" src/pages/hiring/CandidatesKanban.tsx      → ✓
grep -q "<CandidatesTable" src/pages/hiring/CandidatesKanban.tsx       → ✓
grep -q "<CardFieldsCustomizer" src/pages/hiring/CandidatesKanban.tsx  → ✓
grep -q "<LegacyStageWarning" src/pages/hiring/CandidatesKanban.tsx    → ✓
grep -q "useTerminalApplications" src/pages/hiring/CandidatesKanban.tsx → ✓
grep -q "useKanbanView" src/pages/hiring/CandidatesKanban.tsx          → ✓
grep -q "TerminalApplicationsList" src/pages/hiring/CandidatesKanban.tsx → ✓
grep -q "APPLICATION_STAGE_LABELS" src/pages/hiring/CandidatesKanban.tsx → ✓
grep -q "formatBRDate" src/pages/hiring/CandidatesKanban.tsx           → ✓
grep -q "useApplicationsByJob" src/pages/hiring/CandidatesKanban.tsx   → ✓
! grep -q "TODO Wave 4 wire-in" src/pages/hiring/CandidatesKanban.tsx  → ✓ (removido)
! grep -q "Etapas terminais (admitido/recusado/reprovado)" src/pages/hiring/CandidatesKanban.tsx → ✓ (removido)
! grep -q "Lista detalhada vive em" src/pages/hiring/CandidatesKanban.tsx → ✓ (removido)
grep -q "useApplicationsByJob" src/hooks/hiring/useTerminalApplications.ts → ✓ (deriva, sem query nova)
! grep -q '"reprovado"' src/hooks/hiring/useTerminalApplications.ts    → ✓ (string fictício ausente)
! grep -q '"descartado"' src/hooks/hiring/useTerminalApplications.ts   → ✓ (string fictício ausente)
```

## Decisions Made

(Replicadas em key-decisions frontmatter; resumo:)

1. **TERMINAL_STAGES com 3 stages reais do enum** (não os strings 'reprovado'/'descartado' do gap_to_close textual).
2. **useTerminalApplications deriva por useMemo** em vez de query nova — cache compartilhado, custo O(n) negligível.
3. **Encerradas inline** (não navega) — preserva Notion-style.
4. **tableApplications transform inline** (não extrai helper) — duplicação aceitável de 12 linhas.
5. **Storage clear em beforeEach** — Encerradas e useKanbanView persistem em jsdom entre tests.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] Test isolation: sessionStorage/localStorage não limpa entre tests do mesmo arquivo**

- **Found during:** Task 2 GREEN verification
- **Issue:** Após implementar a page, 4/5 tests passaram mas o test "empty state" falhou — o teste anterior ("lista terminais reais") gravava `leverup:rs:encerradas-open=true` no sessionStorage; no teste seguinte, o `useState` initializer lia esse valor e iniciava com `encerradasOpen=true`; o `fireEvent.click` invertia para `closed`, escondendo o conteúdo.
- **Fix:** Adicionar `sessionStorage.clear() + localStorage.clear()` em `beforeEach` do test file. `vi.clearAllMocks()` não toca storage do jsdom.
- **Files modified:** `tests/hiring/CandidatesKanbanPage.test.tsx`
- **Verification:** 5/5 tests passando após fix.
- **Committed in:** `69bdca7`

**Total deviations:** 1 auto-fixed (Rule 1 — test bug). Nenhum scope creep, nenhuma mudança arquitetural.

### Out-of-scope (Deferred)

Nenhum item adicional descoberto. Errors pre-existentes em `src/pages/Index.tsx` e nos componentes `CandidatesKanban`/`AllCandidatesKanban` (linhas 219/252) já documentados em `deferred-items.md`.

## Issues Encountered

- **Worktree branch base mismatch ao iniciar**: `ACTUAL_BASE` (56e117d) divergiu do `EXPECTED_BASE` (6787e35). `git reset --hard 6787e35` corrigiu antes de começar — fluxo padrão documentado em `<worktree_branch_check>`.

## Authentication Gates

None — todos os tests rodam offline com mocks de hooks. Nenhum supabase real tocado.

## Threat Flags

Nenhum surface novo introduzido. O plan apenas wire componentes que já passaram por threat modeling em Plans 02-07/08/09. Mitigations relevantes:

- **PipelineFilters** — URL state via useSearchParams (T-02-08-* mitigated em Plan 02-08): valores de filter são server-validated por RLS já existentes; client filter é apenas UX.
- **BoardTableToggle** — localStorage por jobId; T-02-08-03 (tampering): valor é UX-only, RLS server-side é a security boundary.
- **TerminalApplicationsList** — apenas leitura derivada do mesmo dataset que o board já mostra; sem nova superfície LGPD. PII (full_name) já flui via `useApplicationsByJob` no board.

## CLAUDE.md Compliance

- ✓ `supabase.from()` continua só em `src/hooks/` — `useTerminalApplications` NÃO chama supabase direto, apenas wrap `useApplicationsByJob` (que vive em `src/hooks/hiring/useApplications.ts`).
- ✓ `queryKey` herdado via `useApplicationsByJob` → `useScopedQuery` chokepoint → `["scope", scope.id, scope.kind, "hiring", "applications", "by-job", jobId]`. Sem novo queryKey introduzido.
- ✓ Brand: nenhum Lucide `ArrowX` novo (page já tinha `ArrowLeft` no header — preservado). LeverArrow primitive intocado.
- ✓ Nenhum `console.log` PII; sem `as any` casts; Forms continuam react-hook-form 7.73 (não tocadas).
- ✓ Componente da page: 311 linhas (incluindo sub-componente `TerminalApplicationsList`) — ainda em zona aceitável (CLAUDE.md flag é >800 linhas).

## Next Phase Readiness

- **Verify (re-run /gsd-verify-work):** após este SUMMARY mergear, refazer verification. Esperado: SC-1 (Wave 4 visible to user) e SC-3 (Encerradas com dados reais) PASS. Nenhum gap restante para Phase 2.
- **Manual UAT** (deferred do Plan 02-09 Task 5): orquestrador OU usuário executa os 8 cenários — agora com page funcional (filters, toggle, table, encerradas) testáveis em runtime.
- **STATE.md / ROADMAP.md update**: orquestrador faz após merge do worktree (worktree mode — agente NÃO modifica esses arquivos).

## Self-Check: PASSED

Verifications run:
- `[ -f src/hooks/hiring/useTerminalApplications.ts ]` → ✓
- `[ -f tests/hiring/useTerminalApplications.test.ts ]` → ✓
- `[ -f tests/hiring/CandidatesKanbanPage.test.tsx ]` → ✓
- `git log --oneline 6787e35..HEAD` → 5 commits (`741148c`, `29c95d9`, `6191816`, `9e679e1`, `69bdca7`) ✓
- `npx vitest run tests/hiring/useTerminalApplications.test.ts` → 3/3 ✓
- `npx vitest run tests/hiring/CandidatesKanbanPage.test.tsx` → 5/5 ✓
- `npx vitest run` (full suite) → 515 passing | 0 failures (30 test files) ✓
- `npx tsc --noEmit -p tsconfig.app.json` (filtered to plan files) → zero errors ✓
- `npx eslint <plan files>` → zero warnings ✓
- 17 grep guards (Wave 4 JSX present, TODO removed, placeholder removed, fictitious stages absent) → all ✓

---

*Phase: 02-r-s-refactor*
*Plan: 10 (gap closure)*
*Completed: 2026-04-28*
