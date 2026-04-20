import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type PendingTask = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  task_type: string;
  related_id: string | null;
  priority: string;
  due_date: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

export function usePendingTasks() {
  return useQuery({
    queryKey: ["pending-tasks"],
    queryFn: async (): Promise<PendingTask[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("pending_tasks")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "pending")
        .order("due_date", { ascending: true, nullsFirst: false })
        .order("priority", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    staleTime: 60 * 1000,
  });
}
