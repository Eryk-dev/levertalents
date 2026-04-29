---
phase: 04-dashboards-quality-polish
plan: 05
type: execute
wave: 3
depends_on:
  - 03
files_modified:
  - src/components/CmdKPalette.tsx
  - src/components/CmdKPalette.test.tsx
autonomous: true
requirements:
  - DASH-04
tags:
  - cmd-k
  - search
  - ui-refactor
  - phase-4

must_haves:
  truths:
    - "Cmd+K palette dynamic search uses useScopedQuery (queryKey includes scope.id) — never bypasses scope"
    - "RPC global_search is called with p_company_ids = scope.companyIds, so candidatos/vagas/pessoas from out-of-scope empresas never appear"
    - "Static actions match D-07 lock: 'Criar nova vaga' (Briefcase, /hiring/jobs/nova) + 'Convidar / criar pessoa' (UserPlus, /criar-usuario for admin/rh/socio)"
    - "Removed quick actions: PDI, agendar 1:1, iniciar avaliação, trocar escopo (D-07 NÃO inclui)"
    - "Default state (empty query) shows only static groups (Ações + Ir para) — no histórico de recentes (D-08 LOCK)"
    - "RemoteKind no longer includes 'pdi'; ordering is Vagas → Candidatos → Pessoas (UI-SPEC Surface 2)"
    - "Spacing fixes per UI-SPEC: input row px-4 py-3, CommandItem py-2 px-3, debounce 150ms, placeholder 'Buscar vagas, candidatos, pessoas…'"
    - "queryKey D-09 contract is asserted at the test level — final shape is ['scope', scope.id, scope.kind, ..., 'global-search', ...] (P4-V02)"
  artifacts:
    - path: src/components/CmdKPalette.tsx
      provides: "Refactored palette with useScopedQuery, scoped global_search call, updated static actions, UI-SPEC spacing"
      contains: "useScopedQuery"
      max_lines: 320
  key_links:
    - from: "src/components/CmdKPalette.tsx remote search"
      to: "src/shared/data/useScopedQuery.ts"
      via: "useScopedQuery hook (chokepoint)"
      pattern: "useScopedQuery"
    - from: "src/components/CmdKPalette.tsx remote search fetcher"
      to: "supabase.rpc('global_search', { q, max_per_kind, p_company_ids })"
      via: "scoped RPC call"
      pattern: "p_company_ids"
---

<objective>
Refactor `src/components/CmdKPalette.tsx` (309 lines) to use `useScopedQuery` for the dynamic search (per CONTEXT D-09 and UI-SPEC Surface 2). Update static actions per D-07 (only "Criar nova vaga" + "Convidar / criar pessoa" — no PDI/1:1/avaliação/trocar escopo). Remove the 'pdi' RemoteKind. Apply UI-SPEC spacing fixes (input row px-4 py-3, CommandItem py-2 px-3, debounce 150ms). Default state shows only static groups (no recents per D-08).

Purpose: Close the scope-leakage gap (T-DASH-04) — Cmd+K results must respect the current empresa/grupo selection.
Output: Refactored palette ≤ 320 lines, scoped search, simplified action set, exact UI-SPEC visuals.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/phases/04-dashboards-quality-polish/04-CONTEXT.md
@.planning/phases/04-dashboards-quality-polish/04-PATTERNS.md
@.planning/phases/04-dashboards-quality-polish/04-UI-SPEC.md
@CLAUDE.md
@src/components/CmdKPalette.tsx
@src/shared/data/useScopedQuery.ts
@src/app/providers/ScopeProvider.tsx
@src/components/ui/command.tsx
@src/components/ui/dialog.tsx
@src/hooks/usePayrollTotal.test.tsx

<interfaces>
<!-- Existing scoped chokepoint -->
import { useScopedQuery } from '@/shared/data/useScopedQuery';
import { useScope } from '@/app/providers/ScopeProvider';
// scope.companyIds: string[] passed to fetcher
// useScopedQuery prepends ['scope', scope.id, scope.kind, ...] to the user's queryKey

<!-- Plan 02 RPC signature (post-Plan-03 push) -->
public.global_search(q text, max_per_kind int, p_company_ids uuid[])
RETURNS TABLE (kind text, id uuid, title text, subtitle text, url text)

