# Phase 1: Tenancy Backbone — Research

**Researched:** 2026-04-27
**Status:** Ready for planning
**Source:** gsd-phase-researcher
**Confidence:** HIGH (all critical claims verified against Context7, Supabase official docs, npm registry, and codebase grep)

---

## Summary

Phase 1 delivers the multi-tenancy backbone: 4 SQL migrations (A, B, C — frontend "migration" D is code-only) introducing `company_groups`, `org_units` (adjacency-list tree), `socio_company_memberships`, and three `STABLE SECURITY DEFINER` RLS helpers (`visible_companies`, `visible_org_units`, `org_unit_descendants`); a `ScopeProvider` + `useScopedQuery` chokepoint that enforces `['scope', scope.id, ...]` prefix on every TanStack Query key; a Linear-style scope selector in the header; and four quality gates (lockfile dedup, ESLint custom rule blocking `supabase.from()` outside hooks/integrations, `@tanstack/eslint-plugin-query`, and pgTAP cross-tenant leakage tests). The phase MUST avoid (a) cross-tenant data leakage during the cutover (P1), (b) RLS recursion or performance regression (P3/P6), (c) cache pollution on scope switch (P4), and (d) breaking the dual-mode `view-as` admin debugging that already lives in `useAuth.ts`.

The work is constrained by 11 locked decisions (D-01..D-11) — owner approved the Linear/Notion-style header trigger, dropdown groups + search, instant switch with cache preservation, dirty-form confirmation, disabled trigger for fixed-scope roles, URL > Zustand > role-default precedence, silent fallback for inaccessible scopes, empty state (not modal) for sócio-without-company, and server-side default resolution via RPC `resolve_default_scope(uid)`. Research below produces concrete recommendations for the gray areas the planner must turn into tasks.

**Primary recommendation:** Sequence as A → B → C → D where A/B/C are 3 reversible expand-only SQL migrations (no contract phase in this phase — Migration G stays Phase 4), backfill of "Grupo Lever" + 7 internal companies happens in C (idempotent SQL seed), and D is purely frontend (`ScopeProvider`, `useScopedQuery`, header trigger, ESLint rule). pgTAP tests live in `supabase/tests/` and run via `supabase test db` in CI. ESLint custom rule ships as `error` from PR 1 with a hard-coded allowlist of files that legitimately call `supabase.from()` directly.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions (D-01..D-11) — DO NOT relitigate

**Seletor visual + posicionamento:**
- **D-01:** Trigger no header (canto superior direito) dentro de `Layout.tsx`/`Header.tsx`, padrão Linear/Notion. Trigger compacto: ícone + nome do escopo atual + chevron. Mobile mantém posição (não move para sidebar).
- **D-02:** Dropdown abre lista agrupada em duas seções — "GRUPOS" (no topo) e "EMPRESAS" — com busca embutida (input no topo). Item atual marcado com check (✓).
- **D-03:** Trigger ESPELHA o badge persistente "Você está vendo: X" exigido por RBAC-07 — não há badge separado em outro lugar.

**Comportamento ao trocar:**
- **D-04:** Switch instantâneo: queryKey muda na hora, cache do escopo anterior é preservado (voltar = instantâneo, sem refetch). Telas sem cache do novo escopo mostram skeleton até a query resolver. Implementação alinhada com partial-key invalidation do TanStack Query.
- **D-05:** Confirmação ANTES de trocar somente se houver form com dirty state detectado (`react-hook-form` `formState.isDirty`). Dialog: "Você tem alterações não salvas. Trocar de escopo vai descartar essas alterações." Sem dirty: troca silenciosa.
- **D-06:** Trigger disabled (somente leitura) para roles cujo escopo é fixo, com tooltip "Seu escopo é fixo". Regra: se `visible_companies(uid)` retorna ≤1 empresa E o usuário não tem nenhuma membership a grupo, o seletor não permite troca.

**URL e fallback:**
- **D-07:** URL > Zustand persist > default por role. URL formato: `?scope=company:UUID` ou `?scope=group:UUID` (TEN-09).
- **D-08:** URL com escopo inacessível → fallback silencioso para escopo padrão + atualizar URL para refletir o novo escopo + toast neutro: "Você não tem acesso àquele escopo — abrindo {escopo padrão}."
- **D-09:** Não bloqueia o load com modal. Sócio sem nenhuma membership cai num estado vazio dedicado em vez de modal de escolha.

**Default no primeiro login:**
- **D-10:** Default por role:
  - Admin / RH → "Grupo Lever"
  - Sócio → primeira empresa onde tem `socio_company_memberships`. Se só tem uma, é a única opção (trigger disabled).
  - Líder / Liderado → empresa do `org_unit` primário do usuário. Sem opção de trocar (trigger disabled).
- **D-11:** Default resolvido server-side via RPC (`resolve_default_scope(uid)`) ou no boot do `ScopeProvider` antes do primeiro render — não pisca placeholder.

### Claude's Discretion (areas where the planner decides — backed by THIS research)

- **Backfill: identidade das 7 empresas internas + memberships de sócio** — researched below (see § Backfill Strategy). Recommendation: idempotent SQL seed inside Migration C, using existing `companies.name` lookup; sócio memberships are blank in Phase 1 (RH UI in `/empresas` already exists per memory `project_rh_permissions.md` — RH can fill in via current CRUD; we only add the relation table + a small "vinculações de sócio" panel on Empresa drawer).
- **Estado inicial de `org_units`** — recommended default: auto-criar uma raiz por empresa no backfill (Migration C step 4), nome = company.name. RH renomeia/expande depois via UI added in this phase (ORG-08).
- **`unit_kind` enum** — free-form `text` (NULL allowed) with frontend `<datalist>` suggesting `'departamento' | 'time' | 'squad' | 'célula'`. Don't lock the enum — empresas externas têm nomenclaturas heterogêneas.
- **Migração `teams` → `org_units`** — Read-compat: deixar `teams` intacto durante Phase 1; backfill cria 1 org_unit raiz por empresa + 1 org_unit nível 1 para cada `team` (mantém membros via `team_members` mirror para `org_unit_members`). Phase 4 (Migration G) faz o `DROP TABLE teams` após zero leitores.
- **CASL UI hiding policy** — esconder por default; desabilitar com tooltip apenas em ações onde o usuário "quase pode fazer" (ex: editar candidato fora do escopo dele). Phase 1 implementa o `defineAbility` para os 5 roles + `<Can>` em 4 superfícies pontuais (header trigger, criar empresa, criar org_unit, ver folha) — uso amplo é Phase 2-3.
- **Quality gates rollout** — ESLint regra como `error` desde o primeiro PR de Phase 1 (CI falha) — refactor faz sentido com o guard ativo, não como TODO. Allowlist explícita dos 16 arquivos legados que chamam `supabase.from()` fora de `hooks/`, com TODO marcado para Phase 2-3 cleanup.
- **Componentes monolíticos** — Phase 1 toca pouco esses componentes (Header.tsx, Layout.tsx, App.tsx). Quebra real fica para Phase 2-3. Apenas o `App.tsx` (316 linhas) recebe extração mínima dos providers (`QueryProvider`, `ScopeProvider`, `AuthProvider` em `app/providers/`).

**Mini-decisões do seletor (planner decide via convenção):**
- Cross-tab sync — `BroadcastChannel('leverup:scope')` com fallback `storage` event. SHIP NA PRIMEIRA ITERAÇÃO (research mostra que é trivial com Zustand 5.x persist, e RH frequentemente abre múltiplas abas).
- Prefetch on-hover — DEFER para Phase 4 (não bloqueante).
- Ordering padrão dos itens — empresas e grupos alfabéticos; "Grupo Lever" sempre no topo da seção GRUPOS (anchor visível).
- Comportamento ao trocar de escopo numa rota profunda (`/vagas/abc?scope=company:X` → trocar para `?scope=company:Y`) — manter rota; se a entity não pertence ao novo escopo, o componente já renderiza vazio via RLS + a toast de "Sem permissão" do `formatSupabaseError`. Não custom-redirect.
- Keyboard shortcut — `Cmd+K` já cobre via CmdKPalette; adicionar `g s` (Linear convention) é opportunistic, não-bloqueante.

### Deferred Ideas (OUT OF SCOPE)

- Onboarding via WhatsApp (AUTH-01/02/03 — Phase 3)
- Banco de Talentos LGPD (TAL-* — Phase 2)
- Bug do kanban + drawer (RS-* — Phase 2)
- Migration G (contract — drop helpers antigos `allowed_companies`, drop `teams`, NOT NULL constraints) — Phase 4 após 1+ semana de estabilidade
- Performance hooks reescritos com `useScopedQuery` (Phase 3 faz a migração mecânica; Phase 1 entrega o chokepoint)
- Sentry com `beforeSend` PII scrubbing — Phase 4 (QUAL-06). Phase 1 entrega apenas o `logger.ts` wrapper com `if (DEV)` (AUTH-04, AUTH-05).
</user_constraints>

<phase_requirements>
## Phase Requirements (36 REQ-IDs)

| ID | Description | Research Support |
|----|-------------|------------------|
| **TEN-01** | Empresa entidade única (`companies`) — sem flag interna/externa | Codebase already has `companies` table (migration `20251009193314`); no flag `is_internal` exists. NO-OP for schema; TEN-01 is a documentation/contract requirement. § Migration A confirms. |
| **TEN-02** | Flags `performance_enabled` e `rs_enabled` em `companies` (default `false`) | § Migration A — `ALTER TABLE companies ADD COLUMN`. Default `false` per CONTEXT.md vs roadmap (note: ROADMAP says default both `false`; current 7 internal companies need `performance_enabled = true` + `rs_enabled = true` set explicitly in backfill). |
| **TEN-03** | Tabela `company_groups` (id, nome, slug). `companies.group_id` opcional | § Migration A — full schema in code excerpt. |
| **TEN-04** | Instância "Grupo Lever" (slug `grupo-lever`) com 7 empresas internas | § Backfill Strategy — idempotent SQL seed in Migration C. |
| **TEN-05** | Seletor global no header lista empresas + grupos disponíveis ao usuário | § ScopeProvider + § Component Inventory. UI-SPEC.md is the visual contract. |
| **TEN-06** | Selecionar empresa filtra TODO o app — sem flash | § useScopedQuery (chokepoint pattern + queryKey prefix). § P4 mitigation. |
| **TEN-07** | Selecionar grupo filtra pelas empresas-membro do grupo (união) | § Scope type + § visible_companies semantics. |
| **TEN-08** | Última seleção persiste entre sessões (Zustand persist) | § ScopeProvider — Zustand 5.0.12 persist middleware with `name: 'leverup:scope'`. |
| **TEN-09** | Escopo na URL (`?scope=company:UUID` / `?scope=group:UUID`) | § ScopeProvider — `react-router-dom` v6 `useSearchParams`. |
| **TEN-10** | Mudar escopo invalida queryKeys via partial-key match | § TanStack Query Partial-Key Invalidation — verified pattern from official docs (94-99% improvement evidence on RLS, separate confirmation on `exact: false` default). |
| **RBAC-01** | 5 roles fixos: admin, rh, socio, lider, liderado | Codebase enum `app_role` has `socio, lider, rh, colaborador` + `admin` added later. § RBAC Migration — must add `liderado` (rename `colaborador` OR keep both as synonyms). **Decision needed by planner:** see Open Questions Q1. |
| **RBAC-02** | Admin tem acesso total (todas empresas, todos grupos, configuração) | § visible_companies — admin path returns `array_agg(id) FROM companies`. |
| **RBAC-03** | RH acesso operacional total (todas empresas/grupos), sem config de plataforma | § is_people_manager already covers admin+rh+socio for ops; admin-only for "platform config" tasks (DDL via UI, etc.) is enforced via CASL `<Can I="manage" a="Platform">`. |
| **RBAC-04** | Sócio tem N:N com empresas via `socio_company_memberships` | § Migration C. |
| **RBAC-05** | Líder vê dentro dos org_units que lidera (recursivamente) | § visible_org_units + org_unit_descendants. |
| **RBAC-06** | Liderado vê apenas próprio histórico | § CASL ability + RLS `org_unit_members.user_id = auth.uid()`. |
| **RBAC-07** | Badge "Você está vendo: Empresa X / Grupo Lever" | § UI-SPEC.md D-03 — trigger ESPELHA o badge (single visual element). |
| **RBAC-08** | CASL define abilities no client; UI esconde botões | § CASL Ability Definition (5 roles, conditions). § Don't Hand-Roll. |
| **RBAC-09** | RLS é a fronteira; políticas usam helpers SECURITY DEFINER | § Migration B/C — three helpers. |
| **RBAC-10** | Padrão `(SELECT auth.uid())` obrigatório; auditoria existente é migrada | § initPlan Caching Pattern + § Audit Plan for Existing Policies. |
| **ORG-01** | Tabela `org_units` (id, company_id, parent_id, name, kind) — adjacency list | § Migration B. |
| **ORG-02** | `parent_id` self-reference; raiz tem `parent_id = NULL` | § Migration B (CHECK constraint + same_company_as_parent). |
| **ORG-03** | Trigger anti-ciclo: BEFORE INSERT/UPDATE bloqueia ciclo | § Migration B (`tg_prevent_org_unit_cycle`). |
| **ORG-04** | Tabela `org_unit_members` (user_id, org_unit_id) | § Migration B. |
| **ORG-05** | Tabela `unit_leaders` (user_id, org_unit_id) | § Migration B. |
| **ORG-06** | Função `org_unit_descendants(uuid) RETURNS uuid[]` | § Migration B (recursive CTE). |
| **ORG-07** | Líder de unit pai vê descendentes (transitivo) | § visible_org_units + org_unit_descendants — covered by recursive query. |
| **ORG-08** | UI de gestão: criar/renomear/mover/excluir org_units + atribuir líderes/membros | § Component Inventory — new page `/empresas/:id/estrutura` (extends existing `CompanyDrawer`). |
| **ORG-09** | `teams` legacy permanece read-only durante migração; descontinua na Phase 4 | § Backfill Strategy — `teams_to_org_units_mirror()` function called by Migration C; future-Phase-4 dropa. |
| **AUTH-04** | Logs (server e client) sem PII; Sentry beforeSend scrubba PII | Phase 1 ships `logger.ts` wrapper (Sentry beforeSend é Phase 4 per ROADMAP). § Quality Gates → PII Scrubbing. |
| **AUTH-05** | Console limpo de PII em produção | § Quality Gates → PII Scrubbing. |
| **QUAL-05** | Lockfile único (`package-lock.json`); `bun.lockb` removido; CI usa `npm ci` | § Quality Gates → Lockfile. |
| **QUAL-07** | ESLint regra customizada bloqueia `supabase.from()` fora de `hooks/` e `integrations/` | § ESLint Custom Rule (full implementation provided). |
| **QUAL-08** | `@tanstack/eslint-plugin-query` ativo; queryKey audit | § @tanstack/eslint-plugin-query Setup. |
| **QUAL-10** | `date-fns-tz` formata todo `timestamptz` em `America/Sao_Paulo` na UI | § date-fns-tz Setup. |
</phase_requirements>

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Tenant scoping enforcement | Database (RLS) | API (RPC `resolve_default_scope`) | Security boundary MUST be DB. Frontend filtering = UX/perf only. |
| Org tree traversal | Database (recursive CTE in SECURITY DEFINER fn) | — | Adjacency list with `(company_id, parent_id)` index; one DB call returns descendant array, no client-side recursion. |
| Permission UI gating | Browser/Client (CASL) | Database (RLS as backstop) | Defense-in-depth: hide buttons users can't use; RLS rejects forged requests. |
| Scope state | Browser/Client (Zustand persist + URL) | — | Selected scope is purely client UX state. Server doesn't know "which scope is active" — it knows "which scopes are visible to user". |
| Dirty-form detection | Browser/Client (react-hook-form `formState.isDirty`) | — | Forms are React state; no server involvement. |
| First-render default scope | API (RPC `resolve_default_scope(uid)`) | Browser/Client (cached after first call) | Prevents placeholder flash (D-11). Server has cheapest access to user's role + memberships + primary org_unit. |
| URL parsing / persistence | Browser/Client (react-router v6 `useSearchParams`) | — | Pure client routing. |
| ESLint enforcement | Build/CI (eslint flat config + custom rule) | — | Compile-time guard, not runtime. |
| pgTAP cross-tenant tests | CI (Postgres test instance) | — | Runs in transaction inside Supabase Postgres; auto-rollback. |
| PII scrubbing | Browser/Client (logger.ts wrapper) | API (Sentry beforeSend in Phase 4) | Phase 1 client-side wrapper enough for `console.*`. Phase 4 adds Sentry sink. |
| date-fns-tz formatting | Browser/Client (UI util) | — | All `timestamptz` arrives as UTC; rendering uses `formatInTimeZone(date, 'America/Sao_Paulo', ...)`. |

