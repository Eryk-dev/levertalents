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

      // Quando a edge function retorna non-2xx, o supabase-js seta `error` mas
      // o body JSON não vem em `data`. É preciso extrair via error.context.
      if (error) {
        let serverMessage: string | undefined;
        const ctx = (error as { context?: Response }).context;
        if (ctx && typeof ctx.json === "function") {
          try {
            const body = await ctx.clone().json();
            serverMessage = body?.error || body?.message;
          } catch {
            /* noop — body não é JSON, usa error.message */
          }
        }
        throw new Error(serverMessage || error.message || "Erro ao excluir usuário");
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
