# Phase 3: Performance Refactor - Context

**Gathered:** 2026-04-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Esta fase entrega o **refactor de Performance** (avaliações + clima + 1:1) escopado por empresa via `useScopedQuery` (chokepoint Phase 1), com **ciclos independentes por empresa**, **anonimização forte do clima**, **anexo Plaud no 1:1**, e **onboarding por WhatsApp** (substitui email para credenciais). Cobre 16 requisitos (AUTH-01/02/03 + PERF-01..07 + ONE-01..06) + Backfill E (Grupo Lever + 7 empresas + teams legados → org_units + user_roles socios → memberships).

**Em escopo:**
- **Avaliações em ciclos por empresa**: nova entidade `evaluation_cycles` (id, company_id, name, template_id, starts_at, ends_at, status). Cada ciclo tem janela fixa start/end; status auto-expira em ends_at. Avaliação líder→liderado e liderado→líder são entidades separadas no mesmo ciclo. Refiltra por empresa atual via `useScopedQuery`.
- **Templates de avaliação por empresa + override por ciclo** (puxa V2-05 do backlog pra v1 — vide Scope Changes): `evaluation_templates` (id, company_id, name, schema_json, is_default). Ciclo carrega snapshot imutável do template no momento da criação (`evaluation_cycles.template_snapshot` JSONB) — mudanças no template não afetam ciclos abertos.
- **Drop histórico de evaluations** (decisão owner): TRUNCATE da tabela `evaluations` durante migration; sem backup explícito. Histórico anterior NÃO é preservado (vide Scope Changes + risco em Deferred).
- **Pesquisa de clima 100% anônima** (PERF-05): tabela `climate_responses` perde a coluna `user_id` (HOJE existe — LGPD violation). Migration faz wipe + drop coluna. Agregação por org_unit aplica k-anonymity (≥3 respostas) — buckets com <3 respostas escondem ou agregam pra unit pai (planner decide implementação default).
- **1:1 com Plaud**: 2 textareas dedicadas no form: "Transcrição (Plaud)" + "Resumo (Plaud)" — ambas paste manual (resumo já vem pronto do app Plaud). Sem auto-resumo via OpenAI nesta fase. `useAudioTranscription` continua existindo para fluxo de gravação no app (legacy).
- **1:1 RH visível**: badge "RH visível" persistente no formulário (já lock por ONE-03). RH navega via toggle "Lista geral / Por par" — preferência persiste por usuário. **RH pode adicionar nota interna RH** (visível só para RH; liderado e líder NÃO veem). LGPD pragmático: sem trilha formal de export pro colaborador (risco registrado em deferred).
- **Componente OneOnOneMeetingForm.tsx (909 linhas)** quebrado por seção: `OneOnOneAgenda`, `OneOnOneNotes` (inclui Plaud), `OneOnOneActionItems`, `OneOnOnePDIPanel`. Pai vira orchestrator <300 linhas (QUAL-04 atendido).
- **Migração mecânica de hooks de Performance pra `useScopedQuery`**: useEvaluations, useClimateSurveys, useClimateOverview, useOneOnOnes, useDevelopmentPlans, useNineBoxDistribution, useCollaboratorEvolution, useTeamIndicators, useOrgIndicators, useLeaderAlerts, usePendingTasks, useActionItems, usePDIIntegrated, usePDIUpdates, useCostBreakdown — todos com queryKey incluindo `scope.id`. ESLint guard de Phase 1 já bloqueia `supabase.from()` fora de hooks.
- **Onboarding WhatsApp** (AUTH-01/02/03): substitui o `auth.signUp` direto do `CreateUser.tsx` atual.
  - Após cadastro, app mostra mensagem pronta + botão "Copiar tudo" (sem integração WhatsApp externa)
  - Senha temporária = 8 caracteres fáceis de ler (sem `0/O`, `1/L`, ambíguos)
  - Primeiro login: tela dedicada bloqueante `/first-login-change-password` — nada do app aparece até trocar
  - Senha temporária expirada (>24h): app **deixa entrar mesmo assim**, mas força troca na hora (owner aceitou tradeoff de flexibilidade vs segurança máxima)
