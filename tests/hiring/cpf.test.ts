import { describe, it } from 'vitest';

// Wave 0 skeleton — Plan 02-02 (Migration F.4) provê o util DB-side via
// trigger tg_normalize_candidate_cpf. Plan 02-07 (drift) reusa lado client
// se existir helper TypeScript em src/lib/hiring/cpf.ts.

describe.skip('normalizeCpf', () => {
  it.todo('remove pontuação 123.456.789-00 -> 12345678900');
  it.todo('retorna null para input vazio');
  it.todo('retorna null para input null/undefined');
  it.todo('retorna null para input < 11 dígitos');
  it.todo('retorna null para input > 11 dígitos');
  it.todo('preserva CPF já não-formatado');
  it.todo('aceita CPF com hífen e ponto: 987.654.321-00');
});

// TODO Plan 02-02 / Plan 02-07: remover .skip e implementar
