# Lever Talents Hub — Requirements

**Milestone:** Refactor + redesenho de fluxos (v1)
**Last updated:** 2026-04-27

Refactor de coesão. Sem features novas grandes. Cada requisito é uma capability observável e testável que alimenta o critério de done do PROJECT.md: *fluxos principais sem erro + dados batendo por escopo de empresa (ou grupo)*.

---

## v1 Requirements

### Tenancy & Escopo (TEN)

- [ ] **TEN-01**: Empresa é entidade única (tabela `companies`). Sem flag interna/externa
- [ ] **TEN-02**: Empresa tem flags `performance_enabled` e `rs_enabled` (default ambos `false`); Admin/RH liga/desliga no cadastro e em tela de configuração depois
- [ ] **TEN-03**: Existe tabela `company_groups` genérica (id, nome, slug). Empresas têm `group_id` opcional (nullable)
- [ ] **TEN-04**: Existe instância "Grupo Lever" (slug `grupo-lever`) com as 7 empresas internas atribuídas
- [ ] **TEN-05**: Seletor global de escopo no header (canto superior direito) lista empresas individuais + grupos disponíveis ao usuário
- [ ] **TEN-06**: Selecionar uma empresa no seletor faz TODO o app filtrar por aquela empresa (vagas, candidatos, performance, dashboards) — sem flash de dados anteriores
- [ ] **TEN-07**: Selecionar um grupo no seletor faz o app filtrar pelas empresas-membro do grupo (união)
- [ ] **TEN-08**: Última seleção persiste entre sessões (Zustand persist). Reabrir aba volta no mesmo escopo
- [ ] **TEN-09**: Escopo selecionado aparece também na URL (`?scope=company:UUID` ou `?scope=group:UUID`) — links são compartilháveis
- [ ] **TEN-10**: Mudar escopo invalida queryKeys via partial-key match (`['scope', oldId, ...]`) sem quebrar cache de outros escopos

### RBAC (RBAC)

- [ ] **RBAC-01**: Existem 5 roles fixos: `admin`, `rh`, `socio`, `lider`, `liderado`
- [ ] **RBAC-02**: Admin tem acesso total (todas empresas, todos grupos, todas operações de configuração)
- [ ] **RBAC-03**: RH tem acesso operacional total (todas empresas, todos grupos) — equivalente a Admin em escopo, sem operações de configuração de plataforma
- [ ] **RBAC-04**: Sócio tem membership N:N com empresas via tabela `socio_company_memberships`. Vê apenas empresas atribuídas
- [ ] **RBAC-05**: Líder vê o que está dentro dos org_units que lidera (recursivamente)
- [ ] **RBAC-06**: Liderado vê apenas o próprio histórico (avaliações que recebeu, próprias 1:1, próprias respostas de clima)
- [ ] **RBAC-07**: Badge persistente no header mostra escopo atual ("Você está vendo: Empresa X" ou "Grupo Lever")
- [ ] **RBAC-08**: CASL define abilities no client a partir do role + memberships do usuário; UI esconde botões/ações que o usuário não pode executar (defesa-em-profundidade)
- [ ] **RBAC-09**: RLS no banco é a fronteira de segurança: políticas usam helpers `STABLE SECURITY DEFINER` (`visible_companies`, `visible_org_units`, `org_unit_descendants`)
- [ ] **RBAC-10**: Padrão `(SELECT auth.uid())` é obrigatório em todas as policies (initPlan caching). Auditoria existente é migrada

### Estrutura Organizacional (ORG)

