import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type UserWithRole = {
  id: string;
  email: string;
  username: string;
  full_name: string;
  role: string | null;
};

export function useUsers() {
  return useQuery<UserWithRole[]>({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke<{ users: UserWithRole[] }>("list-users");
      if (error) throw error;
      return data?.users ?? [];
    },
    staleTime: 2 * 60 * 1000,
  });
}
