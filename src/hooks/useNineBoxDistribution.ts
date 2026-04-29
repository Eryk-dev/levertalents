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
};

const ALL_CELLS: NineBoxCell[] = [
  'low-low', 'low-mid', 'low-high',
  'mid-low', 'mid-mid', 'mid-high',
  'high-low', 'high-mid', 'high-high',
];

function categorize(score: number): NineBoxAxis {
  if (score >= 4) return 'high';
  if (score >= 3) return 'mid';
  return 'low';
}

/**
 * Nine-box distribution for a team (by leaderId) or the full org scope.
 * queryKey: ['scope', scope.id, scope.kind, 'nine-box', nineBoxScope, leaderId]
 * D-25: useScopedQuery chokepoint; evaluations queried via cycle_id (post Phase 3 schema).
 */
export function useNineBoxDistribution(nineBoxScope: NineBoxScope, leaderId?: string | null) {
  return useScopedQuery<NineBoxDistribution>(
    ['nine-box', nineBoxScope, leaderId],
    async () => {
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

      const byCell = ALL_CELLS.reduce(
        (acc, cell) => { acc[cell] = []; return acc; },
        {} as Record<NineBoxCell, NineBoxUser[]>,
      );

      if (userIds.length === 0) return { users: [], byCell, totalEvaluated: 0 };

      // Post Phase 3: evaluations no longer have overall_score / leadership_score.
      // Nine-box uses responses JSONB — derive performance/potential from direction + responses.
      // For backward compat, query with cycle_id available; direction determines axis.
      const [evaluationsRes, profilesRes] = await Promise.all([
        supabase
          .from('evaluations')
          .select('evaluated_user_id, direction, responses, status')
          .in('evaluated_user_id', userIds)
          .eq('status', 'completed'),
        supabase.from('profiles').select('id, full_name, avatar_url').in('id', userIds),
      ]);

      if (evaluationsRes.error) throw handleSupabaseError(evaluationsRes.error, 'Falha ao carregar avaliações', { silent: true });
      if (profilesRes.error) throw handleSupabaseError(profilesRes.error, 'Falha ao carregar perfis', { silent: true });

      const evaluations = evaluationsRes.data ?? [];
      const profiles = profilesRes.data ?? [];

      const profileById = new Map<string, { full_name: string | null; avatar_url: string | null }>();
      profiles.forEach((p) => profileById.set(p.id, { full_name: p.full_name, avatar_url: p.avatar_url }));

      // Aggregate: leader_to_member direction → performance; member_to_leader → potential
      const scoresByUser = new Map<string, { perf: number[]; pot: number[] }>();
      for (const e of evaluations) {
        if (!e.evaluated_user_id) continue;
        const responses = (e.responses ?? {}) as Record<string, unknown>;
        // Extract avg score from responses values (numeric entries)
        const scores = Object.values(responses)
          .filter((v): v is number => typeof v === 'number')
          .filter((v) => v > 0);
        const avg = scores.length ? scores.reduce((s, v) => s + v, 0) / scores.length : 0;
        if (avg <= 0) continue;

        const entry = scoresByUser.get(e.evaluated_user_id) ?? { perf: [], pot: [] };
        if (e.direction === 'leader_to_member') {
          entry.perf.push(avg);
        } else {
          entry.pot.push(avg);
        }
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
          fullName: profile?.full_name ?? 'Sem nome',
          avatarUrl: profile?.avatar_url ?? null,
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
    {
      enabled: nineBoxScope === 'org' || !!leaderId,
      staleTime: 5 * 60 * 1000,
    },
  );
}
