import { useMutation, useQueryClient, type UseMutationOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";
import "@/integrations/supabase/hiring-types";

// Guarded UPDATE — returns `{ ok: false, conflict: true }` if the row has been
// modified by someone else since the caller last read it. Mirrors research R1
// (optimistic locking via `updated_at` timestamp).

type HiringTableName = Extract<
  keyof Database["public"]["Tables"],
  | "job_openings"
  | "job_descriptions"
  | "job_external_publications"
  | "candidates"
  | "applications"
  | "cultural_fit_surveys"
  | "cultural_fit_questions"
  | "cultural_fit_responses"
  | "background_checks"
  | "interviews"
  | "interview_decisions"
  | "employee_onboarding_handoffs"
  | "standard_messages"
>;

export type OptimisticConflict = {
  ok: false;
  conflict: true;
};
export type OptimisticSuccess<TRow> = {
  ok: true;
  row: TRow;
};

export type OptimisticResult<TRow> = OptimisticSuccess<TRow> | OptimisticConflict;

export interface OptimisticVersionArgs<TTable extends HiringTableName> {
  tableName: TTable;
  id: string;
  expectedUpdatedAt: string;
  patch: Partial<Database["public"]["Tables"][TTable]["Update"]>;
  invalidateKeys?: readonly unknown[][];
  successMessage?: string;
}

export function useOptimisticVersion<TTable extends HiringTableName>(
  options?: Omit<
    UseMutationOptions<
      OptimisticResult<Database["public"]["Tables"][TTable]["Row"]>,
      Error,
      OptimisticVersionArgs<TTable>
    >,
    "mutationFn"
  >,
) {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: async (args: OptimisticVersionArgs<TTable>) => {
      const { data, error } = await supabase
        .from(args.tableName)
        .update(args.patch as never)
        .eq("id", args.id)
        .eq("updated_at", args.expectedUpdatedAt)
        .select()
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        toast({
          title: "Este registro mudou",
          description: "Outra pessoa atualizou este item. Recarregue para ver a versão mais recente.",
          variant: "destructive",
        });
        return { ok: false, conflict: true } as const;
      }

      if (args.invalidateKeys) {
        for (const key of args.invalidateKeys) {
          await queryClient.invalidateQueries({ queryKey: [...key] });
        }
      }
      if (args.successMessage) {
        toast({ title: args.successMessage });
      }
      return {
        ok: true,
        row: data as Database["public"]["Tables"][TTable]["Row"],
      } as const;
    },
  });
}