- **Backfill E**: criar Grupo Lever + 7 empresas com nomes/UUIDs definidos pelo owner; converter `teams` legados → `org_units` (1:1, preserva membros e líder); converter `user_roles` role='socio' → linha em `socio_company_memberships` (associação empresa-sócio definida pelo owner).
- **Quebra dos componentes monolíticos restantes tocados nesta fase** (QUAL-04): EvaluationForm.tsx (773 linhas), OneOnOnes.tsx page (621 linhas), CreateUser.tsx (346 — não monolítico mas será reescrito).

**Fora desta fase:**
- **AI generativa pra resumo Plaud** — owner confirmou que resumo já vem pronto do app Plaud; `AF-09 AI generativa pra escrever feedback` continua out-of-scope.
- **Trilha formal LGPD para export de notas RH ao colaborador** — owner pediu pragmatismo; se ANPD demandar, revisitar (deferred).
- **Backup formal das evaluations antes do drop histórico** — owner toma responsabilidade; sem CSV export, sem rollback explícito (deferred + risco registrado).
- **Reativação manual de conta após senha expirada** — escolhemos fluxo flexível (entra+troca); reativação manual via UI fica para v2 se houver demanda.
- **Templates customizáveis por empresa via UI** ainda em iteração — primeira versão pode ser via seed/admin; UI completa de gestão de templates por empresa pode caiar parcialmente em Phase 4 polish (planner decide split).
- **Integração com WhatsApp Business API** — out-of-scope; mensagem é copiar-e-colar no WhatsApp pessoal do RH.
- **Cmd+K palette** — Phase 4 (DASH-04).
- **Dashboard de sócio** — Phase 4 (DASH-01..03).

</domain>

<decisions>
## Implementation Decisions

### Avaliações: ciclos por empresa (PERF-01, PERF-03, PERF-04)

- **D-01:** **Ciclo por empresa, com janela fixa start/end.** Tabela `evaluation_cycles(id, company_id, name, template_snapshot JSONB, starts_at, ends_at, status)`. Status `active` ↔ `closed` automaticamente em `ends_at` (cron job ou check on-read). RH cria ciclo informando empresa + janela + template + nome ("Q1 2026", "Anual 2026", etc). Reflete realidade operacional ("ciclo trimestral Q1", "avaliação anual 2026").
- **D-02:** **Avaliações líder→liderado e liderado→líder são entidades separadas** referenciando o mesmo `cycle_id`. Schema: `evaluations(id, cycle_id, evaluator_user_id, evaluated_user_id, direction, ...)` onde `direction ∈ ('leader_to_member', 'member_to_leader')`. Permite RH abrir 1 ciclo e ter as duas direções no mesmo container.
- **D-03:** **Visibilidade de resultado** (PERF-04):
  - **RH** vê todas avaliações da empresa que opera (via `useScopedQuery` → company atual)
  - **Líder direto** vê avaliações dos seus liderados (via `org_unit_descendants` helper de Phase 1)
  - **Liderado** vê apenas a própria avaliação recebida (e a que ele deu, se for a outra direção)
- **D-04:** **Trocar empresa no header** refiltra ciclos visíveis para a nova empresa atual. Nenhuma "lista cross-empresa" no v1 — coerência com pattern Phase 1.

### Avaliações: templates por empresa (PERF-02, antecipa V2-05)

- **D-05:** **Cada empresa tem seu template padrão próprio.** Tabela `evaluation_templates(id, company_id, name, schema_json, is_default, created_at)`. Admin/RH da empresa cria/edita templates; quando cria ciclo, escolhe qual template usar (default sugerido).
- **D-06:** **Snapshot imutável no momento de criar o ciclo.** `evaluation_cycles.template_snapshot` é JSONB freezed na criação; mudanças subsequentes em `evaluation_templates` NÃO afetam ciclos já criados. Garante que respostas históricas sempre fazem sentido com as perguntas que estavam ativas no ciclo.
- **D-07:** **Schema do template (JSON)**: `{ version: 1, sections: [{ id, title, weight, questions: [{ id, label, type: 'scale_1_5'|'text'|'choice', required, options? }] }] }`. Versionado pra suportar evolução futura. Forms usam `react-hook-form` + Zod resolver gerado dinamicamente do schema (zero `as any`).

### Avaliações: migração de dados legados

