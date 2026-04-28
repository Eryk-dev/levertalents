/**
 * D-25 / Pitfall §11: queryKey shape lock para useScopedQuery.
 *
 * Format: ['scope', scope.id, ...rest]
 *   - 'scope' literal first segment (debugging clarity)
 *   - scope.id (company UUID or group UUID) for invalidation on scope change
 *   - ...rest (entity name + filters) for sub-cache routing
 *
 * Use in every Performance hook: queryKey: scopeKey(scope, 'evaluations', cycleId)
 */

export type ScopeContext = { id: string };

export function scopeKey(scope: ScopeContext, ...rest: readonly unknown[]): readonly unknown[] {
  return ['scope', scope.id, ...rest] as const;
}
