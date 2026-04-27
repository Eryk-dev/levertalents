import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useScope } from '@/app/providers/ScopeProvider';

/**
 * Foundation for scope-aware Supabase Realtime channels.
 * Phase 1 ships the chokepoint; Phase 2-3 wires consumers (e.g.,
 * the kanban realtime subscription).
 *
 * Pattern:
 *   useScopedRealtime('hiring:applications', (channel) => {
 *     channel.on('postgres_changes', {
 *       event: '*', schema: 'public', table: 'applications',
 *       filter: `company_id=in.(${scopedCompanyIds.join(',')})`,
 *     }, handler);
 *   });
 */
export function useScopedRealtime(
  topic: string,
  configure: (
    channel: ReturnType<typeof supabase.channel>,
    companyIds: string[],
  ) => void,
) {
  const { scope } = useScope();

  useEffect(() => {
    if (!scope) return;
    const channelName = `scope-${scope.id}-${topic}`;
    const channel = supabase.channel(channelName);
    configure(channel, scope.companyIds);
    channel.subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope?.id, topic]);
}