- **D-08:** **Drop histórico — start fresh.** Migration faz `TRUNCATE evaluations` (após criar nova schema com `cycle_id`); sem backfill, sem mapping de `period: string` → ciclo. Owner explicitou "não preciso desse histórico". **Risco:** sem rollback se decisão for revertida; backup só via point-in-time recovery do Supabase (7 dias). **Mitigação:** flag visível no PR + announce no STATE.md.

### Pesquisa de clima: anonimato forte (PERF-05, PERF-06)

> Owner não selecionou esta área pra discussão; decisões abaixo são Claude's Discretion baseadas em REQUIREMENTS lock + pattern Phase 2.

- **D-09:** **Drop coluna `climate_responses.user_id`** via migration. HOJE existe (linha 201-212 da migration legada `20251009195041`) — viola PERF-05 ("campo `respondent_id` jamais armazenado"). Migration: `ALTER TABLE climate_responses DROP COLUMN user_id` + `DROP INDEX idx_climate_responses_user_id` (migration `20260423100000:37`). Sem backfill — não há nada pra preservar (era PII pura).
- **D-10:** **K-anonymity ≥3 antes de retornar agregado.** RPC `get_climate_aggregate(survey_id, org_unit_id)` retorna `{count, avg, distribution}` SOMENTE se `count >= 3`; senão retorna `{ insufficient_data: true }`. UI mostra "Dados insuficientes para garantir anonimato (mínimo 3 respostas)". Planner decide se agrega pra unit pai automaticamente ou só esconde.
- **D-11:** **UI de questionário de clima** mostra label persistente "100% anônima" no topo + nenhum campo de identificação visível no form. Submit não envia `user_id` nem `actor_id` no payload — RPC `submit_climate_response` recebe só `(survey_id, question_id, score, comment_optional)` sem extrair caller.

### 1:1: anexo Plaud (ONE-04)

- **D-12:** **Duas textareas dedicadas no form de 1:1**: "Transcrição (Plaud)" e "Resumo (Plaud)". Ambas aceitam paste manual de texto longo. **Owner confirmou: resumo já vem gerado no app do Plaud** — então RH só cola. Sem botão "Gerar resumo via AI" nesta fase.
- **D-13:** **`useAudioTranscription` permanece existente** pro fluxo de gravação dentro do próprio app (uso legacy). Plaud é o caminho oficial de transcrição/resumo de 1:1; gravação no app é alternativa secundária.
- **D-14:** **Persistência da transcrição/resumo:** dentro de `one_on_ones.meeting_structure` JSONB (já existe — guarda `transcricao`, `resumo`, `agenda_items`, `action_items`). Não criar coluna nova; estender JSON schema.

### 1:1: visibilidade do RH (ONE-02, ONE-03)

- **D-15:** **Badge "RH visível" persistente** no header/topo do formulário de 1:1, com ícone + tooltip ("Conteúdo desta 1:1 é visível para RH da empresa, pois RH pode auditar conversas"). Lock de UX já em PROJECT.md.
- **D-16:** **Toggle "Lista geral / Por par"** na página /1-on-1s para perfis RH/Admin:
  - **Lista geral:** Todos 1:1s da empresa atual (scoped) com filtros (líder, liderado, período, status). RH escaneia pulse global da empresa.
  - **Por par:** Lista pares (líder → liderado) com métricas (último 1:1, frequência, action items abertos); click abre histórico do par.
  - Preferência persiste por usuário (mesma estrutura que toggle Kanban/Tabela de Phase 2 — D-09 do CONTEXT 02 → reusar pattern).
- **D-17:** **RH pode adicionar nota interna RH.** Campo "Notas RH" no detalhe do 1:1, **invisível para líder e liderado**. Persistida em `one_on_ones.rh_notes` (coluna nova, TEXT, default NULL). RLS: SELECT/UPDATE só para roles `admin` e `rh`. **LGPD pragmático:** owner pediu "não se preocupe tanto com LGPD" — sem trilha formal de export pro colaborador. Risco registrado em deferred.

### 1:1: quebra do monólito 909 linhas (QUAL-04)

> Owner delegou a Claude.

