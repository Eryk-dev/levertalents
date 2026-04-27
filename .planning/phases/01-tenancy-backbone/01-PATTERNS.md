# Phase 1: Tenancy Backbone — Pattern Map

**Mapped:** 2026-04-27
**Source:** gsd-pattern-mapper
**Files analyzed:** 24 new + 6 modified + 1 deleted = 31 file ops
**Analogs found:** 28 / 31 (3 establish Wave 0 baseline)

---

## Summary

Phase 1 ships **three SQL migrations (A/B/C) + one frontend "migration" (D) + six pgTAP tests + two ESLint guard files**. The shape of nearly every artifact already exists in this codebase — the phase mostly *generalizes* established patterns:

- **RLS helpers** mirror `is_people_manager()` (migration `20260422130000`) and `allowed_companies()` (migration `20260416193100`) — same `STABLE SECURITY DEFINER SET search_path = public` shape.
- **Custom React hooks** copy the `applicationsKeys.byJob/detail` builder + `useQuery` shape from `src/hooks/hiring/useApplications.ts`. The chokepoint `useScopedQuery` becomes the new canonical wrapper.
- **React Context provider with `localStorage` persist** copies the dual-listener pattern (`storage` + `CustomEvent`) already in `src/hooks/useAuth.ts` for the `lt:viewAsRole` override.
- **shadcn Popover + Command + grouped list** copies `src/components/CmdKPalette.tsx` (cmdk lib already integrated, group headings + remote results structure).
- **Linear primitives** (`Btn`, `Chip`, `Kbd`, `EmptyState`) are reused unchanged.
- **`react-hook-form` + Zod** copies `src/components/hiring/CandidateForm.tsx` (schema → `zodResolver` → `useForm<FormValues>`).

**Wave 0 establishments** (no precedent — these create the canonical reference):
1. **`supabase/tests/`** directory does not exist → Phase 1 creates the entire pgTAP test infrastructure (will be the reference for Phase 2-4).
2. **`eslint-rules/`** directory does not exist → Phase 1 creates the in-tree custom rule pattern.
3. **Provider composition under `<BrowserRouter>`** — `App.tsx` currently has no global providers wrapping routes; Phase 1 adds the first, with strict mount-order requirement.

**Files with no analog**: `src/lib/scope/abilities.ts` (CASL `defineAbilityFor` — net new library to the project) and `src/lib/dates.ts` (`date-fns-tz` — net new library; existing `date-fns` usage is plain UTC).

---

## File Classification

### New SQL Migrations

| New File | Role | Data Flow | Closest Analog | Match Quality |
|----------|------|-----------|----------------|---------------|
| `supabase/migrations/{ts}_a_company_groups_and_flags.sql` | DB migration (DDL: ALTER + CREATE) | schema mutation | `supabase/migrations/20260416193000_hiring_core_entities.sql` | exact (multi-table CREATE + RLS enable) |
| `supabase/migrations/{ts}_b_org_units_and_helpers.sql` | DB migration (DDL + helpers + triggers) | schema + helper functions | `supabase/migrations/20260422130000_align_admin_role_policies.sql` | exact (CREATE FUNCTION + DROP POLICY/CREATE POLICY pattern) |
| `supabase/migrations/{ts}_c_socio_memberships_and_rls_rewrite.sql` | DB migration (DDL + RPC + backfill) | schema + RPC + backfill | `supabase/migrations/20260416193100_hiring_rls_policies.sql` + `20260422130000_align_admin_role_policies.sql` | role-match (helper + 12-policy rewrite) |

### New pgTAP Tests

| New File | Role | Data Flow | Analog | Match Quality |
|----------|------|-----------|--------|---------------|
| `supabase/tests/000-bootstrap.sql` | Test infra (helpers install) | setup-only | none in codebase | **Wave 0** (RESEARCH.md provides template) |
| `supabase/tests/001-helpers-smoke.sql` | pgTAP introspection | introspection | none in codebase | **Wave 0** |
| `supabase/tests/002-cross-tenant-leakage.sql` | pgTAP integration (CRITICAL) | auth-gated reads | none in codebase | **Wave 0** (RESEARCH.md § Sample Cross-Tenant — copy-paste ready) |
| `supabase/tests/003-org-unit-descendants.sql` | pgTAP function test | recursive CTE | none in codebase | **Wave 0** |
| `supabase/tests/004-anti-cycle-trigger.sql` | pgTAP trigger test | DML rejection | none in codebase | **Wave 0** |
| `supabase/tests/005-resolve-default-scope.sql` | pgTAP RPC test | RPC return-value | none in codebase | **Wave 0** |

### New Frontend Files

| New File | Role | Data Flow | Closest Analog | Match Quality |
|----------|------|-----------|----------------|---------------|
| `src/contexts/ScopeProvider.tsx` (or `src/app/providers/ScopeProvider.tsx`) | Context provider + localStorage persist | URL → Context → consumers | `src/hooks/useAuth.ts` | role-match (single useState + dual `storage`+`CustomEvent` listener) |
| `src/hooks/useScopedQuery.ts` (or `src/shared/data/useScopedQuery.ts`) | Custom hook (chokepoint) | Context → useQuery wrapper | `src/hooks/hiring/useApplications.ts` (useApplicationsByJob) | exact (useQuery + queryKey + supabase call) |
| `src/hooks/useScope.ts` | Custom hook (context consumer) | Context → reader | none — trivial; export from ScopeProvider directly | role-match |
| `src/lib/scope/store.ts` (Zustand) | Store (persisted) | localStorage ↔ subscribers | `src/hooks/useAuth.ts` `VIEW_AS_STORAGE_KEY` block (lines 7-15, 104-112) | role-match (different lib, same persist concept) |
| `src/lib/scope/url.ts` (parser/serializer) | Pure utility (string ↔ object) | URL string → typed object | `src/lib/supabaseError.ts` (pure mapping fn) | role-match (pure function library style) |
| `src/lib/scope/abilities.ts` (CASL) | Ability builder | role + ctx → ability tree | **none** — CASL is new to the project | **NO ANALOG** (RESEARCH.md § Pattern 4 is the reference) |
| `src/lib/logger.ts` | Util (PII-scrubbing wrapper) | console.* with redaction | `src/lib/supabaseError.ts` (similar utility shape, plain TS) | role-match |
| `src/lib/dates.ts` (`formatBR`) | Util (timezone formatter) | Date → pt-BR string | **none** — `date-fns-tz` is new; existing uses plain `date-fns` | **NO ANALOG** (RESEARCH.md § Gate 5 is the reference) |
| `src/components/scope/ScopeTrigger.tsx` | UI component (header trigger button) | scope state → render button | `src/components/PendingTasksDropdown.tsx` lines 109-118 (Btn-style trigger) | role-match (trigger UI shape) |
| `src/components/scope/ScopeDropdown.tsx` | UI component (Popover + Command) | trigger click → grouped list | `src/components/CmdKPalette.tsx` lines 211-309 | exact (cmdk + grouped Items + search input) |
| `src/components/scope/ScopeFallbackToast.tsx` | UI side-effect | invalid URL → toast | `src/lib/supabaseError.ts` (toast.error from sonner) | role-match |
| `src/components/scope/EmptyScopeState.tsx` | UI component (full-page) | scope === null → render | `src/components/EmptyState.tsx` (wrapper) + `src/components/primitives/EmptyState.tsx` `variant="decorated"` | exact (existing primitive) |
| `eslint-rules/no-supabase-from-outside-hooks.js` | ESLint custom rule | AST traversal | **none** — Wave 0 establishment | **NO ANALOG** (RESEARCH.md § Gate 2 is the reference) |

### Modified Existing Files

