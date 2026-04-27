# Phase 1: Tenancy Backbone - Context

**Gathered:** 2026-04-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Esta fase entrega o backbone de multi-tenancy: **trocar empresa ou grupo no header refiltra todo o app sem vazamento, sem flash, sem dado da empresa anterior**. Cobre 36 requisitos (TEN-01..10, RBAC-01..10, ORG-01..09, AUTH-04..05, QUAL-05/07/08/10) e migrações A-D (`company_groups` + feature flags → `org_units` + helpers → `socio_company_memberships` + RLS rewrite → `ScopeProvider` + `useScopedQuery` + ESLint guard).

**Em escopo:**
- Seletor global de escopo (empresa OU grupo) no header com persistência (Zustand) + URL (`?scope=...`)
- Adjacency-list de `org_units` por empresa (CTE recursiva, trigger anti-ciclo)
- 5 roles fixos com RLS via helpers `STABLE SECURITY DEFINER` (`visible_companies`, `visible_org_units`, `org_unit_descendants`)
- CASL no client (defesa-em-profundidade — RLS é a fronteira)
- Quality gates: lockfile único, ESLint regra `no-supabase-from-outside-hooks`, queryKey audit, scrubbing de PII em logs
- Cobertura pgTAP do leakage cross-tenant

**Fora desta fase:**
- Onboarding via WhatsApp (AUTH-01/02/03 — vai para Phase 3)
- Banco de Talentos LGPD (TAL-* — Phase 2)
- Bug do kanban + drawer (RS-* — Phase 2)
- Performance hooks reescritos com `useScopedQuery` (Phase 3 faz a migração mecânica; Phase 1 entrega o chokepoint)
- Migration G (contract — drop helpers antigos) — fica para Phase 4 após 1+ semana de estabilidade

</domain>

<decisions>
## Implementation Decisions

### Seletor de escopo: visual e posicionamento

- **D-01:** Trigger fica no **header (canto superior direito)**, dentro de `Layout.tsx`/`Header.tsx`, padrão Linear/Notion workspace switcher. Trigger compacto: ícone + nome do escopo atual + chevron. Mobile mantém posição (não move para sidebar).
- **D-02:** Dropdown abre lista **agrupada em duas seções** — "GRUPOS" (no topo) e "EMPRESAS" — com **busca embutida** (input no topo). Item atual marcado com check (✓).
- **D-03:** Trigger ESPELHA o badge persistente "Você está vendo: X" exigido por RBAC-07 — não há badge separado em outro lugar. Copy do trigger: nome do escopo (ex: "Grupo Lever" ou "Lever Consult").

### Seletor de escopo: comportamento ao trocar

- **D-04:** Switch é **instantâneo**: queryKey muda na hora, cache do escopo anterior **é preservado** (voltar = instantâneo, sem refetch). Telas que ainda não têm cache do novo escopo mostram **skeleton** até a query resolver. Implementação alinhada com pattern de partial-key invalidation do TanStack Query (`['scope', oldId, ...]`).
- **D-05:** **Confirmação ANTES de trocar** somente se houver form com dirty state detectado (`react-hook-form` `formState.isDirty` ou equivalente). Dialog: "Você tem alterações não salvas. Trocar de escopo vai descartar essas alterações." Sem dirty state: troca silenciosa, sem fricção.
- **D-06:** Trigger fica **disabled (somente leitura)** para roles cujo escopo é fixo (líder/liderado em UMA empresa só), com tooltip "Seu escopo é fixo". A regra: se `visible_companies(uid)` retorna ≤1 empresa E o usuário não tem nenhuma membership a grupo, o seletor não permite troca.

### Seletor de escopo: URL e fallback

