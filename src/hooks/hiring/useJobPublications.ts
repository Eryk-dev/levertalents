import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import type {
  JobExternalPublicationInsert,
  JobExternalPublicationRow,
} from "@/integrations/supabase/hiring-types";
import { jobOpeningsKeys } from "./useJobOpenings";
import "@/integrations/supabase/hiring-types";

export function useAddJobPublication() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (
      payload: Omit<JobExternalPublicationInsert, "published_by">,
    ): Promise<JobExternalPublicationRow> => {
      if (!user?.id) throw new Error("Usuário não autenticado");
      const { data, error } = await supabase
        .from("job_external_publications")
        .insert({ ...payload, published_by: user.id })
        .select()
        .single();
      if (error) throw error;
      return data as JobExternalPublicationRow;
    },
    onSuccess: async (row) => {
      await queryClient.invalidateQueries({ queryKey: jobOpeningsKeys.detail(row.job_opening_id) });
      toast({ title: "Publicação registrada" });
    },
    onError: (err: Error) =>
      toast({ title: "Erro ao registrar", description: err.message, variant: "destructive" }),
  });
}

export function useDeleteJobPublication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (args: { id: string; jobOpeningId: string }): Promise<void> => {
      const { error } = await supabase.from("job_external_publications").delete().eq("id", args.id);
      if (error) throw error;
    },
    onSuccess: async (_, args) => {
      await queryClient.invalidateQueries({ queryKey: jobOpeningsKeys.detail(args.jobOpeningId) });
      toast({ title: "Link removido" });
    },
  });
}