| File | Role of Change | Insertion Point | Surrounding Context to Preserve |
|------|----------------|-----------------|--------------------------------|
| `src/components/Layout.tsx` | Mount `ScopeProvider` (if not done at App level) | After line 13 (`<div className="flex h-screen">`), wrap right-side `<div className="flex-1...">` | Sidebar, ViewAsBanner, Header, PageTransition, CmdKPalette must remain |
| `src/components/Header.tsx` | Insert `<ScopeTrigger />` in right cluster | Line 74 — INSIDE the right cluster `<div className="flex items-center gap-1.5 shrink-0">`, BEFORE `<PendingTasksDropdown />` (line 75) | Breadcrumbs (lines 39-71) untouched; "Criar" Btn stays rightmost |
| `src/components/MobileNav.tsx` | Optional: replicate trigger in header (per UI-SPEC § 7 the mobile trigger lives in Header, not in Sheet) | **No change to MobileNav itself** — Mobile trigger renders via `Header.tsx` (responsive layout); MobileNav `Sheet` content stays nav-only | All existing Sheet content (lines 16-87) preserved |
| `src/App.tsx` | Wrap routes with `<ScopeProvider>` (and `<AbilityProvider>`) inside `<BrowserRouter>` | After line 79 (`<BrowserRouter>`) and before line 80 (`<Routes>`); ONLY for the `isAuthenticated ? <Layout />` branch (lines 85-287) | `QueryClientProvider`, `TooltipProvider`, Toasters, ErrorBoundary order preserved |
| `eslint.config.js` | Register custom rule + `@tanstack/eslint-plugin-query` | Add import line after line 5; add `pluginQuery.configs['flat/recommended']` to `extends` (line 10); add `lever: { rules: {...} }` block to `plugins` (line 17); add `'lever/no-supabase-from-outside-hooks': 'error'` to rules | Existing `react-hooks`, `react-refresh`, `@typescript-eslint/no-unused-vars: off` rules preserved |
| `package.json` | Add deps: `@casl/ability`, `@casl/react`, `zustand`, `vitest`, `@testing-library/react`, `msw`, `date-fns-tz`, `@tanstack/eslint-plugin-query`, `@sentry/react` (install only); upgrade `@hookform/resolvers` 3.10 → 5.2.2; upgrade `react-hook-form` 7.61 → 7.73 | Lines 17, 58 (resolvers + RHF version bumps); add new deps alphabetically; add devDeps for test stack | All existing deps and scripts preserved |

### Deleted Files

| File | Why |
|------|-----|
| `bun.lockb` | QUAL-05 — npm is canonical (CLAUDE.md); dual lockfile = drift risk |

---

## Pattern Assignments

### `supabase/migrations/{ts}_a_company_groups_and_flags.sql` (DB migration, schema mutation)

**Analog:** `supabase/migrations/20260416193000_hiring_core_entities.sql` (creates 17 hiring tables) — but most directly the **header comment + RLS enablement + helper-function pattern** comes from `supabase/migrations/20260422130000_align_admin_role_policies.sql`.

**Header comment style** (from `20260422130000_align_admin_role_policies.sql` lines 1-13):
```sql
-- Fix P0 bug: `admin` role is in app_role enum (since 20251009205119) but
-- only policies for companies/teams/team_members/user_roles were updated.
-- ...
-- This migration introduces a single helper `is_people_manager(uuid)` that
-- returns true for admin/socio/rh and rewrites the affected policies to
-- use it, plus backfills any missing user_roles rows...
```
**To copy:** Multi-line `--` comment at top documenting *why* + numbered sections (`-- 1) Helper`, `-- 2) climate_surveys`).

**ALTER TABLE + ADD COLUMN with `IF NOT EXISTS`** (RESEARCH.md § Migration A):
```sql
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS performance_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS rs_enabled          boolean NOT NULL DEFAULT false;
```

**`ENABLE ROW LEVEL SECURITY` immediately after `CREATE TABLE`** (existing pattern in 17+ migrations):
```sql
ALTER TABLE public.company_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_groups:select_authenticated"
  ON public.company_groups FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "company_groups:mutate_managers"
  ON public.company_groups FOR ALL TO authenticated
  USING (public.is_people_manager((SELECT auth.uid())))
  WITH CHECK (public.is_people_manager((SELECT auth.uid())));
```

**Things NOT to copy:**
- `auth.uid()` *without* `(SELECT ...)` wrap — this is the legacy hiring policy idiom (see `20260416193100_hiring_rls_policies.sql` lines 41, 53). Phase 1 must use `(SELECT auth.uid())` everywhere (RBAC-10, P-AP-3).
- Inline `EXISTS` joins for tenant scoping (e.g., `EXISTS (SELECT 1 FROM job_openings j WHERE j.id = job_opening_id)` — line 86) — these don't get initPlan caching. Phase 1 helpers `visible_companies(uid)`/`visible_org_units(uid)` are the canonical replacement.

---

### `supabase/migrations/{ts}_b_org_units_and_helpers.sql` (DB migration, schema + helpers + triggers)

