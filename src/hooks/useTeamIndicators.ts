import { useScopedQuery } from '@/shared/data/useScopedQuery';
import { supabase } from '@/integrations/supabase/client';
import { handleSupabaseError } from '@/lib/supabaseError';

export type TeamIndicators = {
  memberCount: number;
  avgPerformanceScore: number | null;
  completedOneOnOnesLast30d: number;
  avgPdiProgress: number | null;
  pendingApprovalPdis: number;
};

/**
 * Key performance indicators for a specific leader's team.
 * queryKey: ['scope', scope.id, scope.kind, 'team-indicators', leaderId]
 * D-25: useScopedQuery chokepoint; one_on_ones filtered by company_id (via companyIds).
 */
export function useTeamIndicators(leaderId: string | null | undefined) {
  return useScopedQuery<TeamIndicators>(
    ['team-indicators', leaderId],
    async (companyIds) => {
      if (!leaderId) throw new Error('leaderId required');

      const { data: ledUnits, error: ledUnitsError } = await supabase
        .from('unit_leaders')
        .select('org_unit_id')
        .eq('user_id', leaderId);
      if (ledUnitsError) throw handleSupabaseError(ledUnitsError, 'Falha ao carregar time', { silent: true });
      const orgUnitIds = (ledUnits ?? []).map((u) => u.org_unit_id);
      const { data: members, error: membersError } = orgUnitIds.length
        ? await supabase.from('org_unit_members').select('user_id').in('org_unit_id', orgUnitIds)
        : { data: [], error: null };
      if (membersError) throw handleSupabaseError(membersError, 'Falha ao carregar time', { silent: true });

      const memberIds = (members ?? []).map((m) => m.user_id);
      const memberCount = memberIds.length;

      if (memberCount === 0) {
        return {
          memberCount: 0,
          avgPerformanceScore: null,
          completedOneOnOnesLast30d: 0,
          avgPdiProgress: null,
          pendingApprovalPdis: 0,
        };
      }

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Post Phase 3: evaluations use responses JSONB (no overall_score column).
      // Extract avg score from numeric response values as performance proxy.
      const oneOnOnesQuery = supabase
        .from('one_on_ones')
        .select('id', { count: 'exact', head: true })
        .eq('leader_id', leaderId)
        .eq('status', 'completed')
        .gte('scheduled_date', thirtyDaysAgo.toISOString());

      // Scope one_on_ones by companyIds if available
      const scopedOneOnOnesQuery = companyIds.length
        ? oneOnOnesQuery.in('company_id', companyIds)
        : oneOnOnesQuery;

      const [evaluationsRes, oneOnOnesRes, pdisRes] = await Promise.all([
        supabase
          .from('evaluations')
          .select('direction, responses, status')
          .in('evaluated_user_id', memberIds)
          .eq('status', 'completed'),
        scopedOneOnOnesQuery,
        supabase
          .from('development_plans')
          .select('progress_percentage, status')
          .in('user_id', memberIds),
      ]);

      if (evaluationsRes.error) throw handleSupabaseError(evaluationsRes.error, 'Falha ao carregar avaliações', { silent: true });
      if (oneOnOnesRes.error) throw handleSupabaseError(oneOnOnesRes.error, 'Falha ao carregar 1:1s', { silent: true });
      if (pdisRes.error) throw handleSupabaseError(pdisRes.error, 'Falha ao carregar PDIs', { silent: true });

      // Derive avg performance from leader_to_member evaluations
      const leaderEvals = (evaluationsRes.data ?? []).filter(
        (e) => e.direction === 'leader_to_member',
      );
      const perfScores = leaderEvals.flatMap((e) => {
        const responses = (e.responses ?? {}) as Record<string, unknown>;
        return Object.values(responses).filter((v): v is number => typeof v === 'number' && v > 0);
      });
      const avgPerformanceScore = perfScores.length
        ? perfScores.reduce((s, v) => s + v, 0) / perfScores.length
        : null;

      const pdis = pdisRes.data ?? [];
      const activePdis = pdis.filter((p) =>
        ['in_progress', 'approved', 'pending_approval'].includes(p.status ?? ''),
      );
      const avgPdiProgress = activePdis.length
        ? activePdis.reduce((s, p) => s + Number(p.progress_percentage ?? 0), 0) / activePdis.length
        : null;
      const pendingApprovalPdis = pdis.filter((p) => p.status === 'pending_approval').length;

      return {
        memberCount,
        avgPerformanceScore,
        completedOneOnOnesLast30d: oneOnOnesRes.count ?? 0,
        avgPdiProgress,
        pendingApprovalPdis,
      };
    },
    { enabled: !!leaderId, staleTime: 5 * 60 * 1000 },
  );
}
