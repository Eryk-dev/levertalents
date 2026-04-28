import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OnboardingMessageBlock } from '../OnboardingMessageBlock';

describe('OnboardingMessageBlock (D-20) [INV-3-16]', () => {
  beforeAll(() => {
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  const props = {
    fullName: 'Maria Silva',
    email: 'maria@example.com',
    tempPassword: 'Abc23xYz',
    expiresAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    rhFullName: 'João RH',
  };

  it('renders D-20 locked template with interpolations', () => {
    render(<OnboardingMessageBlock {...props} />);
    expect(screen.getByText(/Oi Maria Silva! Bem-vindo à Lever/)).toBeInTheDocument();
    expect(screen.getByText(/Login: maria@example\.com/)).toBeInTheDocument();
    expect(screen.getByText(/Senha temporária: Abc23xYz/)).toBeInTheDocument();
    expect(screen.getByText(/— João RH/)).toBeInTheDocument();
    expect(screen.getByText(/Expira em 24h/)).toBeInTheDocument();
  });

  it('Copy button copies message to clipboard + flashes "Copiado ✓"', async () => {
    render(<OnboardingMessageBlock {...props} />);
    const btn = screen.getByRole('button', { name: /Copiar mensagem/i });
    fireEvent.click(btn);
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalled();
      expect(screen.getByText(/Copiado ✓/)).toBeInTheDocument();
    });
  });
});
