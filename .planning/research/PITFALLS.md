# Pitfalls Research

**Domain:** HR/ATS multi-tenant SaaS — brownfield refactor (Performance + R&S em Supabase, dados sensíveis BR/LGPD, 7 empresas internas + clientes externos)
**Researched:** 2026-04-27
**Confidence:** HIGH para os itens com cross-reference em CONCERNS.md (são bugs já mapeados); MEDIUM para os itens novos baseados em padrões da indústria + análise estática do código.

> **Como ler este documento:** cada pitfall tem (1) o que dá errado, (2) por que acontece neste codebase específico, (3) sinais de alerta detectáveis, (4) prevenção concreta, (5) fase do roadmap que deve atacar. Itens com `[ATIVO]` já estão acontecendo no código hoje (vide CONCERNS.md ou inspeção direta).

---

## Critical Pitfalls

### Pitfall 1: Vazamento de dados entre empresas no retrofit de tenancy `[ATIVO em risco]`

**What goes wrong:**
Hoje a aplicação tem `company_id` em algumas tabelas (`job_openings`), mas o modelo de tenancy ainda é "single-tenant-ish": vários fluxos de Performance (1:1, evaluations, climate) provavelmente não filtram por empresa porque foram desenhados para a operação interna onde só existia uma empresa lógica. Ao introduzir `companies` + `company_groups` + seletor global, qualquer query sem `WHERE company_id = $scope` vira **vazamento cross-tenant** silencioso. O usuário vê dados da empresa errada, ou pior, um sócio da Empresa A consegue ler folha da Empresa B.

**Why it happens:**
- O app nasceu para 1 empresa (esposa do owner) e teve R&S "enxertado depois" (PROJECT.md). Tabelas legadas de Performance presumem um único tenant.
- Em retrofit, é comum adicionar `company_id NULL` em tabelas existentes para permitir backfill, e deixar `NULL` interpretado como "qualquer empresa" — abre buraco.
- Devs reusam queries antigas que não tinham `.eq("company_id", ...)` porque não precisavam.
- Tabelas com RLS desabilitado por padrão quando criadas via SQL Editor / migrations programáticas (Supabase não força a flag, só mostra warning no dashboard).

**How to avoid:**
1. **Default-deny**: toda tabela com escopo de empresa precisa ter RLS habilitado **antes** de qualquer dado ser inserido pós-refactor. `ALTER TABLE x ENABLE ROW LEVEL SECURITY;` + policy explícita `USING (company_id = ANY (select scope_companies(auth.uid())))`.
2. **Backfill antes de policy**: para tabelas legadas (evaluations, one_on_ones, climate_responses), backfill `company_id` derivando do `profile.company_id` do dono **ANTES** de tornar a coluna `NOT NULL`. Linhas órfãs (sem dono) viram dump em uma tabela `_orphaned_*` para inspeção manual — nunca aceitas como "qualquer empresa".
3. **Defense-in-depth**: além de RLS, todo hook do TanStack Query que roda no contexto do scope selector precisa filtrar **explicitamente** por `company_id` na query (`.eq("company_id", currentScope.companyId)`). RLS é a última linha; não a única.
4. **Test fixture com dois tenants**: o primeiro teste Vitest do refactor cria empresa A + empresa B + um usuário em cada e tenta cruzar. Se passar, é bug.

**Warning signs:**
- Migration adicionando `company_id` com `DEFAULT NULL` sem `NOT NULL` posterior.
- Hook fazendo `.from("evaluations").select("*")` sem nenhum filtro.
- RLS policy usando `USING (true)` em tabela com dados sensíveis (Supabase Advisor flagga como `0003_auth_rls_initplan` ou `0013_rls_disabled_in_public`).
- Em dev, o admin de teste vê tudo — mas isso esconde bugs porque admin tem bypass; testar com persona "RH da Empresa A apenas" é o que pega vazamento.

**Phase to address:**
**Phase 1 (Foundations)** — antes de qualquer refactor visual, modelar `companies`, `company_groups`, scope resolver, e backfillar tudo. Se isso não estiver sólido, o resto do refactor cimenta o bug.

---

### Pitfall 2: O bug do kanban (mover candidato falha / dados somem) — análise de causa raiz `[ATIVO — bug #1 do projeto]`

**What goes wrong:**
Usuário arrasta candidato entre colunas. Ocorre uma de quatro coisas: (a) o card volta para a coluna anterior depois de aparecer movido por um instante; (b) o card some completamente; (c) toast "Este registro mudou" aparece mesmo sem outro usuário editando; (d) o card aparece em duas colunas simultaneamente até o refresh.

**Why it happens — análise do código atual (`src/hooks/hiring/useApplications.ts:73-114` + `src/components/hiring/CandidatesKanban.tsx:237-270`):**

O fluxo atual tem **três bugs sobrepostos**:

1. **Não há optimistic update real.** `useMoveApplicationStage` faz UPDATE direto no servidor e só invalida queries no `onSuccess`. Não há `onMutate` com `setQueryData` + snapshot. Resultado: durante a request (latência ~200-800ms na rede BR para Supabase), o dnd-kit já completou a animação de drop, mas o React Query ainda mostra o stage antigo. Quando a request volta, há um "flash" de re-render e o card pode "voltar" antes de "ir" — a UI fica inconsistente.

2. **Optimistic locking via `updated_at` exact match (`useApplications.ts:93`).** A query é `.eq("updated_at", args.expectedUpdatedAt).eq("stage", args.fromStage)`. Esse triplo guard (id + updated_at + stage) **causa o "data disappears"**: se o cache do React Query estiver com `updated_at` desatualizado em 1ms (por uma invalidation paralela, um realtime push, ou simplesmente o re-fetch background), o UPDATE não casa nenhuma linha → `data` vem null → toast "Este registro mudou" → mas a query também invalida tudo, então o card pode sumir momentaneamente da coluna nova (porque o backend ainda tem ele na antiga) e da antiga (porque o cache local moveu otimisticamente — ah não, espera, **não moveu** porque não há onMutate).

3. **Drag entre grupos consolidados pula sub-stages legais.** `stageGroups.ts` define `defaultStage` por grupo. Mover de "Triagem" (que contém `recebido, em_interesse, aguardando_fit_cultural, sem_retorno, fit_recebido`) para "Entrevista RH" usa `defaultStage: "apto_entrevista_rh"`. Mas `APPLICATION_STAGE_TRANSITIONS` (statusMachine.ts) permite só `recebido → em_interesse | recusado` e `em_interesse → antecedentes_ok | recusado`. **Pular de `recebido` direto para `apto_entrevista_rh` é uma transição ilegal**. RLS/check constraint no servidor pode rejeitar → UPDATE retorna error ou data null → mesmo cenário do item 2. O usuário vê: "movi mas voltou".

