# Architecture Research

**Domain:** Multi-tenant HR SaaS (performance + R&S) on Supabase + Postgres + React/TS — brownfield refactor
**Researched:** 2026-04-27
**Confidence:** HIGH (Supabase/Postgres patterns triangulated against official docs + community benchmarks; existing codebase verified file-by-file)

## TL;DR

Five locked architectural decisions to act on:

1. **Tenancy model** — single-tenant DB, RLS enforces `company_id` + `group_id` + `org_unit` scope. Push the joins into `STABLE SECURITY DEFINER` helpers, never inline EXISTS.
2. **Org_units tree** — adjacency list (`parent_id`) with a `STABLE SECURITY DEFINER` recursive-CTE function `org_unit_descendants(uuid)`. Do **NOT** use ltree for this dataset (mutation-heavy, low depth, low cardinality).
3. **Frontend scope propagation** — single `ScopeProvider` React Context as the source of truth, **URL search param `?scope=` as the persistence layer**, scope embedded in **every TanStack Query key**. Switching scope = `queryClient.invalidateQueries({ queryKey: ['scope', scopeId] })` (partial match invalidates all scoped queries).
4. **LGPD audit** — extend the existing `candidate_access_log` pattern into a generic `data_access_log` table; SELECT triggers via `SECURITY DEFINER` RPCs at the entity boundary (candidates, profiles, salaries). pgaudit for DDL/role changes only.
5. **Migration** — expand → backfill → contract pattern. Add `group_id`/`org_unit_id` as nullable, default everyone to "Grupo Lever" + a single root org_unit per company, then tighten constraints. **Five small migrations, not one big one.**

---

## System Overview

```
┌────────────────────────────────────────────────────────────────────┐
│                       PRESENTATION LAYER                           │
│  ┌───────────────┐  ┌──────────────┐  ┌────────────────────┐       │
│  │  Header       │  │  Pages       │  │  Domain Components │       │
│  │  ScopeSwitch  │  │  (filtered)  │  │  (Kanban, Drawer)  │       │
│  └───────┬───────┘  └──────┬───────┘  └─────────┬──────────┘       │
│          │ writes           │ reads             │ reads            │
│          ▼                  ▼                   ▼                  │
│  ┌─────────────────────────────────────────────────────────┐       │
│  │  ScopeProvider (React Context)                          │       │
│  │  - selectedScope: { type: 'company' | 'group', id }     │       │
│  │  - companyIds: UUID[]   ← derived (group expanded)      │       │
│  │  - syncs to URL ?scope= and localStorage                │       │
│  └────────────────────┬────────────────────────────────────┘       │
├───────────────────────┼────────────────────────────────────────────┤
│                       │  HOOK LAYER                                │
│                       ▼                                            │
│  ┌─────────────────────────────────────────────────────────┐       │
│  │  useScopedQuery(key, fn)  ←  wraps useQuery             │       │
│  │  - prepends ['scope', scopeId, ...] to every key        │       │
│  │  - passes companyIds to query fn                        │       │
│  └────────────────────┬────────────────────────────────────┘       │
├───────────────────────┼────────────────────────────────────────────┤
│                       │  INTEGRATION LAYER                         │
│                       ▼                                            │
│  ┌─────────────────────────────────────────────────────────┐       │
│  │  Supabase Client (singleton)                            │       │
│  │  + Edge Functions (transcribe, summarize, anonymize)    │       │
│  └────────────────────┬────────────────────────────────────┘       │
├───────────────────────┼────────────────────────────────────────────┤
│                       │  DATABASE (Postgres + RLS)                 │
│                       ▼                                            │
│  ┌────────────┐  ┌────────────┐  ┌─────────────────────────┐       │
│  │ company_   │  │ companies  │  │ org_units (parent_id)   │       │
│  │ groups     │◄─┤ group_id?  │  │ company_id              │       │
│  └────────────┘  └─────┬──────┘  └───────┬─────────────────┘       │
│                        │                 │                         │
│                        ▼                 ▼                         │
│  ┌─────────────────────────────────────────────────────────┐       │
│  │  Domain tables (jobs, applications, evaluations, …)     │       │
│  │  - company_id NOT NULL  - org_unit_id NULL (where appl) │       │
│  │  - RLS: visible_companies(uid) + org_unit_descendants() │       │
│  └─────────────────────────────────────────────────────────┘       │
│                        │                                           │
│                        ▼                                           │
│  ┌─────────────────────────────────────────────────────────┐       │
│  │  data_access_log  (LGPD audit, append-only)             │       │
│  │  - written by SECURITY DEFINER triggers + RPCs          │       │
│  └─────────────────────────────────────────────────────────┘       │
└────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Owns | Implementation |
|-----------|------|----------------|
| `ScopeProvider` | Currently selected scope (company OR group), persists across reloads, syncs to URL | React Context + `useSearchParams` + `localStorage` fallback |
| `useScopedQuery` | Embeds `scopeId` into every TanStack Query key; passes `companyIds` array to query fn | Wrapper hook over `useQuery` |
| `ScopeSwitch` (header UI) | Dropdown of companies + groups, writes to provider | shadcn `Command` / `Popover` |
| `visible_companies(uid)` (Postgres) | Returns the `UUID[]` of companies the caller can see, considering role + memberships | `STABLE SECURITY DEFINER` SQL function |
| `org_unit_descendants(uuid)` (Postgres) | Returns IDs of all descendant org_units (incl. self) | `STABLE SECURITY DEFINER` recursive CTE function |
| `is_leader_of(uid, org_unit_id)` (Postgres) | Boolean: is caller leader of this unit or any ancestor? | `STABLE SECURITY DEFINER` function over `org_units` + `unit_leaders` |
| `data_access_log` | Append-only audit of every read of sensitive entities (candidates, profiles, salaries) | Postgres table + `SECURITY DEFINER` write RPC |

---

## Recommended Project Structure

```
src/
├── app/
│   ├── App.tsx                  # routes + providers (current: 316 lines)
│   ├── providers/
│   │   ├── QueryProvider.tsx    # extracted from App.tsx
│   │   ├── ScopeProvider.tsx    # NEW — selected scope source of truth
│   │   ├── AuthProvider.tsx     # wraps existing useAuth
│   │   └── index.tsx            # composes all providers
│   └── routes.tsx               # extracted route config
├── features/                    # NEW top-level layer (replaces flat hooks/ + components/)
│   ├── tenancy/                 # NEW — scope/groups/companies
│   │   ├── components/
│   │   │   └── ScopeSwitch.tsx
│   │   ├── hooks/
│   │   │   ├── useCurrentScope.ts
│   │   │   ├── useCompanies.ts
│   │   │   └── useCompanyGroups.ts
│   │   ├── lib/
│   │   │   └── scopeKey.ts      # buildScopedKey, parseScope
│   │   └── types.ts
│   ├── org-structure/           # NEW — org_units + memberships
│   │   ├── components/
│   │   │   ├── OrgUnitTree.tsx
│   │   │   └── UnitPicker.tsx
│   │   ├── hooks/
│   │   │   ├── useOrgUnits.ts
│   │   │   └── useUnitLeaders.ts
│   │   └── lib/
│   │       └── treeOps.ts       # client-side flatten/lift
│   ├── hiring/                  # existing src/components/hiring + hooks/hiring
│   ├── performance/             # existing 1:1, evaluations, climate
│   └── companies/               # existing CompanyDrawer + new groups
├── shared/
│   ├── data/
│   │   └── useScopedQuery.ts    # NEW — wraps useQuery with scope key
│   ├── ui/                      # existing components/ui (shadcn)
│   ├── primitives/              # existing components/primitives (LeverArrow…)
│   └── hooks/
│       └── useAuth.ts
├── integrations/
│   └── supabase/                # unchanged (client.ts, types.ts, hiring-types.ts)
└── lib/
    ├── routes.ts
    └── supabaseError.ts
