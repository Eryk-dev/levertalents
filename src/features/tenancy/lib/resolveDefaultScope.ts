import { supabase } from '@/integrations/supabase/client';
import { parseScopeToken } from './scopeKey';
import type { ScopeKind } from '@/features/tenancy/types';

/**
 * Calls the public.resolve_default_scope(uid) RPC. Returns the parsed
 * scope hint or null if the user has no default (e.g., sócio sem
 * empresa atribuída — D-09 empty state).
 */
export async function fetchDefaultScope(
  uid: string,
): Promise<{ kind: ScopeKind; id: string } | null> {
  const { data, error } = await supabase.rpc('resolve_default_scope', { _uid: uid });
  if (error) {
    // Don't crash the app on RPC failure — return null and let provider
    // surface the empty state. PII discipline: do not log uid.
    return null;
  }
  return parseScopeToken(typeof data === 'string' ? data : null);
}
