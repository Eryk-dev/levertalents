---
phase: 1
plan: 01
type: execute
wave: 0
depends_on: []
files_modified:
  - package.json
  - package-lock.json
  - bun.lockb
  - vitest.config.ts
  - tests/setup.ts
  - tests/msw/handlers.ts
  - tests/msw/server.ts
  - supabase/tests/000-bootstrap.sql
  - supabase/tests/001-helpers-smoke.sql
  - supabase/tests/002-cross-tenant-leakage.sql
  - supabase/tests/003-org-unit-descendants.sql
  - supabase/tests/004-anti-cycle-trigger.sql
  - supabase/tests/005-resolve-default-scope.sql
  - .github/workflows/test.yml
  - tsconfig.app.json
  - tsconfig.json
autonomous: true
requirements: [QUAL-05]
---

# Plan 01: Test Infrastructure Bootstrap

<objective>
Establish the Vitest + RTL + MSW frontend test stack and the pgTAP + supabase-test-helpers database test stack. Drop `bun.lockb` and lock npm as the canonical package manager (QUAL-05). Create six pgTAP test files referencing schema/functions that don't exist YET — they'll fail Wave 0 but will pass after Wave 1 migrations land. The `002-cross-tenant-leakage.sql` is the security gate of the entire phase.
</objective>

<requirements_addressed>
- **QUAL-05**: Lockfile único (`package-lock.json`); `bun.lockb` removido. CI runs `npm ci`. This plan deletes the lockfile + adds CI workflow + adds `npm test` + `supabase test db` scripts.
</requirements_addressed>

