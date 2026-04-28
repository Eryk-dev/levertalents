---
phase: 02-r-s-refactor
plan: 01
subsystem: testing
tags: [vitest, msw, pgtap, react-testing-library, supabase-realtime, lgpd, hiring]

# Dependency graph
requires:
  - phase: 01-tenancy-backbone
    provides: "Vitest + RTL + MSW + pgTAP infrastructure (Plan 01-01); useScopedQuery chokepoint pattern (Plan 01-05); QueryClient wrapper convention (tests/scope/useScopedQuery.test.tsx)"
provides:
  - "16 Vitest test skeletons em tests/hiring/ + 1 em tests/lib/supabaseError.test.ts (144 it.todo placeholders distribuídos)"
  - "MSW handlers para 4 cenários do D-05 (rls/network/conflict/transition) + handlers default para applications/candidates/consents/data_access_log/RPC"
  - "Realtime mock (createMockChannel + createRemoveChannelSpy + buildPostgresChangePayload) para useApplicationsRealtime"
  - "5 pgTAP skeletons em supabase/tests/006-010 com SELECT skip(N) (zero failing) cobrindo Migration F.1-F.4 + cron retention"
  - "Convenção verificável: cada arquivo aponta o plan que ativa (TODO Plan 02-XX: remover .skip)"
affects: [02-02, 02-03, 02-04, 02-05, 02-06, 02-07, 02-08, 02-09]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Failing-by-default skeleton: describe.skip + it.todo (vitest) | SELECT skip(N) (pgTAP) — zero failing, suite roda exit 0 sem implementação"
    - "MSW handler factory: defaultHiringHandlers como base + per-test override via setupServer(...defaults, ...overrides)"
    - "Postgrest fetch URL hard-coded ao project Lever (ehbxpbeijofxtsbezwxd) para garantir que MSW intercepte e nunca atinja a rede"
    - "Realtime mock via createMockChannel().__emit(eventType, payload) sem WebSocket real"

key-files:
  created:
    - tests/hiring/canTransition.test.ts
    - tests/hiring/stageGroups.test.ts
    - tests/hiring/sla.test.ts
    - tests/hiring/cpf.test.ts
    - tests/lib/supabaseError.test.ts
    - tests/hiring/useMoveApplicationStage.test.tsx
    - tests/hiring/useApplicationsRealtime.test.tsx
    - tests/hiring/useApplicationCountsByJob.test.tsx
    - tests/hiring/useTalentPool.test.tsx
    - tests/hiring/useCandidateConsents.test.tsx
    - tests/hiring/useCardPreferences.test.tsx
    - tests/hiring/CandidatesKanban.integration.test.tsx
    - tests/hiring/CandidateCard.test.tsx
    - tests/hiring/CandidateDrawer.test.tsx
    - tests/hiring/PipelineFilters.test.tsx
    - tests/hiring/BoardTableToggle.test.tsx
    - tests/hiring/PublicApplicationForm.test.tsx
    - tests/msw/hiring-handlers.ts
    - tests/msw/realtime-mock.ts
    - supabase/tests/006-migration-f-stages.sql
    - supabase/tests/007-data-access-log.sql
    - supabase/tests/008-candidate-consents.sql
    - supabase/tests/009-cpf-unique.sql
    - supabase/tests/010-pg-cron-retention.sql
    - .planning/phases/02-r-s-refactor/deferred-items.md
  modified: []

key-decisions:
  - "Skeleton failing-by-default em vez de testes com expectativas reais: zero implementação de produção neste plan, cada plan downstream remove .skip atomicamente quando ativa o feature"
  - "MSW handler URL hard-coded ao project Lever ehbxpbeijofxtsbezwxd em vez de usar VITE_SUPABASE_URL: garante intercept mesmo se .env mudar futuramente; documentado como T-02-01-02 (accepted) no threat model do plan"
  - "Realtime mock usa vi.fn() para todos os métodos do channel (subscribe/on/unsubscribe) para que tests possam assertar contagem de chamadas além de comportamento"

patterns-established:
  - "Failing-by-default test skeleton: describe.skip + it.todo permite que CI roda verde antes da implementação (Wave 0 → Wave N pattern)"
  - "MSW handler set + per-test override: defaultHiringHandlers como base aplicada em todos os testes, server.use() para cenários específicos"
  - "Postgres changes mock por __emit: tests instalam channel via vi.spyOn(supabase, 'channel') e disparam events sintéticos sem WebSocket"
  - "pgTAP test body como comentário SQL: arquivo abre/fecha BEGIN/ROLLBACK + skip, mas test bodies ficam documentados como comments para Plan 02-02/02-03 ativar"

requirements-completed: []  # Wave 0 não fecha REQs por design — cada Wave 1-4 fecha os REQs ao remover .skip e implementar.

