# Lever Talents Hub — Roadmap

**Milestone:** Refactor + redesenho de fluxos (v1)
**Granularity:** standard
**Last updated:** 2026-04-27

Roadmap brownfield. Quatro fases derivadas de 82 v1 requirements (10 TEN + 10 RBAC + 9 ORG + 5 AUTH + 12 RS + 9 TAL + 7 PERF + 6 ONE + 4 DASH + 10 QUAL). Convergência das quatro pesquisas (FEATURES, ARCHITECTURE, PITFALLS, CONCERNS) recomendou esta sequência: Tenancy Backbone → R&S Refactor → Performance Refactor → Dashboards + Quality Polish. Migrações seguem padrão expand → backfill → contract (fases A-G distribuídas pelo roadmap).

Critério de done global (vide PROJECT.md): *fluxos principais sem erro + dados batendo por escopo de empresa (ou grupo)*.

---

## Phases

- [x] **Phase 1: Tenancy Backbone** — Modelar empresa única + grupos + RBAC + org_units + scope selector. Migrações A-D. *(completed 2026-04-27)*
- [ ] **Phase 2: R&S Refactor** — Estabilizar kanban (bug #1), drawer, Banco de Talentos LGPD-compliant, UX-AUDIT wins. Migração F.
- [x] **Phase 3: Performance Refactor** — Migrar hooks de Performance para useScopedQuery + ciclos por empresa + 1:1 com Plaud + onboarding WhatsApp. Backfill E. *(completed 2026-04-28)*
- [ ] **Phase 4: Dashboards + Quality Polish** — Dashboard de sócio + Sentry + Migração G (contract) + cobertura de testes nos fluxos críticos.

---

## Phase Details

### Phase 1: Tenancy Backbone

**Goal**: Trocar empresa/grupo no header refiltra todo o app sem vazamento, sem flash, sem dado da empresa anterior.

**Depends on**: Nothing (first phase — backbone que tudo depende).

**Migration coverage**: A (company_groups + feature flags) + B (org_units + helpers) + C (socio_company_memberships + visible_companies/visible_org_units) + D (ScopeProvider + useScopedQuery + ESLint guard).

**Requirements**:
TEN-01, TEN-02, TEN-03, TEN-04, TEN-05, TEN-06, TEN-07, TEN-08, TEN-09, TEN-10,
RBAC-01, RBAC-02, RBAC-03, RBAC-04, RBAC-05, RBAC-06, RBAC-07, RBAC-08, RBAC-09, RBAC-10,
ORG-01, ORG-02, ORG-03, ORG-04, ORG-05, ORG-06, ORG-07, ORG-08, ORG-09,
AUTH-04, AUTH-05,
QUAL-05, QUAL-07, QUAL-08, QUAL-10

**Success Criteria** (what must be TRUE):
  1. Usuário troca empresa no seletor do header e todas as telas (vagas, candidatos, performance, dashboards) refiltram para aquela empresa, sem flash de dados da empresa anterior, sem queryKeys órfãos sobrevivendo na cache.
  2. Usuário troca para "Grupo Lever" e vê dados das 7 empresas-membro unidos (não tela diferente — mesmas telas, escopo expandido). Sócio só vê empresas onde tem membership; líder só vê org_units onde lidera (recursivamente, descendentes inclusos).
  3. URL reflete escopo selecionado (`?scope=company:UUID` ou `?scope=group:UUID`); reabrir aba ou compartilhar link cai no mesmo escopo. Persistência via Zustand persist; última seleção lembrada entre sessões.
  4. Teste pgTAP de cross-tenant leakage falha quando RH da Empresa A tenta ler dados da Empresa B (RLS é a fronteira de segurança, não o frontend). Helpers `visible_companies`, `visible_org_units`, `org_unit_descendants` rodam como `STABLE SECURITY DEFINER SET search_path = public` com pattern `(SELECT auth.uid())` em todas as policies.
  5. UI esconde botões/ações que CASL bloqueia (defesa-em-profundidade); ESLint regra customizada bloqueia `supabase.from()` fora de `hooks/` e `integrations/`; lockfile único (`package-lock.json`); `console.log` não emite PII em produção.

**Plans**: 7 plans across 3 waves
- [x] 01-01-PLAN.md — Test infrastructure bootstrap (Vitest + RTL + MSW + pgTAP) + drop bun.lockb (Wave 0)
- [x] 01-02-PLAN.md — Migration A: company_groups + feature flags + supabase config_id fix (Wave 1)
- [x] 01-03-PLAN.md — Migration B: org_units tree + helpers + anti-cycle trigger + 'liderado' enum (Wave 1)
- [x] 01-04-PLAN.md — Migration C: socio_company_memberships + visible_companies + RLS rewrite + backfill + RPC + DB push (Wave 1)
- [x] 01-05-PLAN.md — Frontend chokepoint: ScopeProvider + Zustand + URL sync + useScopedQuery + CASL abilities (Wave 2)
- [x] 01-06-PLAN.md — Scope selector UI: trigger + dropdown + empty state + dirty-form dialog + Header mount (Wave 2)
- [x] 01-07-PLAN.md — Quality gates: ESLint custom rule + plugin-query + logger.ts + formatBR.ts + ORG-08 structure UI (Wave 2)
**UI hint**: yes

**Research flag**: Nenhuma — padrões Supabase RLS bem documentados, precedente no codebase (`is_people_manager`, `allowed_companies`).

---

### Phase 2: R&S Refactor

**Goal**: Kanban de candidatos estável (corrige bug #1) + drawer aninhado + Banco de Talentos LGPD-compliant + UX-AUDIT wins.

**Depends on**: Phase 1 (precisa de scope, RLS helpers e useScopedQuery prontos antes de tocar hooks de hiring).

**Migration coverage**: F (data_access_log generalizado + RPC `read_candidate_with_log`) + migration de normalização de stages legados.

**Requirements**:
RS-01, RS-02, RS-03, RS-04, RS-05, RS-06, RS-07, RS-08, RS-09, RS-10, RS-11, RS-12,
TAL-01, TAL-02, TAL-03, TAL-04, TAL-05, TAL-06, TAL-07, TAL-08, TAL-09

**Success Criteria** (what must be TRUE):
  1. RH arrasta candidato entre stages no kanban; card move otimisticamente (onMutate + setQueryData + cancelQueries antes), reconcilia em onSettled, e volta para origem com toast diferenciado em erro (conflict vs network vs RLS denial). Bug #1 do projeto fica fechado: card não some, não pisca, não duplica em duas colunas.
  2. Mover candidato valida transição via `canTransition()` ANTES de chamar `mutate` (corrige a chamada faltante em `CandidatesKanban.tsx:252`). Migration normaliza stages legados (`aguardando_fit_cultural`, `sem_retorno`, `fit_recebido`) para os 6 grupos consolidados do template atual; nenhum candidato fica órfão de transição válida.
  3. Detalhe do candidato abre em drawer lateral aninhado dentro do kanban (não navega para página dedicada — preserva contexto). Card mostra sparkbar de distribuição + indicador SLA (verde/amarelo/vermelho); filtros são inline acima do board; vagas encerradas ficam colapsadas; vaga `confidencial = true` é invisível para roles fora da curadoria.
  4. Candidato aplicar a vaga exige opt-in **não pré-marcado** com finalidade explícita; `candidate_consents` registra purpose + legal_basis + expires_at + revoked_at por finalidade granular. Banco de Talentos só lista candidatos com consent ativo, não revogado, não expirado. Revogação (RH ou candidato) preserva histórico de auditoria mas remove visibilidade futura.
  5. Toda leitura de PII de candidato passa por RPC `read_candidate_with_log(id, context)` — `data_access_log` registra actor + entity + action + context + scope_company_id em append-only. Retenção 36 meses via `pg_cron`. CPF é chave canonical de dedup (complementar ao email). Realtime subscribe por jobId atualiza kanban quando outro RH move candidato.

**Plans**: 9 plans across 5 waves
- [x] 02-01-PLAN.md — Wave 0 test scaffolding (16 Vitest + 5 pgTAP + MSW handlers) *(completed 2026-04-28)*
- [x] 02-02-PLAN.md — Migration F (4 sub-migrations: stages + data_access_log + consents + CPF) *(completed 2026-04-28)*
- [x] 02-03-PLAN.md — Wave 1 utilities (supabaseError detectors + sla.ts + cpf.ts + cardCustomization.ts + STAGE_GROUP_BAR_COLORS D-11) *(completed 2026-04-28)*
- [x] 02-04-PLAN.md — [BLOCKING] Schema push + types regen
- [x] 02-05-PLAN.md — Hiring core hooks (useApplications rewrite + useApplicationsRealtime + useApplicationCountsByJob)
- [x] 02-06-PLAN.md — LGPD hooks + Edge Function (consents + talent pool filter + apply-to-job)
- [x] 02-07-PLAN.md — Kanban surface (CandidatesKanban + Card + SLA + sparkbar + JobCard + LegacyStageWarning)
- [x] 02-08-PLAN.md — Filters + Toggle + Table + CPF dedup
- [x] 02-09-PLAN.md — Drawer split + LGPD UI + Pages
**UI hint**: yes

**Research flag**: Calibrar volume médio de candidatos por vaga com RH antes de implementar kanban refatorado — define se `@tanstack/react-virtual` é necessário agora ou pode esperar v2 (V2-06). Defer por default; só pull-in se volume médio >100/vaga.

---

### Phase 3: Performance Refactor

**Goal**: Performance (avaliações + clima + 1:1) escopado por empresa, com ciclos independentes, 1:1 visível ao RH, anexo Plaud, e onboarding via WhatsApp.

**Depends on**: Phase 1 (useScopedQuery + RLS helpers) + Phase 2 (RPC pattern + audit log já em produção).

**Migration coverage**: Backfill E (Grupo Lever + 7 empresas atribuídas; teams legados convertidos para org_units; `user_roles` socios convertidos para `socio_company_memberships`).

**Requirements**:
AUTH-01, AUTH-02, AUTH-03,
PERF-01, PERF-02, PERF-03, PERF-04, PERF-05, PERF-06, PERF-07,
ONE-01, ONE-02, ONE-03, ONE-04, ONE-05, ONE-06

**Success Criteria** (what must be TRUE):
  1. RH abre ciclo de avaliação por empresa (sem janela global); cada ciclo define template (questões, escala, peso); avaliação líder→liderado e liderado→líder são entidades separadas no mesmo ciclo. Líder vê resultado das pessoas dos seus org_units descendentes; liderado vê só a própria avaliação recebida; RH vê tudo da empresa que opera. Forms usam react-hook-form + zod resolver, sem `as any` casts; submissão otimista com rollback.
  2. RH dispara pesquisa de clima por empresa, escolhe scope (empresa toda ou subset de org_units) e janela. Tabela de respostas NÃO armazena `respondent_id`; agregação por org_unit aplica k-anonymity (≥3 respostas) antes de retornar. UI explicita "100% anônima" no início do questionário; nenhum elemento de identificação na tela.
  3. Par (líder, liderado) tem feed contínuo de 1:1 com agendamento + pauta colaborativa pré-meeting + notas durante + action items pós (checklist com responsável e prazo). Conteúdo é privado entre o par — outros líderes/liderados não veem. **RH lê tudo** da empresa que opera; UI exibe badge "RH visível" persistente no formulário. Histórico do par é navegável (linha do tempo) com busca em conteúdo.
  4. 1:1 tem campos dedicados para anexar transcrição Plaud (textarea longa, paste do dispositivo) e resumo (texto editável). Hooks de Performance todos migrados para `useScopedQuery` — toda queryKey inclui `scope.id`; trocar empresa não vaza dados de Performance entre escopos. Componentes monolíticos tocados nesta fase (`OneOnOneMeetingForm.tsx` 909 linhas) são quebrados quando refatorados.
  5. RH/Admin cria pessoa via formulário (nome, email, role, empresa, org_unit); sistema gera senha temporária com expiry 24h. App exibe **mensagem pré-formatada de WhatsApp** com link de primeiro acesso e credencial — RH copia e envia (não há email automático). Pessoa é forçada a trocar senha no primeiro login antes de acessar qualquer outra tela.

**Plans**: 11 plans across 5 waves
- [ ] 03-01-PLAN.md — Wave 0 test scaffolding (Vitest stubs + pgTAP stubs + MSW handlers + fixtures) (Wave 0)
- [ ] 03-02-PLAN.md — Backfill E (e1 Grupo Lever + 7 empresas / e2 teams→org_units / e3 socios→memberships) (Wave 1)
- [ ] 03-03-PLAN.md — company_id pre-migrations (expand→backfill→constrain em evaluations/one_on_ones/climate_surveys) (Wave 1)
- [ ] 03-04-PLAN.md — Schema novo Performance (perf1/perf2/clim1/clim2/one1/auth1/cron1 — RLS + RPCs + trigger snapshot freeze) (Wave 2)
- [ ] 03-05-PLAN.md — [BLOCKING] supabase db push 13 migrations + types regen + pgTAP upgrade (Wave 2)
- [ ] 03-06-PLAN.md — Utilities (passwordGenerator + evaluationTemplate + climateAggregation + scopeKey) + Edge Function create-user-with-temp-password (Wave 3)
- [ ] 03-07-PLAN.md — 21 hooks migrados/criados (15 rewrites + 6 new para useScopedQuery + auth flow) (Wave 3)
- [ ] 03-08-PLAN.md — OneOnOneMeetingForm split D-18 (4 sub-componentes + 4 custom hooks + Plaud + RH note) (Wave 4)
- [ ] 03-09-PLAN.md — EvaluationForm dynamic Zod + Cycles list + CreateCycleDialog + Evaluations page refactor (Wave 4)
- [ ] 03-10-PLAN.md — ClimateAggregateCard k-anon UI + Climate page refactor (Wave 4)
- [ ] 03-11-PLAN.md — CreateUser + WhatsApp OnboardingMessageBlock + FirstLoginChangePassword + ProtectedRoute extension (Wave 4)
**UI hint**: yes

**Research flag**: Templates de avaliação customizáveis por empresa (V2-05) — RESOLVED in CONTEXT D-05/D-06: template per company com snapshot freezed em cycles. Pulled into v1 (was V2 deferred). REQUIREMENTS.md may need V2-05 → PERF-08 re-tag.

---

### Phase 4: Dashboards + Quality Polish

**Goal**: Dashboard de sócio (KPIs financeiros) + Cmd+K palette + Sentry com PII scrubbing + cobertura de testes nos fluxos críticos + Migração G (contract) — fechamento do refactor.

**Depends on**: Phases 1-3 (dados precisam estar corretos em todas as fases anteriores; contract phase exige 1+ semana de estabilidade após Phase 3).

**Migration coverage**: G (contract — única fase irreversível: drop helpers antigos `allowed_companies`, NOT NULL constraints onde ausentes, drop `teams` legacy se zero leitores).

**Requirements**:
DASH-01, DASH-02, DASH-03, DASH-04,
QUAL-01, QUAL-02, QUAL-03, QUAL-04, QUAL-06, QUAL-09

**Success Criteria** (what must be TRUE):
  1. Sócio loga, seleciona empresa atribuída ao seu membership, e vê dashboard com KPIs financeiros: folha total (soma server-side de salários cadastrados de colaboradores ativos via RPC, sem detalhe individual no payload), custo médio por colaborador, headcount ativo. Sócio sem membership na empresa não consegue chamar a RPC (RLS bloqueia). Quando escopo é "Grupo Lever", mesmos KPIs com agregação cross-empresa — não tela diferente.
  2. Cmd+K palette navega para qualquer empresa, vaga, candidato, ou pessoa do escopo atual em <100ms; resultados respeitam scope selecionado e role do usuário (não vaza nomes de candidatos de empresas que o usuário não pode ver).
  3. Sentry integrado com `beforeSend` scrubbando PII (email, CPF, nome, salário); session replay default-off, com `maskAllText` quando ligado. Logs de aplicação (server e client) limpos de PII em produção (grep `console.log` não retorna match com email/UUID/CPF).
  4. Vitest + RTL + MSW configurados; pgTAP + supabase-test-helpers configurados; `npm test` roda no CI. Cobertura nos 5 fluxos críticos: login + troca de senha; switch de escopo (sem flash); mover candidato no kanban (com cenários conflict/network/permission); salvar avaliação (idempotente); RLS cross-empresa fail-test. Componentes >800 linhas tocados em fases anteriores foram quebrados (CandidateProfile 1169 → componentes menores; JobOpeningForm 854; OneOnOneMeetingForm 909).
  5. Migração G aplicada após 1+ semana de Phases 1-3 estáveis em produção: helpers antigos (`allowed_companies`) dropados; `company_id NOT NULL` onde ausente; tabela `teams` removida se zero leitores; `data_access_log` com retenção pg_cron rodando; documentação `.planning/codebase/` atualizada para refletir o novo modelo.

**Plans**: 8 plans across 5 waves
- [ ] 04-01-sentry-foundation-PLAN.md — Sentry init + scope tags + session replay toggle (Wave 1)
- [ ] 04-02-payroll-rpc-and-search-extension-PLAN.md — RPC read_payroll_total + global_search scope param + usePayrollTotal hook + useCostBreakdown.companies (Wave 1)
- [ ] 04-03-schema-push-additive-PLAN.md — [BLOCKING] supabase db push for additive RPC migrations + types regen (Wave 2)
- [ ] 04-04-socio-dashboard-refactor-PLAN.md — SocioDashboard refactor (financial-only, conditional breakdown company→dept / group→empresas) (Wave 3)
- [ ] 04-05-cmd-k-palette-refactor-PLAN.md — CmdKPalette refactor (useScopedQuery + D-07 actions + UI-SPEC visuals) (Wave 3)
- [ ] 04-06-component-splits-PLAN.md — Split CandidateProfile (1169→shell+5) + JobOpeningForm (854→shell+3) (Wave 4)
- [ ] 04-07-critical-flow-tests-PLAN.md — pgTAP 011 RLS payroll + 4 vitest critical-flow tests + sanity coverage gate (Wave 4)
- [ ] 04-08-migration-g-contract-PLAN.md — [BLOCKING, IRREVERSIBLE] Migration G (drop allowed_companies, NOT NULL, defer teams drop) + go/no-go checkpoint (Wave 5)
**UI hint**: yes

**Research flag**: **Dashboard de sócio (DASH-01) requer entrevista de 30 min com owner** sobre KPIs exatos antes de implementar — risco de retrabalho sem essa validação. Calibrar também SLA contratual R&S externo (DIF-08 thresholds: laranja >3d, vermelho >7d) e KPIs específicos (folha total + custo médio + headcount são starters; podem precisar de gráfico de tendência, drill-down por org_unit, comparativo período-a-período). Não iniciar Phase 4 sem essa entrevista agendada.

---

## Progress Table

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Tenancy Backbone | 7/7 | Complete (human-UAT pending) | 2026-04-27 |
| 2. R&S Refactor | 4/9 | Executing (Wave 0 + Wave 1 + Wave 2 schema push done) | - |
| 3. Performance Refactor | 0/? | Not started | - |
| 4. Dashboards + Quality Polish | 0/8 | Planned | - |

---

## Coverage Verification

Total v1 requirements: 82
Mapped: 82/82 (100%)

**Phase 1 (36 IDs):** TEN-01..10, RBAC-01..10, ORG-01..09, AUTH-04, AUTH-05, QUAL-05, QUAL-07, QUAL-08, QUAL-10
**Phase 2 (21 IDs):** RS-01..12, TAL-01..09
**Phase 3 (16 IDs):** AUTH-01, AUTH-02, AUTH-03, PERF-01..07, ONE-01..06
**Phase 4 (10 IDs):** DASH-01..04, QUAL-01, QUAL-02, QUAL-03, QUAL-04, QUAL-06, QUAL-09

No orphaned requirements. No duplicates.

---

*Roadmap created: 2026-04-27 by gsd-roadmapper*
