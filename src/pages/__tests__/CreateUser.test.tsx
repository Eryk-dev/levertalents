import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CreateUser from '../CreateUser';

const mockMutate = vi.fn();
vi.mock('@/hooks/useCreateUserWithTempPassword', () => ({
  useCreateUserWithTempPassword: () => ({ mutate: mockMutate, isPending: false }),
}));
vi.mock('@/hooks/useUserProfile', () => ({
  useUserProfile: () => ({ data: { full_name: 'João RH' }, isLoading: false }),
}));
vi.mock('@/hooks/useTeams', () => ({
  useTeams: () => ({ companies: [], teams: [], users: [], loading: false }),
}));

beforeAll(() => {
  Object.assign(navigator, {
    clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
  });
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>
    <MemoryRouter>{children}</MemoryRouter>
  </QueryClientProvider>
);

describe('CreateUserPage (AUTH-01/AUTH-02) [INV-3-16]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders form with required fields and no password field', () => {
    render(<CreateUser />, { wrapper });
    expect(screen.getByLabelText('Nome completo *')).toBeInTheDocument();
    expect(screen.getByLabelText('E-mail *')).toBeInTheDocument();
    expect(screen.queryByLabelText(/senha/i)).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Cadastrar e gerar mensagem/i }),
    ).toBeInTheDocument();
  });

  it('shows OnboardingMessageBlock after successful creation (AUTH-02)', async () => {
    mockMutate.mockImplementation((_input: unknown, opts: { onSuccess: (r: unknown) => void }) => {
      opts.onSuccess({
        userId: 'u1',
        tempPassword: 'Abc23xYz',
        expiresAt: new Date().toISOString(),
      });
    });

    render(<CreateUser />, { wrapper });

    fireEvent.change(screen.getByLabelText('Nome completo *'), {
      target: { value: 'Maria Silva' },
    });
    fireEvent.change(screen.getByLabelText('E-mail *'), {
      target: { value: 'maria@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Cadastrar e gerar mensagem/i }));

    await waitFor(() => {
      expect(screen.getByText(/Bem-vindo à Lever/)).toBeInTheDocument();
      expect(screen.getByText(/Senha temporária: Abc23xYz/)).toBeInTheDocument();
    });
  });
});
