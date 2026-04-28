import { describe, it } from 'vitest';

// Wave 0 skeleton — Plan 02-05 implementa src/lib/hiring/sla.ts.
// SLA thresholds (D-10): 2d laranja, 5d vermelho.

describe.skip('computeSlaTone', () => {
  it.todo('0d retorna ok');
  it.todo('1d retorna ok');
  it.todo('2d retorna warning (limite inferior amber)');
  it.todo('3d retorna warning');
  it.todo('4d retorna warning');
  it.todo('5d retorna critical (limite inferior red)');
  it.todo('10d retorna critical');
  it.todo('aceita string ISO timestamp');
  it.todo('aceita Date object');
  it.todo('retorna ok para data futura (clamp em 0)');
});

describe.skip('daysSince', () => {
  it.todo('retorna 0 para timestamp atual');
  it.todo('retorna número inteiro positivo de dias');
  it.todo('clamp em 0 para datas futuras');
});

// TODO Plan 02-05: remover .skip e implementar
