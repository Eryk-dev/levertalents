import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface Evaluation {
  id: string;
  evaluated_user_id: string;
  evaluator_user_id: string;
  period: string;
  overall_score: number;
  technical_score: number;
  behavioral_score: number;
  leadership_score: number;
  comments: string;
  strengths: string;
  areas_for_improvement: string;
  status: 'draft' | 'completed' | 'reviewed';
  created_at: string;
  updated_at: string;
  evaluated_user?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
  evaluator_user?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
}

export interface EvaluationInput {
  evaluated_user_id: string;
  period: string;
  overall_score: number;
  technical_score: number;
  behavioral_score: number;
  leadership_score: number;
  comments: string;
  strengths: string;
  areas_for_improvement: string;
  status: 'draft' | 'completed' | 'reviewed';
}

export const useEvaluations = () => {
  const queryClient = useQueryClient();

  const { data: evaluations, isLoading } = useQuery({
    queryKey: ["evaluations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("evaluations")
        .select(`
          *,
          evaluated_user:profiles!evaluations_evaluated_user_id_fkey(id, full_name, avatar_url),
          evaluator_user:profiles!evaluations_evaluator_user_id_fkey(id, full_name, avatar_url)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Evaluation[];
    },
  });

  const createEvaluation = useMutation({
    mutationFn: async (input: EvaluationInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("evaluations")
        .insert({
          ...input,
          evaluator_user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evaluations"] });
      toast({
        title: "Avaliação criada",
        description: "A avaliação foi criada com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar avaliação",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateEvaluation = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<EvaluationInput> }) => {
      const { data, error } = await supabase
        .from("evaluations")
        .update(input)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evaluations"] });
      toast({
        title: "Avaliação atualizada",
        description: "A avaliação foi atualizada com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar avaliação",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    evaluations: evaluations || [],
    isLoading,
    createEvaluation: createEvaluation.mutate,
    updateEvaluation: updateEvaluation.mutate,
  };
};
