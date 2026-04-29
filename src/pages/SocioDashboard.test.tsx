import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';
import * as scopeModule from '@/app/providers/ScopeProvider';
import * as payrollModule from '@/hooks/usePayrollTotal';
import * as costModule from '@/hooks/useCostBreakdown';
import * as profileModule from '@/hooks/useUserProfile';
import SocioDashboard from './SocioDashboard';

function wrap(ui: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

function mockScope(kind: 'company' | 'group') {
  vi.spyOn(scopeModule, 'useScope').mockReturnValue({
    scope: {
      kind,
      id: 's1',
      companyIds: ['c1'],
      name: kind === 'group' ? 'Grupo Lever' : 'Empresa A',
    },
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

function mockPayroll(
  payload: { total_cost: number; headcount: number; avg_cost: number | null } | null,
) {
  vi.spyOn(payrollModule, 'usePayrollTotal').mockReturnValue({
    data: payload ?? undefined,
    isLoading: false,
    error: null,
  } as never);
}

function mockCost(teams: unknown[], companies: unknown[]) {
  vi.spyOn(costModule, 'useCostBreakdown').mockReturnValue({
    data: { totalCost: 0, totalMembers: 0, teams, companies },
    isLoading: false,
    error: null,
  } as never);
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(profileModule, 'useUserProfile').mockReturnValue({
    data: { full_name: 'Eryk Owner' },
  } as never);
});

describe('SocioDashboard (DASH-01/02/03)', () => {
  it('Test 1 — company scope: 3 KPIs + Custo por departamento + ≤6 rows', () => {
    mockScope('company');
    mockPayroll({ total_cost: 50000, headcount: 10, avg_cost: 5000 });
    mockCost(
      Array.from({ length: 8 }).map((_, i) => ({
        teamId: `t${i}`,
        teamName: `Time ${i}`,
        companyName: 'Empresa A',
        memberCount: 2,
        totalCost: 1000 * (i + 1),
        avgCost: 500,
      })),
      [],
    );

    wrap(<SocioDashboard />);
    expect(screen.getByText('Folha')).toBeInTheDocument();
    expect(screen.getByText('Pessoas ativas')).toBeInTheDocument();
    expect(screen.getByText('Custo médio')).toBeInTheDocument();
    expect(screen.getByText('Custo por departamento')).toBeInTheDocument();
    // The 8 teams — sorted desc — top 6 visible (Time 7 has biggest cost = 8000)
    expect(screen.getByText('Time 7')).toBeInTheDocument();
    // Times 0 and 1 are smallest (cost 1000, 2000) — filtered out by slice(0, 6)
    expect(screen.queryByText('Time 0')).not.toBeInTheDocument();
    expect(screen.queryByText('Time 1')).not.toBeInTheDocument();
  });

  it('Test 2 — group scope: section title is Custo por empresa, all companies shown', () => {
    mockScope('group');
    mockPayroll({ total_cost: 250000, headcount: 50, avg_cost: 5000 });
    mockCost(
      [],
      [
        { companyId: 'c1', companyName: 'Empresa A', memberCount: 10, totalCost: 50000, avgCost: 5000 },
        { companyId: 'c2', companyName: 'Empresa B', memberCount: 20, totalCost: 100000, avgCost: 5000 },
        { companyId: 'c3', companyName: 'Empresa C', memberCount: 20, totalCost: 100000, avgCost: 5000 },
      ],
    );

    wrap(<SocioDashboard />);
    expect(screen.getByText('Custo por empresa')).toBeInTheDocument();
    expect(screen.getByText('Empresa A')).toBeInTheDocument();
    expect(screen.getByText('Empresa B')).toBeInTheDocument();
    expect(screen.getByText('Empresa C')).toBeInTheDocument();
  });

  it('Test 2b — P4-V04 D-05 LOCK: zero-cost group empresas still render', () => {
    mockScope('group');
    mockPayroll({ total_cost: 0, headcount: 0, avg_cost: null });
    mockCost(
      [],
      [
        { companyId: 'c1', companyName: 'Empresa A', memberCount: 0, totalCost: 0, avgCost: 0 },
        { companyId: 'c2', companyName: 'Empresa B', memberCount: 0, totalCost: 0, avgCost: 0 },
        { companyId: 'c3', companyName: 'Empresa C', memberCount: 0, totalCost: 0, avgCost: 0 },
      ],
    );

    wrap(<SocioDashboard />);
    // All 3 empresa rows render — D-05 LOCK
    expect(screen.getByText('Empresa A')).toBeInTheDocument();
    expect(screen.getByText('Empresa B')).toBeInTheDocument();
    expect(screen.getByText('Empresa C')).toBeInTheDocument();
    // Empty-state must NOT render (rows.length > 0 means breakdown is populated)
    expect(screen.queryByText(/Nenhum dado de folha/)).not.toBeInTheDocument();
    // Headcount cell uses singular/plural rule for 0 -> "0 pessoas"
    expect(screen.getAllByText(/0 pessoas/).length).toBeGreaterThanOrEqual(3);
  });

  it('Test 3 — empty data: KPIs show — and breakdown shows empty state', () => {
    mockScope('company');
    mockPayroll({ total_cost: 0, headcount: 0, avg_cost: null });
    mockCost([], []);

    wrap(<SocioDashboard />);
    expect(screen.getByText(/Nenhum dado de folha/)).toBeInTheDocument();
    expect(
      screen.getByText('Adicione colaboradores com salário cadastrado para ver os indicadores.'),
    ).toBeInTheDocument();
  });

  it('Test 4 — no clima/org sections rendered (PROJECT lock)', () => {
    mockScope('company');
    mockPayroll({ total_cost: 1, headcount: 1, avg_cost: 1 });
    mockCost([], []);
    wrap(<SocioDashboard />);
    expect(screen.queryByText(/Indicadores consolidados/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Próxima ação/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Atalhos$/)).not.toBeInTheDocument();
  });
});
