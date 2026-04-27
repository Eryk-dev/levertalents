import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ScopeDropdown } from '@/components/scope/ScopeDropdown';
import * as scopeModule from '@/app/providers/ScopeProvider';
import { TooltipProvider } from '@/components/ui/tooltip';

type MockOverrides = Partial<ReturnType<typeof scopeModule.useScope>>;

function mockScope(
  setScopeFn: ReturnType<typeof scopeModule.useScope>['setScope'] = vi.fn(),
  overrides: MockOverrides = {},
) {
  vi.spyOn(scopeModule, 'useScope').mockReturnValue({
    scope: {
      kind: 'group',
      id: 'g1',
      companyIds: ['c1', 'c2'],
      name: 'Grupo Lever',
    },
    setScope: setScopeFn,
    pendingScope: null,
    confirmPendingScope: vi.fn(),
    cancelPendingScope: vi.fn(),
    isFixed: false,
    visibleCompanies: [
      { id: 'c1', name: 'Lever Consult' },
      { id: 'c2', name: 'Lever Tech' },
    ],
    visibleGroups: [
      { id: 'g1', name: 'Grupo Lever', companyIds: ['c1', 'c2'] },
    ],
    isResolving: false,
    ...overrides,
  } as ReturnType<typeof scopeModule.useScope>);
}

describe('ScopeDropdown', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('opens panel on trigger click and shows GRUPOS + EMPRESAS sections', async () => {
    mockScope();
    const user = userEvent.setup();
    render(
      <TooltipProvider>
        <ScopeDropdown />
      </TooltipProvider>,
    );

    const trigger = screen.getByRole('button', {
      name: /Você está vendo: Grupo Lever/,
    });
    await user.click(trigger);

    // After click, the popover content is rendered (portal'd into body)
    expect(screen.getByText('GRUPOS')).toBeInTheDocument();
    expect(screen.getByText('EMPRESAS')).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText('Buscar empresa ou grupo…'),
    ).toBeInTheDocument();
  });

  it('clicking an empresa item calls setScope({kind:"company", id})', async () => {
    const setScope = vi.fn().mockReturnValue(true);
    mockScope(setScope);
    const user = userEvent.setup();
    render(
      <TooltipProvider>
        <ScopeDropdown />
      </TooltipProvider>,
    );

    const trigger = screen.getByRole('button', {
      name: /Você está vendo: Grupo Lever/,
    });
    await user.click(trigger);

    const leverTechItem = await screen.findByText('Lever Tech');
    await user.click(leverTechItem);

    expect(setScope).toHaveBeenCalledWith({ kind: 'company', id: 'c2' });
  });

  it('returns null when scope is null', () => {
    mockScope(vi.fn(), { scope: null });
    const { container } = render(
      <TooltipProvider>
        <ScopeDropdown />
      </TooltipProvider>,
    );
    expect(container.firstChild).toBeNull();
  });
});
