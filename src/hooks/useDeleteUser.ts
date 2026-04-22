import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type DeleteResponse = {
  success?: boolean;
  deletedUserId?: string;
  error?: string;
  raw?: string;
};

/**
 * Exclui um usuário do sistema via edge function `delete-user`.
 * Requer role admin. A função cuida das proteções: self-delete, último admin,
 * FK RESTRICT em tabelas de histórico.
 */
export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string): Promise<string> => {
      const { data, error } = await supabase.functions.invoke<DeleteResponse>("delete-user", {
        body: { userId },
      });

      // Supabase retorna error quando status != 2xx. O corpo tem `error` friendly.
      if (error) {
        const fnError = (data as DeleteResponse | null)?.error;
        throw new Error(fnError || error.message || "Erro ao excluir usuário");
      }
      if (!data?.success) {
        throw new Error(data?.error || "Erro desconhecido ao excluir");
      }
      return data.deletedUserId ?? userId;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Usuário excluído");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}