# Metrics
duration: 6min
completed: 2026-04-28
---

# Phase 2 Plan 1: Wave 0 Test Scaffolding Summary

**23 arquivos failing-by-default (16 vitest + 1 supabaseError + 2 MSW + 5 pgTAP) habilitando TDD-by-skeleton para os 9 plans da Phase 2**

## Performance

- **Duration:** 6 min
- **Started:** 2026-04-28T01:52:21Z
- **Completed:** 2026-04-28T01:58:21Z
- **Tasks:** 3 (todos auto-completed)
- **Files created:** 24 (23 testes + 1 deferred-items.md)

## Accomplishments

- 17 arquivos de teste Vitest cobrindo todos os hooks/componentes de Phase 2 (144 it.todo) carregam exit 0 sem código de produção
- 5 arquivos pgTAP com `SELECT skip(N)` documentando contract de testes para Migration F (zero failing no test:db)
- 2 módulos MSW (hiring-handlers + realtime-mock) prontos para Wave 1-4 consumirem com convention setupServer(...defaults, ...overrides)
- Convenção verificável "TODO Plan 02-XX: remover .skip" em cada arquivo cria rastreabilidade direta entre plan downstream e suite de testes que ativa

## Task Commits

Each task was committed atomically:

1. **Task 1: Vitest unit + integration test skeletons (16 + 1 files)** - `604ea49` (test)
2. **Task 2: MSW handlers + Realtime mock** - `7f8e6ce` (test)
3. **Task 3: pgTAP test skeletons (5 files)** - `0f7e75f` (test)

## Files Created/Modified

### Vitest skeletons (17 files, 144 it.todo total)

| File | it.todo count | Activated by |
|------|---------------|--------------|
| tests/hiring/canTransition.test.ts | 5 | Plan 02-05 |
| tests/hiring/stageGroups.test.ts | 6 | Plan 02-02 + 02-08 |
| tests/hiring/sla.test.ts | 13 | Plan 02-05 |
| tests/hiring/cpf.test.ts | 7 | Plan 02-02 / 02-07 |
| tests/lib/supabaseError.test.ts | 16 | Plan 02-05 |
| tests/hiring/useMoveApplicationStage.test.tsx | 10 | Plan 02-05 |
| tests/hiring/useApplicationsRealtime.test.tsx | 8 | Plan 02-05 |
| tests/hiring/useApplicationCountsByJob.test.tsx | 6 | Plan 02-04 |
| tests/hiring/useTalentPool.test.tsx | 7 | Plan 02-06 |
| tests/hiring/useCandidateConsents.test.tsx | 9 | Plan 02-06 |
| tests/hiring/useCardPreferences.test.tsx | 7 | Plan 02-08 |
| tests/hiring/CandidatesKanban.integration.test.tsx | 7 | Plan 02-05 / 02-08 |
| tests/hiring/CandidateCard.test.tsx | 9 | Plan 02-08 |
| tests/hiring/CandidateDrawer.test.tsx | 9 | Plan 02-09 |
| tests/hiring/PipelineFilters.test.tsx | 7 | Plan 02-08 |
| tests/hiring/BoardTableToggle.test.tsx | 11 | Plan 02-08 |
| tests/hiring/PublicApplicationForm.test.tsx | 7 | Plan 02-07 |
| **Total** | **144** | |

### MSW + Realtime mock

- `tests/msw/hiring-handlers.ts` — `defaultHiringHandlers` + `mockMoveApplication` (rlsDenial / networkDrop / conflict / transitionCheckViolation / success) + handlers para applications/candidates/consents/RPC/data_access_log
- `tests/msw/realtime-mock.ts` — `createMockChannel` + `createRemoveChannelSpy` + `buildPostgresChangePayload`

### pgTAP skeletons (5 files, 17 tests planned)

| File | plan(N) | Activated by | REQs |
|------|---------|--------------|------|
| supabase/tests/006-migration-f-stages.sql | 3 | Plan 02-02 | RS-05, RS-06 |
| supabase/tests/007-data-access-log.sql | 4 | Plan 02-03 | TAL-05, TAL-06, TAL-07 |
| supabase/tests/008-candidate-consents.sql | 4 | Plan 02-02 | TAL-03, TAL-04, TAL-06, TAL-08 |
| supabase/tests/009-cpf-unique.sql | 4 | Plan 02-02 | TAL-09 |
| supabase/tests/010-pg-cron-retention.sql | 2 | Plan 02-03 | TAL-07 |

### Deferred items

- `.planning/phases/02-r-s-refactor/deferred-items.md` — registra 42 erros TS pré-existentes em src/pages/hiring/ e src/pages/Index.tsx (NÃO introduzidos por este plan; recomendação: tratar em Plan 02-08 ou 02-09 quando esses arquivos forem tocados)

## Verification Results