Este terceiro item é especialmente perigoso para os ~5 candidatos que estão em stages legados (`aguardando_fit_cultural`, `sem_retorno`, `fit_recebido`) — eles **não têm transição legal direta** para `antecedentes_ok` segundo `statusMachine.ts:15-17`, mas eles **estão visualmente** na coluna "Triagem". Quem arrastar de Triagem para Checagem desses cards vai ver o card sumir.

**How to avoid:**
1. **Implementar optimistic update completo no `useMoveApplicationStage`** seguindo o padrão TanStack Query 6-step: `onMutate` cancela queries, snapshot, `setQueryData` move o card no cache, retorna context. `onError`: rollback do snapshot. `onSettled`: invalidate para reconciliar. **Não invalidar em `onSuccess` se `onSettled` invalida** — duplica refetch.
2. **Cancel queries ANTES** do optimistic set (`await queryClient.cancelQueries({ queryKey: applicationsKeys.byJob(jobId) })`). Sem isso, um refetch in-flight pode sobrescrever o optimistic update mid-mutation.
3. **Validar a transição no client antes de chamar mutate**: `if (!canTransition(app.stage, toStage, "application")) { toast.error("Transição inválida"); return; }`. Hoje `canTransition` existe em statusMachine.ts:34 mas **não é chamado em onDragEnd** (linha 252 do CandidatesKanban.tsx escolhe `targetGroup.defaultStage` sem checar). Bug óbvio.
4. **Bridge stages legados explicitamente**: para applications cujo stage atual é legado (`aguardando_fit_cultural`, `sem_retorno`, `fit_recebido`), o `onDragEnd` deve normalizar para um stage legal antes de mover, OU o RH deve executar uma migration única `UPDATE applications SET stage = 'em_interesse' WHERE stage IN (legados)` no início do refactor.
5. **Substituir "guarded UPDATE por updated_at" por uma RPC `move_application_stage(id, expected_version, target_stage)` server-side** que retorna um discriminated result `{kind: 'ok', row}` ou `{kind: 'conflict', current_stage, current_updated_at}`. Cliente pode reagir granularmente em vez de ver "data null = sumiu".
6. **Realtime subscription** na `applications` por jobId via `supabase.channel().on('postgres_changes')` para empurrar updates a outros RHs olhando o mesmo kanban — reduz drasticamente conflicts em vez de cada cliente refetch a cada 30s.

**Warning signs:**
- Toast "Este registro mudou" aparecendo sem outro usuário online → 99% é cache stale, não conflict real.
- Card que muda para nova coluna mas pisca de volta para antiga em <500ms.
- Após mover N candidatos rápido, contador da coluna não bate com a soma dos cards.
- Em DevTools > Network, ver UPDATE retornando `204 No Content` ou `200` com array vazio = data null.

**Phase to address:**
**Phase 2 (R&S Refactor — bug crítico)** — este é literalmente o bug #1 explicitado em PROJECT.md ("Estabilizar bug crítico do kanban R&S"). Não pode esperar a Phase 4 (testes). Tem que ser refeito junto com a consolidação de colunas (UX-AUDIT F3) porque ambos tocam o mesmo arquivo.

---

### Pitfall 3: RLS recursion infinita ao adicionar tabelas relacionais de tenancy

**What goes wrong:**
Ao criar policies para `org_units` (que se referencia recursivamente por `parent_id`) ou para `company_group_memberships` (que junta empresas a grupos), uma policy do tipo `EXISTS (SELECT 1 FROM company_group_memberships WHERE ...)` dispara a policy da própria tabela `company_group_memberships`, que dispara de novo, e o Postgres erra com `infinite recursion detected in policy for relation`.

**Why it happens:**
Policies do Supabase aplicam recursivamente nas tabelas que aparecem em joins/subqueries. Se a policy de `applications` precisa checar `company_id` via `JOIN job_openings`, a policy de `job_openings` também roda. Se `job_openings` tem policy que checa `companies`, e `companies` checa `company_group_memberships`, e `company_group_memberships` em algum momento referencia `companies` via subquery → loop.

**How to avoid:**
1. **Security definer functions** para resolver scope: `CREATE FUNCTION user_scope_companies(uid UUID) RETURNS UUID[] LANGUAGE SQL SECURITY DEFINER AS $$ ... $$;`. Ela roda como o owner do schema, não respeita RLS, retorna o array de IDs de empresas que o usuário pode ver. Policies usam `WHERE company_id = ANY(user_scope_companies(auth.uid()))`. Sem joins recursivos.
2. **Pré-computar memberships em uma view materializada** `mv_user_company_access` refrescada por trigger quando `company_group_memberships` ou `profiles.company_id` muda. Policies fazem lookup O(1) nessa view sem cascata.
3. **Wrap `auth.uid()` em SELECT** (`(SELECT auth.uid())`) para que o Postgres compute uma vez por statement, não por linha. Resolve perf, não recursion, mas anda junto.

**Warning signs:**
- Erro `42P17 infinite recursion detected in policy for relation "x"` no log do Supabase.
- Query que era 50ms vira 5s ao adicionar uma policy nova.
- `EXPLAIN ANALYZE` mostrando InitPlan repetido N vezes.

**Phase to address:**
**Phase 1 (Foundations)** — desenhar `user_scope_companies()` e `user_org_descendants()` antes de criar qualquer policy. Estas funções são o coração do scoping.

---

### Pitfall 4: Cache pollution do TanStack Query ao trocar de scope (empresa selecionada)

**What goes wrong:**
Usuário seleciona Empresa A no header → vê 12 vagas. Troca para Empresa B → por uma fração de segundo (ou até refetch terminar) ainda vê as 12 vagas da Empresa A, porque o componente ainda está montado e o cache key não inclui o scope. Pior: se o usuário clica numa vaga durante esse "flash", abre detalhes da vaga errada.

**Why it happens:**
Os queryKeys atuais do código são tipo `applicationsKeys.byJob(jobId)` (useApplications.ts:15) — bom, escopa por jobId. Mas `useTalentPool`, `useHiringMetrics`, `useSidebarCounts` provavelmente usam keys como `["hiring", "metrics"]` sem incluir company_id. Quando o scope muda, o React Query reusa o cache porque a key não mudou.

