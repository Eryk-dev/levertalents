import type { Scope, ScopeKind } from '@/features/tenancy/types';

/**
 * Parse a scope token like "company:UUID" or "group:UUID" from the URL.
 * Returns null on any format violation. Pure — no React imports.
 */
export function parseScopeToken(
  token: string | null | undefined,
): { kind: ScopeKind; id: string } | null {
  if (!token) return null;
  const idx = token.indexOf(':');
  if (idx <= 0) return null;
  const kind = token.slice(0, idx);
  const id = token.slice(idx + 1);
  if ((kind !== 'company' && kind !== 'group') || !id) return null;
  // Loose UUID shape check (matches Supabase uuid format with hyphens; we
  // don't enforce strict v4 because internal/test uuids may differ).
  if (!/^[0-9a-fA-F-]{8,}$/.test(id)) return null;
  return { kind, id };
}

/**
 * Serialize a scope back to "kind:id" form for URL/localStorage.
 */
export function serializeScope(scope: Pick<Scope, 'kind' | 'id'>): string {
  return `${scope.kind}:${scope.id}`;
}
