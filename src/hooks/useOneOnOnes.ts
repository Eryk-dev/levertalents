import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

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
      toast({ title: "1:1 agendada com sucesso!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao agendar 1:1", description: error.message, variant: "destructive" });
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
      toast({ title: "1:1 atualizada com sucesso!" });
    },
  });

  return { oneOnOnes: oneOnOnes || [], isLoading, createOneOnOne: createOneOnOne.mutate, updateOneOnOne: updateOneOnOne.mutate };
};
