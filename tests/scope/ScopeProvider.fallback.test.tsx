import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ScopeProvider, useScope } from '@/app/providers/ScopeProvider';

// Mock useAuth so the provider thinks user is authenticated
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'test-user-uuid' },
    loading: false,
    userRole: 'admin',
  }),
}));

// Mock useVisibleScopes to return only 1 group "Grupo Lever" + 1 company
vi.mock('@/features/tenancy/hooks/useVisibleScopes', () => ({
  useVisibleScopes: () => ({
    companies: [{ id: 'company-real-id', name: 'Empresa Real' }],
    groups: [
      {
        id: 'group-grupo-lever-id',
        name: 'Grupo Lever',
        companyIds: ['company-real-id'],
      },
    ],
    isLoading: false,
    error: null,
  }),
}));

// Mock fetchDefaultScope to return a known default
vi.mock('@/features/tenancy/lib/resolveDefaultScope', () => ({
  fetchDefaultScope: vi
    .fn()
    .mockResolvedValue({ kind: 'group', id: 'group-grupo-lever-id' }),
}));

// Capture toast calls
const toastSpy = vi.fn();
vi.mock('sonner', () => ({
  toast: (msg: string) => toastSpy(msg),
}));

function ScopeReader() {
  const { scope, isResolving } = useScope();
  if (isResolving) return <div>resolving</div>;
  if (!scope) return <div>empty</div>;
  return (
    <div>
      <span data-testid="scope-name">{scope.name}</span>
      <span data-testid="scope-kind">{scope.kind}</span>
    </div>
  );
}

function renderWithRouter(initialUrl: string) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[initialUrl]}>
        <ScopeProvider>
          <ScopeReader />
        </ScopeProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ScopeProvider URL fallback (D-08)', () => {
  beforeEach(() => {
    toastSpy.mockClear();
    localStorage.clear();
  });

  it('valid URL scope resolves directly without toast', async () => {
    renderWithRouter('/?scope=group:group-grupo-lever-id');
    await waitFor(() =>
      expect(screen.getByTestId('scope-name')).toHaveTextContent('Grupo Lever'),
    );
    expect(toastSpy).not.toHaveBeenCalled();
  });

  it('invalid URL scope falls back to default + emits toast (D-08)', async () => {
    renderWithRouter('/?scope=company:00000000-0000-0000-0000-deadbeefdead');
    await waitFor(() =>
      expect(screen.getByTestId('scope-name')).toHaveTextContent('Grupo Lever'),
    );
    expect(toastSpy).toHaveBeenCalledTimes(1);
    expect(toastSpy.mock.calls[0][0]).toMatch(
      /Você não tem acesso àquele escopo. Abrindo Grupo Lever\./,
    );
  });

  it('no URL token, no persist → uses default scope, no toast', async () => {
    renderWithRouter('/');
    await waitFor(() =>
      expect(screen.getByTestId('scope-name')).toHaveTextContent('Grupo Lever'),
    );
    expect(toastSpy).not.toHaveBeenCalled();
  });
});
