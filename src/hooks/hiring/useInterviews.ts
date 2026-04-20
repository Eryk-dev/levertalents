import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import type {
  InterviewInsert,
  InterviewRow,
  InterviewStatus,
} from "@/integrations/supabase/hiring-types";
import { useOptimisticVersion } from "./useOptimisticVersion";
import "@/integrations/supabase/hiring-types";

export const interviewsKeys = {
  byApplication: (applicationId: string) => ["hiring", "interviews", "by-application", applicationId] as const,
  detail: (id: string) => ["hiring", "interviews", "detail", id] as const,
};

export function useInterviewsByApplication(applicationId: string | undefined) {
  return useQuery({
    queryKey: interviewsKeys.byApplication(applicationId ?? "none"),
    enabled: !!applicationId,
    queryFn: async (): Promise<InterviewRow[]> => {
      if (!applicationId) return [];
      const { data, error } = await supabase
        .from("interviews")
        .select("*")
        .eq("application_id", applicationId)
        .order("scheduled_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as InterviewRow[];
    },
  });
}

export function useCreateInterview() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (
      payload: Omit<InterviewInsert, "created_by">,
    ): Promise<InterviewRow> => {
      if (!user?.id) throw new Error("Usuário não autenticado");
      const { data, error } = await supabase
        .from("interviews")
        .insert({ ...payload, created_by: user.id })
        .select()
        .single();
      if (error) throw error;
      return data as InterviewRow;
    },
    onSuccess: async (row) => {
      await queryClient.invalidateQueries({ queryKey: interviewsKeys.byApplication(row.application_id) });
      toast({ title: "Entrevista agendada" });
    },
    onError: (err: Error) =>
      toast({ title: "Erro ao agendar", description: err.message, variant: "destructive" }),
  });
}

export function useUpdateInterviewStatus() {
  const mutation = useOptimisticVersion<"interviews">();
  return {
    ...mutation,
    mutate: (args: { id: string; expectedUpdatedAt: string; status: InterviewStatus; applicationId: string }) =>
      mutation.mutate({
        tableName: "interviews",
        id: args.id,
        expectedUpdatedAt: args.expectedUpdatedAt,
        patch: { status: args.status },
        invalidateKeys: [[...interviewsKeys.byApplication(args.applicationId)]],
        successMessage: args.status === "realizada" ? "Entrevista marcada como realizada" : "Status atualizado",
      }),
  };
}

export function useAttachInterviewTranscript() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      id: string;
      applicationId: string;
      candidateId: string;
      companyId: string;
      jobOpeningId: string;
      transcript?: { text?: string; file?: File };
      summary?: string;
    }): Promise<void> => {
      let path: string | null = null;
      if (args.transcript?.file) {
        const ext = args.transcript.file.name.split(".").pop() || "txt";
        path = `companies/${args.companyId}/jobs/${args.jobOpeningId}/candidates/${args.candidateId}/interviews/${args.id}/transcript.${ext}`;
        const { error } = await supabase.storage.from("hiring").upload(path, args.transcript.file, { upsert: true });
        if (error) throw error;
      }

      const patch: { summary?: string; transcript_text?: string; transcript_path?: string } = {};
      if (args.summary !== undefined) patch.summary = args.summary;
      if (args.transcript?.text !== undefined) patch.transcript_text = args.transcript.text;
      if (path) patch.transcript_path = path;

      const { error } = await supabase.from("interviews").update(patch).eq("id", args.id);
      if (error) throw error;
    },
    onSuccess: async (_, args) => {
      await queryClient.invalidateQueries({ queryKey: interviewsKeys.byApplication(args.applicationId) });
      toast({ title: "Transcrição atualizada" });
    },
    onError: (err: Error) =>
      toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });
}
