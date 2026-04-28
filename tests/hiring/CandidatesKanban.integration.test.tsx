import React from 'react';
import { describe, it } from 'vitest';

// Avoid "React is not defined" no JSX strict mode. Mantido mesmo sem render
// porque o arquivo é .tsx e o lint pode reclamar futuramente.
void React;

// Wave 0 skeleton — Plan 02-05 (move + canTransition) + Plan 02-08 (UI)
// ativam estes testes. Render via createWrapper + ScopeProvider + MemoryRouter.

describe.skip('CandidatesKanban — drag/drop integration', () => {
  it.todo('canTransition reject mostra toast E não chama mutate');
  it.todo(
    'drag para coluna válida chama useMoveApplicationStage.mutate com fromStage/toStage corretos'
  );
  it.todo('optimistic update mostra card na nova coluna ANTES do mutate resolver');
  it.todo('rollback em RLS denial volta card pra origem E mostra toast "Sem permissão"');
  it.todo('Realtime UPDATE de outro user faz silent re-render (sem toast)');
  it.todo('drag para mesma coluna não chama mutate');
  it.todo('descartados auto-expand quando movendo para essa coluna');
});

// TODO Plan 02-05/02-08: remover .skip e implementar
