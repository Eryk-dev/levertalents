import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface ClimateSurvey {
  id: string;
  title: string;
  description: string;
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

export interface ClimateResponse {
  id: string;
  survey_id: string;
  question_id: string;
  user_id: string;
  score: number;
  comment: string;
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
      return data as ClimateSurvey[];
    },
  });

  const createSurvey = useMutation({
    mutationFn: async (input: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("climate_surveys")
        .insert([{ ...input, created_by: user.id }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["climate_surveys"] });
      toast({ title: "Pesquisa criada com sucesso!" });
    },
  });

  const submitResponse = useMutation({
    mutationFn: async (responses: any[]) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { error } = await supabase
        .from("climate_responses")
        .upsert(responses.map(r => ({ 
          survey_id: r.survey_id,
          question_id: r.question_id,
          score: r.score,
          comment: r.comment,
          user_id: user.id 
        })));

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["climate_responses"] });
      toast({ title: "Respostas enviadas com sucesso!" });
    },
  });

  return { surveys: surveys || [], isLoading, createSurvey: createSurvey.mutate, submitResponse: submitResponse.mutate };
};