**How to avoid:**
1. **Toda queryKey precisa do scope como parte da key**: `["hiring", "metrics", { companyId: scope.companyId, groupId: scope.groupId }]`. Se a key não inclui scope, é bug.
2. **Centralizar scope em um Context + helper `scopedKey()`**: `const scope = useScope(); const key = scopedKey(scope, "hiring", "metrics");`. Garante que ninguém esquece.
3. **No scope change, `queryClient.removeQueries()` em vez de `invalidateQueries()`**: invalidate marca como stale mas mantém o data antigo até refetch terminar (causa o flash). Remove força o componente a mostrar loading state, sem dado antigo na tela. Decisão UX: aceitar loading mais visível em troca de zero vazamento visual.
4. **`enabled: !!scope.companyId`** em todo useQuery que dependa de scope. Se scope ainda não resolveu (ex: load inicial), não dispara request com scope undefined.

**Warning signs:**
- Após trocar scope, dashboard mostra números da empresa anterior por 1-2s.
- DevTools > React Query devtools mostra queries em cache com key que não inclui company_id.
- Console warning "data is stale" sem reason óbvio.

**Phase to address:**
**Phase 1 (Foundations) + Phase 3 (Performance refactor)** — Phase 1 introduz o ScopeContext + scopedKey helper. Phase 3 é quando os hooks de Performance (que mais sofrem com isso porque foram escritos no mundo single-tenant) precisam ser scoped.

---

### Pitfall 5: LGPD — Banco de Talentos cross-empresa sem consentimento granular nem trilha de auditoria

**What goes wrong:**
Candidato Maria aplica para vaga na Empresa A (cliente externo do Lever). É reprovada, RH marca "adicionar ao Banco de Talentos" — flag boolean simples (`applications.added_to_talent_pool`). Daí 6 meses depois, RH da Empresa B (outro cliente externo, concorrente da Empresa A) acessa o Banco e vê o perfil de Maria. Maria nunca consentiu que seu currículo fosse compartilhado com a Empresa B. Maria descobre, registra reclamação na ANPD, Lever toma multa (até 2% do faturamento, máx R$ 50M, art. 52 LGPD).

**Why it happens:**
- LGPD trata consentimento como específico ao tratamento e finalidade (art. 8º §4º). Consentimento dado para "Empresa A me considerar para vaga X" **não cobre** "outras empresas me considerarem para outras vagas no futuro".
- O modelo atual em CONCERNS.md flagga "Anonymization RPC Lacks Audit Logging" — `useAnonymizeCandidate` redact PII sem trilha. Sem audit log, não há como provar para a ANPD quem acessou o quê.
- Boolean `added_to_talent_pool` é simplista demais — não captura: o que o candidato consentiu, por quanto tempo, para quais finalidades, em qual base legal (consentimento? legítimo interesse?).

**How to avoid:**
1. **Tabela `candidate_consents`** dedicada: `id, candidate_id, purpose ('reuse_in_other_jobs' | 'share_with_external_clients' | 'general_talent_pool'), legal_basis ('consent' | 'legitimate_interest'), granted_at, expires_at, revoked_at, document_url (PDF do termo assinado ou hash da aceitação eletrônica)`. Banco de Talentos só mostra candidatos com consent ativo + não revogado + não expirado (LGPD não fixa prazo, mas 24 meses é benchmark de mercado em RH).
2. **Tabela `candidate_access_log`** (já mencionada em CONCERNS.md como sugestão): `id, candidate_id, accessed_by_user_id, access_type ('view_profile' | 'export_cv' | 'add_to_job' | 'anonymize' | 'export_to_csv'), accessed_at, scope_company_id`. Trigger automático em `SELECT` é caro; alternativa é wrap o useTalentPool e useCandidate em um hook que loga client-side via RPC `log_candidate_access(candidate_id, type)` no `onSuccess`.
3. **Direito ao esquecimento (LGPD chama "eliminação", art. 18, VI)**: candidate.anonymize não deve ser DELETE, deve ser UPDATE redactando PII (`full_name='Anônimo', email=null, phone=null, cpf=null, cv_url=null`) e mantendo `id` e relações para integridade referencial. Mas precisa de audit log do `anonymize` (CONCERNS.md já flagga).
4. **Termo de aceite no fluxo público de candidatura** (`PublicJobOpening.tsx`): checkbox separado "Autorizo que meu currículo seja considerado para outras vagas, inclusive em empresas-cliente do Lever Talents" — **opt-in, não pré-marcado** (consentimento "desambíguo" e "específico" — art. 8º §4º). Sem essa caixa marcada, candidato fica restrito à vaga que aplicou.
5. **Revogação one-click**: cada email/WhatsApp do candidato precisa ter link "revogar consentimento" que dispara `UPDATE candidate_consents SET revoked_at = now()`.
6. **Base legal "legítimo interesse" só com LIA**: se for usar art. 7º IX, produzir Legitimate Interest Assessment (LIA) documentado — proporcionalidade, expectativa razoável do titular, salvaguardas. Não improvisar.

**Warning signs:**
- Tabela `applications` com `added_to_talent_pool BOOLEAN` sem tabela de consentimento separada.
- Hook que retorna candidatos do banco sem filtrar por consent ativo.
- Ausência de tabela `candidate_access_log` ou logs vazios após uso real.
- Termo de aceite genérico (LGPD requer específico por finalidade).

**Phase to address:**
**Phase 2 (R&S Refactor)** — banco de talentos é parte central do R&S e já está em produção (entregue em 2026-04-22 segundo memória). A refatoração precisa **não regredir** o que existe e **adicionar** consent + audit. Atrasar isso é risco regulatório real.

---

### Pitfall 6: Performance de recursive CTE em org_units quando empresas crescerem `[ATIVO em risco futuro]`

**What goes wrong:**
Org_units tem `parent_id` arbitrário (PROJECT.md). Para resolver "líder do unit X vê todos os descendentes", a query natural é uma recursive CTE: `WITH RECURSIVE descendants AS (SELECT id FROM org_units WHERE id = $start UNION ALL SELECT o.id FROM org_units o JOIN descendants d ON o.parent_id = d.id) SELECT * FROM profiles WHERE org_unit_id IN (SELECT id FROM descendants)`. Funciona com 50 funcionários. Com 500-2000 (Empresa A grande + 7 internas), começa a degradar: 12ms vira 400ms quando falta index em `parent_id`, e a CTE roda em **toda** request que valida acesso (RLS).

**Why it happens:**
- RLS roda por linha. Recursive CTE dentro de policy multiplica o custo por linha de resultado.
- Sem index em `parent_id`, recursive join cai em sequential scan (PostgreSQL docs).
- Sem termination guard (`WHERE depth < 50`), unit ciclado (bug de UI permitindo `parent_id` apontar para descendente) trava o servidor.

