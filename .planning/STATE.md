---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: executing
last_updated: "2026-04-29T00:39:58.511Z"
progress:
  total_phases: 4
  completed_phases: 3
  total_plans: 36
  completed_plans: 28
  percent: 78
---

# Lever Talents Hub — STATE

Project memory. Updated automatically at each transition.

---

## Project Reference

**Name:** Lever Talents Hub
**Core value:** Fluxos principais funcionam sem erro, com dados sempre escopados corretamente por empresa (ou grupo de empresas).
**Current milestone:** Refactor + redesenho de fluxos (v1)
**Current focus:** Phase 04 — dashboards-quality-polish
**Project root:** `/Users/eryk/Documents/APP LEVER TALETS/leverup-talent-hub`
**Planning root:** `/Users/eryk/Documents/APP LEVER TALETS/leverup-talent-hub/.planning`

---

## Current Position

Phase: 04 (dashboards-quality-polish) — EXECUTING
Plan: 1 of 8
**Phase:** 3
**Plan:** Not started
**Status:** Executing Phase 04
**Progress:** [██████████] 100%

---

## Performance Metrics

| Metric | Value |
|--------|-------|
| Phases planned | 4 |
| Phases completed | 0 |
| Requirements mapped | 82/82 (100%) |
| Requirements completed | 0/82 |
| Plans created | 16 (Phase 1: 7 + Phase 2: 9) |
| Plans completed | 11 (7 Phase 1 + 4 Phase 2) |
| Migrations applied | 8/8 Phase 2 (A, B1, B2, C, F.1, F.2, F.3, F.4) — Migration F aplicada ao remote em Plan 02-04 |
| Test coverage | Wave 0: 23 files; Wave 1 (02-02): 5 pgTAP suites com 19 tests; Wave 1 (02-03): 6 vitest suites com 376 tests green (canTransition 294 + stageGroups 17 + supabaseError 20 + sla 17 + cpf 14 + useCardPreferences 14); Wave 2 (02-04): types.ts 3128 lines + 12 Phase 2 exports em hiring-types.ts |
| Phase 02 P02 duration | 7 min, 4 tasks, 9 files |
| Phase 02 P03 duration | 8 min, 3 tasks, 11 files |
| Phase 02 P04 duration | 9.4 min, 3 tasks, 3 files |

---
| Phase 02 P04 | 9.4min | 3 tasks | 3 files |

## Accumulated Context

### Locked Decisions

(see PROJECT.md `## Key Decisions` for full table)

