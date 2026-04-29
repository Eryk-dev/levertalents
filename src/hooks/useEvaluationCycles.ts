import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useScopedQuery } from '@/shared/data/useScopedQuery';
import { useScope } from '@/app/providers/ScopeProvider';
import type { Database } from '@/integrations/supabase/types';

type CycleRow = Database['public']['Tables']['evaluation_cycles']['Row'];
type CycleInsert = Database['public']['Tables']['evaluation_cycles']['Insert'];

export type AudienceKind = 'company' | 'org_unit' | 'manual';
export type EvaluationDirection = 'self' | 'leader_to_member' | 'member_to_leader' | 'peer';

export interface CreateCycleInput {
  company_id: string;
  template_id: string;
  name: string;
  starts_at: string; // ISO
  ends_at: string;   // ISO; must be > starts_at (CHECK enforced in DB and validated here)
  audience_kind: AudienceKind;
  audience_ids: string[];
  include_descendants: boolean;
  directions: EvaluationDirection[];
}

/**
 * Lists evaluation cycles visible in the current scope.
 * queryKey: ['scope', scope.id, scope.kind, 'evaluation_cycles']
 * D-25/D-26: useScopedQuery chokepoint; Pitfall §11: scope.id in key.
 */
export function useEvaluationCycles() {
  return useScopedQuery<CycleRow[]>(
    ['evaluation_cycles'],
    async (companyIds) => {
      if (!companyIds.length) return [] as CycleRow[];
      const { data, error } = await supabase
        .from('evaluation_cycles')
        .select('*')
        .in('company_id', companyIds)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as CycleRow[];
    },
  );
}

/**
 * Creates a new evaluation cycle.
 * Validation: ends_at > starts_at (client-side + DB CHECK constraint).
 * Note: DB trigger tg_freeze_template_snapshot copies template.schema_json → cycle.template_snapshot on insert.
 */
export function useCreateCycle() {
  const queryClient = useQueryClient();
  const { scope } = useScope();
  return useMutation({
    mutationFn: async (input: CreateCycleInput): Promise<CycleRow> => {
      if (new Date(input.ends_at) <= new Date(input.starts_at)) {
        throw new Error('A data de fim precisa ser depois da data de início.');
      }
      // template_snapshot will be overwritten by the DB trigger; send empty object as placeholder
      if (input.directions.length === 0) {
        throw new Error('Selecione ao menos uma direção de avaliação.');
      }
      const insert: CycleInsert = {
        company_id: input.company_id,
        template_id: input.template_id,
        name: input.name,
        starts_at: input.starts_at,
        ends_at: input.ends_at,
        template_snapshot: {}, // overwritten by trigger tg_freeze_template_snapshot
        status: 'active',
        audience_kind: input.audience_kind,
        audience_ids: input.audience_ids,
        include_descendants: input.include_descendants,
        directions: input.directions,
      };
      const { data, error } = await supabase
        .from('evaluation_cycles')
        .insert(insert)
        .select()
        .single();
      if (error) throw error;
      return data as CycleRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [
          'scope',
          scope?.id ?? '__none__',
          scope?.kind ?? '__none__',
          'evaluation_cycles',
        ],
      });
    },
  });
}
