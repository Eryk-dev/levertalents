---
phase: 02-r-s-refactor
plan: 03
subsystem: utilities
tags: [supabase-error, sla, cpf, card-customization, zod, stage-groups, hiring, vitest, tdd]

# Dependency graph
requires:
  - phase: 02-r-s-refactor
    plan: 01
    provides: "Vitest skeletons (.skip + it.todo) para 6 utilities files — Plan 02-03 ativa removendo .skip e implementando it() reais; Zod 3.25 + @hookform/resolvers 5.2.2 (Phase 1 deps); date-fns precedent (retention.ts)"
  - phase: 02-r-s-refactor
    plan: 02
    provides: "Migration F.4 normalize_cpf trigger (DB-side mirror) — Plan 02-03 cria cpf.ts client-side mirror; D-11 sparkbar color intent referenciado em STAGE_GROUP_BAR_COLORS update"
provides:
  - "MoveApplicationError discriminated union (5 kinds: rls/network/conflict/transition/unknown) + 4 detect helpers + getMoveErrorToastConfig em src/lib/supabaseError.ts — fundação para useMoveApplicationStage rewrite (Plan 02-05)"
  - "src/lib/hiring/sla.ts — pure functions computeSlaTone (D-10: 0-1d ok, 2-4d warning, >=5d critical) + daysSince + SLA_THRESHOLDS + SLA_BORDER_CLASSES + SLA_DOT_CLASSES (Tailwind utilities)"
  - "src/lib/hiring/cpf.ts — normalizeCpf (mirror DB trigger) + formatCpf (UI display) + isValidCpfFormat — pure functions client-side"
  - "src/lib/hiring/cardCustomization.ts — Zod schema versionado (CardPreferencesSchema) + OPTIONAL_FIELDS array (6 D-08 fields) + loadCardPreferences/saveCardPreferences com namespace leverup:rs:card-fields:{userId} + DEFAULT_CARD_PREFERENCES + isFieldEnabled"
  - "STAGE_GROUP_BAR_COLORS atualizado para D-11 (intencionalidade do funil, não ordem visual): triagem+checagem=status-blue/70, entrevista_rh+entrevista_final=status-amber/80, decisao=status-green, descartados=status-red/60"
  - "6 vitest test suites green (376 tests passando): tests/lib/supabaseError (20) + tests/hiring/canTransition (294) + tests/hiring/stageGroups (17) + tests/hiring/sla (17) + tests/hiring/cpf (14) + tests/hiring/useCardPreferences (14)"
affects: [02-04, 02-05, 02-06, 02-07, 02-08, 02-09]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Discriminated union + type-narrowing predicates: MoveApplicationError com kind discriminator + 4 detect functions + 1 type guard — caller usa switch(err.kind) sem casts"
    - "Pure utility module (zero React, zero supabase, zero side-effects): sla.ts e cpf.ts são chamáveis em qualquer contexto; testes drivam SLA_THRESHOLDS direto da export"
    - "Zod schema versionado (z.literal(SCHEMA_VERSION)) para resilience a localStorage tampering: load via safeParse retorna DEFAULT em qualquer falha (corrupted JSON / schema antigo / userId ausente)"
    - "localStorage namespacing por usuário (leverup:rs:card-fields:{userId}) com silent-fail no save para storage cheio/disabled"
    - "Regression guard via vitest test (T-02-03-03): tests/hiring/stageGroups.test.ts garante triagem NÃO usa text-subtle e entrevista_rh NÃO usa status-blue (cores antigas)"

key-files:
  created:
    - src/lib/hiring/sla.ts
    - src/lib/hiring/cpf.ts
    - src/lib/hiring/cardCustomization.ts
    - .planning/phases/02-r-s-refactor/02-03-SUMMARY.md
  modified:
    - src/lib/supabaseError.ts
    - src/lib/hiring/stageGroups.ts
    - tests/lib/supabaseError.test.ts
    - tests/hiring/canTransition.test.ts
    - tests/hiring/stageGroups.test.ts
    - tests/hiring/sla.test.ts
    - tests/hiring/cpf.test.ts
    - tests/hiring/useCardPreferences.test.tsx

