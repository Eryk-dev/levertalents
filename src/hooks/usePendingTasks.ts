import { useScopedQuery } from '@/shared/data/useScopedQuery';
import { supabase } from '@/integrations/supabase/client';

export type PendingTask = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  task_type: string;
  related_id: string | null;
  priority: string;
  due_date: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

/**
 * Pending tasks for the currently authenticated user.
 * queryKey: ['scope', scope.id, scope.kind, 'pending-tasks']
 * D-25: useScopedQuery chokepoint; pending_tasks scoped by auth user via RLS.
 */
export function usePendingTasks() {
  return useScopedQuery<PendingTask[]>(
    ['pending-tasks'],
    async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from('pending_tasks')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .order('due_date', { ascending: true, nullsFirst: false })
        .order('priority', { ascending: false });
      if (error) throw error;
      return (data ?? []) as PendingTask[];
    },
    { staleTime: 60 * 1000 },
  );
}
