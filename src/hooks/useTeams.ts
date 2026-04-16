import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type Company = {
  id: string;
  name: string;
  created_at?: string;
};

export type Team = {
  id: string;
  name: string;
  company_id: string;
  company?: Company;
};

export type TeamMember = {
  id: string;
  user_id: string;
  team_id: string;
  leader_id: string | null;
  position: string | null;
  cost: number | null;
  profile?: {
    full_name: string;
    email?: string;
  };
};

export type UserProfile = {
  id: string;
  full_name: string;
  email?: string;
  role?: string;
};

export function useTeams() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadCompanies(),
        loadTeams(),
        loadTeamMembers(),
        loadUsers(),
      ]);
    } finally {
      setLoading(false);
    }
  };

  const loadCompanies = async () => {
    const { data, error } = await supabase
      .from("companies")
      .select("*")
      .order("name");

    if (error) {
      console.error("Erro ao carregar empresas:", error);
      toast.error("Erro ao carregar empresas");
      throw error;
    }
    setCompanies(data || []);
  };

  const loadTeams = async () => {
    const { data, error } = await supabase
      .from("teams")
      .select(`
        *,
        company:companies(id, name)
      `)
      .order("name");

    if (error) {
      console.error("Erro ao carregar times:", error);
      toast.error("Erro ao carregar times");
      throw error;
    }
    setTeams(data || []);
  };

  const loadTeamMembers = async () => {
    const { data, error } = await supabase
      .from("team_members")
      .select("*");

    if (error) {
      console.error("Erro ao carregar membros dos times:", error);
      toast.error("Erro ao carregar membros dos times");
      throw error;
    }

    // Load profiles separately
    const userIds = data?.map((m) => m.user_id) || [];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", userIds);

    // Combine data
    const membersWithProfiles = (data || []).map((member) => ({
      ...member,
      profile: profiles?.find((p) => p.id === member.user_id),
    }));

    setTeamMembers(membersWithProfiles);
  };

  const loadUsers = async () => {
    const { data, error } = await supabase.functions.invoke<{ users: UserProfile[] }>("list-users");
    if (error) {
      console.error("Erro ao carregar usuários:", error);
      toast.error("Erro ao carregar usuários");
      setUsers([]);
      return;
    }
    setUsers(data?.users ?? []);
  };

  const createTeam = async (name: string, companyId: string) => {
    const { error } = await supabase.from("teams").insert({
      name,
      company_id: companyId,
    });

    if (error) {
      toast.error("Erro ao criar time");
      throw error;
    }

    toast.success("Time criado com sucesso!");
    await loadTeams();
  };

  const updateTeam = async (id: string, name: string, companyId: string) => {
    const { error } = await supabase
      .from("teams")
      .update({ name, company_id: companyId })
      .eq("id", id);

    if (error) {
      toast.error("Erro ao atualizar time");
      throw error;
    }

    toast.success("Time atualizado com sucesso!");
    await loadTeams();
  };

  const deleteTeam = async (id: string) => {
    const { error } = await supabase.from("teams").delete().eq("id", id);

    if (error) {
      toast.error("Erro ao excluir time");
      throw error;
    }

    toast.success("Time excluído com sucesso!");
    await loadTeams();
  };

  const assignLeaderToTeam = async (leaderId: string, teamId: string) => {
    try {
      // Update all members of this team to have this leader
      const { error: updateError } = await supabase
        .from("team_members")
        .update({ leader_id: leaderId })
        .eq("team_id", teamId);

      if (updateError) throw updateError;

      toast.success("Líder atribuído ao time com sucesso!");
      await loadData(); // Reload all data to refresh the view
    } catch (error) {
      console.error("Erro ao atribuir líder:", error);
      toast.error("Erro ao atribuir líder");
      throw error;
    }
  };

  const addMemberToTeam = async (
    userId: string,
    teamId: string,
    position?: string,
    cost?: number
  ) => {
    try {
      // Check if the team already has a leader
      const { data: existingMembers } = await supabase
        .from("team_members")
        .select("leader_id")
        .eq("team_id", teamId)
        .limit(1);

      const leaderId = existingMembers?.[0]?.leader_id || null;

      // Insert new member with the team's leader if one exists
      const { error } = await supabase.from("team_members").insert({
        user_id: userId,
        team_id: teamId,
        leader_id: leaderId,
        position: position || null,
        cost: cost || null,
      });

      if (error) {
        toast.error("Erro ao adicionar colaborador ao time");
        throw error;
      }

      toast.success("Colaborador adicionado ao time com sucesso!");
      await loadTeamMembers();
    } catch (error) {
      console.error("Erro ao adicionar membro:", error);
      throw error;
    }
  };

  const removeMemberFromTeam = async (memberId: string) => {
    const { error } = await supabase
      .from("team_members")
      .delete()
      .eq("id", memberId);

    if (error) {
      toast.error("Erro ao remover colaborador do time");
      throw error;
    }

    toast.success("Colaborador removido do time com sucesso!");
    await loadTeamMembers();
  };

  return {
    companies,
    teams,
    teamMembers,
    users,
    loading,
    createTeam,
    updateTeam,
    deleteTeam,
    assignLeaderToTeam,
    addMemberToTeam,
    removeMemberFromTeam,
    refresh: loadData,
  };
}
