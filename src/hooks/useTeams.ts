import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type Company = {
  id: string;
  name: string;
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

    if (error) throw error;
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

    if (error) throw error;
    setTeams(data || []);
  };

  const loadTeamMembers = async () => {
    const { data, error } = await supabase
      .from("team_members")
      .select("*");

    if (error) throw error;

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
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name");

    if (!profiles) {
      setUsers([]);
      return;
    }

    const { data: authData } = await supabase.auth.admin.listUsers();
    const authUsers = authData?.users || [];

    const usersWithRoles = await Promise.all(
      profiles.map(async (profile) => {
        const authUser = authUsers.find((u) => u.id === profile.id);
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", profile.id)
          .maybeSingle();

        return {
          id: profile.id,
          full_name: profile.full_name,
          email: authUser?.email,
          role: roleData?.role,
        };
      })
    );

    setUsers(usersWithRoles);
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
    // Update all members of this team to have this leader
    const { error } = await supabase
      .from("team_members")
      .update({ leader_id: leaderId })
      .eq("team_id", teamId);

    if (error) {
      toast.error("Erro ao atribuir líder");
      throw error;
    }

    toast.success("Líder atribuído ao time com sucesso!");
    await loadTeamMembers();
  };

  const addMemberToTeam = async (
    userId: string,
    teamId: string,
    position?: string,
    cost?: number
  ) => {
    const { error } = await supabase.from("team_members").insert({
      user_id: userId,
      team_id: teamId,
      position: position || null,
      cost: cost || null,
    });

    if (error) {
      toast.error("Erro ao adicionar colaborador ao time");
      throw error;
    }

    toast.success("Colaborador adicionado ao time com sucesso!");
    await loadTeamMembers();
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