- **D-18:** **Quebrar OneOnOneMeetingForm.tsx por seção**:
  - `OneOnOneAgenda.tsx` (~200 linhas) — pauta colaborativa + cronômetro por item
  - `OneOnOneNotes.tsx` (~250 linhas) — notas + transcrição Plaud + resumo Plaud
  - `OneOnOneActionItems.tsx` (~180 linhas) — checklist de action items com responsável + prazo
  - `OneOnOnePDIPanel.tsx` (~150 linhas) — integração com PDI (já parcialmente isolado)
  - `OneOnOneMeetingForm.tsx` (orchestrator, ~250 linhas) — layout, tabs/colunas, save/load, contexto sidebar
- **D-19:** **Custom hooks** extraídos: `useMeetingTimer`, `useAgendaState`, `useActionItemsState`, `usePlaudInput` (validação de paste). Cada subcomponente recebe state + handlers via props (composição), não duplica lógica.

### Onboarding WhatsApp (AUTH-01, AUTH-02, AUTH-03)

- **D-20:** **App mostra mensagem pronta + botão "Copiar tudo".** Após RH submeter cadastro de pessoa, modal/section mostra:
  ```
  Oi {Nome}! Bem-vindo à Lever.
  Acesse: https://app.levertalents.com/login
  Login: {email}
  Senha temporária: {ABC12xyz}
  Expira em 24h.

  Qualquer dúvida, fala comigo!
  — {nome do RH}
  ```
  Botão único "Copiar mensagem". RH abre WhatsApp pessoal, escolhe contato, cola, manda. **Sem campo de telefone obrigatório no cadastro** (owner escolheu fluxo de mínima fricção).
- **D-21:** **Senha temporária = 8 caracteres legíveis.** Edge Function gera string randômica de 8 chars do alfabeto `[a-z A-Z 2-9]` excluindo `0`, `O`, `o`, `1`, `l`, `I` (chars ambíguos). Persistida no Supabase auth via `auth.admin.createUser` com flag de força-troca.
- **D-22:** **Flag de força-troca** em `profiles.must_change_password BOOLEAN DEFAULT false` + `profiles.temp_password_expires_at TIMESTAMPTZ`. Cadastro novo seta ambos.
- **D-23:** **Tela dedicada bloqueante `/first-login-change-password`.** ProtectedRoute checa `must_change_password`; se true, redirect FORCE pra essa rota independente de qualquer outra navegação. Página é minimalista — só logo + form de nova senha (regra mínima 8 chars + confirmação). Após submit, flip flag pra false + redirect para `/`.
- **D-24:** **Senha temporária expirada (>24h) = entra mesmo assim, força troca na hora.** Owner aceitou tradeoff: flexibilidade > segurança máxima. Useful para casos "pessoa viajou e demorou 3 dias pra abrir WhatsApp". Implicação: senha temporária permanece válida indefinidamente até primeira troca. **Risco:** screenshot do WhatsApp 1 mês depois ainda permite acesso. Mitigação parcial: força troca imediata; logs de criação ficam em audit. Registrado em deferred como ponto pra revisitar se houver incidente.

### Migração de hooks pra useScopedQuery (PERF-04, PERF-07, ONE-*)

> Decisão técnica — Claude's Discretion. Padrão estabelecido em Phase 1 + 2.

- **D-25:** **Refactor mecânico em uma onda dedicada** (Wave do plano). Cada hook recebe queryKey com `scope.id` no início + WHERE no Supabase usando `useScopedQuery` helper. ESLint guard de Phase 1 já bloqueia `supabase.from()` fora de hooks/integrations — qualquer regressão falha CI.
- **D-26:** **Hooks que NÃO migram** (não são scoped por empresa):
  - `useUserProfile` — perfil do próprio user logado
  - `useAuth` — sessão Supabase
  - `useDeleteUser` — operação Admin global
  - `useTeams` (legado, será deprecated em Phase 4 Migration G)
  Os demais (~15) migram.

### Backfill E (Migration scope para esta fase)

> Decisão técnica — Claude's Discretion. Padrão expand→backfill→contract de Phase 2.

- **D-27:** **Owner provê dados antes do execute**: nomes/UUIDs das 7 empresas internas + nome oficial do "Grupo Lever" + lista de associações (qual sócio vê qual empresa). Sem isso, backfill não roda. Planner inclui "Provide owner inputs" como pré-condição da migration.
- **D-28:** **Conversão `teams` → `org_units`**: cada team vira 1 org_unit no nível 1 abaixo da raiz da empresa correspondente. `org_unit_members` = membros do team; `unit_leaders` = leader do team. Tabela `teams` permanece read-only (ORG-09) — drop em Phase 4 Migration G.
- **D-29:** **Conversão `user_roles` role='socio' → `socio_company_memberships`**: para cada user com role='socio', criar 1+ linha em `socio_company_memberships(socio_user_id, company_id)` baseado no input do owner.

