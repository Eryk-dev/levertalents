import { describe, it } from 'vitest';

// Wave 0 skeleton — Plan 02-06 estende src/hooks/hiring/useTalentPool.ts
// para filtrar via active_candidate_consents (TAL-04, TAL-08).

describe.skip('useTalentPool', () => {
  it.todo(
    'filtra candidatos com active_candidate_consents.purpose = incluir_no_banco_de_talentos_global'
  );
  it.todo('exclui candidatos com revoked_at IS NOT NULL');
  it.todo('exclui candidatos com expires_at < now()');
  it.todo('exclui anonymized_at IS NOT NULL');
  it.todo('queryKey usa scope.id (Phase 1 chokepoint)');
  it.todo('embed PostgREST usa !inner para forçar consent existente');
  it.todo('retorna conversations + applications no embed');
});

// TODO Plan 02-06: remover .skip e implementar
