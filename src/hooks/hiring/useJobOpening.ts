import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { canTransition } from "@/lib/hiring/statusMachine";
import { toast } from "@/hooks/use-toast";
import type {
  JobDescriptionRow,
  JobExternalPublicationRow,
  JobOpeningRow,
  JobStatus,
  JobCloseReason,
} from "@/integrations/supabase/hiring-types";
import { useOptimisticVersion } from "./useOptimisticVersion";
import { jobOpeningsKeys } from "./useJobOpenings";
import "@/integrations/supabase/hiring-types";

export type JobOpeningWithRelations = JobOpeningRow & {
  job_descriptions: JobDescriptionRow[];
  job_external_publications: JobExternalPublicationRow[];
};

export function useJobOpening(id: string | undefined) {
  return useQuery({
    queryKey: jobOpeningsKeys.detail(id ?? "none"),
    enabled: !!id,
    queryFn: async (): Promise<JobOpeningWithRelations | null> => {
      if (!id) return null;
      const [openingQ, descriptionsQ, publicationsQ] = await Promise.all([
        supabase.from("job_openings").select("*").eq("id", id).maybeSingle(),
        supabase.from("job_descriptions").select("*").eq("job_opening_id", id).order("version", { ascending: false }),
        supabase.from("job_external_publications").select("*").eq("job_opening_id", id).order("published_at", { ascending: false }),
      ]);
      if (openingQ.error) throw openingQ.error;
      if (!openingQ.data) return null;
      if (descriptionsQ.error) throw descriptionsQ.error;
      if (publicationsQ.error) throw publicationsQ.error;
      return {
        ...(openingQ.data as JobOpeningRow),
        job_descriptions: (descriptionsQ.data ?? []) as JobDescriptionRow[],
        job_external_publications: (publicationsQ.data ?? []) as JobExternalPublicationRow[],
      };
    },
  });
}

export function useSetJobStatus() {
  const mutation = useOptimisticVersion<"job_openings">();
  return {
    ...mutation,
    mutate: (args: {
      id: string;
      expectedUpdatedAt: string;
      nextStatus: JobStatus;
      successMessage?: string;
    }) => {
      const patch: Partial<JobOpeningRow> = { status: args.nextStatus };
      if (args.nextStatus !== "fechada") {
        patch.closed_at = null;
        patch.close_reason = null;
      }
      mutation.mutate({
        tableName: "job_openings",
        id: args.id,
        expectedUpdatedAt: args.expectedUpdatedAt,
        patch,
        invalidateKeys: [
          [...jobOpeningsKeys.all],
          [...jobOpeningsKeys.detail(args.id)],
        ],
        successMessage: args.successMessage ?? "Status atualizado",
      });
    },
  };
}

export function useCloseJobOpening() {
  const mutation = useOptimisticVersion<"job_openings">();

  return {
    ...mutation,
    mutate: (args: {
      id: string;
      currentStatus: JobStatus;
      expectedUpdatedAt: string;
      reason: JobCloseReason;
    }) => {
      if (!canTransition(args.currentStatus, "fechada", "job")) {
        toast({
          title: "Transição inválida",
          description: `Não é possível encerrar a partir de ${args.currentStatus}.`,
          variant: "destructive",
        });
        return;
      }
      mutation.mutate({
        tableName: "job_openings",
        id: args.id,
        expectedUpdatedAt: args.expectedUpdatedAt,
        patch: {
          status: "fechada",
          close_reason: args.reason,
          closed_at: new Date().toISOString(),
        },
        invalidateKeys: [
          [...jobOpeningsKeys.all],
          [...jobOpeningsKeys.detail(args.id)],
        ],
        successMessage: "Vaga fechada",
      });
    },
  };
}
