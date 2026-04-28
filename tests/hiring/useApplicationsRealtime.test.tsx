import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
} from 'vitest';
import * as scopeModule from '@/app/providers/ScopeProvider';
import { supabase } from '@/integrations/supabase/client';
import { useApplicationsRealtime } from '@/hooks/hiring/useApplicationsRealtime';
import { createMockChannel, createRemoveChannelSpy } from '../msw/realtime-mock';

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children);
  return { client, Wrapper };
}

const baseScope = {
  scope: {
    kind: 'company' as const,
    id: 'company:abc',
    companyIds: ['c1'] as [string],
    name: 'Empresa Teste',
  },
  setScope: vi.fn(),
  pendingScope: null,
  confirmPendingScope: vi.fn(),
  cancelPendingScope: vi.fn(),
  isFixed: false,
  visibleCompanies: [],
  visibleGroups: [],
  isResolving: false,
};

beforeEach(() => {
  vi.spyOn(scopeModule, 'useScope').mockReturnValue(
    baseScope as unknown as ReturnType<typeof scopeModule.useScope>,
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

const APPLICATIONS_KEY = [
  'scope',
  'company:abc',
  'company',
  'hiring',
  'applications',
  'by-job',
  'j1',
] as const;

describe('useApplicationsRealtime', () => {
  it('nao cria channel sem jobId', () => {
    const channelSpy = vi.spyOn(supabase, 'channel');
    const { Wrapper } = createWrapper();
    renderHook(() => useApplicationsRealtime(undefined), { wrapper: Wrapper });
    expect(channelSpy).not.toHaveBeenCalled();
  });

  it('nao cria channel sem scope', () => {
    vi.spyOn(scopeModule, 'useScope').mockReturnValue({
      ...baseScope,
      scope: null,
    } as unknown as ReturnType<typeof scopeModule.useScope>);
    const channelSpy = vi.spyOn(supabase, 'channel');
    const { Wrapper } = createWrapper();
    renderHook(() => useApplicationsRealtime('j1'), { wrapper: Wrapper });
    expect(channelSpy).not.toHaveBeenCalled();
  });

  it('subscribe ao channel applications:job:{jobId} no mount', () => {
    const mockChannel = createMockChannel();
    vi.spyOn(supabase, 'channel').mockReturnValue(
      mockChannel as unknown as ReturnType<typeof supabase.channel>,
    );
    const { Wrapper } = createWrapper();
    renderHook(() => useApplicationsRealtime('j1'), { wrapper: Wrapper });
    expect(supabase.channel).toHaveBeenCalledWith('applications:job:j1');
    expect(mockChannel.on).toHaveBeenCalled();
    expect(mockChannel.subscribe).toHaveBeenCalled();
    expect(mockChannel.__subscribed).toBe(true);
  });

  it('UPDATE postgres_changes faz setQueryData merge silent (sem invalidate)', () => {
    const { client, Wrapper } = createWrapper();
    client.setQueryData(APPLICATIONS_KEY, [
      {
        id: 'app-1',
        stage: 'em_interesse',
        stage_entered_at: '2026-04-20T00:00:00Z',
        candidate: { id: 'cand-1', full_name: 'Foo' },
      },
    ]);

    const mockChannel = createMockChannel();
    vi.spyOn(supabase, 'channel').mockReturnValue(
      mockChannel as unknown as ReturnType<typeof supabase.channel>,
    );
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');

    renderHook(() => useApplicationsRealtime('j1'), { wrapper: Wrapper });

    act(() => {
      mockChannel.__emit('UPDATE', {
        new: {
          id: 'app-1',
          stage: 'apto_entrevista_rh',
          stage_entered_at: '2026-04-27T00:00:00Z',
          updated_at: '2026-04-27T00:00:00Z',
          last_moved_by: 'u2',
        },
        eventType: 'UPDATE',
      });
    });

    const updated = client.getQueryData<Array<{ id: string; stage: string }>>(APPLICATIONS_KEY);
    expect(updated?.[0]).toMatchObject({ id: 'app-1', stage: 'apto_entrevista_rh' });
    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  it('INSERT postgres_changes invalida query (rebuild join)', () => {
    const { client, Wrapper } = createWrapper();
    const mockChannel = createMockChannel();
    vi.spyOn(supabase, 'channel').mockReturnValue(
      mockChannel as unknown as ReturnType<typeof supabase.channel>,
    );
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');

    renderHook(() => useApplicationsRealtime('j1'), { wrapper: Wrapper });

    act(() => {
      mockChannel.__emit('INSERT', {
        new: { id: 'app-2', stage: 'em_interesse' },
        eventType: 'INSERT',
      });
    });

    const callKeys = invalidateSpy.mock.calls.map((c) => c[0]?.queryKey);
    const hits = callKeys.some(
      (k) =>
        Array.isArray(k) &&
        k[0] === 'scope' &&
        k[1] === 'company:abc' &&
        k[5] === 'by-job' &&
        k[6] === 'j1',
    );
    expect(hits).toBe(true);
  });

  it('removeChannel no unmount', () => {
    const mockChannel = createMockChannel();
    const removeSpy = createRemoveChannelSpy();
    vi.spyOn(supabase, 'channel').mockReturnValue(
      mockChannel as unknown as ReturnType<typeof supabase.channel>,
    );
    vi.spyOn(supabase, 'removeChannel').mockImplementation(removeSpy as never);

    const { Wrapper } = createWrapper();
    const { unmount } = renderHook(() => useApplicationsRealtime('j1'), {
      wrapper: Wrapper,
    });
    unmount();
    expect(removeSpy).toHaveBeenCalledTimes(1);
  });

  it('re-subscribe ao mudar jobId', () => {
    const mockChannel1 = createMockChannel();
    const mockChannel2 = createMockChannel();
    const channelSpy = vi
      .spyOn(supabase, 'channel')
      .mockImplementationOnce(
        () => mockChannel1 as unknown as ReturnType<typeof supabase.channel>,
      )
      .mockImplementationOnce(
        () => mockChannel2 as unknown as ReturnType<typeof supabase.channel>,
      );
    const removeSpy = createRemoveChannelSpy();
    vi.spyOn(supabase, 'removeChannel').mockImplementation(removeSpy as never);

    const { Wrapper } = createWrapper();
    const { rerender } = renderHook(
      ({ id }: { id: string }) => useApplicationsRealtime(id),
      { wrapper: Wrapper, initialProps: { id: 'j1' } },
    );
    expect(channelSpy).toHaveBeenCalledWith('applications:job:j1');

    rerender({ id: 'j2' });
    expect(channelSpy).toHaveBeenCalledWith('applications:job:j2');
    expect(removeSpy).toHaveBeenCalledTimes(1); // cleanup do j1
  });

  it('cleanup chama supabase.removeChannel exatamente 1x por subscribe', () => {
    const mockChannel = createMockChannel();
    const removeSpy = createRemoveChannelSpy();
    vi.spyOn(supabase, 'channel').mockReturnValue(
      mockChannel as unknown as ReturnType<typeof supabase.channel>,
    );
    vi.spyOn(supabase, 'removeChannel').mockImplementation(removeSpy as never);

    const { Wrapper } = createWrapper();
    const { unmount } = renderHook(() => useApplicationsRealtime('j1'), {
      wrapper: Wrapper,
    });
    expect(removeSpy).not.toHaveBeenCalled();
    unmount();
    expect(removeSpy).toHaveBeenCalledTimes(1);
  });
});
