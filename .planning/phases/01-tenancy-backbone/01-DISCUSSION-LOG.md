# Phase 1: Tenancy Backbone - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisões finais estão no `01-CONTEXT.md`. Este log preserva as alternativas consideradas.

**Date:** 2026-04-27
**Phase:** 01-tenancy-backbone
**Areas selected for discussion:** Seletor de escopo: UX + comportamento

---

## Area Selection

| Option | Description | Selected |
|--------|-------------|----------|
| Seletor de escopo: UX + comportamento | Visual, transição, estado vazio, mobile, fallback de URL inacessível. | ✓ |
| Backfill: Grupo Lever + 7 empresas + memberships | Quais empresas/slugs/IDs; quem é sócio; migration vs UI; user_roles.socio → memberships. | |
| Org_units: estado inicial + UX de gestão + migração teams→units | Auto-criar raiz vs RH manual; teams flat → tree; UI gestão; unit_kind enum vs free-form. | |
| RBAC edge cases + view-as admin + quality gates | Sócio sem membership; switch para grupo restrito; view-as scope; ESLint level; lockfile timing; PII logs. | |

**User choice:** Apenas "Seletor de escopo: UX + comportamento". Outras áreas seguem como "Claude's Discretion" no CONTEXT.md (em escopo de Phase 1, não exploradas em conversa).

---

## Seletor de escopo: UX + comportamento

### Q1: Posicionamento e visual

| Option | Description | Selected |
|--------|-------------|----------|
| Dropdown no header (canto superior direito) — Recomendado | Pattern Linear/Notion: trigger compacto (ícone + nome + chevron), abre dropdown com busca + agrupamento "GRUPOS"/"EMPRESAS", check no atual. Funciona com Layout.tsx atual; mobile mantém posição. | ✓ |
| Slot dedicado na sidebar (top) | Slack workspace switcher: linha no topo da Sidebar.tsx; mais visual mas afasta o controle do hot path; mobile precisa de tratamento extra. | |
| Combobox global via Cmd+K | Sem widget visual fixo; escopo atual como badge readonly + Cmd+K com `>scope` para trocar. Minimalista mas escondido demais para hot path. | |

**User's choice:** Dropdown no header (canto superior direito).
**Notes:** Selecionou com preview ASCII visível. Pattern Linear/Notion é referência mental. Busca embutida + agrupamento + check no atual.

---

### Q2: Transição ao trocar de escopo

| Option | Description | Selected |
|--------|-------------|----------|
| Switch instantâneo + skeleton onde houver dado em flight — Recomendado | Troca imediata; cache do escopo anterior preservado (volta = instantâneo); skeleton onde falta cache; SE form dirty (`react-hook-form formState.isDirty`) → confirm dialog; sem dirty: silenciosa. | ✓ |
| Switch sempre confirma antes (com preview) | Toda troca abre dialog com contagens ('Você verá: 12 vagas, 47 candidatos, 3 ciclos'). Adiciona fricção em uso diário. | |
| Switch instantâneo, sem proteção de form (perde dirty) | Sempre silencioso, drafts perdidos sem warning. Mais rápido mas frustrante para forms longos. | |

**User's choice:** Switch instantâneo + skeleton onde houver dado em flight + confirm se dirty.
**Notes:** Cache do escopo anterior preservado é decisão alinhada com partial-key invalidation do TanStack Query.

---

### Q3: URL com escopo inacessível

| Option | Description | Selected |
|--------|-------------|----------|
| Fallback silencioso para escopo padrão + toast informativo — Recomendado | Detecta scope fora de `visible_companies(uid)`, fallback para escopo padrão (último persistido OU primeira autorizada), atualiza URL, toast neutro 'Você não tem acesso àquele escopo — abrindo Empresa Y'. URL compartilhável não quebra UX. | ✓ |
| Página 403 dedicada com call-to-action | Tela 'Sem acesso a este escopo' com botões 'voltar' / 'solicitar acesso (mailto)'. Mais explícito mas tela quebradiça; +1 click. | |
| Bloqueia o login/load até escolher escopo manualmente | Modal 'Escolha um escopo' antes de qualquer rota. Para sócio sem membership = deadlock. | |

**User's choice:** Fallback silencioso para escopo padrão + toast informativo.
**Notes:** Atualizar URL para refletir o novo scope é parte da decisão.

---

### Q4: Default no primeiro login + badge persistente

| Option | Description | Selected |
|--------|-------------|----------|
| Default por role + badge é o próprio trigger — Recomendado | Admin/RH → 'Grupo Lever'; Sócio → primeira empresa com membership (única se só uma); Líder/Liderado → empresa do org_unit primário (escopo fixo, trigger disabled). Badge ESPELHA o trigger — não duplica. Trigger disabled com tooltip 'Seu escopo é fixo' para roles com escopo fixo. | ✓ |
| Default sempre 'primeira empresa' + badge em local separado | Default alfabético; badge num componente abaixo do header (status bar). Mais real estate vertical mas explicita visualmente. | |
| Default 'sem escopo' (modal de boas-vindas) + badge no dropdown | Primeiro login: modal 'Escolha o escopo' como onboarding explícito. Adiciona uma tela a cada novo dispositivo. | |

**User's choice:** Default por role + badge é o próprio trigger.
**Notes:** Para roles com escopo fixo (líder/liderado em UMA empresa), trigger fica disabled com tooltip "Seu escopo é fixo".

---

### Q5: Continuação ou pronto para CONTEXT?

| Option | Description | Selected |
|--------|-------------|----------|
| Pronto para CONTEXT.md — Recomendado | Capturei as 4 áreas centrais. Decisões secundárias (cross-tab sync, prefetch hover, ordering, rotas profundas, keyboard shortcut) viram 'Claude's Discretion'. | ✓ |
| Mais perguntas sobre o seletor | Drill em rotas profundas, busca, cross-tab sync, keyboard shortcut, ordering. | |
| Quero discutir outras áreas também | Voltar para seleção (Backfill / Org_units / RBAC / Quality gates). | |

**User's choice:** Pronto para CONTEXT.md.

---

## Claude's Discretion (em-escopo, não discutidas)

Áreas em escopo de Phase 1 deixadas para o planner decidir via research + codebase analysis:

- Backfill: identidade exata das 7 empresas internas; memberships de sócio; user_roles.socio → socio_company_memberships
- Estado inicial de org_units (auto-criar raiz vs exigir RH); migração teams → org_units (1:1 nível 1?); unit_kind enum vs free-form
- CASL UI hiding policy: hide vs disable+tooltip por contexto
- Quality gates rollout: ESLint regra como `error` desde PR 1; lockfile cleanup no primeiro commit; logger wrapper para PII
- Componentes monolíticos: quebrar SOMENTE quando Phase 1 tocar (regra do PROJECT.md)
- Cross-tab sync (BroadcastChannel ou storage event)
- Prefetch on hover do dropdown
- Ordering padrão dos itens (alfabética + grupos no topo + última seleção em destaque?)
- Comportamento ao trocar scope em rota profunda (manter entity vs redirect lista)
- Keyboard shortcut do dropdown

## Deferred Ideas

Nenhuma ideia surgiu fora do escopo de Phase 1 nesta sessão.
