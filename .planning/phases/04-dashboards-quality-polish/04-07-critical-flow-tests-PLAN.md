---
phase: 04-dashboards-quality-polish
plan: 07
type: execute
wave: 4
depends_on:
  - 03
files_modified:
  - supabase/tests/011-payroll-total-rls.sql
  - tests/scope/switchScopeNoFlash.test.tsx
  - tests/perf/saveEvaluationIdempotent.test.tsx
  - src/pages/__tests__/FirstLoginChangePassword.test.tsx
  - tests/sanity/criticalFlowsCoverage.test.ts
autonomous: true
requirements:
  - QUAL-01
  - QUAL-02
  - QUAL-03
tags:
  - tests
  - rls
  - pgtap
  - critical-flows
  - phase-4

must_haves:
  truths:
    - "pgTAP test 011-payroll-total-rls.sql exists and passes — sócio sem membership recebe 42501 ao chamar read_payroll_total da empresa alheia"
    - "Vitest test switchScopeNoFlash verifies that switching scope preserves old cache (D-04 confirmed at component level for SocioDashboard)"
    - "Vitest test saveEvaluationIdempotent verifies useCreateEvaluation handles duplicate submissions without creating duplicates (idempotency mutation pattern)"
    - "Vitest test FirstLoginChangePassword exists at the canonical path and asserts PII is NOT logged in console (logger redact pattern proven). Branches: if file already exists → extend; if missing → create from PATTERNS.md section 9 analog (P4-V10)"
    - "Critical-flow coverage sanity test enumerates the 5 QUAL-03 flows and asserts each has at least one test file present"
    - "Existing useMoveApplicationStage.test.tsx already covers conflict/network/permission scenarios (no recreation needed; sanity test verifies presence)"
    - "npm test exits 0; supabase test db (pgTAP) for 011 exits 0"
  artifacts:
    - path: supabase/tests/011-payroll-total-rls.sql
      provides: "pgTAP plan(4): sócio_a com membership pode chamar; sócio_a sem membership empresa B é bloqueado com 42501; unauth bloqueado"
      contains: "read_payroll_total"
    - path: tests/scope/switchScopeNoFlash.test.tsx
      provides: "Component-level cache preservation test using SocioDashboard or a minimal scoped component"
      contains: "old cache present"
    - path: tests/perf/saveEvaluationIdempotent.test.tsx
      provides: "Mutation idempotency test for useCreateEvaluation"
      contains: "idempotent"
    - path: src/pages/__tests__/FirstLoginChangePassword.test.tsx
      provides: "Test asserting console output does not contain raw email/CPF strings — extended from existing OR created from analog (P4-V10)"
      contains: "no PII in console"
    - path: tests/sanity/criticalFlowsCoverage.test.ts
      provides: "Static enumeration of the 5 QUAL-03 flows + assert each has a test file"
      contains: "5 fluxos críticos"
  key_links:
    - from: "supabase/tests/011-payroll-total-rls.sql"
      to: "public.read_payroll_total RPC"
      via: "throws_ok 42501 / lives_ok"
      pattern: "read_payroll_total"
    - from: "tests/scope/switchScopeNoFlash.test.tsx"
      to: "SocioDashboard or any useScopedQuery consumer"
      via: "renderHook + scope mock + assert cache survives scope change"
      pattern: "old cache present"
---

<objective>
Close the QUAL-01/02/03 quality gates: add the pgTAP RLS test for the new payroll RPC (Plan 02 contract), add Vitest coverage for the 5 critical flows from QUAL-03, and verify (via a sanity-coverage test) that all 5 flows have at least one test file. Existing tests for `useMoveApplicationStage` already cover conflict/network/permission scenarios per PATTERNS.md section 7 — this plan VERIFIES, does not recreate.

