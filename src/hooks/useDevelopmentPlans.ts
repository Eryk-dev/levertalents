import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useScopedQuery } from '@/shared/data/useScopedQuery';
import { useScope } from '@/app/providers/ScopeProvider';
import type { Database } from '@/integrations/supabase/types';

type PlanRow = Database['public']['Tables']['development_plans']['Row'];

export type DevelopmentPlan = PlanRow & {
  user?: { id: string; full_name: string | null; avatar_url: string | null } | null;
  approver?: { id: string; full_name: string | null; avatar_url: string | null } | null;
};

/**
 * Lists development plans (PDIs) filtered by optional userId.
 * queryKey: ['scope', scope.id, scope.kind, 'development_plans', userId]
 * D-25: useScopedQuery chokepoint; RLS handles per-user visibility.
 * Note: development_plans has no company_id column — RLS scope via user membership.
 */
export function useDevelopmentPlans(userId?: string) {
  return useScopedQuery<DevelopmentPlan[]>(
    ['development_plans', userId],
    async () => {
      let q = supabase
        .from('development_plans')
        .select(`
          *,
          user:profiles!development_plans_user_id_fkey(id, full_name, avatar_url),
          approver:profiles!development_plans_approved_by_fkey(id, full_name, avatar_url)
        `)
        .order('created_at', { ascending: false });
      if (userId) q = q.eq('user_id', userId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as DevelopmentPlan[];
    },
  );
}

export function useCreateDevelopmentPlan() {
  const queryClient = useQueryClient();
  const { scope } = useScope();
  return useMutation({
    mutationFn: async (input: Partial<PlanRow> & { title: string; description: string; development_area: string; goals: string; action_items: string; timeline: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');
      const { data, error } = await supabase
        .from('development_plans')
        .insert({ ...input, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data as PlanRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['scope', scope?.id ?? '__none__', scope?.kind ?? '__none__', 'development_plans'],
      });
    },
  });
}

export function useUpdateDevelopmentPlan() {
  const queryClient = useQueryClient();
  const { scope } = useScope();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<PlanRow> }) => {
      const { data, error } = await supabase
        .from('development_plans')
        .update(input)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as PlanRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['scope', scope?.id ?? '__none__', scope?.kind ?? '__none__', 'development_plans'],
      });
    },
  });
}

export function useDeleteDevelopmentPlan() {
  const queryClient = useQueryClient();
  const { scope } = useScope();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('development_plans').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['scope', scope?.id ?? '__none__', scope?.kind ?? '__none__', 'development_plans'],
      });
    },
  });
}
