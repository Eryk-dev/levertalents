import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface OneOnOne {
  id: string;
  leader_id: string;
  collaborator_id: string;
  scheduled_date: string;
  duration_minutes: number;
  status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';
  agenda: string;
  notes: string;
  leader_feedback: string;
  collaborator_feedback: string;
  meeting_structure?: any;
  created_at: string;
  updated_at: string;
  leader?: { id: string; full_name: string; avatar_url: string | null };
  collaborator?: { id: string; full_name: string; avatar_url: string | null };
}

export const useOneOnOnes = () => {
  const queryClient = useQueryClient();

  const { data: oneOnOnes, isLoading } = useQuery({
    queryKey: ["one_on_ones"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("one_on_ones")
        .select(`
          *,
          leader:profiles!one_on_ones_leader_id_fkey(id, full_name, avatar_url),
          collaborator:profiles!one_on_ones_collaborator_id_fkey(id, full_name, avatar_url)
        `)
        .order("scheduled_date", { ascending: true });

      if (error) throw error;
      return data as OneOnOne[];
    },
  });

  const createOneOnOne = useMutation({
    mutationFn: async (input: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("one_on_ones")
        .insert([{ ...input, leader_id: user.id }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["one_on_ones"] });
      toast.success("1:1 agendada com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao criar 1:1:", error);
      toast.error("Erro ao agendar 1:1: " + error.message);
    },
  });

  const updateOneOnOne = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<OneOnOne> }) => {
      const { data, error } = await supabase
        .from("one_on_ones")
        .update(input)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["one_on_ones"] });
      toast.success("1:1 atualizada com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao atualizar 1:1:", error);
      toast.error("Erro ao atualizar 1:1: " + error.message);
    },
  });

  const deleteOneOnOne = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("one_on_ones")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["one_on_ones"] });
      toast.success("1:1 excluída com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao excluir 1:1:", error);
      toast.error("Erro ao excluir 1:1: " + error.message);
    },
  });

  return { 
    oneOnOnes: oneOnOnes || [], 
    isLoading, 
    createOneOnOne: createOneOnOne.mutate, 
    updateOneOnOne: updateOneOnOne.mutate,
    deleteOneOnOne: deleteOneOnOne.mutate
  };
};