key-decisions:
  - "MoveApplicationError discriminated union usa string literal kinds (rls/network/conflict/transition/unknown) — switch case caller inference funciona sem casts; getMoveErrorToastConfig retorna shape { title, description, duration } compatível com sonner"
  - "detectNetworkDrop reconhece 3 sinais distintos: TypeError + /fetch/i (browser fetch fail), Error + name='AbortError' (timeout), { code: '' } (supabase-js fallthrough). Mantém retry gating em useMoveApplicationStage (Plan 02-05) preciso"
  - "SLA thresholds D-10 LOCK: SLA_THRESHOLDS = { warning: 2, critical: 5 } as const exposed para tests usarem como driver da tabela; clamp em 0 para datas futuras (defensive contra clock drift)"
  - "OPTIONAL_FIELDS define 6 campos D-08: avatar, next_interview, cv_icon, fit_score, bg_check_dot, source_tag. DEFAULT_CARD_PREFERENCES inclui apenas avatar+next_interview+cv_icon (sensible default)"
  - "STAGE_GROUP_BAR_COLORS atualizado para D-11 fielmente: cor por intencionalidade do funil (azul=movimento inicial, amarelo=entrevista, verde=aprovação, vermelho=descarte), não pela ordem visual das colunas"

patterns-established:
  - "Discriminated union + detect helpers + toast config: caller path sempre passa por detect → wrap em MoveApplicationError → getMoveErrorToastConfig → toast UI"
  - "Pure utility test pattern: vi.useFakeTimers() + vi.setSystemTime() para deterministic SLA tests; SLA_THRESHOLDS exposto para drivar tabela exhaustive"
  - "Zod schema-as-validation no localStorage I/O: safeParse retorna DEFAULT (não throws) — render path resiliente by design"
  - "Regression guard via test (não comment): tests/hiring/stageGroups.test.ts trava STAGE_GROUP_BAR_COLORS contra D-11 inversion attempts"

requirements-completed:
  - RS-04   # canTransition exhaustive truth-table tests garantem chamada antes do mutate (Plan 02-05 wires)
  - RS-08   # SLA tone visual + sparkbar bar colors D-11 prontos
  - RS-13   # Card customization Zod schema + 6 OPTIONAL_FIELDS prontos para Plan 02-08 toggle UI
  - TAL-09  # CPF normalize/format helpers client-side prontos para DuplicateCandidateDialog (Plan 02-08)

# Metrics
duration: 8min
completed: 2026-04-28
---

# Phase 2 Plan 3: Wave 1 Utilities Summary

**5 pure utility modules (supabaseError detectors + sla.ts + cpf.ts + cardCustomization.ts + STAGE_GROUP_BAR_COLORS D-11) destravando hooks downstream com 376 vitest tests green.**

## Performance

- **Duration:** ~8 min (6 commits sequenciais — TDD test→feat por arquivo)
- **Started:** 2026-04-28T02:14:00Z (commit 209fc6d)
- **Completed:** 2026-04-28T02:22:00Z (commit bb62212)
- **Tasks:** 3 (todos auto-completed via TDD red→green)
- **Files created:** 4 (3 utilities + 1 SUMMARY.md)
- **Files modified:** 8 (supabaseError.ts + stageGroups.ts + 6 test files)

## Accomplishments

