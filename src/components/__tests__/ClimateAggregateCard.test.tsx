import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ClimateAggregateCard } from '../ClimateAggregateCard';

const mockHook = vi.fn();
vi.mock('@/hooks/useClimateAggregate', () => ({
  useClimateAggregate: (...args: unknown[]) => mockHook(...args),
}));

describe('ClimateAggregateCard k-anon (D-10) [INV-3-09]', () => {
  it('renders empty state when insufficient_data:true', () => {
    mockHook.mockReturnValue({ data: { insufficient_data: true }, isLoading: false });
    render(<ClimateAggregateCard surveyId="s1" surveyName="Pesquisa Q1" />);
    expect(screen.getByText('Dados insuficientes para garantir anonimato')).toBeInTheDocument();
    expect(screen.getByText(/100% anônima/i)).toBeInTheDocument();
    // Anti-leak (Pitfall §3): no count number visible
    expect(screen.queryByText(/1 resposta/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/2 respostas/i)).not.toBeInTheDocument();
    // No CTA — wait state
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders full aggregate when count >= 3', () => {
    mockHook.mockReturnValue({
      data: { count: 5, avg: 4.2, distribution: { '1': 0, '2': 0, '3': 1, '4': 2, '5': 2 } },
      isLoading: false,
    });
    render(<ClimateAggregateCard surveyId="s1" surveyName="Pesquisa Q1" />);
    expect(screen.getByText('4.2')).toBeInTheDocument();
    expect(screen.getByText(/5 respostas/i)).toBeInTheDocument();
  });

  it('renders skeleton while loading', () => {
    mockHook.mockReturnValue({ data: undefined, isLoading: true });
    const { container } = render(<ClimateAggregateCard surveyId="s1" surveyName="Pesquisa Q1" />);
    expect(container.querySelector('[class*="animate-pulse"]')).toBeTruthy();
  });
});
