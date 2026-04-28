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
import { useTalentPool } from '@/hooks/hiring/useTalentPool';

// Plan 02-06 Task 2 — useTalentPool filtra por active_candidate_consents
// (TAL-04, TAL-08) + surface campo derivado `tags` (TAL-02).

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
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children);
  return { client, Wrapper };
}

const defaultFilters = {
  search: '',
  discardReasons: [] as never[],
  jobIds: [] as string[],
  onlyTalentPool: false,
};

beforeEach(() => {
  vi.restoreAllMocks();
  mockScopeAndAuth();
});

afterEach(() => {
  server.resetHandlers();
});

describe('useTalentPool — filtra por active consents (TAL-04 / TAL-08)', () => {
  it('query inclui embed active_candidate_consents!inner com purpose', async () => {
    let capturedUrl = '';
    server.use(
      http.get(`${SUPABASE_URL}/rest/v1/candidates`, ({ request }) => {
        capturedUrl = request.url;
        return HttpResponse.json([]);
      }),
    );
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useTalentPool(defaultFilters), {
      wrapper: Wrapper,
    });
    await waitFor(() =>
      expect(result.current.isSuccess || result.current.isError).toBe(true),
    );
    expect(capturedUrl).toContain('active_candidate_consents');
    expect(capturedUrl).toContain('incluir_no_banco_de_talentos_global');
  });

  it('mantém filtro anonymized_at IS NULL', async () => {
    let capturedUrl = '';
    server.use(
      http.get(`${SUPABASE_URL}/rest/v1/candidates`, ({ request }) => {
        capturedUrl = request.url;
        return HttpResponse.json([]);
      }),
    );
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useTalentPool(defaultFilters), {
      wrapper: Wrapper,
    });
    await waitFor(() =>
      expect(result.current.isSuccess || result.current.isError).toBe(true),
    );
    expect(capturedUrl).toContain('anonymized_at=is.null');
  });

  it('retorna candidatos com campo derivado tags (TAL-02): aggrega por company_id, last_applied_at DESC', async () => {
    server.use(
      http.get(`${SUPABASE_URL}/rest/v1/candidates`, () =>
        HttpResponse.json([
          {
            id: 'cand-1',
            full_name: 'Alice',
            email: 'alice@x.com',
            anonymized_at: null,
            consents: [
              {
                purpose: 'incluir_no_banco_de_talentos_global',
                granted_at: '2026-01-01T00:00:00Z',
                expires_at: null,
              },
            ],
            applications: [
              {
                id: 'a1',
                stage: 'recebido',
                discard_reason: null,
                added_to_talent_pool: false,
                closed_at: null,
                created_at: '2026-01-15T00:00:00Z',
                job: {
                  id: 'j1',
                  title: 'Eng Backend',
                  company_id: 'co-1',
                  company: { id: 'co-1', name: 'Empresa Alpha' },
                },
              },
              {
                id: 'a2',
                stage: 'recebido',
                discard_reason: null,
                added_to_talent_pool: false,
                closed_at: null,
                created_at: '2026-03-10T00:00:00Z',
                job: {
                  id: 'j2',
                  title: 'Eng Senior',
                  company_id: 'co-1',
                  company: { id: 'co-1', name: 'Empresa Alpha' },
                },
              },
              {
                id: 'a3',
                stage: 'recebido',
                discard_reason: null,
                added_to_talent_pool: false,
                closed_at: null,
                created_at: '2026-02-20T00:00:00Z',
                job: {
                  id: 'j3',
                  title: 'Tech Lead',
                  company_id: 'co-2',
                  company: { id: 'co-2', name: 'Empresa Beta' },
                },
              },
            ],
            conversations: [],
          },
        ]),
      ),
    );
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useTalentPool(defaultFilters), {
      wrapper: Wrapper,
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const data = result.current.data!;
    expect(data).toHaveLength(1);
    expect(data[0].tags).toHaveLength(2);
    // Empresa Alpha: pega application MAIS RECENTE (a2 = "Eng Senior" 2026-03-10)
    const alpha = data[0].tags.find((t) => t.company_id === 'co-1');
    expect(alpha?.company_name).toBe('Empresa Alpha');
    expect(alpha?.job_title).toBe('Eng Senior');
    expect(alpha?.last_applied_at).toBe('2026-03-10T00:00:00Z');
    // Empresa Beta
    const beta = data[0].tags.find((t) => t.company_id === 'co-2');
    expect(beta?.job_title).toBe('Tech Lead');
    // Sort: company com last_applied_at mais recente primeiro
    expect(data[0].tags[0].company_id).toBe('co-1');
  });

  it('candidatos sem applications são filtrados (banco precisa de pelo menos 1)', async () => {
    server.use(
      http.get(`${SUPABASE_URL}/rest/v1/candidates`, () =>
        HttpResponse.json([
          {
            id: 'cand-x',
            full_name: 'Beto',
            email: 'beto@x.com',
            anonymized_at: null,
            consents: [
              {
                purpose: 'incluir_no_banco_de_talentos_global',
                granted_at: '2026-01-01T00:00:00Z',
              },
            ],
            applications: [],
            conversations: [],
          },
        ]),
      ),
    );
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useTalentPool(defaultFilters), {
      wrapper: Wrapper,
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });
});