QUAL-03 critical flows:
1. Login + troca de senha — `src/pages/__tests__/FirstLoginChangePassword.test.tsx` (P4-V10: branches — if exists → extend with PII-in-console assertion; if missing → create from PATTERNS.md section 9 analog using `src/pages/FirstLoginChangePassword.tsx` as the component under test)
2. Switch de escopo sem flash — NEW `tests/scope/switchScopeNoFlash.test.tsx` (extends `tests/scope/useScopedQuery.test.tsx` D-04 assertion to component level)
3. Mover candidato no kanban (conflict/network/permission) — `tests/hiring/useMoveApplicationStage.test.tsx` (exists with all 3 scenarios per PATTERNS.md section 7)
4. Salvar avaliação idempotente — NEW `tests/perf/saveEvaluationIdempotent.test.tsx`
5. RLS cross-empresa fail-test — NEW `supabase/tests/011-payroll-total-rls.sql` (clones `002-cross-tenant-leakage.sql`)

Purpose: Bring CI to a state where the 5 critical-flow regressions cannot ship without breaking a test.
Output: 1 pgTAP test + 2 new Vitest tests + 1 extended-or-created Vitest test (P4-V10) + 1 sanity coverage test.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/04-dashboards-quality-polish/04-CONTEXT.md
@.planning/phases/04-dashboards-quality-polish/04-PATTERNS.md
@CLAUDE.md
@supabase/tests/002-cross-tenant-leakage.sql
@tests/hiring/useMoveApplicationStage.test.tsx
@tests/scope/useScopedQuery.test.tsx
@src/pages/FirstLoginChangePassword.tsx
@src/hooks/useEvaluations.ts
@src/lib/logger.ts

<interfaces>
<!-- pgTAP helpers (already used in 002) -->
tests.create_supabase_user(email)
tests.authenticate_as(email)
tests.authenticate_as_service_role()
tests.clear_authentication()
tests.get_supabase_uid(email)

<!-- The RPC to test (Plan 02 contract) -->
public.read_payroll_total(p_company_ids uuid[]) RETURNS jsonb

<!-- Existing useScopedQuery cache assertion -->
tests/scope/useScopedQuery.test.tsx lines 60-77 — D-04 cache preservation

