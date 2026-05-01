import { useScopedQuery } from '@/shared/data/useScopedQuery';
import { supabase } from '@/integrations/supabase/client';
import { handleSupabaseError } from '@/lib/supabaseError';

interface Alert {
  type: 'gap' | 'score' | 'pending';
  message: string;
  action: string;
  relatedId?: string;
}

/**
 * Leader alerts: low scores, pending 1:1s, PDIs awaiting approval.
 * queryKey: ['scope', scope.id, scope.kind, 'leader-alerts', leaderId]
 * D-25: useScopedQuery chokepoint.
 * Post Phase 3: evaluations no longer have overall_score — derive from responses JSONB.
 */
export function useLeaderAlerts(leaderId: string | undefined) {
  return useScopedQuery<Alert[]>(
    ['leader-alerts', leaderId],
    async () => {
      if (!leaderId) return [];

      const alerts: Alert[] = [];

      // Fetch low-scoring evaluations (leader_to_member direction, avg score < 3.5)
      const { data: lowScoreEvals, error: lowScoresError } = await supabase
        .from('evaluations')
        .select(`
          id,
          responses,
          evaluated_user_id,
          profiles!evaluations_evaluated_user_id_fkey(full_name)
        `)
        .eq('evaluator_user_id', leaderId)
        .eq('direction', 'leader_to_member')
        .in('status', ['submitted', 'completed'])
        .order('updated_at', { ascending: false })
        .limit(10);
      if (lowScoresError) throw handleSupabaseError(lowScoresError, 'Falha ao carregar scores', { silent: true });

      if (lowScoreEvals) {
        for (const evaluation of lowScoreEvals) {
          const responses = (evaluation.responses ?? {}) as Record<string, unknown>;
          const scores = Object.values(responses).filter(
            (v): v is number => typeof v === 'number' && v > 0,
          );
          if (!scores.length) continue;
          const avg = scores.reduce((s, v) => s + v, 0) / scores.length;
          if (avg >= 3.5) continue;

          const profile = evaluation.profiles as { full_name: string | null } | null;
          alerts.push({
            type: 'score',
            message: `Score baixo: ${profile?.full_name ?? 'Colaborador'} (${avg.toFixed(1)})`,
            action: 'Agendar 1:1',
            relatedId: evaluation.evaluated_user_id,
          });
          if (alerts.filter((a) => a.type === 'score').length >= 3) break;
        }
      }

      // Fetch pending 1:1s (scheduled but past scheduled_date)
      const { data: pendingOneOnOnes, error: pendingOneOnOnesError } = await supabase
        .from('one_on_ones')
        .select('id, scheduled_date')
        .eq('leader_id', leaderId)
        .eq('status', 'scheduled')
        .lt('scheduled_date', new Date().toISOString());
      if (pendingOneOnOnesError) throw handleSupabaseError(pendingOneOnOnesError, 'Falha ao carregar 1:1s pendentes', { silent: true });

      if (pendingOneOnOnes && pendingOneOnOnes.length > 0) {
        alerts.push({
          type: 'pending',
          message: `${pendingOneOnOnes.length} reuniões 1:1 pendentes`,
          action: 'Ver reuniões',
        });
      }

      // Fetch PDIs awaiting approval from team members
      const { data: ledUnits, error: ledUnitsError } = await supabase
        .from('unit_leaders')
        .select('org_unit_id')
        .eq('user_id', leaderId);
      if (ledUnitsError) throw handleSupabaseError(ledUnitsError, 'Falha ao carregar time', { silent: true });
      const orgUnitIds = (ledUnits ?? []).map((u) => u.org_unit_id);
      const { data: teamMembers, error: teamMembersError } = orgUnitIds.length
        ? await supabase.from('org_unit_members').select('user_id').in('org_unit_id', orgUnitIds)
        : { data: [], error: null };
      if (teamMembersError) throw handleSupabaseError(teamMembersError, 'Falha ao carregar time', { silent: true });

      const teamUserIds = [...new Set((teamMembers ?? []).map((tm) => tm.user_id))];
      if (teamUserIds.length > 0) {
        const { data: pendingPDIs, error: pendingPDIsError } = await supabase
          .from('development_plans')
          .select(`
            id,
            user_id,
            profiles!development_plans_user_id_fkey(full_name)
          `)
          .eq('status', 'pending_approval')
          .in('user_id', teamUserIds)
          .limit(5);
        if (pendingPDIsError) throw handleSupabaseError(pendingPDIsError, 'Falha ao carregar PDIs pendentes', { silent: true });

        if (pendingPDIs && pendingPDIs.length > 0) {
          alerts.push({
            type: 'pending',
            message: `${pendingPDIs.length} PDIs aguardando aprovação`,
            action: 'Revisar PDIs',
          });
        }
      }

      return alerts;
    },
    { enabled: !!leaderId },
  );
}
