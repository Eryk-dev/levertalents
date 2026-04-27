import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useScopedQuery } from '@/shared/data/useScopedQuery';
import * as scopeModule from '@/app/providers/ScopeProvider';

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children);
  return { client, Wrapper };
}

type MockScope = {
  kind: 'company' | 'group';
  id: string;
  companyIds: string[];
  name: string;
} | null;

function mockScope(scope: MockScope, isResolving = false) {
  vi.spyOn(scopeModule, 'useScope').mockReturnValue({
    scope: scope as never,
    setScope: vi.fn(),
    pendingScope: null,
    confirmPendingScope: vi.fn(),
    cancelPendingScope: vi.fn(),
    isFixed: false,
    visibleCompanies: [],
    visibleGroups: [],
    isResolving,
  });
}

describe('useScopedQuery', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('queryKey starts with [scope, scope.id, scope.kind, ...]', async () => {
    mockScope({
      kind: 'company',
      id: 'c1',
      companyIds: ['c1'],
      name: 'Empresa 1',
    });
    const fetcher = vi.fn().mockResolvedValue(['data']);
    const { Wrapper, client } = createWrapper();
    renderHook(() => useScopedQuery(['my-feature'], fetcher), {
      wrapper: Wrapper,
    });
    await waitFor(() => expect(fetcher).toHaveBeenCalled());
    const cacheKeys = client.getQueryCache().getAll().map((q) => q.queryKey);
    expect(cacheKeys[0]).toEqual(['scope', 'c1', 'company', 'my-feature']);
  });

  it('switching scope produces a new key; old cache preserved (D-04)', async () => {
    const fetcher = vi.fn().mockResolvedValue(['data']);
    const { Wrapper, client } = createWrapper();

    mockScope({ kind: 'company', id: 'c1', companyIds: ['c1'], name: 'A' });
    const { rerender } = renderHook(() => useScopedQuery(['feat'], fetcher), {
      wrapper: Wrapper,
    });
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));

    mockScope({ kind: 'company', id: 'c2', companyIds: ['c2'], name: 'B' });
    rerender();
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));

    const allKeys = client.getQueryCache().getAll().map((q) => q.queryKey);
    expect(allKeys.some((k: readonly unknown[]) => k[1] === 'c1')).toBe(true); // OLD cache present
    expect(allKeys.some((k: readonly unknown[]) => k[1] === 'c2')).toBe(true); // NEW cache present
  });

  it('does not call fetcher when scope is null', () => {
    mockScope(null);
    const fetcher = vi.fn().mockResolvedValue([]);
    const { Wrapper } = createWrapper();
    renderHook(() => useScopedQuery(['x'], fetcher), { wrapper: Wrapper });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('does not call fetcher when isResolving=true', () => {
    mockScope(
      { kind: 'company', id: 'c1', companyIds: ['c1'], name: 'A' },
      true,
    );
    const fetcher = vi.fn().mockResolvedValue([]);
    const { Wrapper } = createWrapper();
    renderHook(() => useScopedQuery(['x'], fetcher), { wrapper: Wrapper });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('passes companyIds to the fetcher', async () => {
    mockScope({
      kind: 'group',
      id: 'g1',
      companyIds: ['c1', 'c2', 'c3'],
      name: 'Grupo',
    });
    const fetcher = vi.fn().mockResolvedValue([]);
    const { Wrapper } = createWrapper();
    renderHook(() => useScopedQuery(['x'], fetcher), { wrapper: Wrapper });
    await waitFor(() => expect(fetcher).toHaveBeenCalled());
    expect(fetcher).toHaveBeenCalledWith(['c1', 'c2', 'c3']);
  });
});
