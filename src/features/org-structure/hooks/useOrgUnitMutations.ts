import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatSupabaseError } from '@/lib/supabaseError';
import { logger } from '@/lib/logger';

const orgUnitsKey = (companyId: string) =>
  ['scope', '__org__', companyId, 'org-units', companyId] as const;

export function useCreateOrgUnit(companyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; kind?: string | null; parent_id: string | null }) => {
      const { data, error } = await supabase
        .from('org_units')
        .insert({
          company_id: companyId,
          name: input.name,
          kind: input.kind ?? null,
          parent_id: input.parent_id,
          position: 0,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: orgUnitsKey(companyId) });
      toast.success('Unidade criada.');
    },
    onError: (err) => {
      logger.error('[org-structure] create failed', err);
      toast.error(formatSupabaseError(err));
    },
  });
}

export function useRenameOrgUnit(companyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; name: string; kind?: string | null }) => {
      const { error } = await supabase
        .from('org_units')
        .update({ name: input.name, kind: input.kind ?? null })
        .eq('id', input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: orgUnitsKey(companyId) });
    },
    onError: (err) => {
      logger.error('[org-structure] rename failed', err);
      toast.error(formatSupabaseError(err));
    },
  });
}

export function useDeleteOrgUnit(companyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('org_units').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: orgUnitsKey(companyId) });
      toast.success('Unidade removida.');
    },
    onError: (err) => {
      logger.error('[org-structure] delete failed', err);
      toast.error(formatSupabaseError(err));
    },
  });
}
