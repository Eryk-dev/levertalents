import { http, HttpResponse } from 'msw';

// RPC submit_climate_response — recebe (survey_id, question_id, score, comment_optional).
// NÃO recebe user_id (INV-3-08 + D-09: anonimidade total, user_id removido da tabela).
export const submitClimateResponseHandler = http.post(
  'https://ehbxpbeijofxtsbezwxd.supabase.co/rest/v1/rpc/submit_climate_response',
  async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    if ('user_id' in body || 'actor_id' in body) {
      return HttpResponse.json(
        { error: 'user_id is forbidden — anonymous flow [INV-3-08]' },
        { status: 400 },
      );
    }
    return HttpResponse.json({ success: true });
  },
);
