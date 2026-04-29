import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useScopedQuery } from '@/shared/data/useScopedQuery';
import { useScope } from '@/app/providers/ScopeProvider';
import type { Database } from '@/integrations/supabase/types';

type SurveyRow = Database['public']['Tables']['climate_surveys']['Row'];

/**
 * Lists climate surveys visible in the current scope.
 * queryKey: ['scope', scope.id, scope.kind, 'climate_surveys']
 * D-25: useScopedQuery chokepoint; company_id filter defense-in-depth over RLS.
 */
export function useClimateSurveys() {
  return useScopedQuery<SurveyRow[]>(
    ['climate_surveys'],
    async (companyIds) => {
      if (!companyIds.length) return [] as SurveyRow[];
      const { data, error } = await supabase
        .from('climate_surveys')
        .select('*')
        .in('company_id', companyIds)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as SurveyRow[];
    },
  );
}

export interface CreateSurveyInput {
  company_id: string;
  title: string;
  description?: string;
  start_date: string;
  end_date: string;
  status?: 'active' | 'draft' | 'closed';
}

export function useCreateClimateSurvey() {
  const queryClient = useQueryClient();
  const { scope } = useScope();
  return useMutation({
    mutationFn: async (input: CreateSurveyInput): Promise<SurveyRow> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');
      const { data, error } = await supabase
        .from('climate_surveys')
        .insert({
          company_id: input.company_id,
          title: input.title,
          description: input.description ?? null,
          start_date: input.start_date,
          end_date: input.end_date,
          status: input.status ?? 'active',
          created_by: user.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data as SurveyRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [
          'scope',
          scope?.id ?? '__none__',
          scope?.kind ?? '__none__',
          'climate_surveys',
        ],
      });
    },
  });
}

/**
 * D-11 / T-3-RPC-02 mitigation: submit anonymous response via RPC.
 * Payload contains ONLY (survey_id, question_id, score, comment_optional).
 * Caller's user_id is NEVER part of the payload — RPC strips actor.
 * climate_responses.user_id column was dropped in migration 03-05.
 */
export function useSubmitClimateResponse() {
  return useMutation({
    mutationFn: async (input: {
      survey_id: string;
      question_id: string;
      score: number;
      comment?: string;
    }): Promise<{ success: true }> => {
      const { error } = await supabase.rpc('submit_climate_response', {
        p_survey_id: input.survey_id,
        p_question_id: input.question_id,
        p_score: input.score,
        p_comment: input.comment ?? null,
      });
      if (error) throw error;
      return { success: true };
    },
  });
}

// ---------------------------------------------------------------------------
// Legacy standalone hooks (kept for backward-compat with existing UI)
// ---------------------------------------------------------------------------

export type ClimateQuestion = {
  id: string;
  survey_id: string;
  question_text: string;
  category: string;
  question_order: number;
};

export function useUserResponseIds(_surveyId: string | undefined) {
  // user_id was dropped from climate_responses (migration 03-05) for anonymity.
  // Cannot track per-user answered questions — always show all questions.
  return { data: [] as string[] };
}

export const useClimateQuestions = (surveyId: string | undefined) => {
  const { scope } = useScope();
  return useQuery({
    queryKey: ['scope', scope?.id ?? '__none__', 'climate_questions', surveyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('climate_questions')
        .select('*')
        .eq('survey_id', surveyId!)
        .order('question_order');
      if (error) throw error;
      return (data ?? []) as ClimateQuestion[];
    },
    enabled: !!surveyId,
    refetchOnMount: 'always',
  });
};