- Discriminated union `MoveApplicationError` + 4 type-narrowing predicates (`detectRlsDenial`, `detectNetworkDrop`, `detectConflict`, `detectTransitionReject`) + UI-locked toast config helper destravam o `useMoveApplicationStage` rewrite em Plan 02-05 sem ambiguidade de error kind
- `sla.ts` puro com thresholds D-10 (2/5 dias) + clamp em 0 + Tailwind utility maps prontos para `SlaBadge` + `CandidateCard` (Plan 02-07) consumirem via single import
- `cpf.ts` cliente-side mirror exato do trigger DB `tg_normalize_candidate_cpf` (Migration F.4): mesma operação `replace(/[^0-9]/g, "")` garante zero divergência entre busca client e PK lookup server
- `cardCustomization.ts` schema Zod versionado tolera evolução futura: `version: z.literal(1)` rejeita storage de versões antigas/futuras silenciosamente, retornando DEFAULT — render path resiliente por design (T-02-03-01 mitigado)
- `STAGE_GROUP_BAR_COLORS` corrigido fielmente para D-11 (intencionalidade do funil) — `JobCard` sparkbar (Plan 02-07) entrega visualização consistente com a leitura do owner sem requerer ajuste downstream
- 376 tests adicionais green (376 = 294 canTransition + 17 stageGroups + 20 supabaseError + 17 sla + 14 cpf + 14 useCardPreferences); zero regressão nas 56 tests pré-existentes

## Task Commits

Each task was committed atomically (TDD red → green pair por task):

1. **Task 1: Extend supabaseError.ts with 4 detectors + MoveApplicationError union** — TDD pair:
   - `209fc6d` (test) — activate failing tests for supabaseError detectors
   - `35678b3` (feat) — add MoveApplicationError detectors + toast config to supabaseError
2. **Task 2: Create sla.ts + cpf.ts + cardCustomization.ts** — TDD pair:
   - `9d933af` (test) — activate failing tests for sla / cpf / cardCustomization
   - `07c0a79` (feat) — add sla / cpf / cardCustomization pure utilities
3. **Task 3: Update STAGE_GROUP_BAR_COLORS to D-11 + activate canTransition + stageGroups tests** — TDD pair:
   - `d3fb74c` (test) — activate canTransition + stageGroups suites with D-11 expectations
   - `bb62212` (feat) — align STAGE_GROUP_BAR_COLORS to D-11 intencionalidade

**Plan metadata:** (final docs commit creates SUMMARY.md + updates STATE.md/ROADMAP.md)

## Files Created/Modified

### Created (3 utility files + 1 summary)

| File | Lines | Purpose |
|------|------:|---------|
| `src/lib/hiring/sla.ts` | 50 | `computeSlaTone` (0-1d ok / 2-4d warning / >=5d critical) + `daysSince` + Tailwind border/dot class maps |
| `src/lib/hiring/cpf.ts` | 46 | `normalizeCpf` (mirror DB trigger) + `formatCpf` (UI display) + `isValidCpfFormat` |
| `src/lib/hiring/cardCustomization.ts` | 78 | Zod `CardPreferencesSchema` + 6 `OPTIONAL_FIELDS` + `load/saveCardPreferences` namespaced + `isFieldEnabled` |
| `.planning/phases/02-r-s-refactor/02-03-SUMMARY.md` | — | this file |

### Modified (2 src files + 6 test files)

| File | Change |
|------|--------|
| `src/lib/supabaseError.ts` | APPEND: `MoveApplicationError` union + `detectRlsDenial` / `detectNetworkDrop` / `detectConflict` / `detectTransitionReject` + `getMoveErrorToastConfig`. Exports antigos (`formatSupabaseError`, `handleSupabaseError`, `throwOnError`) preservados |
| `src/lib/hiring/stageGroups.ts` | EDIT: `STAGE_GROUP_BAR_COLORS` agora reflete D-11 (triagem+checagem=blue, entrevista_rh+entrevista_final=amber, decisao=green, descartados=red). Outras exports inalteradas |
| `tests/lib/supabaseError.test.ts` | Activated: 20 tests (5 detectRlsDenial + 6 detectNetworkDrop + 4 detectConflict + 3 detectTransitionReject + 5 getMoveErrorToastConfig) |
| `tests/hiring/canTransition.test.ts` | Activated: 294 exhaustive truth-table tests (17 stages × 17 stages + 5 sanity) |
| `tests/hiring/stageGroups.test.ts` | Activated: 17 tests (3 STAGE_GROUPS shape + 6 STAGE_GROUP_BY_STAGE + 8 STAGE_GROUP_BAR_COLORS D-11) |
| `tests/hiring/sla.test.ts` | Activated: 17 tests (5 daysSince + 11 computeSlaTone + 1 SLA_THRESHOLDS) |
| `tests/hiring/cpf.test.ts` | Activated: 14 tests (7 normalizeCpf + 5 formatCpf + 2 isValidCpfFormat) |
| `tests/hiring/useCardPreferences.test.tsx` | Activated: 14 tests (5 schema + 7 loadCardPreferences round-trip + 2 isFieldEnabled) |

