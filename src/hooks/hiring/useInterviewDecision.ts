import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import type {
  EvaluatorDecision,
  InterviewDecisionRow,
} from "@/integrations/supabase/hiring-types";
import "@/integrations/supabase/hiring-types";

export const interviewDecisionsKeys = {
  byInterview: (interviewId: string) => ["hiring", "interview-decisions", interviewId] as const,
};

export function useInterviewDecisions(interviewId: string | undefined) {
  return useQuery({
    queryKey: interviewDecisionsKeys.byInterview(interviewId ?? "none"),
    enabled: !!interviewId,
    queryFn: async (): Promise<InterviewDecisionRow[]> => {
      if (!interviewId) return [];
      const { data, error } = await supabase
        .from("interview_decisions")
        .select("*")
        .eq("interview_id", interviewId);
      if (error) throw error;
      return (data ?? []) as InterviewDecisionRow[];
    },
  });
}

export function useMyInterviewDecision(interviewId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["hiring", "interview-decisions", "mine", interviewId, user?.id],
    enabled: !!interviewId && !!user?.id,
    queryFn: async (): Promise<InterviewDecisionRow | null> => {
      if (!interviewId || !user?.id) return null;
      const { data, error } = await supabase
        .from("interview_decisions")
        .select("*")
        .eq("interview_id", interviewId)
        .eq("evaluator_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return (data as InterviewDecisionRow) ?? null;
    },
  });
}

export function useSubmitInterviewDecision() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (args: {
      interviewId: string;
      decision: EvaluatorDecision;
      comments?: string;
    }): Promise<void> => {
      if (!user?.id) throw new Error("Usuário não autenticado");
      if (args.decision === "reprovado" && (!args.comments || args.comments.trim().length === 0)) {
        throw new Error("Reprovação requer comentário.");
      }
      const { data: existing } = await supabase
        .from("interview_decisions")
        .select("id")
        .eq("interview_id", args.interviewId)
        .eq("evaluator_id", user.id)
        .maybeSingle();
      if (existing?.id) {
        const { error } = await supabase
          .from("interview_decisions")
          .update({
            decision: args.decision,
            comments: args.comments ?? null,
            decided_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("interview_decisions").insert({
          interview_id: args.interviewId,
          evaluator_id: user.id,
          decision: args.decision,
          comments: args.comments ?? null,
          decided_at: new Date().toISOString(),
        });
        if (error) throw error;
      }
    },
    onSuccess: async (_, args) => {
      await queryClient.invalidateQueries({ queryKey: interviewDecisionsKeys.byInterview(args.interviewId) });
      toast({ title: "Decisão registrada" });
    },
    onError: (err: Error) =>
      toast({ title: "Não foi possível registrar", description: err.message, variant: "destructive" }),
  });
}
