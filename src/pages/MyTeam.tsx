import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUserProfile } from "@/hooks/useUserProfile";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Users, Mail, Phone, Briefcase } from "lucide-react";

export default function MyTeam() {
  const navigate = useNavigate();
  const { data: profile } = useUserProfile();

  // Busca os membros da equipe
  const { data: rawTeamMembers = [], isLoading: isLoadingTeam } = useQuery({
    queryKey: ["my-team-members", profile?.id],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data } = await supabase
        .from("team_members")
        .select('id, user_id, position, team_id')
        .eq("leader_id", user.id);

      return data || [];
    },
    refetchOnMount: true,
    enabled: !!profile?.id,
  });

  // Busca os perfis dos membros
  const userIds = rawTeamMembers.map((m: any) => m.user_id);
  const { data: memberProfiles = [] } = useQuery({
    queryKey: ['team-member-profiles', userIds],
    queryFn: async () => {
      if (userIds.length === 0) return [];
      
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, phone, department, hire_date')
        .in('id', userIds);

      return data || [];
    },
    enabled: userIds.length > 0,
  });

  // Busca os times
  const teamIds = [...new Set(rawTeamMembers.map((m: any) => m.team_id))];
  const { data: teams = [] } = useQuery({
    queryKey: ['teams-info', teamIds],
    queryFn: async () => {
      if (teamIds.length === 0) return [];
      
      const { data } = await supabase
        .from('teams')
        .select('id, name')
        .in('id', teamIds);

      return data || [];
    },
    enabled: teamIds.length > 0,
  });

  // Combina os dados
  const teamMembers = rawTeamMembers.map((tm: any) => {
    const userProfile = memberProfiles.find((p: any) => p.id === tm.user_id);
    const team = teams.find((t: any) => t.id === tm.team_id);
    return {
      ...tm,
      user: userProfile,
      team: team
    };
  });

  const isLoading = isLoadingTeam;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header userName={profile?.full_name} onLogout={handleLogout} />
        <main className="flex-1 p-8 bg-background">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold flex items-center gap-2">
                  <Users className="h-8 w-8" />
                  Meu Time
                </h1>
                <p className="text-muted-foreground mt-1">
                  Gerencie e acompanhe o desenvolvimento da sua equipe
                </p>
              </div>
            </div>

            {isLoading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="h-48" />
                  </Card>
                ))}
              </div>
            ) : teamMembers && teamMembers.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {teamMembers.map((member: any) => (
                  <Card key={member.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-center gap-4">
                        <Avatar className="h-16 w-16">
                          <AvatarImage src={member.user?.avatar_url} />
                          <AvatarFallback>{member.user?.full_name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <CardTitle className="text-lg">{member.user?.full_name}</CardTitle>
                          <p className="text-sm text-muted-foreground">{member.position || "Colaborador"}</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {member.user?.phone && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">{member.user.phone}</span>
                        </div>
                      )}
                      {member.user?.department && (
                        <div className="flex items-center gap-2 text-sm">
                          <Briefcase className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">{member.user.department}</span>
                        </div>
                      )}
                      <Button 
                        className="w-full mt-4" 
                        onClick={() => navigate(`/colaborador/${member.user_id}`)}
                      >
                        Ver Perfil Completo
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Users className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground text-center">
                    Você ainda não possui membros em sua equipe
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}