import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useScopedQuery } from '@/shared/data/useScopedQuery';
import { useScope } from '@/app/providers/ScopeProvider';
import type { Database, Json } from '@/integrations/supabase/types';

type OneOnOneRow = Database['public']['Tables']['one_on_ones']['Row'];

type ProfileLite = { id: string; full_name: string | null; avatar_url: string | null };

export type OneOnOne = Omit<OneOnOneRow, 'meeting_structure'> & {
  meeting_structure?:
    | (Record<string, unknown> & { transcricao?: string; resumo?: string })
    | null;
  leader?: ProfileLite | null;
  collaborator?: ProfileLite | null;
};

export interface OneOnOneFilters {
  leaderId?: string;
  collaboratorId?: string;
  status?: 'scheduled' | 'in-progress' | 'completed' | 'processing';
  fromDate?: string; // ISO
  toDate?: string;
}

/**
 * Lists 1:1s filtered by optional leaderId/collaboratorId/status/date range.
 * queryKey: ['scope', scope.id, scope.kind, 'one_on_ones', filters]
 * D-25: useScopedQuery chokepoint + company_id filter (defense-in-depth over RLS).
 * D-14: meeting_structure JSONB includes transcricao_plaud + resumo_plaud fields.
 */
export function useOneOnOnes(filters: OneOnOneFilters = {}) {
  return useScopedQuery<OneOnOne[]>(
    ['one_on_ones', filters],
    async (companyIds) => {
      if (!companyIds.length) return [] as OneOnOne[];
      let q = supabase
        .from('one_on_ones')
        .select(`
          *,
          leader:profiles!one_on_ones_leader_id_fkey(id, full_name, avatar_url),
          collaborator:profiles!one_on_ones_collaborator_id_fkey(id, full_name, avatar_url)
        `)
        .in('company_id', companyIds)
        .order('scheduled_date', { ascending: false });
      if (filters.leaderId)       q = q.eq('leader_id', filters.leaderId);
      if (filters.collaboratorId) q = q.eq('collaborator_id', filters.collaboratorId);
      if (filters.status)         q = q.eq('status', filters.status);
      if (filters.fromDate)       q = q.gte('scheduled_date', filters.fromDate);
      if (filters.toDate)         q = q.lte('scheduled_date', filters.toDate);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as OneOnOne[];
    },
  );
}

export interface CreateOneOnOneInput {
  collaborator_id: string;
  company_id: string;
  scheduled_date: string;
  duration_minutes?: number;
  agenda?: string;
}

export function useCreateOneOnOne() {
  const queryClient = useQueryClient();
  const { scope } = useScope();
  return useMutation({
    mutationFn: async (input: CreateOneOnOneInput): Promise<OneOnOneRow> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');
      const { data, error } = await supabase
        .from('one_on_ones')
        .insert({
          leader_id: user.id,
          collaborator_id: input.collaborator_id,
          company_id: input.company_id,
          scheduled_date: input.scheduled_date,
          duration_minutes: input.duration_minutes ?? 60,
          agenda: input.agenda ?? null,
          status: 'scheduled',
        })
        .select()
        .single();
      if (error) throw error;
      return data as OneOnOneRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [
          'scope',
          scope?.id ?? '__none__',
          scope?.kind ?? '__none__',
          'one_on_ones',
        ],
      });
    },
  });
}

/**
 * D-12: Update includes meeting_structure JSONB which accepts
 * { transcricao_plaud, resumo_plaud, agenda_items, action_items }.
 */
export interface UpdateOneOnOneInput {
  id: string;
  meeting_structure?: Record<string, unknown>; // Plaud fields + agenda_items + action_items
  status?: 'scheduled' | 'in-progress' | 'completed' | 'processing';
  notes?: string;
  leader_feedback?: string;
  collaborator_feedback?: string;
}

export function useUpdateOneOnOne() {
  const queryClient = useQueryClient();
  const { scope } = useScope();
  return useMutation({
    mutationFn: async (input: UpdateOneOnOneInput): Promise<OneOnOneRow> => {
      const update: Database['public']['Tables']['one_on_ones']['Update'] = {
        updated_at: new Date().toISOString(),
      };
      if (input.meeting_structure !== undefined) update.meeting_structure = input.meeting_structure as Json;
      if (input.status !== undefined) update.status = input.status;
      if (input.notes !== undefined) update.notes = input.notes;
      if (input.leader_feedback !== undefined) update.leader_feedback = input.leader_feedback;
      if (input.collaborator_feedback !== undefined) update.collaborator_feedback = input.collaborator_feedback;

      const { data, error } = await supabase
        .from('one_on_ones')
        .update(update)
        .eq('id', input.id)
        .select()
        .single();
      if (error) throw error;
      return data as OneOnOneRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [
          'scope',
          scope?.id ?? '__none__',
          scope?.kind ?? '__none__',
          'one_on_ones',
        ],
      });
    },
  });
}

export function useDeleteOneOnOne() {
  const queryClient = useQueryClient();
  const { scope } = useScope();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase
        .from('one_on_ones')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [
          'scope',
          scope?.id ?? '__none__',
          scope?.kind ?? '__none__',
          'one_on_ones',
        ],
      });
    },
  });
}