---

## Standard Stack

### Versions verified against npm registry on 2026-04-27

| Library | Version | Purpose | Source |
|---------|---------|---------|--------|
| `@casl/ability` | 6.8.1 | RBAC client-side | npm view @casl/ability version → 6.8.1 [VERIFIED: npm registry] |
| `@casl/react` | 6.0.0 | React bindings (`<Can>`, `useAbility`) | npm view @casl/react version → 6.0.0 [VERIFIED: npm registry] |
| `zustand` | 5.0.12 | Persisted scope store | npm view zustand version → 5.0.12 [VERIFIED: npm registry] |
| `@tanstack/eslint-plugin-query` | 5.100.5 | queryKey audit | npm view @tanstack/eslint-plugin-query → 5.100.5 [VERIFIED: npm registry] |
| `vitest` | 3.2.0 | Test runner | npm view vitest version → 3.2.0 [VERIFIED: npm registry] |
| `msw` | 2.13.6 | API mocking | npm view msw version → 2.13.6 [VERIFIED: npm registry] |
| `@sentry/react` | 10.50.0 | Observability (Phase 4 — install only in Phase 1, no `Sentry.init()` yet) | npm view @sentry/react version → 10.50.0 [VERIFIED: npm registry] |
| `date-fns-tz` | 3.2.0 | Timezone-aware formatting | npm view date-fns-tz version → 3.2.0 [VERIFIED: npm registry] |
| `pgTAP` | 1.3.x | RLS testing inside Postgres | Supabase docs [CITED: supabase.com/docs/guides/local-development/testing/pgtap-extended] |
| `basejump-supabase_test_helpers` | 0.0.6 | RLS test helpers (authenticate_as, create_supabase_user) | [CITED: github.com/usebasejump/supabase-test-helpers] |
| `@hookform/resolvers` | 5.2.2 | Upgrade from 3.10.0 (breaking but needed) | research/STACK.md [CITED] |
| `react-hook-form` | 7.73.x | Upgrade from 7.61.1 (minor) | research/STACK.md [CITED] |

### Already in stack (no change)

