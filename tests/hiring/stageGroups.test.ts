import { describe, it } from 'vitest';

// Wave 0 skeleton — Plan 02-02 (Migration F) ativa via audit do mapping
// + Plan 02-08 (UI sparkbar) ativa STAGE_GROUP_BAR_COLORS coverage.

describe.skip('stageGroups mapping', () => {
  it.todo('todo legacy stage tem mapping em STAGE_GROUP_BY_STAGE');
  it.todo('zero órfãos: cada APPLICATION_STAGE_LABELS key tem grupo');
  it.todo(
    'STAGE_GROUP_BAR_COLORS atende D-11 (azul triagem/checagem, amarelo entrevistas, verde decisao, vermelho descartados)'
  );
  it.todo('aguardando_fit_cultural mapeia para grupo triagem');
  it.todo('sem_retorno mapeia para grupo triagem (com legacy_marker)');
  it.todo('fit_recebido mapeia para grupo triagem');
});

// TODO Plan 02-02: remover .skip e ativar tests de mapping audit
// TODO Plan 02-08: ativar tests de STAGE_GROUP_BAR_COLORS
