# Feature Research — Lever Talents Hub

**Domain:** HR/People SaaS (Performance Management + Recrutamento & Seleção) — Brazilian market, multi-tenant operadora-de-RH model
**Researched:** 2026-04-27
**Confidence:** MEDIUM-HIGH (HIGH on competitive ecosystem benchmarks; MEDIUM on Brazil-specific blue-collar UX claims; LOW on a few negative-space anti-feature claims, flagged inline)
**Mode:** Brownfield refactor — categorize EXISTING capabilities by table-stakes vs differentiator vs anti-feature, NOT discover greenfield features

---

## How to Read This Document

This research is anchored on the **5 capability areas already shipped** in `leverup-talent-hub` (per `PROJECT.md` Validated section):

1. **Performance — Avaliações líder↔liderado**
2. **Performance — 1:1 (com integração Plaud)**
3. **Performance — Pesquisa de clima**
4. **R&S — Kanban de vagas + drawer aninhado de candidato**
5. **R&S — Banco de Talentos global cross-empresa**

Plus 3 cross-cutting concerns:

6. **Multi-tenancy — switcher de escopo, RBAC, dashboards por persona**
7. **Onboarding — credenciais via WhatsApp, senha temporária**
8. **LGPD — consentimento + auditoria do banco global**

For each area I report: what BEST-IN-CLASS systems do in 2026, what is **table stakes** (the team is missing it and users will leave), what is **differentiator** worth pulling in this refactor budget, and what is **anti-feature** (deliberately NOT building, with rationale rooted in this project's constraints).

**Brownfield budget reminder:** This is a refactor, not a feature push. Per `PROJECT.md > Out of Scope`: no ATS público, no ML matching, no portal de candidato externo, no integração folha externa. Differentiators flagged here must respect that envelope.

---

## Feature Landscape

### Table Stakes (Existing or Missing, Users Expect)

These are the floor. Missing = product feels incomplete, RH/líder/sócio churn out.

| # | Feature | Capability Area | Status | Why Expected (2026) | Complexity | Notes |
|---|---------|-----------------|--------|---------------------|------------|-------|
| TS-01 | **Stage transitions sem-bug no kanban** (drag move = persiste, sem dado sumindo) | R&S Kanban | EXISTS, BUGGY | Kanban quebrado é dealbreaker. Lever, Greenhouse, Gupy todos têm máquina de estado validada que persiste em <100ms. UX-AUDIT F11 (`sem_retorno` órfão) ainda não corrigido. | M | **Bug #1 do refactor** já marcado em PROJECT.md. RLS + transição atômica server-side. |
| TS-02 | **Card de vaga mostra contagem + distribuição por etapa** | R&S Kanban | MISSING | Gupy, Kenoby, Lever todos exibem contagem por estágio direto no card (UX-AUDIT F6). Sem isso, RH não identifica gargalo de relance. | S | Query `applications group by job_id, stage_group`. Sparkbar no card. |
| TS-03 | **Descoberta de "Vagas" para líder no menu lateral** | R&S Kanban | BUG | Sidebar esconde "Vagas" para líder mesmo a rota aceitando-o (UX-AUDIT F5). Greenhouse e Gupy mostram para qualquer hiring manager. | XS | Trocar `canManage` por `canManage \|\| isLeader` em `Sidebar.tsx:126`. |
| TS-04 | **Drawer lateral para candidato** (NÃO navegação fora) | R&S Kanban | MISSING | UX-AUDIT F4 + decisão registrada em `feedback_ux.md` (preferência Notion-style). Lever ATS, Notion, Linear e Plane todos usam side-panel preservando o board atrás. | M | Já planejado no Sprint 3 do UX audit. Drawer sobre kanban via Radix Sheet/Dialog. |
| TS-05 | **Audit trail / activity log por candidato** | R&S | PARCIAL | LGPD exige (Art. 37 — registro de operações) e qualquer ATS sério mostra "quem viu, quem moveu, quando" no perfil. | M | Já existe `candidate_conversations`; faltam events de stage move e visualização. |
| TS-06 | **Filtros que respeitam o escopo selecionado no header** | Multi-tenancy | MISSING | "Tudo desconexo" é a queixa central (PROJECT.md). Switcher trocou empresa → tela DEVE refletir, sem o usuário precisar refiltrar. | M | Provider de escopo + propagação em todos os hooks `use*`. Lembrar última seleção. |
| TS-07 | **Roles operacionais funcionais** (admin, RH, líder, liderado, sócio) com guards client-side **e** RLS server-side | Multi-tenancy | PARCIAL | RLS gaps já flagged em `CONCERNS.md`. Sem RLS = vazamento entre clientes-R&S = morte LGPD. | L | RBAC acima da RLS é defesa em profundidade; ambos obrigatórios. |
| TS-08 | **Avaliações líder↔liderado com ciclo + janela** | Performance | EXISTS | Sólides, Feedz, Lattice, Personio — todos têm. Sem ciclo, vira formulário aleatório. | EXISTS | Ajuste: ciclo POR EMPRESA (não global) — ver TS-09. |
| TS-09 | **Ciclos de avaliação independentes por empresa** | Performance | MISSING | RH compartilhado opera 7 empresas em ritmos diferentes. Forçar ciclo global = RH faz fora do app = app perde uso. | M | Tabela `evaluation_cycles` com `company_id`. RH abre/fecha por empresa. |
| TS-10 | **Pesquisa de clima 100% anônima com supressão de baixos respondentes** | Performance | EXISTS (anônima) — supressão é dúvida | Threshold de 8-10 respondentes para suprimir resultado é padrão (CUPA-HR, Effy, ContactMonkey 2026). Sem isso, "anônima" é ficção. | S | Adicionar guard: agregação só quando ≥N respostas. Configurar N por empresa. |
| TS-11 | **1:1 com pauta colaborativa, notas, action items** | Performance | EXISTS | Lattice, 15Five, Feedz padronizaram. Notas órfãs sem action items é "Word com data". | EXISTS | Mantido. Privacidade: líder↔liderado privado, RH lê — ver DIF-04. |
| TS-12 | **Dashboard com KPIs por persona** | Dashboard | PARCIAL | Sócio quer folha; RH quer pipeline; líder quer time. Hoje há "dashboard básico" — sem persona-shape. | M | 3 telas de dashboard, não 1 com toggle. |
| TS-13 | **Folha calculada da soma de salários cadastrados (sem integração)** | Dashboard | EXISTS | Decisão registrada em PROJECT.md. ERP integration explicitamente fora dessa rodada. | EXISTS | Validar agregação por escopo (empresa/grupo). |
| TS-14 | **Onboarding de pessoa: senha temporária + troca no 1º login** | Onboarding | MISSING/PARCIAL | Sólides, Pontotel, Solides, Feedz fazem. Sem isso, RH dá login com senha permanente, vira buraco de segurança. | S | Supabase Auth tem fluxo recovery; pode ser forçado via flag `password_change_required`. |
| TS-15 | **Mensagem WhatsApp pré-formatada para envio das credenciais** | Onboarding | MISSING | Decisão registrada (PROJECT.md). Contexto BR: WhatsApp open rate 98% vs email 21% (Aisensy 2026, NXC). | S | Botão "Copiar mensagem WhatsApp" + `wa.me/<num>?text=...` deeplink. |
| TS-16 | **Switcher de escopo (empresa OU grupo) no header com filtro propagando** | Multi-tenancy | MISSING | Toda SaaS multi-tenant moderna tem (WorkOS, Logto, Auth0 padrão). Sem ele, usuário fica fazendo workaround. | L | Já planejado. Persistir última seleção em localStorage. |
| TS-17 | **CRUD básico de empresa** (criar, editar features ativas, arquivar) | Multi-tenancy | EXISTS | Mantido. | EXISTS | Adicionar toggles `performance_enabled` e `rs_enabled` na tela. |
| TS-18 | **Banco de Talentos global cruzando empresas** com tags + histórico | R&S Banco Talentos | EXISTS | Lever ATS, Greenhouse, Loxo todos têm CRM de talentos cross-job. Decisão estratégica documentada. | EXISTS | Adicionar consentimento LGPD explícito — ver TS-19. |
| TS-19 | **Consentimento LGPD explícito do candidato + auditoria de quem acessou** | LGPD | MISSING | Captain Compliance + Secure Privacy 2026: ANPD foca em scraping/biometria; pool global cruzando clientes precisa de base legal sólida. ANPD multa até 2% receita BR. | M | Tabela `candidate_consents` + `candidate_access_log`. Termo na 1ª aplicação. |
| TS-20 | **Org_units em árvore (departamentos → times → squads)** com líder em qualquer nível | Estrutura | MISSING | Personio, BambooHR, Sólides — Tree obrigatória. Profundidade arbitrária, líder em qualquer nó vê descendentes. | L | `org_units(parent_id)` + recursão (CTE) para "vê tudo abaixo". |
| TS-21 | **Anexar transcrição/resumo da reunião 1:1** (Plaud é o caso BR) | Performance 1:1 | MISSING | Plaud, Otter, Granola, Fathom — anexar resumo no item de reunião é commodity. Lattice AI gera; nós colamos. | S | Campo `transcript_text` + `summary_text` em `one_on_ones`. Upload de PDF opcional. |
| TS-22 | **Estados de vaga: aberta → publicada → encerrada** com transição validada | R&S Vagas | EXISTS (parcial) | Status machine existe, mas vaga ainda é lista vertical (UX-AUDIT F1). Kanban DE VAGAS é sugerido em UX-AUDIT mas é diferenciador, não TS. | EXISTS | Lista funciona; promover Kanban-de-vagas é DIF-01. |
| TS-23 | **Histórico de aplicações do candidato** (mostra todas as vagas onde ele esteve) | R&S Banco Talentos | PARCIAL | Lever Talents Hub já modela candidato global; falta UI consolidada de "todas aplicações deste candidato em todas empresas". | S | View na tela de perfil do candidato: tabela de aplicações com link pra vaga. |
| TS-24 | **Logout sem expor dados sensíveis em console.log** | Segurança | BUG | Já marcado em PROJECT.md (Active > Qualidade). LGPD-relevante. | XS | Audit + remoção. |
| TS-25 | **Deduplicação por email/CPF no banco de talentos** | R&S Banco Talentos | INCERTA | Greenhouse auto-merge por email é padrão. Sem dedup, banco "global" vira lixo. Para BR, CPF é chave canônica também. | M | Constraint UNIQUE em `(email)` ou `(cpf)`. Merge tool para conflitos. |

#### Table-stakes — categorização rápida

- **Bugs imediatos** (TS-01, TS-03, TS-11 transparência sub-questionável, TS-24): semana 1.
- **Visibilidade do funil** (TS-02, TS-04, TS-12): foco do refactor de UX.
- **Tenancy** (TS-06, TS-07, TS-16, TS-17, TS-20): backbone do refactor — bloqueia tudo.
- **LGPD/segurança** (TS-05, TS-19, TS-25): obrigatório por lei e contrato R&S externo.
- **Onboarding** (TS-14, TS-15): habilita fluxo de novos liderados sem fricção.

---

### Differentiators (Worth Pulling Into This Refactor)

Brownfield budget é finito. Selecionei diferenciadores que (a) reaproveitam código já presente, (b) resolvem dor real registrada em UX-AUDIT/PROJECT.md, (c) entregam valor visível ao stakeholder (esposa do owner / sócio / RH).

| # | Feature | Capability Area | Value Proposition | Complexity | Worth Pulling In Refactor? | Notes |
|---|---------|-----------------|-------------------|------------|----------------------------|-------|
| DIF-01 | **Kanban de Vagas (não só lista vertical)** com colunas por status (`Aguardando descritivo`, `Triagem`, `Publicada`, `Encerrada`) | R&S Vagas | UX-AUDIT F1 — RH bate o olho e vê funil de vagas, não só de candidatos. Notion-style consistency com kanban de candidatos já existente. | M | **SIM** | Reaproveita `dnd-kit` já no bundle. Toggle Board/Tabela mantém "tabela" para quem prefere. Sprint 2 do UX audit. |
| DIF-02 | **Colunas consolidadas (16 → 6 grupos)** no kanban de candidatos com sub-stages como chips | R&S Kanban | UX-AUDIT F3 — 16 colunas é scroll horizontal infinito. 6 grupos cabem em 1440px. Notion (referência do owner) usa 7. | M | **SIM** | `lib/hiring/stageGroups.ts` já existe. Falta consumir na UI. Drag entre grupos abre picker da sub-stage. |
| DIF-03 | **Mensagem WhatsApp pré-formatada com link público de aplicação ou Fit cultural** | R&S Comunicação | Conversational recruiting BR (NXC, AiSensy 2026): WA tem 98% open rate. Já temos `/hiring/fit/:token` público. Permitir RH copiar mensagem com link em 1 clique = 10x menos fricção. | S | **SIM** | Templates em `lib/hiring/whatsappTemplates.ts`. Botão "Enviar via WhatsApp" reutilizável. |
| DIF-04 | **1:1 privado entre líder-liderado MAS RH consegue ler tudo** (com indicador "RH tem acesso") | Performance 1:1 | Decisão de PROJECT.md. Diferente de Lattice/15Five (privacidade total entre dupla). Para o caso Lever onde a esposa-RH precisa supervisionar saúde dos times, faz sentido. **Mas o usuário precisa SABER**. | S | **SIM** | RLS policy: `auth.uid() = leader_or_led OR has_role('rh')`. UI: badge "RH visível" no header do 1:1. |
| DIF-05 | **Anexo de Plaud (transcrição + resumo) no 1:1 com TIMELINE auditável** | Performance 1:1 | Plaud é commodity; o diferencial é integrar AO ITEM de reunião do 1:1 com timeline de "quem editou o quê quando". RH compartilhado fazendo ESL precisa disso. | S-M | **SIM** | Campos `transcript_text`, `summary_text`, `transcript_uploaded_by`, `transcript_uploaded_at`. Versionamento opcional. |
| DIF-06 | **Switcher de escopo lembra última seleção e mostra "viewing as Grupo Lever / Empresa X"** com badge persistente no header | Multi-tenancy UX | Greenhouse, WorkOS, Linear todos fazem. Reduz ansiedade ("estou em qual empresa?"). Crítico quando RH atende 7 empresas. | S | **SIM** | localStorage + componente `ScopeBadge` no header. |
| DIF-07 | **Mini-sparkbar de distribuição por etapa no card de vaga** | R&S Kanban | UX-AUDIT propõe. Vista de relance do funil daquela vaga sem clicar. Maioria dos ATS BR não tem (Gupy, Kenoby ficam no número total). | S | **SIM** | 5-6 segmentos coloridos: triagem, fit, entrevista, decisão, descartado. |
| DIF-08 | **SLA visual no card** (laranja >3d na mesma etapa, vermelho >7d) | R&S Kanban | Recruiterflow + Boundee 2026: ATS com SLAs reduz time-to-fill em 30%. Para R&S externo isso vira KPI cobrável. | S | **SIM** | Computed field `days_in_stage`. Bordas/dots no card. |
| DIF-09 | **Confidencial badge na vaga** (visibilidade restrita a hiring manager + admin/RH) | R&S Vagas | Padrão em Greenhouse, Lever ATS. Para R&S externo (substituições silenciosas) é deal-breaker em vendas enterprise. | S | **SIM** | Campo `is_confidential` + RLS condicional. Badge 🔒 no card. |
| DIF-10 | **Tags + busca cross-empresa no Banco de Talentos** com badge da empresa de origem | R&S Banco Talentos | Lever CRM e Loxo fazem. Para o caso Lever (operadora atendendo 7 internas + clientes externos), reaproveitar candidato qualificado é justificativa do banco global. | M | **SIM (parcial)** | Tags já existem em `candidate_conversations`. Falta busca/filtro robusto. |
| DIF-11 | **Atalhos de teclado no kanban** (`J`/`K` navegar, `Enter` abre drawer, `→` avança etapa, `N` nova vaga) | R&S Kanban | Linear, Notion, Granola — ferramentas modernas tem. RH operando o dia inteiro ganha 30%+ velocidade. UX-AUDIT Sprint 4. | S | **TALVEZ** (depende de bandwidth) | Polimento — tirar do MVP do refactor, deixar pra ondas seguintes. |
| DIF-12 | **Filtros inline na expansão da vaga (empresa, busca, origem)** sem SectionCard pesado | R&S | UX-AUDIT F7 — filtros em SectionCard rouba foco. Notion + Linear: chips de filtro inline. | S | **SIM** | Refator de `JobOpenings.tsx`. |
| DIF-13 | **Coluna "Encerradas" colapsada por padrão** com contador, expande on-demand | R&S Kanban | UX-AUDIT F8. Libera largura de tela útil. Asana, Notion, Linear todos fazem. | XS | **SIM** | UI state simples. |
| DIF-14 | **Próxima ação visível no card do candidato** (entrevista 09:30, CV pendente, fit não-feito) | R&S Kanban | UX-AUDIT 4.2. ATS modernos (Gupy, Lever) destacam "next step" no card. | S-M | **SIM (parcial)** | Próxima entrevista agendada já é dado disponível; faltam ícones e formatação. |
| DIF-15 | **Score de fit cultural visível no card + filtro por score** | R&S | Gupy Score (BR padrão), InfoJobs Brazil padronizou. Já temos `cultural_fit` table. Falta UI e filtro. | S | **SIM** | Aproveita `useCulturalFit` já existente. |
| DIF-16 | **Dashboard de sócio com folha + custo médio por colaborador** (escopado) | Dashboard | Já decidido em PROJECT.md. Diferencial: muitos ATS/HRMS não consolidam folha visível ao sócio porque dependem de integração ERP — nós calculamos da soma de salários. | M | **SIM** | Decisão chave registrada. |
| DIF-17 | **PDI (Plano de Desenvolvimento Individual) integrado a avaliações** | Performance | Feedz, Sólides, Pontotel — PDI é diferencial fortíssimo no mercado BR. Já temos `usePDIIntegrated`. Falta dar peso de 1ª classe. | M | **TALVEZ** | Existe no código mas pouco visível. Promover na navegação se cabe no escopo. |
| DIF-18 | **Termômetro de humor / pulse leve mensal** (NÃO confundir com clima formal) | Performance | Feedz "termômetro" é hit BR. 1 pergunta, 5 emojis, agregado por org_unit. Ortogonal ao ciclo de clima formal. | S | **NÃO NESTA RODADA** | Tentação de feature creep. PROJECT.md "sem features novas grandes". Marcar para próxima rodada. |
| DIF-19 | **Cmd+K palette com navegação cross-feature** (já existe!) — promover descoberta | Multi-tenancy UX | `CmdKPalette` já está em `Layout.tsx`. Polir e ensinar via `?` shortcut. Linear-style. | XS | **SIM** | Não é nova — só polimento de descoberta. |
| DIF-20 | **Visualização "tabela" alternativa ao kanban** (toggle Board/Tabela) | R&S | UX-AUDIT Sprint 2. Notion, Linear oferecem. RH com 200+ candidatos numa vaga prefere tabela ordenável. | M | **TALVEZ** | Adiciona valor real mas é trabalho dobrado. Reavaliar com base no nº de candidatos médio por vaga. |

#### Diferenciadores — recomendação enxuta para o refactor

**Pull-in agora (alta razão valor/custo):** DIF-01, DIF-02, DIF-03, DIF-04, DIF-05, DIF-06, DIF-07, DIF-08, DIF-09, DIF-12, DIF-13, DIF-14, DIF-15, DIF-16, DIF-19.

**Defer para próxima onda:** DIF-10 (banco talentos é grande sozinho), DIF-11 (atalhos = polimento), DIF-17 (PDI exige modelagem), DIF-18 (anti-creep), DIF-20 (toggle).

---

### Anti-Features (Deliberately NOT Building, with Rationale)

Tentações que parecem boas mas custam mais do que valem **neste contexto**.

| # | Anti-Feature | Por que parece boa | Por que é problemática AQUI | Alternativa | Confiança |
|---|--------------|--------------------|-----------------------------|-------------|-----------|
| AF-01 | **ML/AI matching candidato↔vaga** | Gupy faz, todo blog 2026 prega "AI-driven hiring". Vende fácil. | (a) PROJECT.md exclui explicitamente; (b) Gupy custou 50M+ pra acertar; (c) sem volume de aplicações para treinar; (d) ANPD foca enforcement em IA em 2025-26 — risco regulatório. | Filtro estruturado + busca por skills/tags. Score de fit cultural manual já existe. | HIGH |
| AF-02 | **Portal público do candidato** (track minha aplicação, login) | Gupy tem; "candidate experience" é obsessão de vendor 2026. | PROJECT.md exclui. Aumenta superfície de ataque (auth para externos), exige LGPD elevada, suporte. Lever opera B2B — candidato externo não é cliente final. | Página pública só de aplicação (sem login) + comunicação por WhatsApp/email. Status enviado ativamente, não consultado. | HIGH |
| AF-03 | **Integração com folha externa (Tiny ERP, Senior, Domínio)** | Sócio adoraria; "ERP-ready" vende. | Folha BR (CLT + INSS + FGTS + IRRF + sindical + CCT) é pântano. PROJECT.md exclui. Folha = soma de salários cadastrados é "good enough". | Campo `salary_brl` no `team_members`. Soma agregada por escopo. Marcar "estimativa" no UI. | HIGH |
| AF-04 | **White-label por cliente externo** (subdomínio próprio, brand customizado) | "Cliente vai amar ver logo dele". | PROJECT.md exclui. Brand Lever é a operadora visível. White-label é empreitada de 6+ meses (DNS, SSL wildcard, CSS overrides, suporte). | Cliente externo recebe relatórios com brand Lever; não white-label. | HIGH |
| AF-05 | **Visão "holding consolidada"** com soma mágica das 7 empresas em um relatório agregado | Sócio pediria. "KPI consolidado" soa poderoso. | PROJECT.md decidiu: escopo SEMPRE empresa OU grupo (filtro), não consolidação implícita. Misturar empresas oculta diferenças e enviesa decisão. | Switcher de "Grupo Lever" no header agrega via filtro explícito (não mágico). | HIGH |
| AF-06 | **Avaliações em ciclos globais sincronizados** entre empresas | "Padronização" parece bom. | PROJECT.md exclui. Realidade: 7 empresas em ritmos diferentes; forçar ciclo global = RH faz fora do app. | Ciclos por empresa. RH abre/fecha quando faz sentido por empresa. | HIGH |
| AF-07 | **Bancos de talentos isolados por empresa** (cada cliente vê só seus candidatos) | LGPD ortodoxa diria. Cliente ciumento poderia exigir. | PROJECT.md decidiu: banco é GLOBAL por valor estratégico (reaproveitamento). Mitigado com consentimento LGPD + auditoria + tags de empresa. | Banco global + consentimento explícito + log de acesso + termo no contrato R&S. | HIGH |
| AF-08 | **Onboarding por email** (link de boas-vindas, magic link, etc.) | Padrão silicon-valley. Stripe-style onboarding. | Decisão registrada (`feedback_ux.md` indireto + PROJECT.md). Liderado BR é blue-collar muitas vezes — email não é canal. WhatsApp é. | Senha temporária + mensagem WhatsApp pré-gerada (TS-15). | HIGH |
| AF-09 | **App mobile nativo** (iOS/Android) | "Mobile-first" 2026 mantra. Liderados moveriam tudo no celular. | PROJECT.md exclui. Web responsivo serve. Native = 2x dev effort, store reviews, push notifications, build pipeline. | Web responsivo + PWA leve se necessário (futuro). | HIGH |
| AF-10 | **Real-time everywhere** (Supabase realtime em todos os hooks) | "Notion-style live" é tentador. | Sobrecarrega backend, complica reconciliação de cache, raramente pago em UX. Lattice/15Five fazem refresh on-focus, não realtime constante. | Refetch on focus + invalidate em mutation. Realtime apenas em hot spots (kanban onde 2 RHs operam junto). | MEDIUM (claim baseado em padrão observado, não em métrica Lever específica) |
| AF-11 | **Generative AI para escrever feedback / avaliação por mim** | Lattice AI faz. "AI-powered" é selling point. | (a) PROJECT.md "sem features novas grandes"; (b) qualidade do feedback é o ponto da avaliação — automatizar = ruído; (c) ANPD foco em IA é risco. | Templates de avaliação prontos + dicas inline. RH cura, líder escreve. | HIGH |
| AF-12 | **Anonimização tipo "anônima mas RH descriptografa"** na pesquisa de clima | RH frustrado quer rastrear "quem deu nota baixa". | PROJECT.md decidiu 100% anônima. Sinceridade > rastreabilidade. Pseudonimização reversível mata confiança. | Agregação por org_unit com supressão de baixos respondentes (TS-10). Comentários abertos ficam — sem hash reverso. | HIGH |
| AF-13 | **Múltiplas pessoas no mesmo 1:1** (group meetings) | "Posso fazer 1:N?" pede líder. | 1:1 é por definição 1↔1. Grupo é outro objeto (reunião de time). Misturar = quebra modelo de privacidade do TS-11/DIF-04. | Recurso separado de "ata de reunião de time" se demanda surgir (FUTURO). | MEDIUM (decisão de produto não documentada explicitamente; LOW se houver demanda real do owner) |
| AF-14 | **Auto-promoção de candidato entre stages** (movimento programático sem RH no controle) | Gupy automation, Greenhouse triggers. | RH compartilhado precisa de controle manual + auditoria. Auto-move = surpresa ruim, dano LGPD. | Notificações ("este candidato está há 5d sem ação") sem mover automaticamente. | HIGH |
| AF-15 | **Edição inline do descritivo da vaga via WYSIWYG complexo** | "Notion editor" é sexy. | shadcn já tem rich text suficiente (Markdown ou TipTap básico). WYSIWYG full-stack é pântano. | Markdown editor simples + preview. | MEDIUM |
| AF-16 | **Multi-idioma (i18n)** | Investidor poderia exigir. | PROJECT.md silencioso, mas operação é 100% BR. i18n de RH é particularmente caro (terminologia legal — CLT, MEI, sócio, liderado). | PT-BR único. Documentar como decisão. Reverter se R&S internacional virar produto. | MEDIUM |
| AF-17 | **Plano de cargos e salários completo (curva, banda, mérito automático)** | Vendido por Sólides, Mereo. | PROJECT.md "sem features novas grandes". Plano C&S é módulo enterprise. Sem ele, a gestão atual é "salário no team_members" — suficiente para folha. | Campo único `salary_brl` por colaborador. Plano C&S = futuro. | HIGH |
| AF-18 | **Dashboard com toggles "ver como sócio / RH / líder" para um único usuário** | Power user adoraria. | View-as override de admin já existe — basta. Toggle por persona em UI dobra complexidade dos 3 dashboards. | Dashboards distintos por role com layout otimizado para cada um. Admin tem `view-as` para verificação. | MEDIUM |

---

## Feature Dependencies

```
[TS-16 Switcher de escopo]
  ├── requires ──> [TS-07 RBAC + RLS robustos]
  ├── requires ──> [TS-17 CRUD de empresa com features ativas]
  └── enables  ──> [TS-06 Filtros que respeitam escopo]
                       └── enables ──> [TS-12 Dashboards por persona]
                                          └── enables ──> [DIF-16 Dashboard sócio]

[TS-20 Org_units em árvore]
  └── enables ──> [Líder vê descendentes recursivamente]
                       └── enables ──> [TS-09 Ciclos de avaliação por empresa]
                                          └── enables ──> [TS-08 Avaliações com ciclo]

[TS-01 Stage transitions sem-bug]
  ├── unblocks ──> [TS-04 Drawer lateral candidato]
  ├── unblocks ──> [DIF-02 Colunas consolidadas 16→6]
  └── unblocks ──> [DIF-08 SLA visual]

[TS-19 Consentimento LGPD]
  ├── requires ──> [TS-25 Dedup por email/CPF]
  └── enables  ──> [TS-18 Banco de Talentos cross-empresa] (legalmente operável)
                       └── enables ──> [DIF-10 Tags + busca cross-empresa]

[TS-05 Audit trail por candidato]
  └── requires ──> [TS-07 RBAC + RLS robustos]

[TS-21 Anexar transcrição 1:1]
  └── requires ──> [TS-11 1:1 existe e funciona]
                       └── enables ──> [DIF-04 1:1 privado mas RH lê]
                                          └── enables ──> [DIF-05 Anexo Plaud com timeline]

[TS-14 Senha temporária + 1º login]
  └── enables ──> [TS-15 Mensagem WhatsApp pré-formatada]

[DIF-01 Kanban de Vagas]
  └── conflicts (sutil) ──> [TS-22 Lista de vagas existente]
       (resolução: toggle Board/Tabela — DIF-20, ou substituir lista por Kanban)
```

### Dependências críticas que BLOQUEIAM ordenação no roadmap

- **Tenancy backbone (TS-07, TS-16, TS-17, TS-20) é primeiro.** Tudo respira por aí. Bug do kanban (TS-01) pode rodar em paralelo, mas dashboards (TS-12) e ciclos por empresa (TS-09) dependem do escopo.
- **LGPD compliance (TS-05, TS-19, TS-25) antes de qualquer expansão do banco de talentos.** Operar banco global sem consentimento é responsabilidade civil + criminal sob ANPD.
- **TS-01 (bug do kanban) é semáforo.** Sem ele, qualquer trabalho em DIF-02/04/07/08 é polimento sobre algo quebrado.
- **DIF-04 (1:1 RH-visível) e DIF-05 (anexo Plaud) só fazem sentido depois de TS-11 estar estabilizado** — privacidade/RLS reescritas vão reverberar.

---

## MVP Definition (do REFACTOR)

Este não é um MVP greenfield — é o **escopo do refactor que recoloca o app de pé**. Critério: ao final, *fluxos principais sem erro + dados batendo por escopo*.

### Launch With (Refactor v1) — Ordem de batalha

**Onda 1 — Backbone (semanas 1-3)**
- [ ] TS-07 RBAC + RLS auditados (Admin, RH, Sócio, Líder, Liderado) — **fechar gaps de CONCERNS.md**
- [ ] TS-17 Empresa = entidade única + features ativas + CRUD
- [ ] TS-20 Org_units em árvore (`parent_id`)
- [ ] TS-16 Switcher de escopo no header (empresa OU grupo)
- [ ] TS-06 Filtros que respeitam o escopo selecionado (propagação em hooks)
- [ ] TS-24 Remoção de logs sensíveis

**Onda 2 — Bug crítico + UX core do R&S (semanas 3-5)**
- [ ] TS-01 Estabilizar bug crítico do kanban R&S (mover candidato sem perda)
- [ ] TS-03 Sidebar mostra Vagas para líder
- [ ] DIF-02 Colunas consolidadas 16 → 6 grupos
- [ ] TS-04 Drawer lateral de candidato (substitui navegação fora)
- [ ] TS-02 Card de vaga com contagem de candidatos
- [ ] DIF-07 Mini-sparkbar de distribuição no card
- [ ] DIF-13 Coluna "Encerradas" colapsada por padrão

**Onda 3 — LGPD + Banco de Talentos (semanas 5-7)**
- [ ] TS-25 Dedup por email/CPF no banco
- [ ] TS-19 Consentimento LGPD + termo no fluxo público de aplicação
- [ ] TS-05 Audit trail (mover stage, visualizar perfil)
- [ ] TS-23 Histórico de aplicações do candidato
- [ ] TS-18 Banco de Talentos cross-empresa (UI consolidada)

**Onda 4 — Performance + Onboarding (semanas 7-9)**
- [ ] TS-09 Ciclos de avaliação independentes por empresa
- [ ] TS-08 Avaliações com janela de ciclo (mantida, escopada)
- [ ] TS-10 Pesquisa de clima 100% anônima + supressão de baixos respondentes
- [ ] TS-11 1:1 estabilizado
- [ ] DIF-04 1:1 privado entre líder-liderado mas RH lê (com badge)
- [ ] TS-21 Campo de transcrição/resumo no 1:1
- [ ] DIF-05 Anexo Plaud com timeline auditável
- [ ] TS-14 Senha temporária + 1º login
- [ ] TS-15 Mensagem WhatsApp pré-formatada

**Onda 5 — Dashboards + Polimento (semanas 9-10)**
- [ ] TS-12 Dashboards por persona (sócio / RH / líder)
- [ ] DIF-16 Dashboard de sócio com folha agregada
- [ ] TS-13 Folha calculada da soma de salários
- [ ] DIF-06 Switcher com badge persistente "viewing as ..."
- [ ] DIF-08 SLA visual no card (laranja >3d, vermelho >7d)
- [ ] DIF-09 Confidencial badge na vaga
- [ ] DIF-12 Filtros inline na expansão da vaga
- [ ] DIF-14 Próxima ação visível no card do candidato
- [ ] DIF-15 Score de fit cultural visível + filtro
- [ ] DIF-19 Cmd+K palette polido

### Defer Para Próxima Rodada (depois do refactor)

- DIF-01 Kanban de Vagas — alto impacto de UX mas escopo grande; melhor entregar a lista enriquecida primeiro
- DIF-10 Tags + busca cross-empresa robusta no banco — só depois do banco LGPD-compliant rodando
- DIF-11 Atalhos de teclado completos
- DIF-17 PDI promovido a 1ª classe — modelagem precisa de tempo
- DIF-20 Toggle Board/Tabela
- DIF-18 Termômetro de humor (pulse rápido)

### Future Consideration (v2+, fora deste refactor)

- ATS público + portal do candidato externo (AF-02 hoje; pode ser feature mais tarde)
- ML matching com volume real de aplicações (AF-01 hoje; revisitar quando tiver 10k+ aplicações)
- Integração folha externa (AF-03)
- White-label (AF-04)
- App mobile nativo (AF-09)

---

## Feature Prioritization Matrix (compacto)

| # | Feature | User Value | Implementation Cost | Priority |
|---|---------|------------|---------------------|----------|
| TS-01 | Bug do kanban estabilizado | HIGH | MEDIUM | **P1** |
| TS-07 | RBAC + RLS robustos | HIGH | HIGH | **P1** |
| TS-16 | Switcher de escopo | HIGH | HIGH | **P1** |
| TS-19 | Consentimento LGPD | HIGH (legal) | MEDIUM | **P1** |
| TS-04 | Drawer lateral candidato | HIGH | MEDIUM | **P1** |
| DIF-02 | Colunas consolidadas | HIGH | MEDIUM | **P1** |
| TS-09 | Ciclos por empresa | HIGH | MEDIUM | **P1** |
| TS-15 | WhatsApp credenciais | HIGH (BR-fit) | LOW | **P1** |
| TS-21 | Transcrição 1:1 | HIGH | LOW | **P1** |
| DIF-04 | 1:1 com RH visibility | MEDIUM | LOW | **P1** |
| TS-02 | Contagem no card de vaga | MEDIUM | LOW | **P1** |
| DIF-07 | Sparkbar de distribuição | MEDIUM | LOW | **P1** |
| DIF-08 | SLA visual | MEDIUM | LOW | **P2** |
| DIF-09 | Confidencial badge | MEDIUM | LOW | **P2** |
| DIF-15 | Fit score visível | MEDIUM | LOW | **P2** |
| DIF-16 | Dashboard sócio | HIGH | MEDIUM | **P1** |
| DIF-01 | Kanban de Vagas | HIGH | HIGH | **P2** (defer) |
| DIF-10 | Banco talentos com busca | MEDIUM | HIGH | **P3** (defer) |
| DIF-17 | PDI 1ª classe | MEDIUM | HIGH | **P3** (defer) |
| DIF-11 | Atalhos de teclado | LOW | LOW | **P3** |

**Priority key:**
- **P1** — Must have neste refactor
- **P2** — Should have, encaixar se cabe
- **P3** — Defer para próxima rodada

---

## Competitor Feature Analysis

Comparativo direto: como **3 produtos de referência** abordam cada capability — e qual é a aposta do Lever Talents Hub.

### Performance Management

| Feature | Sólides (BR) | Feedz (BR) | Lattice (US) | Lever Talents Hub |
|---------|--------------|------------|--------------|-------------------|
| 1:1 com pauta colaborativa | Sim (Pulses) | Sim | Sim (template + AI) | **Sim** (TS-11), com **anexo Plaud** (TS-21, DIF-05) e **RH visível** (DIF-04) — diferencial BR |
| Avaliações líder↔liderado | Sim | Sim | Sim | Sim, **ciclos por empresa** (TS-09) — não global |
| Pesquisa de clima anônima | Sim, com filtros demográficos | Sim, com termômetro de humor | Sim (Engagement) | Sim, **100% anônima** com supressão (TS-10) |
| OKRs | Sim (módulo) | Sim | Sim (cascata) | **Não** — fora do refactor (PROJECT.md "sem features novas grandes") |
| PDI | Sim (forte) | Sim (forte) | Sim (Grow) | **Existe** mas pouco visível; promover é DIF-17 (defer) |
| AI para escrever feedback | Não | Não | Sim (Lattice AI) | **Não** (AF-11) — risco LGPD/IA + escopo |
| Termômetro de humor (pulse 1-pergunta) | Não | **Sim** (diferencial BR) | Sim (Engagement) | **Não nesta rodada** (AF-creep, ver DIF-18) |

**Aposta:** integração Plaud + RH-visibility no 1:1 + ciclos por empresa.

### R&S / ATS

| Feature | Gupy (BR líder) | Greenhouse (US) | Lever ATS (US) | Lever Talents Hub |
|---------|-----------------|-----------------|-----------------|-------------------|
| Kanban de candidatos | Sim (toggle list/kanban) | Sim | Sim | **Sim** (existe), com **drawer Notion-style** (TS-04) |
| Score de fit cultural | Sim (Gupy Score) | Custom scorecards | Custom scorecards | **Sim** (`useCulturalFit`), promover visibilidade DIF-15 |
| Banco de Talentos / CRM | Sim | Sim (CRM separado) | **Sim (forte)** — diferencial Lever ATS | **Sim, global cross-empresa** com **consentimento LGPD** (TS-18, TS-19) |
| Auto-merge / dedup | Sim (Gupy) | Sim (auto-merge por email) | Sim | **TS-25** (gap a fechar — email + CPF) |
| Vaga confidencial | Limitado | **Sim (forte)** | Sim | **DIF-09** (gap, P2) |
| Comunicação WhatsApp | Sim (Gupy WhatsApp) | Não nativo | Não nativo | **TS-15 + DIF-03** (mensagens pré-formatadas) — BR-native |
| Source tracking UTM | Sim | Sim | Sim | **Não auditado** — gap conhecido (LinkedIn Recruiter padrão `Gh_src=`) |
| AI matching candidato↔vaga | Sim (forte) | Sim (Greenhouse AI) | Sim | **Não** (AF-01) |
| Portal público do candidato | Sim | Sim | Sim | **Não** (AF-02) |
| ML de triagem automática | Sim | Sim | Sim | **Não** (AF-01, AF-14) |

**Aposta:** banco de talentos global com LGPD sólida + WhatsApp como canal nativo + drawer Notion-style. Não competimos em IA de matching.

### Multi-tenancy / Operadora-de-RH

| Feature | Greenhouse (multi-org via parent) | Lever (single-org foco) | Workday | Lever Talents Hub |
|---------|------------------------------------|--------------------------|---------|-------------------|
| Switcher de tenants no header | Sim | N/A | Sim (com setup) | **TS-16 + DIF-06** (P1) |
| Roles diferentes por tenant | Sim | Limitado | Sim | **TS-07** (RH/admin atendem todas; Sócio é N:N) |
| Banco de talentos cross-tenant | Não (cada org isolada) | N/A | Não | **Sim** (decisão estratégica + LGPD) |
| Dashboard por persona | Limitado | Sim | Sim (super complexo) | **TS-12 + DIF-16** (sócio/RH/líder distintos) |

**Aposta:** modelo "operadora-de-RH" com banco compartilhado é nosso diferencial — Greenhouse, Lever, Workday todos isolam por org. Confiando que RH-compartilhado é o use case real.

---

## Brazilian Context — Decisões registradas no produto

Lista compacta dos pontos onde "padrão americano" cede para "realidade BR":

1. **WhatsApp > email** para credenciais e comunicação com candidato (TS-15, DIF-03). Suportado por dados (98% open rate vs 21% email — AiSensy 2026, NXC).
2. **PT-BR único, sem i18n** (AF-16). Operação 100% BR. Reverter se virar produto internacional.
3. **CPF como chave canônica de dedup** complementar ao email (TS-25). Email é frágil em blue-collar BR.
4. **Folha calculada da soma de salários** (DIF-16, AF-03). Sem integração ERP. Marcado "estimativa".
5. **LGPD acima do GDPR-by-default** (TS-19, TS-05). ANPD multa até 2% receita BR; 2025-26 com foco em IA/scraping.
6. **Liderado pode ser blue-collar / com baixa fluência digital** — mensagem de credenciais em PT informal/empático, app responsivo, primeira navegação tutorada.
7. **Operadora-de-RH atendendo várias empresas é modelo BR comum** — não tem analogia direta no Greenhouse/Lever. Modelagem de tenancy reflete isso.
8. **Plaud é gravador físico real em uso na empresa** (não conceitual). Integração via texto colado/upload é suficiente; não vale empreitada de SDK proprietário.

---

## Sources

### Produtos analisados
- [Gupy ATS (Brasil)](https://www.gupy.io/software-de-recrutamento-e-selecao) — líder BR; ATS + Gupy Score + WhatsApp
- [Kenoby (Brasil) — agora Gupy](https://www.kenoby.com/blog/sistemas-de-recrutamento-e-selecao) — kanban + funil
- [Sólides](https://softwarefinder.com/hr/solides) — comprehensive BR all-in-one
- [Feedz (Brasil)](https://www.feedz.com.br/pdi/) — performance + termômetro + PDI
- [Lattice 2026 review](https://research.com/software/reviews/lattice) — OKR + 1:1 + Lattice AI
- [Greenhouse — best ATS G2 Spring 2026](https://www.greenhouse.com/newsroom/greenhouse-ranked-best-ats-in-the-g2-spring-2026-reports) — structured hiring + auto-merge
- [Lever ATS — talent CRM](https://biometrictalent.com/the-ultimate-ats-showdown-greenhouse-vs-lever-vs-workable-vs-bullhorn/)
- [15Five vs Culture Amp 2026](https://www.outsail.co/post/lattice-vs-15five-vs-culture-amp-performance) — continuous feedback, pulse
- [Plaud.ai — 112 línguas, integrações](https://www.plaud.ai/) — gravador físico

### Padrões e best practices
- [LGPD compliance 2026 — Captain Compliance](https://captaincompliance.com/education/lgpd-compliance-checklist/) — consentimento granular, audit trail
- [LGPD SaaS guide — Complydog](https://complydog.com/blog/brazil-lgpd-complete-data-protection-compliance-guide-saas) — base legal, retenção
- [Climate survey best practices — CUPA-HR 2024-26](https://www.cupahr.org/resource/a-guide-to-engagement-and-climate-surveys-that-inspire-action-2024-10-30/) — supressão de baixos respondentes
- [Pulse survey best practices — ContactMonkey 2026](https://www.contactmonkey.com/blog/pulse-survey) — threshold 8-10
- [WhatsApp HR playbook 2026 — AiSensy](https://m.aisensy.com/blog/whatsapp-for-hr-recruitment/) — open rate 98%, onboarding 24-48h
- [WhatsApp HR — NXC](https://waba.nxccontrols.in/blog/whatsapp-for-hr-recruitment-the-2026-hiring-playbook)
- [Confidential hiring — Sprounix](https://sprounix.com/blog/confidential-hiring-guide-executive-search) — private reqs, code names
- [SLA tracking ATS — Boundee](https://boundee.com/resources/hiring-sla-enforcement-gap-healthcare) — time-in-stage, 30% redução
- [Hiring funnel bottleneck — Cadient](https://cadienttalent.com/hiring-bottlenecks-analysis/)
- [Multi-tenant RBAC — WorkOS 2025](https://workos.com/blog/top-rbac-providers-for-multi-tenant-saas-2025) — tenant switcher pattern
- [360 evaluation cadence — Envisia Learning](https://www.envisialearning.com/blog/360-degree-feedback/how-often-should-you-repeat-a-360-degree-feedback-process/) — 12-24 month + custom
- [Kanban SLA — Nave](https://getnave.com/blog/service-level-agreements-kanban/)

### Internos
- `/Users/eryk/Documents/APP LEVER TALETS/leverup-talent-hub/.planning/PROJECT.md` — decisões registradas (Validated, Active, Out of Scope, Key Decisions)
- `/Users/eryk/Documents/APP LEVER TALETS/UX-AUDIT-VAGAS.md` — 12 friction points, plano Sprint 1-4
- `/Users/eryk/Documents/APP LEVER TALETS/leverup-talent-hub/.planning/codebase/ARCHITECTURE.md` — capability surface atual
- Memória persistente: `feedback_ux.md` (Notion-style preferência), `project_talent_pool.md` (entrega 22/04), `project_supabase_migration.md` (novo Supabase 23/04)

---

## Confidence Notes

- **HIGH** — Categorização table-stakes vs anti-feature, comparativo Gupy/Lattice/Greenhouse, dependências entre features, LGPD requirements (2025-26 enforcement focus em IA/scraping é fato ANPD), priorização P1/P2/P3.
- **MEDIUM** — Claims sobre "1:1 com group meetings é anti" (AF-13) — não confirmado se owner pediria; "WYSIWYG complexo é AF" (AF-15) baseado em padrão observado, não validação Lever; "i18n é AF" (AF-16) válido só enquanto operação for BR; toggle Board/Tabela (DIF-20) — depende de volume de candidatos.
- **LOW** — Estimativas semana de cada Onda (depende de bandwidth da equipe e descoberta durante refactor); previsão de adoção do termômetro de humor (DIF-18 defer) — sem dado de uso real.

**Gaps not yet researched (defer para fases específicas do roadmap):**
- Métricas/KPIs operacionais que cada persona quer ver (depende de entrevista com sócio + esposa-RH)
- Estrutura exata dos templates de avaliação líder↔liderado (cada empresa pode customizar?)
- Tamanho médio de empresa-cliente externa do R&S (calibra UX de listas/paginação)
- Volume típico de candidatos por vaga (calibra DIF-20 toggle Board/Tabela)
- SLA contratual de R&S externo (calibra DIF-08 thresholds de cor)

---

*Feature research for: Lever Talents Hub — brownfield refactor*
*Researched: 2026-04-27*
