import { useScopedQuery } from '@/shared/data/useScopedQuery';
import { supabase } from '@/integrations/supabase/client';
import { handleSupabaseError } from '@/lib/supabaseError';

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

/**
 * Cost breakdown by team for the current scope.
 * queryKey: ['scope', scope.id, scope.kind, 'cost-breakdown']
 * D-25: useScopedQuery chokepoint; teams filtered by companyIds.
 */
export function useCostBreakdown() {
  return useScopedQuery<CostBreakdown>(
    ['cost-breakdown'],
    async (companyIds) => {
      // Filter teams by current scope's company IDs when available
      let teamsQuery = supabase
        .from('teams')
        .select('id, name, company:companies(name)');
      if (companyIds.length) {
        teamsQuery = teamsQuery.in('company_id', companyIds) as typeof teamsQuery;
      }

      const [membersRes, teamsRes] = await Promise.all([
        supabase.from('team_members').select('user_id, team_id, cost'),
        teamsQuery,
      ]);

      if (membersRes.error) throw handleSupabaseError(membersRes.error, 'Falha ao carregar custos de membros', { silent: true });
      if (teamsRes.error) throw handleSupabaseError(teamsRes.error, 'Falha ao carregar times', { silent: true });

      const teamMap = new Map<string, { name: string; companyName: string | null }>();
      (teamsRes.data ?? []).forEach((t) => {
        const company = t.company as { name: string } | null;
        teamMap.set(t.id, { name: t.name, companyName: company?.name ?? null });
      });

      // Only include members from teams in scope
      const scopedTeamIds = new Set(teamMap.keys());
      const members = (membersRes.data ?? []).filter(
        (m) => !m.team_id || scopedTeamIds.size === 0 || scopedTeamIds.has(m.team_id),
      );

      const aggregate = new Map<string, { totalCost: number; count: number }>();
      let totalCost = 0;
      const uniqueMembers = new Set<string>();

      members.forEach((m) => {
        uniqueMembers.add(m.user_id);
        const cost = m.cost != null ? Number(m.cost) : 0;
        const safeCost = Number.isFinite(cost) ? cost : 0;
        totalCost += safeCost;
        if (!m.team_id) return;
        const entry = aggregate.get(m.team_id) ?? { totalCost: 0, count: 0 };
        entry.totalCost += safeCost;
        entry.count += 1;
        aggregate.set(m.team_id, entry);
      });

      const rows: CostTeamRow[] = [];
      for (const [teamId, { totalCost: teamCost, count }] of aggregate.entries()) {
        const team = teamMap.get(teamId);
        rows.push({
          teamId,
          teamName: team?.name ?? 'Time',
          companyName: team?.companyName ?? null,
          memberCount: count,
          totalCost: teamCost,
          avgCost: count ? teamCost / count : 0,
        });
      }
      rows.sort((a, b) => b.totalCost - a.totalCost);

      return { totalCost, totalMembers: uniqueMembers.size, teams: rows };
    },
    { staleTime: 5 * 60 * 1000 },
  );
}
