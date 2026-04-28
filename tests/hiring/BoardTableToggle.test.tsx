import React from 'react';
import { describe, it } from 'vitest';

void React;

// Wave 0 skeleton — Plan 02-08 implementa BoardTableToggle + CandidatesTable
// + persiste view em localStorage namespace leverup:rs:view:{jobId} (D-09).

describe.skip('BoardTableToggle', () => {
  it.todo('persiste view em localStorage leverup:rs:view:{jobId}');
  it.todo('renderiza CandidatesTable quando view=table com sort por dias-na-etapa default');
  it.todo('renderiza CandidatesKanban quando view=board (default)');
  it.todo('toggle "Quadro"/"Tabela" altera localStorage');
  it.todo('lê view inicial de localStorage no mount');
  it.todo('JSON inválido em localStorage → fallback para board');
  it.todo('toggle não causa scroll reset no kanban');
});

describe.skip('CandidatesTable', () => {
  it.todo('renderiza colunas: nome, cargo, dias na etapa, próxima entrevista, etapa');
  it.todo('sort por nome (asc/desc) atualiza ordem das rows');
  it.todo('sort por dias-na-etapa default desc (mais antigos primeiro)');
  it.todo('clique na row abre drawer (mesmo onOpen do board)');
});

// TODO Plan 02-08: remover .skip e implementar