## Verification Results

- **`npm test` exit 0** — Test Files: 16 passed | 11 skipped (27 total); Tests: **432 passed** | 90 todo (522 total)
  - 376 dos 432 são as 6 suites ativadas por este plan (294 + 17 + 20 + 17 + 14 + 14)
  - 56 tests pré-existentes continuam green (zero regressão)
- **`npx tsc --noEmit -p tsconfig.app.json`**: 42 erros, todos pré-existentes em `src/pages/hiring/PublicJobOpening.tsx` e `src/pages/Index.tsx`. Zero erros nos arquivos modificados/criados pelo plan 02-03 (verified via grep filtering — match vazio para os 11 arquivos do plan). Documentado em `deferred-items.md` (Plan 02-01).
- **ESLint clean**: `npx eslint src/lib/supabaseError.ts src/lib/hiring/sla.ts src/lib/hiring/cpf.ts src/lib/hiring/cardCustomization.ts src/lib/hiring/stageGroups.ts` retorna 0 errors / 0 warnings.

## Decisions Made

- **Discriminated union com string literals** ao invés de classes ou enums — habilita TypeScript narrowing em switch cases sem `as` casts, e facilita serialização (toast config helper opera em payload puro). Decision alinhado com pattern existente em `src/lib/hiring/statusMachine.ts`.
- **`detectNetworkDrop` reconhece 3 sinais distintos** (TypeError+fetch / AbortError / code='' fallthrough) — necessário para Plan 02-05 retry policy preciso (network errors retry com exponential backoff até 3, RLS/transition NUNCA retry).
- **SLA thresholds expostos via export `SLA_THRESHOLDS`** — testes drivam tabela exhaustive direto do export, garantindo que mudança de threshold (e.g. 2→3 amber) atualiza tests automaticamente. Pattern consistente com `APPLICATION_STAGE_TRANSITIONS` em `statusMachine.ts`.
- **`OPTIONAL_FIELDS` como array `as const`** ao invés de enum — enables `z.enum(OPTIONAL_FIELDS)` Zod validation (Zod 3 aceita readonly tuple) e iteração em UI sem precisar de `Object.values()`.
- **DEFAULT_CARD_PREFERENCES inclui apenas 3 dos 6 campos** (avatar+next_interview+cv_icon) — sensible defaults D-08 baseados em UX-AUDIT-VAGAS §4.1; campos avançados (fit_score / bg_check_dot / source_tag) ficam opt-in para reduzir noise visual.
- **STAGE_GROUP_BAR_COLORS update em-place** (não duplicação ou rename) — preserva todas as importações existentes em `JobCard.tsx`. Regression guard pelo test garante que rollback acidental falha CI antes de merge.

## Deviations from Plan

None — plan executou exatamente como escrito.

Os 5 arquivos `.ts` modificados/criados batem 1:1 com `must_haves.artifacts` do PLAN.md. Os 6 arquivos de teste foram ativados conforme `must_haves.truths` ("Vitest tests Wave 0 ativados (.skip removido) e green"). Threats T-02-03-01 (localStorage tampering) e T-02-03-03 (color regression) mitigados conforme threat_model. T-02-03-02 (PII em logs) accept — funções puras não logam.