```

### Structure Rationale

- **`features/` over flat `components/` + `hooks/`** — codebase has 30+ hiring components and 18 hiring hooks split across two folders; merging by feature means a feature is one folder, easier to refactor whole-cloth, smaller blast radius. Keep moves incremental: do `tenancy/` and `org-structure/` greenfield, leave hiring/performance flat for now.
- **`app/providers/` extraction** — App.tsx is 316 lines and growing; pulling QueryProvider, ScopeProvider, AuthProvider into composable units makes the root component a router skeleton.
- **`shared/data/useScopedQuery.ts`** — single chokepoint where every query gets the scope key prepended. Prevents the "I forgot to filter" bug class architecturally instead of by code review.
- **No backend folder restructure needed** — `supabase/migrations/` and `supabase/functions/` already follow Supabase conventions.

---

## Architectural Patterns

### Pattern 1: Function-Driven RLS (not policy-inlined joins)

**What:** Encapsulate "can this user see company X / org_unit Y" in `STABLE SECURITY DEFINER` SQL functions. RLS policies become 2-3 lines that call these helpers.

**When to use:** Every table that has `company_id` and/or `org_unit_id`. Codebase already does this for hiring (`allowed_companies`, `is_people_manager`); generalize the pattern across all tenancy-aware tables.

**Why this approach:**
- Functions get an `initPlan` (executed once per query, not per row) — Supabase docs report 94-99% improvements when wrapping `auth.uid()` in `SELECT (select auth.uid())`. Same applies to your helper functions.
- `SECURITY DEFINER` skips RLS on `user_roles` / `unit_leaders` lookup tables, eliminating recursive policy evaluation.
- Single point of change: when group_id rules need adjustment, you edit one function, not 40 policies.
- Existing `is_people_manager()` is already this pattern — extend it, don't replace it.

**Example (the helper trifecta):**

```sql
-- 1. Companies the caller can see (handles group expansion + sócio memberships)
CREATE OR REPLACE FUNCTION public.visible_companies(_uid uuid)
RETURNS uuid[]
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT CASE
    WHEN public.is_people_manager(_uid) THEN
      (SELECT COALESCE(array_agg(id), '{}') FROM public.companies)
    WHEN public.has_role(_uid, 'socio') THEN
      (SELECT COALESCE(array_agg(company_id), '{}')
       FROM public.socio_company_memberships WHERE user_id = _uid)
    WHEN public.has_role(_uid, 'lider') THEN
      (SELECT COALESCE(array_agg(DISTINCT ou.company_id), '{}')
       FROM public.unit_leaders ul
       JOIN public.org_units ou ON ou.id = ul.org_unit_id
       WHERE ul.user_id = _uid)
    ELSE '{}'::uuid[]
  END;
$$;

-- 2. Org_unit descendants (incl. self) for leader access
CREATE OR REPLACE FUNCTION public.org_unit_descendants(_unit_id uuid)
RETURNS uuid[]
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH RECURSIVE tree AS (
    SELECT id FROM public.org_units WHERE id = _unit_id
    UNION ALL
    SELECT ou.id FROM public.org_units ou
    JOIN tree t ON ou.parent_id = t.id
  )
  SELECT array_agg(id) FROM tree;
$$;

-- 3. Org_units the caller can see (union of all descendant trees they lead)
CREATE OR REPLACE FUNCTION public.visible_org_units(_uid uuid)
RETURNS uuid[]
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT CASE
    WHEN public.is_people_manager(_uid) THEN
      (SELECT COALESCE(array_agg(id), '{}') FROM public.org_units)
    WHEN public.has_role(_uid, 'lider') THEN (
      SELECT COALESCE(array_agg(DISTINCT d), '{}')
      FROM public.unit_leaders ul,
           LATERAL unnest(public.org_unit_descendants(ul.org_unit_id)) AS d
      WHERE ul.user_id = _uid
    )
    ELSE '{}'::uuid[]
  END;
$$;

-- Then policies become trivial:
CREATE POLICY "evaluations:select_scoped"
  ON public.evaluations FOR SELECT TO authenticated
  USING (
    company_id = ANY(public.visible_companies((select auth.uid())))
    AND (org_unit_id IS NULL
         OR org_unit_id = ANY(public.visible_org_units((select auth.uid()))))
  );
