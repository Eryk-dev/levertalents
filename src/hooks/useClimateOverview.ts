import { supabase } from '@/integrations/supabase/client';
import { useScopedQuery } from '@/shared/data/useScopedQuery';

export type ClimateOverviewSurvey = {
  id: string;
  title: string;
  status: string | null;
  start_date: string;
  end_date: string;
  company_id: string;
};

export type ClimateOverview = {
  surveys: ClimateOverviewSurvey[];
  total_active: number;
};

/**
 * Aggregated overview of all active surveys in current scope.
 * queryKey: ['scope', scope.id, scope.kind, 'climate_overview']
 * D-25: useScopedQuery chokepoint.
 * D-10: detail-level k-anon enforcement happens in useClimateAggregate per survey.
 */
export function useClimateOverview() {
  return useScopedQuery<ClimateOverview>(
    ['climate_overview'],
    async (companyIds) => {
      if (!companyIds.length) return { surveys: [], total_active: 0 };
      const { data, error } = await supabase
        .from('climate_surveys')
        .select('id, title, status, start_date, end_date, company_id')
        .in('company_id', companyIds)
        .eq('status', 'active');
      if (error) throw error;
      const surveys = (data ?? []) as ClimateOverviewSurvey[];
      return {
        surveys,
        total_active: surveys.length,
      };
    },
    { staleTime: 5 * 60 * 1000 },
  );
}
