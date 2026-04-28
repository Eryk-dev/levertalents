import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useScopedQuery } from '@/shared/data/useScopedQuery';
import { useScope } from '@/app/providers/ScopeProvider';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type PlanRow = Database['public']['Tables']['development_plans']['Row'];

export interface PDIFormData {
  main_objective: string;
  committed_actions: string;
  required_support: string;
  success_metrics: string;
  anticipated_challenges: string;
  deadline: string;
}

/**
 * Standalone hook: PDI linked to a specific 1:1.
 * queryKey: ['scope', scope.id, scope.kind, 'pdi_from_one_on_one', oneOnOneId]
 */
export function usePDIForOneOnOne(oneOnOneId: string | undefined) {
  return useScopedQuery<PlanRow | null>(
    ['pdi_from_one_on_one', oneOnOneId],
    async () => {
      if (!oneOnOneId) return null;
      const { data, error } = await supabase
        .from('development_plans')
        .select('*')
        .eq('one_on_one_id', oneOnOneId)
        .maybeSingle();
      if (error) throw error;
      return (data as PlanRow) ?? null;
    },
    { enabled: !!oneOnOneId },
  );
}

/**
 * Standalone hook: most recent PDI for a collaborator.
 * queryKey: ['scope', scope.id, scope.kind, 'latest_pdi', collaboratorId]
 */
export function useLatestPDIForCollaborator(collaboratorId: string | undefined) {
  return useScopedQuery<PlanRow | null>(
    ['latest_pdi', collaboratorId],
    async () => {
      if (!collaboratorId) return null;
      const { data, error } = await supabase
        .from('development_plans')
        .select(`
          *,
          user:profiles!development_plans_user_id_fkey(id, full_name, avatar_url)
        `)
        .eq('user_id', collaboratorId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as PlanRow) ?? null;
    },
    { enabled: !!collaboratorId },
  );
}

/**
 * Integrated PDI hook: flat list of PDIs linked to 1:1s + create/update mutations.
 * queryKey: ['scope', scope.id, scope.kind, 'all_pdis_for_one_on_ones']
 * D-25: useScopedQuery chokepoint.
 */
export function usePDIIntegrated() {
  const queryClient = useQueryClient();
  const { scope } = useScope();

  const { data: allPDIs } = useScopedQuery<Array<{ id: string; one_on_one_id: string | null }>>(
    ['all_pdis_for_one_on_ones'],
    async () => {
      const { data, error } = await supabase
        .from('development_plans')
        .select('id, one_on_one_id')
        .not('one_on_one_id', 'is', null);
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; one_on_one_id: string | null }>;
    },
  );

  const hasPDIForOneOnOne = (oneOnOneId: string): boolean =>
    allPDIs?.some((pdi) => pdi.one_on_one_id === oneOnOneId) ?? false;

  const scopeKey = ['scope', scope?.id ?? '__none__', scope?.kind ?? '__none__'] as const;

  const createPDIFromOneOnOne = useMutation({
    mutationFn: async ({
      oneOnOneId,
      collaboratorId,
      data,
    }: {
      oneOnOneId: string;
      collaboratorId: string;
      data: PDIFormData;
    }) => {
      const { data: pdi, error } = await supabase
        .from('development_plans')
        .insert([{
          one_on_one_id: oneOnOneId,
          user_id: collaboratorId,
          title: `PDI - ${data.main_objective.substring(0, 50)}`,
          description: data.main_objective,
          main_objective: data.main_objective,
          committed_actions: data.committed_actions,
          required_support: data.required_support,
          success_metrics: data.success_metrics,
          anticipated_challenges: data.anticipated_challenges,
          deadline: data.deadline,
          status: 'in_progress',
          development_area: 'Objetivo Mensal',
          goals: data.main_objective,
          action_items: data.committed_actions,
          timeline: data.deadline,
        }])
        .select()
        .single();
      if (error) throw error;
      return pdi;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...scopeKey, 'development_plans'] });
      queryClient.invalidateQueries({ queryKey: [...scopeKey, 'pdi_from_one_on_one'] });
      queryClient.invalidateQueries({ queryKey: [...scopeKey, 'all_pdis_for_one_on_ones'] });
      queryClient.invalidateQueries({ queryKey: [...scopeKey, 'latest_pdi'] });
    },
  });

  const updatePDIProgress = useMutation({
    mutationFn: async ({
      pdiId,
      progressPercentage,
      updateText,
    }: {
      pdiId: string;
      progressPercentage: number;
      updateText: string;
    }) => {
      const { error: updateError } = await supabase
        .from('development_plans')
        .update({ progress_percentage: progressPercentage })
        .eq('id', pdiId);
      if (updateError) throw updateError;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');

      const { error: insertError } = await supabase
        .from('development_plan_updates')
        .insert([{
          plan_id: pdiId,
          created_by: user.id,
          update_text: updateText,
          progress_change: progressPercentage,
        }]);
      if (insertError) throw insertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...scopeKey, 'development_plans'] });
      queryClient.invalidateQueries({ queryKey: [...scopeKey, 'pdi_from_one_on_one'] });
      queryClient.invalidateQueries({ queryKey: [...scopeKey, 'all_pdis_for_one_on_ones'] });
      queryClient.invalidateQueries({ queryKey: [...scopeKey, 'latest_pdi'] });
    },
  });

  return {
    hasPDIForOneOnOne,
    createPDIFromOneOnOne: createPDIFromOneOnOne.mutate,
    updatePDIProgress: updatePDIProgress.mutate,
    isCreating: createPDIFromOneOnOne.isPending,
    isUpdating: updatePDIProgress.isPending,
  };
}
