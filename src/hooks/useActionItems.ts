import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useScopedQuery } from '@/shared/data/useScopedQuery';
import { useScope } from '@/app/providers/ScopeProvider';

export interface ActionItem {
  id: string;
  one_on_one_id: string;
  description: string;
  assigned_to: string;
  due_date: string | null;
  status: 'pending' | 'in_progress' | 'completed';
  notes: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  assignee?: { id: string; full_name: string | null; avatar_url: string | null } | null;
}

/**
 * Action items for a specific 1:1 session.
 * queryKey: ['scope', scope.id, scope.kind, 'action_items', oneOnOneId]
 * D-25: useScopedQuery chokepoint; RLS handles per-user visibility.
 */
export function useActionItems(oneOnOneId?: string) {
  return useScopedQuery<ActionItem[]>(
    ['action_items', oneOnOneId],
    async () => {
      let query = supabase
        .from('one_on_one_action_items')
        .select(`
          *,
          assignee:profiles!one_on_one_action_items_assigned_to_fkey(id, full_name, avatar_url)
        `)
        .order('created_at', { ascending: false });
      if (oneOnOneId) query = query.eq('one_on_one_id', oneOnOneId);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as ActionItem[];
    },
    { enabled: !!oneOnOneId },
  );
}

export function useCreateActionItem() {
  const queryClient = useQueryClient();
  const { scope } = useScope();
  return useMutation({
    mutationFn: async (input: {
      one_on_one_id: string;
      description: string;
      assigned_to: string;
      due_date?: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from('one_on_one_action_items')
        .insert([input])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['scope', scope?.id ?? '__none__', scope?.kind ?? '__none__', 'action_items'],
      });
    },
  });
}

export function useUpdateActionItem() {
  const queryClient = useQueryClient();
  const { scope } = useScope();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<ActionItem> }) => {
      const updateData: Record<string, unknown> = { ...input };
      if (input.status === 'completed' && !input.completed_at) {
        updateData.completed_at = new Date().toISOString();
      }
      const { data, error } = await supabase
        .from('one_on_one_action_items')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['scope', scope?.id ?? '__none__', scope?.kind ?? '__none__', 'action_items'],
      });
    },
  });
}
