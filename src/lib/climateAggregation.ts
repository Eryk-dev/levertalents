/**
 * TS mirror da RPC `get_climate_aggregate` para unit tests.
 * Pitfall §3: count<3 NÃO retorna count exato (anti-combination attack).
 * D-10: k-anonymity threshold = 3
 */

export type ClimateResponse = {
  score: number; // 1..5
  org_unit_id: string | null;
};

export type ClimateAggregateResult =
  | { insufficient_data: true }
  | { count: number; avg: number; distribution: Record<string, number> };

export const K_ANONYMITY_THRESHOLD = 3;

export function aggregateClimateResponses(
  responses: ClimateResponse[],
  threshold: number = K_ANONYMITY_THRESHOLD,
): ClimateAggregateResult {
  if (responses.length < threshold) {
    // D-10 + Pitfall §3: NÃO expor count exato
    return { insufficient_data: true };
  }
  const distribution: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
  let sum = 0;
  for (const r of responses) {
    const key = String(r.score);
    distribution[key] = (distribution[key] ?? 0) + 1;
    sum += r.score;
  }
  return {
    count: responses.length,
    avg: Number((sum / responses.length).toFixed(2)),
    distribution,
  };
}