- **D-07:** URL é fonte de verdade quando presente: precedência **URL > Zustand persist > default por role**. URL formato: `?scope=company:UUID` ou `?scope=group:UUID` (TEN-09).
- **D-08:** URL com escopo inacessível (sócio sem membership, link compartilhado para empresa fora do `visible_companies`, etc.) → **fallback silencioso** para escopo padrão do usuário (último persistido OU default por role) + atualizar URL para refletir o novo escopo + **toast neutro**: "Você não tem acesso àquele escopo — abrindo {escopo padrão}."
- **D-09:** **Não bloqueia o load com modal**. Sócio sem nenhuma membership cai num estado vazio dedicado ("Você ainda não tem empresa atribuída — fale com o admin") em vez de modal de escolha — admin/RH resolvem via UI de gestão.

### Seletor de escopo: default no primeiro login

- **D-10:** Default por role (quando não há persist nem URL):
  - **Admin / RH** → `Grupo Lever` (visão ampla, equivalente em escopo, otimiza primeiro contato com o app cheio)
  - **Sócio** → primeira empresa onde tem `socio_company_memberships`. Se só tem uma, é a única opção (trigger disabled).
  - **Líder / Liderado** → empresa do `org_unit` primário do usuário. Sem opção de trocar (trigger disabled).
- **D-11:** Default é resolvido **server-side via RPC** (`resolve_default_scope(uid)`) ou no boot do `ScopeProvider` antes do primeiro render — não pisca placeholder.

### Claude's Discretion

Áreas em-escopo de Phase 1 onde a discussão delegou para o planner com base em research e codebase patterns. O planner deve registrar a decisão no PLAN.md.

**Outras gray areas da fase (não discutidas explicitamente nesta sessão):**
- **Backfill: identidade das 7 empresas internas + memberships de sócio** — `gsd-phase-researcher` deve investigar se é input do owner, seed via supabase migration estática, ou UI de RH para preencher pós-deploy. Se RH UI: definir se Phase 1 entrega telas mínimas ou só os endpoints (UI completa pode ir para Phase 4 polish).
- **Estado inicial de `org_units`** — auto-criar uma raiz por empresa no backfill (ex: nó "{nome-da-empresa}" como root) vs deixar `org_units` vazio e exigir RH montar via UI. Recomendação default: auto-criar raiz, RH renomeia/expande depois.
- **`unit_kind` enum** — fixo (`department`/`team`/`squad`) ou free-form `text`. Sem direção forte do owner; recomendação default é free-form com sugestões (input com datalist) — flexibilidade para empresas com nomenclatura diferente.
- **Migração `teams` → `org_units`** — 1:1 cada team vira um org_unit no nível 1 abaixo da raiz da empresa, mantendo membros. `teams` permanece read-only durante backfill (ORG-09); descontinua só na Phase 4 (Migration G).
- **CASL UI hiding policy** — esconder elementos completamente vs desabilitar com tooltip. Recomendação: esconder por default (limpa), desabilitar com tooltip apenas em ações que o usuário "quase pode fazer" (ex: editar candidato fora do escopo dele).
- **Quality gates rollout** — ESLint regra como **error** desde o primeiro PR de Phase 1 (CI falha) — refactor faz sentido com o guard ativo, não como TODO. Lockfile (`bun.lockb` removed) — primeiro commit da fase. PII em `console.log` — wrapper `logger.ts` com `if (DEV)` em vez de remover (preserva debugging local).
- **Componentes monolíticos (1169+/909/854 linhas)** — quebrar SOMENTE quando Phase 1 tocar (regra do PROJECT.md). Phase 1 toca pouco esses componentes; quebra real fica para Phase 2-3.

**Mini-decisões do seletor não exploradas (planner decide via convenção):**
- Cross-tab sync (mudar escopo numa aba propaga para outras) — sugestão: `BroadcastChannel` API; fallback `storage` event do localStorage. Não-bloqueante para Phase 1; pode entrar na primeira iteração ou ficar como follow-up.
- Prefetch on-hover do dropdown item — sugestão: prefetch quando hover dura >200ms.
- Ordering padrão dos itens — sugestão: empresas alfabéticas, grupos no topo. Última seleção pode subir para 1º após a busca — opcional.
- Comportamento ao trocar de escopo numa rota profunda (`/vagas/abc?scope=company:X`) → trocar para `?scope=company:Y` — sugestão: redirecionar para a lista pai (`/vagas`) se a entity (`abc`) não existe no novo escopo; manter rota se existe (improvável dado RLS, mas casos do tipo "candidato global em Banco de Talentos" podem viver cross-empresa).
- Keyboard shortcut para abrir dropdown — sugestão: `g` + `s` (Linear convention) ou Cmd+K já cobre via CmdKPalette.

