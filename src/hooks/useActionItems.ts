import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ActionItem {
  id: string;
  one_on_one_id: string;
  description: string;
  assigned_to: string;
  due_date: string | null;
  status: 'pending' | 'in_progress' | 'completed';
  notes: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  assignee?: { id: string; full_name: string; avatar_url: string | null };
}

export const useActionItems = (oneOnOneId?: string) => {
  const queryClient = useQueryClient();

  const { data: actionItems, isLoading } = useQuery({
    queryKey: ["action_items", oneOnOneId],
    queryFn: async () => {
      let query = supabase
        .from("one_on_one_action_items")
        .select(`
          *,
          assignee:profiles!one_on_one_action_items_assigned_to_fkey(id, full_name, avatar_url)
        `)
        .order("created_at", { ascending: false });

      if (oneOnOneId) {
        query = query.eq("one_on_one_id", oneOnOneId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as ActionItem[];
    },
    enabled: !!oneOnOneId,
  });

  const createActionItem = useMutation({
    mutationFn: async (input: {
      one_on_one_id: string;
      description: string;
      assigned_to: string;
      due_date?: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from("one_on_one_action_items")
        .insert([input])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["action_items"] });
      toast.success("Action item criado com sucesso!");
    },
    onError: (error: any) => {
      toast.error(`Erro ao criar action item: ${error.message}`);
    },
  });

  const updateActionItem = useMutation({
    mutationFn: async ({ 
      id, 
      input 
    }: { 
      id: string; 
      input: Partial<ActionItem> 
    }) => {
      const updateData: any = { ...input };
      
      // If marking as completed, set completed_at
      if (input.status === 'completed' && !input.completed_at) {
        updateData.completed_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from("one_on_one_action_items")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["action_items"] });
      toast.success("Action item atualizado com sucesso!");
    },
    onError: (error: any) => {
      toast.error(`Erro ao atualizar action item: ${error.message}`);
    },
  });

  return { 
    actionItems: actionItems || [], 
    isLoading, 
    createActionItem: createActionItem.mutate, 
    updateActionItem: updateActionItem.mutate,
    isCreating: createActionItem.isPending,
    isUpdating: updateActionItem.isPending,
  };
};
