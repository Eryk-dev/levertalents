import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ScopeTrigger } from '@/components/scope/ScopeTrigger';
import * as scopeModule from '@/app/providers/ScopeProvider';
import { TooltipProvider } from '@/components/ui/tooltip';

type MockOverrides = Partial<ReturnType<typeof scopeModule.useScope>>;

function mockScope(overrides: MockOverrides = {}) {
  vi.spyOn(scopeModule, 'useScope').mockReturnValue({
    scope: {
      kind: 'group',
      id: 'g1',
      companyIds: ['c1'],
      name: 'Grupo Lever',
    },
    setScope: vi.fn(),
    pendingScope: null,
    confirmPendingScope: vi.fn(),
    cancelPendingScope: vi.fn(),
    isFixed: false,
    visibleCompanies: [],
    visibleGroups: [],
    isResolving: false,
    ...overrides,
  } as ReturnType<typeof scopeModule.useScope>);
}

function renderTrigger(overrides: MockOverrides = {}) {
  mockScope(overrides);
  return render(
    <TooltipProvider>
      <ScopeTrigger open={false} onClick={() => undefined} />
    </TooltipProvider>,
  );
}

describe('ScopeTrigger', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders aria-label "Você está vendo: Grupo Lever. Abrir seletor de escopo." for group scope', () => {
    renderTrigger();
    const btn = screen.getByRole('button');
    expect(btn).toHaveAttribute(
      'aria-label',
      'Você está vendo: Grupo Lever. Abrir seletor de escopo.',
    );
  });

  it('shows the scope name as visible text', () => {
    renderTrigger();
    expect(screen.getByText('Grupo Lever')).toBeInTheDocument();
  });

  it('returns null when isResolving=true (no DOM output)', () => {
    const { container } = renderTrigger({ isResolving: true });
    expect(container.firstChild).toBeNull();
  });

  it('returns null when scope is null (D-09 handled by parent)', () => {
    const { container } = renderTrigger({ scope: null });
    expect(container.firstChild).toBeNull();
  });

  it('disables button when isFixed=true', () => {
    renderTrigger({ isFixed: true });
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
  });

  it('uses scope name as visible label for company-kind scope', () => {
    renderTrigger({
      scope: {
        kind: 'company',
        id: 'c1',
        companyIds: ['c1'],
        name: 'Lever Consult',
      },
    });
    expect(screen.getByText('Lever Consult')).toBeInTheDocument();
    const btn = screen.getByRole('button');
    expect(btn).toHaveAttribute(
      'aria-label',
      'Você está vendo: Lever Consult. Abrir seletor de escopo.',
    );
  });
});
