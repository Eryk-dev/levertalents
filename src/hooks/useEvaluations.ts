import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useScopedQuery } from '@/shared/data/useScopedQuery';
import { useScope } from '@/app/providers/ScopeProvider';
import type { Database } from '@/integrations/supabase/types';

type EvaluationRow = Database['public']['Tables']['evaluations']['Row'];
type EvaluationInsert = Database['public']['Tables']['evaluations']['Insert'];

export type EvaluationDirection = 'self' | 'leader_to_member' | 'member_to_leader' | 'peer';

export interface CreateEvaluationInput {
  cycle_id: string;
  evaluator_user_id: string;
  evaluated_user_id: string;
  direction: EvaluationDirection;
  responses: Record<string, unknown>; // shape derived from template_snapshot
}

export interface CycleEvaluationAssignment {
  evaluator_user_id: string;
  evaluated_user_id: string;
  direction: EvaluationDirection;
}

/**
 * Lists evaluations for a given cycle in the current scope.
 * queryKey: ['scope', scope.id, scope.kind, 'evaluations', cycleId]
 * D-25: useScopedQuery chokepoint; Pitfall §11: scope.id in key.
 */
export function useEvaluations(cycleId: string | null) {
  return useScopedQuery<EvaluationRow[]>(
    ['evaluations', cycleId],
    async () => {
      if (!cycleId) return [] as EvaluationRow[];
      const { data, error } = await supabase
        .from('evaluations')
        .select('*')
        .eq('cycle_id', cycleId)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as EvaluationRow[];
    },
    { enabled: cycleId != null },
  );
}

export function useMyCycleEvaluationAssignments(cycleId: string | null) {
  return useScopedQuery<CycleEvaluationAssignment[]>(
    ['my-cycle-evaluation-assignments', cycleId],
    async () => {
      if (!cycleId) return [] as CycleEvaluationAssignment[];
      const { data, error } = await supabase.rpc('my_cycle_evaluation_assignments', {
        _cycle_id: cycleId,
      });
      if (error) throw error;
      return (data ?? []) as CycleEvaluationAssignment[];
    },
    { enabled: cycleId != null },
  );
}

/**
 * Creates a new evaluation within a cycle.
 * Pitfall §1: company_id resolved via cycle.company_id sub-select (NOT NULL constraint).
 * T-3-CYCLE-01 mitigation: never trusts caller's company_id.
 */
export function useCreateEvaluation() {
  const queryClient = useQueryClient();
  const { scope } = useScope();
  return useMutation({
    mutationFn: async (input: CreateEvaluationInput): Promise<EvaluationRow> => {
      // Resolve company_id from the cycle to prevent tampering (T-3-CYCLE-01)
      const { data: cycle, error: cyErr } = await supabase
        .from('evaluation_cycles')
        .select('company_id')
        .eq('id', input.cycle_id)
        .single();
      if (cyErr || !cycle) throw cyErr ?? new Error('Cycle not found');

      const insert: EvaluationInsert = {
        cycle_id: input.cycle_id,
        evaluator_user_id: input.evaluator_user_id,
        evaluated_user_id: input.evaluated_user_id,
        direction: input.direction,
        responses: input.responses as Database['public']['Tables']['evaluations']['Insert']['responses'],
        status: 'submitted',
        company_id: cycle.company_id,
      };
      const { data, error } = await supabase
        .from('evaluations')
        .insert(insert)
        .select()
        .single();
      if (error) throw error;
      return data as EvaluationRow;
    },
    onSuccess: (_data, vars) => {
      // Invalidate with partial key so useScopedQuery cache is evicted
      queryClient.invalidateQueries({
        queryKey: [
          'scope',
          scope?.id ?? '__none__',
          scope?.kind ?? '__none__',
          'evaluations',
          vars.cycle_id,
        ],
      });
      queryClient.invalidateQueries({
        queryKey: [
          'scope',
          scope?.id ?? '__none__',
          scope?.kind ?? '__none__',
          'pending-tasks',
        ],
      });
      queryClient.invalidateQueries({
        queryKey: [
          'scope',
          scope?.id ?? '__none__',
          scope?.kind ?? '__none__',
          'evaluation_cycles',
        ],
      });
      for (const key of ['nine-box', 'nine-box-cycles', 'org-indicators', 'team-indicators', 'leader-alerts']) {
        queryClient.invalidateQueries({
          queryKey: [
            'scope',
            scope?.id ?? '__none__',
            scope?.kind ?? '__none__',
            key,
          ],
        });
      }
    },
  });
}

export function useUpdateEvaluation() {
  const queryClient = useQueryClient();
  const { scope } = useScope();
  return useMutation({
    mutationFn: async (vars: {
      id: string;
      cycle_id: string;
      responses: Record<string, unknown>;
    }): Promise<EvaluationRow> => {
      const { data, error } = await supabase
        .from('evaluations')
        .update({
          responses: vars.responses as Database['public']['Tables']['evaluations']['Update']['responses'],
          status: 'submitted',
          updated_at: new Date().toISOString(),
        })
        .eq('id', vars.id)
        .select()
        .single();
      if (error) throw error;
      return data as EvaluationRow;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({
        queryKey: [
          'scope',
          scope?.id ?? '__none__',
          scope?.kind ?? '__none__',
          'evaluations',
          vars.cycle_id,
        ],
      });
      queryClient.invalidateQueries({
        queryKey: [
          'scope',
          scope?.id ?? '__none__',
          scope?.kind ?? '__none__',
          'pending-tasks',
        ],
      });
      queryClient.invalidateQueries({
        queryKey: [
          'scope',
          scope?.id ?? '__none__',
          scope?.kind ?? '__none__',
          'evaluation_cycles',
        ],
      });
      for (const key of ['nine-box', 'nine-box-cycles', 'org-indicators', 'team-indicators', 'leader-alerts']) {
        queryClient.invalidateQueries({
          queryKey: [
            'scope',
            scope?.id ?? '__none__',
            scope?.kind ?? '__none__',
            key,
          ],
        });
      }
    },
  });
}
