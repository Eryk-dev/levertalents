import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import type {
  BackgroundCheckRow,
  BackgroundStatus,
} from "@/integrations/supabase/hiring-types";
import "@/integrations/supabase/hiring-types";

export const backgroundCheckKeys = {
  byApplication: (applicationId: string) => ["hiring", "background-check", applicationId] as const,
};

export function useBackgroundCheck(applicationId: string | undefined) {
  return useQuery({
    queryKey: backgroundCheckKeys.byApplication(applicationId ?? "none"),
    enabled: !!applicationId,
    queryFn: async (): Promise<BackgroundCheckRow | null> => {
      if (!applicationId) return null;
      const { data, error } = await supabase
        .from("background_checks")
        .select("*")
        .eq("application_id", applicationId)
        .maybeSingle();
      if (error) throw error;
      return (data as BackgroundCheckRow) ?? null;
    },
  });
}

export function useUploadBackgroundCheck() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (args: {
      applicationId: string;
      candidateId: string;
      companyId: string;
      jobOpeningId: string;
      statusFlag: BackgroundStatus;
      note?: string;
      file?: File;
    }): Promise<BackgroundCheckRow> => {
      if (!user?.id) throw new Error("Usuário não autenticado");
      let filePath: string | null = null;
      if (args.file) {
        const ext = args.file.name.split(".").pop() || "pdf";
        const uuid = crypto.randomUUID();
        filePath = `companies/${args.companyId}/jobs/${args.jobOpeningId}/candidates/${args.candidateId}/background/${uuid}.${ext}`;
        const { error: upErr } = await supabase.storage.from("hiring").upload(filePath, args.file, { upsert: true });
        if (upErr) throw upErr;
      }
      const { data: existing } = await supabase
        .from("background_checks")
        .select("id")
        .eq("application_id", args.applicationId)
        .maybeSingle();
      if (existing?.id) {
        const { data, error } = await supabase
          .from("background_checks")
          .update({
            status_flag: args.statusFlag,
            note: args.note ?? null,
            file_path: filePath ?? undefined,
            uploaded_by: user.id,
            uploaded_at: new Date().toISOString(),
          })
          .eq("id", existing.id)
          .select()
          .single();
        if (error) throw error;
        return data as BackgroundCheckRow;
      }
      const { data, error } = await supabase
        .from("background_checks")
        .insert({
          application_id: args.applicationId,
          status_flag: args.statusFlag,
          note: args.note ?? null,
          file_path: filePath,
          uploaded_by: user.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data as BackgroundCheckRow;
    },
    onSuccess: async (_, args) => {
      await queryClient.invalidateQueries({ queryKey: backgroundCheckKeys.byApplication(args.applicationId) });
      toast({ title: "Antecedentes atualizados" });
    },
    onError: (err: Error) =>
      toast({ title: "Erro ao enviar antecedentes", description: err.message, variant: "destructive" }),
  });
}