- Empresa única + features ativas (sem flag is_internal/external)
- Modelo genérico de `company_groups` com "Grupo Lever" como primeira instância
- Seletor global de escopo (empresa OR grupo) no header propaga em TODO o app
- Admin e RH têm acesso total (equivalentes em escopo)
- Org_units em árvore (parent_id) com líderes em qualquer nível
- Onboarding via senha temporária + mensagem pré-gerada pra WhatsApp
- 1:1 abertos pro RH + campo de anexo da transcrição/resumo Plaud
- Banco de Talentos global cruzando empresas com tags + auditoria LGPD
- Refactor sem features novas grandes
- Folha calculada da soma de salários cadastrados
- Pesquisa de clima 100% anônima
- **(Plan 02-01)** Test skeletons usam pattern `describe.skip + it.todo` (vitest) e `SELECT skip(N)` (pgTAP) para serem failing-by-default — CI verde sem implementação
- **(Plan 02-01)** MSW handler URL hard-coded ao project Lever (`ehbxpbeijofxtsbezwxd`) garante intercept mesmo se .env mudar; T-02-01-02 accepted no threat model
- **(Plan 02-01)** Realtime mock via `createMockChannel().__emit(eventType, payload)` substitui WebSocket real para testar `useApplicationsRealtime`
- **(Plan 02-02)** F.1 mapeia legacy stages (`aguardando_fit_cultural`, `sem_retorno`, `fit_recebido`) para `'em_interesse'` (defaultStage da Triagem em STAGE_GROUPS.ts) — enum `application_stage_enum` NAO tem `'fit_cultural'`/`'triagem'` como valores; `metadata.legacy_marker` preservado para auditoria forense
- **(Plan 02-02)** F.3 candidate_consents requer `CREATE EXTENSION btree_gist` — sem ela `EXCLUDE USING gist (candidate_id WITH =, purpose WITH =)` falha no apply (uuid/enum nao tem default operator class para gist)
- **(Plan 02-02)** F.2 `data_access_log` e RLS-enabled mas SEM policy INSERT — escrita apenas via RPC SECURITY DEFINER (`read_candidate_with_log`); audit log inviolavel mesmo para roles authenticated
- **(Plan 02-02)** RPC `read_candidate_with_log` e VOLATILE (nao STABLE) — funcao faz INSERT em data_access_log, declarar STABLE seria mentira e causaria otimizacoes erradas (Postgres deduplicaria chamadas)
- **(Plan 02-03)** `supabaseError.ts` exporta `MoveApplicationError` discriminated union + 4 detect helpers (RLS 42501 / network TypeError|AbortError|code='' / conflict 23514+/transition/i / synthetic transition kind) + `getMoveErrorToastConfig` com cópia UI-locked (D-05). Plan 02-05 consome para `useMoveApplicationStage`
- **(Plan 02-03)** SLA thresholds D-10 LOCK em `sla.ts`: 0-1d=ok, 2-4d=warning(amber), >=5d=critical(red). Pure function `daysSince` clamp em 0 para datas futuras/inválidas; `SLA_THRESHOLDS = { warning: 2, critical: 5 }` exportado para tests
- **(Plan 02-03)** `cardCustomization.ts` Zod schema versionado (`version: z.literal(1)`); load via `safeParse` retorna DEFAULT em qualquer falha (corrupted JSON, schema antigo, userId ausente). Namespace `leverup:rs:card-fields:{userId}` mitiga T-02-03-01 (localStorage tampering); save tem silent-fail para storage cheio/disabled
- **(Plan 02-03)** `STAGE_GROUP_BAR_COLORS` atualizado para D-11 (intencionalidade do funil, não ordem visual): triagem+checagem=`bg-status-blue/70`, entrevista_rh+entrevista_final=`bg-status-amber/80`, decisao=`bg-status-green`, descartados=`bg-status-red/60`. Regression guard via `tests/hiring/stageGroups.test.ts` (T-02-03-03 mitigado)
- **(Plan 02-04)** Migration F (F.1-F.4) aplicada ao remote `ehbxpbeijofxtsbezwxd` via `supabase db push --linked --include-all`. Sanity checks: 2 novas tabelas (data_access_log + candidate_consents), cron job `data_access_log_retention_cleanup` com schedule `30 3 * * 1`, RPC `read_candidate_with_log` + view `active_candidate_consents` + partial unique idx `idx_candidates_cpf_unique` + função `normalize_cpf` operando corretamente. Phase 1 FK index migration (`20260423100000`) trackeada como prereq do --include-all
- **(Plan 02-04)** Removido `declare module "./types"` block obsoleto em `src/integrations/supabase/hiring-types.ts`: pre-Plan-02-04 mergia hand-written shapes na auto-gen Database via interface, mas o auto-gen exporta `type Database = { ... }` (alias) que NÃO pode ser mergido com `interface Database` via declare module — TypeScript reporta `Duplicate identifier 'Database'`. Hand-written aliases (JobOpeningRow, ApplicationRow, CandidateRow, etc.) ficam standalone; 12 novos exports Phase 2 (Consent, ConsentInsert, ConsentUpdate, ActiveConsent, ConsentPurpose, ConsentLegalBasis, DataAccessLogEntry, DataAccessLogInsert, ReadCandidateWithLog{Args,Return}, MoveApplicationStageArgs, ApplicationWithCandidate) são thin aliases sobre `Database["public"][...]`
- **(Plan 02-04)** Auto-gen `types.ts` é canonical post-Plan-02-04: qualquer mudança de schema → `npx supabase gen types typescript --linked 2>/dev/null > src/integrations/supabase/types.ts` + commit. Stderr redirect (`2>/dev/null`) é mandatory: o CLI imprime "Initialising login role..." em stderr, sem o redirect isso vaza para stdout e fica como linha 1 do arquivo gerado, quebrando TS compile
- **(Plan 02-04)** 38 latent tsc errors revelados pelo regen (em hooks/components/pages fora de `src/integrations/`, `src/lib/`, `src/app/`) são out-of-scope per plan; documentados em `deferred-items.md` com owners (Plans 02-05 a 02-09). Estavam latentes antes (mascarados pelo declaration merging)