### Claude's Discretion

Áreas em-escopo de Phase 3 onde a discussão delegou para o planner. Padrões já estabelecidos em Phases 1 e 2.

- **Toast positions/durations** — manter sugestão Phase 2 (top-right, 4s default, 8s pra erros)
- **Loading skeletons** específicos para listas de avaliações/clima/1:1 — 3 linhas placeholder com mesma altura do item real
- **Animações** entre estados (criar ciclo, abrir 1:1, etc) — `framer-motion` ou CSS transforms (verificar se já no bundle)
- **Persistência de toggle "Lista geral / Por par"** — localStorage namespaced (`leverup:perf:one-on-ones-view`), pattern do Phase 2
- **Schedule do cron** que fecha ciclos expirados — diário às 03:00 BR (`pg_cron` 0 3 * * *)
- **Notificação ao liderado** quando RH adiciona nota (D-17): NÃO existe (justamente para preservar invisibilidade); planner pode confirmar com owner se quiser pelo menos um log silencioso
- **CSV export de evaluations PRÉ-drop** — owner explicitou que NÃO quer; planner não cria

### Folded Todos

Nenhum — `gsd-sdk query todo.match-phase 3` retornou 0 matches.

### Scope Changes

**Pulled into Phase 3 from backlog:**
- **V2-05 (Templates de avaliação customizáveis por empresa):** Owner escolheu "Template por empresa + override por ciclo" em vez de "global default". Implica: V2-05 deixa de ser deferred e vira parte de v1 nesta fase. **Atualizar REQUIREMENTS.md:** marcar V2-05 como pulled to Phase 3 (sugestão: novo REQ-ID `PERF-08` ou re-tag).

**Removed from this phase:**
- **AF-09 lock continua intacto:** AI para escrever feedback continua out-of-scope. Resumo Plaud é paste manual (Plaud gera, não app).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project-level requirements
- `.planning/PROJECT.md` — Core value, locked decisions (Performance ciclos por empresa; clima 100% anônima; 1:1 com badge RH visível; senha temporária + WhatsApp em vez de email; folha = soma de salários cadastrados; sem features novas grandes; sem AI generativa pra feedback)
- `.planning/REQUIREMENTS.md` §AUTH (5 reqs), §PERF (7 reqs), §ONE (6 reqs), §QUAL-04 (quebra de monolíticos) — Phase 3 mapping: AUTH-01/02/03 + PERF-01..07 + ONE-01..06 = 16 reqs. **NOTA:** V2-05 puxado para Phase 3 (templates por empresa) — REQUIREMENTS precisa update.
- `.planning/ROADMAP.md` §"Phase 3: Performance Refactor" — Goal, success criteria (5 pontos), dependências de Phase 1 + Phase 2, migration coverage Backfill E, research flag (templates customizáveis confirmado: SIM, antecipa V2-05)
- `.planning/STATE.md` — Locked decisions, pendência: "Confirmar com owner se template global default é suficiente" — **RESOLVIDA nesta sessão: NÃO, owner escolheu template por empresa**

### Research / Codebase context (Performance relevante)
- `.planning/codebase/ARCHITECTURE.md` — Performance module structure, hooks pattern, Edge Functions
- `.planning/codebase/CONCERNS.md` — `OneOnOneMeetingForm.tsx` 909 linhas + `EvaluationForm.tsx` 773 + `OneOnOnes.tsx` page 621 (alvos QUAL-04). PII em `console.log` (já mitigado em Phase 1 via `logger.ts`). RLS gaps (já mitigado em Phase 1 helpers)
- `.planning/codebase/CONVENTIONS.md` — React Query queryKey patterns, `useScopedQuery` chokepoint (Phase 1)
- `.planning/codebase/INTEGRATIONS.md` — Supabase project `ehbxpbeijofxtsbezwxd`, Realtime channels, Storage buckets (1:1 audio_url)
- `.planning/codebase/STACK.md` — Stack atual; **NÃO upgrade Zod 3→4**

