# Project Research Summary

**Project:** Lever Talents Hub
**Domain:** HR/People SaaS — Performance Management + Recrutamento & Seleção, multi-tenant, mercado brasileiro
**Researched:** 2026-04-27
**Confidence:** HIGH (stack + architecture + pitfalls verificados contra fontes oficiais; features com HIGH em competitividade, MEDIUM em estimativas de bandwidth)

---

## Executive Summary

Lever Talents Hub é uma plataforma SaaS multi-tenant que opera no modelo de "operadora de RH": o Grupo Lever usa o app internamente (7 empresas) e presta serviço de R&S a empresas-cliente externas. O app nasceu para performance interna (1:1, avaliações, clima) e o módulo de R&S foi enxertado depois sem refatorar o modelo de tenancy — essa convivência mal resolvida é o problema central que esta rodada de refactor vem atacar. O critério de done é objetivo: fluxos principais sem erro, com dados sempre escopados corretamente por empresa ou grupo de empresas. Sem features novas grandes.

A abordagem recomendada pelos quatro braços de pesquisa converge num único padrão: construir o backbone de tenancy antes de qualquer coisa (RLS helper functions, org_units em árvore, seletor de escopo), depois atacar os dois módulos de negócio (R&S/kanban primeiro, Performance depois), e finalizar com dashboards e polish. O stack é bloqueado (Vite + React 18 + TS 5.8 + Supabase + shadcn/Tailwind) e deve permanecer assim. As adições recomendadas são cirúrgicas: CASL para RBAC client-side, Zustand para o seletor de escopo persistido, Vitest + RTL + MSW + pgTAP para a cobertura de testes que hoje é zero, e Sentry com scrubbing LGPD para observabilidade.

Os três riscos maiores são: (1) vazamento cross-tenant silencioso durante a transição — prevenido com RLS default-deny antes de qualquer backfill; (2) o bug ativo do kanban (mover candidato falha/some), cujas três causas raiz são ausência de optimistic update real, optimistic locking por `updated_at` frágil, e `canTransition()` existente mas não chamado no `onDragEnd`; e (3) exposição LGPD no Banco de Talentos global, que opera cross-empresa sem tabela de consentimento granular nem audit log de leitura.

---

## Key Findings

### Recommended Stack

O stack base está bloqueado e é correto para o domínio. As adições têm escopo estrito: ferramentas que o projeto não consegue prescindir nesta refatoração.

**Adições confirmadas:**

| Biblioteca | Versão | Função |
|------------|--------|--------|
| `@casl/ability` + `@casl/react` | 6.8.0 / 5.x | RBAC client-side. Condições MongoDB-style expressam a N:N de sócios e hierarquia de líderes. |
| `zustand` | 5.0.10 | Store persistido para o seletor global de escopo (empresa/grupo). Persist middleware = "lembra última seleção". |
| `@sentry/react` + `@sentry/vite-plugin` | 10.50.x / 2.x | Observabilidade. `beforeSend` scrubba CPF, email, nome, salário. Session replay off por padrão (LGPD). |
| `vitest` + `@testing-library/react` + `msw` | 3.2.4 / 16.x / 2.10.x | Stack de testes — zero hoje. Vitest reutiliza vite.config.ts. MSW intercepta HTTP Supabase sem mockar SDK. |
| `pgTAP` + `supabase-test-helpers` | — | Único jeito confiável de testar RLS: roda dentro do Postgres, simula JWTs, auto-rollback. |
| `date-fns-tz` | latest | Todo `timestamptz` chega UTC. `formatInTimeZone(date, 'America/Sao_Paulo', ...)` obrigatório. |

