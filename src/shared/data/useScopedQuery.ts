import {
  useQuery,
  type QueryKey,
  type UseQueryOptions,
} from '@tanstack/react-query';
import { useScope } from '@/app/providers/ScopeProvider';

/**
 * The chokepoint for ALL scope-aware data fetching. Every consumer hook
 * MUST call this instead of useQuery directly. The queryKey is prefixed
 * with ['scope', scope.id, scope.kind, ...] so that:
 *   - switching scope produces a NEW key (current data refetches)
 *   - the OLD scope's cache is preserved (D-04 — voltar é instantâneo)
 *   - invalidateQueries({ queryKey: ['scope', currentScopeId] }) hits
 *     only the current scope's cache (TEN-10 partial-key match)
 *
 * The fetcher receives `companyIds: string[]` — pass it to your
 * supabase.from().in('company_id', companyIds) query.
 *
 * RLS is the security boundary; this filtering is purely UX/perf.
 *
 * QUAL-07/08: this hook is the only allowed entry point for scoped data.
 * The ESLint rule no-supabase-from-outside-hooks blocks raw supabase.from
 * outside hooks/, so consumers can't smuggle scope-less queries.
 */
export function useScopedQuery<TData = unknown, TError = Error>(
  key: QueryKey,
  fn: (companyIds: string[]) => Promise<TData>,
  options?: Omit<
    UseQueryOptions<TData, TError, TData, QueryKey>,
    'queryKey' | 'queryFn'
  >,
) {
  const { scope, isResolving } = useScope();
  return useQuery<TData, TError>({
    queryKey: ['scope', scope?.id ?? '__none__', scope?.kind ?? '__none__', ...(key as unknown[])],
    queryFn: () => {
      if (!scope) return Promise.resolve([] as unknown as TData);
      return fn(scope.companyIds);
    },
    enabled: !!scope && !isResolving && (options?.enabled ?? true),
    ...options,
  });
}