### Working guide
- `leverup-talent-hub/CLAUDE.md` — Stack locked, conventions, current phase

### Phase 1 lock (downstream foundation)
- `.planning/phases/01-tenancy-backbone/01-CONTEXT.md` — Decisões de scope selector + `useScopedQuery` que TODA query de Phase 3 deve usar (queryKey inclui `scope.id`); `org_unit_descendants` helper para visibility de líder; `socio_company_memberships` schema para Backfill E
- `.planning/research/ARCHITECTURE.md` — Pattern expand→backfill→contract; RLS helpers `STABLE SECURITY DEFINER`

### Phase 2 lock (downstream pattern)
- `.planning/phases/02-r-s-refactor/02-CONTEXT.md` — Padrão de migration F (expand→backfill→contract em 4 sub-migrations); pattern de RPC `read_x_with_log` (precedente para `read_one_on_one_with_log` se planner decidir aplicar a 1:1 com nota RH); pattern de `data_access_log` append-only

### Schema legado relevante
- `supabase/migrations/20251009195041_*.sql` linha 200-212 — `climate_responses` com coluna `user_id` (PRECISA DROP em Phase 3 — D-09)
- `supabase/migrations/20251010134452_*.sql` linha 45-49 — `one_on_ones.audio_url` + `meeting_structure` JSONB (extender em Phase 3 — D-14)
- `supabase/migrations/20260422120000_oneonones_status_add_processing.sql` — status enum atual de 1:1
- `src/integrations/supabase/types.ts` — auto-gen, regenerar após cada migration nova de Phase 3

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets (Performance)
- **`src/hooks/useEvaluations.ts`** (137 linhas) — Reescrever: queryKey vira `["evaluations", scope.id, cycleId?]`; usa `useScopedQuery`; remove `period: string` interface, adiciona `cycle_id`. Mutation `createEvaluation` valida `evaluator_user_id` + `direction`.
- **`src/hooks/useClimateSurveys.ts`** (213 linhas) — Reescrever: queryKey scoped; agregação via RPC nova `get_climate_aggregate`; submit response sem `user_id` no payload (D-11). Drop coluna user_id da tabela.
- **`src/hooks/useClimateOverview.ts`** — Reescrever scoped; aplicar k-anonymity (D-10).
- **`src/hooks/useOneOnOnes.ts`** (117 linhas) — Reescrever scoped; estender com filtros (líder, liderado, período, status); estender mutation com Plaud fields no `meeting_structure`.
- **`src/components/OneOnOneMeetingForm.tsx`** (909 linhas) — Quebrar conforme D-18: `OneOnOneAgenda` + `OneOnOneNotes` + `OneOnOneActionItems` + `OneOnOnePDIPanel` + orchestrator. Adicionar 2 textareas Plaud + nota RH (visibility por role).
- **`src/components/EvaluationForm.tsx`** (773 linhas) — Refatorar: form gerado dinamicamente do `template_snapshot` JSON; quebrar em `EvaluationFormSection` + `EvaluationFormQuestion` + orchestrator. Validação Zod gerada do schema.
- **`src/pages/Evaluations.tsx`** (380 linhas) — Lista de ciclos da empresa atual + cards por ciclo + drill-down em ciclo (mostra avaliações + status). Botão "Criar ciclo" abre dialog (escolhe template + nome + janela).
- **`src/pages/OneOnOnes.tsx`** (621 linhas) — Aplicar toggle "Lista geral / Por par" (D-16); preferência persiste; refatorar pra usar componentes menores.
- **`src/pages/Climate.tsx`** (343 linhas) — Refatorar para usar agregação k-anonymity (D-10); não exibir buckets <3 respostas.
- **`src/pages/CreateUser.tsx`** (346 linhas) — Reescrever fluxo: substitui `auth.signUp` por chamada a Edge Function nova (cria user + flag must_change + temp password); pós-submit mostra modal/section com mensagem pronta + botão "Copiar".
- **`src/hooks/useAudioTranscription.ts`** — Permanece (D-13); fluxo legacy de gravação no app.
- **`src/hooks/usePDIIntegrated.ts`** + **`src/components/PDIFormIntegrated.tsx`** + **`src/components/PDIReviewCard.tsx`** — Tocar levemente (queryKey scoped); estrutura PDI já isolada.

