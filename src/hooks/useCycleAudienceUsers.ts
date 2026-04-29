import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type CycleRow = Database['public']['Tables']['evaluation_cycles']['Row'];

export interface AudienceUser {
  id: string;
  full_name: string;
  avatar_url: string | null;
}

/**
 * Resolves a cycle's audience (company / org_unit / manual) into a flat
 * list of profiles, applying include_descendants when needed.
 */
export function useCycleAudienceUsers(cycle: CycleRow | null) {
  return useQuery<AudienceUser[]>({
    queryKey: [
      'cycle-audience-users',
      cycle?.id,
      cycle?.audience_kind,
      cycle?.audience_ids?.join(','),
      cycle?.include_descendants,
    ],
    enabled: !!cycle,
    queryFn: async () => {
      if (!cycle) return [];

      let userIds: string[] = [];

      if (cycle.audience_kind === 'manual') {
        userIds = cycle.audience_ids ?? [];
      } else if (cycle.audience_kind === 'company') {
        const { data: units, error: uErr } = await supabase
          .from('org_units')
          .select('id')
          .eq('company_id', cycle.company_id);
        if (uErr) throw uErr;
        const unitIds = (units ?? []).map((u) => u.id);
        if (unitIds.length === 0) return [];
        const { data: members, error: mErr } = await supabase
          .from('org_unit_members')
          .select('user_id')
          .in('org_unit_id', unitIds);
        if (mErr) throw mErr;
        userIds = Array.from(new Set((members ?? []).map((m) => m.user_id)));
      } else if (cycle.audience_kind === 'org_unit') {
        let unitIds = cycle.audience_ids ?? [];
        if (cycle.include_descendants && unitIds.length > 0) {
          const expanded = await Promise.all(
            unitIds.map((id) =>
              supabase.rpc('org_unit_descendants', { _unit_id: id }).then((r) => r.data ?? []),
            ),
          );
          const set = new Set<string>(unitIds);
          for (const arr of expanded) for (const id of arr) set.add(id);
          unitIds = Array.from(set);
        }
        if (unitIds.length === 0) return [];
        const { data: members, error: mErr } = await supabase
          .from('org_unit_members')
          .select('user_id')
          .in('org_unit_id', unitIds);
        if (mErr) throw mErr;
        userIds = Array.from(new Set((members ?? []).map((m) => m.user_id)));
      }

      if (userIds.length === 0) return [];

      const { data: profiles, error: pErr } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds)
        .order('full_name', { ascending: true });
      if (pErr) throw pErr;
      return (profiles ?? []) as AudienceUser[];
    },
  });
}
