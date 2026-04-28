import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';

void React;

// Mock useCardPreferences — testes controlam o set de campos enabled.
const mockPrefs = { value: { version: 1 as const, enabledFields: [] as string[] } };
vi.mock('@/hooks/hiring/useCardPreferences', () => ({
  useCardPreferences: () => [mockPrefs.value, vi.fn()],
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'u1' },
    loading: false,
    userRole: 'rh',
    realRole: 'rh',
    viewAsRole: null,
    setViewAsRole: vi.fn(),
    isViewingAs: false,
  }),
}));

import { CandidateCard, type KanbanApplication } from '@/components/hiring/CandidateCard';

function buildApp(
  overrides: Partial<KanbanApplication> = {},
): KanbanApplication {
  return {
    id: 'app-1',
    candidate_id: 'c1',
    stage: 'em_interesse',
    stage_entered_at: new Date(Date.now() - 86_400_000 * 3).toISOString(), // 3 dias = warning
    desired_role: 'Eng Backend',
    candidate: {
      id: 'c1',
      full_name: 'João Silva',
      email: 'joao@x.com',
      anonymized_at: null,
    },
    job_opening: { id: 'j1', title: 'Vaga Sr.' },
    ...overrides,
  };
}

beforeEach(() => {
  // Reset prefs para sem campos opcionais (default mais conservador para tests).
  mockPrefs.value = { version: 1, enabledFields: [] };
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('CandidateCard — D-07 mínimo + D-08 customizável + D-10 SLA', () => {
  it('renderiza nome + cargo + dias na etapa + vaga (mínimo D-07)', () => {
    render(React.createElement(CandidateCard, { application: buildApp(), onOpen: vi.fn() }));
    expect(screen.getByText(/João Silva/)).toBeInTheDocument();
    expect(screen.getByText(/Eng Backend/)).toBeInTheDocument();
    expect(screen.getByText(/3d na etapa/)).toBeInTheDocument();
  });

  it('aplica border-l-status-amber para SLA warning (3d)', () => {
    const { container } = render(
      React.createElement(CandidateCard, { application: buildApp(), onOpen: vi.fn() }),
    );
    const card = container.querySelector('button');
    expect(card?.className).toMatch(/border-l-status-amber/);
  });

  it('aplica border-l-status-red para SLA critical (>=5d)', () => {
    const criticalApp = buildApp({
      stage_entered_at: new Date(Date.now() - 86_400_000 * 6).toISOString(),
    });
    const { container } = render(
      React.createElement(CandidateCard, { application: criticalApp, onOpen: vi.fn() }),
    );
    expect(container.querySelector('button')?.className).toMatch(
      /border-l-status-red/,
    );
  });

  it('não aplica stripe (border-l-transparent) para SLA ok (1d)', () => {
    const okApp = buildApp({
      stage_entered_at: new Date(Date.now() - 86_400_000 * 1).toISOString(),
    });
    const { container } = render(
      React.createElement(CandidateCard, { application: okApp, onOpen: vi.fn() }),
    );
    expect(container.querySelector('button')?.className).toMatch(
      /border-l-transparent/,
    );
  });

  it('oculta avatar quando enabledFields não inclui "avatar"', () => {
    mockPrefs.value = { version: 1, enabledFields: [] };
    const { container } = render(
      React.createElement(CandidateCard, { application: buildApp(), onOpen: vi.fn() }),
    );
    // Avatar é o span com text "JS" iniciais, classes grid place-items-center.
    expect(container.querySelector('span.rounded-full.place-items-center')).toBeNull();
  });

  it('mostra avatar quando enabledFields inclui "avatar"', () => {
    mockPrefs.value = { version: 1, enabledFields: ['avatar'] };
    const { container } = render(
      React.createElement(CandidateCard, { application: buildApp(), onOpen: vi.fn() }),
    );
    // Iniciais "JS" devem aparecer como text de algum span.
    expect(container.textContent).toContain('JS');
  });

  it('exibe próxima entrevista quando enabledFields inclui "next_interview"', () => {
    mockPrefs.value = { version: 1, enabledFields: ['next_interview'] };
    const futureDate = new Date(Date.now() + 86_400_000 * 2); // 2 dias no futuro
    const app = buildApp({ next_interview_at: futureDate.toISOString() });
    const { container } = render(
      React.createElement(CandidateCard, { application: app, onOpen: vi.fn() }),
    );
    // Aparece a data formatada pt-BR: DD/MM/YYYY
    expect(container.textContent).toMatch(/\d{2}\/\d{2}\/\d{4}/);
  });

  it('formata "dias na etapa" com tabular-nums', () => {
    const { container } = render(
      React.createElement(CandidateCard, { application: buildApp(), onOpen: vi.fn() }),
    );
    // Encontra o span MAIS INTERNO cujo textContent começa com "<num>d na etapa"
    // (não inclui spans aninhados). Heurística: o nó cujo única text-child
    // é o pattern; usamos firstChild.nodeType TEXT_NODE.
    const daysSpan = Array.from(container.querySelectorAll('span')).find(
      (s) =>
        s.children.length === 0 &&
        /^\d+d na etapa$/.test((s.textContent ?? '').trim()),
    );
    expect(daysSpan).toBeTruthy();
    expect(daysSpan?.className).toMatch(/tabular-nums/);
  });

  it('clique chama onOpen com application', () => {
    const onOpen = vi.fn();
    const app = buildApp();
    const { container } = render(
      React.createElement(CandidateCard, { application: app, onOpen }),
    );
    const btn = container.querySelector('button');
    btn?.click();
    expect(onOpen).toHaveBeenCalledWith(app);
  });
});
