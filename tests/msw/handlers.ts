import { http, HttpResponse } from 'msw';
import { phase3Handlers } from '../../src/test/perf-mocks/index';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? 'https://ehbxpbeijofxtsbezwxd.supabase.co';

// Default handlers — empty arrays for new tables. Tests that need data override.
export const handlers = [
  // companies (always empty array unless test overrides)
  http.get(`${SUPABASE_URL}/rest/v1/companies`, () => HttpResponse.json([])),
  http.get(`${SUPABASE_URL}/rest/v1/company_groups`, () => HttpResponse.json([])),
  http.get(`${SUPABASE_URL}/rest/v1/org_units`, () => HttpResponse.json([])),
  // RPCs return null by default
  http.post(`${SUPABASE_URL}/rest/v1/rpc/resolve_default_scope`, () => HttpResponse.json(null)),
  // Phase 3 handlers — Edge Function create-user-with-temp-password + RPCs get_climate_aggregate + submit_climate_response
  ...phase3Handlers,
];
