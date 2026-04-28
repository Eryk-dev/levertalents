import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
} from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import {
  QueryClient,
  QueryClientProvider,
  type QueryKey,
} from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import React from 'react';
import { server } from '../msw/server';
import * as scopeModule from '@/app/providers/ScopeProvider';
import * as authModule from '@/hooks/useAuth';
import {
  useActiveConsents,
  useRevokeConsent,
} from '@/hooks/hiring/useCandidateConsents';

// Plan 02-06 Task 1 — useCandidateConsents (3 hooks):
//   - useActiveConsents: SELECT em active_candidate_consents view
//   - useRevokeConsent:  UPDATE com revoked_at + revoked_by=user.id;
//                        invalida talent-pool E candidate-consents
//   - useGrantConsent:   INSERT (testado via UI; cobertura básica aqui)

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL ?? 'https://ehbxpbeijofxtsbezwxd.supabase.co';

function mockScopeAndAuth() {
  vi.spyOn(scopeModule, 'useScope').mockReturnValue({
    scope: {
      kind: 'company',
      id: 'company:abc',
      companyIds: ['c1'],
      name: 'Test Co',
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
    user: { id: 'u1' },
    loading: false,
    realRole: 'rh',
    viewAsRole: null,
    setViewAsRole: vi.fn(),
    canViewAs: false,
  } as unknown as ReturnType<typeof authModule.useAuth>);
}

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
  vi.restoreAllMocks();
  mockScopeAndAuth();
});

afterEach(() => {
  server.resetHandlers();
});

describe('useActiveConsents', () => {
  it('lista consents do candidato (SELECT em active_candidate_consents)', async () => {
    server.use(
      http.get(`${SUPABASE_URL}/rest/v1/active_candidate_consents`, () =>
        HttpResponse.json([
          {
            id: 'c-1',
            candidate_id: 'cand-1',
            purpose: 'incluir_no_banco_de_talentos_global',
            legal_basis: 'consent',
            granted_at: '2026-01-01T00:00:00Z',
            granted_by: null,
            expires_at: null,
            revoked_at: null,
            revoked_by: null,
            document_url: null,
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-01T00:00:00Z',
          },
        ]),
      ),
    );
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useActiveConsents('cand-1'), {
      wrapper: Wrapper,
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0].purpose).toBe(
      'incluir_no_banco_de_talentos_global',
    );
  });

  it('queryKey é prefixado com scope.id (Phase 1 chokepoint)', async () => {
    server.use(
      http.get(`${SUPABASE_URL}/rest/v1/active_candidate_consents`, () =>
        HttpResponse.json([]),
      ),
    );
    const { client, Wrapper } = createWrapper();
    renderHook(() => useActiveConsents('cand-9'), { wrapper: Wrapper });
    await waitFor(() => {
      const keys = client.getQueryCache().getAll().map((q) => q.queryKey);
      expect(keys.length).toBeGreaterThan(0);
    });
    const keys = client.getQueryCache().getAll().map((q) => q.queryKey);
    expect(keys[0]).toEqual([
      'scope',
      'company:abc',
      'company',
      'hiring',
      'candidate-consents',
      'cand-9',
    ]);
  });

  it('retorna array vazio para candidato sem consents', async () => {
    server.use(
      http.get(`${SUPABASE_URL}/rest/v1/active_candidate_consents`, () =>
        HttpResponse.json([]),
      ),
    );
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useActiveConsents('cand-2'), {
      wrapper: Wrapper,
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  it('disabled quando candidateId undefined', () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useActiveConsents(undefined), {
      wrapper: Wrapper,
    });
    // useScopedQuery passa enabled=false para o useQuery — não dispara fetch
    expect(result.current.isFetching).toBe(false);
  });
});

describe('useRevokeConsent', () => {
  it('UPDATE com revoked_at + revoked_by=user.id', async () => {
    let body: Record<string, unknown> | null = null;
    server.use(
      http.patch(
        `${SUPABASE_URL}/rest/v1/candidate_consents`,
        async ({ request }) => {
          body = (await request.json()) as Record<string, unknown>;
          return HttpResponse.json([{ id: 'c-1' }]);
        },
      ),
    );
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useRevokeConsent(), {
      wrapper: Wrapper,
    });
    await act(async () => {
      await result.current.mutateAsync({
        consentId: 'c-1',
        candidateId: 'cand-1',
      });
    });
    expect(body).toMatchObject({ revoked_by: 'u1' });
    expect(typeof (body as { revoked_at?: string } | null)?.revoked_at).toBe(
      'string',
    );
  });

  it('onSuccess invalida talent-pool E candidate-consents queries', async () => {
    server.use(
      http.patch(`${SUPABASE_URL}/rest/v1/candidate_consents`, () =>
        HttpResponse.json([{ id: 'c-1' }]),
      ),
    );
    const { client, Wrapper } = createWrapper();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useRevokeConsent(), {
      wrapper: Wrapper,
    });
    await act(async () => {
      await result.current.mutateAsync({
        consentId: 'c-1',
        candidateId: 'cand-1',
      });
    });
    const calls = invalidateSpy.mock.calls.map(
      (c) => (c[0] as { queryKey: QueryKey } | undefined)?.queryKey,
    );
    const flat = calls.flat();
    expect(flat).toContain('candidate-consents');
    expect(flat).toContain('talent-pool');
  });
});
