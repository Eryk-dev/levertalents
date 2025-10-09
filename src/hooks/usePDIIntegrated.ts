import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { DevelopmentPlan } from "./useDevelopmentPlans";

export interface PDIFormData {
  main_objective: string;
  committed_actions: string;
  required_support: string;
  success_metrics: string;
  anticipated_challenges: string;
  deadline: string;
}

export const usePDIIntegrated = () => {
  const queryClient = useQueryClient();

  // Get all PDIs for current 1:1s (for checking existence in loops)
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

  // Check if a PDI exists for a specific 1:1 (non-hook function for use in loops)
  const hasPDIForOneOnOne = (oneOnOneId: string): boolean => {
    return allPDIs?.some(pdi => pdi.one_on_one_id === oneOnOneId) || false;
  };

  // Get PDI from specific 1:1 (hook - only use at component top level)
  const getPDIFromOneOnOne = (oneOnOneId: string) => {
    return useQuery({
      queryKey: ["pdi_from_one_on_one", oneOnOneId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("development_plans")
          .select("*")
          .eq("one_on_one_id", oneOnOneId)
          .maybeSingle();

        if (error) throw error;
        return data as DevelopmentPlan | null;
      },
      enabled: !!oneOnOneId,
    });
  };

  // Get latest PDI for collaborator
  const getLatestPDIForCollaborator = (collaboratorId: string) => {
    return useQuery({
      queryKey: ["latest_pdi", collaboratorId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("development_plans")
          .select(`
            *,
            user:profiles!development_plans_user_id_fkey(id, full_name, avatar_url)
          `)
          .eq("user_id", collaboratorId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) throw error;
        return data as DevelopmentPlan | null;
      },
      enabled: !!collaboratorId,
    });
  };

  // Create PDI from 1:1
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
      toast({ title: "PDI criado com sucesso!" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Erro ao criar PDI", 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });

  // Update PDI progress
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
      // Update progress
      const { error: updateError } = await supabase
        .from("development_plans")
        .update({ progress_percentage: progressPercentage })
        .eq("id", pdiId);

      if (updateError) throw updateError;

      // Add progress update
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
      toast({ title: "Progresso atualizado com sucesso!" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Erro ao atualizar progresso", 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });

  return {
    hasPDIForOneOnOne,
    getPDIFromOneOnOne,
    getLatestPDIForCollaborator,
    createPDIFromOneOnOne: createPDIFromOneOnOne.mutate,
    updatePDIProgress: updatePDIProgress.mutate,
    isCreating: createPDIFromOneOnOne.isPending,
    isUpdating: updatePDIProgress.isPending,
  };
};
