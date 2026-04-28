import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import FirstLoginChangePassword from '../FirstLoginChangePassword';

const mockProfile = vi.fn();
vi.mock('@/hooks/useUserProfile', () => ({ useUserProfile: () => mockProfile() }));
vi.mock('@/hooks/useChangePassword', () => ({
  useChangePassword: () => ({ mutate: vi.fn(), isPending: false }),
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>
    <MemoryRouter>{children}</MemoryRouter>
  </QueryClientProvider>
);

describe('FirstLoginChangePassword (D-24) [INV-3-18]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without expired banner when temp not expired', () => {
    mockProfile.mockReturnValue({
      data: {
        id: 'u1',
        temp_password_expires_at: new Date(Date.now() + 12 * 3600 * 1000).toISOString(),
        must_change_password: true,
      },
      isLoading: false,
    });
    render(<FirstLoginChangePassword />, { wrapper });
    expect(screen.getByText('Crie sua nova senha')).toBeInTheDocument();
    expect(screen.queryByText(/Sua senha temporária venceu/)).not.toBeInTheDocument();
  });

  it('renders amber banner when temp_password_expires_at < now (D-24)', () => {
    mockProfile.mockReturnValue({
      data: {
        id: 'u1',
        temp_password_expires_at: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
        must_change_password: true,
      },
      isLoading: false,
    });
    render(<FirstLoginChangePassword />, { wrapper });
    expect(screen.getByText(/Sua senha temporária venceu/)).toBeInTheDocument();
  });
});
