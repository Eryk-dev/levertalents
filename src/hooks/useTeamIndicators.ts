import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type TeamIndicators = {
  memberCount: number;
  avgPerformanceScore: number | null;
  completedOneOnOnesLast30d: number;
  avgPdiProgress: number | null;
  pendingApprovalPdis: number;
};

export function useTeamIndicators(leaderId: string | null | undefined) {
  return useQuery<TeamIndicators>({
    queryKey: ["team-indicators", leaderId],
    enabled: !!leaderId,
    queryFn: async () => {
      if (!leaderId) throw new Error("leaderId required");

      const { data: members } = await supabase
        .from("team_members")
        .select("user_id")
        .eq("leader_id", leaderId);

      const memberIds = (members || []).map((m) => m.user_id);
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

      const [evaluationsRes, oneOnOnesRes, pdisRes] = await Promise.all([
        supabase
          .from("evaluations")
          .select("overall_score")
          .in("evaluated_user_id", memberIds)
          .eq("status", "completed"),
        supabase
          .from("one_on_ones")
          .select("id", { count: "exact", head: true })
          .eq("leader_id", leaderId)
          .eq("status", "completed")
          .gte("scheduled_date", thirtyDaysAgo.toISOString()),
        supabase
          .from("development_plans")
          .select("progress_percentage, status")
          .in("user_id", memberIds),
      ]);

      const evaluations = evaluationsRes.data || [];
      const avgPerformanceScore = evaluations.length
        ? evaluations.reduce((sum, e) => sum + Number(e.overall_score || 0), 0) / evaluations.length
        : null;

      const pdis = pdisRes.data || [];
      const activePdis = pdis.filter((p) => ["in_progress", "approved", "pending_approval"].includes(p.status));
      const avgPdiProgress = activePdis.length
        ? activePdis.reduce((sum, p) => sum + Number(p.progress_percentage || 0), 0) / activePdis.length
        : null;
      const pendingApprovalPdis = pdis.filter((p) => p.status === "pending_approval").length;

      return {
        memberCount,
        avgPerformanceScore,
        completedOneOnOnesLast30d: oneOnOnesRes.count || 0,
        avgPdiProgress,
        pendingApprovalPdis,
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}