<threat_model>
- **T-1-01 (HIGH) — Cross-tenant data leakage during retrofit:** Mitigated by creating `supabase/tests/002-cross-tenant-leakage.sql` BEFORE any migration code lands. The test will fail in Wave 0 (because `socio_company_memberships` doesn't exist yet) but acts as the canonical gate that EVERY future PR must pass.
- **T-1-02 (HIGH) — RLS recursion / privilege bypass:** Mitigated by `supabase/tests/001-helpers-smoke.sql` introspecting `pg_proc.prosecdef = true`, `pg_proc.proconfig = '{search_path=public}'`, `pg_proc.provolatile = 's'` on every helper. Test fails red until migrations B/C ship correct helpers.
- **T-1-04 (MEDIUM) — PII in logs / Sentry:** Out of scope here (covered in Plan 07 logger), but `tests/setup.ts` will scrub PII fields from snapshot output.
- **T-1-05 (MEDIUM) — ESLint guard bypass:** Out of scope here (Plan 07).
</threat_model>

<tasks>

<task id="01-01">
<action>
Edit `package.json` to add devDependencies and a `test` script. Use `npm install` commands to actually install (do NOT hand-edit lock file). Run these exact commands in sequence:

```bash
npm install --save \
  @casl/ability@^6.8.1 \
  @casl/react@^6.0.0 \
  zustand@^5.0.12 \
  date-fns-tz@^3.2.0 \
  @sentry/react@^10.50.0

npm install --save \
  react-hook-form@^7.73.0 \
  @hookform/resolvers@^5.2.2

npm install --save-dev \
  vitest@^3.2.0 \
  @vitejs/plugin-react@^4.3.4 \
  @testing-library/react@^16.0.0 \
  @testing-library/dom@^10.0.0 \
  @testing-library/jest-dom@^6.9.0 \
  @testing-library/user-event@^14.0.0 \
  jsdom@^25.0.0 \
  msw@^2.13.6 \
  @tanstack/eslint-plugin-query@^5.100.5
```

Then edit `package.json` `"scripts"` section to ADD (do not remove existing):
- `"test": "vitest --run"`
- `"test:watch": "vitest"`
- `"test:coverage": "vitest --run --coverage"`
- `"test:db": "supabase test db"`

Note: `@hookform/resolvers` upgrade from 3.10.x to 5.2.2 IS the documented breaking-but-needed change per RESEARCH.md § Standard Stack (line 152). Do NOT upgrade Zod 3 → 4 (locked AF-13).

Per D-discretion in CONTEXT.md: `@sentry/react` is INSTALLED only — no `Sentry.init()` call in Phase 1. Phase 4 wires the integration. This satisfies open question Q6 from RESEARCH.md.
</action>
<read_first>
- `package.json` — current dep list and scripts; verify Zod is `^3.25.x` (NOT 4.x); verify `react-hook-form` is `^7.61.x` and `@hookform/resolvers` is `^3.10.x` so the upgrade matches.
- `.planning/phases/01-tenancy-backbone/01-RESEARCH.md` lines 137-176 — Standard Stack version table and the exact `npm install` commands.
- `.planning/phases/01-tenancy-backbone/01-PATTERNS.md` lines 936-963 — package.json modification spec.
- `CLAUDE.md` — confirm `npm` is canonical and Zod 4 is forbidden.
</read_first>
<acceptance_criteria>
- `package.json` "dependencies" object contains `"@casl/ability"`, `"@casl/react"`, `"zustand"`, `"date-fns-tz"`, `"@sentry/react"`.
- `package.json` "dependencies" object contains `"react-hook-form": "^7.73"` (or higher patch) and `"@hookform/resolvers": "^5.2.2"` (or higher patch). The previous `^7.61.1` and `^3.10.0` MUST be replaced.
- `package.json` "dependencies" object STILL contains `"zod": "^3.25.x"` (no upgrade to 4.x).
- `package.json` "devDependencies" contains `"vitest"`, `"@testing-library/react"`, `"@testing-library/dom"`, `"@testing-library/jest-dom"`, `"@testing-library/user-event"`, `"jsdom"`, `"msw"`, `"@tanstack/eslint-plugin-query"`, `"@vitejs/plugin-react"`.
- `package.json` "scripts" object contains `"test": "vitest --run"`, `"test:watch": "vitest"`, `"test:coverage": "vitest --run --coverage"`, `"test:db": "supabase test db"`.
- `package-lock.json` was regenerated (mtime changed).
- `npm ls vitest` exits 0.
- `npm ls @casl/ability` exits 0.
- `node -e "console.log(require('./package.json').dependencies['react-hook-form'])"` outputs a string starting with `^7.7` or `~7.7`.
</acceptance_criteria>
<files>
- `package.json`
- `package-lock.json`
</files>
<automated>
test -f package.json && grep -q '"vitest"' package.json && grep -q '"@casl/ability"' package.json && grep -q '"react-hook-form": "\^7\.7' package.json && ! grep -q '"zod": "\^4' package.json && grep -q '"test": "vitest --run"' package.json
</automated>
</task>

<task id="01-02">
<action>
Delete `bun.lockb` from the repo (QUAL-05). Use `git rm bun.lockb` so the deletion is staged. After the delete, modify `tsconfig.json` and `tsconfig.app.json` to add `"types": ["vitest/globals", "@testing-library/jest-dom"]` in `compilerOptions` so test files type-check. Also add `tests/**` and `**/*.test.ts`, `**/*.test.tsx` to `include` in `tsconfig.app.json` so vitest discovers them.

If `bun.lockb` is already absent (someone deleted it), this is a no-op. Idempotent.
</action>
<read_first>
- `tsconfig.json` — current compilerOptions and references.
- `tsconfig.app.json` — current `compilerOptions.types` and `include` arrays.
- `.planning/phases/01-tenancy-backbone/01-RESEARCH.md` lines 1397-1404 — Quality Gates Gate 1.
- The output of `ls -la bun.lockb 2>&1` to confirm presence.
</read_first>
<acceptance_criteria>
- `bun.lockb` does NOT exist at repo root: `test ! -f bun.lockb` exits 0.
- `tsconfig.app.json` `compilerOptions.types` array contains the strings `"vitest/globals"` and `"@testing-library/jest-dom"`.
- `tsconfig.app.json` `include` array contains a glob covering `tests/` (e.g., `"tests/**/*.ts"` or `"tests/**/*.tsx"`).
- `git status --short bun.lockb` reports either no output (already removed in stage) or a `D` flag.
- `npx tsc --noEmit -p tsconfig.app.json` exits 0 (existing code still type-checks).
</acceptance_criteria>
<files>
- `bun.lockb` (deleted)
- `tsconfig.json`
- `tsconfig.app.json`
</files>
<automated>
test ! -f bun.lockb && grep -q 'vitest/globals' tsconfig.app.json && npx tsc --noEmit -p tsconfig.app.json
</automated>
</task>

<task id="01-03">
<action>
Create `vitest.config.ts` at the repo root. Content:

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    css: false,
    include: ['tests/**/*.{test,spec}.{ts,tsx}', 'src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'dist', 'supabase/tests'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: ['node_modules/', 'dist/', 'tests/setup.ts', 'tests/msw/**', '**/*.config.*'],
    },
  },
});
```

Then create `tests/setup.ts`:

```typescript
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeAll, afterAll } from 'vitest';
import { cleanup } from '@testing-library/react';
import { server } from './msw/server';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  cleanup();
  server.resetHandlers();
});
afterAll(() => server.close());
```

Then create `tests/msw/server.ts`:

```typescript
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
```

Then create `tests/msw/handlers.ts`:

```typescript
import { http, HttpResponse } from 'msw';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? 'https://ehbxpbeijofxtsbezwxd.supabase.co';