**Analog:** `supabase/migrations/20260422130000_align_admin_role_policies.sql` lines 14-32 (the exact `is_people_manager` helper shape — Phase 1's `visible_companies`/`visible_org_units` replicate this 1:1).

**Helper function pattern** (lines 14-32 of `20260422130000_align_admin_role_policies.sql`):
```sql
CREATE OR REPLACE FUNCTION public.is_people_manager(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin'::app_role, 'socio'::app_role, 'rh'::app_role)
  );
$$;

COMMENT ON FUNCTION public.is_people_manager IS
  'True if the user has admin, socio, or rh role. Use in RLS policies for manage/view-all cases.';
```
**To copy literally:** `LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public` modifier order; `_user_id uuid` parameter naming with leading underscore; `public.has_role(...)` calls; `COMMENT ON FUNCTION` at the end.

**Existing `allowed_companies` helper as DIRECT precedent** (`supabase/migrations/20260416193100_hiring_rls_policies.sql` lines 14-33):
```sql
CREATE OR REPLACE FUNCTION public.allowed_companies(_profile_id UUID)
RETURNS UUID[]
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN public.has_role(_profile_id, 'admin'::public.app_role)
      OR public.has_role(_profile_id, 'socio'::public.app_role)
      OR public.has_role(_profile_id, 'rh'::public.app_role) THEN
        (SELECT COALESCE(array_agg(id), '{}'::uuid[]) FROM public.companies)
    WHEN public.has_role(_profile_id, 'lider'::public.app_role) THEN
        (SELECT COALESCE(array_agg(DISTINCT t.company_id), '{}'::uuid[])
         FROM public.team_members tm
         JOIN public.teams t ON t.id = tm.team_id
         WHERE tm.leader_id = _profile_id)
    ELSE '{}'::uuid[]
  END;
$$;
```
**To copy:** `RETURNS UUID[]` + `CASE` chain + `COALESCE(array_agg(...), '{}'::uuid[])` for empty array. Phase 1 generalizes to 5 role branches (admin/rh/socio/lider/liderado-or-colaborador) and replaces team_members joins with `socio_company_memberships` + `unit_leaders` + `org_unit_members`.

**Trigger function pattern** (`20260416193100_hiring_rls_policies.sql` and others use `CREATE TRIGGER tg_*_updated_at` extensively):
- Phase 1 adds `tg_org_units_no_cycle` and `tg_org_units_same_company_as_parent` — same naming convention (`tg_<table>_<purpose>`).

**Things NOT to copy:**
- `RETURNS UUID[]` capitalization variations — codebase uses both `UUID[]` and `uuid[]`. Phase 1 should use lowercase `uuid[]` (matches RESEARCH.md and `20260422130000` precedent which uses `uuid` lowercase).
- Inline string concat policies; the 12 `hiring_rls_policies` (lines 35-200+) demonstrate the verbose `OR has_role(...) OR has_role(...) OR has_role(...)` pattern — Phase 1's helper-driven approach (`company_id = ANY(public.visible_companies((SELECT auth.uid())))`) replaces this.

---

### `supabase/migrations/{ts}_c_socio_memberships_and_rls_rewrite.sql` (DB migration, schema + RPC + backfill + RLS rewrite)

**Analog:** Composite — schema from `20260416193000_hiring_core_entities.sql`, RLS rewrite from `20260422130000_align_admin_role_policies.sql`, and RPC declaration pattern from elsewhere in codebase.

**RPC `resolve_default_scope` pattern** — RESEARCH.md § Migration C provides full SQL; closest precedent for `LANGUAGE plpgsql STABLE SECURITY DEFINER` returning text:
- The existing `is_people_manager` is `LANGUAGE sql`. For `resolve_default_scope` (which has procedural `IF/ELSIF` chains), use `LANGUAGE plpgsql` — not in current codebase, so Phase 1 establishes the precedent.
- **`REVOKE ALL ... FROM PUBLIC; GRANT EXECUTE ... TO authenticated`** is documented in RESEARCH.md § Migration C lines 1336-1337 — also new for this codebase.

**Idempotent backfill DO block** — RESEARCH.md § Migration C provides:
```sql
DO $$
DECLARE
  grupo_lever_id uuid;
BEGIN
  SELECT id INTO grupo_lever_id FROM public.company_groups WHERE slug = 'grupo-lever';
  -- ... idempotent UPDATE / INSERT ON CONFLICT DO NOTHING / ...
END $$;
```
**To copy:** Wrap multi-statement backfills inside `DO $$ ... END $$` with `DECLARE` block for variables; use `ON CONFLICT (...) DO NOTHING` or `DO UPDATE SET` for idempotency.

**RLS policy rewrite pattern** (from `20260422130000_align_admin_role_policies.sql` lines 35-49):
```sql
DROP POLICY IF EXISTS "Everyone can view active surveys" ON public.climate_surveys;
DROP POLICY IF EXISTS "RH and Socio can manage surveys" ON public.climate_surveys;
DROP POLICY IF EXISTS "Active surveys visible to all, drafts to managers" ON public.climate_surveys;
DROP POLICY IF EXISTS "People managers manage surveys" ON public.climate_surveys;

CREATE POLICY "Active surveys visible to all, drafts to managers"
  ON public.climate_surveys FOR SELECT
  TO authenticated
  USING (status = 'active' OR public.is_people_manager(auth.uid()));
```
**To copy:** `DROP POLICY IF EXISTS` for **every variant name that may exist** before re-creating (the migration drops 4 names because of historical churn); always `TO authenticated`; `USING` for SELECT/UPDATE/DELETE, `WITH CHECK` for INSERT/UPDATE.

**Apply `(SELECT auth.uid())` to every rewrite** — RBAC-10 audit. The existing migration uses bare `auth.uid()`; Phase 1 must wrap as `(SELECT auth.uid())` for initPlan caching (94-99% improvement per Supabase docs).

**Things NOT to copy:**
- The naming style "Everyone can view…" / "RH and Socio can manage…" (sentence-case English-leaning). Phase 1 uses canonical `<table>:<action>:<role>` style: `companies:select`, `socio_memberships:select_own_or_manager`. RESEARCH.md uses this pattern.
- Bare `auth.uid()` calls. Always wrap in `(SELECT auth.uid())`.

---

### `supabase/tests/000-bootstrap.sql` through `005-resolve-default-scope.sql` (pgTAP tests)

**Analog:** **Wave 0** — the `supabase/tests/` directory does not exist in the codebase. Phase 1 establishes the entire pgTAP infrastructure.

**Reference pattern (from RESEARCH.md § Sample Cross-Tenant pgTAP Test, lines 1700-1784):**

```sql
begin;
select plan(6);

-- Setup: create users with helpers
select tests.create_supabase_user('rh_a@test.com');
select tests.create_supabase_user('rh_b@test.com');

select tests.authenticate_as_service_role();

-- Create companies
insert into public.companies (id, name) values
  ('00000000-0000-0000-0000-00000000000a', 'Empresa A'),
  ('00000000-0000-0000-0000-00000000000b', 'Empresa B');

-- TEST 1
select tests.authenticate_as('rh_a@test.com');
select results_eq(
  'select count(*) from public.job_openings',
  array[2::bigint],
  'rh@A sees BOTH openings (RBAC-03: rh has global access)'
);

-- TEST 2 (negative — most important)
select throws_ok(
  $$insert into public.job_openings (company_id, title, status, created_by)
    values ('00000000-0000-0000-0000-00000000000b', 'Hacked', 'open', auth.uid())$$,
  '42501',
  'new row violates row-level security policy',
  'socio@A blocked from creating opening in company B'
);

select * from finish();
rollback;
```

**To copy:**
- `begin; ... rollback;` for auto-cleanup (no test data leaks between files).
- `select plan(N);` declares assertion count; `select * from finish();` finalizes.
- `tests.create_supabase_user('email@test.com')` + `tests.authenticate_as('email@test.com')` for auth context (basejump-supabase_test_helpers).
- Three core assertions: `results_eq` (positive read), `throws_ok` with code `42501` (negative — RLS denial), `is_empty` for empty-set checks.
- Hard-coded UUIDs for fixture data (improves test readability).

**Per-file role:**
- `000-bootstrap.sql` — installs basejump helpers (one-time, runs first per filename ordering).
- `001-helpers-smoke.sql` — verifies `visible_companies`/`visible_org_units`/`org_unit_descendants`/`resolve_default_scope` exist with `STABLE SECURITY DEFINER`. Uses `pg_proc` introspection + `has_function()` from pgTAP.
- `002-cross-tenant-leakage.sql` — **CRITICAL gate**. RESEARCH.md provides the full file (~80 lines). Copy verbatim.
- `003-org-unit-descendants.sql` — inserts a 5-level synthetic tree, asserts `array_length(public.org_unit_descendants(root_id), 1) = 5`.
- `004-anti-cycle-trigger.sql` — `throws_ok` on `UPDATE org_units SET parent_id = grandchild_id WHERE id = root_id` (must error: 'cycle detected').
- `005-resolve-default-scope.sql` — calls `resolve_default_scope(uid)` for each role, asserts return string format `^(company|group):[0-9a-f-]+$`.

**Things NOT to copy:** Nothing — this is greenfield establishment.

---

### `src/contexts/ScopeProvider.tsx` (Context provider, dual-source state, persisted)

**Analog:** `src/hooks/useAuth.ts` — same shape (state from auth + state from localStorage + dual listener for cross-tab sync).

**Dual-listener cross-tab sync pattern** (from `src/hooks/useAuth.ts` lines 82-103):
```typescript
// Sync viewAsRole between hook instances and across tabs.
useEffect(() => {
  const handleCustom = (e: Event) => {
    const next = (e as CustomEvent<AppRole | null>).detail ?? null;
    setViewAsRoleState(next);
  };
  const handleStorage = (e: StorageEvent) => {
    if (e.key !== VIEW_AS_STORAGE_KEY) return;
    setViewAsRoleState(
      e.newValue && (VALID_ROLES as string[]).includes(e.newValue)
        ? (e.newValue as AppRole)
        : null,
    );
  };
  window.addEventListener(VIEW_AS_EVENT, handleCustom);
  window.addEventListener('storage', handleStorage);
  return () => {
    window.removeEventListener(VIEW_AS_EVENT, handleCustom);
    window.removeEventListener('storage', handleStorage);
  };
}, []);
```
**To copy:** `useEffect` with cleanup → register both `storage` event AND custom event. Phase 1 replaces `CustomEvent` with `BroadcastChannel('leverup:scope')` (RESEARCH.md § Pattern 3) but keeps `storage` event as fallback for Safari < 15.4 (RESEARCH.md § Common Pitfalls #3).

**localStorage write pattern** (from `src/hooks/useAuth.ts` lines 104-112):
```typescript
const setViewAsRole = useCallback((role: AppRole | null) => {
  if (typeof window === 'undefined') return;
  if (role) {
    window.localStorage.setItem(VIEW_AS_STORAGE_KEY, role);
  } else {
    window.localStorage.removeItem(VIEW_AS_STORAGE_KEY);
  }
  window.dispatchEvent(new CustomEvent<AppRole | null>(VIEW_AS_EVENT, { detail: role }));
}, []);
```
**To copy:** `typeof window === 'undefined'` guard + `useCallback` wrapping setter + dispatch event after setItem. Phase 1 prefers Zustand `persist` middleware (handles guard + setItem automatically), but the same pattern emerges.

**Provider boilerplate** — RESEARCH.md § Pattern 3 lines 608-781 provides the full `ScopeProvider` implementation. Copy that.

**`mounted` flag pattern** (from `src/hooks/useAuth.ts` lines 23-77):
```typescript
useEffect(() => {
  let mounted = true;
  const initAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!mounted) return;
    // ...
  };
  initAuth();
  return () => { mounted = false; subscription.unsubscribe(); };
}, []);
```
**To copy:** `let mounted = true` + `if (!mounted) return` checks before each `setState` call inside async functions. RESEARCH.md uses `let aborted = false` — same idea, different name. Pick one (`aborted`) consistent with abort semantics for the RPC call.

**Things NOT to copy:**
- `useAuth` returns plain object with multiple values (`{ user, loading, userRole, ... }`) — Phase 1's ScopeProvider uses Context (`useScope()` hook reads it) for performance (avoid prop drilling).
- The `realRole` vs `viewAsRole` indirection is auth-specific — ScopeProvider has flatter state.

---

### `src/hooks/useScopedQuery.ts` (chokepoint hook)

**Analog:** `src/hooks/hiring/useApplications.ts` — exact data-fetching shape (useQuery + queryKey + supabase.from).

**Query key namespace pattern** (from `src/hooks/hiring/useApplications.ts` lines 13-18):
```typescript
export const applicationsKeys = {
  all: ["hiring", "applications"] as const,
  byJob: (jobId: string) => ["hiring", "applications", "by-job", jobId] as const,
  detail: (id: string) => ["hiring", "applications", "detail", id] as const,
  byCandidate: (candidateId: string) => ["hiring", "applications", "by-candidate", candidateId] as const,
};
```
**To copy:** Centralize key builders in a `*Keys` object exported from the hook file. Phase 1's `useScopedQuery` injects the `['scope', scope.id, scope.kind]` prefix BEFORE these keys, so consumers continue to write `applicationsKeys.byJob(jobId)` and the chokepoint composes it.

**useQuery shape** (from `src/hooks/hiring/useApplications.ts` lines 24-41):
```typescript
export function useApplicationsByJob(jobId: string | undefined) {
  return useQuery({
    queryKey: applicationsKeys.byJob(jobId ?? "none"),
    enabled: !!jobId,
    queryFn: async (): Promise<ApplicationWithCandidate[]> => {
      if (!jobId) return [];
      const { data, error } = await supabase
        .from("applications")
        .select("*, candidate:candidates!applications_candidate_id_fkey(...)")
        .eq("job_opening_id", jobId)
        .order("stage_entered_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as ApplicationWithCandidate[];
    },
  });
}
```
**To copy:**
- Generic `<TData, TError = Error>` typing on the wrapper.
- `enabled: !!jobId` becomes `enabled: !!scope && !isResolving && (options?.enabled ?? true)`.
- `if (!jobId) return [];` becomes `if (!scope) return Promise.resolve([] as unknown as TData);`.
- `if (error) throw error;` propagates Supabase errors → React Query.

**Existing `useVisibleCompanies` precedent** (`src/lib/hiring/rlsScope.ts` lines 12-52):
```typescript
export function useVisibleCompanies(): { companyIds: string[]; isLoading: boolean; canSeeAll: boolean } {
  const { user, userRole } = useAuth();
  const canSeeAll = userRole === "admin" || userRole === "socio" || userRole === "rh";

  const { data: companyIds = [], isLoading } = useQuery({
    queryKey: ["visible-companies", user?.id, userRole],
    enabled: !!user?.id && !!userRole,
    queryFn: async (): Promise<string[]> => {
      // ... role-branched fetch
    },
  });

  return { companyIds, isLoading, canSeeAll };
}
```
**To copy:** This is Phase 1's `useVisibleScopes` ancestor — same `useAuth` + `useQuery` + role-branching shape. Phase 1 generalizes by sourcing from `visible_companies(uid)` RPC instead of inline `team_members` joins. **`useVisibleCompanies` stays as a transitional alias during Phase 1** (legacy callers); Phase 4 (Migration G) drops it.

**Things NOT to copy:**
- Hard-coded `["visible-companies", user?.id, userRole]` queryKey — Phase 1's `useScopedQuery` always starts with `['scope', scope.id, scope.kind, ...]`.
- Inline role check (`userRole === "admin" || "socio" || "rh"`) — moved to `defineAppAbility` (CASL) and `visible_companies` RPC.

---

### `src/lib/scope/store.ts` (Zustand persisted store)

**Analog:** `src/hooks/useAuth.ts` lines 7-15 (the `VIEW_AS_STORAGE_KEY` literal const + `readStoredViewAs` function).

**localStorage namespace pattern** (`src/hooks/useAuth.ts` lines 7-9):
```typescript
const VIEW_AS_STORAGE_KEY = 'lt:viewAsRole';
const VIEW_AS_EVENT = 'lt:view-as-role-changed';
const VALID_ROLES: AppRole[] = ['admin', 'socio', 'lider', 'rh', 'colaborador'];
```
**To copy:** Module-level UPPER_SNAKE_CASE constants for storage keys. Phase 1's namespace is `leverup:scope` (RESEARCH.md confirms — distinct from existing `lt:*` to avoid collision).

**Zustand `persist` snippet** (RESEARCH.md § Pattern 3 lines 622-636):
```typescript
export const useScopeStore = create<ScopeStore>()(
  persist(
    (set) => ({
      scopeToken: null,
      setScopeToken: (scopeToken) => set({ scopeToken }),
    }),
    {
      name: 'leverup:scope',
      storage: createJSONStorage(() => localStorage),
      version: 1,
      partialize: (state) => ({ scopeToken: state.scopeToken }),
    },
  ),
);
```
**To copy:** Always set `version: 1` (enables future migrations); always use `partialize` to whitelist persisted fields (prevents leaking transient state to localStorage).

---

### `src/lib/scope/url.ts` (parser/serializer)

**Analog:** `src/lib/supabaseError.ts` (pure utility module — error mapping with type guards).

**Pure-function module style** (from `src/lib/supabaseError.ts` lines 1-27):
```typescript
import { PostgrestError } from "@supabase/supabase-js";

const RLS_CODE = "42501";

const FRIENDLY_MESSAGES: Record<string, string> = {
  "23505": "Registro duplicado. Verifique se já não existe.",
  // ...
};

function isPostgrestError(err: unknown): err is PostgrestError {
  return typeof err === "object" && err !== null && "code" in err && "message" in err;
}

export function formatSupabaseError(err: SupabaseLikeError, fallback = "Algo deu errado"): string {
  if (!err) return fallback;
  if (isPostgrestError(err)) {
    return FRIENDLY_MESSAGES[err.code] ?? err.message ?? fallback;
  }
  if (err instanceof Error) return err.message || fallback;
  return fallback;
}
```
**To copy:**
- Module-level constants (`const RLS_CODE = "42501"`).
- Custom type predicate (`function isPostgrestError(...): err is PostgrestError`).
- Pure exports — no React imports, no side effects.
- Defensive null handling with explicit fallbacks.

**Phase 1 implementation** (RESEARCH.md § Pattern 3 lines 596-606):
```typescript
export function parseScopeToken(token: string | null): { kind: 'company' | 'group'; id: string } | null {
  if (!token) return null;
  const [kind, id] = token.split(':');
  if ((kind !== 'company' && kind !== 'group') || !id) return null;
  return { kind: kind as 'company' | 'group', id };
}

export function serializeScope(scope: Pick<Scope, 'kind' | 'id'>): string {
  return `${scope.kind}:${scope.id}`;
}
```

---

### `src/lib/scope/abilities.ts` (CASL ability builder)

**Analog:** **NO ANALOG** — CASL is new to the codebase. RESEARCH.md § Pattern 4 (lines 871-972) provides the full reference.

**Reference structure to copy (RESEARCH.md):**
```typescript
import { AbilityBuilder, createMongoAbility, type MongoAbility } from '@casl/ability';
import type { AppRole } from '@/hooks/useAuth';

export type Subject = 'Company' | 'CompanyGroup' | 'OrgUnit' | ...;
export type Action = 'manage' | 'create' | 'read' | 'update' | 'delete';
export type AppAbility = MongoAbility<[Action, Subject]>;

interface AbilityContext {
  role: AppRole;
  userId: string;
  visibleCompanyIds: string[];
  visibleOrgUnitIds: string[];
  ledOrgUnitIds: string[];
  ownOrgUnitIds: string[];
}

export function defineAppAbility(ctx: AbilityContext): AppAbility {
  const { can, cannot, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

  if (ctx.role === 'admin') {
    can('manage', 'all');
    return build();
  }
  // ... 4 more role branches
  return build();
}
```

**Adjacent code style** to follow (from `src/hooks/useAuth.ts` line 5):
```typescript
export type AppRole = 'admin' | 'socio' | 'lider' | 'rh' | 'colaborador';
```
- Use the existing `AppRole` type — DO NOT redeclare. Phase 1 adds `'liderado'` to it (in same file).
- String-literal unions for Subject/Action (PascalCase Subjects, lowercase actions).

---

### `src/lib/logger.ts` (PII-scrubbing wrapper)

**Analog:** `src/lib/supabaseError.ts` — same module shape (utility-only, defensive).

**Existing logging convention** (from `src/lib/supabaseError.ts` lines 33-37):
```typescript
if (err && typeof err === "object" && "code" in err && err.code === RLS_CODE) {
  console.warn("[RLS] blocked by policy:", err);
} else {
  console.error("[supabase]", err);
}
```
**To copy:**
- Prefix every log with bracketed context tag (`[RLS]`, `[supabase]`). Phase 1's `logger` wraps the call, but new code should still pass tagged messages.

**Reference implementation** — RESEARCH.md § Gate 4 lines 1531-1578 provides full file.

**Things NOT to copy:**
- Direct `console.warn`/`console.error` from this file — Phase 1's whole point is to centralize. Eventually `supabaseError.ts` should switch to `logger.warn(...)` / `logger.error(...)`, but that mass refactor is Phase 4 (RESEARCH.md § Gate 4 "Adoption strategy").

---

### `src/lib/dates.ts` (`formatBR` — `date-fns-tz`)

**Analog:** **NO ANALOG** — `date-fns-tz` not in deps. Existing `date-fns` usage (e.g., `src/components/PendingTasksDropdown.tsx` line 29):
```typescript
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
```

**Reference implementation** — RESEARCH.md § Gate 5 lines 1590-1622 provides full file (functions: `formatBR`, `formatBRDate`, `formatBRTime`, `formatBRRelative`).

**Things NOT to copy:**
- `new Date(x).toLocaleString('pt-BR', ...)` — depends on user's browser timezone (RESEARCH.md § Don't Hand-Roll). Always use `formatInTimeZone(d, 'America/Sao_Paulo', ...)`.

---

### `src/components/scope/ScopeTrigger.tsx` (header trigger button)

**Analog:** `src/components/PendingTasksDropdown.tsx` (lines 109-118 — DropdownMenuTrigger pattern) PLUS `src/components/Header.tsx` (line 76-83 — `<Btn variant="secondary" size="sm">` pattern).

**Trigger button pattern** (Header.tsx lines 76-83):
```tsx
<Btn
  variant="secondary"
  size="sm"
  icon={<Plus className="w-3.5 h-3.5" strokeWidth={2} />}
  onClick={() => window.dispatchEvent(new CustomEvent("open-cmdk"))}
>
  Criar
</Btn>
```
**To copy:** `<Btn>` from LinearKit, `variant="ghost"` (per UI-SPEC.md § 1), `size="sm"`. Icon prop on the Btn (lucide), text child for label, `iconRight` for `<ChevronDown />`.

**Disabled state with Tooltip wrap** — UI-SPEC.md § 3 says wrap disabled trigger in Radix Tooltip with `Seu escopo é fixo`. The `<Tooltip>` from `src/components/ui/tooltip.tsx` is already mounted globally via `<TooltipProvider>` in App.tsx (line 75) — confirmed in CONVENTIONS.md.

**ALL Btn focus-ring pattern** (LinearKit.tsx lines 51-52):
```tsx
"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-1",
```
**Already inherited** by using `<Btn>` — do NOT duplicate.

**Things NOT to copy:**
- `<Button>` from `src/components/ui/button.tsx` (used by PendingTasksDropdown lines 18, 111). Phase 1 uses `<Btn>` from LinearKit for visual consistency with rest of header (the "Criar" button uses Btn).
- `LeverArrow` icon — UI-SPEC.md explicitly prohibits LeverArrow in this surface; trigger uses `Building2` (company) or `Layers` (group).

---

### `src/components/scope/ScopeDropdown.tsx` (Popover + Command + grouped list)

**Analog:** `src/components/CmdKPalette.tsx` — exact same primitive composition (Command + CommandInput + CommandGroup + CommandItem + CommandEmpty).

**Command rendering with grouped results** (CmdKPalette.tsx lines 217-263):
```tsx
<Command className="bg-surface" shouldFilter={false}>
  <div className="flex items-center gap-2 px-3.5 py-3 border-b border-border">
    <CommandInput
      value={query}
      onValueChange={setQuery}
      placeholder="Buscar candidatos, vagas, PDIs, pessoas…"
      className="h-auto border-0 text-[14px] placeholder:text-text-subtle px-0"
    />
    {/* ... loader / kbd ... */}
  </div>
  <CommandList className="max-h-[420px] p-1.5">
    <CommandEmpty className="py-5 text-center text-[13px] text-text-subtle">
      {showEmptyHint ? "Digite ao menos 2 caracteres." : "Nada encontrado."}
    </CommandEmpty>

    {remoteGroups.map(({ kind, rows }) => {
      const meta = REMOTE_META[kind];
      const Icon = meta.icon;
      return (
        <CommandGroup key={`remote-${kind}`} heading={meta.label}>
          {rows.map((row) => (
            <CommandItem
              key={`${kind}-${row.id}`}
              value={`remote-${kind}-${row.id}`}
              onSelect={() => selectRemote(row)}
              className="gap-2.5 py-2 px-2.5 text-[13px] data-[selected=true]:bg-bg-subtle data-[selected=true]:text-text cursor-pointer"
            >
              <Icon className="w-3.5 h-3.5 text-text-muted" strokeWidth={1.75} />
              <div className="flex-1 min-w-0">
                <div className="truncate">{row.title}</div>
                {row.subtitle && (
                  <div className="text-[11.5px] text-text-subtle truncate">{row.subtitle}</div>
                )}
              </div>
              <ArrowRight className="w-3 h-3 text-text-subtle" strokeWidth={1.75} />
            </CommandItem>
          ))}
        </CommandGroup>
      );
    })}
  </CommandList>
</Command>
```
**To copy:**
- `<Command shouldFilter={true}>` — Phase 1 uses cmdk's built-in fuzzy matching (UI-SPEC.md says `shouldFilter=true` default — opposite of CmdKPalette which does its own filtering).
- `<CommandInput>` placeholder + `<CommandEmpty>` for "Nada encontrado…" wording.
- `<CommandGroup heading="GRUPOS">` and `<CommandGroup heading="EMPRESAS">` (UI-SPEC.md eyebrow text — cmdk renders heading prop with role="presentation").
- `<CommandItem>` className composition — `data-[selected=true]:bg-bg-subtle` for keyboard navigation hover; `gap-2.5 py-2 px-2.5 text-[13px]`.
- Icon (lucide) + label + optional right-side decoration (Phase 1: `<Check />` for selected).

**Wrap with Popover** (UI-SPEC.md § 2 says Popover, not Dialog):
- Use `src/components/ui/popover.tsx` (`<Popover><PopoverTrigger asChild><Btn ... /></PopoverTrigger><PopoverContent align="end" sideOffset={6}>{...}</PopoverContent></Popover>`).
- The `align="end"` + `sideOffset={6}` are UI-SPEC.md requirements; defaults are `center`/`4`.

**Things NOT to copy:**
- The Dialog wrapper around Command (CmdKPalette uses `<Dialog>` to make the palette modal-blocking). Phase 1 uses `<Popover>` because the dropdown is non-modal.
- `shouldFilter={false}` + manual filtering (CmdKPalette line 219) — Phase 1 uses default `true` for cmdk's built-in fuzzy scorer.
- `Kbd>Esc</Kbd>` inside the input row — not in UI-SPEC.md for this dropdown.

---

### `src/components/scope/ScopeFallbackToast.tsx` (URL fallback toast)

**Analog:** `src/lib/supabaseError.ts` lines 29-39 (toast.error pattern from sonner) — but Phase 1 uses **neutral** `toast()` not `toast.error()`.

**Toast import + invocation** (`src/lib/supabaseError.ts` lines 1-3, 32):
```typescript
import { toast } from "sonner";

// ...

if (!opts?.silent) toast.error(finalMessage);
```
**To copy:** `import { toast } from "sonner"`. Phase 1 calls `toast(message)` (neutral, not red).

**This file is a tiny utility** — likely just an exported function:
```typescript
import { toast } from 'sonner';
export function emitScopeFallbackToast(scopeName: string) {
  toast(`Você não tem acesso àquele escopo. Abrindo ${scopeName}.`);
}
```
**Or inlined** at the call site in `ScopeProvider.tsx`. RESEARCH.md § Pattern 3 lines 695-700 inlines it.

---

### `src/components/scope/EmptyScopeState.tsx` (sócio sem empresa)

**Analog:** `src/components/EmptyState.tsx` (wrapper) + `src/components/primitives/EmptyState.tsx` (primitive).

**Existing wrapper** (`src/components/EmptyState.tsx` lines 1-21):
```typescript
import { LucideIcon, Info } from "lucide-react";
import { EmptyState as EmptyStatePrimitive } from "@/components/primitives/EmptyState";

interface EmptyStateProps {
  message: string;
  title?: string;
  icon?: LucideIcon;
  className?: string;
}

export function EmptyState({ message, title, icon = Info, className }: EmptyStateProps) {
  return (
    <EmptyStatePrimitive
      title={title || message}
      message={title ? message : undefined}
      icon={icon}
      variant="decorated"
      className={className}
    />
  );
}
```
**To copy:** Wrap the primitive with `variant="decorated"` (matches UI-SPEC.md § 5).

**Primitive variant="decorated"** (`src/components/primitives/EmptyState.tsx` lines 47-67):
```tsx
return (
  <div
    className={cn(
      "rounded-md bg-surface border border-dashed border-border-strong",
      "flex flex-col items-center justify-center text-center px-6 py-10",
      className,
    )}
  >
    {Icon && (
      <div className="mb-3 grid h-9 w-9 place-items-center rounded-md bg-bg-subtle text-text-muted">
        <Icon className="h-4 w-4" strokeWidth={1.75} />
      </div>
    )}
    <h3 className="text-[14px] font-medium text-text">{title}</h3>
    {message && (
      <p className="mt-1 text-[12.5px] text-text-muted max-w-[360px]">{message}</p>
    )}
    {action && <div className="pt-3">{action}</div>}
  </div>
);
```
**Use directly** (no Phase 1 changes to the primitive). Pass `icon={Building2}` per UI-SPEC.md § 5.

**EmptyScopeState consumer:**
```tsx
import { Building2 } from 'lucide-react';
import { EmptyState } from '@/components/EmptyState';

export function EmptyScopeState() {
  return (
    <EmptyState
      title="Sem empresa atribuída ainda"
      message="Você ainda não tem empresa atribuída. Fale com o admin para liberar seu acesso."
      icon={Building2}
    />
  );
}
```

---

### `eslint-rules/no-supabase-from-outside-hooks.js` (custom ESLint rule)

**Analog:** **NO ANALOG** — `eslint-rules/` directory does not exist. Wave 0 establishment.

**Reference** — RESEARCH.md § Gate 2 lines 1410-1465 provides complete file (CommonJS module exporting an ESLint rule object with `meta` and `create(context)`).

**Existing `eslint.config.js` flat config style** (lines 1-26):
```javascript
import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
);
```
**To copy in `eslint.config.js` modification:**
- Import path: `import noSupabaseFromOutsideHooks from './eslint-rules/no-supabase-from-outside-hooks.js';` (relative path; CommonJS interop works in flat config).
- Add inline plugin: `lever: { rules: { 'no-supabase-from-outside-hooks': noSupabaseFromOutsideHooks } }` to `plugins` block.
- Register rule: `'lever/no-supabase-from-outside-hooks': 'error'`.

**Things NOT to copy:**
- ESM rule export (`export default`) — flat config supports both, but RESEARCH.md uses CommonJS (`module.exports = { ... }`) for tooling stability. Use CommonJS.

---

## Modified Existing Files — Insertion Details

### `src/components/Header.tsx`

**Current right cluster** (lines 74-84):
```tsx
<div className="flex items-center gap-1.5 shrink-0">
  <PendingTasksDropdown />
  <Btn
    variant="secondary"
    size="sm"
    icon={<Plus className="w-3.5 h-3.5" strokeWidth={2} />}
    onClick={() => window.dispatchEvent(new CustomEvent("open-cmdk"))}
  >
    Criar
  </Btn>
</div>
```

**Modification:** Add `<ScopeTrigger />` BEFORE `<PendingTasksDropdown />` (UI-SPEC.md § 1 — order: `[ScopeTrigger] [PendingTasksDropdown] [Btn Criar]`).

**Surrounding context to preserve:**
- Header structure (lines 23-87) — sticky, h-[42px], breadcrumbs on left, right cluster.
- All existing imports.
- The breadcrumbs nav (lines 39-71).
- The desktop sidebar toggle button (lines 28-37).
- The `<MobileNav />` mount at line 38.
- The "Criar" Btn that opens CmdK.

**Add import:** `import { ScopeTrigger } from '@/components/scope/ScopeTrigger';`

---

### `src/App.tsx`

**Current provider stack** (lines 73-79):
```tsx
return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <ErrorBoundary>
      <BrowserRouter>
        <Routes>
```

**Modification:** Wrap `<Routes>` in `<ScopeProvider><AbilityProvider>...</AbilityProvider></ScopeProvider>` ONLY for the `isAuthenticated` branch (lines 85-287). RESEARCH.md § Common Pitfalls #1 explicitly requires `ScopeProvider` mounts INSIDE `<BrowserRouter>` (because `useSearchParams()` needs Router context).

**Surrounding context to preserve:**
- All `useAuth` calls (line 44) and `getDefaultRoute()` (lines 56-71).
- The auth-loading branch (lines 47-53).
- The `<QueryClient>` instantiation (line 41) — note Phase 1 may also adjust `QueryClient` defaults (see RESEARCH.md § Pattern 3 — `keepPreviousData` discussion).
- All Route definitions (lines 80-308) including ProtectedRoute wrappers and lazy-loaded Suspense fallbacks.

**Add imports:**
```typescript
import { ScopeProvider } from '@/contexts/ScopeProvider';
import { AbilityProvider } from '@/contexts/AbilityProvider';
```

---

### `src/components/Layout.tsx`

**No change required if `ScopeProvider` mounts in `App.tsx`** (RESEARCH.md § Component Responsibilities table line 274: `Layout.tsx` = "NO CHANGE").

If the planner chooses to mount `ScopeProvider` here instead of App.tsx:
**Insertion point:** after line 13 (`<div className="flex h-screen ...">`), wrap line 14-26.

**Surrounding context to preserve:**
- `Sidebar` (line 16) conditional mount.
- `ViewAsBanner` (line 18) — this is the legacy admin debug banner; preserve.
- `<Header onToggleSidebar={...} />` (line 19).
- `<PageTransition><Outlet /></PageTransition>` (lines 21-23).
- `<CmdKPalette />` (line 26) — global mount.

---

### `src/components/MobileNav.tsx`

**No change** — UI-SPEC.md § 7 explicitly says: "Trigger renders in the header on mobile (NOT inside the `Sheet` side menu). D-01 explicit. Same Header right-cluster as desktop."

The mobile responsiveness happens in `ScopeTrigger.tsx` itself (max-width truncate at smaller breakpoints).

---

### `eslint.config.js`

**Insertion points** (current file is 26 lines):
- After line 5: `import pluginQuery from '@tanstack/eslint-plugin-query';`
- After line 5: `import noSupabaseFromOutsideHooks from './eslint-rules/no-supabase-from-outside-hooks.js';`
- Line 10 `extends`: append `, ...pluginQuery.configs['flat/recommended']`.
- Line 17-18 `plugins`: add `lever: { rules: { 'no-supabase-from-outside-hooks': noSupabaseFromOutsideHooks } }`.
- Line 23 `rules`: add `'lever/no-supabase-from-outside-hooks': 'error'`.

**Surrounding context to preserve:**
- `{ ignores: ["dist"] }` (line 8).
- `files: ["**/*.{ts,tsx}"]` (line 11).
- `globals.browser` (line 14).
- All three existing rules.

---

### `package.json`

**Insertion points:**

**Dependencies block (lines 13-67) — add and modify:**
```json
"@casl/ability": "^6.8.1",
"@casl/react": "^6.0.0",
"@hookform/resolvers": "^5.2.2",  // UPGRADE from ^3.10.0
"@sentry/react": "^10.50.0",      // INSTALL ONLY (no init() in Phase 1)
"date-fns-tz": "^3.2.0",
"react-hook-form": "^7.73.0",     // UPGRADE from ^7.61.1
"zustand": "^5.0.12",
```

**DevDependencies block (lines 68-86) — add:**
```json
"@tanstack/eslint-plugin-query": "^5.100.5",
"@testing-library/dom": "^10.0.0",
"@testing-library/jest-dom": "^6.9.0",
"@testing-library/react": "^16.0.0",
"@testing-library/user-event": "^14.0.0",
"jsdom": "^25.0.0",
"msw": "^2.13.6",
"vitest": "^3.2.0",
```

**Surrounding context to preserve:** All existing scripts (`dev`, `build`, `lint`, `preview`), all 50+ existing deps, the `"type": "module"` declaration.

**Companion deletion:** `bun.lockb` (root of repo) — single `git rm bun.lockb` for QUAL-05.

---

## Shared Patterns

### RLS Helper Functions

**Source:** `supabase/migrations/20260422130000_align_admin_role_policies.sql` lines 14-32 + `supabase/migrations/20260416193100_hiring_rls_policies.sql` lines 14-33.

**Apply to:** All three new helpers (`visible_companies`, `visible_org_units`, `org_unit_descendants`) AND `resolve_default_scope` RPC.

```sql
CREATE OR REPLACE FUNCTION public.<NAME>(_<param> uuid)
RETURNS <return_type>
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN public.has_role(_<param>, '<role>'::public.app_role) THEN <result>
    -- ... role branches ...
    ELSE <empty_default>
  END;
$$;

COMMENT ON FUNCTION public.<NAME> IS '<one-line description>';

REVOKE ALL ON FUNCTION public.<NAME>(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.<NAME>(uuid) TO authenticated;
```

**Special case:** `resolve_default_scope` uses `LANGUAGE plpgsql` (procedural with IF/ELSIF) — Phase 1 establishes the precedent.

---

### React Query Hook Wrapper

**Source:** `src/hooks/hiring/useApplications.ts` lines 13-72.

**Apply to:** Every hook that fetches scoped data (`useScopedQuery` is the canonical wrapper; consumers like `useScopedJobs`, `useScopedCandidates` follow the shape — Phase 2-3 migrations).

```typescript
export const <featureKeys> = {
  all: ['<feature>'] as const,
  byX: (xId: string) => ['<feature>', 'by-x', xId] as const,
  detail: (id: string) => ['<feature>', 'detail', id] as const,
};

export function use<Feature>(<args>) {
  return useScopedQuery<TData>(  // chokepoint
    <featureKeys>.byX(<args>),
    async (companyIds) => {
      const { data, error } = await supabase
        .from('<table>')
        .select('...')
        .in('company_id', companyIds)
        .eq(...);
      if (error) throw error;
      return (data ?? []) as TData;
    },
  );
}
```

**Critical change from existing pattern:** Replace `queryKey: <featureKeys>.byX(...)` with `useScopedQuery(<featureKeys>.byX(...), fn)` — chokepoint handles `['scope', scope.id, scope.kind, ...]` prefix automatically.

---

### Form + Zod Schema (for confirmation dialog if needed)

**Source:** `src/components/hiring/CandidateForm.tsx` lines 23-54.

**Apply to:** Phase 1 has only ONE small form-like surface (`DirtyFormConfirmDialog`) — and it doesn't actually take form input (it's a yes/no dialog). So this pattern is only relevant if planner adds a "vinculações de sócio" panel (CONTEXT.md `Claude's Discretion`).