### Estabelecidos Patterns (de Phase 1 + 2)
- **`useScopedQuery`** chokepoint — TODA query de Performance vai por aqui (D-25). ESLint guard ativo.
- **Forms** com `react-hook-form` 7.73 + `@hookform/resolvers` 5.2.2 + Zod 3.25 — sem `as any` casts. Forms de avaliação geram resolver dinamicamente do template snapshot (D-07).
- **Optimistic mutation** com `onMutate` (cancelQueries + getQueryData + setQueryData) → `onError` (rollback) → `onSettled` (invalidate). Aplicar em saveEvaluation (PERF-07) e moveActionItem.
- **RLS** com helpers `visible_companies`, `visible_org_units`, `org_unit_descendants` (Phase 1) — toda policy nova de evaluation_cycles, evaluation_templates, climate_responses, one_on_ones, profiles usa esses helpers.
- **Migration pattern** expand→backfill→contract (Phase 2 F) — Phase 3 segue: 1ª migration cria nova schema (cycles, templates, snapshot col); 2ª migration backfill (Backfill E); 3ª migration contract (drop period column, drop climate_responses.user_id, drop unused).
- **Edge Function** `apply-to-job` (Phase 2) é precedente; criar Edge Function nova `create-user-with-temp-password` para D-20/D-21/D-22.
- **`auth.admin` API** (já usada em Phase 2 user delete, em `useDeleteUser`) — usar pra criar user + setar flag.

### Integration Points (Migrations Phase 3)
- **`supabase/migrations/`** — Backfill E + Phase 3 schema. Sugestão de ordem (timestamp `20260429...`):
  1. `20260429120000_e1_company_groups_seed.sql` — Grupo Lever + 7 empresas (input owner)
  2. `20260429120100_e2_teams_to_org_units_backfill.sql` — converte teams → org_units 1:1
  3. `20260429120200_e3_socios_to_memberships.sql` — converte user_roles role=socio → memberships
  4. `20260429130000_perf1_evaluation_cycles_and_templates.sql` — schema novo (evaluation_cycles + evaluation_templates + colunas em evaluations)
  5. `20260429130100_perf2_drop_evaluations_history.sql` — TRUNCATE evaluations + drop period column (D-08)
  6. `20260429140000_clim1_drop_user_id_from_responses.sql` — drop coluna user_id (D-09)
  7. `20260429140100_clim2_aggregate_rpc.sql` — RPC k-anonymity (D-10)
  8. `20260429150000_one1_one_on_ones_extensions.sql` — extend meeting_structure schema docs + add `rh_notes` column (D-17)
  9. `20260429160000_auth1_must_change_password.sql` — add columns em profiles (D-22)
- **`supabase/functions/create-user-with-temp-password/`** — nova Edge Function (D-20 a D-23)
- **`src/integrations/supabase/types.ts`** — regerar após cada migration aplicada
- **pg_cron** — adicionar job pra auto-fechar ciclos expirados (D-01) + check expiry de temp password (D-22 não requer cron, é check on-login)

### Tests (Vitest + RTL + MSW + pgTAP) — Wave 0 setup
- **Vitest unit:**
  - `evaluation_template_snapshot` (mudar template não muda ciclo aberto)
  - `passwordGenerator.ts` (8 chars, sem ambíguos, randomness)
  - `climateAggregation.ts` (k-anonymity ≥3 retorna data, <3 retorna insufficient)
- **RTL integration:**
  - Criar ciclo + verificar template snapshot freezed
  - Submeter avaliação + visibility por role
  - 1:1 form: paste Plaud, RH note não aparece para liderado, badge "RH visível" presente
  - First login: redirect forçado pra /first-login-change-password
- **MSW:** mocks de Edge Function `create-user-with-temp-password` e RPC `get_climate_aggregate`
- **pgTAP:**
  - Backfill E rodou corretamente (7 companies + Grupo Lever existem; teams convertidos sem perda; socios mapeados)
  - `climate_responses` sem coluna `user_id`
  - Trigger snapshot freezed (UPDATE em template não muda ciclos abertos)
  - RLS: liderado não vê `rh_notes` (D-17)

</code_context>

<specifics>
## Specific Ideas

