import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast as sonnerToast } from "sonner";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useScope } from "@/app/providers/ScopeProvider";
import { useScopedQuery } from "@/shared/data/useScopedQuery";
import {
  detectNetworkDrop,
  detectRlsDenial,
  getMoveErrorToastConfig,
  type MoveApplicationError,
} from "@/lib/supabaseError";
import type {
  ApplicationRow,
  ApplicationStage,
  ApplicationWithCandidate,
  CandidateRow,
  DiscardReason,
  MoveApplicationStageArgs,
} from "@/integrations/supabase/hiring-types";
import "@/integrations/supabase/hiring-types";

export const applicationsKeys = {
  all: ["hiring", "applications"] as const,
  byJob: (jobId: string) => ["hiring", "applications", "by-job", jobId] as const,
  detail: (id: string) => ["hiring", "applications", "detail", id] as const,
  byCandidate: (candidateId: string) =>
    ["hiring", "applications", "by-candidate", candidateId] as const,
};

// Re-export for convenience (already canonical em hiring-types.ts).
export type { ApplicationWithCandidate } from "@/integrations/supabase/hiring-types";

/**
 * Phase 2 Plan 02-05: porta useApplicationsByJob para useScopedQuery
 * (chokepoint Phase 1). queryKey final: ["scope", scope.id, scope.kind,
 * "hiring", "applications", "by-job", jobId].
 */
export function useApplicationsByJob(jobId: string | undefined) {
  return useScopedQuery<ApplicationWithCandidate[], Error>(
    ["hiring", "applications", "by-job", jobId ?? "none"],
    async (): Promise<ApplicationWithCandidate[]> => {
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
    { enabled: !!jobId },
  );
}

export function useApplication(id: string | undefined) {
  return useQuery({
    queryKey: applicationsKeys.detail(id ?? "none"),
    enabled: !!id,
    queryFn: async (): Promise<ApplicationRow | null> => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("applications")
        .select("*")
        .eq("id", id)
        .maybeSingle();
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

interface MoveMutationContext {
  previousApplications: ApplicationWithCandidate[] | undefined;
  applicationsKey: readonly unknown[];
}

/**
 * Phase 2 Plan 02-05 — REWRITE TanStack v5 canonical:
 *  - onMutate: cancelQueries + getQueryData snapshot + setQueryData optimistic
 *  - mutationFn: UPDATE applications SET stage,last_moved_by; sem optimistic locking (D-03)
 *  - onError: rollback do snapshot + toast diferenciado por kind (D-05)
 *  - onSettled: invalidate por jobId + invalidate counts-by-jobs
 *  - retry: gate por err.kind === "network" && failureCount < 3 (1s/2s/4s backoff)
 *
 * Caller (CandidatesKanban onDragEnd) deve chamar canTransition() antes do mutate
 * (D-02). Esse mutationFn assume transição válida.
 */
export function useMoveApplicationStage() {
  const queryClient = useQueryClient();
  const { scope } = useScope();
  const { user } = useAuth();

  return useMutation<
    { ok: true; row: ApplicationRow },
    MoveApplicationError,
    MoveApplicationStageArgs,
    MoveMutationContext
  >({
    mutationFn: async (args): Promise<{ ok: true; row: ApplicationRow }> => {
      const { data, error } = await supabase
        .from("applications")
        .update({
          stage: args.toStage,
          last_moved_by: user?.id ?? null,
        })
        .eq("id", args.id)
        .select()
        .maybeSingle();

      if (error) {
        if (detectRlsDenial(error)) {
          throw { kind: "rls", error } as MoveApplicationError;
        }
        if (detectNetworkDrop(error)) {
          throw { kind: "network", error } as MoveApplicationError;
        }
        throw { kind: "unknown", error } as MoveApplicationError;
      }
      if (!data) {
        throw { kind: "conflict" } as MoveApplicationError;
      }
      return { ok: true, row: data as ApplicationRow };
    },

    onMutate: async (args): Promise<MoveMutationContext> => {
      const applicationsKey = [
        "scope",
        scope?.id ?? "__none__",
        scope?.kind ?? "__none__",
        "hiring",
        "applications",
        "by-job",
        args.jobId,
      ] as const;

      await queryClient.cancelQueries({ queryKey: applicationsKey });

      const previousApplications =
        queryClient.getQueryData<ApplicationWithCandidate[]>(applicationsKey);

      queryClient.setQueryData<ApplicationWithCandidate[]>(
        applicationsKey,
        (old) =>
          old?.map((a) =>
            a.id === args.id
              ? {
                  ...a,
                  stage: args.toStage,
                  stage_entered_at: new Date().toISOString(),
                }
              : a,
          ) ?? [],
      );

      return { previousApplications, applicationsKey };
    },

    onError: (err, _args, context) => {
      if (context?.previousApplications && context.applicationsKey) {
        queryClient.setQueryData(
          context.applicationsKey,
          context.previousApplications,
        );
      }
      const cfg = getMoveErrorToastConfig(err);
      sonnerToast.error(cfg.title, {
        description: cfg.description,
        duration: cfg.duration,
      });
    },

    onSettled: async (_data, _err, _args, context) => {
      if (context?.applicationsKey) {
        await queryClient.invalidateQueries({
          queryKey: context.applicationsKey,
        });
      }
      await queryClient.invalidateQueries({
        queryKey: [
          "scope",
          scope?.id ?? "__none__",
          scope?.kind ?? "__none__",
          "hiring",
          "application-counts-by-jobs",
        ],
      });
    },

    retry: (failureCount, err) => {
      const e = err as MoveApplicationError;
      return e.kind === "network" && failureCount < 3;
    },
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
  });
}

export interface RejectApplicationArgs {
  id: string;
  discardReason: DiscardReason;
  addToTalentPool: boolean;
  discardNotes?: string | null;
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
      toast({
        title: "Erro ao recusar candidato",
        description: err.message,
        variant: "destructive",
      }),
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
      const job =
        (data as { job?: { id: string; title: string; company_id: string } | null } | null)
          ?.job ?? null;
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
      await queryClient.invalidateQueries({
        queryKey: applicationsKeys.byCandidate(args.candidateId),
      });
      toast({ title: "Perfil reaproveitado" });
    },
    onError: (err: Error) =>
      toast({
        title: "Erro ao reaproveitar",
        description: err.message,
        variant: "destructive",
      }),
  });
}

// Note: silence unused-import warnings for re-exported types from the
// canonical hiring-types module.
export type { CandidateRow };
