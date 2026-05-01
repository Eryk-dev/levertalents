import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useScopedQuery } from '@/shared/data/useScopedQuery';
import { useScope } from '@/app/providers/ScopeProvider';
import type { Database } from '@/integrations/supabase/types';
import type { Json } from '@/integrations/supabase/types';

type TemplateRow = Database['public']['Tables']['evaluation_templates']['Row'];
type TemplateInsert = Database['public']['Tables']['evaluation_templates']['Insert'];

/**
 * Template schema shape (D-07):
 * { version: 1, sections: [{ id, title, weight, questions: [{ id, label, type, required, options? }] }] }
 */
export type TemplateSnapshot = {
  version: number;
  sections: Array<{
    id: string;
    title: string;
    weight?: number;
    questions: Array<{
      id: string;
      label: string;
      type: 'scale_1_5' | 'scale_1_3' | 'text' | 'choice';
      required: boolean;
      options?: string[];
    }>;
  }>;
};

export interface CreateTemplateInput {
  company_id: string;
  name: string;
  schema_json: TemplateSnapshot;
  is_default?: boolean;
}

/**
 * Lists evaluation templates visible in the current scope.
 * queryKey: ['scope', scope.id, scope.kind, 'evaluation_templates']
 * D-25/D-26: useScopedQuery chokepoint; is_default sorted first.
 */
export function useEvaluationTemplates() {
  return useScopedQuery<TemplateRow[]>(
    ['evaluation_templates'],
    async (companyIds) => {
      if (!companyIds.length) return [] as TemplateRow[];
      const { data, error } = await supabase
        .from('evaluation_templates')
        .select('*')
        .in('company_id', companyIds)
        .order('is_default', { ascending: false });
      if (error) throw error;
      return (data ?? []) as TemplateRow[];
    },
  );
}

export function useCreateTemplate() {
  const queryClient = useQueryClient();
  const { scope } = useScope();
  return useMutation({
    mutationFn: async (input: CreateTemplateInput): Promise<TemplateRow> => {
      const insert: TemplateInsert = {
        company_id: input.company_id,
        name: input.name,
        schema_json: input.schema_json as Json,
        is_default: input.is_default ?? false,
      };
      const { data, error } = await supabase
        .from('evaluation_templates')
        .insert(insert)
        .select()
        .single();
      if (error) throw error;
      return data as TemplateRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [
          'scope',
          scope?.id ?? '__none__',
          scope?.kind ?? '__none__',
          'evaluation_templates',
        ],
      });
    },
  });
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient();
  const { scope } = useScope();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase
        .from('evaluation_templates')
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
          'evaluation_templates',
        ],
      });
    },
  });
}

export function useUpdateTemplate() {
  const queryClient = useQueryClient();
  const { scope } = useScope();
  return useMutation({
    mutationFn: async (vars: {
      id: string;
      name?: string;
      schema_json?: TemplateSnapshot;
      is_default?: boolean;
    }): Promise<TemplateRow> => {
      const { id, ...rest } = vars;
      const update: Database['public']['Tables']['evaluation_templates']['Update'] = {
        ...(rest.name !== undefined && { name: rest.name }),
        ...(rest.schema_json !== undefined && { schema_json: rest.schema_json as Json }),
        ...(rest.is_default !== undefined && { is_default: rest.is_default }),
      };
      const { data, error } = await supabase
        .from('evaluation_templates')
        .update(update)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as TemplateRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [
          'scope',
          scope?.id ?? '__none__',
          scope?.kind ?? '__none__',
          'evaluation_templates',
        ],
      });
    },
  });
}
