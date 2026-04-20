import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useVisibleCompanies } from "@/lib/hiring/rlsScope";
import type {
  JobOpeningInsert,
  JobOpeningRow,
  JobStatus,
} from "@/integrations/supabase/hiring-types";
import { useOptimisticVersion } from "./useOptimisticVersion";
import "@/integrations/supabase/hiring-types";

export const jobOpeningsKeys = {
  all: ["hiring", "job-openings"] as const,
  list: (filters: ListFilters) => ["hiring", "job-openings", "list", filters] as const,
  detail: (id: string) => ["hiring", "job-openings", "detail", id] as const,
};

interface ListFilters {
  status?: JobStatus | "all";
  companyId?: string | "all";
  confidentialScope?: "any" | "confidential" | "public";
}

export function useJobOpeningsList(filters: ListFilters = {}) {
  const { companyIds, canSeeAll, isLoading: scopeLoading } = useVisibleCompanies();
  const scopeKey = canSeeAll ? "all" : companyIds.slice().sort().join(",");

  return useQuery({
    queryKey: [...jobOpeningsKeys.list(filters), scopeKey],
    // Só dispara depois que o escopo (visible companies) estabilizou — evita
    // race condition em que o hook roda com companyIds=[] e cacheia vazio
    // antes do userRole/role=admin chegar. Sem isso, admin vê 0 vagas após
    // refresh mesmo com dados no banco.
    enabled: !scopeLoading,
    queryFn: async (): Promise<JobOpeningRow[]> => {
      let q = supabase
        .from("job_openings")
        .select("*")
        .order("opened_at", { ascending: false });

      if (filters.status && filters.status !== "all") q = q.eq("status", filters.status);
      if (filters.companyId && filters.companyId !== "all") q = q.eq("company_id", filters.companyId);
      if (!canSeeAll) q = q.in("company_id", companyIds.length ? companyIds : ["00000000-0000-0000-0000-000000000000"]);
      if (filters.confidentialScope === "confidential") q = q.eq("confidential", true);
      if (filters.confidentialScope === "public") q = q.eq("confidential", false);

      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateJobOpening() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (payload: Omit<JobOpeningInsert, "requested_by">): Promise<JobOpeningRow> => {
      if (!user?.id) throw new Error("Usuário não autenticado");
      const insert: JobOpeningInsert = { ...payload, requested_by: user.id };
      const { data, error } = await supabase
        .from("job_openings")
        .insert(insert)
        .select()
        .single();
      if (error) throw error;
      return data as JobOpeningRow;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: jobOpeningsKeys.all });
      toast({ title: "Vaga criada", description: "Agora o RH pode redigir o descritivo." });
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao criar vaga", description: err.message, variant: "destructive" });
    },
  });
}

export function useUpdateJobOpeningStatus() {
  const mutation = useOptimisticVersion<"job_openings">({
    onSuccess: (result) => {
      if (result.ok) {
        // invalidation handled by hook — nothing more to do
      }
    },
  });

  return {
    ...mutation,
    mutate: (args: {
      id: string;
      expectedUpdatedAt: string;
      nextStatus: JobStatus;
      closeReason?: JobOpeningRow["close_reason"];
      successMessage?: string;
    }) =>
      mutation.mutate({
        tableName: "job_openings",
        id: args.id,
        expectedUpdatedAt: args.expectedUpdatedAt,
        patch: {
          status: args.nextStatus,
          close_reason: args.closeReason ?? null,
          closed_at: args.nextStatus === "encerrada" ? new Date().toISOString() : null,
        },
        invalidateKeys: [
          [...jobOpeningsKeys.all],
          [...jobOpeningsKeys.detail(args.id)],
        ],
        successMessage: args.successMessage ?? "Status da vaga atualizado",
      }),
  };
}
