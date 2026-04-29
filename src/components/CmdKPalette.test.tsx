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
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  const utils = render(
    <QueryClientProvider client={client}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
  return { ...utils, client };
}

function mockScope(
  companyIds: string[] = ['c1', 'c2'],
  id: string = 'c1',
  kind: 'company' | 'group' = 'company',
) {
  vi.spyOn(scopeModule, 'useScope').mockReturnValue({
    scope: { kind, id, companyIds, name: 'Empresa A' },
    setScope: vi.fn(),
    pendingScope: null,
    confirmPendingScope: vi.fn(),
    cancelPendingScope: vi.fn(),
    isFixed: false,
    visibleCompanies: [],
    visibleGroups: [],
    isResolving: false,
  } as never);
}

function mockAuth(
  role: 'admin' | 'rh' | 'socio' | 'lider' | 'colaborador' = 'rh',
) {
  vi.spyOn(authModule, 'useAuth').mockReturnValue({
    user: { id: 'u1' },
    userRole: role,
    realRole: role,
    viewAsRole: null,
    setViewAsRole: vi.fn(),
    isViewingAs: false,
    loading: false,
  } as never);
}

beforeEach(() => {
  rpcMock.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('CmdKPalette (DASH-04)', () => {
  it('Test 1 — default state shows only static groups (Ações + Ir para)', () => {
    mockScope();
    mockAuth('rh');
    wrap(<CmdKPalette />);
    act(() => {
      window.dispatchEvent(new Event('open-cmdk'));
    });
    expect(screen.getByText('Criar nova vaga')).toBeInTheDocument();
    expect(screen.getByText('Convidar / criar pessoa')).toBeInTheDocument();
    // Removed quick actions per D-07 must NOT appear
    expect(screen.queryByText(/Criar novo PDI/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Agendar 1:1/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Iniciar avaliação/)).not.toBeInTheDocument();
    // No "Trocar escopo" action
    expect(screen.queryByText(/Trocar escopo/)).not.toBeInTheDocument();
    // Static "Ir para" entries should be visible
    expect(screen.getByText('Início')).toBeInTheDocument();
  });

  it('Test 2 — action set respects canManage (lider does not see Ações)', () => {
    mockScope();
    mockAuth('lider'); // not canManage
    wrap(<CmdKPalette />);
    act(() => {
      window.dispatchEvent(new Event('open-cmdk'));
    });
    expect(screen.queryByText('Criar nova vaga')).not.toBeInTheDocument();
    expect(screen.queryByText('Convidar / criar pessoa')).not.toBeInTheDocument();
  });

  it('Test 3 — scoped search passes p_company_ids from current scope', async () => {
    mockScope(['c1', 'c2']);
    mockAuth('rh');
    rpcMock.mockResolvedValue({ data: [], error: null });
    wrap(<CmdKPalette />);
    act(() => {
      window.dispatchEvent(new Event('open-cmdk'));
    });
    const input = await screen.findByPlaceholderText(
      /Buscar vagas, candidatos, pessoas/,
    );
    fireEvent.change(input, { target: { value: 'react' } });
    await waitFor(() => expect(rpcMock).toHaveBeenCalled(), { timeout: 1000 });
    const args = rpcMock.mock.calls[0];
    expect(args[0]).toBe('global_search');
    expect(args[1]).toMatchObject({
      q: 'react',
      max_per_kind: 6,
      p_company_ids: ['c1', 'c2'],
    });
  });

  it('Test 4 — PDI rows from RPC are NOT rendered as a group', async () => {
    mockScope();
    mockAuth('rh');
    rpcMock.mockResolvedValue({
      data: [
        {
          kind: 'pdi',
          id: 'p1',
          title: 'PDI X',
          subtitle: null,
          url: '/pdi/p1',
        },
        {
          kind: 'job',
          id: 'j1',
          title: 'Vaga Y',
          subtitle: null,
          url: '/hiring/jobs/j1',
        },
      ],
      error: null,
    });
    wrap(<CmdKPalette />);
    act(() => {
      window.dispatchEvent(new Event('open-cmdk'));
    });
    const input = await screen.findByPlaceholderText(/Buscar vagas/);
    fireEvent.change(input, { target: { value: 'algo' } });
    await waitFor(() => expect(screen.getByText('Vaga Y')).toBeInTheDocument(), {
      timeout: 1000,
    });
    // PDI row not rendered (REMOTE_META no longer has 'pdi')
    expect(screen.queryByText('PDI X')).not.toBeInTheDocument();
  });

  it('Test 5 — debounce 150ms via fake timers (P4-V07)', async () => {
    vi.useFakeTimers();
    try {
      mockScope(['c1']);
      mockAuth('rh');
      rpcMock.mockResolvedValue({ data: [], error: null });
      wrap(<CmdKPalette />);
      act(() => {
        window.dispatchEvent(new Event('open-cmdk'));
      });
      const input = screen.getByPlaceholderText(/Buscar vagas/);
      fireEvent.change(input, { target: { value: 'react' } });

      // Advance to just before 150ms — RPC must NOT have fired yet
      await act(async () => {
        vi.advanceTimersByTime(149);
      });
      expect(rpcMock).not.toHaveBeenCalled();

      // Advance past 150ms — debounce flushes; allow microtasks to settle
      await act(async () => {
        vi.advanceTimersByTime(2);
      });
      await act(async () => {
        await Promise.resolve();
      });
      expect(rpcMock).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('Test 6 — D-09 queryKey contract: ["scope", id, kind, ..., "global-search", q] (P4-V02)', async () => {
    mockScope(['c1', 'c2'], 'c1', 'company');
    mockAuth('rh');
    rpcMock.mockResolvedValue({ data: [], error: null });
    const { client } = wrap(<CmdKPalette />);
    act(() => {
      window.dispatchEvent(new Event('open-cmdk'));
    });
    const input = await screen.findByPlaceholderText(/Buscar vagas/);
    fireEvent.change(input, { target: { value: 'react' } });
    await waitFor(() => expect(rpcMock).toHaveBeenCalled(), { timeout: 1000 });

    const cache = client.getQueryCache().getAll();
    // The debounced 'react' query is the one whose key contains both
    // 'global-search' AND 'react'. There may also be an idle entry for the
    // empty initial query — we want the active fetched one.
    const target = cache.find(
      (q) =>
        Array.isArray(q.queryKey) &&
        (q.queryKey as readonly unknown[]).includes('global-search') &&
        (q.queryKey as readonly unknown[]).includes('react'),
    );
    expect(target).toBeDefined();
    const key = target!.queryKey as readonly unknown[];
    // Mirror src/hooks/usePayrollTotal.test.tsx Test 1: prefix shape ['scope', id, kind, ...]
    expect(key[0]).toBe('scope');
    expect(key[1]).toBe('c1'); // scope.id
    expect(key[2]).toBe('company'); // scope.kind
    expect(key).toContain('global-search');
    expect(key).toContain('react'); // debounced query is part of the user-provided segment
  });

  it('Test 7 — placeholder and footer match UI-SPEC copy', () => {
    mockScope();
    mockAuth('rh');
    wrap(<CmdKPalette />);
    act(() => {
      window.dispatchEvent(new Event('open-cmdk'));
    });
    expect(
      screen.getByPlaceholderText('Buscar vagas, candidatos, pessoas…'),
    ).toBeInTheDocument();
    expect(screen.getByText(/selecionar/)).toBeInTheDocument();
    expect(screen.getByText(/abrir \/ fechar/)).toBeInTheDocument();
  });
});