<!-- PATTERNS.md section 9 — FirstLoginChangePassword analog template -->
- Use tests/scope/useScopedQuery.test.tsx for Wrapper + QueryClient boilerplate
- Use tests/hiring/useMoveApplicationStage.test.tsx lines 23-36 for supabase module mock
- Component under test: src/pages/FirstLoginChangePassword.tsx
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: pgTAP test 011-payroll-total-rls.sql + switchScopeNoFlash component test</name>
  <files>supabase/tests/011-payroll-total-rls.sql, tests/scope/switchScopeNoFlash.test.tsx</files>
  <read_first>
    - supabase/tests/002-cross-tenant-leakage.sql (full 89 lines — exact analog: throws_ok 42501 + lives_ok pattern, fixture setup with tests.create_supabase_user)
    - .planning/phases/04-dashboards-quality-polish/04-PATTERNS.md (section 6 — verbatim header + assertion pattern for 011-payroll-total-rls.sql; section 8 — component-level switchScopeNoFlash strategy)
    - tests/scope/useScopedQuery.test.tsx (full file — see lines 60-77 for the cache preservation D-04 assertion to extend at component level)
    - src/hooks/usePayrollTotal.ts (Plan 02 output — to confirm the hook to mount in the component test)
  </read_first>
  <behavior>
    pgTAP 011 — plan(4):
    - TEST 1 (lives_ok): socio_a with membership in Empresa A successfully calls read_payroll_total([A_id])
    - TEST 2 (throws_ok '42501'): socio_a calling for Empresa B without membership fails with 42501
    - TEST 3 (throws_ok '42501'): socio_a calling for [A_id, B_id] (mixed) fails — subset check
    - TEST 4 (throws_ok '42501'): unauthenticated user fails

    Vitest switchScopeNoFlash — at component level:
    - Mount a small scoped component (or SocioDashboard with mocked hooks)
    - Switch scope from c1 → c2; assert old c1 cache key still exists in QueryClient
    - Assert no LoadingState re-mount happens between renders (i.e., old data was reused, not refetched-and-flashed)
  </behavior>
  <action>
    1) Create supabase/tests/011-payroll-total-rls.sql following the 002 analog:

    ```sql
    -- ========================================================================
    -- 011-payroll-total-rls.sql — DASH-01 RLS gate
    --
    -- Mitigates: T-04-02-01 (sócio sem membership lê folha de empresa alheia)
    -- Activated by: Plan 04-02 (RPC read_payroll_total)
    -- REQs: DASH-01, DASH-02, QUAL-02
    -- ========================================================================
    begin;
    select plan(4);

    select tests.create_supabase_user('socio_a@test4.com');
    select tests.create_supabase_user('socio_b@test4.com');
    select tests.authenticate_as_service_role();

    insert into public.companies (id, name) values
      ('00000000-0000-0000-0000-00000000000a', 'Empresa A 04'),
      ('00000000-0000-0000-0000-00000000000b', 'Empresa B 04')
    on conflict (id) do nothing;

    insert into public.user_roles (user_id, role) values
      (tests.get_supabase_uid('socio_a@test4.com'), 'socio'::public.app_role),
      (tests.get_supabase_uid('socio_b@test4.com'), 'socio'::public.app_role);

    insert into public.socio_company_memberships (user_id, company_id) values
      (tests.get_supabase_uid('socio_a@test4.com'), '00000000-0000-0000-0000-00000000000a');

    -- TEST 1: socio_a with membership can read folha of Empresa A
    select tests.authenticate_as('socio_a@test4.com');
    select lives_ok(
      $$select public.read_payroll_total(array['00000000-0000-0000-0000-00000000000a'::uuid])$$,
      'socio@A consegue ler folha da empresa A (com membership)'
    );

    -- TEST 2: socio_a calling for Empresa B (no membership) → 42501
    select throws_ok(
      $$select public.read_payroll_total(array['00000000-0000-0000-0000-00000000000b'::uuid])$$,
      '42501',
      null,
      'socio@A bloqueado de ler folha da empresa B (RLS via visible_companies)'
    );

    -- TEST 3: socio_a calling for [A, B] (subset check) → 42501
    select throws_ok(
      $$select public.read_payroll_total(array['00000000-0000-0000-0000-00000000000a'::uuid, '00000000-0000-0000-0000-00000000000b'::uuid])$$,
      '42501',
      null,
      'socio@A bloqueado de ler folha mista [A, B] — subset check via <@'
    );

    -- TEST 4: unauthenticated → 42501
    select tests.clear_authentication();
    select throws_ok(
      $$select public.read_payroll_total(null)$$,
      '42501',
      null,
      'unauth bloqueado de chamar read_payroll_total'
    );

    select * from finish();
    rollback;
    ```

    2) Create tests/scope/switchScopeNoFlash.test.tsx:

    ```typescript
    import { describe, it, expect, vi, beforeEach } from 'vitest';
    import { renderHook, waitFor } from '@testing-library/react';
    import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
    import React from 'react';
    import * as scopeModule from '@/app/providers/ScopeProvider';
    import { useScopedQuery } from '@/shared/data/useScopedQuery';

    function createWrapper() {
      const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
      const Wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(QueryClientProvider, { client }, children);
      return { client, Wrapper };
    }

    function mockScope(scope: { kind: 'company' | 'group'; id: string; companyIds: string[]; name: string }) {
      vi.spyOn(scopeModule, 'useScope').mockReturnValue({
        scope: scope as never,
        setScope: vi.fn(), pendingScope: null, confirmPendingScope: vi.fn(),
        cancelPendingScope: vi.fn(), isFixed: false, visibleCompanies: [],
        visibleGroups: [], isResolving: false,
      });
    }

    describe('Switch escopo — sem flash (QUAL-03 fluxo 2) [INV-04-07-02]', () => {
      beforeEach(() => vi.restoreAllMocks());

      it('switching from c1 to c2 preserves c1 cache and produces a new c2 entry', async () => {
        const fetcher = vi.fn().mockResolvedValue(['data']);
        const { Wrapper, client } = createWrapper();

        mockScope({ kind: 'company', id: 'c1', companyIds: ['c1'], name: 'A' });
        const { rerender } = renderHook(() => useScopedQuery(['critical-flow'], fetcher), { wrapper: Wrapper });
        await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));

        // Switch
        mockScope({ kind: 'company', id: 'c2', companyIds: ['c2'], name: 'B' });
        rerender();
        await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));

        const allKeys = client.getQueryCache().getAll().map((q) => q.queryKey);
        const c1Keys = allKeys.filter((k: readonly unknown[]) => k[1] === 'c1');
        const c2Keys = allKeys.filter((k: readonly unknown[]) => k[1] === 'c2');
        expect(c1Keys.length).toBeGreaterThan(0);  // OLD cache preserved
        expect(c2Keys.length).toBeGreaterThan(0);  // NEW cache created
      });

      it('switching back to c1 reuses the old cached data without refetching', async () => {
        const fetcher = vi.fn().mockResolvedValue(['c1-data']);
        const { Wrapper } = createWrapper();

        mockScope({ kind: 'company', id: 'c1', companyIds: ['c1'], name: 'A' });
        const { rerender } = renderHook(() => useScopedQuery(['critical-flow'], fetcher), { wrapper: Wrapper });
        await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));

        mockScope({ kind: 'company', id: 'c2', companyIds: ['c2'], name: 'B' });
        rerender();
        await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));

        // Switch back
        mockScope({ kind: 'company', id: 'c1', companyIds: ['c1'], name: 'A' });
        rerender();
        // Cache for c1 still fresh (gcTime: Infinity); no refetch
        await new Promise(r => setTimeout(r, 50));
        expect(fetcher).toHaveBeenCalledTimes(2);
      });
    });
    ```
  </action>
  <verify>
    <automated>npm test -- tests/scope/switchScopeNoFlash.test.tsx 2>&1 | tail -20 # Vitest passes; pgTAP run separately by gate</automated>
  </verify>
  <acceptance_criteria>
    - File supabase/tests/011-payroll-total-rls.sql exists; `grep -c "select plan(4)" supabase/tests/011-payroll-total-rls.sql` returns 1
    - `grep -c "throws_ok\|lives_ok" supabase/tests/011-payroll-total-rls.sql` returns at least 4
    - `grep -c "42501" supabase/tests/011-payroll-total-rls.sql` returns at least 3 (3 throws_ok)
    - File tests/scope/switchScopeNoFlash.test.tsx exists; `npm test -- tests/scope/switchScopeNoFlash.test.tsx 2>&1 | grep -E "Tests" | head -1` shows 2 passed and 0 failed
  </acceptance_criteria>
  <done>pgTAP 011 created; switchScopeNoFlash 2 tests passing.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: saveEvaluationIdempotent test + FirstLoginChangePassword test (extend OR create per P4-V10) with PII-in-console assertion</name>
  <files>tests/perf/saveEvaluationIdempotent.test.tsx, src/pages/__tests__/FirstLoginChangePassword.test.tsx</files>
  <read_first>
    - **P4-V10 — branch determination (do this FIRST):**
      ```bash
      test -f src/pages/__tests__/FirstLoginChangePassword.test.tsx && echo EXISTS || echo MISSING
      ```
      If EXISTS → branch A (extend). If MISSING → branch B (create from analog).
    - src/hooks/useEvaluations.ts (full file — find the create/save mutation; see line 25 for `useEvaluations` and line 60 for `useCreateEvaluation` insert pattern)
    - tests/hiring/useMoveApplicationStage.test.tsx (lines 145-307 — mutation lifecycle pattern + supabase mock structure; lines 23-36 — supabase module mock pattern referenced by P4-V10 branch B)
    - tests/scope/useScopedQuery.test.tsx (Wrapper + QueryClient boilerplate referenced by P4-V10 branch B)
    - src/pages/FirstLoginChangePassword.tsx (component under test for both branches)
    - **Branch A only:** src/pages/__tests__/FirstLoginChangePassword.test.tsx (current contents — capture line count BEFORE the extend so the post-condition can compare)
    - src/lib/logger.ts (redact function reference)
    - tests/lib/logger.test.ts (assertion pattern for "no PII in output")
  </read_first>
  <behavior>
    For saveEvaluationIdempotent:
    - Test 1: calling useCreateEvaluation.mutate twice with the same payload — second call sees a unique-violation error (mocked 23505) and the hook handles it gracefully (no duplicate optimistic insert remains; cache shows 1 entry post both calls)
    - Test 2: first call succeeds; cache contains 1 evaluation row

    For FirstLoginChangePassword (P4-V10):
    - Branch A — file already exists:
      - Existing tests stay green
      - New test: spy console.log/error/warn during a successful submit; assert no captured arg contains a raw email pattern (`/\\b\\w+@\\w+/`) or a raw 11-digit CPF
    - Branch B — file did NOT exist:
      - File is created from the PATTERNS.md section 9 analog (Wrapper boilerplate + supabase module mock + render of `<FirstLoginChangePassword />`)
      - Includes at least one test that successfully renders the component
      - Includes the same PII-in-console assertion as branch A
    - Either branch: post-condition is identical — file exists at `src/pages/__tests__/FirstLoginChangePassword.test.tsx` and contains a test that asserts no email/CPF leaks to console.
  </behavior>
  <action>
    1) Create tests/perf/saveEvaluationIdempotent.test.tsx:

    ```typescript
    import { describe, it, expect, vi, beforeEach } from 'vitest';
    import { renderHook, act, waitFor } from '@testing-library/react';
    import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
    import React from 'react';
    import * as scopeModule from '@/app/providers/ScopeProvider';

    const insertChain = {
      insert: vi.fn(),
      select: vi.fn(),
      single: vi.fn(),
    };
    const fromMock = vi.fn(() => insertChain);

    vi.mock('@/integrations/supabase/client', () => ({
      supabase: { from: (...args: unknown[]) => fromMock(...args) },
    }));

    import { useCreateEvaluation } from '@/hooks/useEvaluations';

    function createWrapper() {
      const client = new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { retry: false } } });
      const Wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(QueryClientProvider, { client }, children);
      return { client, Wrapper };
    }

    function mockScope() {
      vi.spyOn(scopeModule, 'useScope').mockReturnValue({
        scope: { kind: 'company', id: 'c1', companyIds: ['c1'], name: 'A' },
        setScope: vi.fn(), pendingScope: null, confirmPendingScope: vi.fn(),
        cancelPendingScope: vi.fn(), isFixed: false, visibleCompanies: [],
        visibleGroups: [], isResolving: false,
      } as never);
    }

    describe('useCreateEvaluation — idempotent (QUAL-03 fluxo 4) [INV-04-07-04]', () => {
      beforeEach(() => {
        fromMock.mockClear();
        insertChain.insert.mockReset();
        insertChain.select.mockReset();
        insertChain.single.mockReset();
        // Re-wire the chain
        insertChain.insert.mockReturnValue(insertChain);
        insertChain.select.mockReturnValue(insertChain);
        vi.restoreAllMocks();
        mockScope();
      });

      it('first save succeeds; mutation returns the inserted row', async () => {
        insertChain.single.mockResolvedValue({
          data: { id: 'e1', cycle_id: 'cy1', evaluator_user_id: 'u1', evaluated_user_id: 'u2', direction: 'leader_to_member', responses: { q1: 5 } },
          error: null,
        });
        const { Wrapper } = createWrapper();
        const { result } = renderHook(() => useCreateEvaluation(), { wrapper: Wrapper });

        await act(async () => {
          await result.current.mutateAsync({
            cycle_id: 'cy1', evaluator_user_id: 'u1', evaluated_user_id: 'u2', direction: 'leader_to_member', responses: { q1: 5 },
          });
        });

        expect(insertChain.insert).toHaveBeenCalledTimes(1);
      });

      it('duplicate save: 23505 error surfaces without poisoning cache', async () => {
        // First call — succeeds
        insertChain.single.mockResolvedValueOnce({
          data: { id: 'e1', cycle_id: 'cy1', evaluator_user_id: 'u1', evaluated_user_id: 'u2', direction: 'leader_to_member', responses: { q1: 5 } },
          error: null,
        });
        // Second call — 23505 unique violation (DB-side dedup)
        insertChain.single.mockResolvedValueOnce({
          data: null,
          error: { code: '23505', message: 'duplicate key value violates unique constraint' },
        });
        const { Wrapper } = createWrapper();
        const { result } = renderHook(() => useCreateEvaluation(), { wrapper: Wrapper });

        await act(async () => {
          await result.current.mutateAsync({
            cycle_id: 'cy1', evaluator_user_id: 'u1', evaluated_user_id: 'u2', direction: 'leader_to_member', responses: { q1: 5 },
          });
        });

        await act(async () => {
          try {
            await result.current.mutateAsync({
              cycle_id: 'cy1', evaluator_user_id: 'u1', evaluated_user_id: 'u2', direction: 'leader_to_member', responses: { q1: 5 },
            });
          } catch (e) {
            // expected duplicate error
          }
        });

        expect(insertChain.insert).toHaveBeenCalledTimes(2);
        // Idempotency: error path did not corrupt cache; mutation lifecycle settled cleanly
      });
    });
    ```

    2) **P4-V10 — FirstLoginChangePassword test handling.** Run the existence probe first:

    ```bash
    test -f src/pages/__tests__/FirstLoginChangePassword.test.tsx && echo EXISTS || echo MISSING
    ```

    **Branch A (EXISTS — extend):** Read the existing file's current contents and append a new `it()` block inside the existing `describe(...)`. The existing tests stay untouched. Append:

    ```typescript
      it('does not emit raw email or CPF to console during submit (QUAL-06 supplemental)', async () => {
        // Force production-like behavior so logger does not forward raw values to console
        vi.stubEnv('DEV', false);
        const logs: unknown[][] = [];
        const origLog = console.log;
        const origError = console.error;
        const origWarn = console.warn;
        console.log = (...args: unknown[]) => { logs.push(args); };
        console.error = (...args: unknown[]) => { logs.push(args); };
        console.warn = (...args: unknown[]) => { logs.push(args); };
        try {
          const wrapper = ({ children }: { children: React.ReactNode }) => (
            <MemoryRouter><QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider></MemoryRouter>
          );
          render(<FirstLoginChangePassword />, { wrapper });

          const flat = logs.flat().map(String).join(' ');
          // No raw email pattern (must NOT match a real email — anything redacted gets [email-redacted])
          expect(flat).not.toMatch(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/);
          // No raw 11-digit CPF
          expect(flat).not.toMatch(/\b\d{11}\b/);
        } finally {
          console.log = origLog;
          console.error = origError;
          console.warn = origWarn;
        }
      });
    ```

    Imports required at the top of the existing file (add only if missing): `vi`, `MemoryRouter`, `QueryClient`, `QueryClientProvider`, `FirstLoginChangePassword`. If the existing file already has them, no edit is needed at the top.

    **Branch B (MISSING — create from analog):** Create the file from scratch. Use PATTERNS.md section 9 analog (`tests/scope/useScopedQuery.test.tsx` for Wrapper + `tests/hiring/useMoveApplicationStage.test.tsx` lines 23-36 for the supabase module mock).

    ```typescript
    import { describe, it, expect, vi, beforeEach } from 'vitest';
    import { render } from '@testing-library/react';
    import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
    import { MemoryRouter } from 'react-router-dom';
    import React from 'react';

    // Supabase module mock — analog from tests/hiring/useMoveApplicationStage.test.tsx lines 23-36
    const authMock = {
      signInWithPassword: vi.fn(),
      updateUser: vi.fn(),
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1', email: 'redacted@example.com' } }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    };
    vi.mock('@/integrations/supabase/client', () => ({
      supabase: { auth: authMock, from: vi.fn(), rpc: vi.fn() },
    }));

    import FirstLoginChangePassword from '@/pages/FirstLoginChangePassword';

    describe('FirstLoginChangePassword (QUAL-03 fluxo 1) [INV-04-07-01]', () => {
      beforeEach(() => {
        vi.restoreAllMocks();
      });

      it('renders without crashing', () => {
        const wrapper = ({ children }: { children: React.ReactNode }) => (
          <MemoryRouter><QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider></MemoryRouter>
        );
        const { container } = render(<FirstLoginChangePassword />, { wrapper });
        expect(container.firstChild).not.toBeNull();
      });

      it('does not emit raw email or CPF to console during submit (QUAL-06 supplemental)', async () => {
        vi.stubEnv('DEV', false);
        const logs: unknown[][] = [];
        const origLog = console.log;
        const origError = console.error;
        const origWarn = console.warn;
        console.log = (...args: unknown[]) => { logs.push(args); };
        console.error = (...args: unknown[]) => { logs.push(args); };
        console.warn = (...args: unknown[]) => { logs.push(args); };
        try {
          const wrapper = ({ children }: { children: React.ReactNode }) => (
            <MemoryRouter><QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider></MemoryRouter>
          );
          render(<FirstLoginChangePassword />, { wrapper });

          const flat = logs.flat().map(String).join(' ');
          expect(flat).not.toMatch(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/);
          expect(flat).not.toMatch(/\b\d{11}\b/);
        } finally {
          console.log = origLog;
          console.error = origError;
          console.warn = origWarn;
        }
      });
    });
    ```

    Note: in dev, logger.ts forwards untouched. The test runs in vitest's jsdom environment where `import.meta.env.DEV` is typically true. To make the PII test deterministic, use `vi.stubEnv('DEV', false)` at the top of that specific test (cleanup unstubs in vitest setup).
  </action>
  <verify>
    <automated>npm test -- tests/perf/saveEvaluationIdempotent.test.tsx src/pages/__tests__/FirstLoginChangePassword.test.tsx 2>&1 | tail -20</automated>
  </verify>
  <acceptance_criteria>
    - File tests/perf/saveEvaluationIdempotent.test.tsx exists; `npm test -- tests/perf/saveEvaluationIdempotent.test.tsx 2>&1 | grep -E "Tests" | head -1` shows 2 passed and 0 failed
    - **P4-V10 — file exists post-task regardless of branch:** `test -f src/pages/__tests__/FirstLoginChangePassword.test.tsx && echo OK` returns OK
    - **P4-V10 — PII-in-console assertion present:** `grep -cE "raw email|email-redacted|\\\\d\\{11\\}|console\\.log = " src/pages/__tests__/FirstLoginChangePassword.test.tsx` returns at least 1
    - **P4-V10 — branch declaration recorded in SUMMARY:** SUMMARY explicitly states whether the file was EXTENDED (branch A) or CREATED (branch B), and which analog source was used (PATTERNS.md section 9 components)
    - `npm test -- src/pages/__tests__/FirstLoginChangePassword.test.tsx 2>&1 | grep -E "Tests" | head -1` shows N passed and 0 failed (N >= 1 in branch B; N = original + 1 in branch A)
  </acceptance_criteria>
  <done>saveEvaluationIdempotent test created (2 tests pass); FirstLoginChangePassword test exists at canonical path with PII-in-console assertion (P4-V10 branched correctly).</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Critical-flow coverage sanity test</name>
  <files>tests/sanity/criticalFlowsCoverage.test.ts</files>
  <read_first>
    - tests/sanity.test.ts (existing structure)
    - .planning/phases/04-dashboards-quality-polish/04-CONTEXT.md (QUAL-03 critical flows enumeration)
    - All test files created in this plan + existing useMoveApplicationStage.test.tsx
  </read_first>
  <behavior>
    A single "static enumeration" test that lists the 5 QUAL-03 flows and uses `node:fs` to assert each test file exists. Future regressions (someone deletes a critical-flow test) get caught immediately.
  </behavior>
  <action>
    Create tests/sanity/criticalFlowsCoverage.test.ts:

    ```typescript
    import { describe, it, expect } from 'vitest';
    import { existsSync } from 'node:fs';
    import { resolve } from 'node:path';

    /**
     * QUAL-01/02/03 sanity gate: every critical flow MUST have at least one test file.
     * If a future edit deletes one of these, this sanity test breaks first.
     *
     * Reference: ROADMAP.md Phase 4 success criterion 4 (5 fluxos críticos).
     */
    const FLOWS: Array<{ name: string; path: string }> = [
      { name: '1) Login + troca de senha', path: 'src/pages/__tests__/FirstLoginChangePassword.test.tsx' },
      { name: '2) Switch de escopo sem flash', path: 'tests/scope/switchScopeNoFlash.test.tsx' },
      { name: '3) Mover candidato no kanban (conflict/network/permission)', path: 'tests/hiring/useMoveApplicationStage.test.tsx' },
      { name: '4) Salvar avaliação idempotente', path: 'tests/perf/saveEvaluationIdempotent.test.tsx' },
      { name: '5) RLS cross-empresa fail-test (payroll)', path: 'supabase/tests/011-payroll-total-rls.sql' },
    ];

    describe('5 fluxos críticos QUAL-03 — coverage gate', () => {
      it.each(FLOWS)('flow exists: $name', ({ path }) => {
        expect(existsSync(resolve(path)), `Missing test for critical flow: ${path}`).toBe(true);
      });
    });
    ```
  </action>
  <verify>
    <automated>npm test -- tests/sanity/criticalFlowsCoverage.test.ts 2>&1 | tail -20</automated>
  </verify>
  <acceptance_criteria>
    - File tests/sanity/criticalFlowsCoverage.test.ts exists
    - `npm test -- tests/sanity/criticalFlowsCoverage.test.ts 2>&1 | grep -E "Tests" | head -1` shows 5 passed and 0 failed
    - `grep -c "5 fluxos críticos" tests/sanity/criticalFlowsCoverage.test.ts` returns at least 1
    - All 5 paths in the FLOWS array exist on disk (test passes proves this)
  </acceptance_criteria>
  <done>5-flow coverage gate test exists and passes; deleting any critical-flow test will fail this sanity test.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| client → DB via RPC | Test 011 verifies RLS gate on read_payroll_total |
