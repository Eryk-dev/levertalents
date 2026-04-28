import { http, HttpResponse } from 'msw';

// Wave 0 — MSW handlers para hooks/components de hiring (Phase 2).
// Conforme PLAN 02-01 Task 2 + RESEARCH §4 (cenários de erro D-05).
//
// Uso típico:
//   import { setupServer } from 'msw/node';
//   import { defaultHiringHandlers, mockMoveApplication } from '../msw/hiring-handlers';
//   const server = setupServer(...defaultHiringHandlers);
//   server.use(mockMoveApplication.rlsDenial); // override per-test
//
// URL Supabase do projeto Lever (ehbxpbeijofxtsbezwxd) hard-coded —
// MSW intercepta e nunca atinge a rede real.

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL ?? 'https://ehbxpbeijofxtsbezwxd.supabase.co';

// ---------------------------------------------------------------------------
// 4 cenários de erro do D-05 para useMoveApplicationStage (PATCH applications)
// ---------------------------------------------------------------------------
export const mockMoveApplication = {
  /** RLS denial — código 42501, status 403 (Postgrest). detectRlsDenial=true */
  rlsDenial: http.patch(`${SUPABASE_URL}/rest/v1/applications`, () =>
    HttpResponse.json(
      {
        code: '42501',
        message: 'permission denied for table applications',
        details: null,
        hint: null,
      },
      { status: 403 }
    )
  ),

  /** Network drop — HttpResponse.error() simula TypeError fetch. detectNetworkDrop=true */
  networkDrop: http.patch(`${SUPABASE_URL}/rest/v1/applications`, () =>
    HttpResponse.error()
  ),

  /**
   * Conflict — data === null no PATCH (row sumiu / foi movida por outro RH).
   * No detector, isso vira { kind: "conflict" } via `if (!data)` em mutationFn.
   */
  conflict: http.patch(`${SUPABASE_URL}/rest/v1/applications`, () =>
    HttpResponse.json(null, { status: 200 })
  ),

  /**
   * Check violation 23514 com /transition/i — alternativa para conflict
   * detectado via código + regex. detectConflict=true em supabaseError.ts.
   */
  transitionCheckViolation: http.patch(
    `${SUPABASE_URL}/rest/v1/applications`,
    () =>
      HttpResponse.json(
        {
          code: '23514',
          message: 'new row violates check constraint "valid_stage_transition"',
          details: null,
          hint: null,
        },
        { status: 400 }
      )
  ),

  /**
   * Sucesso — retorna applications com novo stage, stage_entered_at e
   * last_moved_by atualizados (shape Postgrest array).
   */
  success: (toStage: string, lastMovedBy = 'u1') =>
    http.patch(`${SUPABASE_URL}/rest/v1/applications`, () =>
      HttpResponse.json([
        {
          id: 'app-1',
          stage: toStage,
          stage_entered_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          last_moved_by: lastMovedBy,
        },
      ])
    ),
};

// ---------------------------------------------------------------------------
// Listagem de applications por job (queryFn de useApplicationsByJob)
// ---------------------------------------------------------------------------
export const mockApplicationsByJob = (rows: unknown[] = []) =>
  http.get(`${SUPABASE_URL}/rest/v1/applications`, () => HttpResponse.json(rows));

// ---------------------------------------------------------------------------
// RPC read_candidate_with_log (Migration F.2 — Plan 02-03)
// ---------------------------------------------------------------------------
export const mockReadCandidateRpc = (candidate: unknown) =>
  http.post(`${SUPABASE_URL}/rest/v1/rpc/read_candidate_with_log`, () =>
    HttpResponse.json(candidate)
  );

export const mockReadCandidateRpcError = http.post(
  `${SUPABASE_URL}/rest/v1/rpc/read_candidate_with_log`,
  () =>
    HttpResponse.json(
      {
        code: '42501',
        message: 'permission denied for function read_candidate_with_log',
      },
      { status: 403 }
    )
);

// ---------------------------------------------------------------------------
// candidate_consents — list/insert/update (Migration F.3 — Plan 02-06)
// ---------------------------------------------------------------------------
export const mockActiveConsents = (consents: unknown[] = []) =>
  http.get(`${SUPABASE_URL}/rest/v1/active_candidate_consents`, () =>
    HttpResponse.json(consents)
  );

export const mockCandidateConsentsList = (rows: unknown[] = []) =>
  http.get(`${SUPABASE_URL}/rest/v1/candidate_consents`, () =>
    HttpResponse.json(rows)
  );

export const mockRevokeConsent = http.patch(
  `${SUPABASE_URL}/rest/v1/candidate_consents`,
  () =>
    HttpResponse.json([
      {
        id: 'c-1',
        revoked_at: new Date().toISOString(),
        revoked_by: 'u1',
      },
    ])
);

export const mockRevokeConsentError = http.patch(
  `${SUPABASE_URL}/rest/v1/candidate_consents`,
  () =>
    HttpResponse.json(
      {
        code: '42501',
        message: 'permission denied for table candidate_consents',
      },
      { status: 403 }
    )
);

// ---------------------------------------------------------------------------
// Talent pool / candidates — Plan 02-06
// ---------------------------------------------------------------------------
export const mockTalentPoolCandidates = (rows: unknown[] = []) =>
  http.get(`${SUPABASE_URL}/rest/v1/candidates`, () => HttpResponse.json(rows));

// ---------------------------------------------------------------------------
// data_access_log — Plan 02-03 / Plan 02-09 (audit panel)
// ---------------------------------------------------------------------------
export const mockDataAccessLog = (rows: unknown[] = []) =>
  http.get(`${SUPABASE_URL}/rest/v1/data_access_log`, () => HttpResponse.json(rows));

// ---------------------------------------------------------------------------
// Default set — testes podem fazer:
//   setupServer(...defaultHiringHandlers, ...overrides)
// ---------------------------------------------------------------------------
export const defaultHiringHandlers = [
  mockApplicationsByJob([]),
  mockActiveConsents([]),
  mockCandidateConsentsList([]),
  mockTalentPoolCandidates([]),
  mockDataAccessLog([]),
];