```typescript
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const schema = z.object({
  full_name: z.string().min(2, "Nome obrigatório"),
  email: z.string().email("E-mail inválido"),
  // ...
});

type FormValues = z.infer<typeof schema>;

export function MyForm() {
  const { register, handleSubmit, formState, setValue, watch, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { /* ... */ },
  });
  // ...
}
```

**Note for `useDirtyForms` registry:** Phase 1's `useDirtyForms` (Zustand store, RESEARCH.md § Code Examples lines 1980-2012) lets each form `register(formId)` on `formState.isDirty === true`. Forms must call `reset(values)` after successful save to clear dirty state (RESEARCH.md § Common Pitfalls #7).

---

### Toast / Notification (sonner neutral)

**Source:** `src/lib/supabaseError.ts` lines 1-2, 32 + 5+ feature files importing `from "sonner"`.

**Apply to:** `ScopeFallbackToast` (URL inaccessible scope) AND any Phase 1 RPC error fallback.

```typescript
import { toast } from "sonner";

// Neutral variant (no color):
toast("Você não tem acesso àquele escopo. Abrindo Grupo Lever.");

// Error variant (red — for RLS denials, server errors):
toast.error("Sem permissão para acessar este recurso.");
```

**Throttle for repeated invalid URLs** (UI-SPEC.md § 6 toast throttle requirement) — debounce to 1 toast per 1s. Phase 1 implementation uses `useRef` timestamp + early-return guard.

