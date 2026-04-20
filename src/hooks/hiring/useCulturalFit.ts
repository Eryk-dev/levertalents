import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import type {
  CulturalFitQuestionInsert,
  CulturalFitQuestionRow,
  CulturalFitResponseRow,
  CulturalFitSurveyInsert,
  CulturalFitSurveyRow,
} from "@/integrations/supabase/hiring-types";
import "@/integrations/supabase/hiring-types";

export const culturalFitKeys = {
  surveys: ["hiring", "fit", "surveys"] as const,
  survey: (id: string) => ["hiring", "fit", "survey", id] as const,
  questions: (surveyId: string) => ["hiring", "fit", "questions", surveyId] as const,
  response: (applicationId: string) => ["hiring", "fit", "response", applicationId] as const,
};

export function useFitSurveys() {
  return useQuery({
    queryKey: culturalFitKeys.surveys,
    queryFn: async (): Promise<CulturalFitSurveyRow[]> => {
      const { data, error } = await supabase.from("cultural_fit_surveys").select("*").order("name");
      if (error) throw error;
      return (data ?? []) as CulturalFitSurveyRow[];
    },
  });
}

export function useFitSurvey(id: string | undefined) {
  return useQuery({
    queryKey: culturalFitKeys.survey(id ?? "none"),
    enabled: !!id,
    queryFn: async (): Promise<CulturalFitSurveyRow | null> => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("cultural_fit_surveys")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return (data as CulturalFitSurveyRow) ?? null;
    },
  });
}

export function useFitQuestions(surveyId: string | undefined) {
  return useQuery({
    queryKey: culturalFitKeys.questions(surveyId ?? "none"),
    enabled: !!surveyId,
    queryFn: async (): Promise<CulturalFitQuestionRow[]> => {
      if (!surveyId) return [];
      const { data, error } = await supabase
        .from("cultural_fit_questions")
        .select("*")
        .eq("survey_id", surveyId)
        .order("order_index");
      if (error) throw error;
      return (data ?? []) as CulturalFitQuestionRow[];
    },
  });
}

export function useCreateFitSurvey() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (payload: Omit<CulturalFitSurveyInsert, "created_by">): Promise<CulturalFitSurveyRow> => {
      if (!user?.id) throw new Error("Usuário não autenticado");
      const { data, error } = await supabase
        .from("cultural_fit_surveys")
        .insert({ ...payload, created_by: user.id })
        .select()
        .single();
      if (error) throw error;
      return data as CulturalFitSurveyRow;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: culturalFitKeys.surveys });
      toast({ title: "Questionário criado" });
    },
    onError: (err: Error) =>
      toast({ title: "Erro ao criar", description: err.message, variant: "destructive" }),
  });
}

export function useUpdateFitSurvey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (args: { id: string; patch: Partial<CulturalFitSurveyRow> }) => {
      const { data, error } = await supabase
        .from("cultural_fit_surveys")
        .update(args.patch)
        .eq("id", args.id)
        .select()
        .single();
      if (error) throw error;
      return data as CulturalFitSurveyRow;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: culturalFitKeys.surveys });
      toast({ title: "Questionário atualizado" });
    },
  });
}

export function useCreateFitQuestion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CulturalFitQuestionInsert) => {
      const { data, error } = await supabase.from("cultural_fit_questions").insert(payload).select().single();
      if (error) throw error;
      return data as CulturalFitQuestionRow;
    },
    onSuccess: async (_, payload) => {
      await queryClient.invalidateQueries({ queryKey: culturalFitKeys.questions(payload.survey_id) });
    },
  });
}

export function useUpdateFitQuestion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (args: { id: string; surveyId: string; patch: Partial<CulturalFitQuestionRow> }) => {
      const { data, error } = await supabase
        .from("cultural_fit_questions")
        .update(args.patch)
        .eq("id", args.id)
        .select()
        .single();
      if (error) throw error;
      return data as CulturalFitQuestionRow;
    },
    onSuccess: async (_, args) => {
      await queryClient.invalidateQueries({ queryKey: culturalFitKeys.questions(args.surveyId) });
    },
  });
}

export function useDeleteFitQuestion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (args: { id: string; surveyId: string }) => {
      const { error } = await supabase.from("cultural_fit_questions").delete().eq("id", args.id);
      if (error) throw error;
    },
    onSuccess: async (_, args) => {
      await queryClient.invalidateQueries({ queryKey: culturalFitKeys.questions(args.surveyId) });
    },
  });
}

export function useFitResponse(applicationId: string | undefined) {
  return useQuery({
    queryKey: culturalFitKeys.response(applicationId ?? "none"),
    enabled: !!applicationId,
    queryFn: async (): Promise<CulturalFitResponseRow | null> => {
      if (!applicationId) return null;
      const { data, error } = await supabase
        .from("cultural_fit_responses")
        .select("*")
        .eq("application_id", applicationId)
        .maybeSingle();
      if (error) throw error;
      return (data as CulturalFitResponseRow) ?? null;
    },
  });
}

export function useIssueFitLink() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (args: { applicationId: string; surveyId: string }): Promise<{ public_url: string; token: string; expires_at: string }> => {
      const { data, error } = await supabase.functions.invoke("hiring-issue-fit-cultural-link", {
        body: { application_id: args.applicationId, survey_id: args.surveyId },
      });
      if (error) throw error;
      return data as { public_url: string; token: string; expires_at: string };
    },
    onSuccess: async (_, args) => {
      await queryClient.invalidateQueries({ queryKey: ["hiring", "applications", "detail", args.applicationId] });
      toast({ title: "Link gerado", description: "Compartilhe o link com o candidato." });
    },
    onError: (err: Error) =>
      toast({ title: "Erro ao gerar link", description: err.message, variant: "destructive" }),
  });
}

export function usePublicFitForm(token: string | undefined) {
  return useQuery({
    queryKey: ["hiring", "fit", "public", token],
    enabled: !!token,
    queryFn: async (): Promise<{ survey: { name: string } | null; questions: CulturalFitQuestionRow[] } | null> => {
      if (!token) return null;
      const functionsUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? "";
      const res = await fetch(
        `${functionsUrl}/functions/v1/hiring-submit-fit-cultural-public?token=${encodeURIComponent(token)}`,
      );
      if (!res.ok) {
        const payload = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error((payload as { error?: string }).error ?? `HTTP ${res.status}`);
      }
      return (await res.json()) as { survey: { name: string } | null; questions: CulturalFitQuestionRow[] };
    },
    retry: false,
  });
}
