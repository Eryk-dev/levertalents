# Stack Research

**Domain:** Brazilian HR/People SaaS (Performance Management + ATS) — multi-tenant on Supabase + React
**Researched:** 2026-04-27
**Confidence:** HIGH (versions from npm/Context7 as of search date; rationale grounded in official docs and verified ecosystem patterns)

## Scope of This Document

The application stack is **locked**: Vite + React 18 + TypeScript 5.8 + Supabase (Postgres + Auth + Realtime + Storage) + shadcn/ui + Tailwind. We are NOT migrating off it.

This research recommends **supplementary libraries and patterns** to add to that base for the active refactor:

- Multi-tenant scoping (companies + company_groups via RLS)
- RBAC layer in the UI that mirrors RLS
- Hierarchical org_units (adjacency-list tree, leader-sees-descendants)
- Test framework bootstrap (zero tests today)
- Forms at scale (forms are the single largest category of code in a HR SaaS)
- Observability with LGPD-aware data scrubbing
- Brazilian/PT-BR locale concerns

Items marked **already in stack** are listed only when an action is implied (upgrade, config change, or pattern shift).

---

## Recommended Stack — Additions and Refinements

### Core Decisions (already in stack — confirmation only)

| Technology | Version | Status | Why Confirmed |
|------------|---------|--------|---------------|
| `@supabase/supabase-js` | 2.75.0 → 2.x latest | Keep, follow minor releases | Project on 2.75.0; current 2.x line is stable, RLS-aware, type-aware. No reason to migrate. Generated types via `supabase gen types typescript` are the right end-to-end TS bridge. |
| `react-hook-form` | 7.61.1 → upgrade to **7.73.x** | Minor upgrade | RHF 7.73.1 is current stable (Apr 2026). Performant, uncontrolled-by-default, minimal re-renders — ideal for the form-heavy UI we have. |
| `zod` | 3.25.76 → **stay on Zod 3.x for now** | **DO NOT auto-upgrade to Zod 4** | Zod 4 + `@hookform/resolvers` 5.x has known type-overload issues (resolver typed against Zod 4.0.x literal but Zod 4.3.x breaks the match). Workaround `import { z } from 'zod/v3'` exists but is brittle. Stay on 3.25.x until resolvers ships a clean Zod 4 release. (Issue #813, #842 in `react-hook-form/resolvers`.) |
| `@hookform/resolvers` | 3.10.0 → **5.2.2** | Upgrade | v5 is the V2 resolver API rewrite — cleaner types, broader validator support. Required to stay current with RHF 7.73. |
| `@tanstack/react-query` | 5.83.0 → 5.99.x latest | Patch upgrade | v5 is the right line. Patch upgrades carry bugfixes and the suspense-query stabilization. Add `@tanstack/eslint-plugin-query` (see Dev Tools below). |
| `recharts` | 2.15.4 → **3.x** when stable break is acceptable | Hold until refactor pause | Recharts 3 brings React 18 compat and improved TS, but for current "refactor without features" rule, stay on 2.15.4 to avoid scope creep. **Recharts is correct for HR SaaS dashboards** — 90% of charts are bar/line/pie, declarative JSX maps to shadcn/ui patterns. visx only if you ever need brushing/linked views (you do not, today). |
| `@dnd-kit/*` | 6.3.1 / 10.0.0 / 3.2.2 | Keep | Headless DnD is right for the kanban + PDI reorder. The kanban "mover candidato falha" bug is **unlikely to be a dnd-kit bug** — investigate React Query cache + Supabase optimistic update integration first. |

### NEW — Authorization Layer (UI-side mirror of RLS)

| Library | Version | Purpose | Why Recommended |
|---------|---------|---------|-----------------|
| `@casl/ability` | **6.8.0** | Define UI-level permission rules per user (action × subject × condition) | Industry-standard isomorphic authorization lib. MongoDB-style condition objects fit Supabase JWT claim shape (`company_id`, `org_unit_id`, `role`) cleanly. Conditions like `{ company_id: { $in: userCompanyIds } }` express the Sócio's N:N membership directly. Has a useful "incrementally adoptable" claim — start with `can('read', 'JobOpening')` and grow into condition rules. **303 code snippets in Context7, "Low" source reputation but 92.6 benchmark — well-documented in practice.** |
| `@casl/react` | **5.0.x** (matches @casl/ability 6.x line) | React bindings: `<Can />` component + `useAbility` hook | Drop-in for shadcn-style conditional rendering — `<Can I="update" this={candidate}>` reads naturally next to existing JSX. The `useAbility` hook re-renders on rule updates, which matches our needs after company-scope switch. |

**Why CASL over alternatives:**

- **vs. accesscontrol** — accesscontrol is role-based only; cannot express "Sócio sees companies he's a member of" without app-level filtering on top. CASL's conditions handle this.
- **vs. casbin** — casbin is policy-DSL based, heavier, more enterprise-y. CASL's MongoDB-condition shape is closer to what we already write in `.eq('company_id', x)` chains.
- **vs. roll-your-own role checks** — current `ProtectedRoute` `allowedRoles` array breaks down once we add sócio's N:N companies and líder's recursive descendants. CASL gives one centralized abilities builder; roll-your-own at this scale becomes 50+ scattered `if (role === ...)` branches.

**Boundary discipline:** CASL is **defense-in-depth for UI**, not a replacement for RLS. RLS is the security boundary. CASL is the UX boundary (hide buttons users can't use, show actionable error messages instead of "permission denied" toasts).

### NEW — Hierarchical Tree Queries (org_units)

| Approach | Implementation | Why |
|----------|---------------|-----|
| **Recursive CTE in Postgres** + Supabase RPC | `CREATE FUNCTION org_unit_descendants(unit_id uuid) RETURNS SETOF uuid LANGUAGE sql STABLE AS $$ WITH RECURSIVE descendants AS (SELECT id FROM org_units WHERE id = unit_id UNION ALL SELECT o.id FROM org_units o JOIN descendants d ON o.parent_id = d.id) SELECT id FROM descendants $$;` | Adjacency list (single `parent_id` column) + recursive CTE is the **default and correct choice** for dynamic, user-editable hierarchies. Postgres planner handles it efficiently. **Critical:** index `parent_id` (`CREATE INDEX idx_org_units_parent ON org_units(parent_id)`) — without it, recursion falls back to seq scan. Wrap as `STABLE` SQL function so it can be called from RLS and from supabase-js via `.rpc('org_unit_descendants', ...)`. |
| **NOT** nested sets | — | Faster for read-heavy + rare write trees. We expect hierarchies to be edited (RH adds/removes squads). Maintenance cost of nested sets defeats the purpose. |
| **NOT** materialized path | — | Adds a second column to keep in sync. Recursive CTE is fast enough at our scale (< 10k org_units per tenant) and avoids the sync invariant. |

**Library:** **None** — no React-side library needed for tree queries. Use plain Supabase RPC + React Query. For tree **rendering** (when needed: `/empresas/:id/estrutura`), shadcn's tree primitive built on Radix Collapsible covers it. If a heavier tree control is ever needed, evaluate `react-arborist` then — not now.

### NEW — Hierarchical State (Scope Selector)

| Library | Version | Purpose | Why Recommended |
|---------|---------|---------|-----------------|
| `zustand` | **5.0.10** | Single store for the global scope selector (selected `company_id` OR `group_id`, last-selected memoization, view-as-role for admin debugging) | The scope selector is **module-first cross-cutting state** — every page reads it, very few set it. That's Zustand's sweet spot. The `persist` middleware solves "lembra última seleção" with one `name: 'lever-scope'` config. Zustand 5.0.10 includes important persist-middleware fixes. |

**Why Zustand over alternatives:**

- **vs. React Context only** — Context re-renders all consumers on any change. Header scope selector touches 90% of the tree; Zustand's selector-based subscription (`useScopeStore(s => s.companyId)`) avoids that.
- **vs. Jotai** — Jotai's atom model is excellent for many small independent atoms (e.g. inline editor state). The scope selector is **one atomic concept** — Zustand's centralized store is closer to the mental model. Jotai's `createIsolation` for multi-tenant scope is over-engineering for a single global selector.
- **vs. Redux Toolkit** — too much ceremony for ~3 slices of state.

**Pattern (locked decision):**
```
zustand store (persisted)
  ├─ scope: { mode: 'company' | 'group', id: string }
  ├─ setScope(scope)
  └─ viewAsRole: Role | null  // admin override

React Query keys downstream include scope.id:
  ['jobOpenings', scope.id]
  ['evaluations', scope.id]
  → switching scope = automatic refetch + cache isolation
```

This is the **right boundary**: Zustand owns "what is selected"; React Query owns "what data does that selection produce". Do NOT put the scoped data itself in Zustand.

### NEW — Forms at Scale (refinements over what exists)

The stack already has `react-hook-form + zod + @hookform/resolvers`. The refinements are pattern-level:

| Addition | Purpose | Why |
|----------|---------|-----|
| **Schema-first parity (server + client)** — same Zod schema validates in Edge Functions | Single source of truth for shape | Edge Functions in Deno can `import { z } from 'npm:zod@3.25'`. The same `JobOpeningSchema` validates the form on submit AND validates the request body in `apply-to-job` Edge Function. Closes the LGPD-relevant gap of "client validates but server doesn't". |
| **Discriminated unions for stage-conditional fields** | Type-safe variant forms (kanban stage local config, evaluation cycle templates) | Zod's `z.discriminatedUnion('type', [...])` produces TS narrowing without boilerplate. Stages with optional extra fields per type benefit massively. |
| **Custom Portuguese error messages** via Zod `errorMap` (or `zod-i18n-map`) | LGPD/UX — error messages must be in PT-BR for all user-facing forms | `zod-i18n-map` already has PT-BR translations or accepts a contributed locale. Lighter touch: a single `errorMap` in `src/lib/zod-pt-br.ts` covering the ~20 validators we use. **Recommendation:** start with custom errorMap (zero deps), graduate to zod-i18n if/when we add other locales. |

**Anti-pattern to avoid:** writing `errorMap` per-schema. Define it once at app boot (`z.setErrorMap(ptBRErrorMap)`).

### NEW — Testing Stack (greenfield — zero tests today)

| Tool | Version | Purpose | Why |
|------|---------|---------|-----|
| `vitest` | **3.2.4** (stable) — NOT 4.0.7 yet | Test runner + assertion library | Zero-config alongside Vite. Reuses `vite.config.ts` plugins (SWC, path aliases) — no separate Jest config to maintain. **Stay on 3.2.x** until the v4 ecosystem (msw, RTL adapters) catches up. |
| `@testing-library/react` | **16.x** | Component test API | v16 is the current line for React 18. Note v16 requires explicitly installing `@testing-library/dom` as a peer dependency. |
| `@testing-library/dom` | **10.x** | Required peer of RTL 16 | Just install it. |
| `@testing-library/jest-dom` | **6.9.x** | Matchers (`toBeInTheDocument`, `toHaveValue`, etc.) | v6 removed `extend-expect`; use `import '@testing-library/jest-dom/vitest'` in setupFiles. |
| `@testing-library/user-event` | **14.x** | Realistic user interaction simulation | Always pair with RTL; default for click/type/select tests. |
| `jsdom` | **25.x** | DOM env for Vitest | Standard. Alternative `happy-dom` is faster but more divergent — jsdom is the safer default for first tests. |
| `msw` | **2.10.x** | Network-layer mocking for Supabase REST + Edge Functions | **Industry standard for API mocking in 2026.** Supabase REST URLs (`{url}/rest/v1/{table}`) intercept cleanly with MSW handlers. Realtime websocket mocking is harder — use injected fakes for those tests. |
| `@tanstack/eslint-plugin-query` | **5.99.x** | Lint missing query keys, exhaustive deps | Catches the #1 React Query bug class: forgetting a variable in queryKey. Critical with our scope.id pattern (every key must include scope.id). |

**Test category strategy (drives which tests we write first):**

| Layer | Tool | First tests to write |
|-------|------|---------------------|
| **RLS policies (DB)** | `pgTAP` + `supabase-test-helpers` (Basejump) | "Sócio sees only their assigned companies"; "Líder sees descendants"; "RH sees everything"; "Anonymous sees nothing." Run in CI against ephemeral Supabase via `supabase db reset`. |
| **Hooks / business logic** | Vitest (Node env) + MSW | `useScopedJobs(companyId)` returns scoped data; `usePermissions()` returns correct CASL ability per role. |
| **Components** | Vitest (jsdom) + RTL + MSW | `<KanbanBoard>` re-renders on scope change; `<JobForm>` shows PT-BR errors; `<ScopeSelector>` persists last selection. |
| **E2E (later)** | Playwright (deferred) | Out of scope for first pass — RLS tests + component tests cover the critical surface. |

**Why pgTAP for RLS:** RLS bugs are silent — query returns empty array, looks like "no data" not "permission denied". pgTAP runs inside Postgres, can `SET request.jwt.claims = ...` to simulate any user, asserts row counts in transactions that auto-rollback. This is the **only reliable way to test RLS**. SQL-only is fine; we don't need TS-side RLS tests.

### NEW — Observability (LGPD-aware)

| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| `@sentry/react` | **10.50.x** | Error tracking + performance + session replay | Industry standard. Replaces the current ad-hoc `console.warn` + `[RLS]` prefixed logs in `src/lib/supabaseError.ts` with proper grouping, release tracking, and source maps. |
| `@sentry/vite-plugin` | **2.x latest** | Source map upload at build time | Required to get readable stack traces from minified production bundles. Configure with `sourcemap: 'hidden'` in `vite.config.ts` so maps are uploaded but not served publicly. |

**LGPD/Brazil-specific configuration (HARD REQUIREMENT):**

```typescript
// src/lib/sentry.ts
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  release: import.meta.env.VITE_RELEASE,
  beforeSend(event, hint) {
    // 1. Strip user PII — name, email, CPF, phone — before send
    if (event.user) {
      event.user = { id: event.user.id }; // keep id only, drop email/username
    }
    // 2. Scrub request bodies that may contain candidate data
    if (event.request?.data) {
      event.request.data = redact(event.request.data, [
        'cpf', 'email', 'phone', 'fullName', 'birthDate', 'salary'
      ]);
    }
    // 3. Drop breadcrumbs containing 1:1 transcripts or evaluation answers
    event.breadcrumbs = event.breadcrumbs?.filter(
      b => !b.category?.includes('transcription') && !b.category?.includes('evaluation_answer')
    );
    return event;
  },
  // 4. Disable session replay for authenticated routes by default — opt-in only
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0.1, // sample replays only on errors
  // Mask all text + inputs in any replay that does fire
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      maskAllInputs: true,
      blockAllMedia: true,
    }),
  ],
});
```

**Why this matters under LGPD:** Article 37 requires Records of Processing Activities. Sending raw PII to Sentry creates a third-party processor relationship that requires its own data processing agreement and lawful-basis declaration. Scrubbing at `beforeSend` keeps Sentry as a "service provider for error diagnostics, no PII processed" — much cleaner audit story. Session replay default-off is the safest LGPD posture for a HR system that displays salaries, evaluation scores, and 1:1 transcripts.

### Supporting Libraries (situational)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@tanstack/react-virtual` | 3.x | Row virtualization | Only if list > 200 rows (candidate lists, large org_unit trees). Default rendering is fine below that. Headless model fits TanStack Table. |
| `@tanstack/react-table` | 8.x | Headless table logic | If/when we build a real candidate browse view with filters/sort/pagination. Today's ad-hoc tables don't need it. |
| `date-fns` (in stack) + `date-fns-tz` | latest | Timezone-aware formatting for `America/Sao_Paulo` | **Add `date-fns-tz` as soon as we display any timestamp.** All Postgres `timestamptz` arrives as UTC; rendering "08:00 SP" requires `formatInTimeZone(date, 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm')`. Avoid raw `toLocaleString()` — it depends on browser locale and breaks for users abroad. |
| `@supabase-cache-helpers/postgrest-react-query` | latest | Auto-derived query keys + auto-invalidation after mutations | **Tempting but skip for now.** It infers cache keys from queries — but we need explicit keys that include `scope.id`. Hand-rolled queryFns + manual invalidation are clearer for the multi-tenant case. Revisit if/when scope is fully encoded into supabase-js calls. |
| `pgTAP` + `supabase-test-helpers` (Basejump) | — | DB-level RLS tests | Required as soon as the RLS refactor begins. |
| `zod-i18n-map` | latest | Multi-locale Zod errors | Only if we add a second locale. PT-BR-only via custom `errorMap` is simpler. |

### Development Tools (additions to existing toolchain)

| Tool | Purpose | Notes |
|------|---------|-------|
| `@tanstack/eslint-plugin-query` 5.99.x | Catch bad query keys, missing deps in queryFn | Configure as flat config: `pluginQuery.configs['flat/recommended']`. Known ESLint v9 compat issue resolved in 5.62+. |
| `eslint-plugin-testing-library` | Catch RTL anti-patterns (e.g. `getByRole` over `getByTestId`) | Add when tests start landing. |
| `prettier` (currently absent) | Formatting | Project has none today (formatting is implicit IDE). For a refactor with multiple branches, add Prettier early to prevent diff noise. Use defaults; don't bikeshed. |
| `supabase` CLI | Local dev DB + type generation + Edge Function deploy | Already implied; pin version in `package.json` or `Dockerfile` to avoid drift. Use `supabase gen types typescript` in a `prebuild` script or GitHub Action. |
| `@playwright/test` | Reserved | Defer — not for this refactor. |

## Installation

```bash
# Authorization
npm install @casl/ability@^6.8.0 @casl/react@^5

# State
npm install zustand@^5.0.10

# Observability
npm install @sentry/react@^10.50.0
npm install -D @sentry/vite-plugin@^2

# Internationalization helper (timezone)
npm install date-fns-tz

# Form library upgrades (if not already current)
npm install react-hook-form@^7.73.1 @hookform/resolvers@^5.2.2
# DO NOT upgrade zod from 3.25.x to 4 yet — see compatibility note above

# Testing — devDependencies
npm install -D vitest@^3.2.4 \
  @vitejs/plugin-react@latest \
  jsdom@^25 \
  @testing-library/react@^16 \
  @testing-library/dom@^10 \
  @testing-library/jest-dom@^6.9 \
  @testing-library/user-event@^14 \
  msw@^2.10

# Lint
npm install -D @tanstack/eslint-plugin-query@^5.99 \
  eslint-plugin-testing-library \
  prettier
```

**Lockfile housekeeping (separate small task):** delete `bun.lockb`, keep `package-lock.json`, document `npm ci` as canonical install in README. The `Dockerfile` already uses `npm ci` so this just removes a footgun.

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| **CASL** for permissions | `accesscontrol` | If the model collapses to "role only, no per-tenant conditions". Not our case — Sócio's N:N memberships and Líder's hierarchical scope require conditions. |
| **CASL** for permissions | `casbin` | Larger orgs needing audit-grade policy DSL with formal verification needs. Overkill here. |
| **Zustand** for scope state | Jotai | If we end up with many small, independent scoped pieces (e.g. per-row inline editor state). The single global scope selector is Zustand-shaped. |
| **Zustand** for scope state | Pure React Context + `useReducer` | Acceptable for a one-component state, but the persist middleware + selector subscriptions Zustand gives are worth the 1.4kb. |
| **Recursive CTE** for org tree | Materialized path / `ltree` | If query latency on 10k+ unit trees becomes a measured bottleneck. Not today. |
| **MSW** for API mocking | `nock` / hand-rolled `vi.mock` of `supabase-js` | Hand-mocked supabase-js gets brittle (every chain method needs a mock). MSW intercepts at HTTP layer, decoupling from SDK shape. Use `vi.mock` only for non-HTTP boundaries (e.g. `Date.now`). |
| **pgTAP** for RLS tests | Application-level integration tests via supabase-js | App-level tests can't reset DB cheaply, can't simulate arbitrary users without creating real auth records. pgTAP transactions auto-rollback per test. |
| **Recharts** for dashboards | visx / Tremor / Chart.js | Pick visx if you ever need brushing, linked views, or animated transitions beyond Recharts defaults. Tremor (Tailwind-styled charts on top of Recharts) is cute but locks layout choices we already make in shadcn. |
| **Custom Zod errorMap (PT-BR)** | `zod-i18n-map` | Adopt zod-i18n-map only when adding a second locale (en-US for international clients?). |
| **TanStack Query manual keys** | `supabase-cache-helpers` | Use cache helpers if/when query patterns stabilize and the auto-derived keys provably reduce more bugs than they introduce. |
| **Vitest + RTL** | Jest + RTL | Jest is fine but adds a separate config, doesn't share Vite's transformer, slower. No reason to introduce Jest into a Vite project in 2026. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| **Zod 4** (today) | `@hookform/resolvers` 5.2.2 has TS overload mismatch with Zod 4.3.x; runtime works but build types break. | Stay on Zod 3.25.x. Re-evaluate when resolvers ships explicit Zod 4 support. |
| **Vitest 4.0.7** (today) | Bleeding edge; MSW + RTL adapter compatibility lags. | Vitest 3.2.4 is the current production-ready line. |
| **`auth.uid() = ...` without `(SELECT auth.uid())`** in RLS | Postgres re-evaluates `auth.uid()` per row; on 100k+ rows this is brutally slow. | Wrap as `(SELECT auth.uid())` — Postgres treats it as initPlan and caches once per statement. (Documented Supabase RLS performance pattern, 100x speedup on large tables.) |
| **Storing `tenant_id` / `role` only in `user_metadata`** | `raw_user_metadata` is **user-modifiable**. Using it in RLS means users can change their own permissions. Critical security hole. | Store authorization-relevant claims in `raw_app_meta_data` (admin-only) or compute via SECURITY DEFINER functions called from RLS. |
| **AG Grid Enterprise** | Not free; HR SaaS dashboards do not need spreadsheet features. | TanStack Table (headless) when you need a real table. |
| **Lucide ArrowX as logo / font-display custom Lever wordmark** | Brand fidelity rule (registered in user memory). | Always use SVG asset from `/marca/` or the `LeverArrow` primitive. |
| **`console.log` of candidate / employee data in production** | LGPD exposure (PII in browser console / Sentry breadcrumbs). | Remove all logs from `src/` that touch user / candidate fields; use Sentry with `beforeSend` scrubbing for genuine error context. |
| **Materialized path / nested sets** for org_units | Synchronization overhead on every write; bug-prone with concurrent updates. | Plain adjacency list (`parent_id`) + recursive CTE indexed on `parent_id`. |
| **Polling for realtime updates** when Supabase Realtime is available | Wastes RLS round-trips, rate-limit risk. | `supabase.channel(...).on('postgres_changes', ...)` paired with `queryClient.invalidateQueries(...)`. |
| **`@supabase/auth-helpers-react`** (deprecated) | Has been replaced by `@supabase/ssr` for Next.js, and direct supabase-js usage for Vite/SPAs. | Direct `@supabase/supabase-js` usage with the existing `useAuth` hook pattern is correct for Vite. |

## Stack Patterns by Variant

**If a tenant table needs RLS:**
- Add `company_id uuid NOT NULL REFERENCES companies(id)` (or `group_id` for shared resources)
- Always pair with `CREATE INDEX idx_<table>_company ON <table>(company_id)`
- RLS policy: `USING (company_id IN (SELECT company_id FROM user_company_access WHERE user_id = (SELECT auth.uid())))`
- The "memberships table read inside RLS" pattern is preferable to JWT claims when membership lists are dynamic (Sócio assignments change). JWT claim is preferable when claims are stable per session (role, primary_company_id).

**If a feature is admin/RH-only:**
- RLS: `USING ((SELECT auth.jwt()->>'role') IN ('admin', 'rh'))` — but only after ensuring `role` is in `raw_app_meta_data` and propagated via Custom Access Token Hook
- CASL: `can('manage', 'all')` for admin/RH abilities
- UI: `<Can I="manage" a="Company"><Button>Edit Empresa</Button></Can>`

**If a query is hierarchical (líder sees descendants):**
- DB: `RETURNS SETOF uuid LANGUAGE sql STABLE` recursive CTE function
- RLS: `USING (org_unit_id IN (SELECT * FROM org_unit_descendants((SELECT auth.jwt()->>'org_unit_id')::uuid)))`
- Index: `parent_id` is mandatory

**If a form needs server-side validation parity:**
- Define schema in `src/schemas/<feature>.ts` exporting `<Feature>Schema` (Zod)
- Edge Function imports the same schema (Deno: `import { schema } from '../../shared/schemas/<feature>.ts'` — symlinked or duplicated; Deno cannot import from `src/`)
- Practical compromise: keep schemas in `supabase/functions/_shared/schemas/` and re-export from `src/schemas/` so both build chains can resolve them

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `react@18.3.1` | `react-dom@18.3.1`, `@testing-library/react@16` | RTL 16 requires React 18+; explicit `@testing-library/dom@10` peer install. |
| `react-hook-form@7.73.1` | `@hookform/resolvers@5.2.2`, `zod@3.25.x` | **Incompat:** `@hookform/resolvers@5.2.2` + `zod@4.3.x` (TS only — runtime works). Stay on Zod 3 until resolvers patches. |
| `vitest@3.2.4` | `@vitejs/plugin-react@^4 / ^5`, `msw@^2.10`, RTL@16 | Vitest 4.0.7 exists but ecosystem (msw, RTL) lags — stay on 3.2.x. |
| `zustand@5.0.10` | React 18, React 19 | Zustand 5 supports both React lines. |
| `@supabase/supabase-js@2.75+` | Postgres 15 (Supabase managed), `@tanstack/react-query@5` | Generated types via CLI v1.8.1+. |
| `@casl/ability@6.8.0` | `@casl/react@5.x`, all React 18+ | Major-versioned together; do not mix `@casl/react@4` with `@casl/ability@6`. |
| `@sentry/react@10.50` | Vite 5+, Vite 7 (per recent test bumps), `@sentry/vite-plugin@2.x` | Plugin uploads source maps with `sourcemap: 'hidden'` Vite config. |
| `@hookform/resolvers@5.2.2` | RHF 7.x, Zod 3.25.x cleanly; Zod 4 needs `zod/v3` import workaround | See "What NOT to Use" — wait for clean Zod 4 support. |

## Sources

**Context7 (HIGH confidence — official + benchmark-curated):**
- `/stalniy/casl` — CASL React integration patterns, useAbility hook, Can component, condition rules
- `/pmndrs/zustand` — persist middleware, partialize, version migration, selector usage
- `/vitest-dev/vitest` — Vitest config with React, browser mode (informational)
- `/react-hook-form/resolvers` — zodResolver TypeScript inference, Zod v3/v4 detection
- `/mswjs/msw` — MSW setup for Vitest, server.listen / resetHandlers / close lifecycle
- `/supabase/supabase-js` — supabase-js 2.58+ (latest line), TS support
- `/getsentry/sentry-javascript` — Sentry SDK 10.x React integration

**Official documentation (HIGH confidence):**
- [Supabase RLS Performance and Best Practices](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv) — wrapping `auth.uid()` in `SELECT` for initPlan caching
- [Supabase Custom Claims & RBAC](https://supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac) — Custom Access Token Hook for tenant_id propagation
- [Supabase Auth JWT Fields](https://supabase.com/docs/guides/auth/jwt-fields) — `raw_app_meta_data` vs `raw_user_meta_data` security distinction
- [Sentry React Sensitive Data Scrubbing](https://docs.sentry.io/platforms/javascript/guides/react/data-management/sensitive-data/) — `beforeSend` PII redaction for LGPD/GDPR
- [Sentry Vite Plugin](https://docs.sentry.io/platforms/javascript/guides/react/sourcemaps/uploading/vite/) — source map upload config
- [TanStack Query v5 Migration Guide](https://tanstack.com/query/latest/docs/framework/react/guides/migrating-to-v5) — current API patterns
- [TanStack ESLint Plugin Query](https://tanstack.com/query/v4/docs/eslint/eslint-plugin-query) — exhaustive query keys rule

**WebSearch (verified across multiple sources — MEDIUM-HIGH confidence):**
- [react-hook-form 7.73.1 + Zod v4 type incompatibility (Issue #813)](https://github.com/react-hook-form/resolvers/issues/813) — verified at GitHub issue tracker
- [Recharts vs visx 2026 comparison](https://www.pkgpulse.com/blog/recharts-vs-chartjs-vs-nivo-vs-visx-react-charting-2026)
- [Postgres adjacency list + recursive CTE for org trees](https://leonardqmarcq.com/posts/modeling-hierarchical-tree-data) and [Beyond Flat Tables (Supabase)](https://dev.to/roel_peters_8b77a70a08fdb/beyond-flat-tables-model-hierarchical-data-in-supabase-with-recursive-queries-4ndl)
- [Supabase RLS Best Practices (Makerkit)](https://makerkit.dev/blog/tutorials/supabase-rls-best-practices) — production patterns for multi-tenant
- [Testing Supabase with RTL + MSW (Herman Nygaard)](https://nygaard.dev/blog/testing-supabase-rtl-msw)
- [pgTAP for RLS testing (Basejump)](https://usebasejump.com/blog/testing-on-supabase-with-pgtap) and [supabase-test-helpers](https://github.com/usebasejump/supabase-test-helpers)
- [Vitest + Testing Library setup 2026](https://dev.to/kevinccbsg/react-testing-setup-vitest-typescript-react-testing-library-42c8)
- [Zustand vs Jotai 2026 multi-tenant scoping](https://jotai.org/docs/extensions/scope) and [State Management 2026](https://www.pkgpulse.com/blog/react-state-management-2026)
- [LGPD Compliance for SaaS (2026)](https://complydog.com/blog/brazil-lgpd-complete-data-protection-compliance-guide-saas) — Article 37 RoPA requirements
- [How I Built Production-Ready RBAC with CASL (Feb 2026)](https://benmukebo.medium.com/how-i-built-a-production-ready-rbac-system-in-react-with-casl-fd5b16354e3d) — production CASL patterns

**Version verification (npm registry, query date 2026-04-27):**
- `@casl/ability@6.8.0`, `@casl/react@5.x` (matched line)
- `zustand@5.0.10` (released 2026-01-12)
- `@sentry/react@10.50.0`
- `react-hook-form@7.73.1`
- `@hookform/resolvers@5.2.2`
- `vitest@3.2.4` (stable line; 4.0.7 available but ecosystem lags)
- `@testing-library/react@16.x`, `@testing-library/jest-dom@6.9.x`
- `msw@2.10.x`
- `@tanstack/react-query@5.99.x`, `@tanstack/eslint-plugin-query@5.99.x`

**Confidence calibration:**
- HIGH on all version numbers (verified via npm + Context7 within 24h of search).
- HIGH on RLS performance patterns (Supabase official docs).
- HIGH on Zod 4 + resolvers incompatibility (verified at GitHub issue tracker).
- HIGH on CASL fitness for the use case (Context7 docs + 2026 production posts confirm condition-based multi-tenant patterns).
- MEDIUM on recursive CTE performance at our scale (theoretically sound, no production benchmark on Lever's specific data — should be a roadmap research flag if org_unit count exceeds ~5k per tenant).
- MEDIUM on the Recharts 3 timing (depends on team appetite during refactor; defaulting to "stay on 2.15.4" is the conservative call).

---

*Stack research for: Brazilian HR/People SaaS multi-tenant on Supabase + React (brownfield refactor)*
*Researched: 2026-04-27*