<!-- Existing UI primitives -->
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Kbd } from '@/components/primitives/LinearKit';

<!-- Reference: queryKey shape assertion analog (Plan 02 Test 1) -->
// From src/hooks/usePayrollTotal.test.tsx Test 1 — queryKey starts with ['scope', scope.id, scope.kind, ...]
// const keys = client.getQueryCache().getAll().map((q) => q.queryKey);
// expect(keys[0]).toEqual(['scope', 'c1', 'company', 'payroll-total']);
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Refactor CmdKPalette.tsx to useScopedQuery + D-07 actions + UI-SPEC visuals</name>
  <files>src/components/CmdKPalette.tsx, src/components/CmdKPalette.test.tsx</files>
  <read_first>
    - src/components/CmdKPalette.tsx (full 309 lines — current state; identify the useQuery call at line 116-128 to replace, the static action items at line 155-194 to simplify, the REMOTE_META at line 57-62 to update)
    - .planning/phases/04-dashboards-quality-polish/04-PATTERNS.md (section 2 — verbatim imports, queryKey shape, REMOTE_META update, static actions update, spacing fixes)
    - .planning/phases/04-dashboards-quality-polish/04-UI-SPEC.md (Surface 2 — full visual + interaction contract; copy table for placeholder, group headings, action labels, footer)
    - .planning/phases/04-dashboards-quality-polish/04-CONTEXT.md (D-06..D-09 — locked decisions for Cmd+K)
    - src/shared/data/useScopedQuery.ts (chokepoint signature — observe that it prepends ['scope', scope.id, scope.kind] to the user-provided key)
    - src/hooks/usePayrollTotal.test.tsx (Test 1 — queryKey assertion analog to mirror in this plan's Test 6)
  </read_first>
  <behavior>
    Test 1 (default state, empty query): renders both static groups "Ações" (with "Criar nova vaga") and "Ir para" (with at least "Início" and "Vagas") — no remote groups visible.

    Test 2 (action set): when canManage (admin/rh/socio role), "Convidar / criar pessoa" renders; "Criar nova vaga" always renders. NEITHER "Criar novo PDI" NOR "Agendar 1:1" NOR "Iniciar avaliação" NOR "Trocar escopo" appears.

    Test 3 (scoped search): typing 'react' triggers a useScopedQuery call; the spied supabase.rpc receives p_company_ids = current scope.companyIds. Test mocks scope.companyIds = ['c1', 'c2'] and verifies the RPC arg.

    Test 4 (PDI removed): even if RPC returns a row with kind='pdi', the UI does NOT render a "PDIs" group (REMOTE_META no longer includes 'pdi').

    Test 5 (debounce 150ms — P4-V07 resolved with fake timers): with vi.useFakeTimers active, typing 'react' fires the RPC zero times before advancing to t=149ms and exactly once after advancing past t=150ms. This proves the debounced cadence is the locked 150ms (UI-SPEC).

    Test 6 (D-09 queryKey contract — P4-V02): after a search fires, the cache contains a query whose queryKey shape is `['scope', scope.id, scope.kind, ..., 'global-search', debouncedQuery]`. Asserts the chokepoint prefix is correctly applied AND the user-provided segments are preserved (mirrors src/hooks/usePayrollTotal.test.tsx Test 1).

    Test 7 (placeholder + footer copy match UI-SPEC).
  </behavior>
  <action>
    Rewrite src/components/CmdKPalette.tsx. Read first to preserve existing keyboard handling and Dialog wiring, then transform per the spec:

    Key transformations:
    1. Replace `import { useQuery } from "@tanstack/react-query"` with `import { useScopedQuery } from "@/shared/data/useScopedQuery";` and `import { useScope } from "@/app/providers/ScopeProvider";`. Keep `import { supabase } from "@/integrations/supabase/client";` since it's used inside the scoped fetcher.

    2. Update RemoteKind type and REMOTE_META — drop 'pdi', reorder Vagas → Candidatos → Pessoas:
    ```typescript
    type RemoteKind = "candidate" | "job" | "person";

    const REMOTE_META: Record<RemoteKind, { label: string; icon: React.ElementType }> = {
      job:       { label: "Vagas",      icon: Briefcase },
      candidate: { label: "Candidatos", icon: UserSearch },
      person:    { label: "Pessoas",    icon: User },
    };

    const REMOTE_ORDER: RemoteKind[] = ["job", "candidate", "person"];
    ```

    3. Replace the existing `useQuery` block (lines ~116-128) with a `useScopedQuery` call that passes `p_company_ids: companyIds`:
    ```typescript
    const { scope } = useScope();

    const { data: remoteResults = [], isFetching: remoteLoading } = useScopedQuery<SearchRow[]>(
      ['global-search', debouncedQuery],
      async (companyIds) => {
        const { data, error } = await supabase.rpc(
          'global_search' as never,
          { q: debouncedQuery, max_per_kind: 6, p_company_ids: companyIds } as never,
        );
        if (error) throw error;
        return (data ?? []) as SearchRow[];
      },
      { staleTime: 30_000, enabled: open && debouncedQuery.length >= 2 },
    );
    ```

    4. Update debounce from 180 to 150:
    ```typescript
    const debouncedQuery = useDebouncedValue(query.trim(), 150);
    ```

    5. Update remoteGroups to iterate REMOTE_ORDER (without 'pdi'):
    ```typescript
    const remoteGroups = useMemo(() => {
      const grouped: Record<RemoteKind, SearchRow[]> = { candidate: [], job: [], person: [] };
      for (const row of remoteResults) {
        if (row.kind in grouped) grouped[row.kind as RemoteKind].push(row);
      }
      return REMOTE_ORDER
        .filter((k) => grouped[k].length > 0)
        .map((k) => ({ kind: k, rows: grouped[k] }));
    }, [remoteResults]);
    ```

    6. Simplify static actions per D-07 (lines ~155-194). Remove "Criar novo PDI", "Agendar 1:1", "Iniciar avaliação". KEEP only "Criar nova vaga" and "Convidar / criar pessoa" (canManage):
    ```typescript
    const items: Entry[] = [
      // Ações (D-07)
      ...(canManage
        ? [
            { id: "act-job", label: "Criar nova vaga", icon: Briefcase, group: "Ações" as const, action: nav("/hiring/jobs/nova") },
            { id: "act-invite", label: "Convidar / criar pessoa", icon: UserPlus, group: "Ações" as const, action: nav("/criar-usuario") },
          ]
        : []),

      // Ir para (navegação)
      { id: "go-home",    label: "Início",         icon: Home,      group: "Ir para", shortcut: "G H", action: nav(homeRoute) },
      ...(canManage || isLeader
        ? [{ id: "go-jobs", label: "Vagas", icon: Briefcase, group: "Ir para" as const, shortcut: "G V", action: nav("/hiring/jobs") }]
        : []),
      ...(canManage
        ? [{ id: "go-cand", label: "Candidatos", icon: UserSearch, group: "Ir para" as const, action: nav("/hiring/candidates") }]
        : []),
      ...(hasTeamView
        ? [
            { id: "go-team", label: "Meu time", icon: Users,    group: "Ir para" as const, shortcut: "G T", action: nav("/meu-time") },
            { id: "go-11s",  label: "1:1s",      icon: Calendar, group: "Ir para" as const, shortcut: "G 1", action: nav("/11s") },
          ]
        : []),
      { id: "go-evals",   label: "Avaliações", icon: BarChart3, group: "Ir para", shortcut: "G A", action: nav("/avaliacoes") },
      { id: "go-climate", label: "Clima",      icon: Activity,  group: "Ir para", shortcut: "G C", action: nav("/clima") },
      ...(canManage
        ? [{ id: "go-comp", label: "Empresas", icon: Building2, group: "Ir para" as const, action: nav("/empresas") }]
        : []),
    ];
    ```

    7. Apply UI-SPEC spacing fixes:
    - Input row: change `px-3.5` to `px-4 py-3`
    - CommandItem className: change `px-2.5` to `px-3 py-2`
    - Placeholder: `placeholder="Buscar vagas, candidatos, pessoas…"`

    8. Footer keyboard hint copy must be exactly: `"↵ selecionar · ↑↓ navegar · ⌘K abrir / fechar"` (UI-SPEC LOCK).

    Now create src/components/CmdKPalette.test.tsx covering the 7 behaviors. Skeleton:

    ```typescript
    import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
    import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
    import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
    import { MemoryRouter } from 'react-router-dom';
    import React from 'react';
    import * as scopeModule from '@/app/providers/ScopeProvider';
    import * as authModule from '@/hooks/useAuth';

    const rpcMock = vi.fn();
    vi.mock('@/integrations/supabase/client', () => ({
      supabase: { rpc: (...args: unknown[]) => rpcMock(...args) },
    }));

    import { CmdKPalette } from './CmdKPalette';

    function wrap(ui: React.ReactNode) {
      const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
      const utils = render(<QueryClientProvider client={client}><MemoryRouter>{ui}</MemoryRouter></QueryClientProvider>);
      return { ...utils, client };
    }

    function mockScope(companyIds: string[] = ['c1', 'c2'], id: string = 'c1', kind: 'company' | 'group' = 'company') {
      vi.spyOn(scopeModule, 'useScope').mockReturnValue({
        scope: { kind, id, companyIds, name: 'Empresa A' },
        setScope: vi.fn(), pendingScope: null, confirmPendingScope: vi.fn(),
        cancelPendingScope: vi.fn(), isFixed: false, visibleCompanies: [],
        visibleGroups: [], isResolving: false,
      } as never);
    }

    function mockAuth(role: 'admin' | 'rh' | 'socio' | 'lider' | 'colaborador' = 'rh') {
      vi.spyOn(authModule, 'useAuth').mockReturnValue({
        user: { id: 'u1' }, userRole: role, realRole: role, viewAsRole: null,
        setViewAsRole: vi.fn(), isViewingAs: false, loading: false,
      } as never);
    }

    beforeEach(() => {
      rpcMock.mockReset();
      vi.restoreAllMocks();
    });

    describe('CmdKPalette (DASH-04)', () => {
      it('Test 1 — default state shows only static groups', () => {
        mockScope(); mockAuth('rh');
        wrap(<CmdKPalette />);
        window.dispatchEvent(new Event('open-cmdk'));
        expect(screen.getByText('Criar nova vaga')).toBeInTheDocument();
        expect(screen.getByText('Convidar / criar pessoa')).toBeInTheDocument();
        expect(screen.queryByText(/Criar novo PDI/)).not.toBeInTheDocument();
        expect(screen.queryByText(/Agendar 1:1/)).not.toBeInTheDocument();
        expect(screen.queryByText(/Iniciar avaliação/)).not.toBeInTheDocument();
      });

      it('Test 2 — action set respects canManage', () => {
        mockScope(); mockAuth('lider'); // not canManage
        wrap(<CmdKPalette />);
        window.dispatchEvent(new Event('open-cmdk'));
        expect(screen.queryByText('Criar nova vaga')).not.toBeInTheDocument();
        expect(screen.queryByText('Convidar / criar pessoa')).not.toBeInTheDocument();
      });

      it('Test 3 — scoped search passes p_company_ids', async () => {
        mockScope(['c1', 'c2']); mockAuth('rh');
        rpcMock.mockResolvedValue({ data: [], error: null });
        wrap(<CmdKPalette />);
        window.dispatchEvent(new Event('open-cmdk'));
        const input = await screen.findByPlaceholderText(/Buscar vagas, candidatos, pessoas/);
        fireEvent.change(input, { target: { value: 'react' } });
        await waitFor(() => expect(rpcMock).toHaveBeenCalled(), { timeout: 1000 });
        const args = rpcMock.mock.calls[0];
        expect(args[0]).toBe('global_search');
        expect(args[1]).toMatchObject({ q: 'react', max_per_kind: 6, p_company_ids: ['c1', 'c2'] });
      });

      it('Test 4 — PDI rows from RPC are NOT rendered as a group', async () => {
        mockScope(); mockAuth('rh');
        rpcMock.mockResolvedValue({
          data: [
            { kind: 'pdi', id: 'p1', title: 'PDI X', subtitle: null, url: '/pdi/p1' },
            { kind: 'job', id: 'j1', title: 'Vaga Y', subtitle: null, url: '/hiring/jobs/j1' },
          ],
          error: null,
        });
        wrap(<CmdKPalette />);
        window.dispatchEvent(new Event('open-cmdk'));
        const input = await screen.findByPlaceholderText(/Buscar vagas/);
        fireEvent.change(input, { target: { value: 'algo' } });
        await waitFor(() => expect(screen.getByText('Vaga Y')).toBeInTheDocument(), { timeout: 1000 });
        // PDI row not rendered (REMOTE_META no longer has 'pdi')
        expect(screen.queryByText('PDI X')).not.toBeInTheDocument();
      });

      it('Test 5 — debounce 150ms via fake timers (P4-V07)', async () => {
        vi.useFakeTimers();
        try {
          mockScope(['c1']); mockAuth('rh');
          rpcMock.mockResolvedValue({ data: [], error: null });
          wrap(<CmdKPalette />);
          window.dispatchEvent(new Event('open-cmdk'));
          const input = screen.getByPlaceholderText(/Buscar vagas/);
          fireEvent.change(input, { target: { value: 'react' } });

          // Advance to just before 150ms — RPC must NOT have fired yet
          await act(async () => { vi.advanceTimersByTime(149); });
          expect(rpcMock).not.toHaveBeenCalled();

          // Advance past 150ms — RPC fires exactly once
          await act(async () => { vi.advanceTimersByTime(2); });
          // Allow microtasks for the resolved fetcher to settle
          await act(async () => { await Promise.resolve(); });
          expect(rpcMock).toHaveBeenCalledTimes(1);
        } finally {
          vi.useRealTimers();
        }
      });

      it('Test 6 — D-09 queryKey contract: ["scope", id, kind, ..., "global-search", q] (P4-V02)', async () => {
        mockScope(['c1', 'c2'], 'c1', 'company'); mockAuth('rh');
        rpcMock.mockResolvedValue({ data: [], error: null });
        const { client } = wrap(<CmdKPalette />);
        window.dispatchEvent(new Event('open-cmdk'));
        const input = await screen.findByPlaceholderText(/Buscar vagas/);
        fireEvent.change(input, { target: { value: 'react' } });
        await waitFor(() => expect(rpcMock).toHaveBeenCalled(), { timeout: 1000 });

        // Find the global-search query in cache and assert chokepoint prefix shape
        const cache = client.getQueryCache().getAll();
        // Find the query whose key includes 'global-search'
        const target = cache.find((q) =>
          Array.isArray(q.queryKey) && (q.queryKey as readonly unknown[]).includes('global-search'),
        );
        expect(target).toBeDefined();
        const key = target!.queryKey as readonly unknown[];
        // Mirror src/hooks/usePayrollTotal.test.tsx Test 1: prefix shape ['scope', id, kind, ...]
        expect(key[0]).toBe('scope');
        expect(key[1]).toBe('c1');           // scope.id
        expect(key[2]).toBe('company');      // scope.kind
        expect(key).toContain('global-search');
        expect(key).toContain('react');      // debounced query is part of the user-provided segment
      });

      it('Test 7 — placeholder and footer match UI-SPEC copy', () => {
        mockScope(); mockAuth('rh');
        wrap(<CmdKPalette />);
        window.dispatchEvent(new Event('open-cmdk'));
        expect(screen.getByPlaceholderText('Buscar vagas, candidatos, pessoas…')).toBeInTheDocument();
        expect(screen.getByText(/selecionar/)).toBeInTheDocument();
        expect(screen.getByText(/abrir \/ fechar/)).toBeInTheDocument();
      });
    });
    ```

    Note on canManage logic: `canManage = isAdmin || isRH || isSocio` (preserved from current file). hasTeamView includes lider.
  </action>
  <verify>
    <automated>npm test -- src/components/CmdKPalette.test.tsx 2>&1 | tail -30</automated>
  </verify>
  <acceptance_criteria>
    - File src/components/CmdKPalette.tsx is ≤ 320 lines (`wc -l < src/components/CmdKPalette.tsx`)
    - `grep -c "useScopedQuery" src/components/CmdKPalette.tsx` returns at least 2 (import + usage)
    - `grep -c "useScope\b" src/components/CmdKPalette.tsx` returns at least 2 (import + usage)
    - `grep -c "p_company_ids" src/components/CmdKPalette.tsx` returns at least 1
    - `grep -c "useQuery\b" src/components/CmdKPalette.tsx` returns 0 (replaced by useScopedQuery)
    - `grep -c "Criar novo PDI\|Agendar 1:1\|Iniciar avaliação\|act-pdi\|act-11\|act-eval" src/components/CmdKPalette.tsx` returns 0 (deprecated actions removed)
    - `grep -c "Criar nova vaga" src/components/CmdKPalette.tsx` returns at least 1
    - `grep -c "Convidar / criar pessoa" src/components/CmdKPalette.tsx` returns at least 1
    - `grep -cE '"pdi"' src/components/CmdKPalette.tsx` returns 0 (RemoteKind cleaned)
    - `grep -c "150)" src/components/CmdKPalette.tsx` returns at least 1 (debounce 150ms)
    - `grep -c "Buscar vagas, candidatos, pessoas" src/components/CmdKPalette.tsx` returns at least 1
    - `grep -c "px-4 py-3" src/components/CmdKPalette.tsx` returns at least 1 (input row)
    - `grep -c "py-2 px-3\|px-3 py-2" src/components/CmdKPalette.tsx` returns at least 1 (CommandItem)
    - `npm test -- src/components/CmdKPalette.test.tsx 2>&1 | grep -E "Tests" | head -1` shows 7 passed and 0 failed
    - **P4-V02 — D-09 queryKey assertion:** Test 6 of CmdKPalette.test.tsx asserts `key[0] === 'scope'`, `key[1] === scope.id`, `key[2] === scope.kind`, and `key` contains `'global-search'`
    - **P4-V07 — debounce test resolution:** Test 5 of CmdKPalette.test.tsx uses `vi.useFakeTimers` + `advanceTimersByTime(149)` + `advanceTimersByTime(2)` to assert exact 150ms cadence
  </acceptance_criteria>
  <done>CmdKPalette refactored to ≤ 320 lines, scoped search via useScopedQuery, simplified D-07 actions, UI-SPEC visuals, 7 tests passing (incl. queryKey contract + fake-timer debounce).</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| client search input → RPC | Untrusted query string + scope filter must travel together |
| Cmd+K results → render | Out-of-scope rows must never reach the DOM |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-04-05-01 | Information Disclosure | Cmd+K cross-empresa leakage | mitigate | useScopedQuery passes scope.companyIds to global_search RPC; queryKey includes scope.id so cache is per-scope; defense-in-depth via SECURITY INVOKER RLS at row level. Test 6 (P4-V02) asserts the queryKey shape end-to-end. |
| T-04-05-02 | Information Disclosure | RemoteKind 'pdi' rows leaking | mitigate | REMOTE_META no longer includes 'pdi'; even if RPC returns a 'pdi' row (legacy clients), the UI groups exclude it. Test 4 enforces. |
| T-04-05-03 | Tampering | Action labels could be repurposed | accept | Static actions hardcoded; not derived from data; cannot be tampered without code edit |
| T-04-05-04 | Denial of Service | Excessive RPC calls during typing | mitigate | Debounce 150ms (Test 5 fake-timer asserts the exact cadence); staleTime 30s; enabled only when query length ≥ 2 |
</threat_model>

<verification>
- npm test -- src/components/CmdKPalette.test.tsx — 7 tests pass
- npm run lint — no new errors
- npm run build — passes
- File ≤ 320 lines
- Test 5 uses fake timers; Test 6 asserts D-09 queryKey contract
</verification>

<success_criteria>
- Cmd+K dynamic search uses useScopedQuery with scope.companyIds
- Static actions match D-07 (Criar vaga + Convidar pessoa, no PDI/1:1/avaliação)
- PDI RemoteKind removed
- UI-SPEC spacing/copy applied
- 7 component tests passing — including the D-09 queryKey contract assertion (P4-V02) and the fake-timer debounce assertion (P4-V07)
</success_criteria>

<output>
After completion, create `.planning/phases/04-dashboards-quality-polish/04-05-SUMMARY.md` documenting:
- Line count diff
- Test results (7 passed)
- Confirmation greps for removed actions and added behaviors
- Snapshot of the asserted queryKey shape from Test 6
</output>
</output>