### Folded Todos

Nenhum — `gsd-sdk query todo.match-phase 1` retornou 0 matches.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project-level requirements
- `.planning/PROJECT.md` — Core value, locked decisions (Empresa única + features ativas; `company_groups` genérico; Admin = RH em escopo; org_units adjacency tree; sem features novas grandes)
- `.planning/REQUIREMENTS.md` — REQ-IDs Phase 1: TEN-01..10, RBAC-01..10, ORG-01..09, AUTH-04..05, QUAL-05/07/08/10 (36 total)
- `.planning/ROADMAP.md` §"Phase 1: Tenancy Backbone" — Goal, success criteria (5 pontos), migration coverage A-D, requirements list
- `.planning/STATE.md` — Current state, locked decisions table

### Research (architecture + pitfalls + stack)
- `.planning/research/SUMMARY.md` §"Architecture Approach" — RLS helper functions, scope propagation pattern, expand→backfill→contract migrations A-G
- `.planning/research/ARCHITECTURE.md` — Full architecture deep dive (880 linhas) com Patterns 1-5
- `.planning/research/PITFALLS.md` — P1 (vazamento cross-tenant), P3 (RLS recursion), P4 (cache pollution), P6 (org_units sem índice)
- `.planning/research/STACK.md` — Versões verificadas: `@casl/ability` 6.8, `zustand` 5.0.10, `pgTAP`, `@tanstack/eslint-plugin-query`; **NÃO upgrade Zod 3→4**

### Codebase context
- `.planning/codebase/ARCHITECTURE.md` — App.tsx (316 linhas), Layout, useAuth (com view-as), ProtectedRoute, hooks pattern
- `.planning/codebase/STRUCTURE.md` — Layout completo de `src/`
- `.planning/codebase/CONVENTIONS.md` — React Query + Supabase patterns, form patterns, route patterns
- `.planning/codebase/CONCERNS.md` — Sensitive console logging, RLS gaps, dual lockfile, monoliths flagged
- `.planning/codebase/INTEGRATIONS.md` — Supabase project `ehbxpbeijofxtsbezwxd` migrado de `wrbrbhuhsaaupqsimkqz`; OpenAI/Lovable Edge Functions; tabela `user_roles` é fonte canonical de role
- `.planning/codebase/STACK.md` — Stack atual (Vite 5 + React 18 + TS 5.8 + Supabase + shadcn/Radix + Tailwind + Linear primitives)

### Working guide
- `leverup-talent-hub/CLAUDE.md` — Guia ativo para o repo (stack locked, conventions, current phase)

### External (UX inputs)
- `/Users/eryk/Documents/APP LEVER TALETS/UX-AUDIT-VAGAS.md` — 12 friction points em vagas (relevante para Phase 2; não bloqueante para Phase 1, mas pode informar o trigger visual padrão)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`src/components/Layout.tsx`** — Wraps authenticated routes; ponto de inserção do `ScopeProvider` E do trigger no Header
- **`src/components/Header.tsx`** — Onde o dropdown trigger será renderizado (canto superior direito)
- **`src/hooks/useAuth.ts`** — Já carrega `userRole` + view-as; `ScopeProvider` lê o user dele para resolver default
- **`src/components/ProtectedRoute.tsx`** — Padrão de gating por role; CASL deve coexistir como segunda camada (UI hiding além do route guard)
- **`src/components/CmdKPalette.tsx`** — Já existe (cmdk lib); pode receber comando secundário `>scope` (não-bloqueante)
- **`src/components/MobileNav.tsx`** — Mobile precisa replicar o trigger do header
- **`src/components/EmptyState.tsx`** — Reusar para "Você ainda não tem empresa atribuída"
- **`src/lib/hiring/rlsScope.ts`** — Já tem helpers `is_people_manager`, `allowed_companies` — precedente para os novos helpers `visible_companies`/`visible_org_units`/`org_unit_descendants`
- **`src/lib/supabaseError.ts`** — Centraliza tradução de erros Postgrest (RLS 42501 com prefix `[RLS]`); reusar para fallback messages do scope inválido

