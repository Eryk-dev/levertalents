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

export type CostCompanyRow = {
  companyId: string;
  companyName: string;
  memberCount: number;
  totalCost: number;
  avgCost: number;
};

export type CostBreakdown = {
  totalCost: number;
  totalMembers: number;
  teams: CostTeamRow[];
  /**
   * Breakdown por empresa. Sempre populado a partir de scope.companyIds
   * (D-05 LOCK — toda empresa do escopo aparece, mesmo com zero times).
   * O consumer (SocioDashboard) decide se renderiza teams ou companies
   * com base em scope.kind.
   */
  companies: CostCompanyRow[];
};

/**
 * Cost breakdown por time E por empresa para o escopo atual.
 *
 * queryKey: ['scope', scope.id, scope.kind, 'cost-breakdown']
 *
 * D-25 (Phase 1): chokepoint via useScopedQuery; teams filtrados por companyIds.
 * D-05 (Phase 4 LOCK): companies[] vem do fetch direto da tabela `companies`
 *                      filtrado por scope.companyIds — empresas com zero times
 *                      aparecem com totalCost=0, memberCount=0, avgCost=0.
 */
export function useCostBreakdown() {
  return useScopedQuery<CostBreakdown>(
    ['cost-breakdown'],
    async (companyIds) => {
      // ---------------------------------------------------------------
      // D-05 LOCK (P4-V04): seed do companyMap a partir da tabela
      // `companies` (NÃO da iteração de teams). Garante que toda empresa
      // do escopo apareça, mesmo as com zero times / zero colaboradores.
      // ---------------------------------------------------------------
      type CompanyAgg = {
        id: string;
        name: string;
        totalCost: number;
        userIds: Set<string>;
      };
      const companyMap = new Map<string, CompanyAgg>();

      if (companyIds.length) {
        const { data: companiesData, error: companiesError } = await supabase
          .from('companies')
          .select('id, name')
          .in('id', companyIds);

        if (companiesError) {
          throw handleSupabaseError(
            companiesError,
            'Falha ao carregar empresas do escopo',
            { silent: true },
          );
        }

        for (const c of companiesData ?? []) {
          // Sempre seed — mesmo que zero times referenciem essa empresa,
          // ela precisa aparecer no breakdown (D-05 LOCK).
          companyMap.set(c.id, {
            id: c.id,
            name: c.name,
            totalCost: 0,
            userIds: new Set<string>(),
          });
        }
      }

      // ---------------------------------------------------------------
      // Teams + members (lógica existente preservada; SELECT inclui
      // company_id para join com o companyMap já seedado).
      // ---------------------------------------------------------------
      let teamsQuery = supabase
        .from('teams')
        .select('id, name, company_id, company:companies(name)');
      if (companyIds.length) {
        teamsQuery = teamsQuery.in('company_id', companyIds) as typeof teamsQuery;
      }

      const [membersRes, teamsRes] = await Promise.all([
        supabase.from('team_members').select('user_id, team_id, cost'),
        teamsQuery,
      ]);

      if (membersRes.error) {
        throw handleSupabaseError(
          membersRes.error,
          'Falha ao carregar custos de membros',
          { silent: true },
        );
      }
      if (teamsRes.error) {
        throw handleSupabaseError(teamsRes.error, 'Falha ao carregar times', { silent: true });
      }

      const teamMap = new Map<
        string,
        { name: string; companyName: string | null; companyId: string | null }
      >();
      (teamsRes.data ?? []).forEach((t) => {
        const company = t.company as { name: string } | null;
        const companyId = (t as { company_id?: string | null }).company_id ?? null;
        teamMap.set(t.id, {
          name: t.name,
          companyName: company?.name ?? null,
          companyId,
        });
      });

      // Filtra members aos teams do escopo (mantém a semântica original).
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
        const teamEntry = aggregate.get(m.team_id) ?? { totalCost: 0, count: 0 };
        teamEntry.totalCost += safeCost;
        teamEntry.count += 1;
        aggregate.set(m.team_id, teamEntry);

        // Acumula no companyMap APENAS quando a empresa já foi seedada
        // (não cria novas entradas — empresas vazias já estão lá com zeros).
        const team = teamMap.get(m.team_id);
        const cId = team?.companyId ?? null;
        if (cId && companyMap.has(cId)) {
          const cEntry = companyMap.get(cId)!;
          cEntry.totalCost += safeCost;
          cEntry.userIds.add(m.user_id);
        }
      });

      const teamRows: CostTeamRow[] = [];
      for (const [teamId, { totalCost: teamCost, count }] of aggregate.entries()) {
        const team = teamMap.get(teamId);
        teamRows.push({
          teamId,
          teamName: team?.name ?? 'Time',
          companyName: team?.companyName ?? null,
          memberCount: count,
          totalCost: teamCost,
          avgCost: count ? teamCost / count : 0,
        });
      }
      teamRows.sort((a, b) => b.totalCost - a.totalCost);

      const companyRows: CostCompanyRow[] = [];
      for (const agg of companyMap.values()) {
        const memberCount = agg.userIds.size;
        companyRows.push({
          companyId: agg.id,
          companyName: agg.name,
          memberCount,
          totalCost: agg.totalCost,
          avgCost: memberCount ? agg.totalCost / memberCount : 0,
        });
      }
      companyRows.sort((a, b) => b.totalCost - a.totalCost);

      return {
        totalCost,
        totalMembers: uniqueMembers.size,
        teams: teamRows,
        companies: companyRows,
      };
    },
    { staleTime: 5 * 60 * 1000 },
  );
}
