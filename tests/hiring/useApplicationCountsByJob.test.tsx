import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
} from 'vitest';
import * as scopeModule from '@/app/providers/ScopeProvider';

// Mock supabase client. The .from('applications').select(...).in(...) chain
// must resolve to { data, error }. Using direct client mock for reliability.
const inFn = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        in: inFn,
      })),
    })),
  },
}));

import { useApplicationCountsByJobs } from '@/hooks/hiring/useApplicationCountsByJob';

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children);
  return { client, Wrapper };
}

beforeEach(() => {
  vi.spyOn(scopeModule, 'useScope').mockReturnValue({
    scope: {
      kind: 'company',
      id: 'company:abc',
      companyIds: ['c1'],
      name: 'X',
    },
    setScope: vi.fn(),
    pendingScope: null,
    confirmPendingScope: vi.fn(),
    cancelPendingScope: vi.fn(),
    isFixed: false,
    visibleCompanies: [],
    visibleGroups: [],
    isResolving: false,
  } as unknown as ReturnType<typeof scopeModule.useScope>);
  inFn.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useApplicationCountsByJobs — useScopedQuery + byGroup', () => {
  it('retorna byGroup com 6 keys (triagem/checagem/entrevista_rh/entrevista_final/decisao/descartados)', async () => {
    inFn.mockResolvedValue({
      data: [
        { id: 'a1', job_opening_id: 'j1', stage: 'em_interesse', stage_entered_at: '2026-04-20T00:00:00Z', updated_at: '2026-04-20T00:00:00Z' },
        { id: 'a2', job_opening_id: 'j1', stage: 'apto_entrevista_rh', stage_entered_at: '2026-04-21T00:00:00Z', updated_at: '2026-04-21T00:00:00Z' },
      ],
      error: null,
    });

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useApplicationCountsByJobs(['j1']), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const counts = result.current.data?.['j1'];
    expect(counts?.byGroup).toBeDefined();
    expect(Object.keys(counts!.byGroup).sort()).toEqual(
      ['checagem', 'decisao', 'descartados', 'entrevista_final', 'entrevista_rh', 'triagem'],
    );
    expect(counts!.total).toBe(2);
  });

  it('queryKey usa scope.id (Phase 1 chokepoint)', async () => {
    inFn.mockResolvedValue({ data: [], error: null });
    const { client, Wrapper } = createWrapper();
    renderHook(() => useApplicationCountsByJobs(['j1']), { wrapper: Wrapper });

    await waitFor(() => {
      const queries = client.getQueryCache().getAll();
      const found = queries.find(
        (q) =>
          Array.isArray(q.queryKey) &&
          q.queryKey.includes('application-counts-by-jobs'),
      );
      expect(found?.queryKey?.[0]).toBe('scope');
      expect(found?.queryKey?.[1]).toBe('company:abc');
      expect(found?.queryKey?.[2]).toBe('company');
    });
  });

  it('count zero para grupo sem candidatos', async () => {
    inFn.mockResolvedValue({
      data: [
        { id: 'a1', job_opening_id: 'j1', stage: 'em_interesse', stage_entered_at: '2026-04-20T00:00:00Z', updated_at: null },
      ],
      error: null,
    });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useApplicationCountsByJobs(['j1']), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const counts = result.current.data?.['j1'];
    // em_interesse maps to triagem; checagem/decisao/etc. are 0
    expect(counts?.byGroup.checagem).toBe(0);
    expect(counts?.byGroup.decisao).toBe(0);
    expect(counts?.byGroup.descartados).toBe(0);
  });

  it('soma total inclui descartados', async () => {
    inFn.mockResolvedValue({
      data: [
        { id: 'a1', job_opening_id: 'j1', stage: 'em_interesse', stage_entered_at: '2026-04-20T00:00:00Z', updated_at: null },
        { id: 'a2', job_opening_id: 'j1', stage: 'recusado', stage_entered_at: '2026-04-21T00:00:00Z', updated_at: null },
      ],
      error: null,
    });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useApplicationCountsByJobs(['j1']), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const counts = result.current.data?.['j1'];
    expect(counts?.total).toBe(2);
    expect(counts?.byGroup.descartados).toBeGreaterThanOrEqual(1);
  });

  it('respeita filter por jobId — separa contagens entre jobs', async () => {
    inFn.mockResolvedValue({
      data: [
        { id: 'a1', job_opening_id: 'j1', stage: 'em_interesse', stage_entered_at: '2026-04-20T00:00:00Z', updated_at: null },
        { id: 'a2', job_opening_id: 'j2', stage: 'em_interesse', stage_entered_at: '2026-04-21T00:00:00Z', updated_at: null },
        { id: 'a3', job_opening_id: 'j2', stage: 'apto_entrevista_rh', stage_entered_at: '2026-04-22T00:00:00Z', updated_at: null },
      ],
      error: null,
    });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useApplicationCountsByJobs(['j1', 'j2']), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.['j1']?.total).toBe(1);
    expect(result.current.data?.['j2']?.total).toBe(2);
  });

  it('mapeia stages legados para grupo correto via STAGE_GROUP_BY_STAGE', async () => {
    inFn.mockResolvedValue({
      data: [
        // aguardando_fit_cultural maps to triagem (legacy)
        { id: 'a1', job_opening_id: 'j1', stage: 'aguardando_fit_cultural', stage_entered_at: '2026-04-20T00:00:00Z', updated_at: null },
        // entrevista_rh_agendada -> entrevista_rh
        { id: 'a2', job_opening_id: 'j1', stage: 'entrevista_rh_agendada', stage_entered_at: '2026-04-21T00:00:00Z', updated_at: null },
      ],
      error: null,
    });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useApplicationCountsByJobs(['j1']), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const counts = result.current.data?.['j1'];
    expect(counts?.byGroup.entrevista_rh).toBeGreaterThanOrEqual(1);
    expect(counts?.total).toBe(2);
  });
});
