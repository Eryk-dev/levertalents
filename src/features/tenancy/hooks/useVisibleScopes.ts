import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import type {
  VisibleCompanySummary,
  VisibleGroupSummary,
} from '@/features/tenancy/types';

/**
 * Fetches the empresas and grupos the current user can see (RLS-filtered
 * server-side via visible_companies). Returns lists for the dropdown panel
 * and for resolveScope() validation.
 *
 * Note: this hook lives in src/features/tenancy/hooks/ which is on the
 * QUAL-07 ESLint allowlist for direct supabase.from() calls. Plan 07's
 * ESLint rule allows hooks/ paths.
 */
export function useVisibleScopes() {
  const { user, loading: authLoading } = useAuth();
  const [companies, setCompanies] = useState<VisibleCompanySummary[]>([]);
  const [groups, setGroups] = useState<VisibleGroupSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (authLoading || !user?.id) {
      setIsLoading(true);
      return;
    }
    let aborted = false;
    setIsLoading(true);
    setError(null);

    (async () => {
      try {
        const [cRes, gRes] = await Promise.all([
          supabase
            .from('companies')
            .select('id, name')
            .order('name', { ascending: true }),
          supabase
            .from('company_groups')
            .select('id, name, slug, companies:companies(id)')
            .order('name', { ascending: true }),
        ]);
        if (cRes.error) throw cRes.error;
        if (gRes.error) throw gRes.error;
        if (aborted) return;

        setCompanies(
          (cRes.data ?? []).map((c) => ({ id: c.id, name: c.name })),
        );
        setGroups(
          (gRes.data ?? []).map((g) => ({
            id: g.id,
            name: g.name,
            companyIds: ((g.companies ?? []) as Array<{ id: string }>).map(
              (c) => c.id,
            ),
          })),
        );
      } catch (err) {
        if (!aborted) setError(err as Error);
      } finally {
        if (!aborted) setIsLoading(false);
      }
    })();

    return () => {
      aborted = true;
    };
  }, [user?.id, authLoading]);

  return { companies, groups, isLoading, error };
}
