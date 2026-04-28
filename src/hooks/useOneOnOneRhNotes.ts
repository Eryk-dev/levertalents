import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useScope } from '@/app/providers/ScopeProvider';
import type { Database } from '@/integrations/supabase/types';

type RhNoteRow = Database['public']['Tables']['one_on_one_rh_notes']['Row'];

/**
 * Pitfall §5: RH notes live in a SEPARATE table `one_on_one_rh_notes` so that
 * RLS can enforce admin/rh-only access without touching one_on_ones itself.
 * T-3-RHNOTE-01: liderado and líder receive 0 rows from RLS; UI renders nothing.
 *
 * queryKey: ['scope', scope.id, scope.kind, 'one_on_one_rh_notes', meetingId]
 */
export function useOneOnOneRhNotes(meetingId: string | null) {
  const { scope } = useScope();
  return useQuery({
    queryKey: [
      'scope',
      scope?.id ?? '__none__',
      scope?.kind ?? '__none__',
      'one_on_one_rh_notes',
      meetingId,
    ],
    queryFn: async (): Promise<RhNoteRow | null> => {
      if (!meetingId) return null;
      const { data, error } = await supabase
        .from('one_on_one_rh_notes')
        .select('*')
        .eq('meeting_id', meetingId)
        .maybeSingle();
      // RLS: liderado/líder receive 0 rows; admin/rh see actual data
      if (error) throw error;
      return data as RhNoteRow | null;
    },
    enabled: meetingId != null,
  });
}

export function useUpsertOneOnOneRhNote() {
  const queryClient = useQueryClient();
  const { scope } = useScope();
  return useMutation({
    mutationFn: async (input: {
      meeting_id: string;
      notes: string | null;
    }): Promise<RhNoteRow> => {
      const { data: { user } } = await supabase.auth.getUser();
      const updated_by = user?.id ?? null;
      const { data, error } = await supabase
        .from('one_on_one_rh_notes')
        .upsert(
          {
            meeting_id: input.meeting_id,
            notes: input.notes,
            updated_by,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'meeting_id' },
        )
        .select()
        .single();
      if (error) throw error;
      return data as RhNoteRow;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: [
          'scope',
          scope?.id ?? '__none__',
          scope?.kind ?? '__none__',
          'one_on_one_rh_notes',
          data.meeting_id,
        ],
      });
    },
  });
}