| client console.log | Test 011 + extended FirstLogin test verifies no PII leaks |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-04-07-01 | Information Disclosure | RPC bypassed by sócio sem membership | mitigate | pgTAP 011 — 3 throws_ok 42501 cases (B alone, [A,B] mixed, unauth) |
| T-04-07-02 | Information Disclosure | scope switch flashes old data | mitigate | Component-level cache preservation test (D-04 extended); fetcher invocation count asserts no refetch on switch-back |
| T-04-07-03 | Tampering | duplicate evaluation insert poisons cache | mitigate | Idempotent test asserts mutation lifecycle handles 23505 cleanly |
| T-04-07-04 | Information Disclosure | PII in console during onboarding | mitigate | Stub DEV=false; spy console.*; assert no email/CPF patterns in output. P4-V10 ensures the test exists regardless of whether the file was extended or created from analog. |
| T-04-07-05 | Repudiation | future test deletion goes unnoticed | mitigate | Sanity coverage test enumerates the 5 flows + asserts file existence |
</threat_model>

<verification>
- npm test exits 0
- All 4 task tests pass: pgTAP 011 (when run via supabase test db), switchScopeNoFlash (2 tests), saveEvaluationIdempotent (2 tests), FirstLoginChangePassword (existing + 1 new in branch A; or 2 new in branch B), criticalFlowsCoverage (5 tests)
- Total new vitest tests: 9-10 depending on P4-V10 branch; pgTAP plan(4)
</verification>

<success_criteria>
- pgTAP 011 covers DASH-01 RLS with 4 assertions
- 3 new vitest test files created; 1 extended-or-created (P4-V10) — file exists at canonical path regardless of branch
- 1 sanity coverage test ensures the 5 flows can never silently lose tests
- npm test exits 0
</success_criteria>

<output>
After completion, create `.planning/phases/04-dashboards-quality-polish/04-07-SUMMARY.md` documenting:
- Files created and their test counts
- npm test output (final tail)
- Confirmation that grep for the 5 flow paths succeeds via the sanity test
- pgTAP run instructions for the operator (since CI may not run supabase test db locally)
- **P4-V10 branch declaration:** which branch was taken (A: extended existing / B: created from analog), which analog source files were used, and the final test count for FirstLoginChangePassword.test.tsx
</output>
</output>