### Established Patterns
- **React Query + Supabase em hooks** — Hoje 25+ hooks em `src/hooks/` e `src/hooks/hiring/` usam `supabase.from()` direto; ESLint custom rule (QUAL-07) precisa cobrir esses arquivos como permitidos e bloquear o resto
- **Form pattern** — `react-hook-form` 7.73 + `@hookform/resolvers` 5.2.2 + Zod 3.25 (NÃO upgrade Zod 4); `formState.isDirty` é o sinal canonical para a confirmação de troca de escopo
- **localStorage como fonte de session** — Supabase auto-refresh + view-as roleOverride; Zustand persist precisa namespace separado (`leverup:scope`) para não colidir
- **Edge Functions** — `create-user`/`delete-user`/`apply-to-job`/`hiring-cron-*`; Phase 1 não precisa criar nova Edge Function (RLS helpers vão direto no DB)

### Integration Points
- **`src/App.tsx`** — Setup do `QueryClient` (precisa `keepPreviousData` ou estratégia explícita de cache cross-scope; default da v5 já preserva); `ScopeProvider` envolve `<Outlet />` antes das rotas autenticadas
- **`src/integrations/supabase/client.ts`** — Singleton; nada muda aqui; `useScopedQuery` consome o singleton + injeta filtro
- **`src/integrations/supabase/types.ts`** — Auto-generated 8824 linhas; Phase 1 adiciona tipos novos (`company_groups`, `org_units`, `socio_company_memberships`) — regerar após cada migration
- **`src/lib/routes.ts`** — `LABELS`/`getBreadcrumbs`/`getPageTitle`; rotas autenticadas continuam iguais (scope é query param, não path segment)
- **`supabase/migrations/`** — 17+ migrations existentes (incluindo `20260416193100_hiring_rls_policies.sql`); Phase 1 adiciona timestamps após o último; pgTAP tests em `supabase/tests/`

</code_context>

<specifics>
## Specific Ideas

- **Pattern visual confirmado:** Linear/Notion workspace switcher — busca embutida + agrupamento "Grupos / Empresas" + check no atual. Esse é o ponto de referência mental do owner.
- **Copy do badge:** "Você está vendo: {escopo}" é a frase do RBAC-07; o trigger ESPELHA esse texto (não duplica em duas peças visuais).
- **Roles com escopo fixo (líder/liderado em uma empresa só):** trigger fica disabled com tooltip "Seu escopo é fixo" — não esconde o controle (afeta consistência visual entre roles).
- **Onboarding mental do owner para o seletor:** "trocar empresa = todo app refiltra, e voltar deve ser instantâneo" — esse é o requisito vivendo no nível de UX, não só técnico.
- **Estado vazio para sócio sem empresa:** mensagem direta ("Você ainda não tem empresa atribuída — fale com o admin"), sem deadlock de modal.

</specifics>

<deferred>
## Deferred Ideas

Nenhuma ideia surgiu fora do escopo de Phase 1 nesta discussão. As outras gray areas (Backfill / Org_units / RBAC edge cases / Quality gates) **continuam em escopo** desta fase — apenas não foram exploradas em conversa; ficam como "Claude's Discretion" para o planner decidir via research + codebase analysis.

### Reviewed Todos (not folded)
Não aplicável — `todo.match-phase 1` retornou 0 matches.

</deferred>

---

*Phase: 01-tenancy-backbone*
*Context gathered: 2026-04-27*
