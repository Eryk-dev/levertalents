import { describe, it } from 'vitest';

// Wave 0 skeleton — Plan 02-05 cria src/hooks/hiring/useApplicationsRealtime.ts.
// Mock supabase.channel via tests/msw/realtime-mock.ts (createMockChannel).
// Verifica D-04: silent re-render no UPDATE postgres_changes.

describe.skip('useApplicationsRealtime', () => {
  it.todo('subscribe ao channel applications:job:{jobId} no mount');
  it.todo('removeChannel no unmount');
  it.todo('UPDATE postgres_changes faz setQueryData merge silent (sem invalidate)');
  it.todo('INSERT postgres_changes invalida query');
  it.todo('re-subscribe ao mudar jobId');
  it.todo('não cria channel sem scope');
  it.todo('não cria channel sem jobId');
  it.todo('cleanup chama supabase.removeChannel exatamente 1x por subscribe');
});

// TODO Plan 02-05: remover .skip e implementar