```

**Trade-offs:**
- **+** Fast (initPlan caches result), readable, DRY across tables.
- **+** Aligns with existing `is_people_manager()` and `allowed_companies()` patterns — no green-field invention.
- **−** `SECURITY DEFINER` is dangerous if the function selects user-controlled input — always parameterize, always `SET search_path = public`.
- **−** Functions bypass RLS on intermediate tables; that's the point, but any bug in the function = global escalation. Test ruthlessly.

---

### Pattern 2: Adjacency List + Recursive CTE for org_units (NOT ltree)

**What:** `org_units(id, parent_id, company_id, name)`. Tree traversal via recursive CTE wrapped in a `STABLE SECURITY DEFINER` function. Index `(company_id, parent_id)`.

**When to use:** This dataset. Specifically:
- **Mutation profile**: medium — RH reorganizes teams, adds/moves units. Adjacency list = `UPDATE one row`. Ltree = `UPDATE every descendant row`.
- **Depth profile**: shallow — empresas have 2-4 levels (Diretoria → Departamento → Time → Squad), not 20.
- **Cardinality**: low — even at scale, tens-to-hundreds of units per company, not millions.
- **Read profile**: descendants traversal is the only complex query (for "leader sees subtree").

**Why not ltree:**
- Ltree shines for **deep, stable trees** with millions of nodes (taxonomies, file systems). Org charts are the opposite: ~50-200 nodes per company, frequent restructuring.
- Ltree GIST index has size limits — fine for org charts but adds operational complexity (extension installation, syntax peculiarities).
- Moving a subtree in ltree = updating every descendant's path string. Adjacency list = one row.
- Cybertec benchmark: for ≤10k nodes recursive CTE on indexed adjacency list is competitive with ltree even on read; far ahead on writes.
- **Existing convention**: codebase already uses adjacency-list elsewhere (`teams` + `team_members`); consistency wins.

**Why not nested set:** Nested set has O(n) writes (every insert/move shifts left/right pointers). Useless for an HR app where re-org happens.

**Schema:**

```sql
CREATE TABLE public.org_units (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  parent_id   uuid REFERENCES public.org_units(id) ON DELETE RESTRICT,
  name        text NOT NULL,
  kind        text,              -- free-form: 'departamento', 'time', 'squad'
  position    int NOT NULL DEFAULT 0,  -- sibling ordering
  created_at  timestamptz NOT NULL DEFAULT NOW(),
  updated_at  timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT no_self_parent CHECK (id <> parent_id),
  CONSTRAINT same_company_as_parent CHECK (
    parent_id IS NULL
    OR company_id = (SELECT company_id FROM public.org_units WHERE id = parent_id)
  )
);
CREATE INDEX idx_org_units_company_parent ON public.org_units(company_id, parent_id);
CREATE INDEX idx_org_units_parent ON public.org_units(parent_id) WHERE parent_id IS NOT NULL;

-- Cycle prevention via trigger (CHECK constraint above only catches self-ref)
CREATE OR REPLACE FUNCTION public.tg_prevent_org_unit_cycle()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  cur_id uuid := NEW.parent_id;
BEGIN
  WHILE cur_id IS NOT NULL LOOP
    IF cur_id = NEW.id THEN
      RAISE EXCEPTION 'Cycle detected in org_units';
    END IF;
    SELECT parent_id INTO cur_id FROM public.org_units WHERE id = cur_id;
  END LOOP;
  RETURN NEW;
END $$;

CREATE TRIGGER tg_org_units_no_cycle
  BEFORE INSERT OR UPDATE OF parent_id ON public.org_units
  FOR EACH ROW EXECUTE FUNCTION public.tg_prevent_org_unit_cycle();

