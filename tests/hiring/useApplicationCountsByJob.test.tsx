import { describe, it } from 'vitest';

// Wave 0 skeleton — Plan 02-04 estende src/hooks/hiring/useApplicationCountsByJob.ts
// para retornar contagem por stage_group (alimenta sparkbar D-11).

describe.skip('useApplicationCountsByJob', () => {
  it.todo('retorna byGroup com 6 keys (triagem/checagem/entrevista_rh/entrevista_final/decisao/descartados)');
  it.todo('queryKey usa scope.id (Phase 1 chokepoint)');
  it.todo('count zero para grupo sem candidatos');
  it.todo('soma total inclui descartados');
  it.todo('respeita filter por jobId');
  it.todo('mapeia stages legados para grupo correto via STAGE_GROUP_BY_STAGE');
});

// TODO Plan 02-04: remover .skip e implementar
