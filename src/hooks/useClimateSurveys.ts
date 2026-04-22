import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ClimateSurvey {
  id: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string;
  status: 'draft' | 'active' | 'closed';
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ClimateQuestion {
  id: string;
  survey_id: string;
  question_text: string;
  category: string;
  question_order: number;
}

export interface ClimateResponseInput {
  survey_id: string;
  question_id: string;
  score: number;
  comment?: string;
}

export const useClimateSurveys = () => {
  const queryClient = useQueryClient();

  const { data: surveys, isLoading } = useQuery({
    queryKey: ["climate_surveys"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("climate_surveys")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as ClimateSurvey[];
    },
  });

  const createSurvey = useMutation({
    mutationFn: async (input: {
      title: string;
      description?: string;
      start_date: string;
      end_date: string;
      status?: 'draft' | 'active';
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("climate_surveys")
        .insert([{ ...input, created_by: user.id }])
        .select()
        .single();

      if (error) throw error;
      return data as ClimateSurvey;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["climate_surveys"] });
      toast.success("Pesquisa criada com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar pesquisa: ${error.message}`);
    },
  });

  const createQuestion = useMutation({
    mutationFn: async (input: { survey_id: string; question_text: string; category: string }) => {
      const { data: existing } = await supabase
        .from("climate_questions")
        .select("question_order")
        .eq("survey_id", input.survey_id)
        .order("question_order", { ascending: false })
        .limit(1);

      const nextOrder = (existing?.[0]?.question_order ?? 0) + 1;

      const { error } = await supabase
        .from("climate_questions")
        .insert({
          survey_id: input.survey_id,
          question_text: input.question_text,
          category: input.category,
          question_order: nextOrder,
        });

      if (error) throw error;
      return input.survey_id;
    },
    onSuccess: (surveyId) => {
      queryClient.invalidateQueries({ queryKey: ["climate_questions", surveyId] });
      toast.success("Pergunta adicionada");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao adicionar pergunta: ${error.message}`);
    },
  });

  const deleteQuestion = useMutation({
    mutationFn: async (input: { id: string; survey_id: string }) => {
      const { error } = await supabase
        .from("climate_questions")
        .delete()
        .eq("id", input.id);
      if (error) throw error;
      return input.survey_id;
    },
    onSuccess: (surveyId) => {
      queryClient.invalidateQueries({ queryKey: ["climate_questions", surveyId] });
      toast.success("Pergunta removida");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover pergunta: ${error.message}`);
    },
  });

  const submitResponses = useMutation({
    mutationFn: async (responses: ClimateResponseInput[]) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { error } = await supabase
        .from("climate_responses")
        .upsert(
          responses.map(r => ({
            survey_id: r.survey_id,
            question_id: r.question_id,
            score: r.score,
            comment: r.comment ?? null,
            user_id: user.id,
          })),
          { onConflict: "survey_id,question_id,user_id" }
        );

      if (error) throw error;
      return responses[0]?.survey_id;
    },
    onSuccess: (surveyId) => {
      queryClient.invalidateQueries({ queryKey: ["climate_responses_user"] });
      if (surveyId) {
        queryClient.invalidateQueries({ queryKey: ["climate_responses_user", surveyId] });
      }
      toast.success("Respostas enviadas com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao enviar respostas: ${error.message}`);
    },
  });

  return {
    surveys: surveys ?? [],
    isLoading,
    createSurvey: createSurvey.mutate,
    createSurveyAsync: createSurvey.mutateAsync,
    isCreatingSurvey: createSurvey.isPending,
    createQuestion: createQuestion.mutate,
    deleteQuestion: deleteQuestion.mutate,
    submitResponses: submitResponses.mutateAsync,
    isSubmitting: submitResponses.isPending,
  };
};

// Hooks standalone — para top-level do componente que exibe uma pesquisa
// específica. Chamar em loop/condicional viola Rules of Hooks.

export const useClimateQuestions = (surveyId: string | undefined) => {
  return useQuery({
    queryKey: ["climate_questions", surveyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("climate_questions")
        .select("*")
        .eq("survey_id", surveyId!)
        .order("question_order");

      if (error) throw error;
      return (data ?? []) as ClimateQuestion[];
    },
    enabled: !!surveyId,
    refetchOnMount: "always",
  });
};

export const useUserResponseIds = (surveyId: string | undefined) => {
  return useQuery({
    queryKey: ["climate_responses_user", surveyId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("climate_responses")
        .select("question_id")
        .eq("survey_id", surveyId!)
        .eq("user_id", user.id);

      if (error) throw error;
      return (data ?? []).map((r) => r.question_id);
    },
    enabled: !!surveyId,
    refetchOnMount: "always",
  });
};
