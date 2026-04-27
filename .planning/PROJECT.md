# Lever Talents Hub

## What This Is

Plataforma SaaS multi-tenant que unifica **Gestão de Performance Interna** (1:1, avaliações líder↔liderado, pesquisa de clima) e **Recrutamento & Seleção (R&S)** num único app. Operada pelo Grupo Lever (holding de 7 empresas internas) tanto para uso interno quanto como serviço de R&S vendido para empresas-cliente externas. O app foi originalmente concebido para a operação de performance da esposa do owner; o módulo de R&S foi enxertado depois e a convivência dos dois módulos é o que esta rodada de refactor vem resolver.

## Core Value

**Fluxos principais funcionam sem erro, com dados sempre escopados corretamente por empresa (ou grupo de empresas).** Se tudo o mais falhar, isso aqui precisa estar de pé: o usuário entra, seleciona uma empresa (ou o Grupo Lever), e cada tela do app reflete fielmente esse escopo — sem vazamento, sem dados sumindo, sem precisar de gambiarra.

## Requirements

### Validated

<!-- Inferido do codebase map (.planning/codebase/ARCHITECTURE.md, STRUCTURE.md, INTEGRATIONS.md). Já existe e roda em produção, mesmo que com bugs. -->

- ✓ Auth com email/senha via Supabase — existing
- ✓ Roles básicos (admin, RH, líder, liderado) — existing
- ✓ Kanban de vagas estilo Notion (drag-and-drop entre stages) — existing
- ✓ Drawer aninhado de candidato dentro do kanban (sem navegação fora da página) — existing
- ✓ Banco de Talentos com `candidate_conversations` + seção de transcrições expansíveis no perfil — existing
- ✓ /empresas (CRUD básico de companies) — existing
- ✓ Avaliações líder↔liderado — existing
- ✓ 1:1 — existing
- ✓ Pesquisa de clima — existing
- ✓ Dashboard com indicadores de folha (com gaps de escopo por empresa) — existing
- ✓ Brand primitive `LeverArrow` + design system Linear (Btn, Chip, LinearAvatar) — existing

### Active

<!-- Refactor + redesenho de fluxos. Sem features novas grandes. -->

**Tenancy & escopo**

- [ ] Modelar empresa como **entidade única** com features ativas (`performance_enabled`, `rs_enabled`) ligáveis no cadastro e editáveis depois — sem flag interna/externa
- [ ] Modelo genérico de **grupos de empresas** (tabela `company_groups`); criar instância "Grupo Lever" agrupando as 7 internas
- [ ] **Seletor global de escopo no header** (canto superior direito): lista empresas individuais + grupos disponíveis. Trocar = todo o app refiltra (vagas, candidatos, performance, dashboards). Lembra última seleção
- [ ] **RBAC**: Admin = acesso total; RH = acesso total (operacional); Sócio = membership N:N a empresas; Líder/Liderado = via org_units
- [ ] Migrar dados existentes para o novo modelo de tenancy sem perder histórico

**Estrutura organizacional**

- [ ] **Org_units adaptáveis**: árvore com `parent_id` por empresa (departamentos → times → squads → ...) com profundidade arbitrária. Líderes podem existir em qualquer nível. Líder de unit pai vê tudo abaixo (recursivo)
- [ ] Onboarding de pessoa: RH cria usuário + senha temporária; **app gera mensagem pré-formatada pra WhatsApp** (template com link e credencial). No primeiro login, pessoa troca a senha

**R&S**

- [ ] Vaga **vinculada a 1 empresa** (obrigatório, não-nulo)
- [ ] Stages do kanban: **template global** padrão configurável + cada vaga pode adicionar/remover stages locais
- [ ] **Banco de Talentos global** (cruza empresas) com tags de empresa/vaga e histórico de participação. Auditoria + termo de consentimento LGPD obrigatórios para uso externo
- [ ] Candidato é entidade global, pode estar em N vagas de N empresas simultaneamente
- [ ] **Estabilizar bug crítico do kanban R&S** (mover candidato falha / dados somem) — bug #1 do refactor

**Performance interna**

- [ ] Avaliações líder↔liderado em **ciclos por empresa** (RH abre quando faz sentido, sem janela global)
- [ ] **Pesquisa de clima 100% anônima**, ciclos por empresa, RH dispara
- [ ] Quem vê resultado: RH + líder direto. Liderado vê só o próprio
- [ ] **1:1**: pauta colaborativa, notas, action items. Privadas entre líder-liderado, **mas RH vê tudo**
- [ ] **Anexo de transcrição + resumo Plaud no 1:1** (Lever usa gravador Plaud na empresa) — campo dedicado para colar/upload da transcrição e resumo automatizado

**Dashboards**

- [ ] **Dashboard de sócio**: foco em KPIs financeiros (folha total da empresa selecionada calculada da soma de salários cadastrados, custo médio por colaborador). Performance e R&S ficam em telas dedicadas
- [ ] **Folha = soma de salários cadastrados** dos funcionários ativos da empresa (sem integração com folha externa nesta rodada)

**Qualidade & estabilidade**

- [ ] Cobertura de testes inicial nos fluxos críticos: auth, RBAC, mover candidato no kanban, salvar avaliação, switch de empresa
- [ ] Fechar gaps de **RLS** identificados em `.planning/codebase/CONCERNS.md`
- [ ] Remover logs sensíveis (dados pessoais em console)
- [ ] Quebrar componentes monolíticos (1169+ linhas flagged em CONCERNS.md)
- [ ] Resolver dual lockfile (`bun.lockb` + `package-lock.json`) — padronizar em um

### Out of Scope

