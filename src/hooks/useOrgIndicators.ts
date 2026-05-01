import { useScopedQuery } from '@/shared/data/useScopedQuery';
import { supabase } from '@/integrations/supabase/client';
import { handleSupabaseError } from '@/lib/supabaseError';

export type OrgIndicators = {
  totalCollaborators: number;
  completedEvaluations: number;
  completedOneOnOnesLast30d: number;
  avgPerformanceScore: number | null;
  lowScoreCollaborators: number;
  pendingApprovalPdis: number;
};

/**
 * Org-level performance indicators for the current scope.
 * queryKey: ['scope', scope.id, scope.kind, 'org-indicators']
 * D-25: useScopedQuery chokepoint; one_on_ones + evaluations scoped by companyIds.
 */
export function useOrgIndicators() {
  return useScopedQuery<OrgIndicators>(
    ['org-indicators'],
    async (companyIds) => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Build scoped one_on_ones query
      let oneOnOnesQ = supabase
        .from('one_on_ones')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'completed')
        .gte('scheduled_date', thirtyDaysAgo.toISOString());
      if (companyIds.length) oneOnOnesQ = oneOnOnesQ.in('company_id', companyIds);

      const [teamMembersRes, evaluationsRes, oneOnOnesRes, pendingPdisRes] = await Promise.all([
        supabase.from('org_unit_members').select('user_id', { count: 'exact' }),
        supabase
          .from('evaluations')
          .select('direction, responses, evaluated_user_id, status')
          .in('status', ['submitted', 'completed']),
        oneOnOnesQ,
        supabase
          .from('development_plans')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending_approval'),
      ]);

      if (teamMembersRes.error) throw handleSupabaseError(teamMembersRes.error, 'Falha ao carregar time', { silent: true });
      if (evaluationsRes.error) throw handleSupabaseError(evaluationsRes.error, 'Falha ao carregar avaliações', { silent: true });
      if (oneOnOnesRes.error) throw handleSupabaseError(oneOnOnesRes.error, 'Falha ao carregar 1:1s', { silent: true });
      if (pendingPdisRes.error) throw handleSupabaseError(pendingPdisRes.error, 'Falha ao carregar PDIs pendentes', { silent: true });

      // Post Phase 3: derive scores from responses JSONB (no overall_score column)
      const leaderEvals = (evaluationsRes.data ?? []).filter(
        (e) => e.direction === 'leader_to_member',
      );
      const completedEvaluations = leaderEvals.length;

      // Aggregate per evaluated_user to find low scorers
      const byUser = new Map<string, number[]>();
      for (const e of leaderEvals) {
        if (!e.evaluated_user_id) continue;
        const responses = (e.responses ?? {}) as Record<string, unknown>;
        const scores = Object.values(responses).filter(
          (v): v is number => typeof v === 'number' && v > 0,
        );
        if (!scores.length) continue;
        const avg = scores.reduce((s, v) => s + v, 0) / scores.length;
        const list = byUser.get(e.evaluated_user_id) ?? [];
        list.push(avg);
        byUser.set(e.evaluated_user_id, list);
      }

      let avgPerformanceScore: number | null = null;
      let lowScoreCollaborators = 0;
      const allAvgs: number[] = [];
      for (const scores of byUser.values()) {
        const avg = scores.reduce((s, v) => s + v, 0) / scores.length;
        allAvgs.push(avg);
        if (avg < 3) lowScoreCollaborators += 1;
      }
      if (allAvgs.length) {
        avgPerformanceScore = allAvgs.reduce((s, v) => s + v, 0) / allAvgs.length;
      }

      return {
        totalCollaborators: teamMembersRes.count ?? 0,
        completedEvaluations,
        completedOneOnOnesLast30d: oneOnOnesRes.count ?? 0,
        avgPerformanceScore,
        lowScoreCollaborators,
        pendingApprovalPdis: pendingPdisRes.count ?? 0,
      };
    },
    { staleTime: 5 * 60 * 1000 },
  );
}
