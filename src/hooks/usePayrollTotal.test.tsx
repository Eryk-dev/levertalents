import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import * as scopeModule from '@/app/providers/ScopeProvider';

const rpcMock = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { rpc: (...args: unknown[]) => rpcMock(...args) },
}));

import { usePayrollTotal } from './usePayrollTotal';

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children);
  return { client, Wrapper };
}

type ScopeArg = { kind: 'company' | 'group'; id: string; companyIds: string[]; name: string } | null;

function mockScope(scope: ScopeArg, isResolving = false) {
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
  } as unknown as ReturnType<typeof scopeModule.useScope>);
}

describe('usePayrollTotal (DASH-01/02/03)', () => {
  beforeEach(() => {
    rpcMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('queryKey starts with [scope, id, kind, payroll-total]', async () => {
    mockScope({ kind: 'company', id: 'c1', companyIds: ['c1'], name: 'Empresa A' });
    rpcMock.mockResolvedValue({
      data: { total_cost: 10000, headcount: 5, avg_cost: 2000 },
      error: null,
    });
    const { Wrapper, client } = createWrapper();
    renderHook(() => usePayrollTotal(), { wrapper: Wrapper });
    await waitFor(() => expect(rpcMock).toHaveBeenCalled());
    const queryKey = client.getQueryCache().getAll()[0]?.queryKey ?? [];
    expect(queryKey[0]).toBe('scope');
    expect(queryKey[1]).toBe('c1');
    expect(queryKey[2]).toBe('company');
    expect(queryKey[3]).toBe('payroll-total');
  });

  it('passes companyIds to read_payroll_total RPC', async () => {
    mockScope({ kind: 'group', id: 'g1', companyIds: ['c1', 'c2', 'c3'], name: 'Grupo Lever' });
    rpcMock.mockResolvedValue({
      data: { total_cost: 30000, headcount: 12, avg_cost: 2500 },
      error: null,
    });
    const { Wrapper } = createWrapper();
    renderHook(() => usePayrollTotal(), { wrapper: Wrapper });
    await waitFor(() => expect(rpcMock).toHaveBeenCalledTimes(1));
    const args = rpcMock.mock.calls[0];
    expect(args[0]).toBe('read_payroll_total');
    expect(args[1]).toEqual({ p_company_ids: ['c1', 'c2', 'c3'] });
  });

  it('does not call rpc when scope is null', () => {
    mockScope(null);
    const { Wrapper } = createWrapper();
    renderHook(() => usePayrollTotal(), { wrapper: Wrapper });
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it('surfaces RPC error to React Query error state', async () => {
    mockScope({ kind: 'company', id: 'c1', companyIds: ['c1'], name: 'Empresa A' });
    rpcMock.mockResolvedValue({
      data: null,
      error: { code: '42501', message: 'Sem permissão' },
    });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => usePayrollTotal(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
