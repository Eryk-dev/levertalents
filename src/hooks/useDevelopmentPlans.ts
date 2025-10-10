import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface DevelopmentPlan {
  id: string;
  user_id: string;
  one_on_one_id?: string | null;
  title: string;
  description: string;
  development_area: string;
  goals: string;
  action_items: string;
  timeline: string;
  main_objective?: string;
  committed_actions?: string;
  required_support?: string;
  success_metrics?: string;
  anticipated_challenges?: string;
  deadline?: string;
  status: 'pending_approval' | 'approved' | 'in_progress' | 'completed' | 'cancelled';
  progress_percentage: number;
  approved_by: string | null;
  approved_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  user?: { id: string; full_name: string; avatar_url: string | null };
  approver?: { id: string; full_name: string; avatar_url: string | null };
}

export const useDevelopmentPlans = () => {
  const queryClient = useQueryClient();

  const { data: plans, isLoading } = useQuery({
    queryKey: ["development_plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("development_plans")
        .select(`
          *,
          user:profiles!development_plans_user_id_fkey(id, full_name, avatar_url),
          approver:profiles!development_plans_approved_by_fkey(id, full_name, avatar_url)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as DevelopmentPlan[];
    },
  });

  const createPlan = useMutation({
    mutationFn: async (input: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("development_plans")
        .insert([{ ...input, user_id: user.id }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["development_plans"] });
      toast.success("PDI criado com sucesso!");
    },
    onError: (error) => {
      toast.error(`Erro ao criar PDI: ${error.message}`);
    },
  });

  const updatePlan = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<DevelopmentPlan> }) => {
      const { data, error } = await supabase
        .from("development_plans")
        .update(input)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["development_plans"] });
      toast.success("PDI atualizado com sucesso!");
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar PDI: ${error.message}`);
    },
  });

  const deletePlan = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("development_plans")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["development_plans"] });
      toast.success("PDI excluído com sucesso!");
    },
    onError: (error) => {
      toast.error(`Erro ao excluir PDI: ${error.message}`);
    },
  });

  return { 
    plans: plans || [], 
    isLoading, 
    createPlan: createPlan.mutate, 
    updatePlan: updatePlan.mutate,
    deletePlan: deletePlan.mutate
  };
};
