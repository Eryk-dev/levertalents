import { describe, it } from 'vitest';

// Wave 0 skeleton — Plan 02-05 implementa o rewrite de useMoveApplicationStage
// como TanStack Query v5 com onMutate/onError/onSettled.
// Wrapper: copiar createWrapper() de tests/scope/useScopedQuery.test.tsx.
// Mock useScope retornando { scope: { id: 'company:abc', kind: 'company',
// companyIds: ['c1'], userId: 'u1' } }.
// MSW handlers: import { mockMoveApplication } from '../msw/hiring-handlers';

describe.skip('useMoveApplicationStage (TanStack v5 optimistic + rollback)', () => {
  it.todo('onMutate cancela queries e aplica setQueryData otimista');
  it.todo('onMutate retorna context com previousApplications + applicationsKey');
  it.todo('onError com kind=rls faz rollback E exibe toast "Sem permissão"');
  it.todo('onError com kind=network retry até 3x com backoff exponencial');
  it.todo('onError com kind=conflict não retry');
  it.todo('onError com kind=transition não retry e usa from/to no toast');
  it.todo('onSettled invalida queryKey específica do jobId');
  it.todo('onSettled também invalida counts-by-jobs queryKey');
  it.todo(
    'queryKey shape: ["scope", scope.id, scope.kind, "hiring", "applications", "by-job", jobId]'
  );
  it.todo('mutate envia stage + last_moved_by=scope.userId no update');
});

// TODO Plan 02-05: remover .skip e implementar