---

### Empty State (decorated variant)

**Source:** `src/components/EmptyState.tsx` (wrapper) + `src/components/primitives/EmptyState.tsx` `variant="decorated"` (lines 47-67).

**Apply to:** `EmptyScopeState` (sócio without empresa).

```tsx
import { Building2 } from 'lucide-react';
import { EmptyState } from '@/components/EmptyState';

<EmptyState
  title="Sem empresa atribuída ainda"
  message="Você ainda não tem empresa atribuída. Fale com o admin para liberar seu acesso."
  icon={Building2}
/>
```

---

### Error Translation (Postgrest → pt-BR)

**Source:** `src/lib/supabaseError.ts` lines 8-15 (FRIENDLY_MESSAGES map).

**Apply to:** Any new server-side error path. Phase 1 doesn't add new error codes; the existing map already covers `42501` (RLS) — which is what fires when scope/RLS rejects a query.

**Existing convention to preserve:**
- `console.warn("[RLS] blocked by policy:", err)` for code 42501.
- `console.error("[supabase]", err)` for other PostgrestError codes.

---

## Anti-Patterns to Avoid (from existing codebase)

| Anti-Pattern | Where it appears | What to do instead |
|--------------|------------------|---------------------|
| `auth.uid()` (bare) inside RLS USING/WITH CHECK | `supabase/migrations/20260416193100_hiring_rls_policies.sql` lines 41, 53, 63, 76 | Always wrap as `(SELECT auth.uid())` for initPlan caching (RBAC-10, P-AP-3) |
| Inline `EXISTS (SELECT 1 FROM ...)` for tenant scoping | `supabase/migrations/20260416193100_hiring_rls_policies.sql` lines 86-89, 95-104, 112-115 | Use `column = ANY(public.visible_companies((SELECT auth.uid())))` (Pattern 1) |
| `supabase.from('table')` directly in components | `src/components/ManualPDIForm.tsx` line 47-58, 83; `src/components/company/CompanyDrawer.tsx` (line 2 import); 14 other files | Move to a hook in `src/hooks/`; consume via `useScopedQuery`. ESLint rule `no-supabase-from-outside-hooks` enforces from PR 1 (with explicit allowlist for the 16 legacy files until Phase 2-3 cleans them) |
| `queryKey` without scope prefix | All 173 existing queryKey declarations (e.g., `['hiring', 'applications', 'by-job', jobId]`) | Phase 1 establishes `useScopedQuery` chokepoint that auto-prefixes; Phase 2-3 migrate consumers |
| `console.log` / `console.error` with PII (email, full_name, CPF) | CONCERNS.md flagged 6+ files | Replace with `logger.log` / `logger.error` (which redacts in PROD); Phase 1 ships wrapper, Phase 4 audits all sites |
| Lucide ArrowDown/Up/Right/Left used as logo or symbol stand-in | (memory: `feedback_brand_fidelity.md`) — not Phase 1 surface but always preserve | `LeverArrow` is the only brand symbol. ChevronDown/Right are fine as UI affordances (UI-SPEC.md confirms) |
| Components > 800 lines | `src/components/hiring/CandidateDrawer.tsx` (29KB), `src/components/hiring/JobOpeningForm.tsx` (31KB), `src/components/company/CompanyDrawer.tsx` (19KB) | "Break when you touch them" (CLAUDE.md). Phase 1 touches few; deferred to Phase 2-3 |
| Direct Postgres `auth.uid()` calls returning `text` interpreted as `uuid` without cast | various | Always cast: `auth.uid()::uuid` if needed; helpers already type-correctly use `uuid` |
| `RETURNS UUID[]` (uppercase) | `supabase/migrations/20260416193100_hiring_rls_policies.sql` line 15 | Use lowercase `uuid[]` (consistent with `20260422130000_align_admin_role_policies.sql`) |
| `LANGUAGE SQL` (uppercase) | same file line 16 | Use lowercase `LANGUAGE sql` (matches Postgres docs convention used in newer migrations) |
| Mounting Context outside Router | (would be new bug) | RESEARCH.md § Common Pitfalls #1: `<ScopeProvider>` MUST be inside `<BrowserRouter>` because `useSearchParams()` needs Router context |
| Per-tenant `QueryClient` instances | (anti-pattern from research) | Single `QueryClient` for the app; scope is part of the queryKey (Pattern 3 chokepoint) |
| `removeQueries` on scope switch | (would be new bug) | Let queryKey change naturally; old scope's cache stays in gcTime (D-04 cache preservation) |
| Bare `auth.uid()` in RLS | 12 hiring policies | Always `(SELECT auth.uid())` — Phase 1 rewrites all 12 (RBAC-10) |

