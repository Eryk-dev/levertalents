import { vi } from 'vitest';

// Wave 0 — Stub de supabase.channel para testar useApplicationsRealtime
// (Plan 02-05). Permite que tests instalem mock + emitam postgres_changes
// payloads sintéticos sem dependência de WebSocket real.
//
// Uso típico:
//   import { supabase } from '@/integrations/supabase/client';
//   import { createMockChannel, createRemoveChannelSpy } from '../msw/realtime-mock';
//
//   const channel = createMockChannel();
//   const removeSpy = createRemoveChannelSpy();
//   vi.spyOn(supabase, 'channel').mockReturnValue(channel as any);
//   vi.spyOn(supabase, 'removeChannel').mockImplementation(removeSpy);
//
//   // ... mount hook
//   channel.__emit('UPDATE', {
//     new: { id: 'app-1', stage: 'decisao', ... },
//     eventType: 'UPDATE',
//   });

type ChannelHandler = (payload: {
  new: unknown;
  old?: unknown;
  eventType: string;
}) => void;

export interface MockChannel {
  on: ReturnType<typeof vi.fn>;
  subscribe: ReturnType<typeof vi.fn>;
  unsubscribe: ReturnType<typeof vi.fn>;
  // helpers para o test driver
  __emit: (
    handlerKey: string,
    payload: { new: unknown; old?: unknown; eventType: string }
  ) => void;
  __handlers: Record<string, ChannelHandler>;
  __subscribed: boolean;
}

/**
 * Cria um fake de supabase.channel(name) que captura .on(...) handlers
 * e expõe __emit() para o teste disparar postgres_changes events.
 *
 * Convenções:
 * - Cada call de .on(event, config, handler) registra o handler com a
 *   chave config.event ("UPDATE" | "INSERT" | "DELETE"). Tests podem
 *   emitir via channel.__emit('UPDATE', payload).
 * - .subscribe() é fluente (retorna o próprio channel) — combina com a
 *   chain pattern do supabase-js.
 */
export function createMockChannel(): MockChannel {
  const handlers: Record<string, ChannelHandler> = {};
  const channel: MockChannel = {
    __handlers: handlers,
    __subscribed: false,
    on: vi.fn(
      (
        _event: string,
        config: { event: string; table?: string; filter?: string; schema?: string },
        handler: ChannelHandler
      ) => {
        handlers[config.event] = handler;
        return channel;
      }
    ),
    subscribe: vi.fn(() => {
      channel.__subscribed = true;
      return channel;
    }),
    unsubscribe: vi.fn(() => {
      channel.__subscribed = false;
      return Promise.resolve('ok' as const);
    }),
    __emit: (key, payload) => handlers[key]?.(payload),
  };
  return channel;
}

/**
 * Stub para supabase.removeChannel que registra a chamada para asserts
 * de cleanup no useEffect return.
 *
 *   const removeSpy = createRemoveChannelSpy();
 *   ...
 *   expect(removeSpy).toHaveBeenCalledTimes(1);
 */
export function createRemoveChannelSpy() {
  return vi.fn().mockResolvedValue('ok' as const);
}

/**
 * Helper para construir um postgres_changes payload sintético,
 * compatível com o shape RealtimePostgresChangesPayload do supabase-js.
 */
export function buildPostgresChangePayload<T extends Record<string, unknown>>(
  eventType: 'INSERT' | 'UPDATE' | 'DELETE',
  newRow: T,
  oldRow?: Partial<T>
) {
  return {
    schema: 'public' as const,
    table: 'applications' as const,
    commit_timestamp: new Date().toISOString(),
    eventType,
    new: newRow,
    old: oldRow ?? {},
    errors: [],
  };
}
