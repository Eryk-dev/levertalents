import { describe, it } from 'vitest';

// Wave 0 skeleton — Plan 02-05 implementa.
// Quando ativar: remover .skip, importar canTransition + APPLICATION_STAGE_TRANSITIONS
// e implementar o doubly-nested for-loop exhaustive table per PATTERNS.md
// "Vitest tests" assignment.

describe.skip('canTransition (application)', () => {
  it.todo('retorna true para transição válida (table-driven)');
  it.todo('retorna false para transição inválida (table-driven)');
  it.todo('exhaustive table todas combinações stage→stage');
  it.todo('rejeita transição que pula etapa obrigatória');
  it.todo('aceita auto-transição (from === to)');
});

// TODO Plan 02-05: remover .skip e implementar
