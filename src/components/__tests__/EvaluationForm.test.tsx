import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { EvaluationForm } from '../EvaluationForm';
import type { TemplateSnapshot } from '@/lib/evaluationTemplate';

vi.mock('@/hooks/useEvaluations', () => ({
  useCreateEvaluation: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateEvaluation: () => ({ mutate: vi.fn(), isPending: false }),
}));

// Stub sonner so toast calls don't throw
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
);

describe('EvaluationForm (D-07 + PERF-07) [INV-3-06]', () => {
  const snap: TemplateSnapshot = {
    version: 1,
    sections: [
      {
        id: 's1',
        title: 'Seção 1',
        weight: 1,
        questions: [
          { id: 'q-scale', label: 'Pergunta scale', type: 'scale_1_5', required: true },
          { id: 'q-text', label: 'Pergunta texto', type: 'text', required: true },
          {
            id: 'q-choice',
            label: 'Pergunta choice',
            type: 'choice',
            required: true,
            options: ['a', 'b', 'c'],
          },
        ],
      },
    ],
  };

  const defaultProps = {
    cycleId: '00000000-0000-0000-0000-000000000001',
    templateSnapshot: snap,
    evaluatorUserId: '00000000-0000-0000-0000-000000000010',
    evaluatedUserId: '00000000-0000-0000-0000-000000000020',
    direction: 'leader_to_member' as const,
  };

  it('renders one section with 3 question types', () => {
    render(<EvaluationForm {...defaultProps} />, { wrapper });
    expect(screen.getByText('Pergunta scale')).toBeInTheDocument();
    expect(screen.getByText('Pergunta texto')).toBeInTheDocument();
    expect(screen.getByText('Pergunta choice')).toBeInTheDocument();
  });

  it('shows "Salvar avaliação" submit button', () => {
    render(<EvaluationForm {...defaultProps} />, { wrapper });
    expect(
      screen.getByRole('button', { name: /Salvar avaliação/i }),
    ).toBeInTheDocument();
  });

  it('renders sticky bottom action bar with secondary "Salvar rascunho"', () => {
    render(<EvaluationForm {...defaultProps} />, { wrapper });
    expect(
      screen.getByRole('button', { name: /Salvar rascunho/i }),
    ).toBeInTheDocument();
  });
});