---

## Wave 0 Establishments

These patterns have NO precedent in the codebase. Phase 1 establishes them as canonical:

1. **`supabase/tests/` directory + pgTAP test infrastructure** — `000-bootstrap.sql` installs basejump-supabase_test_helpers; subsequent files follow `<NNN>-<feature>.sql` ordering. This becomes the reference for ALL future RLS testing (Phase 2-4).

2. **`eslint-rules/` directory** — in-tree ESLint custom rule (CommonJS module). Pattern: one rule per file; module.exports = { meta, create }. Wired into `eslint.config.js` via inline `lever:` plugin namespace.

3. **`src/contexts/` directory + provider composition under `<BrowserRouter>`** — `App.tsx` currently mounts only `QueryClientProvider`/`TooltipProvider`/`ErrorBoundary`/`BrowserRouter`. Phase 1 adds the first business-domain providers (`ScopeProvider`, `AbilityProvider`) with strict ordering.

4. **`src/lib/scope/`, `src/lib/dates.ts`, `src/lib/logger.ts`** — `src/lib/` currently holds only `routes.ts`, `utils.ts`, `supabaseError.ts`, `hiring/`. Phase 1 adds new top-level utility modules; subdirectory style for `scope/` matches existing `hiring/`.

5. **`src/components/scope/` directory** — feature-namespaced UI components mirror existing `src/components/hiring/`, `src/components/company/`, `src/components/primitives/`. Phase 1 adds the first non-hiring feature namespace.