- [ ] **ORG-01**: Tabela `org_units` (id, company_id, parent_id, name, kind) modelando árvore por empresa (adjacency list)
- [ ] **ORG-02**: `parent_id` self-reference; raiz por empresa tem `parent_id = NULL`
- [ ] **ORG-03**: Trigger anti-ciclo: BEFORE INSERT/UPDATE bloqueia criar referência circular
- [ ] **ORG-04**: Tabela `org_unit_members` (user_id, org_unit_id) — pessoa pode estar em 1+ unit
- [ ] **ORG-05**: Tabela `unit_leaders` (user_id, org_unit_id) — unit pode ter 1+ líder
- [ ] **ORG-06**: Função `org_unit_descendants(unit_id uuid) RETURNS uuid[]` (recursive CTE) usada por RLS
- [ ] **ORG-07**: Líder de unit pai vê dados de todos os units descendentes (transitivo)
- [ ] **ORG-08**: UI de gestão da estrutura permite criar/renomear/mover/excluir org_units e atribuir líderes/membros
- [ ] **ORG-09**: Tabela legada `teams` permanece como leitura compatível durante migração; após Fase 1 estabilizar, é descontinuada

### Auth & Onboarding (AUTH)

- [ ] **AUTH-01**: RH/Admin cria pessoa via formulário (nome, email, role, empresa, org_unit) e o sistema gera senha temporária
- [ ] **AUTH-02**: Após criar pessoa, app exibe **mensagem pré-formatada de WhatsApp** com link de primeiro acesso e credencial temporária — RH copia e envia (não envia email automático)
- [ ] **AUTH-03**: Senha temporária expira em 24h; pessoa é forçada a trocar senha no primeiro login antes de acessar qualquer outra tela
- [ ] **AUTH-04**: Logs de aplicação (server e client) não contêm email, CPF, UUID de usuário ou nome completo — Sentry `beforeSend` scrubba PII
- [ ] **AUTH-05**: Console do navegador limpo de objetos com PII em produção (CONCERNS.md flagged)

### Recrutamento & Seleção (RS)

