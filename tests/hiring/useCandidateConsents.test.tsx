import { describe, it } from 'vitest';

// Wave 0 skeleton — Plan 02-06 implementa useActiveConsents + useRevokeConsent
// em src/hooks/hiring/useCandidateConsents.ts e useRevokeConsent.ts.

describe.skip('useActiveConsents', () => {
  it.todo('lista consents do candidato (SELECT em active_candidate_consents)');
  it.todo('queryKey usa scope.id + candidateId');
  it.todo('retorna empty array para candidato sem consents');
  it.todo('exclui revoked + expired (vem da view active_)');
});

describe.skip('useRevokeConsent', () => {
  it.todo('atualiza revoked_at + revoked_by=scope.userId');
  it.todo('invalida talent-pool query após sucesso');
  it.todo('invalida candidate-consents query após sucesso');
  it.todo('toast "Consentimento revogado" em sucesso');
  it.todo('toast destructive em erro');
});

// TODO Plan 02-06: remover .skip e implementar
