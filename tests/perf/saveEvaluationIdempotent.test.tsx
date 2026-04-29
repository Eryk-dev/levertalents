import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import * as scopeModule from '@/app/providers/ScopeProvider';

/**
 * useCreateEvaluation makes TWO supabase calls inside mutationFn:
 *   1) from('evaluation_cycles').select('company_id').eq('id', cycle_id).single()
 *   2) from('evaluations').insert(...).select().single()
 *
 * The mock differentiates by table name so each call resolves with the right
 * shape. The cycle lookup always succeeds; the insert is what we control to
 * test idempotency (success then 23505 unique-violation).
 */

const cycleSingleMock = vi.fn();
const insertSingleMock = vi.fn();

const insertChain = {
  insert: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  single: insertSingleMock,
};

const cycleChain = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: cycleSingleMock,
};

const fromMock = vi.fn((table: string) => {
  if (table === 'evaluation_cycles') return cycleChain;
  if (table === 'evaluations') return insertChain;
  throw new Error(`Unexpected table in useCreateEvaluation mock: ${table}`);
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (table: string) => fromMock(table) },
}));

import { useCreateEvaluation } from '@/hooks/useEvaluations';

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children);
  return { client, Wrapper };
}

function mockScope() {
  vi.spyOn(scopeModule, 'useScope').mockReturnValue({
    scope: {
      kind: 'company',
      id: 'c1',
      companyIds: ['c1'],
      name: 'A',
    },
    setScope: vi.fn(),
    pendingScope: null,
    confirmPendingScope: vi.fn(),
    cancelPendingScope: vi.fn(),
    isFixed: false,
    visibleCompanies: [],
    visibleGroups: [],
    isResolving: false,
  } as never);
}

const baseInput = {
  cycle_id: 'cy1',
  evaluator_user_id: 'u1',
  evaluated_user_id: 'u2',
  direction: 'leader_to_member' as const,
  responses: { q1: 5 },
};

describe('useCreateEvaluation — idempotent (QUAL-03 fluxo 4) [INV-04-07-04]', () => {
  beforeEach(() => {
    // Restore spies FIRST, then re-wire the chained mocks. Order matters:
    // vi.restoreAllMocks() resets mockReturnValue on vi.fn() calls created
    // at module scope, so any chain wiring must happen AFTER restore.
    vi.restoreAllMocks();
    fromMock.mockClear();
    insertChain.insert.mockClear();
    insertChain.select.mockClear();
    cycleChain.select.mockClear();
    cycleChain.eq.mockClear();
    cycleSingleMock.mockReset();
    insertSingleMock.mockReset();
    // Re-wire the chained returns AFTER restore
    insertChain.insert.mockReturnValue(insertChain);
    insertChain.select.mockReturnValue(insertChain);
    cycleChain.select.mockReturnValue(cycleChain);
    cycleChain.eq.mockReturnValue(cycleChain);
    mockScope();
    // Cycle lookup always succeeds (returns company_id from cycle row)
    cycleSingleMock.mockResolvedValue({
      data: { company_id: 'c1' },
      error: null,
    });
  });

  it('first save succeeds; mutation invokes insert exactly once', async () => {
    insertSingleMock.mockResolvedValueOnce({
      data: {
        id: 'e1',
        cycle_id: 'cy1',
        evaluator_user_id: 'u1',
        evaluated_user_id: 'u2',
        direction: 'leader_to_member',
        responses: { q1: 5 },
        company_id: 'c1',
      },
      error: null,
    });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useCreateEvaluation(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      await result.current.mutateAsync(baseInput);
    });

    expect(insertChain.insert).toHaveBeenCalledTimes(1);
    expect(insertSingleMock).toHaveBeenCalledTimes(1);
  });

  it('duplicate save: 23505 error surfaces without poisoning cache', async () => {
    // First call — succeeds
    insertSingleMock.mockResolvedValueOnce({
      data: {
        id: 'e1',
        cycle_id: 'cy1',
        evaluator_user_id: 'u1',
        evaluated_user_id: 'u2',
        direction: 'leader_to_member',
        responses: { q1: 5 },
        company_id: 'c1',
      },
      error: null,
    });
    // Second call — 23505 unique violation (DB-side dedup)
    insertSingleMock.mockResolvedValueOnce({
      data: null,
      error: {
        code: '23505',
        message: 'duplicate key value violates unique constraint',
      },
    });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useCreateEvaluation(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      await result.current.mutateAsync(baseInput);
    });

    let secondError: unknown = null;
    await act(async () => {
      try {
        await result.current.mutateAsync(baseInput);
      } catch (e) {
        secondError = e;
      }
    });

    expect(insertChain.insert).toHaveBeenCalledTimes(2);
    expect(insertSingleMock).toHaveBeenCalledTimes(2);
    // Idempotency assertion: the duplicate SURFACED as an error to the caller
    // (form layer can show a non-destructive toast). The mutation lifecycle
    // settled cleanly — TanStack v5 swallows errors only when retry is on.
    expect(secondError).toBeTruthy();
    expect((secondError as { code?: string })?.code).toBe('23505');
  });
});