// Default handlers — empty arrays for new tables. Tests that need data override.
export const handlers = [
  // companies (always empty array unless test overrides)
  http.get(`${SUPABASE_URL}/rest/v1/companies`, () => HttpResponse.json([])),
  http.get(`${SUPABASE_URL}/rest/v1/company_groups`, () => HttpResponse.json([])),
  http.get(`${SUPABASE_URL}/rest/v1/org_units`, () => HttpResponse.json([])),
  // RPCs return null by default
  http.post(`${SUPABASE_URL}/rest/v1/rpc/resolve_default_scope`, () => HttpResponse.json(null)),
];
```

Smoke-test by creating `tests/sanity.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';

describe('test infrastructure sanity', () => {
  it('vitest + jest-dom expectations work', () => {
    document.body.innerHTML = '<div data-testid="x">hi</div>';
    expect(document.querySelector('[data-testid="x"]')).toBeInTheDocument();
  });
});
```

Then run `npm test -- --run tests/sanity.test.ts` and confirm 1 test passes.
</action>
<read_first>
- `vite.config.ts` (existing) — confirm path alias pattern `@: ./src` so vitest config matches.
- `.planning/phases/01-tenancy-backbone/01-RESEARCH.md` lines 1684-1694 — Wave 0 Requirements list.
- `.planning/phases/01-tenancy-backbone/01-VALIDATION.md` lines 53-65 — Wave 0 detailed file checklist.
</read_first>
<acceptance_criteria>
- File `vitest.config.ts` exists at repo root containing the strings `'jsdom'`, `setupFiles`, `'@'` (alias), `'./tests/setup.ts'`.
- File `tests/setup.ts` exists containing `import '@testing-library/jest-dom/vitest'`.
- File `tests/msw/server.ts` exists containing `setupServer`.
- File `tests/msw/handlers.ts` exists containing `http.get` from msw.
- File `tests/sanity.test.ts` exists.
- `npm test -- --run tests/sanity.test.ts` exits 0 with at least 1 test passing.
- `npm test -- --run` (full suite) exits 0 with the sanity test included.
</acceptance_criteria>
<files>
- `vitest.config.ts`
- `tests/setup.ts`
- `tests/msw/server.ts`
- `tests/msw/handlers.ts`
- `tests/sanity.test.ts`
</files>
<automated>
npm test -- --run tests/sanity.test.ts
</automated>
</task>

<task id="01-04">
<action>
Create the six pgTAP test files in `supabase/tests/`. They reference schema/functions that don't exist yet (Wave 1 will add them); they MUST fail with a clear missing-object error in Wave 0 — that's the signal that the gate is real. After Wave 1 migrations land, these pass automatically.

**File 1: `supabase/tests/000-bootstrap.sql`** — Installs `basejump-supabase_test_helpers` extension and verifies pgTAP functions exist. Content:

```sql
begin;
select plan(2);

-- Verify pgTAP is installed (Supabase ships it; just check)
select has_extension('pgtap', 'pgTAP extension is available');

