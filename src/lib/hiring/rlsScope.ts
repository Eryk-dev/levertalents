import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

// Mirrors the DB `allowed_companies(profile_id)` helper — the list of company
// IDs the caller can act on. admin/socio/rh see all; lider sees only companies
// where they lead at least one team_member; everyone else sees none.
//
// UI uses this to pre-filter `companyId` selects so users don't see "empty"
// filter options the DB RLS would refuse anyway (plan.md T072).

export function useVisibleCompanies(): {
  companyIds: string[];
  isLoading: boolean;
  canSeeAll: boolean;
} {
  const { user, userRole } = useAuth();
  const canSeeAll = userRole === "admin" || userRole === "socio" || userRole === "rh";

  const { data: companyIds = [], isLoading } = useQuery({
    queryKey: ["visible-companies", user?.id, userRole],
    enabled: !!user?.id && !!userRole,
    queryFn: async (): Promise<string[]> => {
      if (!user?.id) return [];

      if (canSeeAll) {
        const { data, error } = await supabase.from("companies").select("id");
        if (error) throw error;
        return (data ?? []).map((c) => c.id as string);
      }

      if (userRole === "lider") {
        // team_members has leader_id; teams has company_id. Join via teams.
        const { data, error } = await supabase
          .from("team_members")
          .select("team:teams(company_id)")
          .eq("leader_id", user.id);
        if (error) throw error;
        const ids = new Set<string>();
        for (const row of data ?? []) {
          const team = (row as { team?: { company_id?: string } | null }).team;
          if (team?.company_id) ids.add(team.company_id);
        }
        return Array.from(ids);
      }

      return [];
    },
  });

  return { companyIds, isLoading, canSeeAll };
}
