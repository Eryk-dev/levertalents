import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DevelopmentPlan } from "./useDevelopmentPlans";

export interface PDIFormData {
  main_objective: string;
  committed_actions: string;
  required_support: string;
  success_metrics: string;
  anticipated_challenges: string;
  deadline: string;
}

// Hook standalone: busca PDI vinculado a um 1:1 específico.
// Tem que ser chamado no top-level do componente — não dentro de loops/condicionais.
export const usePDIForOneOnOne = (oneOnOneId: string | undefined) => {
  return useQuery({
    queryKey: ["pdi_from_one_on_one", oneOnOneId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("development_plans")
        .select("*")
        .eq("one_on_one_id", oneOnOneId!)
        .maybeSingle();

      if (error) throw error;
      return data as DevelopmentPlan | null;
    },
    enabled: !!oneOnOneId,
  });
};

// Hook standalone: busca o PDI mais recente de um colaborador.
export const useLatestPDIForCollaborator = (collaboratorId: string | undefined) => {
  return useQuery({
    queryKey: ["latest_pdi", collaboratorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("development_plans")
        .select(`
          *,
          user:profiles!development_plans_user_id_fkey(id, full_name, avatar_url)
        `)
        .eq("user_id", collaboratorId!)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as DevelopmentPlan | null;
    },
    enabled: !!collaboratorId,
  });
};

export const usePDIIntegrated = () => {
  const queryClient = useQueryClient();

  // Lista flat de PDIs ligados a 1:1s — serve para check de existência em loops
  // (hasPDIForOneOnOne) sem precisar invocar um hook por item.
  const { data: allPDIs } = useQuery({
    queryKey: ["all_pdis_for_one_on_ones"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("development_plans")
        .select("id, one_on_one_id")
        .not("one_on_one_id", "is", null);

      if (error) throw error;
      return data || [];
    },
  });

  const hasPDIForOneOnOne = (oneOnOneId: string): boolean => {
    return allPDIs?.some(pdi => pdi.one_on_one_id === oneOnOneId) || false;
  };

  const createPDIFromOneOnOne = useMutation({
    mutationFn: async ({
      oneOnOneId,
      collaboratorId,
      data
    }: {
      oneOnOneId: string;
      collaboratorId: string;
      data: PDIFormData
    }) => {
      const { data: pdi, error } = await supabase
        .from("development_plans")
        .insert([{
          one_on_one_id: oneOnOneId,
          user_id: collaboratorId,
          title: `PDI - ${data.main_objective.substring(0, 50)}`,
          description: data.main_objective,
          main_objective: data.main_objective,
          committed_actions: data.committed_actions,
          required_support: data.required_support,
          success_metrics: data.success_metrics,
          anticipated_challenges: data.anticipated_challenges,
          deadline: data.deadline,
          status: "in_progress",
          development_area: "Objetivo Mensal",
          goals: data.main_objective,
          action_items: data.committed_actions,
          timeline: data.deadline,
        }])
        .select()
        .single();

      if (error) throw error;
      return pdi;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["development_plans"] });
      queryClient.invalidateQueries({ queryKey: ["pdi_from_one_on_one"] });
      queryClient.invalidateQueries({ queryKey: ["all_pdis_for_one_on_ones"] });
      queryClient.invalidateQueries({ queryKey: ["latest_pdi"] });
      toast.success("PDI criado com sucesso!");
    },
    onError: (error: any) => {
      toast.error(`Erro ao criar PDI: ${error.message}`);
    },
  });

  const updatePDIProgress = useMutation({
    mutationFn: async ({
      pdiId,
      progressPercentage,
      updateText
    }: {
      pdiId: string;
      progressPercentage: number;
      updateText: string;
    }) => {
      const { error: updateError } = await supabase
        .from("development_plans")
        .update({ progress_percentage: progressPercentage })
        .eq("id", pdiId);

      if (updateError) throw updateError;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { error: insertError } = await supabase
        .from("development_plan_updates")
        .insert([{
          plan_id: pdiId,
          created_by: user.id,
          update_text: updateText,
          progress_change: progressPercentage,
        }]);

      if (insertError) throw insertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["development_plans"] });
      queryClient.invalidateQueries({ queryKey: ["pdi_from_one_on_one"] });
      queryClient.invalidateQueries({ queryKey: ["all_pdis_for_one_on_ones"] });
      queryClient.invalidateQueries({ queryKey: ["latest_pdi"] });
      toast.success("Progresso atualizado com sucesso!");
    },
    onError: (error: any) => {
      toast.error(`Erro ao atualizar progresso: ${error.message}`);
    },
  });

  return {
    hasPDIForOneOnOne,
    createPDIFromOneOnOne: createPDIFromOneOnOne.mutate,
    updatePDIProgress: updatePDIProgress.mutate,
    isCreating: createPDIFromOneOnOne.isPending,
    isUpdating: updatePDIProgress.isPending,
  };
};
