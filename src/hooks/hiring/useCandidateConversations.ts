import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import type {
  CandidateConversationInsert,
  CandidateConversationKind,
  CandidateConversationRow,
  CandidateConversationUpdate,
} from "@/integrations/supabase/hiring-types";
import "@/integrations/supabase/hiring-types";

export const candidateConversationsKeys = {
  byCandidate: (candidateId: string) =>
    ["hiring", "candidate-conversations", "by-candidate", candidateId] as const,
  summaryByCandidate: (candidateId: string) =>
    ["hiring", "candidate-conversations", "summary", candidateId] as const,
};

export function useCandidateConversations(candidateId: string | undefined) {
  return useQuery({
    queryKey: candidateConversationsKeys.byCandidate(candidateId ?? "none"),
    enabled: !!candidateId,
    queryFn: async (): Promise<CandidateConversationRow[]> => {
      if (!candidateId) return [];
      const { data, error } = await supabase
        .from("candidate_conversations")
        .select("*")
        .eq("candidate_id", candidateId)
        .order("occurred_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as CandidateConversationRow[];
    },
  });
}

export function useCreateCandidateConversation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (
      payload: Omit<CandidateConversationInsert, "created_by">,
    ): Promise<CandidateConversationRow> => {
      if (!user?.id) throw new Error("Usuário não autenticado");
      const { data, error } = await supabase
        .from("candidate_conversations")
        .insert({ ...payload, created_by: user.id })
        .select()
        .single();
      if (error) throw error;
      return data as CandidateConversationRow;
    },
    onSuccess: async (row) => {
      await queryClient.invalidateQueries({
        queryKey: candidateConversationsKeys.byCandidate(row.candidate_id),
      });
      toast({ title: "Conversa registrada" });
    },
    onError: (err: Error) =>
      toast({ title: "Erro ao registrar conversa", description: err.message, variant: "destructive" }),
  });
}

export function useUpdateCandidateConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      id: string;
      candidateId: string;
      patch: CandidateConversationUpdate;
    }): Promise<void> => {
      const { error } = await supabase
        .from("candidate_conversations")
        .update(args.patch)
        .eq("id", args.id);
      if (error) throw error;
    },
    onSuccess: async (_, args) => {
      await queryClient.invalidateQueries({
        queryKey: candidateConversationsKeys.byCandidate(args.candidateId),
      });
      toast({ title: "Conversa atualizada" });
    },
    onError: (err: Error) =>
      toast({ title: "Erro ao atualizar", description: err.message, variant: "destructive" }),
  });
}

export function useDeleteCandidateConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (args: { id: string; candidateId: string }): Promise<void> => {
      const { error } = await supabase
        .from("candidate_conversations")
        .delete()
        .eq("id", args.id);
      if (error) throw error;
    },
    onSuccess: async (_, args) => {
      await queryClient.invalidateQueries({
        queryKey: candidateConversationsKeys.byCandidate(args.candidateId),
      });
      toast({ title: "Conversa removida" });
    },
    onError: (err: Error) =>
      toast({ title: "Erro ao remover", description: err.message, variant: "destructive" }),
  });
}

export function useUploadConversationTranscript() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      id: string;
      candidateId: string;
      file: File;
    }): Promise<string> => {
      const ext = args.file.name.split(".").pop() || "txt";
      const path = `candidates/${args.candidateId}/conversations/${args.id}/transcript.${ext}`;
      const { error } = await supabase.storage
        .from("hiring")
        .upload(path, args.file, { upsert: true });
      if (error) throw error;
      const { error: dbErr } = await supabase
        .from("candidate_conversations")
        .update({ transcript_path: path })
        .eq("id", args.id);
      if (dbErr) throw dbErr;
      return path;
    },
    onSuccess: async (_, args) => {
      await queryClient.invalidateQueries({
        queryKey: candidateConversationsKeys.byCandidate(args.candidateId),
      });
      toast({ title: "Arquivo anexado" });
    },
    onError: (err: Error) =>
      toast({ title: "Erro ao enviar arquivo", description: err.message, variant: "destructive" }),
  });
}

export const CANDIDATE_CONVERSATION_KIND_LABELS: Record<CandidateConversationKind, string> = {
  discovery: "Discovery",
  followup: "Follow-up",
  referencia: "Referências",
  alinhamento: "Alinhamento",
  outro: "Outro",
};
