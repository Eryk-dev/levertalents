import { describe, it } from 'vitest';

// Wave 0 skeleton — Plan 02-05 estende src/lib/supabaseError.ts com:
//   detectRlsDenial, detectNetworkDrop, detectConflict, detectTransitionReject,
//   getMoveErrorToastConfig, MoveApplicationError.
// Conforme RESEARCH §4 lines 547-656.

describe.skip('supabaseError detectors', () => {
  it.todo('detectRlsDenial true para code 42501');
  it.todo('detectRlsDenial false para outros códigos');
  it.todo('detectRlsDenial false para null/undefined');
  it.todo('detectNetworkDrop true para TypeError fetch');
  it.todo('detectNetworkDrop true para AbortError');
  it.todo('detectNetworkDrop true para code === "" (supabase-js fetch fail)');
  it.todo('detectNetworkDrop false para erro genérico');
  it.todo('detectConflict true para 23514 com /transition/i');
  it.todo('detectConflict false para 23514 sem keyword transition');
  it.todo('detectTransitionReject true para kind=transition');
  it.todo('detectTransitionReject false para outros kinds');
});

describe.skip('getMoveErrorToastConfig', () => {
  it.todo('kind=rls retorna title "Sem permissão" + duration 8000');
  it.todo('kind=network retorna title "Sem conexão" + duration 4000');
  it.todo('kind=conflict retorna title "Atualizado por outra pessoa"');
  it.todo('kind=transition usa from/to no description');
  it.todo('kind=unknown retorna fallback "Erro ao mover candidato"');
});

// TODO Plan 02-05: remover .skip e implementar