**How to avoid:**
1. **Index em `parent_id`** desde o dia 1: `CREATE INDEX idx_org_units_parent ON org_units(parent_id)`. Não opcional.
2. **Materialized closure table** `org_unit_descendants(ancestor_id, descendant_id, depth)` populada por trigger quando `org_units` muda. Lookup O(1): `SELECT descendant_id FROM org_unit_descendants WHERE ancestor_id = $start`. Custo: trigger overhead em INSERT/UPDATE/DELETE (raro), mas reads ficam super rápidos.
3. **Security definer function** `user_org_descendants(uid)` que retorna o array (usa a closure table) e é chamada uma vez por statement, não por linha. Combina com Pitfall 3.
4. **Termination guard** em qualquer recursive CTE remanescente: `WHERE depth < 20` (estruturas de empresa raramente passam de 8 níveis).
5. **Validação anti-ciclo no UPDATE de `parent_id`**: trigger BEFORE UPDATE que verifica se o novo parent não é descendente do node sendo movido.

**Warning signs:**
- pg_stat_statements mostrando RECURSIVE CTE como top query por tempo.
- Latência da home (que carrega vários counts scoped) crescendo linearmente com número de funcionários.
- Erro `stack depth limit exceeded` ou `max_recursive_depth` atingindo 1000.

**Phase to address:**
**Phase 1 (Foundations)** — quando modelar `org_units`, já criar a closure table + função. Refazer depois é doloroso (precisa re-estruturar policies).

---

### Pitfall 7: Refactor scope creep — rebuild too much (a "rewrite trap")

**What goes wrong:**
PROJECT.md é claro: "Sem features novas grandes nessa rodada — refactor + redesenho". Mas durante o refactor, é tentação reescrever cada componente "para fazer direito". O JobOpeningForm tem 854 linhas (CONCERNS.md), CandidateProfile tem 1169 — mas essas linhas são de business rules acumuladas em produção. Reescrever do zero perde as 50 correções que foram feitas em produção sob fogo. Resultado: refactor de 4 semanas vira 4 meses, regressão de bugs já fixados, owner perde paciência.

**Why it happens:**
- Componentes longos parecem "errados" mas funcionam — o erro está em **convivência com o resto**, não no componente em si.
- Devs preferem greenfield porque é mais "limpo".
- "Já que estou aqui, vou consertar X também" → debt vira árvore.

**How to avoid:**
1. **Definir o "good enough" do refactor explicitamente**: lista numerada de "deliverables" do refactor + critério de aceite. Tudo fora da lista vai para backlog "post-refactor". PROJECT.md já tem isso em "Active" — usar como contrato.
2. **Refactor só toca componente quando há mudança funcional necessária** (ex: scope selector exige mudança em todo hook → ok, refatora junto). Componente que está estável e não muda comportamento → não toca.
3. **Strangler fig pattern**: novo modelo de tenancy convive com o antigo. Migration coexiste. Cada feature é portada uma de cada vez para o novo modelo, com flag de feature flag. Quando todas portadas, remove o antigo.
4. **Time-box semanal**: fim de cada semana, owner valida o que foi entregue contra a lista. Se não bateu, reduz escopo da próxima.

**Warning signs:**
- Diff da PR do refactor com >2000 linhas mudadas em arquivos não diretamente relacionados ao tema.
- "Fui mexer em A e tive que mexer em B, C, D" — sinal de que B, C, D não estavam isolados, mas isso é descoberta, não desculpa.
- Tasks da semana corrente aparecendo "quase prontas" três semanas seguidas.

**Phase to address:**
**Todas as fases** — disciplina contínua, não fase específica. Mas **Phase 0 (kickoff)** deve produzir o "contrato de scope" assinado com o owner.

---

### Pitfall 8: Refactor scope creep — rebuild too little (deixar débito crítico para depois)

**What goes wrong:**
O oposto do Pitfall 7. Refactor entrega o seletor de empresa, scope funciona, mas: zero testes ainda, monolitos de 1000+ linhas continuam, RLS gaps de `cultural_fit_responses` (CONCERNS.md) ficam para "depois", logs sensíveis continuam no console. Owner declara "refactor pronto", começa features novas, e em 2 meses os mesmos bugs voltam — porque a estrutura que os causa não foi atacada.

**Why it happens:**
- Pressão para mostrar progresso visual (scope selector é visível, refatorar policy não é).
- "Funciona" vs "é correto" — owner aceita "funciona", dev sabe que não é correto.
- Sub-estimar: "vou criar testes depois" raramente acontece depois.

**How to avoid:**
1. **Define of Done inclui o invisível**: critério de aceite do refactor não é só "scope funciona", é "RLS gaps fechados (lista específica), logs sensíveis removidos (grep não retorna), testes mínimos passando para 5 fluxos críticos". Se não bate, refactor não está pronto.
2. **Test coverage mínimo NUNCA é 0**: começar com 5 testes essenciais (auth, RBAC scope, mover candidato no kanban, salvar avaliação, switch de empresa) **dentro** da fase, não como fase isolada. PROJECT.md já decide isso.
3. **Trade-off explícito por item**: para cada CONCERNS finding, decidir "trato no refactor" / "backlog post-refactor". Documentar a decisão. Se "backlog", criar issue com prioridade.
4. **CONCERNS.md como checklist**: cada item resolvido marca explícito; itens não resolvidos viram tasks.

**Warning signs:**
- "Vou voltar a isso depois" dito 3+ vezes na mesma semana sem registro em issue.
- Refactor declarado pronto mas test coverage <10%.
- Logs de produção ainda mostrando email/UUID em console.error.
- Componente monolítico de 1169 linhas intocado ao fim do refactor.

**Phase to address:**
**Phase 4 (Quality & polish)** — a fase de fechamento que valida o invisível. Não opcional.

---

### Pitfall 9: Form handling debt — controlled/uncontrolled drift quebrando salvar

**What goes wrong:**
Usuário preenche form (ex: Profile, JobOpeningForm, OneOnOneMeetingForm), clica salvar, dado some — campos volta a estado anterior, ou pior, salva como `null` apesar de visualmente preenchido. Erro no console: "A component is changing an uncontrolled input of type text to be controlled". Em produção, usuário só vê "perdi meu trabalho".

