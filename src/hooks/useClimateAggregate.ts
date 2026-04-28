import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useScope } from '@/app/providers/ScopeProvider';

/**
 * D-10: RPC returns aggregate only when count >= 3 (k-anonymity).
 * If fewer than 3 responses, returns { insufficient_data: true }.
 */
export type ClimateAggregateResult =
  | { insufficient_data: true }
  | { count: number; avg: number; distribution: Record<string, number> };

/**
 * Calls RPC get_climate_aggregate for a specific survey + optional org_unit filter.
 * queryKey: ['scope', scope.id, scope.kind, 'climate_aggregate', surveyId, orgUnitId]
 * T-3-CACHE-01: scope.id in key prevents cross-tenant cache pollution.
 */
export function useClimateAggregate(
  surveyId: string | null,
  orgUnitId: string | null = null,
) {
  const { scope } = useScope();
  return useQuery({
    queryKey: [
      'scope',
      scope?.id ?? '__none__',
      scope?.kind ?? '__none__',
      'climate_aggregate',
      surveyId,
      orgUnitId,
    ],
    queryFn: async (): Promise<ClimateAggregateResult> => {
      if (!surveyId) return { insufficient_data: true };
      const { data, error } = await supabase.rpc('get_climate_aggregate', {
        p_survey_id: surveyId,
        ...(orgUnitId ? { p_org_unit_id: orgUnitId } : {}),
      });
      if (error) throw error;
      return data as ClimateAggregateResult;
    },
    enabled: surveyId != null && !!scope,
  });
}
