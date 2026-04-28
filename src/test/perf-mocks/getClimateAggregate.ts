import { http, HttpResponse } from 'msw';

// MSW handler para RPC POST /rest/v1/rpc/get_climate_aggregate
// Retorna {insufficient_data:true} se body.p_org_unit_id terminar em '0', senão agg completo.
// INV-3-09: k-anon — count<3 nunca expõe count exato (Pitfall §3)
export const getClimateAggregateHandler = http.post(
  'https://ehbxpbeijofxtsbezwxd.supabase.co/rest/v1/rpc/get_climate_aggregate',
  async ({ request }) => {
    const body = (await request.json()) as {
      p_survey_id: string;
      p_org_unit_id: string | null;
    };
    if (body.p_org_unit_id?.endsWith('0')) {
      // Pitfall §3 — sem count exato para não revelar identidade
      return HttpResponse.json({ insufficient_data: true });
    }
    return HttpResponse.json({
      count: 5,
      avg: 4.2,
      distribution: { '1': 0, '2': 0, '3': 1, '4': 2, '5': 2 },
    });
  },
);