**Why it happens (codebase específico):**
- React Hook Form **assume defaultValues definidos**: passar `undefined` em campos opcionais (campo novo no schema, ex: senioridade não persistido — CONCERNS.md flagga isso) faz o input começar uncontrolled. Quando o usuário digita, vira controlled. React loga warning, RHF perde sync entre o `register` e o estado do form.
- Hooks de fetching demorados (Supabase RTT 200-800ms BR): form é renderizado com `defaultValues={{}}` antes do data chegar, depois o data chega e força re-render mas o RHF já registrou os campos com defaults vazios. Resultado: input mostra valor antigo, mas form state tem string vazia. Salvar = sobrescreve com vazio.
- shadcn/ui issues conhecidas (#427) ao usar Controller com componentes como Select, Textarea quando defaultValue é undefined.

**How to avoid:**
1. **defaultValues explicit em todos os campos**, sempre string `""` para text, `false` para boolean, `[]` para array, nunca `undefined`. Centralizar em uma função `defaultsForJobOpening(): JobOpeningFormValues`.
2. **`reset(data)` quando data carrega**: `useEffect(() => { if (data) form.reset(mapToFormValues(data)); }, [data])`. Sem isso, form fica com defaults vazios mesmo após data chegar.
3. **Loading guard no form**: não renderizar `<form>` enquanto `data === undefined` (carregando edit mode). Mostra skeleton. Evita o ciclo uncontrolled → controlled.
4. **Schema Zod compartilhado** entre form (validação client) e DB (RPC pode validar mesmo schema via JSON Schema). Se schema tem campo, form tem campo, DB tem coluna. Drift impossível.
5. **Auto-save em forms longos** (OneOnOne tem 909 linhas, JobOpeningForm 854) usando `form.watch` + debounce + mutation parcial. Reduz risco de "perdi tudo" ao mínimo.

**Warning signs:**
- DevTools console com warning "uncontrolled to controlled".
- DB com null em campos que UI mostra preenchidos (corrida).
- Usuário relatando "salvei mas voltou".
- `as any` aparecendo no form para silenciar TS (CONCERNS.md flagga `OneOnOneMeetingForm.tsx:358`).

**Phase to address:**
**Phase 2 (R&S Refactor)** — JobOpeningForm e CandidateForm. **Phase 3 (Performance Refactor)** — OneOnOneMeetingForm. Auto-save é Phase 4 (polish).

---

### Pitfall 10: Brownfield testing strategy — paralisia ou ilusão

**What goes wrong:**
Duas falhas opostas: (a) **paralisia** — "preciso de 80% coverage antes de tocar qualquer código" → refactor para; (b) **ilusão** — "escrevi testes que mockam tudo" → testes passam mas não pegam o bug do kanban porque o mock do Supabase também passou. Zero testes hoje (PROJECT.md) significa qualquer pé direito é melhor que o atual, mas precisa ser pé certo.

**Why it happens:**
- Brownfield + zero testes = tentação de cobrir tudo de uma vez. Não cabe.
- Mocks fáceis de Supabase escondem bugs reais (RLS não roda em mock).
- Devs escrevem testes do que é fácil testar, não do que é importante.

**How to avoid:**
1. **Test the change, not the legacy** (regra de ouro de brownfield): se vou tocar `useMoveApplicationStage`, escrevo teste que cobre o novo comportamento de optimistic update + rollback. Não tento cobrir todo o código legado primeiro.
2. **Pyramid invertida para hot paths**: para os 5 fluxos críticos do PROJECT.md (auth, RBAC, mover candidato, salvar avaliação, switch de empresa), priorizar **integration tests** (Vitest + Supabase local instance) sobre unit. Eles pegam o bug do kanban; unit não pega.
3. **Snapshot tests para o que não pode mudar**: STAGE_GROUPS, APPLICATION_STAGE_TRANSITIONS, JOB_STATUS_TRANSITIONS — o teste é "essa estrutura não regrediu" (toMatchInlineSnapshot). Se mudou, é decisão consciente.
4. **RLS tested with real Supabase** (local CLI ou test project), não mockado. Criar duas personas (RH Empresa A, RH Empresa B), tentar cross-access. Mock supabase passa; real recusa. Esse é o teste que importa.
5. **CI mínimo**: cada PR roda os 5 testes de fluxo crítico. Falha = bloqueia merge. Sem isso, testes morrem.

**Warning signs:**
- Coverage report cresce mas `git log --oneline | grep "fix:"` cresce na mesma proporção.
- Test suite com mocks profundos (`vi.mock("supabase")`, `vi.mock("react-router")`, `vi.mock("@tanstack/react-query")`) — testa nada de real.
- Todos os testes passam mas o bug do kanban continua.

**Phase to address:**
**Phase 4 (Quality & polish)** consolida, mas **cada fase introduz** seus testes críticos junto com o código (Phase 1: scope resolver tests; Phase 2: kanban move test; Phase 3: avaliação save test).

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| `company_id NULL` em tabelas legadas para "agora aceitar tudo" | Não quebra produção durante backfill | Vazamento cross-tenant + impossível auditar quem viu o que | **Nunca** após Phase 1 — backfill ou move para `_orphaned_*` |
| Cast `as any` em form value para silenciar TS | Form salva | Perde type safety, esconde drift de schema (`OneOnOneMeetingForm.tsx:358`) | Nunca — refazer tipo correto |
| `useQuery(["x"])` sem incluir scope na key | Hook simples, código curto | Cache pollution ao trocar empresa (Pitfall 4) | Apenas para queries globais sem scope (raras: lista de países, etc) |
| `console.log/error` com email, UUID, dados sensíveis | Debug fácil em dev | Vazamento em produção via DevTools, possível LGPD breach | Wrap em `if (import.meta.env.DEV)` ou substituir por logger condicional. Nunca em prod |
| RLS `USING (true)` em tabela com dados | Desbloqueia desenvolvimento rápido | Dados públicos a qualquer authenticated user | **Nunca** em tabelas com dados sensíveis. Aceitável em tabelas tipo `app_versions` puras de leitura pública |
| Manter dual lockfile (bun + npm) | Não decidir | Drift entre dev/CI, "funciona local mas não em prod" | Nunca (PROJECT.md já decide resolver) |
| `useState` para column collapse sem persistência | Implementação rápida do kanban | UX ruim, recolapsa toda visita (CONCERNS.md fragile area) | Aceitável só na primeira iteração; resolver com localStorage no Phase 2 |
| Hand-maintained TS types sync com Supabase schema (834 linhas em hiring-types.ts) | Sem dependência de gerar types em CI | Drift inevitável com tempo (já 4+ commits de "atualizar types") | Aceitável até a próxima migration grande; migrar para `supabase gen types typescript` |
| Tests que mockam Supabase profundamente | Testes rápidos | Não pegam bugs de RLS/policy (Pitfall 10) | Apenas para componentes UI puros sem fetch |
| Stages legados (`aguardando_fit_cultural`, `sem_retorno`, `fit_recebido`) ficarem em statusMachine "para compatibilidade" | Migration mais leve | Cards inalcançáveis para transição limpa (Pitfall 2 #3) | Aceitável só se migration única já tiver normalizado todos os registros existentes |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| **Supabase Auth** | Confiar em `auth.uid()` chamado por linha em RLS — performance ruim em escala | Wrap em `(SELECT auth.uid())` para initPlan caching; pre-resolve scope em security definer function |
| **Supabase RLS + joins** | Policy fazendo `JOIN tableX` que cascateia policies | Security definer function que retorna array de IDs autorizados; policy faz `WHERE col = ANY(...)` |
| **Supabase Storage (audio do Plaud)** | Sem limite de tamanho client-side; upload de 100MB falha silenciosamente (CONCERNS.md scaling) | Validação client antes do upload; resumable upload (tus.io) para >50MB; quota por empresa |
| **TanStack Query + dnd-kit** | Drag triggera mutation, mas sem `onMutate/onError/onSettled` correto = card volta visualmente (Pitfall 2) | 6-step optimistic pattern + cancelQueries antes |
| **WhatsApp wa.me link com credencial** | Senha temporária no link da mensagem, "wa.me/55119...?text=Sua senha é abc123" | NUNCA enviar senha em link. Mensagem só com link de cadastro de senha (token de uso único, expira em 24h). Senha o usuário cria no primeiro login |
| **Plaud transcription upload** | Re-upload se erro mid-stream | Idempotency key no upload; se mesmo hash de áudio, não duplica |
| **Email notifications de candidatura** | Email contendo PII em texto plano (LGPD risco) | Email só com link para o painel; PII fica server-side |
| **CSV export de pipeline** | Síncrono, trava UI, expõe dados de todas empresas se RLS frouxo | Edge Function com streaming + scoped por empresa selecionada |
| **Realtime subscriptions** | `.on('postgres_changes')` sem filter por company_id = subscribe a todos | Sempre filtrar `filter: 'company_id=eq.${scope.companyId}'` |
| **Vite env vars** | `import.meta.env.VITE_X as string` sem validação (CONCERNS.md security) | Validar todos VITE_* no `main.tsx` startup com Zod schema; throw se faltar |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Recursive CTE em org_units sem index ou closure table | Latência de RLS cresce linearmente com #funcionarios | Index em parent_id + closure table materialized | >500 funcionários ou >5 níveis de hierarquia |
| Kanban renderizando todos cards sem virtualization (CONCERNS.md) | Lag ao scroll, devtools mostra 200+ DOM nodes | react-window por coluna | >100 candidatos por vaga |
| N+1 query em HiringDashboard (CONCERNS.md) | Dashboard demora 3-5s para carregar | RPC agregada que retorna counts por job_id em uma chamada | >20 vagas ativas |
| Cache pollution na troca de scope (Pitfall 4) | Flash de dados da empresa anterior por 1-2s | Scope na queryKey + removeQueries on switch | Sempre, desde dia 1 do scope selector |
| Form com 50+ fields sem React.memo nos children | Cada keystroke re-renderiza form todo | useMemo + memo nos sub-componentes; formik vs RHF tradeoff | OneOnOneMeetingForm já no limite (909 linhas, CONCERNS.md flagga) |
| RLS function `auth.uid()` chamada por linha (não wrapped em SELECT) | Query 50ms vira 5s em tabela de 10k linhas | `(SELECT auth.uid())` em policies + initPlan | >10k linhas em tabela com RLS denso |
| Realtime sem filter, todos clientes recebendo todos updates | Gargalo de WebSocket no Supabase, lag no kanban | Filter por company_id + jobId | >5 RHs concorrentes |
| Audit log de candidatos por trigger SELECT (write per read) | Slow read, write storm | Log seletivo client-side via RPC só em ações específicas | Sempre — trigger SELECT é antipattern |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Senha temporária do onboarding via WhatsApp wa.me text query | Mensagem WhatsApp visível em backup do dispositivo, screenshot acidental, repasse social | Link com token de uso único (24h), usuário cria senha no primeiro acesso. Nunca senha no link |
| Sócio com acesso a folha de pagamento de outras empresas do grupo (já que é admin do grupo) | Violação LGPD princípio de finalidade — sócio da Empresa A não tem motivo legítimo para ver salário Empresa B | Membership N:N entre sócio e empresas; UI esconde companies fora do membership; RLS bloqueia mesmo se UI vazar |
| RH compartilhado com acesso a cultural_fit_responses confidenciais (CONCERNS.md item) | Vazamento de dados sensíveis de candidatos confidenciais | Estender policy de cultural_fit_responses para checar `j.confidential AND auth.uid() != ANY(j.confidential_participant_ids)` |
| Console.log com email e UUID de candidato (CONCERNS.md item) | DevTools de qualquer authenticated user revela emails de outros — pode ser usado para enumeração | Logger condicional que strip PII; ou só logar IDs internos sem semântica de pessoa |
| `cultural_fit_tokens` (CONCERNS.md fragile) com expiry mas sem one-time-use enforcement | Link de fit reutilizado por outro candidato (forwarded), respostas atribuídas a errado | RPC marca token como used após primeiro uso; respond block se used=true |
| Anonymize candidate sem audit log (CONCERNS.md item) | LGPD requer prova de quem solicitou + quem executou; sem trilha = não conformidade | Audit log obrigatório (Pitfall 5) |
| Salário de funcionário visível no perfil para qualquer authenticated user | Violação LGPD + CLT — info financeira é dado pessoal sensível | Salário só para RH + admin + sócio (do mesmo escopo) + o próprio liderado. RLS por role. Coluna `salary` em tabela separada `compensation` para isolar |
| Dashboard de "folha total" calculado client-side concatenando todos profiles | Cliente pode interceptar e ver salários individuais mesmo se UI só mostrar total | Calculado server-side via RPC que retorna só o agregado, nunca o detalhe |
| Tokens públicos de aplicação a vaga sem rate-limit (PublicJobOpening) | Spam, enumeração de vagas, abuso | Edge Function com rate limit por IP + captcha em form público |
| Avaliações líder↔liderado expostas se policy não checa role | Liderado vê avaliação que líder fez dele (e outras) | Policy: liderado só vê própria avaliação como avaliado, nunca como avaliador. Líder vê das pessoas do seu org_unit recursivo. RH vê tudo |
| RLS desabilitado em tabela criada via migration programática | Default-open: qualquer user com anon key lê tudo | Política: toda migration que cria tabela com dados sensíveis termina em `ALTER TABLE x ENABLE ROW LEVEL SECURITY;`. CI lint rejeita migration sem isso |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Drag entre grupos consolidados que pula sub-stage ilegal (Pitfall 2 #3) | Card some, RH desconfia do app | Validar transição antes; oferecer picker de sub-stage se grupo destino tem múltiplos |
| Toast genérico "Erro ao mover" sem contexto | RH não sabe se foi rede, conflict ou permissão | Diferenciar: "Outro usuário moveu este card" (conflict) vs "Você não tem permissão" (RLS) vs "Sem conexão" (network) |
| Switch de empresa no header redireciona para home (perde contexto) | RH vendo vaga X na empresa A troca para B, perde a vaga, tem que renavegar | Manter URL atual se a entidade existe na nova empresa; só redirect se entidade não pertence a B (com toast explicativo) |
| Drawer aninhado (vaga > candidato) confunde "qual está sendo editado" (UX-AUDIT 7) | Usuário fecha drawer errado | Breadcrumb visível "Vagas › Senior Backend › Guilherme" no header do drawer aninhado |
| Form de candidato salva sem feedback visual (loading state, success toast) | RH duplica ao clicar 2x | Disable button + spinner + toast on success. Mutation pending state visível |
| Confidencialidade de vaga só por badge no card | Líder com acesso ao job vê detalhes que não deveria | Esconder candidatos completos para roles fora de `confidential_participant_ids`, não só visualmente — server filtra |
| Termo LGPD genérico ou pré-marcado (Pitfall 5) | Consentimento inválido juridicamente, pode levar à invalidação do banco | Checkbox separado por finalidade, sem pré-marcar, com texto específico |
| Onboarding por email quando usuário-alvo não checa email (PROJECT.md) | Liderado não recebe credencial, fricção de RH | WhatsApp com link (mas sem senha — Pitfall security) |
| Pesquisa de clima sem comunicação clara de "100% anônima" | Liderados respondem "politicamente correto" por medo de identificação | Texto explicativo no início do questionário + ausência total de identificação na UI (não mostrar "respondendo como X") |
| Avaliações 360 com prazo apertado e UX de muitos campos | Respostas rasas, dados de baixa qualidade | Auto-save + voltar de onde parou + feedback de progresso |

---

## "Looks Done But Isn't" Checklist

Tarefas que parecem completas mas frequentemente faltam pedaços críticos. Use este checklist nas reviews de Phase 1-3.

- [ ] **Scope selector implementado:** Verificar se queryKeys de TODOS hooks (não só hiring) incluem company_id/group_id. Grep `queryKey: \[` e auditar.
- [ ] **RLS na tabela X:** Verificar (a) RLS habilitado (`pg_class.relrowsecurity`), (b) policies cobrem SELECT/INSERT/UPDATE/DELETE separadamente, (c) test cross-tenant fails como esperado.
- [ ] **Move candidate funciona:** Verificar (a) optimistic update visual, (b) rollback em error, (c) toast diferenciado para conflict vs network vs permission, (d) realtime push para outros RHs do mesmo job, (e) transição validada no client antes da mutation.
- [ ] **Banco de Talentos LGPD:** Verificar (a) tabela candidate_consents existe e é populada, (b) banco filtra por consent ativo, (c) audit log popula em access, (d) revoke link funcional.
- [ ] **Onboarding WhatsApp:** Verificar (a) mensagem não contém senha em texto, (b) link de cadastro tem token único, (c) token expira em 24h, (d) senha obrigatória no primeiro login, (e) idempotency (RH pode reenviar sem invalidar token anterior).
- [ ] **Org_units recursivo:** Verificar (a) índice em parent_id, (b) closure table popula em trigger, (c) anti-cycle check em UPDATE, (d) função `user_org_descendants` security definer, (e) policy de profiles usa a função.
- [ ] **1:1 com transcript Plaud:** Verificar (a) campo de upload aceita até X MB, (b) parsing/storage do resumo, (c) RH consegue ler 1:1 dos pares (pol é "RH vê tudo"), (d) líder/liderado não veem 1:1 alheios, (e) audit log de quem leu.
- [ ] **Avaliação líder↔liderado:** Verificar (a) RH abre ciclo por empresa, (b) auto-save em rascunho, (c) submit final é idempotente, (d) liderado vê só própria avaliação como avaliado, (e) líder vê avaliações de descendentes do org_unit.
- [ ] **Pesquisa de clima anônima:** Verificar (a) tabela de respostas NÃO tem `respondent_user_id` populado (só `org_unit_id`), (b) view de resultados agrega só >5 respondentes (k-anonymity), (c) UI nunca mostra "respondendo como X".
- [ ] **Folha calculada:** Verificar (a) RPC server-side soma `salary` por empresa, (b) só roles autorizados (sócio + RH + admin) chamam a RPC, (c) salary não vaza em queries de `profiles` para outros roles.
- [ ] **Testes mínimos:** Verificar 5 fluxos críticos rodam em CI: auth, scope switch, move candidate, save evaluation, RBAC denial. Coverage real (não mock-de-mock).
- [ ] **Logs limpos:** Grep `console.log\|console.error` no src/. Cada match: justificar ou remover. Production build não emite PII no console.
- [ ] **Dual lockfile resolvido:** Apenas um lockfile no repo. README documenta o package manager escolhido. CI usa o mesmo.
- [ ] **Migrations idempotentes:** `supabase db reset && supabase db push` roda fim-a-fim sem erro, em projeto novo.

---

## Recovery Strategies

When pitfalls occur despite prevention.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Vazamento cross-tenant detectado em prod | **HIGH** | (1) Auditoria imediata: queries SELECT na tabela suspeita por usuário, identificar quem acessou o quê. (2) Notificar afetados (LGPD art. 48 — comunicação à ANPD em casos relevantes). (3) Patch da policy + invalidate cache cliente. (4) Forensics: log review, post-mortem documentado. |
| Bug do kanban (mover falha) volta após "fix" | MEDIUM | (1) Logar `expected_updated_at` vs `current_updated_at` em cada conflict para descobrir cache staleness real vs racing. (2) Adicionar telemetria mínima (Sentry-like) em mutation errors. (3) Se realtime ativado, suspeitar do realtime conflitando com cache local. |
| Cache pollution: usuário viu dado errado por 2s | LOW | (1) Identificar a query sem scope na key. (2) Patch hotfix incluindo scope. (3) `removeQueries` em todos clientes ativos via Supabase realtime broadcast. |
| LGPD: candidato pede dados deletados, descobrimos que faltou audit log antigo | HIGH (regulatório) | (1) Cumprir pedido (anonymize). (2) Justificar à ANPD a falha de logging de período X-Y, demonstrar boa-fé e correção. (3) Implementar audit log retroativo a partir da data de correção. (4) Atualizar política de privacidade. |
| Refactor scope creep estourou prazo | MEDIUM | (1) Pausar features novas, reduzir refactor ao mínimo viável. (2) Lista do que está realmente bloqueando (vs nice to have). (3) Time-box de 1 semana para fechar o crítico, resto para backlog explícito. |
| Form salvou null em campo crítico (controlled drift) | MEDIUM | (1) Identificar registros afetados (UPDATE timestamp matching incident window). (2) Recovery via histórico de versão (se tabela tem version) ou reentrada manual. (3) Patch o form. (4) Adicionar teste para regressão. |
| RLS recursion infinita derrubou prod | HIGH | (1) Rollback da migration que criou a policy. (2) Re-implementar com security definer function. (3) `EXPLAIN` na nova policy para confirmar sem recursion. |
| Org_units performance degradou (recursive CTE) | MEDIUM | (1) Adicionar index em parent_id (online). (2) Criar closure table populada por backfill. (3) Migrar policies para usar a closure. (4) Drop a recursive CTE original. |
| Stages legados causando candidatos invisíveis | LOW | (1) Migration UPDATE normalizando para stages atuais. (2) Remover stages legados do schema (após confirmar zero registros). (3) Remover do statusMachine.ts. |

---

## Pitfall-to-Phase Mapping

How roadmap phases address each pitfall.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| 1. Vazamento cross-tenant | **Phase 1 (Foundations)** | Test fixture com 2 tenants tenta cross-access; falha esperada |
| 2. Kanban mover falha | **Phase 2 (R&S Refactor)** | Test integration que move card, simula conflict, valida rollback |
| 3. RLS recursion infinita | **Phase 1 (Foundations)** | EXPLAIN das policies não mostra cascata recursiva |
| 4. Cache pollution scope change | **Phase 1 + Phase 3** | Switch de empresa não mostra dados antigos; auditoria de queryKeys |
| 5. LGPD banco talentos | **Phase 2 (R&S Refactor)** | Audit log popula; consent table existe e filtra; revoke testado |
| 6. Org_units performance | **Phase 1 (Foundations)** | Carga sintética de 1000+ unidades, latência de scope <100ms |
| 7. Scope creep (rebuild too much) | **Todas as fases (disciplina)** | Diff por PR fica abaixo de 1500 linhas em arquivos não-relacionados |
| 8. Scope creep (rebuild too little) | **Phase 4 (Quality)** | Checklist de Define of Done validado em review com owner |
| 9. Form controlled/uncontrolled drift | **Phase 2 + Phase 3** | Console limpo de warnings; defaultValues centralized; reset on data load |
| 10. Brownfield testing strategy | **Phase 4 + cada fase** | 5 fluxos críticos têm integration test rodando em CI |

---

## Sources

- [Supabase RLS Performance and Best Practices (oficial)](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv)
- [Supabase RLS Best Practices: Production Patterns (Makerkit)](https://makerkit.dev/blog/tutorials/supabase-rls-best-practices)
- [Why Your Supabase Data Is Exposed (DEV Community — case Lovable Jan/2025)](https://dev.to/jordan_sterchele/why-your-supabase-data-is-exposed-and-you-dont-know-it-25fh)
- [TanStack Query Optimistic Updates (oficial)](https://tanstack.com/query/v4/docs/framework/react/guides/optimistic-updates)
- [Concurrent Optimistic Updates in React Query (TkDodo)](https://tkdodo.eu/blog/concurrent-optimistic-updates-in-react-query)
- [React Query with DnD Kit: Item Goes Back Position Discussion #1522 (clauderic/dnd-kit)](https://github.com/clauderic/dnd-kit/discussions/1522)
- [Why does my optimistic update have a race condition (TanStack #7932)](https://github.com/TanStack/query/discussions/7932)
- [PostgreSQL: Documentation: 18: 7.8. WITH Queries (Recursive CTEs)](https://www.postgresql.org/docs/current/queries-with.html)
- [PostgreSQL: Speeding up recursive queries (Cybertec)](https://www.cybertec-postgresql.com/en/postgresql-speeding-up-recursive-queries-and-hierarchic-data/)
- [Supabase Discussion #149922 — RLS for multitenant](https://github.com/orgs/community/discussions/149922)
- [Supabase Discussion #32579 — Infinite Recursion in Policy](https://github.com/orgs/supabase/discussions/32579)
- [Direito ao esquecimento e a LGPD (Migalhas)](https://www.migalhas.com.br/depeso/335739/direito-ao-esquecimento-e-a-lgpd)
- [LGPD no Recrutamento e Seleção: como fazer a adequação (Solides)](https://solides.com.br/blog/lgpd-no-recrutamento-e-selecao/)
- [LGPD na Folha de Pagamento (Solides)](https://solides.com.br/blog/lgpd-na-folha-de-pagamento/)
- [Transparência salarial no Brasil: guia para empregadores (Deel)](https://www.deel.com/pt/blog/transparencia-salarial-no-brasil/)
- [The Code Rewrite Trap (Boyney.io)](https://www.boyney.io/blog/2020-11-13-code-rewrite-tap)
- [Refactoring Legacy Code Strategy (Brainhub)](https://brainhub.eu/library/refactoring-legacy-code-strategy)
- [Make your legacy code testable again (Better Programming)](https://betterprogramming.pub/make-your-legacy-code-testable-again-becdb5212c38)
- [React Hook Form: Working with Controlled and Uncontrolled (Medium)](https://medium.com/@sunilnepali844/react-hook-form-working-with-controlled-and-uncontrolled-components-0e11d4fb86f9)
- [shadcn-ui issue #427 (uncontrolled→controlled in hook form)](https://github.com/shadcn-ui/ui/issues/427)
- [Should I Trust A Wa.me Link? WhatsApp Safety Tips](https://www.onlinebrandambassadors.com/trust-a-wa-me-link/)
- [WhatsApp Business compliance & onboarding risks (PlanetVerify)](https://planetverify.com/blog/the-security-and-compliance-risks-of-whatsapp-for-business-and-customer-onboarding/)
- Codebase: `.planning/codebase/CONCERNS.md` (40+ findings — base de cross-reference)
- Codebase: `.planning/codebase/CONVENTIONS.md` (padrões in-place)
- Codebase: `UX-AUDIT-VAGAS.md` (12 friction points já documentados)
- Codebase direct: `src/hooks/hiring/useApplications.ts:73-114`, `src/components/hiring/CandidatesKanban.tsx:237-270`, `src/lib/hiring/statusMachine.ts:9-30`, `src/lib/hiring/stageGroups.ts:38-54` (análise estática que sustenta a hipótese de causa raiz do bug do kanban no Pitfall 2)

---

*Pitfalls research for: HR/ATS multi-tenant SaaS brownfield refactor (Lever Talents Hub)*
*Researched: 2026-04-27*