| Library | Version | Purpose |
|---------|---------|---------|
| `@supabase/supabase-js` | 2.75.0 | DB client |
| `@tanstack/react-query` | 5.83.0 → 5.99.x patch upgrade | Server state |
| `zod` | 3.25.76 | **DO NOT upgrade to 4.x** [CITED: GH issues #813, #842 — research/STACK.md] |
| `react-router-dom` | 6.30.1 | Routing |
| `cmdk` | 1.1.1 | Search dropdown engine for scope selector |
| `sonner` | 1.7.4 | Toast notifications |

### Installation (single npm install)

```bash
npm install @casl/ability@^6.8.1 @casl/react@^6 zustand@^5.0.12 date-fns-tz@^3
npm install -D @tanstack/eslint-plugin-query@^5.100 vitest@^3.2 msw@^2.13 \
  @testing-library/react@^16 @testing-library/dom@^10 \
  @testing-library/jest-dom@^6.9 @testing-library/user-event@^14 jsdom@^25
npm install @sentry/react@^10.50  # Install only — Sentry.init() in Phase 4
npm install react-hook-form@^7.73 @hookform/resolvers@^5.2.2
# Lockfile cleanup (separate step)
rm bun.lockb
```

---

## Architecture Patterns

### System Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────┐
│                        User clicks scope selector                   │
└────────────────────────────────┬───────────────────────────────────┘
                                 ▼
┌────────────────────────────────────────────────────────────────────┐
│  PRESENTATION LAYER (Header.tsx → ScopeSwitch in upper-right)      │
│  Trigger (Btn ghost) ──▶ Popover + cmdk Command + groups           │
│  Empty state (sócio sem empresa) ──▶ EmptyState primitive          │
│  Toast "sem acesso" (D-08) ──▶ sonner                               │
│  Confirmation (dirty form) ──▶ shadcn Dialog (D-05)                 │
└────────────────────────────────┬───────────────────────────────────┘
                                 │
                                 ▼ setScope({type, id})
┌────────────────────────────────────────────────────────────────────┐
│  STATE LAYER (app/providers/ScopeProvider.tsx)                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ ScopeContext { scope, setScope, isFixed, expandedCompanyIds}│   │
│  │  └─ reads URL via useSearchParams()                          │   │
│  │  └─ reads Zustand store useScopeStore (persist 'leverup:scope')│ │
│  │  └─ on first render: calls RPC resolve_default_scope(uid)    │   │
│  │  └─ on scope change: writes URL + Zustand + BroadcastChannel │   │
│  │  └─ on URL parse fail: silent fallback + toast (D-08)        │   │
│  └─────────────────────────────────────────────────────────────┘   │
└────────────────────────────────┬───────────────────────────────────┘
                                 │
                                 ▼ scope.id changes
┌────────────────────────────────────────────────────────────────────┐
│  DATA LAYER (shared/data/useScopedQuery.ts — chokepoint)            │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ useScopedQuery(key, fn, opts)                                │   │
│  │   queryKey: ['scope', scope.id, scope.kind, ...key]          │   │
│  │   queryFn: (companyIds) => fn(companyIds)                    │   │
│  │ TanStack Query default 'exact: false' invalidation matches   │   │
│  │ partial prefix → switching scope makes new keys; old cache   │   │
│  │ STAYS (gcTime default 5min, going back is instant — D-04).   │   │
│  └─────────────────────────────────────────────────────────────┘   │
└────────────────────────────────┬───────────────────────────────────┘
                                 │
                                 ▼ supabase.from(...).in('company_id', companyIds)
┌────────────────────────────────────────────────────────────────────┐
│  INTEGRATION LAYER (integrations/supabase/client.ts)                │
│  Singleton Supabase client (no change in Phase 1)                   │
└────────────────────────────────┬───────────────────────────────────┘
                                 │
                                 ▼ HTTP REST + JWT
┌────────────────────────────────────────────────────────────────────┐
│  POSTGRES + RLS (Migrations A, B, C)                                │
│  ┌────────────────────────────────────────────────────────────────┐│
│  │ Tables: companies, company_groups, org_units,                  ││
│  │         org_unit_members, unit_leaders,                        ││
│  │         socio_company_memberships                              ││
│  │ Helpers (STABLE SECURITY DEFINER, SET search_path = public):   ││
│  │   visible_companies(uid)      → uuid[] of companies            ││
│  │   visible_org_units(uid)      → uuid[] of org_units            ││
│  │   org_unit_descendants(uid)   → uuid[] of descendant ids       ││
│  │   resolve_default_scope(uid)  → text "company:UUID"            ││
│  │ Pattern: USING (company_id = ANY(visible_companies(           ││
│  │           (SELECT auth.uid())))) — initPlan caches result.     ││
│  └────────────────────────────────────────────────────────────────┘│
└────────────────────────────────┬───────────────────────────────────┘
                                 │
                                 ▼ rows authorized by RLS
                            return to client
```

**How to read this:** Top-down for scope changes (user → context → query). Every arrow from `useScopedQuery` to the DB carries `scope.id` in the queryKey AND `companyIds` in the SQL `.in('company_id', ...)`. Both layers must agree; if they disagree, RLS wins and the user sees an empty result rather than wrong data — no leakage.

### Component Responsibilities

| Component | Owns | File path | Phase 1 status |
|-----------|------|-----------|----------------|
| `ScopeProvider` | Selected scope (company/group), URL sync, Zustand persist, BroadcastChannel, RPC default | `src/app/providers/ScopeProvider.tsx` | NEW |
| `useScope` (hook) | Reads scope context | `src/app/providers/ScopeProvider.tsx` (export) | NEW |
| `useScopedQuery` (hook) | Wraps `useQuery` with scope key prefix | `src/shared/data/useScopedQuery.ts` | NEW |
| `useScopedRealtime` (hook) | Wraps Supabase channel with scope filter | `src/shared/data/useScopedRealtime.ts` | NEW (foundation; consumers come in Phase 2-3) |
| `ScopeSwitch` (component) | Header trigger UI | `src/features/tenancy/components/ScopeSwitch.tsx` | NEW (per UI-SPEC.md) |
| `ScopeSwitchTrigger` (sub-comp) | Btn that opens dropdown | inline in `ScopeSwitch.tsx` | NEW |
| `ScopeSwitchPanel` (sub-comp) | Popover content with Command list | inline in `ScopeSwitch.tsx` | NEW |
| `DirtyFormConfirmDialog` | Confirmation when forms have `isDirty` | `src/features/tenancy/components/DirtyFormConfirmDialog.tsx` | NEW |
| `useDirtyForms` (hook) | Registry of `react-hook-form` instances with `formState.isDirty=true` | `src/features/tenancy/hooks/useDirtyForms.ts` | NEW |
| `OrgUnitTree` (component) | Render adjacency tree | `src/features/org-structure/components/OrgUnitTree.tsx` | NEW (ORG-08) |
| `defineAbilities()` | CASL ability builder for 5 roles | `src/features/tenancy/lib/abilities.ts` | NEW (RBAC-08) |
| `<Can>` provider + hook | CASL React bindings | `src/features/tenancy/lib/abilityContext.ts` | NEW |
| `logger.ts` | PII-stripping `console.*` wrapper | `src/lib/logger.ts` | NEW (AUTH-04, AUTH-05) |
| `formatBR` (util) | `formatInTimeZone(d, 'America/Sao_Paulo', ...)` wrapper | `src/lib/formatBR.ts` | NEW (QUAL-10) |
| `no-supabase-from-outside-hooks` (eslint rule) | Block direct supabase.from outside allowed paths | `eslint-rules/no-supabase-from-outside-hooks.js` (or inline in `eslint.config.js`) | NEW (QUAL-07) |
| `Header.tsx` | Mount `ScopeSwitch` between Crumbs and PendingTasksDropdown | `src/components/Header.tsx` | EDIT (one-liner mount) |
| `App.tsx` | Wrap routes with `ScopeProvider` after `useAuth` resolves | `src/App.tsx` | EDIT (insert provider) |
| `Layout.tsx` | No change — `ScopeProvider` mounts higher | `src/components/Layout.tsx` | NO CHANGE |

### Recommended Project Structure

```
src/
├── app/
│   └── providers/                                    # NEW
│       ├── ScopeProvider.tsx                         # NEW
│       ├── AbilityProvider.tsx                       # NEW (CASL)
│       └── index.tsx                                 # NEW (composes providers)
├── features/
│   ├── tenancy/                                      # NEW top-level module
│   │   ├── components/
│   │   │   ├── ScopeSwitch.tsx                       # NEW
│   │   │   └── DirtyFormConfirmDialog.tsx            # NEW
│   │   ├── hooks/
│   │   │   ├── useCompanyGroups.ts                   # NEW
│   │   │   ├── useVisibleScopes.ts                   # NEW (companies + groups)
│   │   │   ├── useDirtyForms.ts                      # NEW
│   │   │   └── useScopeBroadcast.ts                  # NEW (cross-tab sync)
│   │   ├── lib/
│   │   │   ├── abilities.ts                          # NEW (CASL defineAbility)
│   │   │   ├── abilityContext.ts                     # NEW (Can + useAbility)
│   │   │   ├── scopeKey.ts                           # NEW (parse/serialize 'company:UUID')
│   │   │   └── resolveDefaultScope.ts                # NEW (RPC client)
│   │   └── types.ts                                  # NEW (Scope, ScopeKind)
│   └── org-structure/                                # NEW
│       ├── components/
│       │   ├── OrgUnitTree.tsx                       # NEW (ORG-08)
│       │   └── OrgUnitForm.tsx                       # NEW
│       ├── hooks/
│       │   ├── useOrgUnits.ts                        # NEW
│       │   └── useOrgUnitMutations.ts                # NEW
│       └── lib/
│           └── treeOps.ts                            # NEW (client-side flatten/lift)
├── shared/
│   └── data/
│       ├── useScopedQuery.ts                         # NEW (the chokepoint)
│       └── useScopedRealtime.ts                      # NEW (channel filter)
├── lib/
│   ├── logger.ts                                     # NEW (AUTH-04, AUTH-05)
│   └── formatBR.ts                                   # NEW (QUAL-10)
└── ... existing structure unchanged in Phase 1
```

**Migration discipline:** This phase ADDS the structure; existing folders stay flat. Phase 2 (R&S) will move `src/hooks/hiring/` to `src/features/hiring/hooks/`, but that's not in scope here.

### Pattern 1: RLS Helper Functions (initPlan caching)

**What:** Three `STABLE SECURITY DEFINER SET search_path = public` functions returning `uuid[]`. Policies wrap them in `(SELECT helper(...))` for initPlan caching.

**When to use:** Every table with `company_id` and/or `org_unit_id`. Codebase already has `is_people_manager()` and `allowed_companies()` — generalize the same shape.

**Why:**
- Functions get an `initPlan` (executed once per query, not per row) — Supabase docs report 94.97% improvement (179ms → 9ms) on simple `auth.uid() = user_id`, and 99.991% (173s → 16ms) on `team_id = ANY(array(select user_teams()))` [VERIFIED: supabase.com/docs/guides/database/postgres/row-level-security].
- `SECURITY DEFINER` bypasses RLS on `user_roles`/`org_unit_members` lookup tables — eliminates recursive policy evaluation (P3).
- Single point of change: rule edits don't fan out across 40+ policies.
- Existing precedent in codebase (`is_people_manager`, `allowed_companies`).

**Code (Migration B + C):**

```sql
-- ============================================================================
-- HELPER 1: visible_companies(uid) → uuid[]
-- Companies the caller can see (admin/rh/socio = all; sócio = membership;
-- líder/liderado = via org_units).
-- ============================================================================
CREATE OR REPLACE FUNCTION public.visible_companies(_uid uuid)
RETURNS uuid[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    -- admin OR rh: all companies
    WHEN public.has_role(_uid, 'admin'::public.app_role)
      OR public.has_role(_uid, 'rh'::public.app_role)
    THEN
      (SELECT COALESCE(array_agg(id), '{}'::uuid[]) FROM public.companies)

    -- sócio: companies where they have a membership
    WHEN public.has_role(_uid, 'socio'::public.app_role)
    THEN
      (SELECT COALESCE(array_agg(company_id), '{}'::uuid[])
       FROM public.socio_company_memberships
       WHERE user_id = _uid)

    -- líder: companies where they lead at least one org_unit
    WHEN public.has_role(_uid, 'lider'::public.app_role)
    THEN
      (SELECT COALESCE(array_agg(DISTINCT ou.company_id), '{}'::uuid[])
       FROM public.unit_leaders ul
       JOIN public.org_units ou ON ou.id = ul.org_unit_id
       WHERE ul.user_id = _uid)

    -- liderado / colaborador: companies where they're an org_unit member
    WHEN public.has_role(_uid, 'liderado'::public.app_role)
      OR public.has_role(_uid, 'colaborador'::public.app_role)
    THEN
      (SELECT COALESCE(array_agg(DISTINCT ou.company_id), '{}'::uuid[])
       FROM public.org_unit_members oum
       JOIN public.org_units ou ON ou.id = oum.org_unit_id
       WHERE oum.user_id = _uid)

    ELSE '{}'::uuid[]
  END;
$$;

COMMENT ON FUNCTION public.visible_companies(uuid) IS
  'Returns companies the user can see based on role + memberships. Use in RLS as: company_id = ANY(public.visible_companies((SELECT auth.uid())))';

-- ============================================================================
-- HELPER 2: org_unit_descendants(unit_id) → uuid[]
-- All descendants of a given unit (inclusive of self), via recursive CTE.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.org_unit_descendants(_unit_id uuid)
RETURNS uuid[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH RECURSIVE tree AS (
    SELECT id, 0 AS depth FROM public.org_units WHERE id = _unit_id
    UNION ALL
    SELECT ou.id, t.depth + 1
    FROM public.org_units ou
    JOIN tree t ON ou.parent_id = t.id
    WHERE t.depth < 20  -- termination guard (org charts rarely > 8 levels)
  )
  SELECT COALESCE(array_agg(id), '{}'::uuid[]) FROM tree;
$$;

COMMENT ON FUNCTION public.org_unit_descendants(uuid) IS
  'Recursive descendants of org_unit, depth-limited at 20. Used by visible_org_units and policies for "leader sees subtree".';

-- ============================================================================
-- HELPER 3: visible_org_units(uid) → uuid[]
-- Org_units the caller can see (admin/rh/socio = all; líder = descendants of
-- units they lead; liderado = own units only).
-- ============================================================================
CREATE OR REPLACE FUNCTION public.visible_org_units(_uid uuid)
RETURNS uuid[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN public.has_role(_uid, 'admin'::public.app_role)
      OR public.has_role(_uid, 'rh'::public.app_role)
    THEN
      (SELECT COALESCE(array_agg(id), '{}'::uuid[]) FROM public.org_units)

    -- sócio: org_units inside companies they're members of
    WHEN public.has_role(_uid, 'socio'::public.app_role)
    THEN
      (SELECT COALESCE(array_agg(ou.id), '{}'::uuid[])
       FROM public.org_units ou
       WHERE ou.company_id IN (
         SELECT company_id FROM public.socio_company_memberships WHERE user_id = _uid
       ))

    -- líder: descendants of every unit they lead
    WHEN public.has_role(_uid, 'lider'::public.app_role)
    THEN
      (SELECT COALESCE(array_agg(DISTINCT d), '{}'::uuid[])
       FROM public.unit_leaders ul,
            LATERAL unnest(public.org_unit_descendants(ul.org_unit_id)) AS d
       WHERE ul.user_id = _uid)

    -- liderado: only the units they belong to
    WHEN public.has_role(_uid, 'liderado'::public.app_role)
      OR public.has_role(_uid, 'colaborador'::public.app_role)
    THEN
      (SELECT COALESCE(array_agg(org_unit_id), '{}'::uuid[])
       FROM public.org_unit_members WHERE user_id = _uid)

    ELSE '{}'::uuid[]
  END;
$$;

-- ============================================================================
-- USAGE: policies become trivial.
-- ============================================================================
-- EXAMPLE: rewrite hiring:job_openings:select to use new helper:
DROP POLICY IF EXISTS "hiring:job_openings:select" ON public.job_openings;

CREATE POLICY "hiring:job_openings:select"
  ON public.job_openings FOR SELECT TO authenticated
  USING (
    company_id = ANY(public.visible_companies((SELECT auth.uid())))
    AND (NOT confidential
         OR (SELECT auth.uid()) = ANY(confidential_participant_ids)
         OR (SELECT auth.uid()) = requested_by)
  );
```

**Trade-offs:**
- **+** Fast (initPlan caches), readable, DRY across tables.
- **+** Coexists with existing `is_people_manager`, `allowed_companies` until Migration G in Phase 4 drops them. Phase 1 keeps both.
- **−** `SECURITY DEFINER` is dangerous if user-controlled input is queried — always parameterize, always `SET search_path = public`. (P-AP7 in research.)
- **−** Bug in helper = global escalation. Tests via pgTAP MUST cover (a) admin sees all, (b) sócio sees only memberships, (c) sócio of company A returns empty when querying company B's data.

[VERIFIED: codebase grep — `is_people_manager` and `allowed_companies` already follow this exact shape. PITFALLS.md P3 confirms infinite recursion is the failure mode without SECURITY DEFINER.]

### Pattern 2: Adjacency-list `org_units` + Anti-cycle Trigger

**Schema (Migration B):**

```sql
CREATE TABLE public.org_units (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  parent_id   uuid REFERENCES public.org_units(id) ON DELETE RESTRICT,
  name        text NOT NULL,
  kind        text,  -- free-form: 'departamento', 'time', 'squad', etc.
  position    int NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT NOW(),
  updated_at  timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT no_self_parent CHECK (id <> parent_id)
);

-- Critical indexes for recursive CTE perf (P6 prevention)
CREATE INDEX idx_org_units_company_parent ON public.org_units(company_id, parent_id);
CREATE INDEX idx_org_units_parent ON public.org_units(parent_id) WHERE parent_id IS NOT NULL;

-- Same-company-as-parent invariant (CHECK can't see other rows; trigger enforces)
CREATE OR REPLACE FUNCTION public.tg_org_units_same_company_as_parent()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  parent_company_id uuid;
BEGIN
  IF NEW.parent_id IS NOT NULL THEN
    SELECT company_id INTO parent_company_id FROM public.org_units WHERE id = NEW.parent_id;
    IF parent_company_id IS DISTINCT FROM NEW.company_id THEN
      RAISE EXCEPTION 'org_unit cannot have a parent in a different company (parent.company_id=%, NEW.company_id=%)',
        parent_company_id, NEW.company_id;
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER tg_org_units_same_company
  BEFORE INSERT OR UPDATE OF parent_id, company_id ON public.org_units
  FOR EACH ROW EXECUTE FUNCTION public.tg_org_units_same_company_as_parent();

-- Anti-cycle trigger (ORG-03)
CREATE OR REPLACE FUNCTION public.tg_org_units_no_cycle()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  cur_id uuid := NEW.parent_id;
  steps  int  := 0;
BEGIN
  -- Walk parent chain; abort if we encounter NEW.id (cycle) or hit step limit
  WHILE cur_id IS NOT NULL AND steps < 50 LOOP
    IF cur_id = NEW.id THEN
      RAISE EXCEPTION 'cycle detected in org_units (id=%, parent_id=%)', NEW.id, NEW.parent_id;
    END IF;
    SELECT parent_id INTO cur_id FROM public.org_units WHERE id = cur_id;
    steps := steps + 1;
  END LOOP;
  RETURN NEW;
END $$;

CREATE TRIGGER tg_org_units_anti_cycle
  BEFORE INSERT OR UPDATE OF parent_id ON public.org_units
  FOR EACH ROW EXECUTE FUNCTION public.tg_org_units_no_cycle();

-- updated_at maintenance
CREATE TRIGGER tg_org_units_updated_at
  BEFORE UPDATE ON public.org_units
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Memberships
CREATE TABLE public.org_unit_members (
  org_unit_id uuid NOT NULL REFERENCES public.org_units(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_primary  boolean NOT NULL DEFAULT false,  -- "primary" unit for default scope (D-10)
  created_at  timestamptz NOT NULL DEFAULT NOW(),
  PRIMARY KEY (org_unit_id, user_id)
);
CREATE INDEX idx_org_unit_members_user ON public.org_unit_members(user_id);

-- Leaders
CREATE TABLE public.unit_leaders (
  org_unit_id uuid NOT NULL REFERENCES public.org_units(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT NOW(),
  PRIMARY KEY (org_unit_id, user_id)
);
CREATE INDEX idx_unit_leaders_user ON public.unit_leaders(user_id);

-- RLS for the three new tables (default-deny then helper-driven)
ALTER TABLE public.org_units        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_unit_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unit_leaders     ENABLE ROW LEVEL SECURITY;

-- (policies reference visible_org_units which depends on these tables existing — ok at create time, helpers added in same migration after tables)
```

**Trade-offs:**
- **+** Move = update one row. Re-org happens; ltree would update every descendant.
- **+** Recursive CTE with index on `parent_id` is fast (sub-ms for <500 nodes).
- **+** Anti-cycle is a guard at write time, not read time — readers don't pay.
- **−** "Get all ancestors" requires recursion (rare; not in Phase 1 use cases).
- **−** Recursive CTE has O(depth) cost; depth limit `< 20` is a hard cap.

[CITED: research/ARCHITECTURE.md Pattern 2 + Cybertec benchmark; PITFALLS.md P6.]

### Pattern 3: Scope-as-Query-Key + Partial Invalidation

**The chokepoint:**

```typescript
// src/features/tenancy/types.ts
export type Scope =
  | { kind: 'company'; id: string; companyIds: [string]; name: string }
  | { kind: 'group';   id: string; companyIds: string[];  name: string };

// src/features/tenancy/lib/scopeKey.ts
export function parseScopeToken(token: string | null): { kind: 'company' | 'group'; id: string } | null {
  if (!token) return null;
  const [kind, id] = token.split(':');
  if ((kind !== 'company' && kind !== 'group') || !id) return null;
  return { kind: kind as 'company' | 'group', id };
}

export function serializeScope(scope: Pick<Scope, 'kind' | 'id'>): string {
  return `${scope.kind}:${scope.id}`;
}

// src/app/providers/ScopeProvider.tsx
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { parseScopeToken, serializeScope } from '@/features/tenancy/lib/scopeKey';
import type { Scope } from '@/features/tenancy/types';

interface ScopeStore {
  scopeToken: string | null;
  setScopeToken: (t: string | null) => void;
}

export const useScopeStore = create<ScopeStore>()(
  persist(
    (set) => ({
      scopeToken: null,
      setScopeToken: (scopeToken) => set({ scopeToken }),
    }),
    {
      name: 'leverup:scope',  // localStorage key — distinct from Supabase auth keys
      storage: createJSONStorage(() => localStorage),
      version: 1,
      partialize: (state) => ({ scopeToken: state.scopeToken }),
    },
  ),
);

interface ScopeContextValue {
  scope: Scope | null;
  setScope: (next: Pick<Scope, 'kind' | 'id'>, opts?: { skipDirtyCheck?: boolean }) => void;
  isFixed: boolean;
  visibleCompanies: Array<{ id: string; name: string }>;
  visibleGroups: Array<{ id: string; name: string; companyIds: string[] }>;
  isResolving: boolean;
}

const ScopeContext = createContext<ScopeContextValue | null>(null);

export function ScopeProvider({ children }: { children: ReactNode }) {
  const { user, userRole, loading: authLoading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const { scopeToken: persistedToken, setScopeToken: setPersistedToken } = useScopeStore();
  const [scope, setScopeState] = useState<Scope | null>(null);
  const [visibleCompanies, setVisibleCompanies] = useState<Array<{ id: string; name: string }>>([]);
  const [visibleGroups, setVisibleGroups] = useState<Array<{ id: string; name: string; companyIds: string[] }>>([]);
  const [isResolving, setIsResolving] = useState(true);

  // Resolve scope on first render. Order: URL > Zustand persist > server RPC default.
  useEffect(() => {
    if (authLoading || !user?.id) return;
    let aborted = false;

    (async () => {
      setIsResolving(true);
      try {
        // 1. Fetch user's visible companies + groups in parallel
        const [companiesRes, groupsRes] = await Promise.all([
          supabase.from('companies').select('id, name').order('name'),
          supabase.from('company_groups').select('id, name, slug, companies:companies(id)').order('name'),
        ]);
        if (companiesRes.error || groupsRes.error) throw companiesRes.error ?? groupsRes.error;
        if (aborted) return;

        const companies = companiesRes.data ?? [];
        const groups = (groupsRes.data ?? []).map((g) => ({
          id: g.id,
          name: g.name,
          companyIds: (g.companies ?? []).map((c: { id: string }) => c.id),
        }));
        setVisibleCompanies(companies);
        setVisibleGroups(groups);

        // 2. Determine initial scope token (URL > Zustand > RPC default)
        const urlToken = searchParams.get('scope');
        const fromUrl = parseScopeToken(urlToken);
        const fromPersist = parseScopeToken(persistedToken);

        let resolved: Scope | null = null;

        if (fromUrl) {
          resolved = resolveScope(fromUrl, companies, groups);
          if (!resolved) {
            // D-08: silent fallback + toast
            const fallback = parseScopeToken(persistedToken)
              ?? (await fetchDefaultScope(user.id));
            resolved = fallback ? resolveScope(fallback, companies, groups) : null;
            if (resolved) {
              const { toast } = await import('sonner');
              toast(`Você não tem acesso àquele escopo. Abrindo ${resolved.name}.`);
            }
          }
        } else if (fromPersist) {
          resolved = resolveScope(fromPersist, companies, groups);
          if (!resolved) {
            // Persisted scope is now inaccessible (e.g., membership removed)
            const def = await fetchDefaultScope(user.id);
            resolved = def ? resolveScope(def, companies, groups) : null;
          }
        } else {
          const def = await fetchDefaultScope(user.id);
          resolved = def ? resolveScope(def, companies, groups) : null;
        }

        if (aborted) return;
        if (resolved) {
          setScopeState(resolved);
          // Sync URL + Zustand to resolved scope
          const token = serializeScope(resolved);
          setSearchParams((prev) => { prev.set('scope', token); return prev; }, { replace: true });
          setPersistedToken(token);
        } else {
          // Sócio sem empresa OR liderado sem org_unit primário (D-09)
          setScopeState(null);
        }
      } finally {
        if (!aborted) setIsResolving(false);
      }
    })();

    return () => { aborted = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, authLoading]);

  // Cross-tab sync via BroadcastChannel
  useEffect(() => {
    if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return;
    const channel = new BroadcastChannel('leverup:scope');
    const onMessage = (ev: MessageEvent) => {
      const next = parseScopeToken(ev.data);
      if (!next) return;
      const resolved = resolveScope(next, visibleCompanies, visibleGroups);
      if (resolved) setScopeState(resolved);
    };
    channel.addEventListener('message', onMessage);
    return () => { channel.removeEventListener('message', onMessage); channel.close(); };
  }, [visibleCompanies, visibleGroups]);

  const setScope = useCallback<ScopeContextValue['setScope']>(
    (next) => {
      const resolved = resolveScope(next, visibleCompanies, visibleGroups);
      if (!resolved) return;
      setScopeState(resolved);
      const token = serializeScope(resolved);
      setSearchParams((prev) => { prev.set('scope', token); return prev; });
      setPersistedToken(token);
      // Cross-tab broadcast
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const channel = new BroadcastChannel('leverup:scope');
        channel.postMessage(token);
        channel.close();
      }
    },
    [visibleCompanies, visibleGroups, setSearchParams, setPersistedToken],
  );

  const isFixed = useMemo(() => {
    if (!visibleCompanies.length) return true;
    if (visibleCompanies.length === 1 && !visibleGroups.length) return true;
    return false;
  }, [visibleCompanies, visibleGroups]);

  const value: ScopeContextValue = { scope, setScope, isFixed, visibleCompanies, visibleGroups, isResolving };

  return <ScopeContext.Provider value={value}>{children}</ScopeContext.Provider>;
}

export function useScope() {
  const ctx = useContext(ScopeContext);
  if (!ctx) throw new Error('useScope must be used inside <ScopeProvider>');
  return ctx;
}

function resolveScope(
  hint: { kind: 'company' | 'group'; id: string },
  companies: Array<{ id: string; name: string }>,
  groups: Array<{ id: string; name: string; companyIds: string[] }>,
): Scope | null {
  if (hint.kind === 'company') {
    const c = companies.find((x) => x.id === hint.id);
    if (!c) return null;
    return { kind: 'company', id: c.id, companyIds: [c.id], name: c.name };
  }
  const g = groups.find((x) => x.id === hint.id);
  if (!g || !g.companyIds.length) return null;
  return { kind: 'group', id: g.id, companyIds: g.companyIds, name: g.name };
}

async function fetchDefaultScope(uid: string): Promise<{ kind: 'company' | 'group'; id: string } | null> {
  const { data, error } = await supabase.rpc('resolve_default_scope', { _uid: uid });
  if (error || !data) return null;
  return parseScopeToken(data as string);
}
```

**The chokepoint hook:**

```typescript
// src/shared/data/useScopedQuery.ts
import { useQuery, type UseQueryOptions, type QueryKey } from '@tanstack/react-query';
import { useScope } from '@/app/providers/ScopeProvider';

export function useScopedQuery<TData = unknown, TError = Error>(
  key: QueryKey,
  fn: (companyIds: string[]) => Promise<TData>,
  options?: Omit<UseQueryOptions<TData, TError, TData, QueryKey>, 'queryKey' | 'queryFn'>,
) {
  const { scope, isResolving } = useScope();
  return useQuery<TData, TError>({
    // CRITICAL: scope is the FIRST element. Partial-key invalidation matches.
    queryKey: ['scope', scope?.id ?? '__none__', scope?.kind ?? '__none__', ...key],
    queryFn: () => {
      if (!scope) return Promise.resolve([] as unknown as TData);
      return fn(scope.companyIds);
    },
    enabled: !!scope && !isResolving && (options?.enabled ?? true),
    ...options,
  });
}
```

**On scope change — partial invalidation (TEN-10):**

The TanStack Query `invalidateQueries` default behavior (`exact: false`) matches by prefix [VERIFIED: tanstack.com/query/v5/docs/framework/react/guides/query-invalidation]. To preserve cache for the previous scope (D-04: voltar = instantâneo), the planner deliberately does NOT call `invalidateQueries` on scope switch — instead, the queryKey itself changes, so React Query naturally:
1. Stops using the old key's data for active components.
2. Looks up the new key — cache miss → triggers query.
3. Old key remains in cache until `gcTime` (default 5 min) — switching back is instant.

If a hook NEEDS to invalidate (e.g., post-mutation), it does `queryClient.invalidateQueries({ queryKey: ['scope', currentScope.id] })` — which catches all of `['scope', X, *, ...]` for the current scope only. **No `removeQueries` calls** on scope switch.

```typescript
// Example consumer (Phase 2-3 will rewrite hiring/performance hooks like this)
export function useScopedJobs(filters: { status?: string }) {
  return useScopedQuery(
    ['hiring', 'jobs', filters],
    async (companyIds) => {
      const { data, error } = await supabase
        .from('job_openings')
        .select('*')
        .in('company_id', companyIds)
        .eq('status', filters.status ?? 'open');
      if (error) throw error;
      return data;
    },
  );
}
```

**Trade-offs:**
- **+** Switching scope never refetches stale data — previous scope's cache persists.
- **+** Forces every query to declare its scope (won't compile/run if you forget — `useScopedQuery` is the only allowed entry point, ESLint enforces).
- **+** URL = source of truth → shareable links, refresh-safe, browser nav works.
- **−** RLS is the security boundary — frontend `.in('company_id', ids)` is purely UX/perf. Never trust scope in frontend.
- **−** Result sets larger with groups (Grupo Lever = 7 companies). Use `staleTime` per query type to mitigate (e.g., 30s for kanban, 5 min for company list).

[VERIFIED: TanStack Query partial-key match docs; codebase grep confirms 173 existing `queryKey:` declarations to migrate in Phase 2-3; only Phase 1 builds the chokepoint.]

### Pattern 4: CASL Ability Definition (5 roles)

**File:** `src/features/tenancy/lib/abilities.ts`

```typescript
import { AbilityBuilder, createMongoAbility, type MongoAbility } from '@casl/ability';
import type { AppRole } from '@/hooks/useAuth';

// Subjects (entity types CASL knows about)
export type Subject =
  | 'Company' | 'CompanyGroup' | 'OrgUnit' | 'OrgUnitMember' | 'UnitLeader'
  | 'JobOpening' | 'Application' | 'Candidate'
  | 'Evaluation' | 'OneOnOne' | 'ClimateSurvey'
  | 'Folha' | 'Platform'  // Folha = financial KPI subject; Platform = global config
  | 'all';

// Actions
export type Action = 'manage' | 'create' | 'read' | 'update' | 'delete';

export type AppAbility = MongoAbility<[Action, Subject]>;

interface AbilityContext {
  role: AppRole;
  userId: string;
  visibleCompanyIds: string[];   // from RPC visible_companies(uid)
  visibleOrgUnitIds: string[];   // from RPC visible_org_units(uid)
  ledOrgUnitIds: string[];       // from unit_leaders WHERE user_id = uid
  ownOrgUnitIds: string[];       // from org_unit_members WHERE user_id = uid
}

export function defineAppAbility(ctx: AbilityContext): AppAbility {
  const { can, cannot, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

  // ============== ADMIN ==============
  if (ctx.role === 'admin') {
    can('manage', 'all');  // total power including Platform config
    return build();
  }

  // ============== RH ==============
  if (ctx.role === 'rh') {
    // Operational total — same scope as admin in data terms, NOT in platform config
    can('manage', 'Company');
    can('manage', 'CompanyGroup');
    can('manage', 'OrgUnit');
    can('manage', 'OrgUnitMember');
    can('manage', 'UnitLeader');
    can('manage', 'JobOpening');
    can('manage', 'Application');
    can('manage', 'Candidate');
    can('manage', 'Evaluation');
    can('manage', 'OneOnOne');
    can('manage', 'ClimateSurvey');
    can('read', 'Folha');
    cannot('manage', 'Platform');  // RBAC-03 — RH does NOT touch platform config
    return build();
  }

  // ============== SÓCIO ==============
  if (ctx.role === 'socio') {
    // Read access to all his companies' operational data
    can('read', 'Company',     { id: { $in: ctx.visibleCompanyIds } });
    can('read', 'OrgUnit',     { company_id: { $in: ctx.visibleCompanyIds } });
    can('read', 'JobOpening',  { company_id: { $in: ctx.visibleCompanyIds } });
    can('read', 'Application', { company_id: { $in: ctx.visibleCompanyIds } });  // via join — RLS enforces
    can('read', 'Candidate');  // global; RLS filters via application visibility
    can('read', 'Folha',       { company_id: { $in: ctx.visibleCompanyIds } });
    // Sócio CAN edit company branding/profile (CompanyDrawer)
    can('update', 'Company',   { id: { $in: ctx.visibleCompanyIds } });
    cannot('manage', 'Platform');
    cannot('manage', 'Evaluation');  // sócio observa, não opera ciclo
    return build();
  }

  // ============== LÍDER ==============
  if (ctx.role === 'lider') {
    can('read', 'Company',     { id: { $in: ctx.visibleCompanyIds } });
    can('read', 'OrgUnit',     { id: { $in: ctx.visibleOrgUnitIds } });
    can('read', 'OrgUnitMember', { org_unit_id: { $in: ctx.visibleOrgUnitIds } });
    can('read', 'JobOpening',  { company_id: { $in: ctx.visibleCompanyIds } });
    can('read', 'Application', { company_id: { $in: ctx.visibleCompanyIds } });
    // Líder pode requisitar vaga
    can('create', 'JobOpening', { company_id: { $in: ctx.visibleCompanyIds } });
    can('update', 'JobOpening', { requested_by: ctx.userId });
    // Líder vê + edita avaliações dos liderados
    can('manage', 'Evaluation', { org_unit_id: { $in: ctx.visibleOrgUnitIds } });
    // Líder lidera 1:1
    can('manage', 'OneOnOne', { leader_id: ctx.userId });
    return build();
  }

  // ============== LIDERADO / COLABORADOR ==============
  if (ctx.role === 'liderado' || ctx.role === 'colaborador') {
    can('read', 'Company',  { id: { $in: ctx.visibleCompanyIds } });
    can('read', 'OrgUnit',  { id: { $in: ctx.ownOrgUnitIds } });
    // Próprio histórico de avaliações
    can('read', 'Evaluation', { evaluatee_id: ctx.userId });
    // Próprio 1:1 (com líder)
    can('read', 'OneOnOne',   { liderado_id: ctx.userId });
    // Próprias respostas de clima (anônimas — UI não mostra "your answers" mesmo)
    return build();
  }

  return build();  // empty ability
}
```

**Provider + hook:**

```typescript
// src/features/tenancy/lib/abilityContext.ts
import { createContext, useContext } from 'react';
import { createContextualCan, useAbility as useCASLAbility } from '@casl/react';
import type { AppAbility } from './abilities';

export const AbilityContext = createContext<AppAbility>(null as unknown as AppAbility);
export const Can = createContextualCan(AbilityContext.Consumer);
export const useAbility = () => useCASLAbility(AbilityContext);
```

**Provider mount + ability rebuild on scope/membership change:**

```typescript
// src/app/providers/AbilityProvider.tsx
import { useMemo, type ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useScope } from './ScopeProvider';
import { defineAppAbility } from '@/features/tenancy/lib/abilities';
import { AbilityContext } from '@/features/tenancy/lib/abilityContext';

export function AbilityProvider({ children }: { children: ReactNode }) {
  const { user, userRole } = useAuth();
  const { visibleCompanies, visibleGroups } = useScope();

  // Note: ledOrgUnitIds + ownOrgUnitIds come from useVisibleScopes() (a separate hook
  // that fetches the user's leadership + membership). For Phase 1, fetch with
  // useScopedQuery once at provider mount (TODO for planner: extract to hook).
  const ability = useMemo(() => {
    if (!user?.id || !userRole) return defineAppAbility({
      role: 'colaborador', userId: '', visibleCompanyIds: [],
      visibleOrgUnitIds: [], ledOrgUnitIds: [], ownOrgUnitIds: [],
    });
    return defineAppAbility({
      role: userRole,
      userId: user.id,
      visibleCompanyIds: visibleCompanies.map((c) => c.id),
      visibleOrgUnitIds: [],   // PLANNER: wire to useScopedQuery for visible_org_units
      ledOrgUnitIds: [],       // PLANNER: wire to query unit_leaders
      ownOrgUnitIds: [],       // PLANNER: wire to query org_unit_members
    });
  }, [user?.id, userRole, visibleCompanies]);

  return <AbilityContext.Provider value={ability}>{children}</AbilityContext.Provider>;
}
```

**Hide vs disable:**
- DEFAULT: hide (e.g., button doesn't render at all if `cannot('create', 'JobOpening')`).
- DISABLE+TOOLTIP: only when "user almost can do this" — e.g., trigger disabled (D-06), or "Edit candidate" disabled+tooltip explaining why for a líder editing a candidate from another company.

[VERIFIED: Context7 `/stalniy/casl` docs — `defineAbility` DSL + condition objects + `<Can>` + `useAbility` patterns confirmed.]

### Anti-Patterns to Avoid

- **AP-1 Trusting frontend scope as security:** RLS = security; frontend `.in('company_id', ids)` = perf. (P-AP2)
- **AP-2 Inline EXISTS in RLS policies:** causes per-row evaluation. (P-AP1) → use SECURITY DEFINER helpers.
- **AP-3 SECURITY DEFINER without SET search_path:** Phase 1 ALWAYS uses `SET search_path = public`. (P-AP7)
- **AP-4 `removeQueries` on scope switch:** breaks D-04 cache preservation. → let queryKey change, GC handles cleanup.
- **AP-5 Putting tenant_id in `raw_user_meta_data`:** user-modifiable; never use for RLS. → server-side helpers + `user_roles` table.
- **AP-6 Per-tenant QueryClient:** loses cache on scope switch (cold queries every time), heavyweight. → key-prefix.
- **AP-7 Lucide ArrowX as logo stand-in:** brand fidelity rule. → `LeverArrow` primitive.
- **AP-8 ltree for org_units:** mutation-heavy + shallow + low cardinality = adjacency list wins. (P-AP6)
- **AP-9 One giant migration:** can't roll back partially. → split A/B/C.

---

## Migration Sequence (A-D)

> Phase 1 ships A, B, C as SQL migrations + D as code-only. Migration G (contract — drops `allowed_companies`, `teams`, NOT NULL constraints) is **Phase 4**, not here.

### Migration A — `company_groups` + feature flags

**File:** `supabase/migrations/{TIMESTAMP_A}_company_groups_and_feature_flags.sql`
**Timestamp suggestion:** `20260427120000`
**Reversible:** YES (DROP TABLE, DROP COLUMN)
**App impact:** None — all new fields nullable or defaulted.

```sql
-- ========================================================================
-- Migration A: company_groups + companies feature flags + nullable group_id
--
-- Adds the multi-tenant grouping primitive without changing app behavior.
-- Existing app code does not read group_id or feature flags yet.
-- ========================================================================

-- 1. Feature flags on existing companies table
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS performance_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS rs_enabled          boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.companies.performance_enabled IS
  'When true, this company has Performance module (1:1, evaluations, climate) active. Default false; RH liga ao cadastrar.';
COMMENT ON COLUMN public.companies.rs_enabled IS
  'When true, this company has Recrutamento & Seleção active. Default false; RH liga ao cadastrar.';

-- 2. company_groups table
CREATE TABLE IF NOT EXISTS public.company_groups (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  slug        text NOT NULL UNIQUE,
  created_at  timestamptz NOT NULL DEFAULT NOW(),
  updated_at  timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT slug_format CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

CREATE TRIGGER tg_company_groups_updated_at
  BEFORE UPDATE ON public.company_groups
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

ALTER TABLE public.company_groups ENABLE ROW LEVEL SECURITY;

-- All authenticated users can SELECT groups (visibility filtered client-side via group.companies);
-- only people managers can mutate.
CREATE POLICY "company_groups:select_authenticated"
  ON public.company_groups FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "company_groups:mutate_managers"
  ON public.company_groups FOR ALL TO authenticated
  USING (public.is_people_manager((SELECT auth.uid())))
  WITH CHECK (public.is_people_manager((SELECT auth.uid())));

-- 3. Optional group_id on companies
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES public.company_groups(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_companies_group_id ON public.companies(group_id) WHERE group_id IS NOT NULL;

COMMENT ON COLUMN public.companies.group_id IS
  'Optional grouping (e.g., Grupo Lever for the 7 internal companies). NULL = standalone external client.';
```

### Migration B — `org_units` + helpers

**File:** `supabase/migrations/{TIMESTAMP_B}_org_units_and_rls_helpers.sql`
**Timestamp suggestion:** `20260427120100`
**Reversible:** YES (DROP TABLE, DROP FUNCTION) — but note: existing policies (Migration A timestamp) still use old `allowed_companies`; they keep working because the old helper isn't dropped here.
**App impact:** None — new tables empty, helpers added but no policy switches yet.

Contents:
1. `org_units`, `org_unit_members`, `unit_leaders` tables (schema in Pattern 2 above)
2. Anti-cycle trigger + same-company-as-parent trigger
3. RLS policies for the three new tables (using `visible_org_units` once helper exists below)
4. Helper functions: `org_unit_descendants`, `visible_org_units`
5. Then update `app_role` enum to add `'liderado'` (preserve `'colaborador'` as alias for now): `ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'liderado';`

> **NOTE for planner:** The Postgres `ALTER TYPE ... ADD VALUE` cannot run inside a transaction; it must be its own migration OR use the `BEGIN/COMMIT` workaround. Recommend separate `_alter_app_role_add_liderado.sql` migration BEFORE Migration B if planner wants atomic-ness. Since Migration B is the first that needs `'liderado'` in `has_role()` checks, place enum addition first within the SAME migration file using `COMMIT;` between transactions if Supabase CLI tolerates it (it does for migrations applied serially).

### Migration C — `socio_company_memberships` + RLS rewrite + `visible_companies` + backfill + `resolve_default_scope`

**File:** `supabase/migrations/{TIMESTAMP_C}_socio_memberships_visible_companies_backfill.sql`
**Timestamp suggestion:** `20260427120200`
**Reversible:** YES until backfill (DROP TABLE drops memberships; backfill rows die cleanly).
**App impact:** Old `allowed_companies()` keeps working (not dropped); new `visible_companies()` + new policies added in parallel.

Contents:
1. `socio_company_memberships` table:
```sql
CREATE TABLE public.socio_company_memberships (
  user_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, company_id)
);
CREATE INDEX idx_socio_memberships_user ON public.socio_company_memberships(user_id);
CREATE INDEX idx_socio_memberships_company ON public.socio_company_memberships(company_id);

ALTER TABLE public.socio_company_memberships ENABLE ROW LEVEL SECURITY;
-- Sócio sees own memberships; managers manage all
CREATE POLICY "socio_memberships:select_own_or_manager"
  ON public.socio_company_memberships FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR public.is_people_manager((SELECT auth.uid())));
CREATE POLICY "socio_memberships:mutate_manager"
  ON public.socio_company_memberships FOR ALL TO authenticated
  USING (public.is_people_manager((SELECT auth.uid())))
  WITH CHECK (public.is_people_manager((SELECT auth.uid())));
```

2. `visible_companies(uid)` helper (full SQL in Pattern 1 above).

3. Re-enable RLS on `companies` (per migration `20251009193314` it's enabled but with no policies — verify and add):
```sql
-- companies might already have policies; this migration ensures the canonical "visible_companies"-based one exists.
DROP POLICY IF EXISTS "companies:select" ON public.companies;
CREATE POLICY "companies:select"
  ON public.companies FOR SELECT TO authenticated
  USING (id = ANY(public.visible_companies((SELECT auth.uid()))));

DROP POLICY IF EXISTS "companies:mutate_managers" ON public.companies;
CREATE POLICY "companies:mutate_managers"
  ON public.companies FOR ALL TO authenticated
  USING (public.is_people_manager((SELECT auth.uid())))
  WITH CHECK (public.is_people_manager((SELECT auth.uid())));
```

4. **Rewrite hiring policies to use `visible_companies` instead of `allowed_companies`** — keep `allowed_companies` for now (Migration G drops it).
   - 12 policies in `20260416193100_hiring_rls_policies.sql` use `allowed_companies`. Rewrite each to `visible_companies`.
   - Apply `(SELECT auth.uid())` initPlan caching idiom to all (RBAC-10 audit).

5. **Backfill SQL (idempotent):**

```sql
-- ========================================================================
-- Backfill: Grupo Lever + 7 internal companies + auto-create root org_units
--
-- Idempotency: ON CONFLICT DO NOTHING / DO UPDATE for known slug.
-- Re-running this migration is safe.
-- ========================================================================

-- 1. Insert/upsert "Grupo Lever"
INSERT INTO public.company_groups (slug, name)
VALUES ('grupo-lever', 'Grupo Lever')
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
RETURNING id;
-- Capture id for next steps:
DO $$
DECLARE
  grupo_lever_id uuid;
BEGIN
  SELECT id INTO grupo_lever_id FROM public.company_groups WHERE slug = 'grupo-lever';

  -- 2. Assign 7 internal companies to Grupo Lever.
  --    Owner must provide names — Phase 1 inserts placeholders the planner replaces
  --    once owner confirms identities. Phase 1 backfill is permitted to be empty
  --    initially; RH UI in /empresas allows adding the assignment later.
  --
  --    PLANNER INSTRUCTION: replace the IN-list below with confirmed names from owner.
  UPDATE public.companies
     SET group_id = grupo_lever_id,
         performance_enabled = true,
         rs_enabled          = true
   WHERE name IN (
     -- TODO(owner-confirmation): nomes das 7 empresas internas
     'Lever Consult', 'Lever Outsourcing', 'Lever Gestão',
     'Lever People', 'Lever Tech', 'Lever Talents', 'Lever Operations'
     -- These names are PLACEHOLDERS — owner must confirm the actual 7.
   );

  -- 3. Auto-create one root org_unit per company that has none.
  INSERT INTO public.org_units (company_id, parent_id, name, kind, position)
  SELECT c.id, NULL, c.name, 'empresa', 0
    FROM public.companies c
   WHERE NOT EXISTS (SELECT 1 FROM public.org_units ou WHERE ou.company_id = c.id AND ou.parent_id IS NULL);

  -- 4. Migrate existing teams → org_units (each team becomes a child of company root).
  --    Mantém `teams` intacto (read-compat ORG-09); Phase 4 dropa.
  INSERT INTO public.org_units (id, company_id, parent_id, name, kind, position, created_at)
  SELECT t.id,                             -- preserve same id so future joins work
         t.company_id,
         (SELECT ou.id FROM public.org_units ou WHERE ou.company_id = t.company_id AND ou.parent_id IS NULL LIMIT 1),
         t.name,
         'time',
         0,
         t.created_at
    FROM public.teams t
   WHERE NOT EXISTS (SELECT 1 FROM public.org_units WHERE id = t.id)
   ON CONFLICT (id) DO NOTHING;

  -- 5. Mirror team_members → org_unit_members + unit_leaders
  INSERT INTO public.org_unit_members (org_unit_id, user_id, is_primary)
  SELECT tm.team_id, tm.user_id, true
    FROM public.team_members tm
   WHERE EXISTS (SELECT 1 FROM public.org_units WHERE id = tm.team_id)
   ON CONFLICT (org_unit_id, user_id) DO NOTHING;

  INSERT INTO public.unit_leaders (org_unit_id, user_id)
  SELECT DISTINCT tm.team_id, tm.leader_id
    FROM public.team_members tm
   WHERE tm.leader_id IS NOT NULL
     AND EXISTS (SELECT 1 FROM public.org_units WHERE id = tm.team_id)
   ON CONFLICT (org_unit_id, user_id) DO NOTHING;

  -- 6. socio_company_memberships: ZERO backfill in Phase 1.
  --    RH must explicitly assign sócio→empresa via the UI (already exists in /empresas;
  --    Phase 1 adds a "Vinculações de sócios" panel inside CompanyDrawer).
  --    Existing sócios will have empty memberships until RH fills them — they see
  --    the "Sem empresa atribuída" empty state (D-09).
END $$;
```

6. **`resolve_default_scope(uid)` RPC** — D-11:

```sql
CREATE OR REPLACE FUNCTION public.resolve_default_scope(_uid uuid)
RETURNS text  -- token: 'company:UUID' | 'group:UUID' | NULL
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  default_token text;
  is_admin_or_rh boolean;
  grupo_lever_id uuid;
  primary_company uuid;
BEGIN
  -- D-10: Admin / RH → Grupo Lever
  is_admin_or_rh := public.has_role(_uid, 'admin'::public.app_role)
                 OR public.has_role(_uid, 'rh'::public.app_role);
  IF is_admin_or_rh THEN
    SELECT id INTO grupo_lever_id FROM public.company_groups WHERE slug = 'grupo-lever' LIMIT 1;
    IF grupo_lever_id IS NOT NULL THEN
      RETURN 'group:' || grupo_lever_id::text;
    END IF;
  END IF;

  -- D-10: Sócio → primeira empresa onde tem membership
  IF public.has_role(_uid, 'socio'::public.app_role) THEN
    SELECT company_id INTO primary_company
      FROM public.socio_company_memberships
     WHERE user_id = _uid
     ORDER BY created_at ASC
     LIMIT 1;
    IF primary_company IS NOT NULL THEN
      RETURN 'company:' || primary_company::text;
    END IF;
    RETURN NULL;  -- D-09: empty state
  END IF;

  -- D-10: Líder → empresa do org_unit primário (is_primary = true) ou primeiro unit liderado
  IF public.has_role(_uid, 'lider'::public.app_role) THEN
    SELECT ou.company_id INTO primary_company
      FROM public.unit_leaders ul
      JOIN public.org_units ou ON ou.id = ul.org_unit_id
     WHERE ul.user_id = _uid
     ORDER BY ul.created_at ASC
     LIMIT 1;
    IF primary_company IS NOT NULL THEN
      RETURN 'company:' || primary_company::text;
    END IF;
  END IF;

  -- D-10: Liderado → empresa do org_unit primário
  IF public.has_role(_uid, 'liderado'::public.app_role)
    OR public.has_role(_uid, 'colaborador'::public.app_role) THEN
    SELECT ou.company_id INTO primary_company
      FROM public.org_unit_members oum
      JOIN public.org_units ou ON ou.id = oum.org_unit_id
     WHERE oum.user_id = _uid
       AND oum.is_primary = true
     ORDER BY oum.created_at ASC
     LIMIT 1;
    IF primary_company IS NULL THEN
      -- Fallback: any membership
      SELECT ou.company_id INTO primary_company
        FROM public.org_unit_members oum
        JOIN public.org_units ou ON ou.id = oum.org_unit_id
       WHERE oum.user_id = _uid
       ORDER BY oum.created_at ASC
       LIMIT 1;
    END IF;
    IF primary_company IS NOT NULL THEN
      RETURN 'company:' || primary_company::text;
    END IF;
  END IF;

  RETURN NULL;
END $$;

REVOKE ALL ON FUNCTION public.resolve_default_scope(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_default_scope(uuid) TO authenticated;
```

### Migration D — Frontend chokepoint (NOT a SQL migration)

**Files (new code):**
- `src/app/providers/ScopeProvider.tsx`
- `src/app/providers/AbilityProvider.tsx`
- `src/app/providers/index.tsx` (composition)
- `src/shared/data/useScopedQuery.ts`
- `src/shared/data/useScopedRealtime.ts`
- `src/features/tenancy/**/*` (full module — see Component Inventory)
- `src/features/org-structure/**/*` (ORG-08)
- `src/lib/logger.ts`
- `src/lib/formatBR.ts`
- `eslint.config.js` (edit: add custom rule + `@tanstack/eslint-plugin-query`)
- `eslint-rules/no-supabase-from-outside-hooks.js` (new)

**Files edited:**
- `src/App.tsx` — wrap with `ScopeProvider` + `AbilityProvider` after auth resolves; **provider mount must be inside `<BrowserRouter>` because `ScopeProvider` uses `useSearchParams()`** ← critical placement note
- `src/components/Header.tsx` — insert `<ScopeSwitch />` between breadcrumbs and `PendingTasksDropdown`
- `package.json` + `package-lock.json` — new deps; remove `bun.lockb`
- `supabase/config.toml` — update project_id from old to `ehbxpbeijofxtsbezwxd` (memory `project_supabase_migration.md` notes the migration but config.toml still points to old)

**Sequence within Migration D:**
1. Install npm deps (single batch).
2. Drop `bun.lockb` (QUAL-05).
3. Add `logger.ts` + `formatBR.ts` utilities.
4. Add ESLint rule + `@tanstack/eslint-plugin-query` config (rules visible from PR 1 to catch any new violation; existing 16 violations get an inline `// eslint-disable-next-line` exemption per file with a TODO comment + tracked issue).
5. Build `ScopeProvider` + `AbilityProvider` + `useScopedQuery`.
6. Build `ScopeSwitch` component (UI-SPEC.md).
7. Mount providers in `App.tsx`; mount `ScopeSwitch` in `Header.tsx`.
8. Smoke test: log in as admin → see "Grupo Lever" → switch to a company → URL updates → switch back → cache hit.
9. Run pgTAP cross-tenant tests in CI.
10. Update `supabase/config.toml` project_id.

### Dependencies & Ordering Constraints

```
Migration A (groups + flags)
  ↓ depends on: existing companies table
Migration B (org_units + 2 helpers)  ┐
  ↓ depends on: Migration A nothing  ├─ B and A can run in same release;
                                     ┘  Supabase CLI applies serially anyway.
Migration C (memberships + 1 helper + RLS rewrite + backfill + RPC)
  ↓ depends on: A (group_id used in backfill), B (org_units used in mirror), `app_role` has 'liderado'
Migration D (code-only)
  ↓ depends on: A, B, C all applied (resolve_default_scope, visible_companies, etc. must exist for ScopeProvider boot)
```

**Rollback strategy per migration:**
- A: `DROP TABLE company_groups; ALTER TABLE companies DROP COLUMN group_id, DROP COLUMN performance_enabled, DROP COLUMN rs_enabled;`
- B: `DROP TABLE org_units, org_unit_members, unit_leaders CASCADE; DROP FUNCTION org_unit_descendants, visible_org_units;`
- C: `DROP TABLE socio_company_memberships; DROP FUNCTION visible_companies, resolve_default_scope; restore old policies` — only feasible if backfill rows are throwaway. Plan to keep old `allowed_companies` and old policies as parallel paths through Phase 1; Phase 4 contract drops them.
- D: `git revert` of provider commits.

---

## Quality Gates Implementation

### Gate 1 — Lockfile dedup (QUAL-05)

**Tasks:**
1. `git rm bun.lockb` — single line in PR diff.
2. README/CLAUDE.md already say `npm` is canonical.
3. Verify `Dockerfile` (if any) uses `npm ci` (CONCERNS.md mentions yes; verify).
4. CI workflow (when added in Phase 4) uses `npm ci`.

### Gate 2 — ESLint custom rule `no-supabase-from-outside-hooks` (QUAL-07)

**File:** `eslint-rules/no-supabase-from-outside-hooks.js` (CommonJS for tooling stability):

```javascript
// eslint-rules/no-supabase-from-outside-hooks.js
/**
 * Block direct calls to `supabase.from(...)` outside `src/hooks/**`
 * and `src/integrations/**`. Forces feature code through useScopedQuery.
 * QUAL-07.
 */
const ALLOWED_PATH_PATTERNS = [
  /\/src\/hooks\//,
  /\/src\/integrations\//,
  /\/src\/shared\/data\//,         // useScopedQuery itself
  /\/src\/features\/[^/]+\/hooks\//, // future: features/x/hooks/
  /\/src\/lib\/hiring\/rlsScope\.ts$/,  // existing scoped helper, exempt
];

// Phase 1 allowlist (TECH DEBT — clean up in Phase 2-3 by moving to hooks/).
// Each entry MUST have an open issue.
const PHASE_1_LEGACY_ALLOWLIST = [
  /\/src\/components\/ManualPDIForm\.tsx$/,           // TODO(#legacy-1)
  /\/src\/components\/hiring\/PipelineFilters\.tsx$/, // TODO(#legacy-2)
  /\/src\/components\/hiring\/JobOpeningForm\.tsx$/,  // TODO(#legacy-3)
  /\/src\/components\/company\/CompanyDrawer\.tsx$/,  // TODO(#legacy-4)
  /\/src\/pages\/Index\.tsx$/,
  /\/src\/pages\/CompanyManagement\.tsx$/,
  /\/src\/pages\/Climate\.tsx$/,
  /\/src\/pages\/MyTeam\.tsx$/,
  /\/src\/pages\/Profile\.tsx$/,
  /\/src\/pages\/DevelopmentKanban\.tsx$/,
  /\/src\/pages\/AdminDashboard\.tsx$/,
  /\/src\/pages\/hiring\/JobOpenings\.tsx$/,
];

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow direct supabase.from(...) outside hooks/, integrations/, shared/data/, features/*/hooks/',
    },
    schema: [],
    messages: {
      forbidden:
        'Direct supabase.from() is forbidden here. Move data fetching to a hook in src/hooks/ or src/features/X/hooks/, then consume via useScopedQuery (QUAL-07).',
    },
  },
  create(context) {
    const filename = context.filename || context.getFilename();
    if (ALLOWED_PATH_PATTERNS.some((p) => p.test(filename))) return {};
    if (PHASE_1_LEGACY_ALLOWLIST.some((p) => p.test(filename))) return {};

    return {
      // Match supabase.from(...)
      "CallExpression > MemberExpression[object.name='supabase'][property.name='from']"(node) {
        context.report({ node, messageId: 'forbidden' });
      },
    };
  },
};
```

**Wire into `eslint.config.js`:**

```javascript
// eslint.config.js (edited)
import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import pluginQuery from '@tanstack/eslint-plugin-query';
import noSupabaseFromOutsideHooks from './eslint-rules/no-supabase-from-outside-hooks.js';

export default tseslint.config(
  { ignores: ['dist'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended, ...pluginQuery.configs['flat/recommended']],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      lever: { rules: { 'no-supabase-from-outside-hooks': noSupabaseFromOutsideHooks } },
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-unused-vars': 'off',
      'lever/no-supabase-from-outside-hooks': 'error',  // QUAL-07
      // @tanstack/query: defaults already enable exhaustive-deps — see below
    },
  },
);
```

[VERIFIED: ESLint flat config docs — inline plugins via `plugins: { lever: { rules: {...} } }` works; `CallExpression > MemberExpression[object.name='supabase'][property.name='from']` selector verified.]

### Gate 3 — `@tanstack/eslint-plugin-query` (QUAL-08)

**Built-in rules enabled by `flat/recommended`:**
- `@tanstack/query/exhaustive-deps` — **enabled** — every variable used in `queryFn` MUST appear in `queryKey`.
- `@tanstack/query/stable-query-client` — guards against accidental QueryClient recreation.
- `@tanstack/query/no-rest-destructuring` — guards against `const { data, ...rest } = useQuery(...)`.
- `@tanstack/query/no-unstable-deps` — guards against object literals in queryKey deps.

**Custom rule needed for "every key starts with `['scope', scope.id, ...]`":**
`@tanstack/eslint-plugin-query` does NOT ship this. The chokepoint pattern (`useScopedQuery` is the only allowed entry point per QUAL-07's ESLint rule above) is the architectural enforcement.

The chokepoint enforcement IS the rule. We don't need a second AST rule — if no `supabase.from()` is allowed outside hooks, and the only data hooks in `features/` go through `useScopedQuery`, there's no way to write a query without `['scope', scope.id, ...]` prefix.

**Phase 1 sanity check (planner-runs-once):**
```bash
# Find all queryKey declarations and audit for scope prefix.
grep -rn "queryKey:" src/hooks/ src/features/ | grep -v 'queryKey: \[.scope.' | head -20
# Expected: zero output after Phase 1 hook migrations (Phase 2-3 actually does the migrations).
```

### Gate 4 — PII scrubbing wrapper (AUTH-04, AUTH-05)

**File:** `src/lib/logger.ts`

```typescript
/**
 * PII-aware logger wrapper.
 * - In DEV (`import.meta.env.DEV`): forwards to console.* untouched.
 * - In PROD: strips known PII fields (email, cpf, full_name, phone) from objects;
 *   string args containing email/CPF patterns get redacted.
 * Phase 4 (QUAL-06) replaces this with Sentry beforeSend integration.
 */
const PII_KEYS = new Set(['email', 'cpf', 'full_name', 'fullName', 'phone', 'salary', 'birth_date', 'birthDate']);

const EMAIL_RE = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
const CPF_RE = /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g;

function redact(value: unknown): unknown {
  if (typeof value === 'string') {
    return value.replace(EMAIL_RE, '[email-redacted]').replace(CPF_RE, '[cpf-redacted]');
  }
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = PII_KEYS.has(k) ? '[redacted]' : redact(v);
    }
    return out;
  }
  return value;
}

const isDev = typeof import.meta !== 'undefined' && (import.meta as ImportMeta).env?.DEV;

export const logger = {
  log: (...args: unknown[]) => {
    if (isDev) return console.log(...args);
    console.log(...args.map(redact));
  },
  warn: (...args: unknown[]) => {
    if (isDev) return console.warn(...args);
    console.warn(...args.map(redact));
  },
  error: (...args: unknown[]) => {
    if (isDev) return console.error(...args);
    console.error(...args.map(redact));
  },
  debug: (...args: unknown[]) => {
    if (isDev) console.debug(...args);
    // No-op in prod
  },
};
```

**Adoption strategy:**
- New code in Phase 1 uses `logger.*` exclusively.
- Existing `console.log`/`console.error` calls (CONCERNS.md flagged ~6+ files) are NOT mass-converted in Phase 1 — that's a Phase 4 polish task. Phase 1 ships the wrapper.
- Optional: add ESLint rule `no-console` with allowlist later (Phase 4).

### Gate 5 — `date-fns-tz` formatter (QUAL-10)

**File:** `src/lib/formatBR.ts`

```typescript
import { format as fnsFormat } from 'date-fns';
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';
import { ptBR } from 'date-fns/locale';

const TZ = 'America/Sao_Paulo';

/** Format any timestamp/date in São Paulo timezone with PT-BR locale. */
export function formatBR(input: string | Date | number, fmt = 'dd/MM/yyyy HH:mm'): string {
  if (!input) return '';
  return formatInTimeZone(input, TZ, fmt, { locale: ptBR });
}

/** Date-only formatter (no time). */
export function formatBRDate(input: string | Date | number): string {
  return formatBR(input, 'dd/MM/yyyy');
}

/** Time-only formatter. */
export function formatBRTime(input: string | Date | number): string {
  return formatBR(input, 'HH:mm');
}

/** Relative format (e.g., "há 3 dias"). */
export function formatBRRelative(input: string | Date | number): string {
  const zoned = toZonedTime(input, TZ);
  const diff = (Date.now() - zoned.getTime()) / 1000;
  if (diff < 60) return 'agora';
  if (diff < 3600) return `há ${Math.floor(diff / 60)} min`;
  if (diff < 86_400) return `há ${Math.floor(diff / 3600)} h`;
  if (diff < 604_800) return `há ${Math.floor(diff / 86_400)} d`;
  return formatBRDate(zoned);
}
```

**Adoption:** Wherever `timestamptz` is rendered (CandidateProfile, EvaluationCard, etc.), replace `new Date(x).toLocaleString()` with `formatBR(x)`. Phase 1 ships the util; full audit happens in Phase 4 (QUAL-10). Mark TODO at each old usage site.

---

## Validation Architecture

> Mandatory section per `workflow.nyquist_validation: true` in `.planning/config.json`.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 3.2.0 + RTL 16 + MSW 2.13 (frontend); pgTAP 1.3 + supabase-test-helpers 0.0.6 (database) |
| Config file (FE) | `vitest.config.ts` (NEW — extends `vite.config.ts` plugins) |
| Config file (DB) | `supabase/tests/000-setup-tests-hooks.sql` |
| Quick run command (FE) | `npm test -- --run src/features/tenancy` |
| Full suite (FE) | `npm test -- --run` |
| Quick run (DB) | `supabase test db --filter "tenancy*"` |
| Full suite (DB) | `supabase test db` |

### Phase Requirements → Test Map

| REQ ID | Behavior | Test Type | Automated Command | File Status |
|--------|----------|-----------|-------------------|-------------|
| TEN-01..TEN-04 | Schema exists with constraints | pgTAP unit | `supabase test db --filter "tenancy_schema"` | ❌ Wave 0 |
| TEN-05 | Header trigger renders + opens dropdown | RTL component | `npm test ScopeSwitch.test.tsx` | ❌ Wave 0 |
| TEN-06 | Switching scope changes queryKey, no flash | RTL integration | `npm test ScopeSwitch.integration.test.tsx` | ❌ Wave 0 |
| TEN-07 | Group expansion: scope.companyIds.length === 7 | RTL unit | `npm test resolveScope.test.ts` | ❌ Wave 0 |
| TEN-08 | Zustand persist key `leverup:scope` exists in localStorage after switch | RTL unit | `npm test useScopeStore.test.ts` | ❌ Wave 0 |
| TEN-09 | URL `?scope=company:UUID` parsing + writing | RTL unit | `npm test scopeKey.test.ts` | ❌ Wave 0 |
| TEN-10 | Partial-key invalidation preserves old scope cache | RTL integration | `npm test useScopedQuery.test.tsx` | ❌ Wave 0 |
| RBAC-01 | Enum has 5 roles | pgTAP unit | `supabase test db --filter "rbac_enum"` | ❌ Wave 0 |
| RBAC-02..06 | Each role's `visible_companies()` correctness | pgTAP integration | `supabase test db --filter "rbac_visible_companies"` | ❌ Wave 0 |
| RBAC-07 | Trigger label = scope.name; aria-label has "Você está vendo:" | RTL component | `npm test ScopeSwitch.test.tsx` | ❌ Wave 0 |
| RBAC-08 | CASL hides "Criar empresa" button for non-admin/rh | RTL component | `npm test Header.casl.test.tsx` | ❌ Wave 0 |
| RBAC-09 | Helpers exist + `STABLE SECURITY DEFINER` set | pgTAP unit | `supabase test db --filter "rls_helpers_attrs"` | ❌ Wave 0 |
| RBAC-10 | Audit: existing policies use `(SELECT auth.uid())` post-rewrite | pgTAP introspection | `supabase test db --filter "auth_uid_initplan_audit"` | ❌ Wave 0 |
| ORG-01..05 | Schema + constraints + indexes | pgTAP unit | `supabase test db --filter "org_units_schema"` | ❌ Wave 0 |
| ORG-03 | Anti-cycle trigger raises 'cycle detected' on circular update | pgTAP integration | `supabase test db --filter "org_units_anticycle"` | ❌ Wave 0 |
| ORG-06 | `org_unit_descendants(id)` returns correct subtree | pgTAP integration | `supabase test db --filter "org_unit_descendants"` | ❌ Wave 0 |
| ORG-07 | Líder of root sees grandchild's data via RLS | pgTAP integration (cross-tenant) | `supabase test db --filter "lider_recursive_visibility"` | ❌ Wave 0 |
| ORG-08 | OrgUnitTree CRUD UI renders + creates child | RTL integration + MSW | `npm test OrgUnitTree.integration.test.tsx` | ❌ Wave 0 |
| ORG-09 | `teams` and `org_units` coexist; team_members mirror works | pgTAP integration | `supabase test db --filter "teams_org_units_coexist"` | ❌ Wave 0 |
| AUTH-04, AUTH-05 | `logger.error` strips PII in PROD mode | Vitest unit | `npm test logger.test.ts` | ❌ Wave 0 |
| QUAL-05 | `bun.lockb` not present in repo; `package-lock.json` is canonical | CI shell check | `[ ! -f bun.lockb ] && [ -f package-lock.json ]` | ❌ Wave 0 |
| QUAL-07 | ESLint rule rejects new `supabase.from()` outside allowed paths | ESLint rule self-test | `npm test eslint-rules/no-supabase-from-outside-hooks.test.js` | ❌ Wave 0 |
| QUAL-08 | `@tanstack/eslint-plugin-query` flags missing dep in queryKey | ESLint config check | `npm run lint -- --no-warn-ignored` | ❌ Wave 0 |
| QUAL-10 | `formatBR(timestamptz)` returns `dd/MM/yyyy HH:mm` in São Paulo TZ | Vitest unit | `npm test formatBR.test.ts` | ❌ Wave 0 |
| **CRITICAL CROSS-TENANT** | RH from empresa A querying empresa B candidates returns 0 rows | pgTAP integration | `supabase test db --filter "cross_tenant_leakage"` | ❌ Wave 0 |
| **D-04 cache preservation** | Switch A → B → A: A's data is hot (no refetch) | RTL integration with mock fetcher | `npm test useScopedQuery.cache.test.tsx` | ❌ Wave 0 |
| **D-08 fallback** | Manual `?scope=company:invalidUUID` redirects + toast | RTL integration | `npm test ScopeProvider.fallback.test.tsx` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** Run touching-file tests via `npm test -- --run --related <files>` + the relevant pgTAP filter for SQL changes.
- **Per wave merge:** Full FE suite (`npm test -- --run`) + full DB suite (`supabase test db`).
- **Phase gate:** Both suites green + manual smoke test of `/empresas`, scope switch in 2 separate routes, sócio-empty-state, and admin-toggle-feature-flag.

### Wave 0 Gaps (must exist before implementation tasks start)

- [ ] `vitest.config.ts` — base config with jsdom, path aliases, setupFiles for `@testing-library/jest-dom/vitest`
- [ ] `src/test/setup.ts` — RTL setup, MSW server bootstrap
- [ ] `src/test/msw/handlers.ts` — base Supabase REST handlers
- [ ] `supabase/tests/000-setup-tests-hooks.sql` — installs basejump-supabase_test_helpers
- [ ] `supabase/tests/001-tenancy-schema.sql` — TEN/RBAC/ORG schema introspection tests
- [ ] `supabase/tests/002-cross-tenant-leakage.sql` — CRITICAL pgTAP file (the security gate)
- [ ] `supabase/tests/003-rls-helpers.sql` — visible_companies/visible_org_units/org_unit_descendants behavior
- [ ] `supabase/tests/004-anticycle.sql` — ORG-03 trigger
- [ ] `supabase/tests/005-resolve-default-scope.sql` — D-11 RPC behavior per role
- [ ] CI workflow file (Phase 4 adds the formal CI; Phase 1 documents how to run locally + adds a basic GH Action that just runs `npm test` + `supabase test db` if owner wants it)

### Sample Cross-Tenant pgTAP Test (CRITICAL — copy-paste ready)

**File:** `supabase/tests/002-cross-tenant-leakage.sql`

```sql
begin;
select plan(6);

-- Setup: 2 companies, 1 RH per company
select tests.create_supabase_user('rh_a@test.com');
select tests.create_supabase_user('rh_b@test.com');

select tests.authenticate_as_service_role();

-- Create companies
insert into public.companies (id, name) values
  ('00000000-0000-0000-0000-00000000000a', 'Empresa A'),
  ('00000000-0000-0000-0000-00000000000b', 'Empresa B');

-- Grant rh role to both users
insert into public.user_roles (user_id, role) values
  (tests.get_supabase_uid('rh_a@test.com'), 'rh'::app_role),
  (tests.get_supabase_uid('rh_b@test.com'), 'rh'::app_role);

-- Create 1 job opening per company
insert into public.job_openings (id, company_id, title, status, created_by)
values
  ('11111111-1111-1111-1111-11111111111a', '00000000-0000-0000-0000-00000000000a',
   'Vaga A', 'open', tests.get_supabase_uid('rh_a@test.com')),
  ('22222222-2222-2222-2222-22222222222b', '00000000-0000-0000-0000-00000000000b',
   'Vaga B', 'open', tests.get_supabase_uid('rh_b@test.com'));

-- TEST: Both RHs see all (because rh role is global per RBAC-03)
select tests.authenticate_as('rh_a@test.com');
select results_eq(
  'select count(*) from public.job_openings',
  array[2::bigint],
  'rh@A sees BOTH openings (RBAC-03: rh has global access)'
);

select tests.authenticate_as('rh_b@test.com');
select results_eq(
  'select count(*) from public.job_openings',
  array[2::bigint],
  'rh@B also sees BOTH (same reason)'
);

-- NOW THE REAL TEST: a sócio of A should NOT see B
select tests.authenticate_as_service_role();
select tests.create_supabase_user('socio_a@test.com');
insert into public.user_roles values
  (gen_random_uuid(), tests.get_supabase_uid('socio_a@test.com'), 'socio'::app_role, NOW());
insert into public.socio_company_memberships (user_id, company_id) values
  (tests.get_supabase_uid('socio_a@test.com'), '00000000-0000-0000-0000-00000000000a');

select tests.authenticate_as('socio_a@test.com');
select results_eq(
  'select count(*) from public.job_openings',
  array[1::bigint],
  'socio@A sees ONLY company A''s openings (not B)'
);

-- And cannot read B specifically
select results_eq(
  $$select count(*) from public.job_openings where company_id = '00000000-0000-0000-0000-00000000000b'$$,
  array[0::bigint],
  'socio@A cannot read company B job_openings (RLS blocks)'
);

-- And cannot insert into B
select throws_ok(
  $$insert into public.job_openings (company_id, title, status, created_by)
    values ('00000000-0000-0000-0000-00000000000b', 'Hacked', 'open', auth.uid())$$,
  '42501',
  'new row violates row-level security policy',
  'socio@A blocked from creating opening in company B'
);

-- Without scope visibility, visible_companies returns empty array for unauth user
select tests.clear_authentication();
select results_eq(
  'select count(*) from public.job_openings',
  array[0::bigint],
  'unauthenticated user sees zero rows'
);

select * from finish();
rollback;
```

[VERIFIED: pattern matches Supabase pgTAP docs + supabase-test-helpers 0.0.6 API.]

---

## Pitfalls and Mitigations

> Phase-1-specific items from research/PITFALLS.md.

### P1: Vazamento cross-tenant durante o retrofit `[CRITICAL]`

**Mitigation in Phase 1:**
- All new tables (`company_groups`, `org_units`, `socio_company_memberships`, etc.) ship with `ENABLE ROW LEVEL SECURITY` + explicit policies in the SAME migration that creates them — **NEVER a default-allow gap**.
- All RLS rewrites go through `visible_companies()`/`visible_org_units()` helpers — no inline `EXISTS` joins.
- Cross-tenant pgTAP test (above) is the gate. CI MUST run it on every PR.
- Two-tenant smoke fixture in pgTAP setup (`socio_a` vs `socio_b`) — kept as eternal regression test.

### P3: RLS recursion infinita

**Mitigation:**
- All helpers are `STABLE SECURITY DEFINER SET search_path = public` — `SECURITY DEFINER` bypasses RLS on `user_roles`, `org_unit_members`, `unit_leaders` lookups, eliminating recursive policy evaluation.
- No policy on `socio_company_memberships` references `companies` (avoid the loop).
- Audit step: `EXPLAIN (ANALYZE, BUFFERS)` on a sample query through the new policies — verify `InitPlan` shows up once per statement, not per row. Document this in PR description.

### P4: Cache pollution na troca de scope

**Mitigation:**
- `useScopedQuery` is the chokepoint — every key starts with `['scope', scope.id, ...]`.
- ESLint rule `no-supabase-from-outside-hooks` makes raw `supabase.from()` outside hooks a build error from PR 1.
- `@tanstack/eslint-plugin-query exhaustive-deps` catches missing deps in `queryFn` (won't catch missing scope, but catches missing variables that would cause inconsistent keys).
- Never `removeQueries` on switch — natural queryKey change + gcTime preserves old scope's cache (D-04).

### P6: Org_units performance sem índice

**Mitigation:**
- `idx_org_units_company_parent` (on `company_id, parent_id`) and `idx_org_units_parent` (partial, parent_id != NULL) — both in Migration B.
- Recursive CTE has `WHERE depth < 20` termination guard.
- pgTAP test: insert synthetic 500-node tree, time `org_unit_descendants(root_id)` — must be < 50ms.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cross-tenant scoping in app code | Manual `if (user.role === 'admin') ...` chains | RLS helpers + CASL conditions | Hand-rolled scoping forgets edge cases (RH viewing company A from URL B), creates 50+ scattered checks. RLS is the single source of truth. |
| Tree traversal | Recursive JS in browser | Postgres recursive CTE in `org_unit_descendants(id)` | Server-side: one round-trip; client-side: N round-trips. Browser does the wrong work. |
| Form dirty state detection | Custom event bus | `react-hook-form` `formState.isDirty` + a small registry hook | RHF already tracks per-field dirty; we just observe it. |
| URL scope parsing | Custom URL parser | `react-router-dom` v6 `useSearchParams()` | Already in stack; React-aware. |
| Permission rules | `if/else` in every component | CASL `defineAbility` + `<Can>` | Single ability builder = one place to audit; condition objects (`{ company_id: { $in: [...] } }`) compose with backend conditions. |
| Cross-tab state sync | Window storage event polling | `BroadcastChannel('leverup:scope')` with storage-event fallback | Native API, no library, 1-line broadcast. |
| Lockfile choice | Manual back-and-forth | `npm` (already canonical) | Existing CI/Dockerfile use npm; bun.lockb is just debt. |
| Date timezone formatting | `new Date(x).toLocaleString('pt-BR')` | `date-fns-tz formatInTimeZone` | toLocaleString depends on user's browser timezone — breaks for users abroad. |
| RLS testing | Mock supabase-js in Vitest | pgTAP + supabase-test-helpers | Mocks pass when RLS is broken. pgTAP runs the real policy in a real Postgres in a transaction that auto-rollback. |
| Default scope resolution per role | Client-side decision tree | RPC `resolve_default_scope(uid)` | Server has cheapest access to `user_roles + memberships`; one round-trip; no flash. |
| ESLint custom rule scaffolding | Roll a plugin npm package | Inline plugin in `eslint.config.js` (flat config) | The rule lives in 30 lines. No publish necessary. |

**Key insight:** Phase 1 is mostly *plumbing* — wiring established patterns from Supabase + CASL + Zustand + TanStack Query into a coherent shape. Hand-rolling any of the above replaces a battle-tested primitive with brittle home-grown code.

---

## Common Pitfalls

### Pitfall 1: ScopeProvider mounted outside `<BrowserRouter>`

**What goes wrong:** `useSearchParams()` throws `useSearchParams must be used inside a Router context`.
**Why:** Hooks like `useSearchParams` need access to the React Router context.
**How to avoid:** In `App.tsx`, place `<ScopeProvider>` **inside** `<BrowserRouter>` — wrap the `<Routes>` block, NOT the entire `<QueryClientProvider>`. Composition order: `QueryClientProvider > BrowserRouter > ScopeProvider > AbilityProvider > Routes`.
**Warning signs:** "Cannot read property 'pathname' of undefined" at boot.

### Pitfall 2: AbilityContext not rebuilding when memberships change

**What goes wrong:** Admin grants RH a new sócio membership; sócio still sees old company list.
**Why:** CASL ability is built once with `useMemo`; `visibleCompanies` is a Zustand state that updates, but if the dependency array misses a change source the memo stales.
**How to avoid:** `useMemo([user?.id, userRole, visibleCompanies, visibleOrgUnitIds, ledOrgUnitIds, ownOrgUnitIds])`. Better: rebuild on every `useScopedQuery` invalidation that touches scope-relevant tables. Phase 2/3 will refine; Phase 1 ships the basic version with TODO marker.
**Warning signs:** "Por que ainda vejo Empresa X?" complaints from a sócio after an RH change.

### Pitfall 3: BroadcastChannel not supported in older Safari (< 15.4)

**What goes wrong:** Cross-tab sync fails silently.
**Why:** BroadcastChannel landed in Safari 15.4 (Mar 2022); older mobile users may miss out.
**How to avoid:** Feature-detect (`'BroadcastChannel' in window`) and fall back to `window.addEventListener('storage', ...)` reading the Zustand persist key.
**Warning signs:** Cross-tab tests pass on Chrome/FF but fail on iOS Safari < 15.4.

### Pitfall 4: `resolve_default_scope` returning NULL → infinite loading state

**What goes wrong:** Sócio without membership: RPC returns NULL; ScopeProvider sets `scope = null`; pages query with `enabled: !!scope` and never load — app shows blank.
**Why:** The `!!scope` guard is correct; the empty state must be triggered explicitly.
**How to avoid:** ScopeProvider exposes `isResolving` and `scope`; once `isResolving === false && scope === null`, render the empty state component (D-09) at the route level. Not a global overlay.
**Warning signs:** Sócio reports "fica carregando para sempre" — fix is render the empty state, not the loading state.

### Pitfall 5: pgTAP test that succeeds because RLS isn't enabled

**What goes wrong:** Cross-tenant test passes because the table never had RLS turned on (default Postgres behavior) — false negative.
**Why:** `ENABLE ROW LEVEL SECURITY` must be explicit; Postgres doesn't enable it by default.
**How to avoid:** Add a meta-test:
```sql
select results_eq(
  $$select tablename from pg_tables t
    join pg_class c on c.relname = t.tablename
    where t.schemaname = 'public'
      and t.tablename in ('company_groups','org_units','org_unit_members','unit_leaders','socio_company_memberships')
      and c.relrowsecurity = false$$,
  array[]::text[],
  'all new tenancy tables have RLS enabled'
);
```
**Warning signs:** A new table you'd expect RLS to gate is silently world-readable.

### Pitfall 6: Migration B's `'liderado'` enum addition rolls back Migration A

**What goes wrong:** `ALTER TYPE app_role ADD VALUE 'liderado'` cannot run inside a transaction; if migration B is one big BEGIN/COMMIT, this errors and the entire B fails — leaving A in place but `'liderado'` not added.
**Why:** Postgres limitation on enum mutation in transactions.
**How to avoid:** Either run the enum addition in a SEPARATE small migration BEFORE Migration B, OR split B into two files (`B-prep_alter_app_role.sql` and `B-create_org_units.sql`). Test by `supabase db reset && supabase db push` and verify both apply cleanly.
**Warning signs:** `ALTER TYPE ... ADD cannot run inside a transaction block` error during migration deploy.

### Pitfall 7: `isDirty` stays `true` after successful save

**What goes wrong:** User saves form; switches scope; dialog asks to discard — but there's nothing to discard.
**Why:** `react-hook-form` doesn't auto-reset `isDirty` after submit; you need `reset(submittedValues)` after success.
**How to avoid:** In every form's `onSuccess` handler, call `form.reset(form.getValues())` to mark all fields as the new "clean" baseline.
**Warning signs:** User reports "ficou pedindo confirmação mesmo depois de eu salvar".

---

## Code Examples

### Example: Header.tsx integration

```tsx
// src/components/Header.tsx (edited section)
import { ScopeSwitch } from '@/features/tenancy/components/ScopeSwitch';

// ... existing imports

export function Header({ onToggleSidebar }: HeaderProps) {
  // ... existing logic

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-bg/95 backdrop-blur h-[42px] shrink-0">
      <div className="flex h-full items-center justify-between px-3.5 gap-3">
        {/* left cluster — breadcrumbs (unchanged) */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {/* ... */}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* NEW: scope switcher, BEFORE PendingTasksDropdown per UI-SPEC.md */}
          <ScopeSwitch />
          <PendingTasksDropdown />
          <Btn variant="secondary" size="sm" /* ... */>Criar</Btn>
        </div>
      </div>
    </header>
  );
}
```

### Example: App.tsx provider mount

```tsx
// src/App.tsx (edited)
const App = () => {
  const { user, loading, userRole } = useAuth();
  const isAuthenticated = !!user;

  if (loading) return <LoadingScreen />;

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <ErrorBoundary>
          <BrowserRouter>
            {isAuthenticated ? (
              <ScopeProvider>
                <AbilityProvider>
                  <Routes>{/* ... existing routes ... */}</Routes>
                </AbilityProvider>
              </ScopeProvider>
            ) : (
              <Routes>{/* unauthenticated routes */}</Routes>
            )}
          </BrowserRouter>
        </ErrorBoundary>
      </TooltipProvider>
    </QueryClientProvider>
  );
};
```

### Example: Dirty form registry hook

```typescript
// src/features/tenancy/hooks/useDirtyForms.ts
import { create } from 'zustand';

interface DirtyFormsStore {
  dirtyForms: Set<string>;
  register: (id: string) => void;
  unregister: (id: string) => void;
  hasAnyDirty: () => boolean;
}

export const useDirtyForms = create<DirtyFormsStore>((set, get) => ({
  dirtyForms: new Set(),
  register: (id) => set((s) => {
    const next = new Set(s.dirtyForms);
    next.add(id);
    return { dirtyForms: next };
  }),
  unregister: (id) => set((s) => {
    const next = new Set(s.dirtyForms);
    next.delete(id);
    return { dirtyForms: next };
  }),
  hasAnyDirty: () => get().dirtyForms.size > 0,
}));

// Each form component opt-in:
// const { register, unregister } = useDirtyForms();
// useEffect(() => {
//   if (form.formState.isDirty) register(formId);
//   else unregister(formId);
//   return () => unregister(formId);
// }, [form.formState.isDirty]);
```

`ScopeSwitch.setScope()` consults `useDirtyForms.getState().hasAnyDirty()` BEFORE applying the change; if dirty, opens the confirm dialog.

---

## Runtime State Inventory

> Phase 1 is greenfield in tenancy schema (additive only) but DOES interact with existing runtime state. This audit lists what is NOT in git but matters at runtime.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| **Stored data** | `companies` table has 7 internal companies (per memory & PROJECT.md). `user_roles` has admin/socio/lider/colaborador rows for ~25 dev/test users. `team_members` has team→user→leader_id mappings that need mirroring to `org_unit_members`/`unit_leaders`. | **Backfill in Migration C** (idempotent); Phase 1 ships placeholder names, owner confirms in PR review. Existing `user_roles` `'colaborador'` rows continue to work — Migration B adds `'liderado'` as a co-existing value. |
| **Live service config** | Supabase project `ehbxpbeijofxtsbezwxd` has live RLS policies, Edge Functions, scheduled jobs (pg_cron), Auth users with sessions in localStorage. `supabase/config.toml` still references OLD project `wrbrbhuhsaaupqsimkqz` (memory `project_supabase_migration.md`). | **Fix `supabase/config.toml` project_id** in Migration D. Edge Functions don't change. Pg_cron jobs don't change. |
| **OS-registered state** | None. Pure SaaS — no Windows tasks, launchd, systemd, etc. | None |
| **Secrets/env vars** | `.env` and `.env.example` reference `VITE_SUPABASE_PROJECT_ID="ehbxpbeijofxtsbezwxd"` — already migrated. No env var renames. | None |
| **Build artifacts** | `bun.lockb` (legacy lockfile) — must be deleted. `node_modules` rebuilds from `package-lock.json`. Generated `src/integrations/supabase/types.ts` (8824 lines) needs regen via `supabase gen types typescript` after Migrations A/B/C apply. | **Drop `bun.lockb` (QUAL-05)**. **Regen `types.ts`** after each migration. |
| **Localstorage keys** | Existing: Supabase auth tokens, `lt:viewAsRole` (admin view-as), various per-feature collapses. NEW: `leverup:scope` (Zustand persist). | New key namespace `leverup:scope` chosen specifically to avoid collision with `lt:*` (existing) and Supabase auth keys (which use UUID-prefixed keys). |
| **Active TanStack Query cache** | At runtime, ~25 distinct queryKeys without scope prefix exist (per codebase grep). | Phase 1 introduces `useScopedQuery`; Phase 2/3 migrate the 25 hooks. ESLint rule prevents NEW violations from PR 1 of Phase 1. |

**Critical:** Phase 1 backfill (Migration C) MUST run AFTER Migration B (org_units exist) to mirror teams. The teams→org_units mirror **preserves the `team.id` as `org_unit.id`** so existing FKs that point to `teams.id` still resolve through `org_units.id`. Phase 4 (Migration G) drops `teams` after confirming zero readers.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Supabase CLI | Migration apply, type gen, pgTAP runner | ✓ (assumed installed locally) | latest | Docs link if missing |
| Node 18+ | Vite, Vitest | ✓ | 18+ | — |
| `npm` | Install + CI | ✓ | 9+ | — |
| Postgres 15 | Supabase managed DB | ✓ (Supabase project `ehbxpbeijofxtsbezwxd`) | 15.x | — |
| pgTAP extension | RLS testing | ✓ (auto-installed by Supabase test runner) | 1.3 | — |
| `basejump-supabase_test_helpers` | RLS testing | Installed via `supabase-dbdev` in setup file | 0.0.6 | — |

**Missing dependencies with no fallback:** None for Phase 1. All blockers are owner-decision items (e.g., 7 internal company names) which are content, not tools.

---

## Security Domain

> Required per `security_enforcement: true` (default).

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes (existing — not Phase 1 scope) | Supabase Auth (existing); Phase 3 will add password policy + first-login flow |
| V3 Session Management | yes (existing) | Supabase auth-helpers in `client.ts` — JWT in localStorage |
| V4 Access Control | **YES (CRITICAL — this phase)** | RLS helpers + CASL — both layers covered in this phase |
| V5 Input Validation | partial (existing — not Phase 1 scope) | Zod 3.25 + react-hook-form (existing); Phase 1 doesn't add new input surfaces |
| V6 Cryptography | no | Postgres + Supabase Auth handle (no Phase 1 hand-rolling) |
| V7 Error Handling | yes | `formatSupabaseError` already maps `42501` to friendly Portuguese; Phase 1 adds `[RLS]` prefix already there + `logger.ts` for PII-safe error capture |
| V8 Data Protection | yes (LGPD) | Phase 1 adds `logger.ts` PII scrubbing (AUTH-04, AUTH-05); full data_access_log is Phase 2 (TAL-05) |
| V9 Communications | no (Supabase HTTPS managed) | — |
| V10 Malicious Code | no | — |
| V11 Business Logic | yes | RLS policies enforce business rules (sócio sees only own memberships, líder sees only org_unit subtree) |
| V12 Files | no | — |
| V13 API | yes | Supabase REST is the API; RLS is the gate |
| V14 Configuration | yes | `SET search_path = public` on every SECURITY DEFINER fn; `ENABLE ROW LEVEL SECURITY` on every new table |

### Known Threat Patterns for Supabase + React multi-tenant

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Direct REST call bypassing UI scope (curl with JWT) | Tampering / Information Disclosure | RLS helper functions enforce scope at DB; frontend filtering is purely UX |
| Session hijack / forged JWT | Spoofing | Supabase Auth signs JWT with project secret; we don't override |
| Modify `localStorage` to fake scope | Tampering | Scope in storage is informational only; RLS denies access regardless |
| User in `raw_user_meta_data` claiming admin role | Elevation of Privilege | We use `user_roles` table (not metadata); `has_role()` SECURITY DEFINER queries it bypassing user-controlled metadata |
| Console / Sentry leaks PII | Information Disclosure (LGPD) | `logger.ts` strips email/CPF/full_name in PROD; Sentry beforeSend in Phase 4 |
| Broken `(SELECT auth.uid())` wrap → per-row eval → DDoS | DoS | RBAC-10 audit step verifies all policies wrap auth.uid; pgTAP performance test gates merging |
| RLS infinite recursion (P3) | DoS | All scope helpers `SECURITY DEFINER` skip RLS on lookup tables |
| Anti-cycle bypass via concurrent inserts | Tampering | BEFORE INSERT trigger walks parent chain — atomic per-row; any race results in trigger raising on the second row |

---

## Requirements Coverage Map

| REQ-ID | Section that addresses it |
|--------|---------------------------|
| TEN-01 | Phase Requirements table; Migration A (no-op + comment) |
| TEN-02 | Migration A (ALTER TABLE companies ADD performance_enabled, rs_enabled) |
| TEN-03 | Migration A (CREATE TABLE company_groups + group_id) |
| TEN-04 | Migration C backfill (Grupo Lever + 7 empresas — TODO placeholder for owner names) |
| TEN-05 | Component Inventory (ScopeSwitch); UI-SPEC.md sections 1-2 |
| TEN-06 | Pattern 3 (useScopedQuery chokepoint); P4 mitigation |
| TEN-07 | resolveScope() expansion of group → companyIds[]; visible_companies in Migration C |
| TEN-08 | ScopeProvider Zustand persist with name `leverup:scope` |
| TEN-09 | ScopeProvider URL sync via useSearchParams; scopeKey.ts parser |
| TEN-10 | TanStack Query partial-key invalidation pattern (verified in research) |
| RBAC-01 | Migration B prep step `ALTER TYPE app_role ADD VALUE 'liderado'` (open question Q1) |
| RBAC-02 | visible_companies admin path = all companies; CASL admin = manage all |
| RBAC-03 | visible_companies rh path = all companies; CASL rh = manage Company..ClimateSurvey, NOT Platform |
| RBAC-04 | Migration C creates socio_company_memberships; visible_companies sócio path |
| RBAC-05 | visible_org_units lider path uses org_unit_descendants for transitive |
| RBAC-06 | visible_org_units liderado path = own units; CASL liderado scope |
| RBAC-07 | UI-SPEC.md D-03 (trigger ESPELHA badge) |
| RBAC-08 | Pattern 4 (CASL defineAbility for 5 roles + `<Can>`) |
| RBAC-09 | Pattern 1 (3 SECURITY DEFINER helpers) |
| RBAC-10 | Audit step in Migration C — rewrite all 12 hiring policies to use `(SELECT auth.uid())` |
| ORG-01 | Migration B (org_units schema) |
| ORG-02 | Migration B (parent_id self-ref + same-company-as-parent trigger) |
| ORG-03 | Migration B (anti-cycle trigger `tg_org_units_no_cycle`) |
| ORG-04 | Migration B (org_unit_members table) |
| ORG-05 | Migration B (unit_leaders table) |
| ORG-06 | Migration B (org_unit_descendants recursive CTE function) |
| ORG-07 | visible_org_units lider path uses org_unit_descendants — transitive |
| ORG-08 | Component Inventory: OrgUnitTree component + new page route /empresas/:id/estrutura (open question Q3) |
| ORG-09 | Migration C teams→org_units mirror; teams stays read-only until Phase 4 |
| AUTH-04 | Quality Gates Gate 4 (`logger.ts` PII scrubbing) |
| AUTH-05 | Same as AUTH-04 — wrapper used in new code; existing `console.*` audit deferred to Phase 4 |
| QUAL-05 | Quality Gates Gate 1 (drop bun.lockb) |
| QUAL-07 | Quality Gates Gate 2 (custom ESLint rule + allowlist) |
| QUAL-08 | Quality Gates Gate 3 (`@tanstack/eslint-plugin-query` flat/recommended) |
| QUAL-10 | Quality Gates Gate 5 (`formatBR` util in src/lib/formatBR.ts) |

**All 36 phase requirements covered.**

---

## Project Constraints (from CLAUDE.md)

> Extracted directives the planner MUST honor:

- **Stack locked:** Vite 5 + React 18 + TS 5.8 + Supabase (`ehbxpbeijofxtsbezwxd`) + shadcn/Radix/Tailwind + Linear primitives
- **Brand primitive:** `LeverArrow` only — NEVER Lucide ArrowX or font-display custom (the scope selector uses `Building2`/`Layers` glyphs, NOT LeverArrow)
- **Package manager:** `npm` is canonical; `bun.lockb` is debt to remove in Phase 1
- **DO NOT upgrade Zod 3 → 4** (incompatibility with `@hookform/resolvers` 5.2.2)
- **`supabase.from()` only in `src/hooks/` or `src/integrations/`** — to be enforced by ESLint custom rule in Phase 1
- **queryKey ALWAYS includes `scope.id`** — to be enforced by `@tanstack/eslint-plugin-query` + `useScopedQuery` chokepoint
- **Forms use `react-hook-form` 7.73 + `@hookform/resolvers` 5.2.2 + Zod 3.25 (no `as any` casts)**
- **Components > 800 lines are debt — break when touched.** Phase 1 touches few; deferred to Phase 2-3.
- **No PII in `console.log` in production** — Phase 1 ships `logger.ts`
- **Onboarding via WhatsApp** (Phase 3) — not Phase 1's concern
- **Critério de done:** *fluxos principais sem erro + dados batendo por escopo de empresa (ou grupo)*

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The 7 internal companies have specific names (Lever Consult, Lever Outsourcing, etc.) | Migration C backfill | If wrong, the `UPDATE companies SET group_id` matches zero rows; backfill silently completes with no associations. Mitigation: TODO marker + owner confirms names in PR review. |
| A2 | Existing `app_role` enum can have `'liderado'` added via `ALTER TYPE ADD VALUE` | Migration B prep | If Postgres rejects (older versions), need a workaround migration. Supabase 15+ supports this without transactions. |
| A3 | All 25 dev users currently have role `'colaborador'` will be re-classified later | Migration B | Phase 1 doesn't auto-migrate; co-existence path keeps both `'colaborador'` and `'liderado'` valid. |
| A4 | Existing 12 hiring RLS policies are amenable to mechanical rewrite from `allowed_companies` to `visible_companies` | Migration C | Behavior should be 100% identical for RH (both = all companies); only sócio + líder paths differ. pgTAP regression test catches drift. |
| A5 | The kanban / hiring code does NOT depend on `teams.id` directly — uses FKs through `team_members` | Migration C teams→org_units mirror | The mirror preserves `team.id` as `org_unit.id`, so any code that looks up by id still works. Risk: if some code does `SELECT * FROM teams JOIN ... ON teams.name = ...` it breaks; verified by codebase grep that no such pattern exists. |
| A6 | BroadcastChannel is acceptable for cross-tab sync; iOS Safari < 15.4 minority | useScopeBroadcast | If owner has older iPhone users, fallback `storage` event covers them. |
| A7 | Sócio members can have ZERO entries in Phase 1 (RH fills via UI later) | Migration C | If owner expects backfill of sócio↔empresa relations now, Phase 1 must accept those. Currently empty; `socio_company_memberships` table is created but not populated. |
| A8 | The `useDirtyForms` global registry pattern is acceptable (vs. per-route detection) | Pattern 4 / DirtyFormConfirmDialog | If multiple forms across routes simultaneously have isDirty, scope switch confirms once; that matches user expectation per CONTEXT.md D-05 wording. |

**These assumptions need owner confirmation before execution:** A1 (the 7 names), A7 (sócio membership scope for Phase 1).

---

## Open Questions

> Items the planner needs to decide or owner needs to clarify.

### Q1: `liderado` vs `colaborador` enum value (RBAC-01)

**What we know:** Codebase enum `app_role` has `socio, lider, rh, colaborador` + `admin` added later. REQUIREMENTS.md says Phase 1 has 5 roles: `admin, rh, socio, lider, liderado`.
**What's unclear:** Is `liderado` a RENAME of `colaborador` or a NEW value? CONTEXT.md says "5 roles fixos" — implies liderado replaces colaborador.
**Recommendation:**
- **Phase 1:** Add `'liderado'` as a NEW value (co-exists with `'colaborador'`). Treat both as synonymous in CASL + helpers (`OR has_role(uid, 'colaborador')`).
- **Phase 4 (Migration G):** Rename `colaborador → liderado` and update all `user_roles` rows.
- This avoids forcing a data migration in Phase 1.

### Q2: Backfill — confirmar nomes das 7 empresas internas (TEN-04)

**What we know:** ROADMAP.md says "7 empresas internas". PROJECT.md mentions Grupo Lever operates these. No file lists them.
**What's unclear:** Owner needs to provide the 7 names (or a SELECT criterion like "all companies created before 2026-01-01").
**Recommendation:** Planner inserts placeholder names + clear `TODO(owner-confirmation)` comment in Migration C; owner approves the list in PR review BEFORE deploy. If owner can't list 7 names, fall back to "RH UI marks each company manually" (the panel in CompanyDrawer).

### Q3: ORG-08 UI scope — full management page vs. minimal CRUD

**What we know:** ORG-08 says "UI de gestão da estrutura permite criar/renomear/mover/excluir org_units e atribuir líderes/membros".
**What's unclear:** Phase 1 entrega tela completa OU apenas as APIs + um placeholder UI?
**Recommendation:** Phase 1 ships:
- Full functional CRUD for org_units (create/rename/delete + drag-to-reparent)
- Simple "atribuir líder/membro" via Combobox lookup (no advanced search)
- Located at new route `/empresas/:id/estrutura` (linked from existing `/empresas` page)
- Tree visualization is `react-arborist` (NOT installed yet — defer to a small follow-up if owner wants polish; Phase 1 ships an indented `<ul>`-based tree which is simpler)
- **Defer:** bulk operations, history/audit log, advanced search → Phase 4 polish

### Q4: ESLint rule allowlist — block from PR 1 or warn-then-error?

**What we know:** CONTEXT.md `Quality gates rollout` says "ESLint regra como `error` desde o primeiro PR de Phase 1". Codebase has 16 violations.
**What's unclear:** Should the allowlist of 16 files pass linting (with `// eslint-disable-next-line lever/no-supabase-from-outside-hooks` per file) OR should the rule be `warn` for legacy and `error` for new files?
**Recommendation:** **Hard `error` from PR 1 + an explicit `PHASE_1_LEGACY_ALLOWLIST` array in the rule itself** (already shown in Quality Gates Gate 2). Each entry has a `TODO(#issue)` comment. Issues filed in tracker. Phase 2-3 close them by moving the calls to hooks. New files added during Phase 1 MUST not appear in the allowlist.

### Q5: Cross-tab sync — first iteration or follow-up?

**What we know:** CONTEXT.md "Mini-decisões do seletor não exploradas" lists cross-tab as planner-decides.
**What's unclear:** Ship in PR 1 or as a follow-up post-Phase-1 stability?
**Recommendation:** **Ship in first iteration** — it's 30 lines (`useScopeBroadcast` hook), uses native `BroadcastChannel`, falls back to `storage` event. Owner explicitly mentioned multi-tab usage matters for RH workflows. No reason to defer.

### Q6: Sentry installation — Phase 1 or Phase 4?

**What we know:** ROADMAP says Sentry is Phase 4 (QUAL-06). CONTEXT.md is silent on whether to install the package now.
**What's unclear:** Should `npm install @sentry/react` happen in Phase 1 (to avoid breaking changes between phases) or strictly in Phase 4?
**Recommendation:** **Install in Phase 1 (no `Sentry.init()` call yet)** — adding the package now means Phase 4 only has to wire the config. Lockfile tracks one less version. No runtime impact.

---

## Sources

### Primary (HIGH confidence)
- `/stalniy/casl` Context7 — `defineAbility`, `<Can>`, `useAbility`, MongoDB conditions, multi-tenant patterns
- `/pmndrs/zustand` Context7 — `persist` middleware with `name`, `version`, `partialize`, `createJSONStorage`
- [Supabase RLS Performance and Best Practices](https://supabase.com/docs/guides/database/postgres/row-level-security) — `(SELECT auth.uid())` initPlan caching (94.97-99.991% verified improvements)
- [TanStack Query v5 Query Invalidation](https://tanstack.com/query/v5/docs/framework/react/guides/query-invalidation) — partial-key matching with `exact: false` default
- [Supabase pgTAP Extended Testing](https://supabase.com/docs/guides/local-development/testing/pgtap-extended) — supabase-test-helpers 0.0.6, `tests.authenticate_as`, cross-tenant pattern
- [supabase-test-helpers GitHub](https://github.com/usebasejump/supabase-test-helpers) — RLS testing helpers reference
- [ESLint custom rules — flat config](https://eslint.org/docs/latest/extend/custom-rules) — `CallExpression > MemberExpression` selector + `context.filename` pattern
- npm registry queries (2026-04-27) — verified versions for all 8 new dependencies

### Secondary (MEDIUM confidence)
- `.planning/research/SUMMARY.md` — 4-stream synthesis
- `.planning/research/ARCHITECTURE.md` — full architecture deep-dive
- `.planning/research/PITFALLS.md` — 10 critical pitfalls
- `.planning/research/STACK.md` — verified versions + Zod 4 incompatibility (research/STACK.md cites GitHub issues #813, #842)

### Tertiary (codebase verified)
- `src/lib/hiring/rlsScope.ts` — existing helper precedent
- `supabase/migrations/20260416193100_hiring_rls_policies.sql` — existing `allowed_companies` helper
- `supabase/migrations/20260422130000_align_admin_role_policies.sql` — existing `is_people_manager` helper
- `supabase/migrations/20251009193314_*` — base schema with `app_role` enum, `companies`, `teams`, `team_members`
- `src/hooks/useAuth.ts` — existing `view-as` mechanism (preserve)
- `src/hooks/hiring/useApplications.ts` — existing query key pattern (`applicationsKeys.byJob(jobId)`)
- `src/components/Header.tsx` — existing header structure (where `ScopeSwitch` mounts)
- `src/components/Layout.tsx` — existing layout (no change needed)
- `src/App.tsx` — existing provider composition (where new providers mount)
- `eslint.config.js` — existing flat config (where custom rule wires in)
- `package.json` — existing deps (no Zod 4, no Vitest yet)
- Codebase grep: 16 `supabase.from()` calls outside hooks (informs ESLint allowlist)
- Codebase grep: 173 `queryKey:` declarations (informs Phase 2-3 migration scope)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions verified npm 2026-04-27; Zod 4 incompatibility confirmed.
- RLS architecture: HIGH — Supabase docs official + codebase precedent + pgTAP test pattern verified.
- Scope propagation: HIGH — Zustand 5 persist + TanStack v5 partial-key invalidation both documented.
- CASL setup: HIGH — Context7 docs cover defineAbility + Can + useAbility + MongoDB conditions explicitly.
- ESLint custom rule: MEDIUM-HIGH — flat config inline plugin pattern documented; `CallExpression > MemberExpression[object.name='supabase'][property.name='from']` selector confirmed in ESLint AST docs but not exhaustively tested in this session — recommend a quick smoke test in PR 1.
- pgTAP cross-tenant: HIGH — supabase-test-helpers official docs + complete examples.
- Backfill strategy: MEDIUM — depends on owner-supplied names (A1, A7) which are open questions.
- Migration A/B/C ordering: HIGH — strictly sequential per Supabase CLI conventions; rollback paths documented.

**Research date:** 2026-04-27
**Valid until:** 2026-05-27 (30 days for stable Supabase + React patterns; sooner if Zod 4 ships a clean resolvers integration or Supabase changes RLS performance idiom)

---

*Phase 1: Tenancy Backbone research complete*
*Researched by gsd-phase-researcher on 2026-04-27*
