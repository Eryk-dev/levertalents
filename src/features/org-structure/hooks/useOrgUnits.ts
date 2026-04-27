import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface OrgUnitNode {
  id: string;
  company_id: string;
  parent_id: string | null;
  name: string;
  kind: string | null;
  position: number;
}

/**
 * Fetch all org_units for a company (RLS filters by visible_org_units).
 * Returns flat list — caller composes the tree.
 *
 * Note: this hook is intentionally NOT routed through useScopedQuery because
 * the structure UI is per-company (the URL provides `:companyId`, not the
 * active scope). The explicit prefix `['scope', '__org__', companyId, ...]`
 * keeps it isolated from scope-cache invalidation.
 *
 * ORG-08.
 */
export function useOrgUnits(companyId: string | undefined) {
  return useQuery<OrgUnitNode[]>({
    queryKey: ['scope', '__org__', companyId ?? 'none', 'org-units', companyId ?? 'none'],
    enabled: !!companyId,
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('org_units')
        .select('id, company_id, parent_id, name, kind, position')
        .eq('company_id', companyId)
        .order('position', { ascending: true })
        .order('name', { ascending: true });
      if (error) throw error;
      return (data ?? []) as OrgUnitNode[];
    },
  });
}
