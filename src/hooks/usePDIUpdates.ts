import { useScopedQuery } from '@/shared/data/useScopedQuery';
import { supabase } from '@/integrations/supabase/client';

export type PDIUpdate = {
  id: string;
  plan_id: string;
  update_text: string;
  progress_change: number | null;
  created_at: string;
  created_by: string;
  author_name: string | null;
  author_avatar: string | null;
};

/**
 * Update history for a specific PDI plan.
 * queryKey: ['scope', scope.id, scope.kind, 'pdi-updates', planId]
 * D-25: useScopedQuery chokepoint; RLS handles visibility.
 */
export function usePDIUpdates(planId: string | null | undefined) {
  return useScopedQuery<PDIUpdate[]>(
    ['pdi-updates', planId],
    async () => {
      if (!planId) return [];

      const { data: updates } = await supabase
        .from('development_plan_updates')
        .select('id, plan_id, update_text, progress_change, created_at, created_by')
        .eq('plan_id', planId)
        .order('created_at', { ascending: false });

      const list = updates ?? [];
      if (list.length === 0) return [];

      const authorIds = [...new Set(list.map((u) => u.created_by))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', authorIds);

      const profileMap = new Map<string, { full_name: string | null; avatar_url: string | null }>();
      (profiles ?? []).forEach((p) => {
        profileMap.set(p.id, { full_name: p.full_name, avatar_url: p.avatar_url });
      });

      return list.map((u) => ({
        ...u,
        author_name: profileMap.get(u.created_by)?.full_name ?? null,
        author_avatar: profileMap.get(u.created_by)?.avatar_url ?? null,
      }));
    },
    { enabled: !!planId, staleTime: 60 * 1000 },
  );
}
