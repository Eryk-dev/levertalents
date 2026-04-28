# Phase 2: R&S Refactor - Context

**Gathered:** 2026-04-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Esta fase entrega o **refactor de Recrutamento & Seleção**: kanban de candidatos estável (fecha o bug #1 do projeto), drawer aninhado preservando contexto do board, Banco de Talentos LGPD-compliant, e os ganhos do UX-AUDIT-VAGAS (sparkbar de distribuição, indicador de SLA, filtros inline, encerradas colapsadas, card enriquecido). Cobre 20 requisitos de v1 (RS-01..10, RS-12 + TAL-01..09) + Migração F (`data_access_log` generalizado + RPC `read_candidate_with_log` + normalização de stages legados).

**Em escopo:**
- Estabilização do kanban: optimistic update com rollback + `canTransition` validado **antes** de `mutate` + diferenciação de erros (RLS denial / network / conflict / canTransition reject)
- Realtime per-jobId atualizando o board quando outro RH move candidato (silent re-render, sem aviso)
- Migração F: normalização de stages legados (`aguardando_fit_cultural`, `sem_retorno`, `fit_recebido`) → 6 grupos consolidados; tabela `data_access_log` append-only; RPC `read_candidate_with_log(id, context)`; pg_cron para retenção 36 meses
- Banco de Talentos LGPD: tabela `candidate_consents` (granular por purpose/legal_basis/expires_at/revoked_at) + opt-in não pré-marcado no fluxo de candidatura + revogação por candidato OU RH em nome dele
- Card de candidato e card de vaga enriquecidos conforme UX-AUDIT (densidade configurável + SLA visual + sparkbar)
- Toggle Kanban ↔ Tabela com ordenação (puxa V2-01 do backlog pra dentro de Phase 2 — vide Scope Changes)
- CPF como chave canonical de dedup complementar a email
- Drawer aninhado de candidato dentro do kanban (já existe — refinar conforme decisões)
- Filtros inline acima do board; vagas encerradas em seção colapsada por default

**Fora desta fase:**
- **RS-11 (vaga confidencial)** — usuário decidiu remover do escopo na sessão de discuss (vide Scope Changes). Volta como decisão futura.
- Onboarding por WhatsApp (AUTH-01/02/03 — Phase 3)
- Reescrita dos hooks de Performance pra `useScopedQuery` (Phase 3)
- Migração G (contract: drop helpers antigos) — Phase 4
- SLA customizável por empresa/vaga — fica como v2 (Phase 2 entrega global)
- Cross-job realtime (Phase 2 entrega per-jobId apenas — V2-07 fica deferred)
- Virtualização do kanban (`@tanstack/react-virtual`) — V2-06, só pull-in se volume médio confirmar >100 candidatos por vaga

</domain>

<decisions>
## Implementation Decisions

### Bug #1: estabilização do kanban (RS-03, RS-04, RS-12)

- **D-01:** Estratégia otimista com **rollback automático**. Quando dá erro ao mover candidato (network drop, RLS denial, conflict, transição inválida), o card desliza de volta pra coluna de origem **automaticamente** e aparece um toast explicando o que aconteceu. Não pergunta, não fica no limbo.
- **D-02:** `canTransition()` é chamado **ANTES** de `mutate()` — corrige a chamada faltante em `CandidatesKanban.tsx:252`. Transição inválida nem chega ao servidor; toast local explica "Não é possível mover de X pra Y".
- **D-03:** Conflito (dois RHs movem o mesmo candidato no mesmo segundo): **last-writer-wins**. O segundo movimento prevalece; o primeiro recebe toast "{nome} moveu {candidato} pra {nova etapa}" via Realtime. Sem locks otimistas, sem version tokens — simples e raro na prática.
- **D-04:** Realtime subscribe per `jobId` quando alguém move candidato remotamente: **silent re-render** — card desliza suave pra nova coluna, sem toast nem flash. Menos ruído no dia a dia.
- **D-05:** **Mensagens de erro diferenciadas por tipo** — cada um tem causa e ação distinta:
  - **RLS denial / sem permissão:** "Você não tem permissão pra mover esse candidato" (sem ação sugerida — não vai funcionar mesmo)
  - **Network drop:** "Sem conexão. Tentando de novo automaticamente..." (com retry com backoff até 3 tentativas, depois fail explícito)
  - **Conflict (outro RH moveu antes):** "{nome} acabou de mover {candidato}. O card foi atualizado." (sem retry — a verdade é a do servidor)
  - **canTransition reject:** "Não é possível mover de '{stage_from}' direto pra '{stage_to}'" (sugere caminho válido se houver)
- **D-06:** Reusar `src/lib/supabaseError.ts` (já centraliza tradução de erros Postgrest com prefix `[RLS]` pra 42501) como base; estender pra cobrir os 4 tipos acima com helpers nomeados.

### Card de candidato + card de vaga + SLA visual (RS-08, RS-10, UX-AUDIT-VAGAS §4.1, §4.2)

- **D-07:** **Mínimo fixo no card de candidato** = nome + cargo pretendido + dias na etapa atual + vaga em concorrência. Esses 4 sempre aparecem.
- **D-08:** **Card customizável** — usuário pode adicionar/remover campos opcionais (avatar, próxima entrevista data/hora, ícones CV/Fit com score, ponto de status do background check, tags de origem). Persistência da preferência por usuário (localStorage no v1; pode evoluir pra `user_preferences` table depois).
- **D-09:** **Toggle Kanban ↔ Tabela** com ordenação na tabela (sort por nome, dias na etapa, próxima entrevista, etapa). Persistência da última view escolhida por usuário. **Atenção:** isso puxa o requisito V2-01 do backlog pra dentro da Phase 2 — REQUIREMENTS.md precisa ser atualizado.
- **D-10:** **SLA de tempo na etapa** — 2 dias = laranja, 5 dias = vermelho. Aplicado globalmente (todas as empresas e vagas iguais). Implementação: cor de borda/badge no card + reusar lógica de `BottleneckAlert.tsx` como precedente. SLA por empresa/vaga fica como v2.
- **D-11:** **Sparkbar de distribuição no card de VAGA** — cores por intencionalidade do funil:
  - Verde = aprovados / em decisão / em admissão / admitidos (final positivo)
  - Amarelo = qualquer etapa de entrevista (RH ou final)
  - Azul = triagem + fit cultural + checagem (movimento inicial)
  - Vermelho = recusados / descartados (final negativo)
  Quem olha de longe entende rapidinho onde está a ação.

### Claude's Discretion

Áreas em-escopo de Phase 2 onde a discussão delegou para o planner com base em research, codebase patterns, e REQUIREMENTS.md já locked. O planner registra a decisão final no PLAN.md.

**Não discutidas explicitamente nesta sessão (REQUIREMENTS já lock):**

- **LGPD consent flow (TAL-03/04/06/08):** REQUIREMENTS.md já especifica: tabela `candidate_consents` (purpose, legal_basis, expires_at, revoked_at, granted_at, granted_by); opt-in **não pré-marcado** no `PublicApplicationForm.tsx`; finalidades granulares no mínimo: "incluir-no-banco-de-talentos-global", "compartilhar-com-cliente-externo", "manter-cv-pos-recusa". Revogação acessível tanto via UI do candidato (token-based link, futuro) quanto via UI do RH (botão "revogar consent" no drawer do candidato — disponível em v1). Anonimização (destrutivo) e revogação (preserva histórico mas remove visibilidade) são fluxos separados — `useAnonymizeCandidate` permanece pra direito de exclusão LGPD; revogação é fluxo novo. Planner desenha as duas UIs.

- **Data access log (TAL-05/06/07):** Tabela `data_access_log` (entity_type, entity_id, action, scope_company_id, context, actor_id, at) append-only; RPC `read_candidate_with_log(id, context)` é o único caminho de leitura de PII. Triggers BEFORE READ não existem em Postgres — log acontece dentro da RPC explicitamente. pg_cron job rodando weekly pra DELETE WHERE at < now() - interval '36 months'. Planner define schedule exato.

- **CPF como dedup canonical (TAL-09):** Constraint `UNIQUE` em `candidates.cpf` (nullable; NULL não-único quando candidato externo sem CPF informado). Quando RH adiciona candidato manualmente, busca por CPF antes de criar — se existe, oferece merge (reusar `DuplicateCandidateDialog.tsx` como precedente). Email como secundário fallback.

- **Migração F (RS-05/06):** Strategy expand-backfill-contract.
  1. **Expand:** adicionar coluna `applications.stage_v2` mapeada via SQL function que faz lookup nos 6 grupos consolidados de `stageGroups.ts`.
  2. **Backfill:** UPDATE em batch (1000 rows por vez, monitor lock contention) preenchendo `stage_v2` baseado em `stage` legado. `aguardando_fit_cultural` → `fit_cultural`, `sem_retorno` → `triagem` (com tag `sem_retorno_legacy` em `metadata` JSONB pra preservar contexto), `fit_recebido` → `fit_cultural`.
  3. **Cutover:** flip leitor pra `stage_v2`, manter `stage` como compat read.
  4. **Contract:** dropa `stage` na Phase 4 (Migration G) após 1+ semana de estabilidade.

  Pgtap test: zero candidatos órfãos (sem mapping válido) após backfill.

- **Filtros inline (RS-09):** `PipelineFilters.tsx` já existe — refinar pra inline (não modal); state via URL (`?vaga=X&fase=Y&source=Z`) pra ser compartilhável; debounce 300ms na busca textual.

- **Encerradas colapsadas (RS-10):** Section header "Vagas encerradas (12)" colapsada por default; expand persiste por sessão (não localStorage). Reusar `src/components/ui/Collapsible.tsx`.

- **Drawer aninhado (RS-07):** `CandidateDrawer.tsx` (867 linhas) já existe — quebrar em sub-componentes (parte do critério QUAL-04) durante a fase: `CandidateDrawerHeader` (avatar+ações), `CandidateDrawerTabs` (CV/Entrevistas/Fit/Histórico), `CandidateDrawerContent` (conteúdo da tab ativa). Largura 480px desktop, full-width mobile (slide-up). Fecha via ESC ou clique fora; preserva scroll do kanban atrás.

**Mini-decisões (planner decide via convenção):**

- Toast positions e durations (sugestão: top-right, 4s default, 8s pra erros)
- Loading skeleton específico do card no board (sugestão: 3 linhas placeholder com mesma altura do card real)
- Badge "RH visível" / "confidencial" usa `Chip` do Linear design system
- Animação do card movendo entre colunas: `framer-motion` (já no bundle? verificar) ou CSS-only com `transform`
- Persistência do toggle Board/Tabela: localStorage namespaced (`leverup:rs:view`)

### Folded Todos

Nenhum — `gsd-sdk query todo.match-phase 2` retornou 0 matches.

### Scope Changes

**Removed from Phase 2 scope (deferred):**
- **RS-11 (vaga confidencial):** Usuário pediu na sessão de discuss pra remover. Move pra v2 (criar V2-08) ou pra "Out of Scope" se decisão for definitiva. Implica:
  - REQUIREMENTS.md: marcar RS-11 como deferred/v2
  - ROADMAP.md Phase 2 success criteria: remover ponto 3 sobre "vaga `confidencial = true` é invisível" (ou anotar como out-of-scope)
  - CONCERNS.md flag sobre `cultural_fit_responses` confidentiality gate continua aberto, mas não é bloqueante de Phase 2

**Pulled into Phase 2 from backlog:**
- **V2-01 (toggle Board ↔ Tabela com sort):** Usuário pediu "editar a view, tanto das infos do card quanto de kanban para tabela, com sort também". REQUIREMENTS.md: mover V2-01 pra v1 com novo REQ-ID (sugestão: RS-13). Vide D-09 acima pra detalhamento.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project-level requirements
- `.planning/PROJECT.md` — Core value, locked decisions (Banco global cruzando empresas; LGPD com consent + audit; refactor sem features novas grandes; CPF dedup; sem onboarding por email)
- `.planning/REQUIREMENTS.md` §"Recrutamento & Seleção (RS)" + §"Banco de Talentos (TAL)" — REQ-IDs Phase 2: RS-01..12 (12 reqs) + TAL-01..09 (9 reqs). **NOTA:** RS-11 movido pra deferred nesta sessão; V2-01 puxado pra Phase 2 como RS-13.
- `.planning/ROADMAP.md` §"Phase 2: R&S Refactor" — Goal, success criteria (5 pontos), dependências de Phase 1, migration coverage F, research flag (calibrar volume médio antes de decidir virtualization)
- `.planning/STATE.md` — Locked decisions, pendência: "Calibrar volume médio de candidatos por vaga com RH" (Phase 2 research flag — defer virtualization a v2 por default)

### Research (architecture + pitfalls)
- `.planning/research/ARCHITECTURE.md` — Migration F pattern (expand → backfill → contract); RLS helpers `STABLE SECURITY DEFINER` (já em produção pós Phase 1)
- `.planning/research/PITFALLS.md` §P2 (Bug do kanban com 3 causas raiz superpostas — atacado nesta fase) + §P5 (LGPD Banco de Talentos sem consentimento granular — mitigado nesta fase)
- `.planning/research/STACK.md` — TanStack Query v5 patterns (optimistic update, partial-key invalidation), `dnd-kit` (já no bundle); pgTAP test convention

### Codebase context (R&S relevante)
- `.planning/codebase/ARCHITECTURE.md` — Hiring module structure, hooks pattern, Edge Functions (`apply-to-job`, `hiring-cron-*`)
- `.planning/codebase/CONCERNS.md` §"Known Bugs" — `sem_retorno` órfão no `STAGE_GROUPS`; alta churn no hiring module (8+ commits/semana); RLS gap em `cultural_fit_responses` confidential — **nota: gap continua aberto mas RS-11 está deferred** ; **CandidateProfile 1169 linhas** monolítico (quebrar quando tocar nesta fase — QUAL-04)
- `.planning/codebase/CONVENTIONS.md` — React Query queryKey patterns, `useScopedQuery` chokepoint (Phase 1), form patterns
- `.planning/codebase/INTEGRATIONS.md` — Supabase project `ehbxpbeijofxtsbezwxd`, Realtime channels existentes
- `.planning/codebase/STACK.md` — Stack atual; **NÃO upgrade Zod 3→4** (incompatível com `@hookform/resolvers` 5.2.2)
- `.planning/codebase/TESTING.md` — Setup Vitest+RTL+MSW (Phase 1); pgTAP convention pra Migration F

### Working guide
- `leverup-talent-hub/CLAUDE.md` — Stack locked, conventions, current phase

### External (UX inputs)
- `/Users/eryk/Documents/APP LEVER TALETS/UX-AUDIT-VAGAS.md` — **input principal de UX desta fase**. F1-F12 friction points; §3 arquitetura recomendada (Kanban de Vagas + drawer aninhado); §4 melhorias (card de vaga enriquecido, card de candidato denso, drawer 420-480px, colunas consolidadas 16→6); §5 plano de implementação Sprints 1-4 com prioridades

### Phase 1 lock (downstream foundation)
- `.planning/phases/01-tenancy-backbone/01-CONTEXT.md` — Decisões de scope selector + `useScopedQuery` que TODA query de Phase 2 deve usar (queryKey inclui `scope.id`)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`src/components/hiring/CandidatesKanban.tsx`** — É **o** kanban onde o bug #1 mora. Receber as decisões D-01 a D-06. Linha 252 é onde `canTransition` está faltando. Quebrar em sub-componentes se ficar monolítico após refactor.
- **`src/components/hiring/CandidateCard.tsx`** — Receber decisões D-07 (mínimo fixo) e D-08 (customizável). Atualmente usa `<Link>` (ainda? verificar) — passa pra `onClick` que abre drawer.
- **`src/components/hiring/CandidateDrawer.tsx`** (867 linhas) — Já existe; **quebrar em sub-componentes durante esta fase** (QUAL-04 critério): `Header`, `Tabs`, `Content`. Drawer largura 480px desktop, full-width mobile.
- **`src/components/hiring/JobsKanban.tsx`** — Já implementado per UX-AUDIT-VAGAS Sprint 2; receber sparkbar (D-11) no card de vaga. Conferir se está usando `useScopedQuery`.
- **`src/components/hiring/JobCard.tsx`** — Onde a sparkbar mora; precisa receber agregação `applications.count by stage_group group by job_opening_id` via novo hook ou estender `useApplicationCountsByJob.ts`.
- **`src/components/hiring/PipelineFilters.tsx`** — Refinar pra inline (não modal); URL como fonte de verdade dos filtros.
- **`src/components/hiring/BottleneckAlert.tsx`** — Precedente de lógica de SLA visual (parado >X dias). D-10 reusa essa lógica nos cards.
- **`src/components/hiring/DuplicateCandidateDialog.tsx`** — Precedente de dedup UI. Estender pra incluir CPF como chave canonical (TAL-09).
- **`src/lib/hiring/stageGroups.ts`** — Mapping 16→6 já existe; Migration F precisa garantir que todo legacy stage está mapeado (corrige fragilidade flagged em CONCERNS.md).
- **`src/lib/hiring/statusMachine.ts`** — `APPLICATION_STAGE_TRANSITIONS` + `canTransition()`. D-02 garante chamada antes do mutate.
- **`src/lib/hiring/retention.ts`** — Já existe; conferir se cobre os 36 meses LGPD ou se precisa estender pra `data_access_log`.
- **`src/lib/hiring/rlsScope.ts`** — Helpers Phase 1 (`is_people_manager`, `allowed_companies` legacy + `visible_companies` novo). Phase 2 reusa.
- **`src/lib/supabaseError.ts`** — Centraliza tradução de erros Postgrest. Estender pra os 4 tipos de erro de D-05.
- **`src/hooks/hiring/useApplications.ts`** — Mutation `moveApplicationStage` é onde D-01..D-05 aterrissam (optimistic update + onMutate + setQueryData + cancelQueries + onError rollback + onSettled invalidate).
- **`src/hooks/hiring/useTalentPool.ts`** — Já existe; estender pra filtrar `candidate_consents` ativo + não revogado + não expirado (TAL-04, TAL-08).
- **`src/hooks/hiring/useCandidateConversations.ts`** — Já existe (Banco de Talentos delivery anterior); precedente de hook scoped.
- **`src/hooks/hiring/useApplicationCountsByJob.ts`** — Estender pra retornar contagem **por stage_group**, não só total — alimenta sparkbar (D-11).

### Established Patterns
- **TanStack Query v5 optimistic update** — pattern padrão: `onMutate` (cancelQueries + getQueryData + setQueryData) → `onError` (setQueryData rollback) → `onSettled` (invalidate). Phase 1 já usa em queries de scope; Phase 2 expande pra mutations de stage.
- **`useScopedQuery` chokepoint** — TODA query nova de Phase 2 vai por aqui. ESLint guard QUAL-07 já bloqueia `supabase.from()` fora de `hooks/`.
- **`react-hook-form` 7.73 + `@hookform/resolvers` 5.2.2 + Zod 3.25** — sem `as any` casts. Form de revogação de consent + form de candidatura externa seguem esse pattern.
- **Realtime via Supabase** — `useEffect` com `supabase.channel('public:applications').on('postgres_changes', filter: jobId, ...)`. Cleanup no unmount. Cuidado pra não criar canal por re-render.
- **`@dnd-kit/core` + `@dnd-kit/sortable`** — já no bundle (UX-AUDIT 4.4 confirmou). Reorder dentro da coluna usa `sortable`.
- **Edge Functions** — `apply-to-job` é o ponto onde o opt-in não pré-marcado precisa ser persistido em `candidate_consents` na criação inicial da application.

### Integration Points
- **`supabase/migrations/`** — Migration F adiciona: `data_access_log` table, `read_candidate_with_log` RPC, `candidate_consents` table (se não criado em delivery anterior — verificar), `applications.stage_v2` column + backfill SQL function. Próxima timestamp: `20260428...`.
- **`supabase/functions/apply-to-job/`** — Persistir `candidate_consents` na submission do form externo.
- **`src/integrations/supabase/types.ts`** — Auto-generated; regerar após cada migration nova.
- **`src/integrations/supabase/hiring-types.ts`** — Tipos canonical de hiring; expandir com `Consent`, `DataAccessLogEntry`.
- **`src/pages/hiring/CandidatesKanban.tsx`** + **`src/pages/hiring/CandidateProfile.tsx`** (1169 linhas — quebrar) — Páginas que orquestram os componentes acima.
- **pg_cron** — adicionar job pra retenção (delete from data_access_log where at < now() - interval '36 months'). Schedule weekly default.

### Tests (Vitest + RTL + MSW + pgTAP)
- **Vitest unit:** `canTransition()` exhaustive table; `stageGroups` mapping (todo legacy stage tem mapping); `supabaseError.ts` tradução por tipo
- **RTL integration:** kanban move (otimista + rollback + last-writer-wins via mock realtime); card customization (toggle de campos persiste); toggle Board/Tabela
- **MSW:** mock dos 4 tipos de erro (RLS 42501 / network drop / conflict 409 / canTransition pre-check) + mock de Realtime channel
- **pgTAP:** zero candidatos órfãos pós Migration F backfill; `read_candidate_with_log` registra log corretamente; `candidate_consents` constraint integrity (revoked_at >= granted_at)

</code_context>

<specifics>
## Specific Ideas

- **Modelo mental do owner pro kanban estável:** "card volta sozinho com aviso" — sem deadlock de pergunta, sem candidato fica no limbo. Otimista de verdade, igual Linear.
- **SLA agressivo (2/5 dias):** alinhado com expectativa de SLA contratual de R&S externo. Mostra urgência sem ser exagerado.
- **Card customizável:** owner quer flexibilidade — cada usuário ajusta a densidade visual conforme prefere; mínimo fixo (nome+cargo+dias+vaga) garante consistência.
- **Toggle Board ↔ Tabela:** owner quer poder mudar pra tabela com sort quando precisar de visão lista (não board). Não é "mais um board" — é alternativa de visualização da mesma data.
- **Distribuição por intencionalidade (verde/amarelo/azul/vermelho):** quem olha de longe entende rapidinho onde está a ação. Padrão alinhado com UX-AUDIT-VAGAS.
- **Last-writer-wins simples** — owner não quer over-engineering com locks otimistas. Conflito raro na prática; aviso "{nome} moveu" é suficiente.
- **Realtime silent (sem aviso ruidoso)** — menos atrito visual no dia a dia; quem move ativamente já tem feedback local.

</specifics>

<deferred>
## Deferred Ideas

### Removed from Phase 2 scope (decisão da sessão de discuss)

- **RS-11 (vaga confidencial + invisibilidade pra roles fora da curadoria):** owner pediu pra remover. Implica:
  - Atualizar REQUIREMENTS.md: mover RS-11 pra "v2 deferred" (criar V2-08) ou "Out of Scope" se decisão for definitiva
  - Atualizar ROADMAP.md Phase 2 success criteria: remover menção a "vaga `confidencial = true` é invisível"
  - CONCERNS.md gap em `cultural_fit_responses` policy continua aberto mas **não bloqueante de Phase 2**

### Postponed to v2 (por explicit decision)

- **SLA customizável por empresa/vaga (associado a D-10):** Phase 2 entrega global (2 dias / 5 dias). Customização por empresa-cliente ou por vaga vai pra v2 quando houver demanda real de cliente externo.
- **Cross-job realtime (V2-07):** Phase 2 entrega per-jobId. Cross-job (atualizar AllCandidatesKanban quando alguém move em qualquer vaga) fica pra depois.
- **Virtualização do kanban (V2-06):** só pull-in se calibração de volume confirmar >100 candidatos por vaga (research flag aberto em STATE.md).

### Reviewed Todos (not folded)

Não aplicável — `gsd-sdk query todo.match-phase 2` retornou 0 matches.

</deferred>

---

*Phase: 02-r-s-refactor*
*Context gathered: 2026-04-27*
