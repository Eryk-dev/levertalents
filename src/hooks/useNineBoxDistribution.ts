import { useScopedQuery } from '@/shared/data/useScopedQuery';
import { supabase } from '@/integrations/supabase/client';
import { handleSupabaseError } from '@/lib/supabaseError';

export type NineBoxAxis = 'low' | 'mid' | 'high';
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

export type NineBoxScope = 'team' | 'org';

export type NineBoxDistribution = {
  users: NineBoxUser[];
  byCell: Record<NineBoxCell, NineBoxUser[]>;
  totalEvaluated: number;
  cycleId: string | null;
  cycleName: string | null;
};

const ALL_CELLS: NineBoxCell[] = [
  'low-low', 'low-mid', 'low-high',
  'mid-low', 'mid-mid', 'mid-high',
  'high-low', 'high-mid', 'high-high',
];

// 9box uses scale 1-3 — threshold maps to NineBoxAxis directly.
function categorize1to3(score: number): NineBoxAxis {
  if (score >= 2.5) return 'high';
  if (score >= 1.5) return 'mid';
  return 'low';
}

function emptyByCell(): Record<NineBoxCell, NineBoxUser[]> {
  return ALL_CELLS.reduce(
    (acc, cell) => { acc[cell] = []; return acc; },
    {} as Record<NineBoxCell, NineBoxUser[]>,
  );
}

/**
 * Nine-box distribution backed by 9box-kind cycles only.
 *
 * Matrix scoring contract (NINE.1 schema):
 *   - cycle.kind = 'nine_box'
 *   - direction = 'leader_to_member' (the leader's official rating; auto-assessment is anexa)
 *   - status = 'completed'
 *   - responses.performance ∈ [1,3]  → x-axis
 *   - responses.potential   ∈ [1,3]  → y-axis
 *
 * If no 9box cycle exists in scope, returns empty distribution and the matrix
 * shows the "em construção" empty state.
 *
 * queryKey: ['scope', scope.id, scope.kind, 'nine-box', nineBoxScope, leaderId, cycleId]
 */