-- Verify the basejump-supabase_test_helpers schema is installed.
-- Per docs (https://github.com/usebasejump/supabase-test-helpers):
--   This is installed via dbdev, but Supabase test runner installs it
--   automatically when you place tests under supabase/tests/.
select has_schema('tests', 'tests schema (basejump-supabase_test_helpers) is available');

select * from finish();
rollback;
```

**File 2: `supabase/tests/001-helpers-smoke.sql`** — Introspects helper attributes. Content:

```sql
begin;
select plan(15);

-- =========================================================================
-- Helper functions exist (will fail in Wave 0; pass after Wave 1 Migration B/C)
-- =========================================================================
select has_function('public', 'visible_companies', array['uuid'],
  'visible_companies(uuid) exists');
select has_function('public', 'visible_org_units', array['uuid'],
  'visible_org_units(uuid) exists');
select has_function('public', 'org_unit_descendants', array['uuid'],
  'org_unit_descendants(uuid) exists');
select has_function('public', 'resolve_default_scope', array['uuid'],
  'resolve_default_scope(uuid) exists');

-- =========================================================================
-- Each helper is STABLE SECURITY DEFINER with search_path=public
-- =========================================================================
select results_eq(
  $$select prosecdef from pg_proc where proname = 'visible_companies' and pronamespace = 'public'::regnamespace$$,
  array[true],
  'visible_companies is SECURITY DEFINER'
);
select results_eq(
  $$select provolatile::text from pg_proc where proname = 'visible_companies' and pronamespace = 'public'::regnamespace$$,
  array['s'::text],
  'visible_companies is STABLE'
);
select results_eq(
  $$select array_to_string(proconfig, ',') from pg_proc where proname = 'visible_companies' and pronamespace = 'public'::regnamespace$$,
  array['search_path=public'::text],
  'visible_companies has search_path=public'
);

select results_eq(
  $$select prosecdef from pg_proc where proname = 'visible_org_units' and pronamespace = 'public'::regnamespace$$,
  array[true],
  'visible_org_units is SECURITY DEFINER'
);
select results_eq(
  $$select provolatile::text from pg_proc where proname = 'visible_org_units' and pronamespace = 'public'::regnamespace$$,
  array['s'::text],
  'visible_org_units is STABLE'
);
select results_eq(
  $$select array_to_string(proconfig, ',') from pg_proc where proname = 'visible_org_units' and pronamespace = 'public'::regnamespace$$,
  array['search_path=public'::text],
  'visible_org_units has search_path=public'
);

select results_eq(
  $$select prosecdef from pg_proc where proname = 'org_unit_descendants' and pronamespace = 'public'::regnamespace$$,
  array[true],
  'org_unit_descendants is SECURITY DEFINER'
);
select results_eq(
  $$select provolatile::text from pg_proc where proname = 'org_unit_descendants' and pronamespace = 'public'::regnamespace$$,
  array['s'::text],
  'org_unit_descendants is STABLE'
);

select results_eq(
  $$select prosecdef from pg_proc where proname = 'resolve_default_scope' and pronamespace = 'public'::regnamespace$$,
  array[true],
  'resolve_default_scope is SECURITY DEFINER'
);
select results_eq(
  $$select provolatile::text from pg_proc where proname = 'resolve_default_scope' and pronamespace = 'public'::regnamespace$$,
  array['s'::text],
  'resolve_default_scope is STABLE'
);

-- =========================================================================
-- All new tenancy tables have RLS enabled (Pitfall 5 in RESEARCH.md)
-- =========================================================================
select results_eq(
  $$select tablename::text from pg_tables t
    join pg_class c on c.relname = t.tablename
    where t.schemaname = 'public'
      and t.tablename in ('company_groups','org_units','org_unit_members','unit_leaders','socio_company_memberships')
      and c.relrowsecurity = false$$,
  array[]::text[],
  'all new tenancy tables (company_groups, org_units, org_unit_members, unit_leaders, socio_company_memberships) have RLS enabled'
);

-- =========================================================================
-- app_role enum has 'liderado' value (RBAC-01)
-- =========================================================================
select results_eq(
  $$select 'liderado' = ANY(enum_range(null::public.app_role)::text[])$$,
  array[true],
  'app_role enum contains "liderado"'
);

select * from finish();
rollback;
```

**File 3: `supabase/tests/002-cross-tenant-leakage.sql`** — THE SECURITY GATE. Copy verbatim from RESEARCH.md lines 1700-1784, with header comment. Content:

```sql
-- ========================================================================
-- 002-cross-tenant-leakage.sql — CRITICAL SECURITY GATE
--
-- Mitigates threat T-1-01 (cross-tenant data leakage during retrofit).
-- This test MUST pass on every PR. Failure means RLS is broken and the
-- phase cannot ship.
-- ========================================================================
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
  (tests.get_supabase_uid('rh_a@test.com'), 'rh'::public.app_role),
  (tests.get_supabase_uid('rh_b@test.com'), 'rh'::public.app_role);

-- Create 1 job opening per company
insert into public.job_openings (id, company_id, title, status, created_by)
values
  ('11111111-1111-1111-1111-11111111111a', '00000000-0000-0000-0000-00000000000a',
   'Vaga A', 'open', tests.get_supabase_uid('rh_a@test.com')),
  ('22222222-2222-2222-2222-22222222222b', '00000000-0000-0000-0000-00000000000b',
   'Vaga B', 'open', tests.get_supabase_uid('rh_b@test.com'));

-- TEST 1+2: Both RHs see all (because rh role is global per RBAC-03)
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

-- TEST 3+4: a sócio of A should NOT see B
select tests.authenticate_as_service_role();
select tests.create_supabase_user('socio_a@test.com');
insert into public.user_roles (user_id, role) values
  (tests.get_supabase_uid('socio_a@test.com'), 'socio'::public.app_role);
insert into public.socio_company_memberships (user_id, company_id) values
  (tests.get_supabase_uid('socio_a@test.com'), '00000000-0000-0000-0000-00000000000a');

select tests.authenticate_as('socio_a@test.com');
select results_eq(
  'select count(*) from public.job_openings',
  array[1::bigint],
  'socio@A sees ONLY company A''s openings (not B)'
);
select results_eq(
  $$select count(*) from public.job_openings where company_id = '00000000-0000-0000-0000-00000000000b'$$,
  array[0::bigint],
  'socio@A cannot read company B job_openings (RLS blocks)'
);

-- TEST 5: socio@A blocked from creating in company B (write-side denial)
select throws_ok(
  $$insert into public.job_openings (company_id, title, status, created_by)
    values ('00000000-0000-0000-0000-00000000000b', 'Hacked', 'open', auth.uid())$$,
  '42501',
  'new row violates row-level security policy for table "job_openings"',
  'socio@A blocked from creating opening in company B (42501 RLS denial)'
);

-- TEST 6: unauthenticated user sees zero rows (default-deny)
select tests.clear_authentication();
select results_eq(
  'select count(*) from public.job_openings',
  array[0::bigint],
  'unauthenticated user sees zero rows'
);

select * from finish();
rollback;
```

**File 4: `supabase/tests/003-org-unit-descendants.sql`** — Recursive CTE test. Content:

```sql
begin;
select plan(4);

select tests.authenticate_as_service_role();

insert into public.companies (id, name) values
  ('11111111-2222-3333-4444-555555555555', 'Empresa Tree Test');

-- Build a 5-node tree: root → mid_a → leaf_a, mid_b → leaf_b
insert into public.org_units (id, company_id, parent_id, name, kind, position) values
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-2222-3333-4444-555555555555', NULL, 'Root', 'empresa', 0),
  ('aaaaaaaa-0000-0000-0000-000000000002', '11111111-2222-3333-4444-555555555555', 'aaaaaaaa-0000-0000-0000-000000000001', 'Mid A', 'departamento', 0),
  ('aaaaaaaa-0000-0000-0000-000000000003', '11111111-2222-3333-4444-555555555555', 'aaaaaaaa-0000-0000-0000-000000000002', 'Leaf A', 'time', 0),
  ('aaaaaaaa-0000-0000-0000-000000000004', '11111111-2222-3333-4444-555555555555', 'aaaaaaaa-0000-0000-0000-000000000001', 'Mid B', 'departamento', 0),
  ('aaaaaaaa-0000-0000-0000-000000000005', '11111111-2222-3333-4444-555555555555', 'aaaaaaaa-0000-0000-0000-000000000004', 'Leaf B', 'time', 0);

-- TEST 1: Descendants of root = all 5 (inclusive of root)
select results_eq(
  $$select array_length(public.org_unit_descendants('aaaaaaaa-0000-0000-0000-000000000001'::uuid), 1)$$,
  array[5],
  'root descendants count = 5 (root + 2 mids + 2 leaves)'
);

-- TEST 2: Descendants of Mid A = 2 (Mid A + Leaf A)
select results_eq(
  $$select array_length(public.org_unit_descendants('aaaaaaaa-0000-0000-0000-000000000002'::uuid), 1)$$,
  array[2],
  'Mid A descendants count = 2 (self + leaf)'
);

-- TEST 3: Descendants of leaf = 1 (just self)
select results_eq(
  $$select array_length(public.org_unit_descendants('aaaaaaaa-0000-0000-0000-000000000003'::uuid), 1)$$,
  array[1],
  'leaf descendants count = 1 (self only)'
);

-- TEST 4: Recursive CTE includes the root (depth 0 row)
select results_eq(
  $$select 'aaaaaaaa-0000-0000-0000-000000000001'::uuid = ANY(public.org_unit_descendants('aaaaaaaa-0000-0000-0000-000000000001'::uuid))$$,
  array[true],
  'descendants array includes the start node itself'
);

select * from finish();
rollback;
```

**File 5: `supabase/tests/004-anti-cycle-trigger.sql`** — Trigger blocks cycle. Content:

```sql
begin;
select plan(3);

select tests.authenticate_as_service_role();

insert into public.companies (id, name) values
  ('22222222-3333-4444-5555-666666666666', 'Empresa Cycle Test');

-- Build a 3-node chain: A → B → C (A is root, C is leaf)
insert into public.org_units (id, company_id, parent_id, name) values
  ('bbbbbbbb-0000-0000-0000-000000000001', '22222222-3333-4444-5555-666666666666', NULL, 'A'),
  ('bbbbbbbb-0000-0000-0000-000000000002', '22222222-3333-4444-5555-666666666666', 'bbbbbbbb-0000-0000-0000-000000000001', 'B'),
  ('bbbbbbbb-0000-0000-0000-000000000003', '22222222-3333-4444-5555-666666666666', 'bbbbbbbb-0000-0000-0000-000000000002', 'C');

-- TEST 1: Self-parent rejected by CHECK constraint
select throws_ok(
  $$update public.org_units set parent_id = 'bbbbbbbb-0000-0000-0000-000000000002'::uuid
    where id = 'bbbbbbbb-0000-0000-0000-000000000002'::uuid$$,
  NULL,
  NULL,
  'self-parent rejected (CHECK no_self_parent or anti-cycle trigger)'
);

-- TEST 2: Direct cycle (A → C → B → A) rejected
select throws_ok(
  $$update public.org_units set parent_id = 'bbbbbbbb-0000-0000-0000-000000000003'::uuid
    where id = 'bbbbbbbb-0000-0000-0000-000000000001'::uuid$$,
  'P0001',
  NULL,
  'cycle (A→C creates A→C→B→A loop) rejected with cycle error'
);

-- TEST 3: Valid re-parent (B's parent changes from A to NULL — make B a new root) works
select lives_ok(
  $$update public.org_units set parent_id = NULL
    where id = 'bbbbbbbb-0000-0000-0000-000000000002'::uuid$$,
  'valid re-parent (set to NULL) succeeds'
);

select * from finish();
rollback;
```

**File 6: `supabase/tests/005-resolve-default-scope.sql`** — RPC behavior per role. Content:

```sql
begin;
select plan(5);

select tests.authenticate_as_service_role();

-- Setup: Grupo Lever + 2 empresas (1 in group, 1 standalone)
insert into public.company_groups (id, slug, name) values
  ('ccccccccc000-0000-0000-0000-cccccccccccc', 'grupo-lever', 'Grupo Lever');
insert into public.companies (id, name, group_id) values
  ('ddddddddd000-0000-0000-0000-aaaaaaaaaaaa', 'Empresa Lever 1', 'ccccccccc000-0000-0000-0000-cccccccccccc'),
  ('ddddddddd000-0000-0000-0000-bbbbbbbbbbbb', 'Empresa Externa', NULL);

-- Create users with different roles
select tests.create_supabase_user('admin_test@test.com');
select tests.create_supabase_user('rh_test@test.com');
select tests.create_supabase_user('socio_test@test.com');
select tests.create_supabase_user('lider_test@test.com');
select tests.create_supabase_user('liderado_test@test.com');

insert into public.user_roles (user_id, role) values
  (tests.get_supabase_uid('admin_test@test.com'), 'admin'::public.app_role),
  (tests.get_supabase_uid('rh_test@test.com'), 'rh'::public.app_role),
  (tests.get_supabase_uid('socio_test@test.com'), 'socio'::public.app_role),
  (tests.get_supabase_uid('lider_test@test.com'), 'lider'::public.app_role),
  (tests.get_supabase_uid('liderado_test@test.com'), 'liderado'::public.app_role);

-- Sócio gets membership to Empresa Externa
insert into public.socio_company_memberships (user_id, company_id) values
  (tests.get_supabase_uid('socio_test@test.com'), 'ddddddddd000-0000-0000-0000-bbbbbbbbbbbb');

-- Líder + Liderado get org_unit (auto-created root for Empresa Lever 1)
-- The backfill in Migration C creates a root org_unit per company, so this row should already exist.
-- For test isolation we insert one explicitly.
insert into public.org_units (id, company_id, parent_id, name)
values ('eeeeeeee-0000-0000-0000-000000000001', 'ddddddddd000-0000-0000-0000-aaaaaaaaaaaa', NULL, 'Lever 1 Root')
on conflict (id) do nothing;

insert into public.unit_leaders (org_unit_id, user_id) values
  ('eeeeeeee-0000-0000-0000-000000000001', tests.get_supabase_uid('lider_test@test.com'));
insert into public.org_unit_members (org_unit_id, user_id, is_primary) values
  ('eeeeeeee-0000-0000-0000-000000000001', tests.get_supabase_uid('liderado_test@test.com'), true);

-- TEST 1: Admin → 'group:grupo-lever-uuid'
select results_eq(
  $$select public.resolve_default_scope(tests.get_supabase_uid('admin_test@test.com'))$$,
  array['group:ccccccccc000-0000-0000-0000-cccccccccccc'::text],
  'admin defaults to Grupo Lever (D-10)'
);

-- TEST 2: RH → 'group:grupo-lever-uuid'
select results_eq(
  $$select public.resolve_default_scope(tests.get_supabase_uid('rh_test@test.com'))$$,
  array['group:ccccccccc000-0000-0000-0000-cccccccccccc'::text],
  'rh defaults to Grupo Lever (D-10)'
);

-- TEST 3: Sócio → 'company:externa-uuid' (their only membership)
select results_eq(
  $$select public.resolve_default_scope(tests.get_supabase_uid('socio_test@test.com'))$$,
  array['company:ddddddddd000-0000-0000-0000-bbbbbbbbbbbb'::text],
  'socio defaults to first membership company (D-10)'
);

-- TEST 4: Líder → 'company:lever-1-uuid'
select results_eq(
  $$select public.resolve_default_scope(tests.get_supabase_uid('lider_test@test.com'))$$,
  array['company:ddddddddd000-0000-0000-0000-aaaaaaaaaaaa'::text],
  'lider defaults to org_unit company (D-10)'
);

-- TEST 5: Liderado → 'company:lever-1-uuid'
select results_eq(
  $$select public.resolve_default_scope(tests.get_supabase_uid('liderado_test@test.com'))$$,
  array['company:ddddddddd000-0000-0000-0000-aaaaaaaaaaaa'::text],
  'liderado defaults to primary org_unit company (D-10)'
);

select * from finish();
rollback;
```

**Wave-0 expectation:** Running `supabase test db` against the current schema (no Wave 1 migrations applied yet) MUST surface failures because `socio_company_memberships`, `org_units`, `org_unit_descendants`, `resolve_default_scope`, etc. do not exist. This is correct behavior — these tests are the gates that Wave 1 must pass. After Wave 1 ships, all tests turn green.
</action>
<read_first>
- `.planning/phases/01-tenancy-backbone/01-RESEARCH.md` lines 1646-1786 — full validation architecture and the canonical 002-cross-tenant test.
- `.planning/phases/01-tenancy-backbone/01-PATTERNS.md` lines 234-292 — pgTAP test-file roles and per-file specifications.
- `.planning/phases/01-tenancy-backbone/01-VALIDATION.md` lines 53-65 — Wave 0 file checklist.
- Existing `supabase/migrations/20260422130000_align_admin_role_policies.sql` to confirm the `is_people_manager` helper pattern (used as analog for new helpers).
- Existing `supabase/migrations/20260416193100_hiring_rls_policies.sql` lines 14-33 to confirm the `allowed_companies` helper signature precedent.
</read_first>
<acceptance_criteria>
- File `supabase/tests/000-bootstrap.sql` exists and contains both `select has_extension('pgtap'` and `select has_schema('tests'`.
- File `supabase/tests/001-helpers-smoke.sql` exists, contains `has_function('public', 'visible_companies', array['uuid']`, contains `prosecdef`, contains `provolatile`, contains `proconfig`, contains `liderado`, declares plan of 15 (`select plan(15)`).
- File `supabase/tests/002-cross-tenant-leakage.sql` exists, declares `select plan(6)`, contains `tests.create_supabase_user('rh_a@test.com')`, contains `tests.create_supabase_user('socio_a@test.com')`, contains `'42501'`, contains `socio_company_memberships`.
- File `supabase/tests/003-org-unit-descendants.sql` exists, declares `select plan(4)`, contains `org_unit_descendants(`, contains the 5-node tree fixture (`'aaaaaaaa-0000-0000-0000-000000000005'`).
- File `supabase/tests/004-anti-cycle-trigger.sql` exists, declares `select plan(3)`, contains `throws_ok` with `'P0001'`, contains `lives_ok`.
- File `supabase/tests/005-resolve-default-scope.sql` exists, declares `select plan(5)`, contains `resolve_default_scope(` called for all 5 roles.
- All 6 files end with `select * from finish(); rollback;`.
- Each file starts with `begin;`.
</acceptance_criteria>
<files>
- `supabase/tests/000-bootstrap.sql`
- `supabase/tests/001-helpers-smoke.sql`
- `supabase/tests/002-cross-tenant-leakage.sql`
- `supabase/tests/003-org-unit-descendants.sql`
- `supabase/tests/004-anti-cycle-trigger.sql`
- `supabase/tests/005-resolve-default-scope.sql`
</files>
<automated>
test -f supabase/tests/000-bootstrap.sql && test -f supabase/tests/001-helpers-smoke.sql && test -f supabase/tests/002-cross-tenant-leakage.sql && test -f supabase/tests/003-org-unit-descendants.sql && test -f supabase/tests/004-anti-cycle-trigger.sql && test -f supabase/tests/005-resolve-default-scope.sql && grep -q "select plan(6)" supabase/tests/002-cross-tenant-leakage.sql && grep -q "42501" supabase/tests/002-cross-tenant-leakage.sql
</automated>
</task>

<task id="01-05">
<action>
Create `.github/workflows/test.yml` with a CI workflow that runs `npm ci` + `npm test` + `supabase test db`. The workflow must run on push and pull_request, use Node 20, set up Supabase CLI, and fail on any test failure.

Content:

```yaml
name: Test

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    name: Frontend + Database tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node 20
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install npm deps
        run: npm ci

      - name: Run frontend tests (Vitest)
        run: npm test -- --run

      - name: Setup Supabase CLI
        uses: supabase/setup-cli@v1
        with:
          version: latest

      - name: Start Supabase local DB + run pgTAP tests
        run: |
          supabase db start
          supabase test db
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
```

Then run `npm test -- --run` locally to confirm sanity test passes (already covered in 01-03 acceptance, but reaffirm here as integration smoke).
</action>
<read_first>
- `.planning/phases/01-tenancy-backbone/01-VALIDATION.md` line 64 — CI workflow file requirement.
- Verify `.github/workflows/` directory exists or needs to be created (likely doesn't exist yet — confirm with `ls -la .github 2>&1`).
- `package.json` (modified by task 01-01) — confirm `test` script is `vitest --run`.
</read_first>
<acceptance_criteria>
- File `.github/workflows/test.yml` exists.
- File contains the strings `npm ci`, `npm test -- --run`, `supabase test db`, `actions/setup-node@v4`, `node-version: '20'`, `supabase/setup-cli@v1`.
- File is valid YAML: `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/test.yml'))"` exits 0 (or use `yq` if available).
- `npm test -- --run` exits 0 with the sanity test from task 01-03 passing.
</acceptance_criteria>
<files>
- `.github/workflows/test.yml`
</files>
<automated>
test -f .github/workflows/test.yml && grep -q "npm test -- --run" .github/workflows/test.yml && grep -q "supabase test db" .github/workflows/test.yml && npm test -- --run tests/sanity.test.ts
</automated>
</task>

</tasks>

<verification>
1. Run `test ! -f bun.lockb && test -f package-lock.json` — confirms canonical lockfile.
2. Run `npm test -- --run tests/sanity.test.ts` — confirms vitest infrastructure works.
3. Run `npm test -- --run` (full suite) — confirms test runner discovers all `.test.ts/.test.tsx` files and the sanity test passes.
4. Run `ls supabase/tests/00*.sql | wc -l` — must equal 6.
5. Verify each pgTAP file starts with `begin;` and ends with `rollback;` — `for f in supabase/tests/00*.sql; do head -1 "$f" | grep -q '^begin;' || echo "MISSING begin in $f"; tail -1 "$f" | grep -q '^rollback;' || echo "MISSING rollback in $f"; done`.
6. Verify `package.json` has all 9 new dependencies + `test` script.
7. Verify `.github/workflows/test.yml` exists and is valid YAML.

Note: `supabase test db` is NOT expected to pass in Wave 0 — it intentionally fails because Wave 1 migrations haven't shipped yet. The pgTAP files act as gates.
</verification>

<must_haves>
- Vitest + jsdom + RTL + MSW configured and working (sanity test green).
- 6 pgTAP test files present in `supabase/tests/` covering RLS helpers introspection, cross-tenant leakage gate, org_unit_descendants behavior, anti-cycle trigger, and resolve_default_scope per-role.
- `bun.lockb` removed; `package-lock.json` is canonical.
- `npm test` script wired in `package.json`.
- CI workflow runs `npm ci && npm test -- --run && supabase test db` on every PR.
- `tests/setup.ts` registers `@testing-library/jest-dom` matchers and starts/stops the MSW server.
- `tsconfig.app.json` includes vitest and jest-dom types so `.test.ts(x)` files type-check.
</must_haves>

<success_criteria>
- `npm test -- --run` exits 0 with at least 1 test passing.
- `bun.lockb` removed and not in subsequent diffs (search returns nothing).
- All 6 pgTAP files exist and are syntactically valid SQL with `select plan(N)` and `select * from finish();`.
- `.github/workflows/test.yml` is valid YAML and references both `npm test` and `supabase test db`.
- TypeScript compilation of existing app code still succeeds: `npx tsc --noEmit -p tsconfig.app.json` exits 0.
- New deps installed: `npm ls @casl/ability zustand vitest msw date-fns-tz` exits 0.
</success_criteria>
</content>
</invoke>