**Notas de execução** (não rastreáveis como deviation):

- Os tests de `tests/hiring/canTransition.test.ts` e `tests/hiring/stageGroups.test.ts` já tinham asserts implementados em Plan 02-01 (não eram apenas `it.todo`). O step "remover .skip" foi suficiente — nenhum teste real precisou ser reescrito. Isso aconteceu porque o Plan 02-01 anteriormente preencheu corpos com `expect()` reais para esses dois arquivos específicos (decisão do executor de 02-01 sobre quanto adiantar).

## Issues Encountered

- **Hook PreToolUse:Edit pode disparar em sequence** mesmo após Read recente — workaround foi re-Read do arquivo antes de cada Edit subsequente, sem prejuízo de função.

## User Setup Required

None — utilities puras, sem deps externas, sem configuração de serviço.

## Threat Flags

Nenhum surface novo introduzido fora do threat_model do plan. Todos os threats listados foram mitigados:
- **T-02-03-01** (localStorage tampering): `safeParse` rejeita valores fora de `OPTIONAL_FIELDS`; fallback para `DEFAULT_CARD_PREFERENCES`. Verified via test "retorna DEFAULT quando JSON corrompido" e "retorna DEFAULT quando version não bate".
- **T-02-03-02** (PII em logs): accept — `sla.ts`, `cpf.ts`, `cardCustomization.ts` são funções puras que não logam.
- **T-02-03-03** (STAGE_GROUP_BAR_COLORS regression): Vitest test em `tests/hiring/stageGroups.test.ts` falha se `triagem` não tem `status-blue` ou se `entrevista_rh` volta a usar `status-blue` (D-11 enforcement automático no CI).

## Next Phase Readiness

- **Wave 2 BLOCKING (Plan 02-04)** está pronto para iniciar imediatamente:
  1. `supabase db push` aplica F.1 + F.2 + F.3 + F.4 sequencialmente (SQLs já escritos em Plan 02-02)
  2. `supabase gen types typescript --linked > src/integrations/supabase/types.ts` regenera types
  3. `npx supabase test db` roda 19 pgTAP tests novos (esperado: green)
- **Wave 3 (Plan 02-05 hooks core)** depende dos types regenerados em 02-04 + dos detectors deste plan já no lugar.
- **Wave 4 (Plan 02-07/08 UI)** vai consumir `sla.ts`, `cpf.ts`, `cardCustomization.ts` diretos. Single import por feature, sem deps cruzadas.
- **Critério "utilities pure":** zero React, zero supabase, zero side-effects (exceto cardCustomization que toca localStorage). Todos os módulos são tree-shakeable e não bloqueiam SSR/test environments.

## Self-Check: PASSED

Verifications run:

- `[ -f src/lib/supabaseError.ts ]` — FOUND (4 detectors + MoveApplicationError + getMoveErrorToastConfig presentes)
- `[ -f src/lib/hiring/sla.ts ]` — FOUND (computeSlaTone + daysSince + SLA_THRESHOLDS exports)
- `[ -f src/lib/hiring/cpf.ts ]` — FOUND (normalizeCpf + formatCpf + isValidCpfFormat exports)
- `[ -f src/lib/hiring/cardCustomization.ts ]` — FOUND (CardPreferencesSchema + OPTIONAL_FIELDS + load/save exports)
- `grep "status-blue/70" src/lib/hiring/stageGroups.ts` — MATCH on triagem+checagem (D-11)
- `git log --oneline | grep -E "(209fc6d|35678b3|9d933af|07c0a79|d3fb74c|bb62212)"` — ALL 6 COMMITS PRESENT
- `npm test` exit 0 (432 passed, 90 todo, 0 failed)
- `npx eslint <5 files>` — 0 errors, 0 warnings

---

*Phase: 02-r-s-refactor*
*Completed: 2026-04-28*