export function useNineBoxDistribution(
  nineBoxScope: NineBoxScope,
  leaderId?: string | null,
  cycleId?: string | null,
) {
  return useScopedQuery<NineBoxDistribution>(
    ['nine-box', nineBoxScope, leaderId ?? null, cycleId ?? null],
    async (companyIds) => {
      const empty: NineBoxDistribution = {
        users: [],
        byCell: emptyByCell(),
        totalEvaluated: 0,
        cycleId: null,
        cycleName: null,
      };

      if (!companyIds.length) return empty;

      // 1) Resolve which cycle to read from.
      let resolvedCycleId = cycleId ?? null;
      let resolvedCycleName: string | null = null;
      if (resolvedCycleId) {
        const { data, error } = await supabase
          .from('evaluation_cycles')
          .select('id, name')
          .eq('id', resolvedCycleId)
          .maybeSingle();
        if (error) throw handleSupabaseError(error, 'Falha ao carregar ciclo 9box', { silent: true });
        resolvedCycleName = data?.name ?? null;
      } else {
        const { data, error } = await (
          supabase
            .from('evaluation_cycles')
            .select('id, name, created_at')
            .in('company_id', companyIds)
            // kind column added by migration NINE.1; cast keeps typescript quiet
            .eq('kind' as 'name', 'nine_box' as unknown as string)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()
        );
        if (error) throw handleSupabaseError(error, 'Falha ao carregar ciclos 9box', { silent: true });
        resolvedCycleId = data?.id ?? null;
        resolvedCycleName = data?.name ?? null;
      }

      if (!resolvedCycleId) return empty;

      // 2) Resolve user audience.
      let userIds: string[] = [];
      if (nineBoxScope === 'team' && leaderId) {
        const { data: ledUnits, error: ledUnitsError } = await supabase
          .from('unit_leaders')
          .select('org_unit_id')
          .eq('user_id', leaderId);
        if (ledUnitsError) throw handleSupabaseError(ledUnitsError, 'Falha ao carregar time', { silent: true });
        const orgUnitIds = (ledUnits ?? []).map((u) => u.org_unit_id);
        if (orgUnitIds.length) {
          const { data: members, error: membersError } = await supabase
            .from('org_unit_members')
            .select('user_id')
            .in('org_unit_id', orgUnitIds);
          if (membersError) throw handleSupabaseError(membersError, 'Falha ao carregar time', { silent: true });
          userIds = [...new Set((members ?? []).map((m) => m.user_id))];
        }
      } else if (nineBoxScope === 'org') {
        const { data: members, error: membersError } = await supabase
          .from('org_unit_members')
          .select('user_id');
        if (membersError) throw handleSupabaseError(membersError, 'Falha ao carregar time', { silent: true });
        userIds = [...new Set((members ?? []).map((m) => m.user_id))];
      }

      const result: NineBoxDistribution = {
        users: [],
        byCell: emptyByCell(),
        totalEvaluated: 0,
        cycleId: resolvedCycleId,
        cycleName: resolvedCycleName,
      };

      if (userIds.length === 0) return result;

      // 3) Fetch leader-to-member evaluations for the cycle + profiles in parallel.
      const [evaluationsRes, profilesRes] = await Promise.all([
        supabase
          .from('evaluations')
          .select('evaluated_user_id, responses, status')
          .eq('cycle_id', resolvedCycleId)
          .eq('direction', 'leader_to_member')
          .eq('status', 'completed')
          .in('evaluated_user_id', userIds),
        supabase.from('profiles').select('id, full_name, avatar_url').in('id', userIds),
      ]);

      if (evaluationsRes.error) throw handleSupabaseError(evaluationsRes.error, 'Falha ao carregar avaliações', { silent: true });
      if (profilesRes.error) throw handleSupabaseError(profilesRes.error, 'Falha ao carregar perfis', { silent: true });

      const evaluations = evaluationsRes.data ?? [];
      const profiles = profilesRes.data ?? [];

      const profileById = new Map<string, { full_name: string | null; avatar_url: string | null }>();
      profiles.forEach((p) => profileById.set(p.id, { full_name: p.full_name, avatar_url: p.avatar_url }));

      // 4) Group by evaluated_user_id; defensive avg if multiple leaders evaluated same person.
      const scoresByUser = new Map<string, { perf: number[]; pot: number[] }>();
      for (const e of evaluations) {
        if (!e.evaluated_user_id) continue;
        const responses = (e.responses ?? {}) as Record<string, unknown>;
        const perf = typeof responses.performance === 'number' ? responses.performance : null;
        const pot = typeof responses.potential === 'number' ? responses.potential : null;
        if (perf == null || pot == null) continue;
        const entry = scoresByUser.get(e.evaluated_user_id) ?? { perf: [], pot: [] };
        entry.perf.push(perf);
        entry.pot.push(pot);
        scoresByUser.set(e.evaluated_user_id, entry);
      }

      for (const [userId, { perf, pot }] of scoresByUser.entries()) {
        if (perf.length === 0 || pot.length === 0) continue;
        const avgPerf = perf.reduce((s, v) => s + v, 0) / perf.length;
        const avgPot = pot.reduce((s, v) => s + v, 0) / pot.length;
        const profile = profileById.get(userId);
        const performanceCat = categorize1to3(avgPerf);
        const potentialCat = categorize1to3(avgPot);
        const cell = `${performanceCat}-${potentialCat}` as NineBoxCell;
        const u: NineBoxUser = {
          userId,
          fullName: profile?.full_name ?? 'Sem nome',
          avatarUrl: profile?.avatar_url ?? null,
          performance: avgPerf,
          potential: avgPot,
          performanceCat,
          potentialCat,
          cell,
        };
        result.users.push(u);
        result.byCell[cell].push(u);
      }
      result.totalEvaluated = result.users.length;

      return result;
    },
    {
      enabled: nineBoxScope === 'org' || !!leaderId,
      staleTime: 5 * 60 * 1000,
    },
  );
}

/**
 * Lists 9box cycles in the current scope (selector for NineBoxPage).
 * queryKey: ['scope', scope.id, scope.kind, 'nine-box-cycles']
 */
export function useNineBoxCycles() {
  return useScopedQuery<Array<{ id: string; name: string; status: string; created_at: string }>>(
    ['nine-box-cycles'],
    async (companyIds) => {
      if (!companyIds.length) return [];
      const { data, error } = await (
        supabase
          .from('evaluation_cycles')
          .select('id, name, status, created_at')
          .in('company_id', companyIds)
          .eq('kind' as 'name', 'nine_box' as unknown as string)
          .order('created_at', { ascending: false })
      );
      if (error) throw handleSupabaseError(error, 'Falha ao carregar ciclos 9box', { silent: true });
      return (data ?? []).map((d) => ({
        id: d.id as string,
        name: d.name as string,
        status: d.status as string,
        created_at: d.created_at as string,
      }));
    },
    { staleTime: 60 * 1000 },
  );
}