- [ ] **RS-01**: Vaga vincula a exatamente 1 empresa (`company_id NOT NULL`)
- [ ] **RS-02**: Stages do kanban de candidatos seguem template global default; cada vaga pode adicionar/remover/renomear stages locais
- [ ] **RS-03**: Mover candidato entre stages no kanban é **estável**: optimistic update com `onMutate`/`setQueryData` + rollback em erro; sem flash de "voltar" (corrige bug #1)
- [ ] **RS-04**: Mover candidato valida transição via `canTransition()` antes de chamar `mutate` (corrige rejeições servidor-side silenciosas)
- [ ] **RS-05**: Migration normaliza stages legados (`aguardando_fit_cultural`, `sem_retorno`, `fit_recebido`) para os stages do template atual
- [ ] **RS-06**: Kanban consolida 16 stages atuais em 6 grupos visuais (input do UX-AUDIT-VAGAS.md)
- [ ] **RS-07**: Detalhe do candidato abre em **drawer lateral** (não página dedicada) — preserva contexto do kanban
- [ ] **RS-08**: Card do candidato no kanban mostra sparkbar de distribuição por stage e indicador de SLA (verde/amarelo/vermelho conforme tempo no stage)
- [ ] **RS-09**: Filtros (vaga, source, fase, tag) são inline acima do kanban, não em modal
- [ ] **RS-10**: Vagas encerradas ficam em seção colapsada por default — não poluem visão ativa
- [ ] **RS-11**: Vaga marcada `confidencial = true` exibe badge dedicado e é invisível para roles fora da curadoria
- [ ] **RS-12**: Realtime subscribe por `jobId` atualiza kanban quando outro usuário move candidato

### Banco de Talentos (TAL)

- [ ] **TAL-01**: Banco de Talentos é global (não isolado por empresa) — candidato pode aparecer em vagas de N empresas
- [ ] **TAL-02**: Candidato tem tags por empresa/vaga em que participou (histórico)
- [ ] **TAL-03**: Tabela `candidate_consents` (candidate_id, purpose, legal_basis, expires_at, revoked_at, granted_at) — consentimento granular por finalidade
- [ ] **TAL-04**: Fluxo de candidatura exige opt-in **não pré-marcado** para inclusão no banco com finalidade explícita
- [ ] **TAL-05**: Tabela `data_access_log` (entity_type, entity_id, action, scope_company_id, context, actor_id, at) — append-only
- [ ] **TAL-06**: Leitura de PII de candidato passa por RPC `read_candidate_with_log(id, context)` — log automático
- [ ] **TAL-07**: Retenção do `data_access_log` é 36 meses; pg_cron faz cleanup
- [ ] **TAL-08**: Candidato (ou RH em nome dele) pode revogar consentimento; revogação remove acesso futuro mas preserva histórico de auditoria
- [ ] **TAL-09**: CPF é chave de dedup canonical (complementar a email) na criação de candidato

### Performance: Avaliações & Clima (PERF)

- [ ] **PERF-01**: Ciclos de avaliação são **por empresa** — RH abre/fecha ciclo quando faz sentido (sem janela global)
- [ ] **PERF-02**: Cada ciclo define template (questões, escala, peso) — admin define globais, RH pode customizar por ciclo
- [ ] **PERF-03**: Avaliação líder→liderado e liderado→líder são entidades separadas no mesmo ciclo
- [ ] **PERF-04**: Resultado de avaliação visível a: RH (todas), líder direto (do liderado), liderado (apenas a própria avaliação recebida)
- [ ] **PERF-05**: Pesquisa de clima é **100% anônima** — campo `respondent_id` jamais armazenado; agregação por org_unit com k-anonymity (≥3 respostas)
- [ ] **PERF-06**: RH dispara pesquisa de clima por empresa, escolhe scope (empresa toda ou subset de org_units) e janela
- [ ] **PERF-07**: Forms de avaliação/clima usam react-hook-form + zod resolver, sem `as any` casts; submissão é otimista com rollback em erro

### 1:1 (ONE)

- [ ] **ONE-01**: Par (líder, liderado) tem feed contínuo de 1:1; cada 1:1 tem agendamento, pauta colaborativa pré-meeting, notas durante, action items pós
- [ ] **ONE-02**: Conteúdo de 1:1 é privado entre o par — outros líderes/liderados não veem
- [ ] **ONE-03**: **RH lê todo o conteúdo** de 1:1 da empresa que opera; UI exibe badge "RH visível" persistente no formulário
- [ ] **ONE-04**: 1:1 tem campos dedicados para anexar **transcrição Plaud** (texto longo, paste do dispositivo) e **resumo** (texto editável)
- [ ] **ONE-05**: Action items aparecem como checklist independente, com responsável (líder/liderado) e prazo
- [ ] **ONE-06**: Histórico de 1:1 do par é navegável (linha do tempo) com busca em conteúdo

### Dashboard (DASH)

- [ ] **DASH-01**: Sócio que loga e seleciona empresa cai em dashboard com **KPIs financeiros**: folha total, custo médio por colaborador, headcount ativo
- [ ] **DASH-02**: Folha total é calculada como soma do salário cadastrado dos colaboradores ativos da empresa selecionada (sem integração externa)
- [ ] **DASH-03**: Quando escopo é "Grupo Lever", dashboard de sócio mostra os mesmos KPIs com agregação cross-empresa (não tela diferente)
- [ ] **DASH-04**: Cmd+K palette permite navegar a qualquer empresa, vaga, candidato, pessoa do escopo atual

### Quality & Estabilidade (QUAL)

- [ ] **QUAL-01**: Vitest + React Testing Library + MSW configurados; `npm test` roda no CI
- [ ] **QUAL-02**: pgTAP + supabase-test-helpers configurados; teste cross-tenant de leakage roda no CI (deve falhar quando RLS quebra)
- [ ] **QUAL-03**: Cobertura mínima nos fluxos críticos: login + troca de senha; switch de escopo; mover candidato no kanban (com cenários de erro); salvar avaliação; respeitar RLS em queries cross-empresa
- [ ] **QUAL-04**: Componentes >800 linhas (1169 flagged em CONCERNS.md) são quebrados quando a fase os toca
- [ ] **QUAL-05**: Lockfile único (`package-lock.json`); `bun.lockb` removido; CI usa `npm ci`
- [ ] **QUAL-06**: Sentry integrado com `beforeSend` scrubbando PII (email, CPF, nome, salário); session replay default-off, com `maskAllText` quando ligado
- [ ] **QUAL-07**: ESLint regra customizada bloqueia `supabase.from()` fora de `hooks/` e `integrations/` — força uso de `useScopedQuery`
- [ ] **QUAL-08**: `@tanstack/eslint-plugin-query` ativo; queryKey audit checklist garante que toda key inclua `scope.id`
- [ ] **QUAL-09**: Migrations rodam em modo **expand → backfill → contract** (sem big-bang); fase G (contract) fica para último após 1+ semana de estabilidade
- [ ] **QUAL-10**: `date-fns-tz` formata todo `timestamptz` em `America/Sao_Paulo` na UI

---

## v2 Requirements (deferred)

Movidos para próxima rodada. Não bloqueiam o critério de done desta fase.

- [ ] **V2-01**: Toggle visual entre Board e Tabela no kanban de candidatos (DIF-20)
- [ ] **V2-02**: Busca full-text robusta no Banco de Talentos (DIF-10) — hoje é busca simples; full-text precisa de tsvector e UI de filtros avançados
- [ ] **V2-03**: PDI (Plano de Desenvolvimento Individual) como entidade de 1ª classe (DIF-17) — hoje é colunas em avaliação; entidade própria com metas trimestrais é v2
- [ ] **V2-04**: Kanban *de Vagas* (visualização board das vagas em si, agregado) (DIF-01)
- [ ] **V2-05**: Templates de avaliação customizáveis por empresa (hoje template é global)
- [ ] **V2-06**: Virtualization no kanban de candidatos com `@tanstack/react-virtual` — só se volume médio >100 candidatos por vaga
- [ ] **V2-07**: Realtime cross-jobs (hoje subscribe por jobId; cross-job é v2)

---

## Out of Scope

Decisões deliberadas. Reabrir requer discussão explícita.

- **AF-01 ML/AI matching de candidatos** — risco regulatório ANPD, sem volume justificando, fora do escopo
- **AF-02 Portal público de candidato** — superfície de ataque, fora do escopo
- **AF-03 Integração com folha externa (ERP)** — pântano CLT, fora dessa rodada (folha calculada de salários cadastrados resolve)
- **AF-04 White-label por cliente externo** — Lever Talents é a operadora visível
- **AF-05 Visão "holding consolidada" mágica** — escopo é sempre explícito (empresa OR grupo); sem agregação implícita
- **AF-06 Avaliações em ciclos globais sincronizados entre empresas** — cada empresa no seu ritmo (PERF-01)
- **AF-07 Banco de Talentos isolado por empresa** — decisão estratégica é global com tags + LGPD (TAL-01..TAL-09)
- **AF-08 Onboarding por email** — canal errado para liderado BR; WhatsApp é o canal oficial (AUTH-02)
- **AF-09 AI generativa para escrever feedback** — qualidade do feedback é o ponto; risco LGPD
- **AF-10 Clima pseudonimizado reversível** — clima é 100% anônimo (PERF-05)
- **AF-11 App mobile nativo** — web responsivo serve nesta rodada
- **AF-12 Mudança de stack** — Vite/React/TS/Supabase/shadcn ficam
- **AF-13 Upgrade Zod 3 → 4** — incompatibilidade comprovada com `@hookform/resolvers` 5.2.2 (issues #813, #842)
- **AF-14 Group 1:1 / 1:N meetings** — 1:1 é um-pra-um; reuniões de equipe não entram

---

## Traceability

<!-- Preenchido pelo gsd-roadmapper na próxima etapa. Mapeia REQ-IDs → phases do ROADMAP.md. -->

(pendente — preenchido na criação do ROADMAP.md)

---

*Total v1: ~75 requirements | v2 deferred: 7 | Out of scope: 14 anti-features*
