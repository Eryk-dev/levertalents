import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Alert {
  type: 'gap' | 'score' | 'pending';
  message: string;
  action: string;
  relatedId?: string;
}

export function useLeaderAlerts(leaderId: string | undefined) {
  return useQuery({
    queryKey: ['leader-alerts', leaderId],
    queryFn: async () => {
      if (!leaderId) return [];

      const alerts: Alert[] = [];

      // Buscar scores baixos (avaliações com overall_score < 3.5)
      const { data: lowScores } = await supabase
        .from('evaluations')
        .select(`
          id,
          overall_score,
          evaluated_user_id,
          profiles!evaluations_evaluated_user_id_fkey (
            full_name
          )
        `)
        .eq('evaluator_user_id', leaderId)
        .lt('overall_score', 3.5)
        .order('created_at', { ascending: false })
        .limit(3);

      if (lowScores) {
        lowScores.forEach(evaluation => {
          const profile = evaluation.profiles as any;
          alerts.push({
            type: 'score',
            message: `Score baixo: ${profile?.full_name} (${evaluation.overall_score})`,
            action: 'Agendar 1:1',
            relatedId: evaluation.evaluated_user_id
          });
        });
      }

      // Buscar 1:1s pendentes (scheduled mas não realizados)
      const { data: pendingOneOnOnes } = await supabase
        .from('one_on_ones')
        .select('id, scheduled_date')
        .eq('leader_id', leaderId)
        .eq('status', 'scheduled')
        .lt('scheduled_date', new Date().toISOString());

      if (pendingOneOnOnes && pendingOneOnOnes.length > 0) {
        alerts.push({
          type: 'pending',
          message: `${pendingOneOnOnes.length} reuniões 1:1 pendentes`,
          action: 'Ver reuniões',
        });
      }

      // Buscar PDIs sem aprovação
      const { data: teamMembers } = await supabase
        .from('team_members')
        .select('user_id')
        .eq('leader_id', leaderId);

      const teamUserIds = teamMembers?.map(tm => tm.user_id) || [];

      if (teamUserIds.length > 0) {
        const { data: pendingPDIs } = await supabase
          .from('development_plans')
          .select(`
            id,
            user_id,
            profiles!development_plans_user_id_fkey (
              full_name
            )
          `)
          .eq('status', 'pending_approval')
          .in('user_id', teamUserIds)
          .limit(5);

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
    enabled: !!leaderId,
  });
}
