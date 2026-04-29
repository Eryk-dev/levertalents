import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CompanyPerson {
  id: string;
  full_name: string;
  avatar_url: string | null;
}

/**
 * Lists distinct people linked to a company through any org_unit_member row.
 * Used by selectors that need a people pool scoped to a single company
 * (e.g. cycle audience picker).
 */
export function useCompanyPeople(companyId: string | undefined) {
  return useQuery<CompanyPerson[]>({
    queryKey: ['scope', '__org__', companyId ?? 'none', 'company-people'],
    enabled: !!companyId,
    queryFn: async () => {
      if (!companyId) return [];
      const { data: units, error: unitsError } = await supabase
        .from('org_units')
        .select('id')
        .eq('company_id', companyId);
      if (unitsError) throw unitsError;
      const unitIds = (units ?? []).map((u) => u.id);
      if (unitIds.length === 0) return [];

      const { data: members, error: memError } = await supabase
        .from('org_unit_members')
        .select('user_id')
        .in('org_unit_id', unitIds);
      if (memError) throw memError;
      const userIds = Array.from(new Set((members ?? []).map((m) => m.user_id)));
      if (userIds.length === 0) return [];

      const { data: profiles, error: profErr } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds)
        .order('full_name', { ascending: true });
      if (profErr) throw profErr;
      return (profiles ?? []) as CompanyPerson[];
    },
  });
}
