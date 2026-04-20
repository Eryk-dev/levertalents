import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import type {
  ApplicationRow,
  ApplicationStage,
  CandidateRow,
  DiscardReason,
} from "@/integrations/supabase/hiring-types";
import "@/integrations/supabase/hiring-types";

export const applicationsKeys = {
  all: ["hiring", "applications"] as const,
  byJob: (jobId: string) => ["hiring", "applications", "by-job", jobId] as const,
  detail: (id: string) => ["hiring", "applications", "detail", id] as const,
  byCandidate: (candidateId: string) => ["hiring", "applications", "by-candidate", candidateId] as const,
};

export type ApplicationWithCandidate = ApplicationRow & {
  candidate: Pick<CandidateRow, "id" | "full_name" | "email" | "anonymized_at"> | null;
};

export function useApplicationsByJob(jobId: string | undefined) {
  return useQuery({
    queryKey: applicationsKeys.byJob(jobId ?? "none"),
    enabled: !!jobId,
    queryFn: async (): Promise<ApplicationWithCandidate[]> => {
      if (!jobId) return [];
      const { data, error } = await supabase
        .from("applications")
        .select(
          "*, candidate:candidates!applications_candidate_id_fkey(id, full_name, email, anonymized_at)",
        )
        .eq("job_opening_id", jobId)
        .order("stage_entered_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as ApplicationWithCandidate[];
    },
  });
}

export function useApplication(id: string | undefined) {
  return useQuery({
    queryKey: applicationsKeys.detail(id ?? "none"),
    enabled: !!id,
    queryFn: async (): Promise<ApplicationRow | null> => {
      if (!id) return null;
      const { data, error } = await supabase.from("applications").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return (data as ApplicationRow) ?? null;
    },
  });
}

export function useApplicationsByCandidate(candidateId: string | undefined) {
  return useQuery({
    queryKey: applicationsKeys.byCandidate(candidateId ?? "none"),
    enabled: !!candidateId,
    queryFn: async (): Promise<ApplicationRow[]> => {
      if (!candidateId) return [];
      const { data, error } = await supabase
        .from("applications")
        .select("*")
        .eq("candidate_id", candidateId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ApplicationRow[];
    },
  });
}

export function useMoveApplicationStage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (args: {
      id: string;
      fromStage: ApplicationStage;
      toStage: ApplicationStage;
      expectedUpdatedAt: string;
      note?: string;
    }): Promise<{ ok: true; row: ApplicationRow } | { ok: false; conflict: true }> => {
      const { data, error } = await supabase
        .from("applications")
        .update({
          stage: args.toStage,
          last_moved_by: user?.id ?? null,
          notes: args.note ?? null,
        })
        .eq("id", args.id)
        .eq("updated_at", args.expectedUpdatedAt)
        .eq("stage", args.fromStage)
        .select()
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        toast({
          title: "Este registro mudou",
          description: "Recarregue o Kanban para ver o estado mais recente.",
          variant: "destructive",
        });
        return { ok: false, conflict: true } as const;
      }
      return { ok: true, row: data as ApplicationRow } as const;
    },
    onSuccess: async (result, args) => {
      if (!result.ok) return;
      await queryClient.invalidateQueries({ queryKey: applicationsKeys.all });
      await queryClient.invalidateQueries({ queryKey: applicationsKeys.detail(args.id) });
    },
  });
}

export interface RejectApplicationArgs {
  id: string;
  discardReason: DiscardReason;
  addToTalentPool: boolean;
  discardNotes?: string | null;
  /** Opcional — só preenchido quando o RH também quer disparar a mensagem padrão. */
  rejectionMessageId?: string | null;
}

export function useRejectApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (args: RejectApplicationArgs): Promise<void> => {
      const { error } = await supabase
        .from("applications")
        .update({
          stage: "recusado",
          discard_reason: args.discardReason,
          discard_notes: args.discardNotes ?? null,
          added_to_talent_pool: args.addToTalentPool,
          rejection_message_id: args.rejectionMessageId ?? null,
          closed_at: new Date().toISOString(),
        })
        .eq("id", args.id);
      if (error) throw error;
    },
    onSuccess: async (_data, args) => {
      await queryClient.invalidateQueries({ queryKey: applicationsKeys.all });
      if (args.addToTalentPool) {
        await queryClient.invalidateQueries({ queryKey: ["hiring", "talent-pool"] });
      }
      toast({
        title: "Candidato recusado",
        description: args.addToTalentPool
          ? "Movido para o Banco de Talentos."
          : "Descarte registrado.",
      });
    },
    onError: (err: Error) =>
      toast({ title: "Erro ao recusar candidato", description: err.message, variant: "destructive" }),
  });
}

export function useJobForApplication(applicationId: string | undefined) {
  return useQuery({
    queryKey: ["hiring", "application-job", applicationId],
    enabled: !!applicationId,
    queryFn: async (): Promise<{ id: string; title: string; company_id: string } | null> => {
      if (!applicationId) return null;
      const { data, error } = await supabase
        .from("applications")
        .select("job:job_openings(id, title, company_id)")
        .eq("id", applicationId)
        .maybeSingle();
      if (error) throw error;
      const job = (data as { job?: { id: string; title: string; company_id: string } | null } | null)?.job ?? null;
      return job;
    },
  });
}

export function useReuseCandidateForJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (args: { candidateId: string; jobId: string }): Promise<ApplicationRow> => {
      const { data, error } = await supabase
        .from("applications")
        .insert({
          candidate_id: args.candidateId,
          job_opening_id: args.jobId,
        })
        .select()
        .single();
      if (error) throw error;
      return data as ApplicationRow;
    },
    onSuccess: async (_, args) => {
      await queryClient.invalidateQueries({ queryKey: applicationsKeys.byJob(args.jobId) });
      await queryClient.invalidateQueries({ queryKey: applicationsKeys.byCandidate(args.candidateId) });
      toast({ title: "Perfil reaproveitado" });
    },
    onError: (err: Error) =>
      toast({ title: "Erro ao reaproveitar", description: err.message, variant: "destructive" }),
  });
}
