# Phase 4: Dashboards + Quality Polish - Context

**Gathered:** 2026-04-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Esta fase entrega o **fechamento do refactor**: Dashboard de sócio escopado por empresa (KPIs financeiros limpos), Cmd+K com navegação + ações rápidas respeitando escopo atual, Sentry com PII scrubbing, cobertura de testes nos 5 fluxos críticos, e Migration G (contract — única fase irreversível do roadmap). Cobre 10 requisitos: DASH-01..04 + QUAL-01..04, QUAL-06, QUAL-09.

**Em escopo:**
- **Dashboard de sócio** (DASH-01..03): 3 KPIs financeiros (folha total + custo médio + headcount) + breakdown por departamento/empresa. Refactor da `SocioDashboard.tsx` para remover seções de clima e org indicators — foco exclusivo em financeiros. Quando escopo = Grupo Lever, os mesmos KPIs aparecem com agregação cross-empresa e breakdown por empresa (não por departamento).
- **Cmd+K palette** (DASH-04): CmdKPalette.tsx (309 linhas) conectado ao `useScopedQuery` + escopo atual. Modo de busca: vagas, candidatos, pessoas do escopo. Ações rápidas: "Criar nova vaga" + "Convidar/criar pessoa" + atalhos de navegação para páginas. Default state (sem digitação): atalhos de página + ações rápidas. Resultados NUNCA vazam dados de empresas fora do escopo/role do usuário.
- **Sentry** (QUAL-06): `@sentry/react` com `beforeSend` scrubbando PII (email, CPF, nome, salário). Session replay default-off, `maskAllText` quando ligado.
- **Cobertura de testes** (QUAL-01..03): Vitest + RTL + MSW + pgTAP. `npm test` roda no CI. Cobrir os 5 fluxos críticos: login + troca de senha; switch de escopo (sem flash); mover candidato no kanban (conflict/network/permission); salvar avaliação (idempotente); RLS cross-empresa fail-test.
- **Migration G** (QUAL-09): Contract phase — depois de 1+ semana de Phases 1-3 estáveis em produção. Drop `allowed_companies` helper antigo; `company_id NOT NULL` onde ausente; drop tabela `teams` se zero leitores; `data_access_log` pg_cron rodando; documentação `.planning/codebase/` atualizada.
- **Quebra de componentes monolíticos** (QUAL-04): Componentes >800 linhas tocados em fases anteriores devem ser quebrados. CandidateProfile (1169 linhas), JobOpeningForm (854 linhas), OneOnOneMeetingForm (909 linhas já coberto em Phase 3).

**Fora desta fase:**
- Templates de avaliação com UI completa de CRUD (parcialmente diferido de Phase 3 — planner confirma status)
- Histórico comparativo de folha entre períodos (ex: jan vs fev vs mar) — sem armazenamento histórico nesta fase
- Trocar escopo via Cmd+K — scope selector no header já cobre isso
- Histórico de recentes no Cmd+K — sem localStorage de itens visitados nesta fase
- AI generativa / features novas grandes
- Integração com sistemas externos de folha

</domain>

<decisions>
## Implementation Decisions

### Dashboard de sócio: KPIs e layout (DASH-01, DASH-02)