**Upgrades necessários:**
- `react-hook-form` → 7.73.x; `@hookform/resolvers` → 5.2.2
- **NAO fazer upgrade Zod 3.25.x → 4** — incompatibilidade TS com resolvers 5.2.2 + Zod 4.3.x (issues #813, #842)
- `@tanstack/react-query` → 5.99.x; adicionar `@tanstack/eslint-plugin-query`

**Housekeeping obrigatório início do refactor:**
- Deletar `bun.lockb`, manter `package-lock.json`, documentar `npm ci` como canonical.

**Padrão RLS crítico (94-99% melhora, Supabase docs oficiais):**
```sql
-- Errado: auth.uid() por linha
USING (company_id = ANY (SELECT company_id FROM memberships WHERE user_id = auth.uid()))
-- Correto: initPlan — avaliado uma vez por statement
USING (company_id = ANY (SELECT company_id FROM memberships WHERE user_id = (SELECT auth.uid())))
```

### Expected Features

**Table stakes — obrigatórias (app inutilizável sem elas):**

| ID | Feature | Status |
|----|---------|--------|
| TS-01 | Stage transitions sem bug no kanban | BUGGY — bug #1 |
| TS-07 | RBAC + RLS robustos (5 roles, gaps fechados) | PARCIAL |
| TS-16 | Seletor global de escopo (empresa OU grupo) | MISSING |
| TS-20 | Org_units em árvore (parent_id, líder vê descendentes) | MISSING |
| TS-19 | Consentimento LGPD + auditoria Banco de Talentos | MISSING |
| TS-09 | Ciclos de avaliação independentes por empresa | MISSING |
| TS-06 | Filtros respeitam escopo em todos os hooks | MISSING |
| TS-04 | Drawer lateral de candidato (não página nova) | MISSING |
| TS-14+TS-15 | Senha temporária + WhatsApp pré-formatado | MISSING |
| TS-21 | Campo transcrição/resumo Plaud no 1:1 | MISSING |
| TS-24 | Remoção de logs sensíveis (email, UUID em console) | BUG ativo |

**Differentiators — pull-in neste refactor:**
- DIF-02: Colunas consolidadas 16 → 6 grupos
- DIF-04: 1:1 privado mas RH lê (com badge "RH visível")
- DIF-05: Anexo Plaud com timeline auditável
- DIF-06: Badge persistente "viewing as Empresa X / Grupo Lever"
- DIF-07+DIF-08: Sparkbar de distribuição + SLA visual no card
- DIF-09: Confidencial badge na vaga
- DIF-12+DIF-13: Filtros inline + Encerradas colapsado
- DIF-16: Dashboard sócio com folha agregada
- DIF-19: Cmd+K palette polido

**Anti-features (deliberadamente fora — não ceder):**

| ID | Anti-feature | Por que não |
|----|-------------|------------|
| AF-01 | ML/AI matching | Fora do escopo; risco ANPD; sem volume |
| AF-02 | Portal público do candidato | Fora do escopo; superfície de ataque |
| AF-03 | Integração folha externa (ERP) | Pântano CLT; fora dessa rodada |
| AF-05 | Visão "holding consolidada" implícita | Escopo sempre explícito — não mágico |
| AF-08 | Onboarding por email | Canal errado para liderado BR |
| AF-11 | AI para escrever feedback | Qualidade do feedback é o ponto; risco LGPD |
| AF-12 | Clima pseudonimizado reversível | "100% anônimo" é decisão registrada |

### Architecture Approach

Princípio organizador único: o escopo sempre viaja com os dados. Três camadas: (1) banco — RLS helper functions `STABLE SECURITY DEFINER` devolvem arrays de IDs autorizados uma vez por statement; (2) frontend — `ScopeProvider` (React Context + URL `?scope=`) injeta escopo em cada TanStack Query key via `useScopedQuery`; (3) migration — expand → backfill → contract em 6 etapas reversíveis.

**Cornerstones:**

1. **RLS Helper Functions** — `visible_companies`, `visible_org_units`, `org_unit_descendants` como `STABLE SECURITY DEFINER SET search_path = public`. Políticas ficam com 2-3 linhas. Sem joins inline (causa N×row evaluation). Precedente: `is_people_manager`, `allowed_companies` já no codebase.

2. **Org_units: adjacency list + recursive CTE** — `parent_id` com índice `(company_id, parent_id)`. Trigger anti-ciclo obrigatório. Não usar ltree (write-heavy org chart, ltree paga custo de escrita para benefício de leitura que não precisamos).

3. **Scope propagation: Context + URL + TanStack key prefix** — `['scope', scope.id, ...key]` em toda query. Trocar escopo invalida via partial key match; cache do escopo anterior persiste (switch de volta instantâneo).

4. **Migrate via expand→backfill→contract:**
   - A: `company_groups` + `companies.group_id` (nullable) + feature flags — app não muda
   - B: `org_units` + `org_unit_members` + `unit_leaders` — tabelas vazias
   - C: `socio_company_memberships` + reescrever RLS com novos helpers
   - D: Frontend: `ScopeProvider` + `useScopedQuery`
   - E: Backfill — "Grupo Lever" + 7 empresas; times → org_units
   - F: `data_access_log` + RPCs de leitura auditada
   - G: Tighten constraints, drop helpers antigos — única fase irreversível

5. **LGPD audit via `data_access_log` append-only** — generalização do `candidate_access_log` existente. Reads de PII passam por RPC `read_X_with_log(id, context)`. Retenção 36 meses via `pg_cron` já em uso.

**Estrutura recomendada:**
```
src/
├── app/providers/          # AuthProvider, ScopeProvider, QueryProvider
├── features/
│   ├── tenancy/            # NOVO — ScopeSwitch, useCurrentScope, useCompanyGroups
│   ├── org-structure/      # NOVO — OrgUnitTree, useOrgUnits
│   ├── hiring/             # existente — migrar para useScopedQuery
│   └── performance/        # existente — migrar para useScopedQuery
├── shared/data/useScopedQuery.ts   # chokepoint — toda query passa por aqui
└── integrations/supabase/          # inalterado
```

### Critical Pitfalls

**1. Vazamento cross-tenant durante retrofit (Fase 1)**
Tabelas de Performance sem `company_id` — `NULL` vira "qualquer empresa". Prevenção: RLS `ENABLE ROW LEVEL SECURITY` + default-deny antes do backfill. Fixture de teste: 2 tenants + tentativa cross-access deve falhar.

**2. Bug do kanban — 3 causas raiz superpostas (Fase 2)**
(a) Sem `onMutate`/`setQueryData`: flash de "voltar". (b) Optimistic locking por `updated_at` frágil: 1ms de desync zera o UPDATE → card some. (c) `canTransition()` existe em `statusMachine.ts:34` mas não é chamado em `onDragEnd:252` — transições ilegais de stages legados rejeitadas servidor-side → card some. Correção: 6-step optimistic pattern + validar transição antes de `mutate` + migration normalizando stages legados.

**3. LGPD — Banco de Talentos sem consentimento granular (Fase 2)**
`added_to_talent_pool = true` não cobre Empresa B. ANPD multa até 2% faturamento. Requer: `candidate_consents` (purpose, legal_basis, expires_at, revoked_at) + `candidate_access_log` + checkbox opt-in não pré-marcado no fluxo de candidatura.

**4. Cache pollution na troca de escopo (Fase 1 + Fase 3)**
Hooks com queryKey sem `scope.id` = flash de dados empresa anterior. Grep `queryKey: [` e auditar; `@tanstack/eslint-plugin-query` pega exhaustive deps.

**5. Scope creep bidirecional (todas as fases)**
(a) Reescrever "para fazer direito" → refactor 4 semanas vira 4 meses. (b) Declarar pronto sem fechar RLS gaps + testes → mesmos bugs em 2 meses. Proteção: PROJECT.md Active é o contrato de escopo; DoD inclui itens invisíveis; PR diff limit 1500 linhas em arquivos não-relacionados.

---

## Implications for Roadmap

Todos os quatro pesquisadores convergiram na mesma sequência de fases. A síntese abaixo é a recomendação para o roadmapper.

### Fase 1 — Foundation: Tenancy Backbone

**Rationale:** Tudo depende disso. Hooks de Performance foram escritos sem `company_id`. RLS tem gaps. Seletor de escopo não existe. Cimentar qualquer outra coisa antes disso cimenta os bugs junto.

**Entrega:** Trocar empresa no header = todo app refiltra sem vazamento, sem flash de dados errados.

**Features:** TS-07, TS-17, TS-20, TS-16, TS-06, TS-24

**Stack:** Zustand, CASL, pgTAP, `@tanstack/eslint-plugin-query`

**Architecture:** Migrations A-E. `ScopeProvider` + `useScopedQuery`. Helper functions.

**Pitfalls:** P1 (vazamento cross-tenant), P3 (RLS recursion), P4 (cache pollution), P6 (org_units sem índice)

**Research flag:** Nenhuma — padrões Supabase bem documentados, precedente no codebase.

### Fase 2 — R&S Refactor

**Rationale:** Bug #1 do projeto está aqui. Banco de Talentos cross-empresa sem LGPD é risco regulatório imediato. UX do kanban é o que o RH usa todo dia.

**Entrega:** Kanban estável + drawer de candidato + Banco de Talentos LGPD-compliant.

**Features:** TS-01, TS-03, DIF-02, TS-04, TS-02+DIF-07, DIF-13, TS-25+TS-19+TS-05, TS-23, TS-18

**Stack:** MSW para testes de mutation, 6-step optimistic update TanStack

**Architecture:** Migration F (`data_access_log`). RPC `move_application_stage`. Realtime por jobId.

**Pitfalls:** P2 (bug do kanban — corrigido aqui), P5 (LGPD banco de talentos), P9 (form controlled/uncontrolled em JobOpeningForm)

**Research flag:** Verificar volume médio de candidatos por vaga antes de implementar kanban — calibra se `react-window` é necessário agora.

### Fase 3 — Performance Refactor

**Rationale:** Módulo funcional mas single-tenant. Com backbone da Fase 1, migração de hooks para `useScopedQuery` é mecânica. Diferenciação BR (Plaud, 1:1 visível ao RH, ciclos por empresa) implementada aqui.

**Entrega:** Performance completamente escopado por empresa, com capabilities diferenciadas.

**Features:** TS-09, TS-08, TS-10, TS-11, DIF-04, TS-21+DIF-05, TS-14+TS-15

**Architecture:** Hooks migrados para `useScopedQuery`. `org_unit_descendants` em RLS para "líder vê descendentes".

**Pitfalls:** P4 (cache pollution — hooks de Performance são os mais vulneráveis), P9 (OneOnOneMeetingForm)

**Research flag:** Nenhuma. Se owner validar PDI (DIF-17) nesta fase, requer modelagem adicional — defer por default.

### Fase 4 — Dashboards + Quality Polish

**Rationale:** Dashboards dependem de dados corretos de todas as fases anteriores. Quality polish é a única garantia de que o refactor não regride.

**Entrega:** 3 dashboards por persona + 5 fluxos críticos em CI + codebase sem débito crítico.

**Features:** TS-12, DIF-16, TS-13, DIF-06, DIF-08+DIF-09, DIF-12+DIF-14+DIF-15, DIF-19

**Stack:** Sentry com LGPD scrubbing. Lockfile unificado. Prettier.

**Architecture:** Migration G (contract) — drop helpers antigos, NOT NULL constraints. Aguardar 1+ semana de Fases 1-3 estáveis.

**Pitfalls:** P8 (scope creep "rebuild too little"), P10 (testing strategy)

**Research flag:** Dashboard de sócio requer entrevista de 30 min com owner sobre KPIs exatos antes de implementar. Risco de retrabalho sem essa validação.

### Phase Ordering Rationale

- Schema before behavior: Migrations A-E adicionam colunas sem mudar comportamento.
- Backend before frontend: Helpers precisam existir antes de `ScopeProvider`.
- Bug fix antes de polish: TS-01 desbloqueia DIF-02/04/07/08 — construir polish sobre código quebrado é desperdício.
- LGPD before expansion: Banco de Talentos já em produção sem conformidade — risco imediato.
- Performance depois de R&S: menos bugs críticos, menos risco regulatório imediato.
- Dashboards por último: dependem de dados corretos de todas as outras fases.
- Quality nunca isolado: testes entram em cada fase. Fase 4 consolida o restante.

### Research Flags

**Fases com padrões bem documentados (sem necessidade de fase de pesquisa):**
- Fase 1: padrões Supabase RLS oficiais + precedente no codebase
- Fase 2: causa raiz do kanban identificada; LGPD pesquisado com fontes ANPD
- Fase 3: migração mecânica de hooks; padrões 1:1/avaliação/clima documentados

**Fases que podem precisar de pesquisa aprofundada:**
- Fase 4: requer validação com owner sobre KPIs do dashboard de sócio antes de implementar
- Fase 2: se volume candidatos/vaga >100, pesquisar `@tanstack/react-virtual` + dnd-kit antes do kanban

---

## Convergent Recommendations

| Recomendação | Pesquisas convergentes |
|-------------|------------------------|
| Tenancy backbone vem primeiro | FEATURES (dep graph), ARCHITECTURE (ordem A-G), PITFALLS (P1) |
| SECURITY DEFINER helpers para RLS (não joins inline) | STACK, ARCHITECTURE (Pattern 1), PITFALLS (P3) |
| Adjacency list + recursive CTE (não ltree) | STACK, ARCHITECTURE (Pattern 2), PITFALLS (P6) |
| Scope em toda queryKey via `useScopedQuery` centralizado | STACK (Zustand pattern), ARCHITECTURE (Pattern 3), PITFALLS (P4) |
| Expand→backfill→contract (nunca big-bang migration) | ARCHITECTURE (Phases A-G), PITFALLS (AP3) |
| `candidate_consents` + `data_access_log` antes de expandir Banco de Talentos | FEATURES (TS-19), ARCHITECTURE (Pattern 4), PITFALLS (P5) |
| Bug do kanban: ausência de optimistic update + stage-transition não validada no client | FEATURES (TS-01), PITFALLS (P2 análise de código) |
| pgTAP é o único jeito confiável de testar RLS | STACK, PITFALLS (P10) |
| Zero novas features grandes | PROJECT.md, FEATURES (AF-01..AF-18), PITFALLS (P7) |

**Conflitos:** Nenhum identificado entre os quatro braços de pesquisa.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Versões verificadas npm 2026-04-27. Incompatibilidade Zod 4 verificada em GitHub issues. RLS patterns em Supabase docs oficiais. |
| Features | HIGH | Categorização baseada em análise competitiva Gupy/Greenhouse/Lattice/Sólides + decisões em PROJECT.md. MEDIUM só em estimativas de semana/Onda e volume candidatos/vaga. |
| Architecture | HIGH | Padrões triangulados contra Supabase docs + benchmarks Cybertec + codebase verificado arquivo a arquivo. |
| Pitfalls | HIGH (itens com cross-reference CONCERNS.md). MEDIUM (novos itens de padrão de indústria sem medição específica Lever). | |

**Overall confidence: HIGH**

### Gaps to Address

- **Volume de candidatos por vaga:** calibra necessidade de virtualization na Fase 2. Consultar RH antes de implementar o kanban refatorado.
- **KPIs exatos do dashboard de sócio:** entrevista 30 min com owner antes da Fase 4. Risco de retrabalho.
- **Templates de avaliação customizáveis por empresa:** impacta modelagem de `evaluation_cycles`. Confirmar antes da Fase 3.
- **SLA contratual R&S externo:** calibra thresholds DIF-08 (laranja >3d, vermelho >7d). Confirmar com owner.
- **Recursive CTE em escala:** sólido para <5k org_units; sem benchmark na carga real Lever. Se empresa-cliente >500 funcionários, closure table materializada.

---

## Sources

### Primary (HIGH confidence)
- Supabase RLS Performance Docs — `(SELECT auth.uid())` initPlan, 94-99% improvement
- Supabase Custom Claims & RBAC — `raw_app_meta_data` vs `raw_user_meta_data` security boundary
- CASL Context7 (`/stalniy/casl`) — condition-based multi-tenant, useAbility hook
- Zustand Context7 (`/pmndrs/zustand`) — persist middleware, selector subscriptions
- Vitest Context7 (`/vitest-dev/vitest`) — Vite integration, test setup
- MSW Context7 (`/mswjs/msw`) — Supabase REST interception pattern
- Sentry React docs — `beforeSend` PII scrubbing, LGPD posture
- TanStack Query v5 docs — partial key invalidation, optimistic 6-step
- Cybertec benchmark — recursive CTE vs ltree em trees rasas/mutation-heavy
- GitHub issues react-hook-form/resolvers #813, #842 — Zod 4 incompatibilidade

### Secondary (MEDIUM confidence)
- Makerkit Supabase RLS Best Practices — production multi-tenant patterns
- TkDodo "Concurrent Optimistic Updates in React Query" — 6-step pattern
- pgTAP Basejump (usebasejump.com) — RLS test helpers
- Gupy/Greenhouse/Lattice/Sólides/Feedz product analysis — feature categorization
- Captain Compliance + Complydog LGPD 2026 — Art. 37, Art. 8§4, ANPD enforcement
- AiSensy/NXC WhatsApp HR 2026 — 98% open rate, onboarding BR

### Tertiary (contexto validado internamente)
- `.planning/codebase/CONCERNS.md` (40+ findings) — cross-reference para pitfalls ativos
- `UX-AUDIT-VAGAS.md` — 12 friction points, sprint plan
- Codebase direto: `useApplications.ts:73-114`, `CandidatesKanban.tsx:237-270`, `statusMachine.ts:9-30`, `stageGroups.ts:38-54` — sustentam hipótese causa raiz bug do kanban

---
*Research completed: 2026-04-27*
*Ready for roadmap: yes*
