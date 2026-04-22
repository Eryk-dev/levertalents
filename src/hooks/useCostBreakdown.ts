import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { handleSupabaseError } from "@/lib/supabaseError";

export type CostTeamRow = {
  teamId: string;
  teamName: string;
  companyName: string | null;
  memberCount: number;
  totalCost: number;
  avgCost: number;
};

export type CostBreakdown = {
  totalCost: number;
  totalMembers: number;
  teams: CostTeamRow[];
};

export function useCostBreakdown() {
  return useQuery<CostBreakdown>({
    queryKey: ["cost-breakdown"],
    queryFn: async () => {
      const { data: members, error: membersError } = await supabase
        .from("team_members")
        .select("user_id, team_id, cost");
      if (membersError) throw handleSupabaseError(membersError, "Falha ao carregar custos de membros", { silent: true });

      const { data: teams, error: teamsError } = await supabase
        .from("teams")
        .select("id, name, company:companies(name)");
      if (teamsError) throw handleSupabaseError(teamsError, "Falha ao carregar times", { silent: true });

      const teamMap = new Map<string, { name: string; companyName: string | null }>();
      (teams || []).forEach((t: any) => {
        teamMap.set(t.id, {
          name: t.name,
          companyName: t.company?.name || null,
        });
      });

      const aggregate = new Map<string, { totalCost: number; count: number }>();
      let totalCost = 0;
      const uniqueMembers = new Set<string>();

      (members || []).forEach((m) => {
        uniqueMembers.add(m.user_id);
        const cost = m?.cost != null ? Number(m.cost) : 0;
        const safeCost = Number.isFinite(cost) ? cost : 0;
        totalCost += safeCost;
        if (!m.team_id) return;
        const entry = aggregate.get(m.team_id) || { totalCost: 0, count: 0 };
        entry.totalCost += safeCost;
        entry.count += 1;
        aggregate.set(m.team_id, entry);
      });

      const rows: CostTeamRow[] = [];
      for (const [teamId, { totalCost: teamCost, count }] of aggregate.entries()) {
        const team = teamMap.get(teamId);
        rows.push({
          teamId,
          teamName: team?.name || "Time",
          companyName: team?.companyName || null,
          memberCount: count,
          totalCost: teamCost,
          avgCost: count ? teamCost / count : 0,
        });
      }

      rows.sort((a, b) => b.totalCost - a.totalCost);

      return {
        totalCost,
        totalMembers: uniqueMembers.size,
        teams: rows,
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}