### Active TODOs

- [ ] Agendar entrevista 30 min com owner sobre KPIs do dashboard de sócio (Phase 4 research flag)
- [ ] Calibrar volume médio de candidatos por vaga com RH (Phase 2 research flag)
- [ ] Confirmar com owner se template de avaliação global default é suficiente (Phase 3 research flag)
- [ ] Decidir SLA thresholds contratual R&S externo (DIF-08) — laranja >3d, vermelho >7d sugeridos pela pesquisa

### Open Blockers

Nenhum no momento.

### Risks Surfaced (from research)

- **P1:** Vazamento cross-tenant durante retrofit — mitigado por RLS default-deny antes do backfill (Phase 1)
- **P2:** Bug do kanban com 3 causas raiz superpostas — atacado em Phase 2 (optimistic + canTransition + normalize stages legados)
- **P3:** RLS recursion infinita ao adicionar tabelas relacionais — mitigado com SECURITY DEFINER helpers (Phase 1)
- **P4:** Cache pollution na troca de escopo — mitigado com scope na queryKey + ESLint guard (Phase 1)
- **P5:** LGPD Banco de Talentos sem consentimento granular — mitigado com `candidate_consents` + `data_access_log` (Phase 2)
- **P7/P8:** Scope creep bidirecional — mitigado com PR diff limit 1500 linhas + DoD inclui itens invisíveis (todas fases)

---

## Session Continuity

**Last session:** --stopped-at
**Next action:** Phase 4 — Dashboards + Quality Polish. Requer entrevista 30 min com owner sobre KPIs do dashboard de sócio (research flag BLOQUEANTE antes de planejar). Run `/gsd-discuss-phase 4` or `/gsd-plan-phase 4`.

---

## File Index

**PROJECT.md** — Locked decisions, core value, constraints, out of scope (153 lines)
**REQUIREMENTS.md** — 82 v1 REQ-IDs, 7 v2 deferred, 14 anti-features
**ROADMAP.md** — 4 phases (Tenancy Backbone, R&S Refactor, Performance Refactor, Dashboards+Polish)
**STATE.md** — this file
**research/SUMMARY.md** — Synthesis of 4 research streams
**research/STACK.md** — Stack additions (CASL, Zustand, Sentry, Vitest, MSW, pgTAP)
**research/FEATURES.md** — Table-stakes / differentiators / anti-features
**research/ARCHITECTURE.md** — Migrations A-G, RLS helpers, scope propagation patterns
**research/PITFALLS.md** — 10 critical pitfalls with phase mapping
**codebase/CONCERNS.md** — 40+ existing findings (tech debt, bugs, security, perf)
**codebase/ARCHITECTURE.md** + **STRUCTURE.md** + **CONVENTIONS.md** + **INTEGRATIONS.md** + **TESTING.md** — codebase map (1.918 linhas)

---

*Initialized: 2026-04-27*

**Planned Phase:** 04 (Dashboards + Quality Polish) — 8 plans — 2026-04-29T00:32:03.538Z
