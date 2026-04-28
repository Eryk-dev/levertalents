import { describe, it } from 'vitest';

// Wave 0 skeleton — Plan 02-08 implementa src/hooks/hiring/useCardPreferences.ts
// com Zod schema + localStorage namespace leverup:rs:card-fields:{userId}.

describe.skip('useCardPreferences', () => {
  it.todo('retorna defaults quando localStorage vazio');
  it.todo('persiste prefs em localStorage com namespace leverup:rs:card-fields:{userId}');
  it.todo('Zod parse falha → retorna defaults sem crash');
  it.todo('JSON inválido em localStorage → retorna defaults sem crash');
  it.todo('update é parcial (merge)');
  it.todo('não persiste sem userId (auth ainda não resolveu)');
  it.todo('reload de hook lê valor persistido (round-trip)');
});

// TODO Plan 02-08: remover .skip e implementar
