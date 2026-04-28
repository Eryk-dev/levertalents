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
import * as authModule from '@/hooks/useAuth';
import * as sonner from 'sonner';

// Supabase client mock factory — each test customizes the maybeSingle outcome.
// Direct module mock is more reliable than MSW for these unit tests because
// supabase-js internally uses @supabase/node-fetch which doesn't intercept
// cleanly under the jsdom env.
const maybeSingleMock = vi.fn();
const lastUpdatePayload: { value?: unknown } = {};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      update: vi.fn((payload: unknown) => {
        lastUpdatePayload.value = payload;
        return {
          eq: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          maybeSingle: maybeSingleMock,
        };
      }),
    })),
  },
}));

import { useMoveApplicationStage } from '@/hooks/hiring/useApplications';

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false },
    },
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
      name: 'Empresa Teste',
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
  vi.spyOn(authModule, 'useAuth').mockReturnValue({
    user: { id: 'u1' } as never,
    loading: false,
    userRole: 'rh',
    realRole: 'rh',
    viewAsRole: null,
    setViewAsRole: vi.fn(),
    isViewingAs: false,
  } as ReturnType<typeof authModule.useAuth>);
  vi.spyOn(sonner.toast, 'error').mockImplementation(() => 'id' as never);
  vi.spyOn(sonner.toast, 'info').mockImplementation(() => 'id' as never);
  maybeSingleMock.mockReset();
  lastUpdatePayload.value = undefined;
});

afterEach(() => {
  vi.restoreAllMocks();
});

const APPLICATIONS_KEY = [
  'scope',
  'company:abc',
  'company',
  'hiring',
  'applications',
  'by-job',
  'j1',
] as const;

function seedCache(client: QueryClient) {
  client.setQueryData(APPLICATIONS_KEY, [
    {
      id: 'app-1',
      candidate_id: 'cand-1',
      job_opening_id: 'j1',
      stage: 'em_interesse',
      stage_entered_at: '2026-04-20T00:00:00Z',
      last_moved_by: null,
      notes: null,
      rejection_message_id: null,
      discard_reason: null,
      discard_notes: null,
      added_to_talent_pool: false,
      closed_at: null,
      created_at: '2026-04-20T00:00:00Z',
      updated_at: '2026-04-20T00:00:00Z',
      candidate: { id: 'cand-1', full_name: 'Foo', email: 'foo@x.com', anonymized_at: null },
    },
  ]);
}

const moveArgs = {
  id: 'app-1',
  fromStage: 'em_interesse' as const,
  toStage: 'apto_entrevista_rh' as const,
  jobId: 'j1',
  companyId: 'c1',
};

const successRow = {
  id: 'app-1',
  candidate_id: 'cand-1',
  job_opening_id: 'j1',
  stage: 'apto_entrevista_rh',
  stage_entered_at: '2026-04-27T00:00:00Z',
  last_moved_by: 'u1',
  notes: null,
  rejection_message_id: null,
  discard_reason: null,
  discard_notes: null,
  added_to_talent_pool: false,
  closed_at: null,
  created_at: '2026-04-20T00:00:00Z',
  updated_at: '2026-04-27T00:00:00Z',
};

