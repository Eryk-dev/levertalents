import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { OneOnOneMeetingForm } from '../OneOnOneMeetingForm';
import { buildOneOnOne } from '@/test/perf-fixtures/oneOnOnePlaud';

/**
 * vi.hoisted ensures the flag is available to the vi.mock factory even after
 * Vitest hoists the mock call above all imports.
 * D-15/T-3-01: liderado cannot read RhNote; admin/rh can.
 */
const { abilityFlag } = vi.hoisted(() => ({
  abilityFlag: { canReadRhNote: false },
}));

vi.mock('@/features/tenancy/lib/abilityContext', () => ({
  useAbility: () => ({
    can: (action: string, subject: string) =>
      abilityFlag.canReadRhNote && action === 'read' && subject === 'RhNote',
  }),
}));

// Mock useUpdateOneOnOne to avoid Supabase/scope calls in unit tests.
vi.mock('@/hooks/useOneOnOnes', () => ({
  useUpdateOneOnOne: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
}));

// Mock useScope (required by child hooks).
vi.mock('@/app/providers/ScopeProvider', () => ({
  useScope: () => ({ scope: { id: 'company-0001', kind: 'company' } }),
}));

// Mock useOneOnOneRhNotes (used by OneOnOneRHNote — only mounted for admin/rh).
vi.mock('@/hooks/useOneOnOneRhNotes', () => ({
  useOneOnOneRhNotes: () => ({ data: null, isLoading: false }),
  useUpsertOneOnOneRhNote: () => ({ mutate: vi.fn(), isPending: false }),
}));

// Mock usePDIIntegrated (used by OneOnOnePDIPanel).
vi.mock('@/hooks/usePDIIntegrated', () => ({
  usePDIIntegrated: () => ({ createPDIFromOneOnOne: vi.fn(), isCreating: false }),
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>
    <TooltipProvider>
      {children}
    </TooltipProvider>
  </QueryClientProvider>
);

describe('OneOnOneMeetingForm [INV-3-12 + Anti-spoof]', () => {
  beforeEach(() => {
    // Reset to liderado (cannot read RhNote) before each test
    abilityFlag.canReadRhNote = false;
  });

  it('badge "RH visível" is always rendered (D-15, INV-3-12)', () => {
    render(
      <OneOnOneMeetingForm meeting={buildOneOnOne() as any} />,
      { wrapper },
    );
    expect(screen.getByText(/RH visível/i)).toBeInTheDocument();
  });

  it('RHNote section absent from DOM when role is liderado (anti-spoof, T-3-01)', () => {
    // mockCanReadRhNote = false (set by beforeEach)
    render(
      <OneOnOneMeetingForm meeting={buildOneOnOne() as any} />,
      { wrapper },
    );
    // "Notas RH" must NOT appear — liderado lacks RhNote ability (DOM-absent, not hidden)
    expect(screen.queryByText(/Notas RH/i)).not.toBeInTheDocument();
  });

  it('RHNote section present when user can read RhNote (admin/rh)', () => {
    abilityFlag.canReadRhNote = true; // simulate admin/rh role
    render(
      <OneOnOneMeetingForm meeting={buildOneOnOne() as any} />,
      { wrapper },
    );
    expect(screen.getByText(/Notas RH/i)).toBeInTheDocument();
  });
});