-- Membership: user ↔ unit (one user can be in multiple units)
CREATE TABLE public.org_unit_members (
  org_unit_id uuid NOT NULL REFERENCES public.org_units(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (org_unit_id, user_id)
);

-- Leaders: user ↔ unit (one user can lead multiple units, one unit can have multiple leaders)
CREATE TABLE public.unit_leaders (
  org_unit_id uuid NOT NULL REFERENCES public.org_units(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (org_unit_id, user_id)
);
```

**Trade-offs:**
- **+** Move = update one row. Resize org chart in real time.
- **+** Recursive CTE with index on `parent_id` is fast at this cardinality (sub-ms for <500 nodes).
- **+** Cycle prevention via trigger (the CHECK can't see other rows).
- **−** "Get all ancestors" requires recursion — also fast at this scale, but write `ancestors_of(uuid)` companion function.
- **−** Recursive CTE compiled in security-definer functions costs more than ltree's pure index lookup at very large scale (>10k nodes). Not your problem.

---

### Pattern 3: Scope-as-Query-Key (frontend single source of truth)

**What:** A React Context (`ScopeProvider`) holds the currently selected scope. Every TanStack Query key is prefixed with the scope. URL search param `?scope=` is the persistence layer.

**Why this combination beats the alternatives:**

| Approach | Pro | Con | Verdict |
|----------|-----|-----|---------|
| Pure Context | Simple, type-safe | Lost on refresh, no shareable URL, every tab must re-pick | Insufficient |
| Pure URL search params | Shareable, refresh-safe, browser back/forward works | Causes re-renders everywhere, awkward to read in non-route components | Need wrapping |
| Pure localStorage | Refresh-safe | Not shareable, cross-tab desync, doesn't trigger re-render | Insufficient |
| Per-tenant `QueryClient` (some recommend) | Hard isolation | Loses cache on scope switch (cold queries every time), heavyweight | Wrong for this UX |
| **Context + URL + key-prefix** (recommended) | Shareable, refresh-safe, trivial invalidation, cache reuses across switches | Slightly more wiring | **Use this** |

**Implementation:**

```tsx
// features/tenancy/types.ts
export type Scope =
  | { type: 'company'; id: string; companyIds: [string] }
  | { type: 'group';   id: string; companyIds: string[] };

// app/providers/ScopeProvider.tsx
const ScopeContext = createContext<{
  scope: Scope;
  setScope: (s: Scope) => void;
} | null>(null);

export function ScopeProvider({ children }: { children: ReactNode }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [companies] = useCompanies();           // fetched once
  const [groups]    = useCompanyGroups();       // fetched once

  const urlScope    = searchParams.get('scope'); // "company:uuid" or "group:uuid"
  const storedScope = localStorage.getItem('lever:scope');
  const initial     = urlScope ?? storedScope ?? defaultScope(companies);

  const scope = useMemo(
    () => resolveScope(initial, companies, groups),
    [initial, companies, groups]
  );

  const setScope = useCallback((s: Scope) => {
    const token = `${s.type}:${s.id}`;
    setSearchParams(prev => { prev.set('scope', token); return prev; });
    localStorage.setItem('lever:scope', token);
  }, [setSearchParams]);

  return (
    <ScopeContext.Provider value={{ scope, setScope }}>
      {children}
    </ScopeContext.Provider>
  );
}

// shared/data/useScopedQuery.ts
export function useScopedQuery<T>(
  key: QueryKey,
  fn: (companyIds: string[]) => Promise<T>,
  options?: UseQueryOptions<T>
) {
  const { scope } = useScope();
  return useQuery({
    queryKey: ['scope', scope.id, ...key],   // ← scope is in EVERY key
    queryFn: () => fn(scope.companyIds),
    ...options,
  });
}

// On scope switch, the QueryClient automatically marks all queries with the
// previous scope key as inactive — they'll be GC'd after gcTime, but until
// then, switching back is INSTANT (cache hit).

// usage
const { data } = useScopedQuery(
  ['jobs', { status: 'open' }],
  async (companyIds) =>
    supabase.from('job_openings')
      .select('*')
      .in('company_id', companyIds)
);
```

**Trade-offs:**
- **+** Switching scopes never refetches stale data: previous scope's cache persists.
- **+** URL is the source of truth → shareable links, refresh-safe, works with browser nav.
- **+** Forces every query to declare its scope (won't compile/run if you forget — make `useScopedQuery` the only allowed entry point).
- **+** Mutations invalidate via `queryClient.invalidateQueries({ queryKey: ['scope', currentScope.id] })`.
- **−** RLS is still the security boundary. Frontend filtering is purely UX/perf. **Never trust the scope in the frontend** — the backend must independently enforce visible_companies.
- **−** The `data` array gets large with groups (Grupo Lever = 7 companies). Use `.in('company_id', ids)` not `.eq()`.

---

### Pattern 4: LGPD Audit via Append-Only Log + Triggers + RPC Wrappers

**What:** A single `data_access_log` table written by:
1. `AFTER UPDATE` triggers on sensitive tables (already done for `candidate_access_log`).
2. Explicit `SECURITY DEFINER` RPC wrappers for **read** access to PII (LGPD requires logging access, not just modification).
3. pgaudit for DDL/role changes only (granular DML logging by pgaudit explodes log volume).

**Why this approach:**
- LGPD Art. 37 + 46-48 require records of who accessed personal data, when, and for what purpose. Modify-only audit isn't enough — read-access matters.
- Postgres triggers can't intercept `SELECT`. The only way to log reads is to force them through a function: `SELECT * FROM read_candidate(_id)` instead of `SELECT * FROM candidates WHERE id = _id`.
- Existing `candidate_access_log` table already has the right shape (`actor_id`, `action`, `resource`, `resource_id`, `at`). Generalize, don't replace.

**Schema:**

```sql
-- Generalized from existing candidate_access_log
CREATE TABLE public.data_access_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id        uuid NOT NULL REFERENCES public.profiles(id),
  action          text NOT NULL CHECK (action IN ('view','update','export','anonymize','delete')),
  entity_type     text NOT NULL,    -- 'candidate', 'profile', 'salary', 'evaluation'
  entity_id       uuid NOT NULL,
  scope_company_id uuid REFERENCES public.companies(id),  -- which company context
  context         text,             -- 'kanban_drawer', 'csv_export', 'profile_view'
  user_agent      text,
  ip_address      inet,
  at              timestamptz NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_data_access_log_actor_at ON public.data_access_log(actor_id, at DESC);
CREATE INDEX idx_data_access_log_entity ON public.data_access_log(entity_type, entity_id, at DESC);

-- Read RPC (replaces direct SELECTs from candidates)
CREATE OR REPLACE FUNCTION public.read_candidate_with_log(_id uuid, _context text)
RETURNS public.candidates
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  rec public.candidates;
BEGIN
  -- RLS check: re-evaluate as caller (not definer)
  IF NOT EXISTS (
    SELECT 1 FROM public.candidates c WHERE c.id = _id
      AND (public.is_people_manager((select auth.uid()))
           OR EXISTS (SELECT 1 FROM public.applications a
                      JOIN public.job_openings j ON j.id = a.job_opening_id
                      WHERE a.candidate_id = c.id
                        AND j.company_id = ANY(public.visible_companies((select auth.uid())))))
  ) THEN
    RETURN NULL;
  END IF;

  SELECT * INTO rec FROM public.candidates WHERE id = _id;

  INSERT INTO public.data_access_log (actor_id, action, entity_type, entity_id, context)
  VALUES ((select auth.uid()), 'view', 'candidate', _id, _context);

  RETURN rec;
END $$;
```

**Trade-offs:**
- **+** Append-only log fits LGPD audit-trail requirement.
- **+** Read RPCs scale to "any sensitive entity": same pattern for salaries, profiles, evaluations.
- **+** pgaudit (already available on Supabase) covers DDL and role-change events without app-level work.
- **−** Forcing reads through RPCs adds boilerplate. Mitigate by: only wrap **PII-sensitive** entities (candidates, salaries), not the world.
- **−** Frontend must call the RPC instead of the direct table. Encapsulate in hooks: `useCandidate(id)` → calls RPC, never raw select.
- **−** Log volume: at 100 daily users × 20 candidate views = 2k rows/day. Annual: ~700k. Partition by month after year 1.

---

### Pattern 5: Expand → Backfill → Contract Migration (zero-downtime tenancy refactor)

**What:** Three-phase migration: add new schema alongside old, backfill in batches, then tighten constraints and remove old. **Never** combine them in one migration.

**Why this approach:**
- The codebase already has 50 migration files; adding 5 more for tenancy refactor is normal velocity.
- App is in production with real users (Eryk's wife operates performance, R&S has external customers). Outage = business impact.
- Existing data assumes single-tenant or basic role; new schema has `group_id`, `org_unit_id`, sócio memberships, `performance_enabled`/`rs_enabled` flags. All need defaults that won't blow up the running app.
- Supabase + Postgres standard pattern. No special tooling needed (pgroll/reshape are nice but heavy for this scope).

**Phasing for this refactor:**

```
[Migration 1] Expand: company_groups + companies.group_id (nullable)
              + companies.performance_enabled, rs_enabled (default true for now)
              No code changes. App ignores new columns.

[Migration 2] Backfill: insert "Grupo Lever" row.
              UPDATE companies SET group_id = '<grupo-lever-id>'
                WHERE name IN (<the 7 internal company names>);
              External companies stay group_id = NULL.

[Migration 3] Expand: org_units + org_unit_members + unit_leaders tables.
              For each company, insert ONE root unit
                (name = company.name, parent_id = NULL).
              For each existing team, insert as unit
                (parent_id = root, members from team_members).
              Existing teams stay alive — org_units coexists.

[Migration 4] Expand: socio_company_memberships table.
              Backfill from existing user_roles where role='socio' (give them all companies as a starting point — RH adjusts later).
              Add new helpers: visible_companies(), visible_org_units().
              Rewrite RLS policies to use new helpers. Old helpers stay until cutover.

[Migration 5] Frontend cutover: ship ScopeProvider + useScopedQuery.
              All hooks rewritten. Verify with smoke tests.

[Migration 6] Contract: drop old helpers (allowed_companies),
              tighten NOT NULL on company_id where absent,
              add CHECK constraints for new invariants.
              Drop `teams` only after confirming no code reads it
              (likely keep teams as legacy alias for a release).
```

**Trade-offs:**
- **+** Each step is reversible until the contract phase. If migration 3 breaks, rollback is `DROP TABLE`.
- **+** No code change in migrations 1-2 means production keeps running while they apply.
- **+** Backfill SQL is just `INSERT INTO ... SELECT FROM` — no app downtime.
- **+** Six-step plan maps directly to roadmap phases.
- **−** Six migrations to coordinate; a half-applied state (e.g., only 1-3 applied, code expects 4) is a bug. Document state in `.planning/migrations.md`.
- **−** Backfill of org_units from teams is the riskiest step — requires schema-aware reshaping. Write a Deno script + Supabase migration combo, run dry-run first.

---

## Data Flow

### Top-Down: Scope → Query → Render

```
[User clicks group "Grupo Lever" in header]
        ↓
ScopeSwitch.onChange(scope: { type:'group', id, companyIds:[7 ids] })
        ↓
setScope() updates URL + localStorage + Context
        ↓
ScopeProvider re-renders → all consumers (useScope) get new value
        ↓
useScopedQuery hooks see new scope.id in their key tuple
        ↓
React Query: previous queries marked inactive (cached, GC'd later)
        ↓
React Query: new keys ['scope', groupId, 'jobs', …] are stale
        ↓
queryFn fires: supabase.from('job_openings').in('company_id', companyIds)
        ↓
Postgres: RLS policy USING (company_id = ANY(visible_companies(uid)))
        ↓
visible_companies() returns SAME ids the FE filtered by → safe + fast
        ↓
Result hydrates into TanStack cache → components re-render
```

**Key safeguards:**
- Frontend `.in('company_id', companyIds)` is a **performance optimization**, not security. RLS is the gate.
- If the frontend forgets to scope, RLS still filters — query just returns more than the user wanted.
- If the user lies about scope (modifies localStorage), RLS rejects the rows their role can't see.

### Bottom-Up: Mutation → Invalidation → Refresh

```
[User drags candidate to new stage]
        ↓
mutation.mutate({ applicationId, newStage })
        ↓
Supabase UPDATE applications SET stage = ...
        ↓
Postgres trigger: tg_append_application_stage_history (already exists)
Postgres trigger: tg_log_data_access (NEW — write to data_access_log)
        ↓
Mutation onSuccess:
  queryClient.invalidateQueries({
    queryKey: ['scope', scope.id, 'applications', { jobId }]
  })
        ↓
All Kanban subscribers refetch with current scope context
        ↓
Optimistic UI already showed move; refetch confirms or rolls back
```

### Cross-cutting: Realtime Subscriptions

```
Existing pattern: useTalentPool subscribes to candidate_conversations changes.
Generalize: every realtime channel filter must include scope.

supabase.channel('jobs')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'job_openings',
    filter: `company_id=in.(${scope.companyIds.join(',')})`
  })
  .subscribe()

Re-subscribe on scope change. RLS still filters server-side as backup.
```

---

## Component Boundaries

### What lives where, what queries what

| Layer | Owns | Imports From | Imports To |
|-------|------|--------------|------------|
| `app/providers/` | App-wide state (Auth, Scope, QueryClient) | `integrations/supabase`, `features/tenancy/hooks` | All `features/` |
| `features/tenancy/` | Companies, groups, scope selector | `integrations/supabase`, `shared/ui` | `features/hiring`, `features/performance` (read scope) |
| `features/org-structure/` | org_units tree CRUD, leader assignments | `integrations/supabase`, `shared/ui` | `features/performance` (resolve descendants for evaluations/1:1) |
| `features/hiring/` | Vagas, candidatos, kanban, talent pool | `shared/data/useScopedQuery`, `integrations/supabase`, `features/tenancy/hooks` (scope only — no direct company queries) | — |
| `features/performance/` | 1:1, evaluations, climate | `shared/data/useScopedQuery`, `features/tenancy/hooks`, `features/org-structure/hooks` | — |
| `shared/data/` | `useScopedQuery` (the chokepoint) | `integrations/supabase`, `features/tenancy/hooks` | All features |
| `integrations/supabase/` | Client, types | — | Everywhere |

**Critical rule:** features depend on `shared/data/useScopedQuery` for fetching, never call `supabase.from()` directly inside components or pages. Queries are owned by hooks, hooks are owned by `useScopedQuery`. This is the architectural enforcement of "data is always scoped."

**Linter rule (recommended):** ESLint custom rule blocking `supabase.from(` outside `**/hooks/**` and `**/integrations/**`. Easy win, prevents regression.

---

## Suggested Build Order (foundation → dependent layers)

This is the recommended phase ordering for the roadmap. Each phase is small enough to ship in 2-5 days, has a verifiable end-state, and unblocks the next.

### Phase A: Foundations (groups + companies feature flags)
- Migration 1: `company_groups`, `companies.group_id`, `companies.performance_enabled`, `companies.rs_enabled`
- Backend: extend `is_people_manager` understanding (no behavior change yet)
- Frontend: nothing — purely additive
- **Done when:** new columns exist, no test breaks.

### Phase B: Org_units schema + helpers
- Migration 2: `org_units`, `org_unit_members`, `unit_leaders`, cycle-prevention trigger
- Migration 3: `org_unit_descendants()`, `visible_org_units()`, `is_leader_of()`
- **Done when:** test queries return correct subtree IDs; RLS unchanged.

### Phase C: Sócio memberships + visible_companies()
- Migration 4: `socio_company_memberships`
- Migration 5: `visible_companies()` (replaces inlined logic in `allowed_companies`)
- Update existing RLS policies one-by-one to use new helpers
- **Done when:** all hiring/performance queries pass with new helpers; old helpers can be deprecated.

### Phase D: ScopeProvider + useScopedQuery
- New: `app/providers/ScopeProvider.tsx`, `shared/data/useScopedQuery.ts`
- New: `features/tenancy/components/ScopeSwitch.tsx`
- Refactor existing hooks one-by-one to use `useScopedQuery`
- **Done when:** every hiring + performance hook uses scoped key; switching scope filters all screens.

### Phase E: Backfill data
- Backfill: insert "Grupo Lever" + assign 7 internal companies
- Backfill: create root org_unit per company; convert existing teams to units
- Backfill: convert existing `user_roles` socios to `socio_company_memberships`
- **Done when:** production data fully reflects new model; no missing scope.

### Phase F: LGPD audit upgrade
- Generalize `candidate_access_log` → `data_access_log`
- Add `read_*_with_log()` RPCs for sensitive entities
- Frontend: replace direct selects of candidates/profiles with RPC calls
- Enable pgaudit for DDL only
- **Done when:** every PII view writes to log; pgaudit captures schema changes.

### Phase G: Contract phase
- Drop deprecated helpers (`allowed_companies`)
- Add NOT NULL constraints (`company_id` everywhere)
- Drop legacy `teams` table OR leave as deprecated alias for one release
- Document new model in CLAUDE.md / .planning/codebase/
- **Done when:** schema is clean; no dead code; documentation matches reality.

**Why this order:**
- Schema before behavior (A,B,C). Adding columns is safe; using them comes after.
- Helpers before policies (B,C → D). Policies can be tested against existing data.
- Frontend after backend (D). Once helpers exist, scope-aware UI is trivial.
- Backfill after structure (E). Don't migrate data before targets exist.
- Audit late (F). LGPD compliance is critical but doesn't gate other work; can ship in parallel with G.
- Cleanup last (G). Nothing to remove until everything works on new model.

---

## Migration Phasing — what data moves first, what's backwards-compatible

| Step | What moves | Backwards compat | Rollback cost |
|------|-----------|------------------|---------------|
| A — group_id added | Nothing yet | App unchanged | DROP COLUMN — trivial |
| B — org_units created | Empty tables | App unchanged | DROP TABLE — trivial |
| C — visible_companies created | Helpers added; old still works | App unchanged | DROP FUNCTION — trivial |
| D — frontend uses scope | Code only; data unchanged | OLD scope=null still serves admin everything (graceful default) | git revert |
| E — Grupo Lever backfilled | Data: 7 companies → group_id; existing teams → org_units | Old `teams` queries still work (table not dropped); existing components work | UPDATE rollback OR keep dual-write |
| F — data_access_log + RPC reads | New table empty; RPCs are additive | Direct selects still allowed for now | Drop RPCs; revert frontend |
| G — contract | Drop deprecated helpers, add NOT NULL | **Breaking** — must be after all features migrate | Forward-only; have a recent backup |

**Critical: G is the only step that's not freely reversible.** Wait until A-F have been in production for at least a week before contract.

**Backwards-compatibility tactics in code:**
- During D, `useScopedQuery` falls back to "admin sees all companies" if scope is missing — this is what RLS would give them anyway, so safe.
- During E, the legacy `teams` table is read-only (no new code writes to it) but reads from it still work (orphan visibility for old reports).
- During F, RPCs are introduced alongside direct selects. Track adoption with a usage counter (log `direct_select_candidate` warnings); drop direct access only when the counter hits zero.

---

## LGPD Audit Trail Design (detailed)

### What must be logged (Art. 37 + 46-48 LGPD)

| Event | Why | Mechanism |
|-------|-----|-----------|
| Read PII (candidate full profile, salary, CPF, evaluation comments) | Demonstrate need-to-know | RPC wrapper writes to `data_access_log` |
| Update PII | Track who changed what | Existing `tg_log_candidate_access` trigger generalized to `tg_log_data_access` |
| Export (CSV pipeline) | Cross-border / bulk transfer per LGPD Art. 33 | Edge function logs the export request |
| Anonymize | LGPD right to erasure | Existing `anonymize_candidate` already does this; extend to profiles |
| Role change | Track admin actions | pgaudit covers `GRANT`/`REVOKE`; for `user_roles` table, custom trigger |
| Login (success + failure) | Detect unauthorized access | Supabase Auth logs cover this; mirror to `data_access_log` for unified queries |

### Schema (single source of truth)

`data_access_log` (already shown above) — append-only, partitioned by month after Year 1.

### Retention

LGPD doesn't mandate a retention period for audit logs (unlike GDPR's 6 months); typical industry practice = 2-5 years. Set `retention_months = 36` and have `pg_cron` (already in use per migration `20260416193500_hiring_cron_jobs.sql`) prune monthly.

```sql
-- Run monthly via pg_cron
DELETE FROM public.data_access_log
WHERE at < NOW() - INTERVAL '36 months';
```

### What NOT to log (privacy by design)

- Full payload contents (just IDs + action) — logging row payloads exposes PII in the log table itself
- Auth tokens / session IDs (already excluded by pgaudit's `log_parameter` defaults on Supabase)
- Free-form notes/comments (CPF could leak via paste)

---

## Scaling Considerations

| Scale | Adjustments |
|-------|-------------|
| 0-100 users | Current architecture works as-is. Don't optimize prematurely. |
| 100-1k users | Add indexes on `company_id`, `org_unit_id`, `scope`-correlated columns (some already exist per migration `20260423100000_index_user_fks_for_fast_delete.sql`). Profile slow RLS policies via Supabase advisor. |
| 1k-10k users | Partition `data_access_log` by month. Materialize "applications by stage by company" view if dashboards slow. Consider read replica for reporting. |
| 10k+ users | Re-evaluate single-DB tenancy: maybe shard by group_id at the connection-pool level. But Lever Talents at this scale is a different business. |

### Scaling priorities (what breaks first)

1. **`visible_companies()` for sócios with many memberships** — fixed by indexing `socio_company_memberships(user_id)`.
2. **Recursive CTE on org_units** — index `parent_id`. Fast at <500 nodes.
3. **`data_access_log` insert load** — write-only, append-only. No bottleneck at expected volume; partition when >5M rows.
4. **TanStack cache size with group "Grupo Lever"** — 7 companies × N records = bigger result sets. Mitigate with `staleTime` and pagination, not architecture changes.

---

## Anti-Patterns to Avoid

### AP1: Putting joins inline in RLS policies

**What people do:** `USING (EXISTS (SELECT 1 FROM team_members tm JOIN ... WHERE ...))` directly in policy.

**Why it's wrong:** Policy is evaluated per-row. The join runs N times for N rows. Supabase advisor (lint 0003 auth_rls_initplan) flags this. Real-world reports of 100x slowdowns.

**Do this instead:** Move to `STABLE SECURITY DEFINER` function returning `uuid[]`, then `USING (company_id = ANY(visible_companies((select auth.uid()))))`. The wrapped `(select ...)` causes Postgres to run the function once per query (initPlan), not per row.

### AP2: Trusting frontend scope for security

**What people do:** "User can only see selected company because the dropdown filtered." → SQL queries don't include `company_id` filter, just rely on UI.

**Why it's wrong:** Anyone with a Supabase JWT can `curl` the REST endpoint and bypass UI. RLS is the only real boundary.

**Do this instead:** RLS = security. Frontend filtering = performance/UX (smaller result, faster render). Both. Not either.

### AP3: One giant migration that does the whole refactor

**What people do:** "Migration 51: refactor tenancy" — drop columns, add tables, backfill, change policies, all in one 2000-line SQL file.

**Why it's wrong:** Can't deploy incrementally. Can't test partial states. Production downtime during execution. Half-broken state if any step fails.

**Do this instead:** Six small migrations (A-G above). Each is reversible (until G). Each can ship to production independently.

### AP4: Storing the org_unit hierarchy as a JSON tree column

**What people do:** `org_units.tree jsonb` containing the full subtree.

**Why it's wrong:** Can't query via SQL ("show me all evaluations under unit X"). Can't enforce referential integrity. Updates rewrite the whole document. Doesn't compose with RLS.

**Do this instead:** Adjacency list. Postgres is built for relational data; use it.

### AP5: Re-fetching the world on scope change

**What people do:** On scope switch, `queryClient.clear()` — wipe everything.

**Why it's wrong:** User toggles between two companies = re-loads all candidates twice = slow + wasteful. UX feels heavy.

**Do this instead:** Embed scope in query keys. TanStack keeps both scopes' data cached. Switching is `O(0)` on read; cache invalidates only on actual mutations.

### AP6: Using ltree because it's "the Postgres way for trees"

**What people do:** Reach for ltree because it appears in tutorials.

**Why it's wrong:** Ltree shines for read-heavy, deep, stable trees. Org charts are write-medium, shallow, mutating. Pay write cost for read benefit you don't need.

**Do this instead:** Adjacency list + recursive CTE + index on parent_id. If you ever measure ltree winning on this workload, switch — but you won't.

### AP7: SECURITY DEFINER functions without `SET search_path`

**What people do:** `CREATE FUNCTION ... LANGUAGE sql SECURITY DEFINER AS $$ SELECT ... $$;` — no search_path.

**Why it's wrong:** Attacker with `CREATE` privilege in any schema on the search path can shadow `public.companies` with their own table. Function runs as definer, queries attacker table.

**Do this instead:** Always `SECURITY DEFINER SET search_path = public`. Existing helpers in this codebase already do this; keep the pattern.

---

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Supabase Auth | Email/password, JWT in headers | Existing. JWT carries `auth.uid()` only; roles fetched from `user_roles` (not metadata, per migration `20260422130000`). |
| Supabase Storage | Bucket-per-domain (company assets, hiring docs, audio) | Existing. RLS extends to storage policies — must update those alongside DB RLS. |
| Edge Functions (Deno) | Service-role key for back-of-app work (transcribe, anonymize) | Existing. Service-role bypasses RLS — Edge Functions must re-apply scope checks themselves. |
| pg_cron | Scheduled DELETEs for audit log retention, fit-link expiry | Existing infrastructure (migration `20260416193500_hiring_cron_jobs.sql`). |
| Whisper API (via Edge Function) | 1:1 transcription | Existing. Out of scope for tenancy work. |
| WhatsApp (manual paste) | Not an integration — message generated in app, copied to clipboard | New per PROJECT.md decision. No backend hookup. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| ScopeProvider ↔ Features | Context API (read scope), `useScopedQuery` (read companyIds) | Single dependency direction: features depend on tenancy, never reverse |
| Features ↔ Supabase | Through hooks via `useScopedQuery` | Direct `supabase.from()` only allowed in `hooks/` and `integrations/`; enforce with ESLint |
| Postgres functions ↔ Triggers | Trigger calls function via `EXECUTE FUNCTION`; functions are stateless | Already the convention (`tg_set_updated_at`, `tg_log_candidate_access`) |
| RLS Policies ↔ Helper Functions | Policy `USING (... helper_function() ...)` | Helper changes are deploy-once, propagate to all policies |
| `org_units` ↔ `team_members` (legacy) | Coexist during migration; new code reads `org_units`, old code reads `teams` | Transition period only (Phase E-G); document expiration date |

---

## Quality Gate Verification

- [x] Components clearly defined with boundaries — *features/, shared/, app/providers/, integrations/* with import-direction rules
- [x] Data flow direction explicit (top-down for scope, bottom-up for events) — *Top: Scope → Query → Render; Bottom: Mutation → Invalidation → Refresh*
- [x] Postgres patterns benchmarked with explicit tradeoffs — *Adjacency list vs ltree vs nested set table; SECURITY DEFINER initPlan rationale; RLS optimization with `(select auth.uid())`*
- [x] Migration risk explicitly addressed — *Six-step expand→backfill→contract phasing; rollback cost per step; backwards-compat tactics*
- [x] LGPD audit trail design included — *data_access_log generalization, read RPC pattern, retention via pg_cron, what NOT to log*

---

## Sources

- [Supabase RLS Performance and Best Practices](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv) — confirms wrapping `auth.uid()` in `(select ...)` produces 94-99% improvements; index recommendations; `TO authenticated` clause necessity
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security) — official docs on policy structure, security definer functions, multi-tenant patterns
- [Multi-Tenant RLS Best Practices for Supabase (Makerkit)](https://makerkit.dev/blog/tutorials/supabase-rls-best-practices) — production patterns: separate accounts/memberships/role_permissions tables, security definer for hierarchy, common mistakes (RLS not enabled, missing SELECT policies)
- [PostgreSQL ltree Documentation](https://www.postgresql.org/docs/current/ltree.html) — official ltree docs; GIST index size constraints
- [Hierarchical models in PostgreSQL — Ackee blog](https://www.ackee.agency/blog/hierarchical-models-in-postgresql) — comparative analysis of adjacency list vs ltree vs nested set; "start with adjacency list" recommendation
- [PostgreSQL ltree vs WITH RECURSIVE — Cybertec](https://www.cybertec-postgresql.com/en/postgresql-ltree-vs-with-recursive/) — benchmarks showing recursive CTE on indexed adjacency list competitive with ltree on shallow/medium trees
- [Recursive CTEs in PostgreSQL for Hierarchical Data](https://dev.to/software_mvp-factory/recursive-ctes-in-postgresql-for-hierarchical-mobile-app-data-13do) — index on parent_id is mandatory; sequential scan fallback ruins performance
- [Modeling Hierarchical Tree Data in PostgreSQL — leonardqmarcq](https://leonardqmarcq.com/posts/modeling-hierarchical-tree-data) — adjacency list excels at mutations, materialized path at read-heavy stable trees
- [Supabase pgaudit](https://supabase.com/docs/guides/database/extensions/pgaudit) — official pgaudit setup; warnings about log volume; recommends scoped monitoring
- [Postgres Audit Logging Guide — Bytebase](https://www.bytebase.com/blog/postgres-audit-logging/) — three methods (pgaudit, custom triggers, native logging); pgaudit best for compliance scenarios
- [How to Implement Audit Trails with Triggers in PostgreSQL](https://oneuptime.com/blog/post/2026-01-25-postgresql-audit-trails-triggers/view) — trigger patterns for INSERT/UPDATE/DELETE auditing
- [Expand-Contract Pattern (Prisma Data Guide)](https://www.prisma.io/dataguide/types/relational/expand-and-contract-pattern) — three phases (expand/migrate/contract) with code examples
- [Zero-downtime schema migrations with pgroll — Neon](https://neon.com/guides/pgroll) — pgroll details; expand-contract is the underlying pattern
- [Zero-Downtime Database Migrations for TypeScript SaaS](https://www.averagedevs.com/blog/zero-downtime-database-migrations-typescript-saas) — multi-tenant expand-backfill-contract; batched updates with LIMIT/SKIP LOCKED
- [Query Invalidation — TanStack Query Docs](https://tanstack.com/query/v5/docs/framework/react/guides/query-invalidation) — partial-key match invalidation; recommended pattern for scoped queries
- [TanStack Query Multi-tenant Discussion #3743](https://github.com/TanStack/query/discussions/3743) — community patterns: per-tenant QueryClient (heavyweight) vs key-prefix (recommended)
- [React Query and React Context — TkDodo](https://tkdodo.eu/blog/react-query-and-react-context) — Context for scope state, React Query for server state — they compose; no synchronization issues
- [Selectively persist react-query keys (Discussion #3568)](https://github.com/TanStack/query/discussions/3568) — `PersistQueryClientProvider` selective persistence pattern
- Existing code: `/Users/eryk/Documents/APP LEVER TALETS/leverup-talent-hub/supabase/migrations/20260416193100_hiring_rls_policies.sql` — `allowed_companies()` precedent
- Existing code: `/Users/eryk/Documents/APP LEVER TALETS/leverup-talent-hub/supabase/migrations/20260422130000_align_admin_role_policies.sql` — `is_people_manager()` helper pattern
- Existing code: `/Users/eryk/Documents/APP LEVER TALETS/leverup-talent-hub/supabase/migrations/20260416193400_hiring_audit_and_locking.sql` — `tg_log_candidate_access` trigger precedent for `data_access_log` generalization

---
*Architecture research for: multi-tenant HR SaaS brownfield refactor*
*Researched: 2026-04-27*
