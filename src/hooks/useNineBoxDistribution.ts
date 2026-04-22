import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { handleSupabaseError } from "@/lib/supabaseError";

export type NineBoxAxis = "low" | "mid" | "high";
export type NineBoxCell = `${NineBoxAxis}-${NineBoxAxis}`;

export type NineBoxUser = {
  userId: string;
  fullName: string;
  avatarUrl: string | null;
  performance: number;
  potential: number;
  performanceCat: NineBoxAxis;
  potentialCat: NineBoxAxis;
  cell: NineBoxCell;
};

export type NineBoxScope = "team" | "org";

export type NineBoxDistribution = {
  users: NineBoxUser[];
  byCell: Record<NineBoxCell, NineBoxUser[]>;
  totalEvaluated: number;
};

const ALL_CELLS: NineBoxCell[] = [
  "low-low",
  "low-mid",
  "low-high",
  "mid-low",
  "mid-mid",
  "mid-high",
  "high-low",
  "high-mid",
  "high-high",
];

function categorize(score: number): NineBoxAxis {
  if (score >= 4) return "high";
  if (score >= 3) return "mid";
  return "low";
}

export function useNineBoxDistribution(scope: NineBoxScope, leaderId?: string | null) {
  return useQuery<NineBoxDistribution>({
    queryKey: ["nine-box", scope, leaderId],
    enabled: scope === "org" || !!leaderId,
    queryFn: async () => {
      let userIds: string[] = [];
      if (scope === "team" && leaderId) {
        const { data: members, error: membersError } = await supabase
          .from("team_members")
          .select("user_id")
          .eq("leader_id", leaderId);
        if (membersError) throw handleSupabaseError(membersError, "Falha ao carregar time", { silent: true });
        userIds = (members || []).map((m) => m.user_id);
      } else if (scope === "org") {
        const { data: members, error: membersError } = await supabase.from("team_members").select("user_id");
        if (membersError) throw handleSupabaseError(membersError, "Falha ao carregar time", { silent: true });
        userIds = [...new Set((members || []).map((m) => m.user_id))];
      }

      const byCell = ALL_CELLS.reduce(
        (acc, cell) => {
          acc[cell] = [];
          return acc;
        },
        {} as Record<NineBoxCell, NineBoxUser[]>,
      );

      if (userIds.length === 0) {
        return { users: [], byCell, totalEvaluated: 0 };
      }

      const [evaluationsRes, profilesRes] = await Promise.all([
        supabase
          .from("evaluations")
          .select("evaluated_user_id, overall_score, leadership_score, technical_score, behavioral_score")
          .in("evaluated_user_id", userIds)
          .eq("status", "completed"),
        supabase.from("profiles").select("id, full_name, avatar_url").in("id", userIds),
      ]);

      if (evaluationsRes.error) throw handleSupabaseError(evaluationsRes.error, "Falha ao carregar avaliações", { silent: true });
      if (profilesRes.error) throw handleSupabaseError(profilesRes.error, "Falha ao carregar perfis", { silent: true });

      const evaluations = evaluationsRes.data || [];
      const profiles = profilesRes.data || [];

      const profileById = new Map<string, { full_name: string | null; avatar_url: string | null }>();
      profiles.forEach((p) => {
        profileById.set(p.id, { full_name: p.full_name, avatar_url: p.avatar_url });
      });

      const scoresByUser = new Map<string, { perf: number[]; pot: number[] }>();
      for (const e of evaluations) {
        if (!e.evaluated_user_id) continue;
        const entry = scoresByUser.get(e.evaluated_user_id) || { perf: [], pot: [] };
        const perfScore = Number(e.overall_score || 0);
        const potScore = Number(e.leadership_score || 0);
        if (perfScore > 0) entry.perf.push(perfScore);
        if (potScore > 0) entry.pot.push(potScore);
        scoresByUser.set(e.evaluated_user_id, entry);
      }

      const users: NineBoxUser[] = [];
      for (const [userId, { perf, pot }] of scoresByUser.entries()) {
        if (perf.length === 0 || pot.length === 0) continue;
        const avgPerf = perf.reduce((s, v) => s + v, 0) / perf.length;
        const avgPot = pot.reduce((s, v) => s + v, 0) / pot.length;
        const profile = profileById.get(userId);
        const performanceCat = categorize(avgPerf);
        const potentialCat = categorize(avgPot);
        const cell = `${performanceCat}-${potentialCat}` as NineBoxCell;

        const u: NineBoxUser = {
          userId,
          fullName: profile?.full_name || "Sem nome",
          avatarUrl: profile?.avatar_url || null,
          performance: avgPerf,
          potential: avgPot,
          performanceCat,
          potentialCat,
          cell,
        };
        users.push(u);
        byCell[cell].push(u);
      }

      return { users, byCell, totalEvaluated: users.length };
    },
    staleTime: 5 * 60 * 1000,
  });
}
