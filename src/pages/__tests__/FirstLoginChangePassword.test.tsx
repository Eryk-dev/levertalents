import React from 'react';
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

  // QUAL-06 supplemental — T-04-07-04 mitigation
  // The first-login flow handles PII (email/CPF) via useUserProfile. Even
  // though logger.ts forwards untouched in DEV, no raw email/CPF should ever
  // hit console.* during render — validates the component does NOT
  // accidentally console.log() the profile object directly.
  it('does not emit raw email or CPF to console during render (QUAL-06 supplemental)', () => {
    // Force production-like behavior so logger.ts redacts before forwarding
    vi.stubEnv('DEV', false);
    mockProfile.mockReturnValue({
      data: {
        id: 'u1',
        email: 'admin.teste@levertalents.com', // PII candidate
        cpf: '12345678900', // PII candidate (raw 11 digits)
        full_name: 'Admin Teste',
        temp_password_expires_at: new Date(Date.now() + 12 * 3600 * 1000).toISOString(),
        must_change_password: true,
      },
      isLoading: false,
    });

    const logs: unknown[][] = [];
    const origLog = console.log;
    const origError = console.error;
    const origWarn = console.warn;
    console.log = (...args: unknown[]) => {
      logs.push(args);
    };
    console.error = (...args: unknown[]) => {
      logs.push(args);
    };
    console.warn = (...args: unknown[]) => {
      logs.push(args);
    };
    try {
      render(<FirstLoginChangePassword />, { wrapper });

      const flat = logs.flat().map(String).join(' ');
      // No raw email pattern (must NOT match a real email — anything
      // redacted gets [email-redacted])
      expect(flat).not.toMatch(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/);
      // No raw 11-digit CPF
      expect(flat).not.toMatch(/\b\d{11}\b/);
    } finally {
      console.log = origLog;
      console.error = origError;
      console.warn = origWarn;
      vi.unstubAllEnvs();
    }
  });
});