- **D-01:** **3 KPIs base + breakdown por departamento (top 6).** Tela exibe: folha total da empresa + custo médio por colaborador + headcount ativo. Abaixo: tabela com os top 6 departamentos/times por custo (com nome, headcount, custo total, custo médio). Igual ao padrão hoje, mas corretamente escopado por empresa via `useScopedQuery`.
- **D-02:** **Folha calculada via RPC server-side.** RPC agrega `SUM(salary)` dos colaboradores ativos da empresa; payload retorna só o total — nunca retorna lista de salários individuais. Sócio sem membership na empresa: RLS bloqueia o call (sucesso criterion DASH-01). Planner escolhe RPC existente ou cria nova.
- **D-03:** **Foco exclusivo em KPIs financeiros.** `SocioDashboard.tsx` atual mistura indicadores de clima e org — essas seções são removidas na refatoração. Seção de clima fica em `/clima`; seção de R&S fica em `/vagas`. Dashboard de sócio exibe SOMENTE financeiros (PROJECT.md lock: "Performance e R&S ficam em telas dedicadas").
- **D-04:** **CSV download mantido.** O botão de export CSV do breakdown de times/departamentos já existe hoje — preservar (Claude's Discretion — é útil e já está pronto).

### Dashboard de sócio: visão do Grupo Lever (DASH-03)

- **D-05:** **Mesma tela, breakdown por empresa em vez de por departamento.** Quando escopo = Grupo Lever, o dashboard mostra KPIs agregados cross-empresa (folha total do grupo, custo médio global, headcount total) + abaixo: cada empresa como uma linha do breakdown (em vez dos 6 times). Sem tela diferente — o componente detecta se escopo é `group` ou `company` e adapta o breakdown. Lógica de "top 6" não se aplica ao grupo — todas as empresas do grupo aparecem.

### Cmd+K: escopo e ações rápidas (DASH-04)

- **D-06:** **Navegação + ações rápidas.** CmdKPalette.tsx recebe duas categorias de resultados: (1) resultados dinâmicos de busca (vagas, candidatos, pessoas do escopo atual); (2) ações estáticas (Criar nova vaga, Convidar/criar pessoa, navegação para páginas principais).
- **D-07:** **Ações rápidas incluídas:**
  - "Criar nova vaga" → abre JobOpeningForm (rota `/vagas/nova` ou dialog — planner decide o que já existe)
  - "Convidar/criar pessoa" → navega para `/criar-usuario` (já existe em Phase 3)
  - Atalhos de navegação: Dashboard, Vagas, Candidatos, 1:1, Avaliações, Clima, Pessoas, Empresas
  - **NÃO inclui** "Trocar escopo" — scope selector no header já cobre isso
- **D-08:** **Default state (sem texto digitado):** atalhos de páginas principais + ações rápidas (criar vaga, criar pessoa). Sem histórico de recentes — sem localStorage de itens visitados. Limpo e previsível.
- **D-09:** **Scope enforcement.** Busca dinâmica usa `useScopedQuery` com `scope.id` no queryKey; queries filtram por `company_id` do escopo atual. Papel do usuário é respeitado (sócio só vê empresas com membership; RH vê tudo do escopo; líder/liderado não têm Cmd+K de busca de candidatos de outras empresas). SLA: <100ms (DASH-04 success criterion) — planner calibra via índice ou debounce adequado.

### Claude's Discretion

Áreas em-escopo de Phase 4 que o owner delegou para o planner. Padrões já estabelecidos nas fases anteriores.

- **Sentry tags de contexto** — incluir `scope_id` e `scope_type` nas tags de cada evento Sentry para facilitar debugging por empresa; planner decide quais campos adicionais (role, company_name)
- **SocioDashboard.tsx (423 linhas)** — abaixo de 800 linhas (QUAL-04 não dispara), mas precisa de refactor para: (a) `useScopedQuery`; (b) remoção de seções não financeiras; (c) lógica de breakdown condicional (empresa→departamentos, grupo→empresas). Planner decide se reescreve ou refatora incremental.
- **Migration G: timing e critérios concretos** — "1+ semana de estabilidade" = zero incidentes críticos em produção + pgTAP cross-tenant passando. Planner inclui checklist de go/no-go no PLAN.md. Verificação de zero leitores na tabela `teams`: `SELECT COUNT(*) FROM pg_stat_user_tables WHERE relname = 'teams' AND n_live_tup > 0` não é suficiente — planner verifica queries ativas no código-fonte.
- **Sentry session replay** — default-off (QUAL-06 já especifica). Planner decide onde colocar a flag de ativação (config de RH/Admin ou env variable).
- **Cobertura de testes Wave 0** — Wave 0 foi executado em Phases 2 e 3 (scaffolding Vitest + pgTAP). Phase 4 foca nos 5 fluxos críticos do QUAL-03; não recriar scaffolding já existente.
- **Templates de avaliação com UI completa** — Phase 3 CONTEXT deferred parcialmente. Planner verifica o que Phase 3 entregou e decide o que cabe em Phase 4 polish vs v2.
- **AdminDashboard.tsx (695 linhas)** — não atinge 800 linhas; planner verifica se Phase 4 toca esse componente. Se sim, refatora useScopedQuery; se não, deixa.

### Folded Todos

Nenhum — `gsd-sdk query todo.match-phase 4` retornou 0 matches.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project-level requirements
- `.planning/PROJECT.md` — Core value; lock "Performance e R&S ficam em telas dedicadas" (dashboard de sócio = financeiros); lock "folha = soma de salários cadastrados"; lock "sem features novas grandes"; lock "sem integração externa de folha nessa rodada"
- `.planning/REQUIREMENTS.md` §DASH (4 reqs) + §QUAL (seleção: QUAL-01..04, QUAL-06, QUAL-09) — Phase 4 mapping: DASH-01..04 + QUAL-01/02/03/04/06/09 = 10 reqs
- `.planning/ROADMAP.md` §"Phase 4: Dashboards + Quality Polish" — Goal, success criteria (5 pontos), dependência de Phases 1-3 estáveis, migration coverage G (contract + irreversível)
- `.planning/STATE.md` — Estado atual, pendências, flags de fases anteriores

### Phase locks (fundação das fases anteriores)
- `.planning/phases/01-tenancy-backbone/01-CONTEXT.md` — D-01..D-11 seletor de escopo; `useScopedQuery` chokepoint (TODA query de Phase 4 passa por aqui); `visible_companies` + `socio_company_memberships` para RLS do dashboard de sócio
- `.planning/phases/02-r-s-refactor/02-CONTEXT.md` — Pattern de RPC `read_x_with_log`; `data_access_log` append-only (Phase 4 verifica pg_cron rodando para Migration G)
- `.planning/phases/03-performance-refactor/03-CONTEXT.md` — D-28 conversão teams→org_units (Migration G dropa `teams` se zero leitores); D-27 Backfill E (pré-condição para Migration G); padrão de onboarding WhatsApp (Phase 4 cria pessoa via Cmd+K navega para a mesma tela)

### Codebase context
- `.planning/codebase/ARCHITECTURE.md` — Estrutura do módulo de dashboards, hooks pattern, Edge Functions
- `.planning/codebase/CONCERNS.md` — Monolíticos flagged (CandidateProfile 1169, JobOpeningForm 854) — QUAL-04 targets desta fase; RLS gaps a fechar em Migration G
- `.planning/codebase/CONVENTIONS.md` — queryKey pattern com `scope.id`; form patterns; logger.ts (PII scrubbing iniciado Phase 1)
- `.planning/codebase/INTEGRATIONS.md` — Supabase project `ehbxpbeijofxtsbezwxd`; pg_cron status (Migration G dependency)
- `.planning/codebase/STACK.md` — `@sentry/react` 10.50 (já no CLAUDE.md stack additions); **NÃO upgrade Zod 3→4**

### Working guide
- `leverup-talent-hub/CLAUDE.md` — Stack locked; Sentry já listado em stack additions; conventions ativas

### Componentes relevantes (Phase 4 tocará)
- `src/pages/SocioDashboard.tsx` (423 linhas) — Refactor: escopar via `useScopedQuery`, remover clima/org, adicionar lógica company→dept / group→empresa
- `src/components/CmdKPalette.tsx` (309 linhas) — Refactor: conectar ao `useScopedQuery`, adicionar ações rápidas (criar vaga, criar pessoa), corrigir scope leakage
- `src/hooks/useCostBreakdown.ts` — Verificar se já usa `useScopedQuery`; se não, migrar
- `src/hooks/useOrgIndicators.ts` — Idem
- `src/components/primitives/StatCard.tsx` — Reusar para KPIs do dashboard

### Migration G reference
- `.planning/research/ARCHITECTURE.md` — Pattern expand→backfill→contract; critérios de contract phase
- `supabase/migrations/` — Último timestamp para nomear Migration G corretamente

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`src/pages/SocioDashboard.tsx`** (423 linhas) — Já tem KPIs de custo, breakdown por times (top 6), CSV export, StatCard layout. Refactor: (1) conectar `useCostBreakdown`/`useOrgIndicators` ao `useScopedQuery`; (2) remover `useClimateOverview` da tela; (3) adicionar lógica condicional: se `scope.type === 'group'` → breakdown por empresa; senão → breakdown por departamento.
- **`src/components/CmdKPalette.tsx`** (309 linhas) — Já implementa dialog Cmd+K, busca remota (vagas, candidatos, pessoas, PDIs), navegação por keyboard, grupos (CommandGroup). Precisa: (1) passar `scope.id` nas queries dinâmicas; (2) adicionar ações estáticas (criar vaga, criar pessoa); (3) garantir que busca usa `useScopedQuery` (hoje usa `supabase.from()` direto).
- **`src/components/primitives/StatCard.tsx`** — Componente de KPI já existe; reusar para os 3 cards do dashboard.
- **`src/hooks/useCostBreakdown.ts`** — Hook existente para breakdown de custos; verificar escopo atual.
- **`src/hooks/useOrgIndicators.ts`** — Hook existente para headcount e indicadores org; verificar escopo atual.

### Established Patterns (de Phases 1-3)
- **`useScopedQuery`** chokepoint — TODA query de Phase 4 passa por aqui. queryKey inclui `['scope', scope.id, ...]`. ESLint guard ativo bloqueia `supabase.from()` fora de hooks/integrations.
- **Migration pattern** expand→backfill→contract — Migration G é a última etapa (contract); irreversível. Verificar pré-condições antes de executar.
- **RPC server-side** para dados sensíveis (padrão Phase 2: `read_candidate_with_log`; Phase 4 usa RPC para agregar folha sem expor salários individuais).
- **Sentry + logger.ts** — `logger.ts` (Phase 1) já faz PII scrubbing em `console.log`; Sentry adiciona `beforeSend` como segunda camada.
- **Form pattern** — `react-hook-form` 7.73 + Zod 3.25; ações rápidas do Cmd+K que abrem forms usam o mesmo padrão.

### Integration Points
- **`src/App.tsx`** — Registrar `Sentry.init()` aqui ou em entry point (`src/main.tsx`); envolver com `SentryErrorBoundary`.
- **`supabase/migrations/`** — Migration G = timestamp após último migration de Phase 3. Verificar zero leitores de `teams` + `allowed_companies` antes de dropar.
- **`src/integrations/supabase/types.ts`** — Regerar após Migration G aplicada.
- **`supabase/tests/`** — pgTAP tests existentes de Phases 1+2; Phase 4 adiciona os 5 fluxos críticos de QUAL-03.

### Tests Coverage (QUAL-01..03) — o que já existe
- **Phases 1+2 Wave 0** — scaffolding Vitest + RTL + MSW + pgTAP configurado. Testes unitários de utils, testes de migração, MSW handlers para Edge Functions.
- **Phase 4 adiciona:** testes de integração dos 5 fluxos críticos do QUAL-03 que ainda não existem ou precisam ser completados:
  1. Login + troca de senha (first-login flow de Phase 3)
  2. Switch de escopo sem flash (ScopeProvider + cache preservation de Phase 1)
  3. Mover candidato no kanban: cenários conflict/network/permission (Phase 2 hook)
  4. Salvar avaliação idempotente (Phase 3 evaluation form)
  5. RLS cross-empresa fail-test (pgTAP)

</code_context>

<specifics>
## Specific Ideas

- **Dashboard de sócio = financeiros, ponto final.** Owner confirmou: remover clima e org indicators do SocioDashboard. "Performance e R&S ficam em telas dedicadas" é lock do PROJECT.md — reforçado nesta sessão.
- **Breakdown adapta ao escopo:** empresa → top 6 departamentos; grupo → todas as empresas membros. Mesma tela, comportamento condicional. Elegante e consistente com o pattern de scope propagation do Phase 1.
- **Cmd+K tem ações, não só busca.** Owner quer poder criar vaga e convidar pessoa sem sair do contexto atual. Ações são estáticas (hardcoded no palette), busca é dinâmica (scoped).
- **Sem recentes no Cmd+K nesta fase.** Simplicidade vence — a lista de páginas principais serve de "recentes implícitos" para a maioria dos casos.
- **Trocar escopo NÃO é ação do Cmd+K** — owner não selecionou essa opção; scope selector no header é suficiente e evita duplicação.
- **Migration G é irreversível** — a única no roadmap. Planner deve incluir checklist explícito de go/no-go no PLAN.md e marcar no PR que as operações de drop são one-way.
- **Sentry é PII-first.** `beforeSend` é obrigatório antes de qualquer outro config Sentry. Session replay só com `maskAllText`.

</specifics>

<deferred>
## Deferred Ideas

### Histórico comparativo de folha entre períodos
- Owner optou por "só os KPIs atuais" nesta fase. Comparativo mês-a-mês exigiria armazenar snapshots históricos (nova tabela ou particionamento).
- **Quando revisitar:** v2, se sócios pedirem "como estava a folha em janeiro?".

### Histórico de recentes no Cmd+K
- Owner optou por "sem recentes" nesta fase.
- **Quando revisitar:** se usuários reclamarem de ter que redigitar nomes frequentes.

### Trocar escopo via Cmd+K
- Owner não selecionou esta opção — scope selector no header é suficiente.
- **Quando revisitar:** se usuários de teclado pedirem atalho dedicado (pode ser Cmd+K > "g" + "s" como convenção Linear).

### UI completa de gestão de templates de avaliação
- Deferred de Phase 3. Planner verifica status do que foi entregue e decide se Phase 4 polish inclui parcialmente.
- **Quando revisitar:** após Phase 4 executada; se a UI for necessária para operação do RH, incluir em patch imediato.

### Reviewed Todos (not folded)
- Não aplicável — `gsd-sdk query todo.match-phase 4` retornou 0 matches.

</deferred>

---

*Phase: 04-dashboards-quality-polish*
*Context gathered: 2026-04-28*