- **Owner é founder, não dev** — todas decisões aqui foram apresentadas em linguagem de produto, sem jargão técnico. Implementação é responsabilidade de Claude (planner/executor), não do owner.
- **Modelo mental dos ciclos:** "RH abre Q1 2026 pra Empresa X, escolhe template, define janela. Ciclo dura sozinho. Quando acabar, fecha sozinho. Ciclo de outra empresa não interfere." — sem janela global sincronizada (PROJECT.md AF-06).
- **Clima 100% anônima é não-negociável.** Owner explicitou que sinceridade > rastreabilidade. Drop de `user_id` é decisão definitiva.
- **Plaud paste-only** — owner usa o app Plaud (gravador físico) que já gera transcrição + resumo. App Lever só recebe via paste. Não tenta competir com Plaud.
- **WhatsApp como canal oficial pra credenciais** — email é fricção real para liderado BR; owner já validou na operação. Mensagem pronta + botão Copiar é o fluxo.
- **Senha vencida ainda permite entrar** — owner aceitou tradeoff de flexibilidade vs segurança máxima. "Pessoa pode ter viajado, demorado 3 dias. Não quero bloquear."
- **Nota RH em 1:1 é pragmática** — owner pediu "não se preocupe tanto com LGPD". Nota é só para RH, sem trilha formal de export. Se ANPD demandar no futuro, revisita.
- **Drop histórico de evaluations é definitivo** — owner pediu "start fresh", sem backup. Aceita o tradeoff.

</specifics>

<deferred>
## Deferred Ideas

### Risco LGPD: nota RH em 1:1 (D-17)
- Owner pediu pragmatismo: "não se preocupe tanto com LGPD". Sem trilha formal de export pro colaborador.
- **Revisitar SE:** ANPD audita, ou colaborador reclama, ou app expandir pra clientes externos com requisitos contratuais de LGPD strict.
- **Quando revisitar:** após v1 estável; ou em milestone v2 se houver demanda.

### Risco operacional: drop histórico de evaluations sem backup explícito (D-08)
- Owner explicitou "não preciso desse histórico". Sem CSV export antes do TRUNCATE.
- **Mitigação atual:** point-in-time recovery do Supabase (7 dias) — janela apertada.
- **Risco:** se owner mudar de ideia depois de 7 dias do drop, dados perdidos definitivos.
- **Revisitar SE:** algum stakeholder (sócio, RH, colaborador) pedir histórico antigo.

### Risco segurança: senha temporária expirada ainda permite login (D-24)
- Owner escolheu flexibilidade > segurança máxima.
- **Risco:** screenshot de WhatsApp 1 mês depois ainda funciona (se a pessoa nunca entrou).
- **Mitigação parcial:** força troca imediata; logs de criação ficam em audit.
- **Revisitar SE:** incidente de acesso indevido por screenshot vazado.

### Reativação manual de conta após N tentativas falhas
- Não implementado nesta fase. Login normal continua sem rate-limit dedicado a temp password.
- **Revisitar SE:** observar tentativas de bruteforce em senhas curtas (8 chars = ~3.5 trilhões de combos, mas vale auditar).

### UI completa de gestão de templates por empresa
- D-05/D-07 cobrem schema + form gerado dinamicamente, mas UI completa de "RH cria/edita templates da empresa antes de criar ciclo" pode ser parcial nesta fase.
- **Trade-off:** se UI completa estoura escopo de Phase 3, planner pode entregar template default seedado + UI de criar ciclo escolhendo template. Edição/CRUD de templates fica em Phase 4 polish.

### CSV export de avaliações para owner (post-mortem do drop)
- Owner pediu sem backup; mas se mudar de ideia, poderia ser útil exportar dados ANTES do drop pra arquivo offline.
- **Não implementar nesta fase.** Apenas anotar como rota de contingência.

### Reviewed Todos (not folded)
- Não aplicável — `gsd-sdk query todo.match-phase 3` retornou 0 matches.

### Mantidos como deferred do roadmap (sem mudança nesta fase)
- **V2-02 (full-text search no Banco de Talentos)** — não é Phase 3
- **V2-03 (PDI como entidade de 1ª classe)** — Phase 3 toca PDI levemente; PDI continua sub-entidade
- **V2-06 (virtualization no kanban)** — não é Phase 3
- **V2-07 (cross-job realtime)** — não é Phase 3

</deferred>

---

*Phase: 03-performance-refactor*
*Context gathered: 2026-04-28*
