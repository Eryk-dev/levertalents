import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type OrgIndicators = {
  totalCollaborators: number;
  completedEvaluations: number;
  completedOneOnOnesLast30d: number;
  avgPerformanceScore: number | null;
  lowScoreCollaborators: number;
  pendingApprovalPdis: number;
};

export function useOrgIndicators() {
  return useQuery<OrgIndicators>({
    queryKey: ["org-indicators"],
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const [teamMembersRes, evaluationsRes, oneOnOnesRes, pendingPdisRes] = await Promise.all([
        supabase.from("team_members").select("user_id", { count: "exact" }),
        supabase
          .from("evaluations")
          .select("overall_score, evaluated_user_id")
          .eq("status", "completed"),
        supabase
          .from("one_on_ones")
          .select("id", { count: "exact", head: true })
          .eq("status", "completed")
          .gte("scheduled_date", thirtyDaysAgo.toISOString()),
        supabase
          .from("development_plans")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending_approval"),
      ]);

      const evaluations = evaluationsRes.data || [];
      const completedEvaluations = evaluations.length;

      const avgPerformanceScore = completedEvaluations
        ? evaluations.reduce((sum, e) => sum + Number(e.overall_score || 0), 0) / completedEvaluations
        : null;

      const byUser = new Map<string, number[]>();
      for (const e of evaluations) {
        if (!e.evaluated_user_id) continue;
        const list = byUser.get(e.evaluated_user_id) || [];
        list.push(Number(e.overall_score || 0));
        byUser.set(e.evaluated_user_id, list);
      }
      let lowScoreCollaborators = 0;
      for (const scores of byUser.values()) {
        const avg = scores.reduce((s, v) => s + v, 0) / scores.length;
        if (avg < 3) lowScoreCollaborators += 1;
      }

      return {
        totalCollaborators: teamMembersRes.count || 0,
        completedEvaluations,
        completedOneOnOnesLast30d: oneOnOnesRes.count || 0,
        avgPerformanceScore,
        lowScoreCollaborators,
        pendingApprovalPdis: pendingPdisRes.count || 0,
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}
