import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
} from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import React from 'react';
import { server } from '../msw/server';
import * as scopeModule from '@/app/providers/ScopeProvider';
import * as authModule from '@/hooks/useAuth';
import { useCandidateTags } from '@/hooks/hiring/useCandidateTags';

// Plan 02-06 Task 5 — TAL-02: useCandidateTags agrega applications cross-empresa
// do candidato em tags por company_id (job_title + last_applied_at MAIS RECENTES).

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
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children);
}

beforeEach(() => {
  vi.restoreAllMocks();
  mockScopeAndAuth();
});

afterEach(() => {
  server.resetHandlers();
});

describe('useCandidateTags (TAL-02)', () => {
  it('agrega tags por empresa para candidato com applications em 2 empresas distintas', async () => {
    server.use(
      http.get(`${SUPABASE_URL}/rest/v1/applications`, () =>
        HttpResponse.json([
          {
            id: 'a1',
            created_at: '2026-01-15T00:00:00Z',
            job_opening: {
              title: 'Eng Backend',
              company_id: 'co-1',
              company: { id: 'co-1', name: 'Empresa Alpha' },
            },
          },
          {
            id: 'a2',
            created_at: '2026-03-10T00:00:00Z',
            job_opening: {
              title: 'Eng Senior',
              company_id: 'co-1',
              company: { id: 'co-1', name: 'Empresa Alpha' },
            },
          },
          {
            id: 'a3',
            created_at: '2026-02-20T00:00:00Z',
            job_opening: {
              title: 'Tech Lead',
              company_id: 'co-2',
              company: { id: 'co-2', name: 'Empresa Beta' },
            },
          },
        ]),
      ),
    );
    const Wrapper = createWrapper();
    const { result } = renderHook(() => useCandidateTags('cand-1'), {
      wrapper: Wrapper,
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(2);
    // Empresa Alpha — escolhe a application MAIS RECENTE (a2 = "Eng Senior" 2026-03-10)
    const alpha = result.current.data?.find((t) => t.company_id === 'co-1');
    expect(alpha?.company_name).toBe('Empresa Alpha');
    expect(alpha?.job_title).toBe('Eng Senior');
    expect(alpha?.last_applied_at).toBe('2026-03-10T00:00:00Z');
    // Empresa Beta
    const beta = result.current.data?.find((t) => t.company_id === 'co-2');
    expect(beta?.job_title).toBe('Tech Lead');
    // Ordenação: empresa com last_applied_at mais recente primeiro
    expect(result.current.data?.[0].company_id).toBe('co-1');
  });

  it('retorna array vazio quando candidato não tem applications', async () => {
    server.use(
      http.get(`${SUPABASE_URL}/rest/v1/applications`, () =>
        HttpResponse.json([]),
      ),
    );
    const Wrapper = createWrapper();
    const { result } = renderHook(() => useCandidateTags('cand-2'), {
      wrapper: Wrapper,
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  it('descarta applications sem job_opening ou sem company resolvido', async () => {
    server.use(
      http.get(`${SUPABASE_URL}/rest/v1/applications`, () =>
        HttpResponse.json([
          {
            id: 'a-orphan',
            created_at: '2026-01-15T00:00:00Z',
            job_opening: null,
          },
          {
            id: 'a-nocompany',
            created_at: '2026-02-15T00:00:00Z',
            job_opening: { title: 'X', company_id: null, company: null },
          },
          {
            id: 'a-valid',
            created_at: '2026-03-01T00:00:00Z',
            job_opening: {
              title: 'Backend',
              company_id: 'co-1',
              company: { id: 'co-1', name: 'Alpha' },
            },
          },
        ]),
      ),
    );
    const Wrapper = createWrapper();
    const { result } = renderHook(() => useCandidateTags('cand-3'), {
      wrapper: Wrapper,
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0].company_id).toBe('co-1');
  });

  it('disabled quando candidateId undefined', () => {
    const Wrapper = createWrapper();
    const { result } = renderHook(() => useCandidateTags(undefined), {
      wrapper: Wrapper,
    });
    expect(result.current.isFetching).toBe(false);
  });
});