- `npx tsc --noEmit -p tsconfig.app.json`: 42 errors (todos pré-existentes; zero introduzidos por arquivos novos — confirmado via `grep "tests/(hiring|lib)/" → vazio`)
- `npm test`: exit 0 — Test Files 10 passed | 17 skipped (27); Tests 56 passed | 144 todo (200)
- `npm run test:db`: NÃO executado neste ambiente (`supabase` CLI não disponível). Os 5 arquivos contêm `SELECT skip(N)` que garante exit 0 quando o CLI estiver disponível localmente.
- 17 vitest files conferidos: `ls tests/hiring/*.test.ts* tests/lib/supabaseError.test.ts | wc -l = 17`
- 2 MSW files conferidos
- 5 pgTAP files conferidos com `select skip(` em cada

## Decisions Made

- **Skeleton failing-by-default em vez de testes com expectativas reais**: Wave 0 entrega zero implementação de produção. Cada plan downstream remove `.skip` atomicamente quando ativa o feature, evitando coupling entre Plan 02-01 e implementação dos hooks/components. Permite CI verde imediato sem bloquear nada.
- **MSW handler URL hard-coded ao project ID Lever**: Em vez de usar `VITE_SUPABASE_URL`, hard-codei `https://ehbxpbeijofxtsbezwxd.supabase.co`. Garante que MSW intercepte mesmo se `.env.test` mudar acidentalmente; risco aceito (T-02-01-02) porque project ID é público em URLs do app e nenhuma credencial é exposta.
- **Realtime mock com `vi.fn()` para tudo**: Tests podem assertar `expect(channel.subscribe).toHaveBeenCalledTimes(1)` além de comportamento. Inclui flag `__subscribed` para tests verificarem ciclo de vida.

## Deviations from Plan

### Minor adjustments (não-rastreáveis como deviation, anotados para clareza)

- **Acrescentei `import React from 'react'; void React;` nos arquivos `.tsx`** mesmo sendo apenas describe.skip. Garante futureproof se algum lint rule (e.g. `react/jsx-uses-react` ou strict TS pure-modules) reclamar; o `void React;` evita "unused import" warning.
- **Acrescentei `tests/hiring/cpf.test.ts > describe.skip("normalizeCpf") > it.todo("retorna null para input null/undefined")`** além dos 4 originais especificados, porque PATTERNS.md sugere helper TS coberto.

Total: 0 deviations rastreáveis (Rule 1/2/3/4). Plan executado como escrito.

## Issues Encountered

- **`npm test -- --run` falha com "Expected a single value for option --run"**: O script `package.json` já inclui `--run` no comando (`"test": "vitest --run"`), então passar `-- --run` resulta em duplicação. **Workaround:** rodar `npm test` puro. Documentado para conhecimento dos próximos plans (verify steps em planos futuros devem usar `npm test` direto, não `npm test -- --run`).
- **Supabase CLI ausente no ambiente do executor**: `npm run test:db` não rodou. Os 5 arquivos com `SELECT skip(N)` garantem que o teste passará exit 0 quando o owner rodar localmente; pgTAP harness não falha com `skip`.

## User Setup Required

None - nenhum serviço externo precisa configuração para esta wave.

## Next Phase Readiness

- **Wave 1 (Plans 02-02 + 02-04) está pronto para iniciar**: skeletons existem para todos os hooks/components que Wave 1 vai tocar; basta remover `.skip` e implementar `it()` reais conforme RESEARCH §1-§8.
- **Wave 2 (Plan 02-03 BLOCKING — db push da Migration F)**: pgTAP suite 006/007/008/009/010 ficará green ao remover `select skip(N)` e ativar os test bodies dos comentários.
- **Critério de Nyquist coverage atendido**: cada REQ-ID de Phase 2 (RS-03..10, RS-12, RS-13, TAL-03..09) tem ao menos 1 arquivo de teste declarado com it.todo correspondente.

## Self-Check: PASSED

Verifications run:
- `[ -f tests/hiring/canTransition.test.ts ]` ... 17 vitest files: ALL PRESENT
- `[ -f tests/msw/hiring-handlers.ts ]` ... `[ -f tests/msw/realtime-mock.ts ]`: BOTH PRESENT
- `[ -f supabase/tests/006-migration-f-stages.sql ]` ... 5 pgTAP files: ALL PRESENT
- `git log --oneline | grep 604ea49`: FOUND
- `git log --oneline | grep 7f8e6ce`: FOUND
- `git log --oneline | grep 0f7e75f`: FOUND
- `npm test → exit 0` (200 tests, 144 todo, 56 passed): VERIFIED
- `grep -c "select skip(" supabase/tests/00{6,7,8,9}-*.sql supabase/tests/010-*.sql → 5`: VERIFIED

---

*Phase: 02-r-s-refactor*
*Completed: 2026-04-28*