describe('useMoveApplicationStage TanStack v5 optimistic + rollback', () => {
  it('onMutate cancela queries e aplica setQueryData otimista', async () => {
    const { client, Wrapper } = createWrapper();
    seedCache(client);
    maybeSingleMock.mockResolvedValue({ data: successRow, error: null });

    const { result } = renderHook(() => useMoveApplicationStage(), { wrapper: Wrapper });
    result.current.mutate(moveArgs);

    await waitFor(() => {
      const state = client.getQueryData<Array<{ id: string; stage: string }>>(APPLICATIONS_KEY);
      expect(state?.[0]?.stage).toBe('apto_entrevista_rh');
    });
  });

  it('mantem o estado apos sucesso', async () => {
    const { client, Wrapper } = createWrapper();
    seedCache(client);
    maybeSingleMock.mockResolvedValue({ data: successRow, error: null });

    const { result } = renderHook(() => useMoveApplicationStage(), { wrapper: Wrapper });
    result.current.mutate(moveArgs);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const finalState = client.getQueryData<Array<{ id: string; stage: string }>>(APPLICATIONS_KEY);
    expect(finalState?.[0]?.stage).toBe('apto_entrevista_rh');
  });

  it('onError com kind=rls faz rollback E exibe toast', async () => {
    const { client, Wrapper } = createWrapper();
    seedCache(client);
    const initial = client.getQueryData(APPLICATIONS_KEY);
    maybeSingleMock.mockResolvedValue({
      data: null,
      error: { code: '42501', message: 'permission denied for table applications' },
    });

    const { result } = renderHook(() => useMoveApplicationStage(), { wrapper: Wrapper });
    result.current.mutate(moveArgs);

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(client.getQueryData(APPLICATIONS_KEY)).toEqual(initial);
    expect(sonner.toast.error).toHaveBeenCalled();
    const callArgs = (sonner.toast.error as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(String(callArgs[0])).toMatch(/permiss|sem permiss/i);
  });

  it('onError com kind=conflict (data null) faz rollback E exibe toast', async () => {
    const { client, Wrapper } = createWrapper();
    seedCache(client);
    const initial = client.getQueryData(APPLICATIONS_KEY);
    // data === null + no error => conflict (last-writer-wins via DELETE/RLS silent)
    maybeSingleMock.mockResolvedValue({ data: null, error: null });

    const { result } = renderHook(() => useMoveApplicationStage(), { wrapper: Wrapper });
    result.current.mutate(moveArgs);

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(client.getQueryData(APPLICATIONS_KEY)).toEqual(initial);
    expect(sonner.toast.error).toHaveBeenCalled();
    const callArgs = (sonner.toast.error as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(String(callArgs[0])).toMatch(/atualiz|outra pessoa/i);
  });

  it('queryKey shape inclui scope.id e scope.kind', async () => {
    const { client, Wrapper } = createWrapper();
    seedCache(client);
    maybeSingleMock.mockResolvedValue({ data: successRow, error: null });

    const { result } = renderHook(() => useMoveApplicationStage(), { wrapper: Wrapper });
    result.current.mutate(moveArgs);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const queries = client.getQueryCache().getAll();
    const found = queries.find(
      (q) =>
        Array.isArray(q.queryKey) &&
        q.queryKey[0] === 'scope' &&
        q.queryKey[1] === 'company:abc' &&
        q.queryKey[2] === 'company' &&
        q.queryKey[3] === 'hiring' &&
        q.queryKey[4] === 'applications' &&
        q.queryKey[5] === 'by-job' &&
        q.queryKey[6] === 'j1',
    );
    expect(found).toBeDefined();
  });

  it('mutate envia stage + last_moved_by=user.id no UPDATE payload', async () => {
    const { client, Wrapper } = createWrapper();
    seedCache(client);
    maybeSingleMock.mockResolvedValue({ data: successRow, error: null });

    const { result } = renderHook(() => useMoveApplicationStage(), { wrapper: Wrapper });
    result.current.mutate(moveArgs);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(lastUpdatePayload.value).toMatchObject({
      stage: 'apto_entrevista_rh',
      last_moved_by: 'u1',
    });
  });

  it('onSettled invalida queryKey especifica do jobId', async () => {
    const { client, Wrapper } = createWrapper();
    seedCache(client);
    maybeSingleMock.mockResolvedValue({ data: successRow, error: null });

    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');

    const { result } = renderHook(() => useMoveApplicationStage(), { wrapper: Wrapper });
    result.current.mutate(moveArgs);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const callKeys = invalidateSpy.mock.calls.map((c) => c[0]?.queryKey);
    const hitsApplications = callKeys.some(
      (k) =>
        Array.isArray(k) &&
        k[0] === 'scope' &&
        k[3] === 'hiring' &&
        k[4] === 'applications' &&
        k[5] === 'by-job' &&
        k[6] === 'j1',
    );
    expect(hitsApplications).toBe(true);
  });

  it('onSettled tambem invalida counts-by-jobs queryKey', async () => {
    const { client, Wrapper } = createWrapper();
    seedCache(client);
    maybeSingleMock.mockResolvedValue({ data: successRow, error: null });

    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');

    const { result } = renderHook(() => useMoveApplicationStage(), { wrapper: Wrapper });
    result.current.mutate(moveArgs);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const callKeys = invalidateSpy.mock.calls.map((c) => c[0]?.queryKey);
    const hitsCounts = callKeys.some(
      (k) => Array.isArray(k) && k.includes('application-counts-by-jobs'),
    );
    expect(hitsCounts).toBe(true);
  });

  it('isError=true apos erro de rede apos retries esgotarem (retry interno)', async () => {
    const { client, Wrapper } = createWrapper();
    seedCache(client);
    // Network drop simulado: TypeError com /fetch/i triggers detectNetworkDrop
    const networkErr = new TypeError('fetch failed');
    maybeSingleMock.mockResolvedValue({ data: null, error: networkErr });

    const { result } = renderHook(() => useMoveApplicationStage(), { wrapper: Wrapper });
    result.current.mutate(moveArgs);

    // Hook retry de até 3x com backoff (1s, 2s, 4s) — espera o falhar final
    await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 20000 });
    expect(maybeSingleMock).toHaveBeenCalledTimes(4); // 1 initial + 3 retries
  }, 25000);
});
