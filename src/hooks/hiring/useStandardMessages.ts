import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import type {
  StandardMessageInsert,
  StandardMessageKind,
  StandardMessageRow,
} from "@/integrations/supabase/hiring-types";
import "@/integrations/supabase/hiring-types";

export const standardMessagesKeys = {
  all: ["hiring", "standard-messages"] as const,
  byKind: (kind: StandardMessageKind | "all") => ["hiring", "standard-messages", kind] as const,
};

export function useStandardMessages(kind?: StandardMessageKind) {
  return useQuery({
    queryKey: standardMessagesKeys.byKind(kind ?? "all"),
    queryFn: async (): Promise<StandardMessageRow[]> => {
      let q = supabase.from("standard_messages").select("*").eq("active", true).order("title");
      if (kind) q = q.eq("kind", kind);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as StandardMessageRow[];
    },
  });
}

export function useCreateStandardMessage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (payload: Omit<StandardMessageInsert, "created_by">): Promise<StandardMessageRow> => {
      if (!user?.id) throw new Error("Usuário não autenticado");
      const { data, error } = await supabase
        .from("standard_messages")
        .insert({ ...payload, created_by: user.id })
        .select()
        .single();
      if (error) throw error;
      return data as StandardMessageRow;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: standardMessagesKeys.all });
      toast({ title: "Mensagem salva" });
    },
    onError: (err: Error) => toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" }),
  });
}

export function useUpdateStandardMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (args: { id: string; patch: Partial<StandardMessageRow> }): Promise<StandardMessageRow> => {
      const { data, error } = await supabase
        .from("standard_messages")
        .update(args.patch)
        .eq("id", args.id)
        .select()
        .single();
      if (error) throw error;
      return data as StandardMessageRow;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: standardMessagesKeys.all });
      toast({ title: "Mensagem atualizada" });
    },
  });
}