6. **CASL** — entire RBAC client-side library is new. Pattern (RESEARCH.md § Pattern 4) is the canonical reference; subsequent UI-hiding work in Phase 2-3 follows it.

7. **Zustand** — first store. Pattern (`name: 'leverup:scope'`, `version: 1`, `partialize`) is canonical for any future persisted store (e.g., user preferences, theme).

8. **`@tanstack/eslint-plugin-query` flat/recommended** — ESLint rules for query keys; first time the project enforces queryKey discipline at lint time.

9. **`date-fns-tz`** — first timezone-aware formatter. `formatBR` becomes the canonical for `timestamptz` rendering.

10. **PII-scrubbing logger** — first centralized logger. Future Sentry integration (Phase 4) wraps this.

---

## No Analog Found

Files with no close codebase match — planner uses RESEARCH.md patterns:

| File | Role | Reason | Reference |
|------|------|--------|-----------|
| `src/lib/scope/abilities.ts` | CASL `defineAbilityFor` | CASL is new to the project | RESEARCH.md § Pattern 4 (lines 871-972) |
| `src/lib/dates.ts` | `date-fns-tz` formatter | `date-fns-tz` is new (existing uses `date-fns` UTC) | RESEARCH.md § Gate 5 (lines 1590-1622) |
| `eslint-rules/no-supabase-from-outside-hooks.js` | ESLint custom rule | First custom rule in project | RESEARCH.md § Gate 2 (lines 1410-1465) |
| `supabase/tests/*.sql` (all 6) | pgTAP tests | `supabase/tests/` directory does not exist | RESEARCH.md § Sample Cross-Tenant pgTAP (lines 1700-1784) |

