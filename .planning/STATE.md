---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: executing
last_updated: "2026-04-28T02:00:27.340Z"
progress:
  total_phases: 4
  completed_phases: 1
  total_plans: 16
  completed_plans: 8
  percent: 50
---

# Lever Talents Hub — STATE

Project memory. Updated automatically at each transition.

---

## Project Reference

**Name:** Lever Talents Hub
**Core value:** Fluxos principais funcionam sem erro, com dados sempre escopados corretamente por empresa (ou grupo de empresas).
**Current milestone:** Refactor + redesenho de fluxos (v1)
**Current focus:** Phase 02 — r-s-refactor
**Project root:** `/Users/eryk/Documents/APP LEVER TALETS/leverup-talent-hub`
**Planning root:** `/Users/eryk/Documents/APP LEVER TALETS/leverup-talent-hub/.planning`

---

## Current Position

Phase: 02 (r-s-refactor) — EXECUTING
Plan: 2 of 9 (Plan 02-01 complete; Wave 0 done)
**Phase:** 2
**Plan:** 02-01 complete (Wave 0 test scaffolding)
**Status:** Executing Phase 02 — Wave 1 ready (Plan 02-02 + 02-04)
**Progress:** [█████░░░░░] 50%

---

## Performance Metrics

| Metric | Value |
|--------|-------|
| Phases planned | 4 |
| Phases completed | 0 |
| Requirements mapped | 82/82 (100%) |
| Requirements completed | 0/82 |
| Plans created | 16 (Phase 1: 7 + Phase 2: 9) |
| Plans completed | 8 (7 Phase 1 + 1 Phase 2) |
| Migrations applied | 4/7 (A, B1, B2, C) |
| Test coverage | Wave 0 scaffolding: 23 files (17 vitest + 5 pgTAP + 2 msw) — implementation pending Waves 1-4 |

---

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

**Last session:** 2026-04-28T01:58:21Z — Completed 02-01-PLAN.md (Wave 0 test scaffolding)
**Next action:** Execute Wave 1 — Plans 02-02 (Migration F utils) + 02-04 (counts hook port). Wave 2 BLOCKING (Plan 02-03 db push) deve rodar sequencial após Wave 1.

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

**Planned Phase:** 02 (R&S Refactor) — 9 plans — 2026-04-28T01:46:26.617Z
