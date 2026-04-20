import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type {
  ContractType,
  EmployeeOnboardingHandoffRow,
} from "@/integrations/supabase/hiring-types";
import "@/integrations/supabase/hiring-types";

export const handoffKeys = {
  byApplication: (applicationId: string) => ["hiring", "handoff", applicationId] as const,
};

export function useHandoffByApplication(applicationId: string | undefined) {
  return useQuery({
    queryKey: handoffKeys.byApplication(applicationId ?? "none"),
    enabled: !!applicationId,
    queryFn: async (): Promise<EmployeeOnboardingHandoffRow | null> => {
      if (!applicationId) return null;
      const { data, error } = await supabase
        .from("employee_onboarding_handoffs")
        .select("*")
        .eq("application_id", applicationId)
        .maybeSingle();
      if (error) throw error;
      return (data as EmployeeOnboardingHandoffRow) ?? null;
    },
  });
}

export interface StartAdmissionArgs {
  applicationId: string;
  expectedUpdatedAt: string;
  teamId: string | null;
  leaderId: string | null;
  startDate: string | null;
  contractType: ContractType | null;
  costCents: number | null;
  finalTitle: string | null;
}

export function useStartAdmission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      args: StartAdmissionArgs,
    ): Promise<{ profile_id: string; handoff_id: string; updated_at: string }> => {
      const { data, error } = await supabase.functions.invoke("hiring-approve-application", {
        body: {
          application_id: args.applicationId,
          expected_updated_at: args.expectedUpdatedAt,
          team_id: args.teamId,
          leader_id: args.leaderId,
          start_date: args.startDate,
          contract_type: args.contractType,
          cost_cents: args.costCents,
          final_title: args.finalTitle,
        },
      });
      if (error) throw error;
      return data as { profile_id: string; handoff_id: string; updated_at: string };
    },
    onSuccess: async (_, args) => {
      await queryClient.invalidateQueries({ queryKey: handoffKeys.byApplication(args.applicationId) });
      await queryClient.invalidateQueries({ queryKey: ["hiring", "applications"] });
      toast({ title: "Admissão iniciada" });
    },
    onError: (err: Error) =>
      toast({ title: "Erro ao iniciar admissão", description: err.message, variant: "destructive" }),
  });
}

export function useCompleteAdmission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (args: { handoffId: string; applicationId: string }): Promise<void> => {
      const now = new Date().toISOString();
      const { error: handoffErr } = await supabase
        .from("employee_onboarding_handoffs")
        .update({ onboarded_at: now })
        .eq("id", args.handoffId);
      if (handoffErr) throw handoffErr;
      const { error: stageErr } = await supabase
        .from("applications")
        .update({ stage: "admitido", closed_at: now })
        .eq("id", args.applicationId);
      if (stageErr) throw stageErr;
    },
    onSuccess: async (_, args) => {
      await queryClient.invalidateQueries({ queryKey: handoffKeys.byApplication(args.applicationId) });
      await queryClient.invalidateQueries({ queryKey: ["hiring", "applications"] });
      toast({ title: "Admissão concluída" });
    },
    onError: (err: Error) =>
      toast({ title: "Erro ao concluir admissão", description: err.message, variant: "destructive" }),
  });
}