---

## Metadata

**Analog search scope:**
- `src/components/` (full tree — 80+ files inspected for trigger/dropdown/dialog/empty patterns)
- `src/hooks/` and `src/hooks/hiring/` (data hook patterns)
- `src/lib/` (utility module style)
- `supabase/migrations/` (50 SQL files inspected for RLS/helper/trigger patterns)
- `package.json`, `eslint.config.js`, `tailwind.config.ts`, `index.css` (build/style config)

**Files scanned:** 50 migrations, 18 hiring hooks, 15 cross-domain hooks, 90+ components, 6 lib files, all top-level configs.

**Pattern extraction date:** 2026-04-27

**Concrete excerpts captured per analog file:**
- Line numbers for every code excerpt above.
- Direct quote of the analog's signature/import block (no paraphrasing).
- Anti-patterns identified by file + line for the planner to avoid.

**Stop criteria:** Stopped at 5 strong analogs per pattern category (RLS helpers: `is_people_manager` + `allowed_companies`; Context: `useAuth.ts`; React Query hook: `useApplications.ts`, `useVisibleCompanies`; Popover/Command: `CmdKPalette.tsx`, `PendingTasksDropdown.tsx`; Linear primitives: `LinearKit.tsx`; EmptyState: 2 files; Form+Zod: `CandidateForm.tsx`).

---

*PATTERNS.md complete — ready for `gsd-planner`*