- **Features novas grandes** (ATS público, ML de matching, integração com folha externa, portal do candidato externo) — refactor primeiro, features depois
- **Mudança de stack** — Vite/React/TS/Supabase/shadcn ficam
- **App mobile nativo** — web responsivo serve
- **White-label por cliente externo** — Lever Talents é a operadora visível
- **Onboarding por email** — preferência do usuário é WhatsApp com mensagem pré-gerada
- **Avaliações em ciclos globais sincronizados entre empresas** — cada empresa no seu ritmo
- **Bancos de talentos isolados por empresa** — banco é global por decisão estratégica
- **Visão "holding consolidada"** com agregação de números das 7 — escopo é sempre por empresa OU grupo (filtro), não consolidado magicamente
- **Integração com Tiny ERP / sistemas externos de folha** — fora dessa rodada

## Context

- **Origem**: app criado pelo owner pra esposa operar performance de times (1:1, clima, avaliações). Módulo R&S adicionado depois sem refatorar o modelo de tenancy
- **Realidade operacional**: Lever Talents = grupo de 7 empresas internas + presta R&S a empresas-cliente externas
- **Personas chave**:
  - Admin / Owner — visão total, operações de configuração
  - RH (compartilhado, atende várias empresas) — opera R&S e disparo de ciclos de performance
  - Sócio — vê empresas atribuídas a ele, foco em KPIs financeiros (folha)
  - Líder — vê seu time (org_unit) + descendentes; conduz 1:1 e avaliações
  - Liderado — vê só seu próprio histórico de avaliações e responde clima/avaliações invertidas
- **Plaud (gravador físico)** já em uso na empresa pra capturar 1:1 → app precisa receber transcrição + resumo
- **WhatsApp** é o canal preferencial de credenciais (não email)
- **Codebase mapeado** em `.planning/codebase/`: 1.918 linhas de documentação cobrindo stack, arquitetura, estrutura, convenções, testes (zero hoje), integrações e concerns (40+ findings)
- **UX-AUDIT-VAGAS.md** existe na pasta-pai (`/Users/eryk/Documents/APP LEVER TALETS/UX-AUDIT-VAGAS.md`) com 12 friction points em vagas — usar como input pro fluxo R&S
- **Brand kit** em `/Users/eryk/Documents/APP LEVER TALETS/marca/` — wordmark dark/light + símbolo isolado disponíveis. Já tem skill `lever-talents-brand` definindo visual, cor, voz
- **Supabase ativo**: projeto `ehbxpbeijofxtsbezwxd` (migrado em 2026-04-23 do antigo `wrbrbhuhsaaupqsimkqz`)

## Constraints

- **Tech stack**: Vite + React 18 + TypeScript 5.8 + Supabase (Postgres + Auth + Realtime + Storage) — **manter**
- **UI**: shadcn/ui + Radix + Tailwind + Linear design system primitives (`Btn`, `Chip`, `LinearAvatar`, etc.) — **manter**
- **Brand**: brand primitive `LeverArrow` obrigatório; **nunca** usar Lucide ArrowX ou font-display custom como stand-in do logo/símbolo (regra registrada em memória do projeto)
- **Tenancy via Supabase RLS** — todas as tabelas com `company_id` precisam de policies de leitura/escrita escopadas; tabelas com `group_id` idem
- **LGPD**: banco de talentos global cruzando clientes-R&S externos exige consentimento explícito do candidato e trilha de auditoria de quem acessou cada perfil
- **Dual lockfile** atual (`bun.lockb` + `package-lock.json`) é débito a ser resolvido cedo no refactor
- **Zero testes hoje** — decisão: começar Vitest + React Testing Library no primeiro momento que tocar código crítico, não como fase isolada
- **Componente monolítico de 1169+ linhas** flagged em CONCERNS.md precisa ser quebrado quando tocado
- **Critério de done do refactor**: fluxos principais sem erro + dados batendo por escopo (empresa ou grupo)
- **Sem features novas grandes** nessa rodada — refactor + redesenho de fluxos preserva conjunto de capabilities atual
- **Sem mudança de identidade visual** — brand kit é estável, foco é coesão funcional

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Empresa única + features ativas (sem flag is_internal/external) | Empresa externa pode no futuro ativar Performance — flexibilidade vence rigidez | — Pending |
| Modelo genérico de `company_groups` com "Grupo Lever" como primeira instância | Outros clientes podem ter grupos próprios; modela genérico desde já evita migração futura | — Pending |
| Seletor global de escopo (empresa OR grupo) no header com filtro que propaga em TODO o app | UX consistente; resolve a queixa de "tudo desconexo" | — Pending |
| Admin e RH têm acesso total (são equivalentes em escopo) | Realidade operacional: RH compartilhado atende várias empresas, não faz sentido restringir | — Pending |
| Org_units em árvore (parent_id) com líderes em qualquer nível | Estruturas das empresas variam (squads, departamentos, times); modelo precisa ser adaptável | — Pending |
| Onboarding via senha temporária + mensagem pré-gerada pra WhatsApp | Email é fricção real para o público liderado; WhatsApp é o canal corrente | — Pending |
| 1:1 abertos pro RH + campo de anexo da transcrição/resumo Plaud | Gravador físico já existe e o RH precisa do conteúdo pra ESL/auditoria | — Pending |
| Banco de Talentos global cruzando empresas com tags + auditoria LGPD | Reaproveitamento de candidatos é valor real; risco LGPD mitigado com consentimento + log | — Pending |
| Refactor sem features novas grandes | Foco em coesão, estabilidade e correção de fluxos antes de expandir | — Pending |
| Folha calculada da soma de salários cadastrados | Sem integração externa nessa rodada; valor calculado é "bom o suficiente" | — Pending |
| Pesquisa de clima 100% anônima | Sinceridade > rastreabilidade; agregado por org_unit é suficiente | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-27 after initialization*
