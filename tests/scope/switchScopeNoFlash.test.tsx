import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import * as scopeModule from '@/app/providers/ScopeProvider';
import { useScopedQuery } from '@/shared/data/useScopedQuery';

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: Infinity,
        // staleTime: Infinity ensures that switching back to c1 finds the
        // existing query "fresh" and TanStack does NOT refetch on mount.
        // This is what production sets via useScopedQuery callers (e.g.,
        // useCostBreakdown / useOrgIndicators) — the no-flash invariant.
        staleTime: Infinity,
      },
    },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children);
  return { client, Wrapper };
}

function mockScope(scope: {
  kind: 'company' | 'group';
  id: string;
  companyIds: string[];
  name: string;
}) {
  vi.spyOn(scopeModule, 'useScope').mockReturnValue({
    scope: scope as never,
    setScope: vi.fn(),
    pendingScope: null,
    confirmPendingScope: vi.fn(),
    cancelPendingScope: vi.fn(),
    isFixed: false,
    visibleCompanies: [],
    visibleGroups: [],
    isResolving: false,
  });
}

describe('Switch escopo — sem flash (QUAL-03 fluxo 2) [INV-04-07-02]', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('switching from c1 to c2 preserves c1 cache and produces a new c2 entry', async () => {
    const fetcher = vi.fn().mockResolvedValue(['data']);
    const { Wrapper, client } = createWrapper();

    mockScope({ kind: 'company', id: 'c1', companyIds: ['c1'], name: 'A' });
    const { rerender } = renderHook(
      () => useScopedQuery(['critical-flow'], fetcher),
      { wrapper: Wrapper },
    );
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));

    // Switch
    mockScope({ kind: 'company', id: 'c2', companyIds: ['c2'], name: 'B' });
    rerender();
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));

    const allKeys = client.getQueryCache().getAll().map((q) => q.queryKey);
    const c1Keys = allKeys.filter((k: readonly unknown[]) => k[1] === 'c1');
    const c2Keys = allKeys.filter((k: readonly unknown[]) => k[1] === 'c2');
    expect(c1Keys.length).toBeGreaterThan(0); // OLD cache preserved
    expect(c2Keys.length).toBeGreaterThan(0); // NEW cache created
  });

  it('switching back to c1 reuses the old cached data without refetching', async () => {
    const fetcher = vi.fn().mockResolvedValue(['c1-data']);
    const { Wrapper } = createWrapper();

    mockScope({ kind: 'company', id: 'c1', companyIds: ['c1'], name: 'A' });
    const { rerender } = renderHook(
      () => useScopedQuery(['critical-flow'], fetcher),
      { wrapper: Wrapper },
    );
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));

    mockScope({ kind: 'company', id: 'c2', companyIds: ['c2'], name: 'B' });
    rerender();
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));

    // Switch back
    mockScope({ kind: 'company', id: 'c1', companyIds: ['c1'], name: 'A' });
    rerender();
    // Cache for c1 still fresh (gcTime: Infinity); no refetch
    await new Promise((r) => setTimeout(r, 50));
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
