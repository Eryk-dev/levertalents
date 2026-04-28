import React from 'react';
import { describe, it } from 'vitest';

void React;

// Wave 0 skeleton — Plan 02-08 reescreve PipelineFilters para inline + URL state.

describe.skip('PipelineFilters', () => {
  it.todo('lê filtros de useSearchParams (?vaga=X&fase=Y&q=...)');
  it.todo('debounce 300ms na busca textual antes de setSearchParams');
  it.todo('chip ativo usa accent-soft + border-accent/30');
  it.todo('chip inativo usa bg-bg-subtle');
  it.todo('Limpar filtros zera URL params');
  it.todo('multi-select de fase preserva ordem na URL');
  it.todo('search inicial vem da URL ao mount');
});

// TODO Plan 02-08: remover .skip e implementar
