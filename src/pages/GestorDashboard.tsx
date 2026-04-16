import { supabase } from "@/integrations/supabase/client";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { EmptyState } from "@/components/EmptyState";
import { AlertTriangle, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useLeaderAlerts } from "@/hooks/useLeaderAlerts";

export default function GestorDashboard() {
  const { data: profile } = useUserProfile();
  const navigate = useNavigate();
  const { data: alerts = [], isLoading: isLoadingAlerts } = useLeaderAlerts(profile?.id);

  // Busca os membros da equipe do líder logado
  const { data: rawTeamMembers = [], isLoading: isLoadingTeam } = useQuery({
    queryKey: ['team-members-raw', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      
      const { data, error } = await supabase
        .from('team_members')
        .select('id, user_id, position')
        .eq('leader_id', profile.id);

      if (error) {
        console.error('Error fetching team members:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!profile?.id,
  });

  // Busca os perfis dos membros da equipe
  const userIds = rawTeamMembers.map((m: any) => m.user_id);
  const { data: memberProfiles = [] } = useQuery({
    queryKey: ['member-profiles', userIds],
    queryFn: async () => {
      if (userIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);

      if (error) {
        console.error('Error fetching profiles:', error);
        return [];
      }
      return data || [];
    },
    enabled: userIds.length > 0,
  });

  // Combina os dados
  const teamMembers: any[] = rawTeamMembers.map((tm: any) => {
    const memberProfile = memberProfiles.find((p: any) => p.id === tm.user_id);
    return {
      ...tm,
      profiles: memberProfile
    };
  });

  const isLoading = isLoadingTeam;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/auth';
  };

  return (
    <div className="flex min-h-screen w-full bg-background">
      <Sidebar />
      
      <div className="flex-1 flex flex-col">
        <Header userName={profile?.full_name || 'Gestor'} onLogout={handleLogout} />
        
        <main className="flex-1 p-6 space-y-6 overflow-auto">
          {/* Welcome Section */}
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">Olá, Gestor</h1>
            <p className="text-muted-foreground text-lg">
              Gerencie sua equipe e acompanhe o desempenho
            </p>
          </div>
          
          {/* Alertas Críticos */}
          <div className="card-elevated space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-status-red" />
                Alertas Críticos
              </h2>
              <Badge variant="destructive">{alerts.length}</Badge>
            </div>
            {isLoadingAlerts ? (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
              </div>
            ) : alerts.length === 0 ? (
              <div className="text-center p-8 text-muted-foreground">
                <p>Nenhum alerta crítico no momento.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {alerts.map((alert, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                    <p className="text-sm font-medium">{alert.message}</p>
                    <Button size="sm" variant="outline" className="border-destructive text-destructive hover:bg-destructive hover:text-white">
                      {alert.action}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Indicadores do Time — empty state até ter cálculo real */}
          <div className="card-elevated space-y-4">
            <h2 className="text-xl font-semibold">Indicadores do time</h2>
            <EmptyState
              title="Aguardando dados reais"
              message="Reuniões 1:1 realizadas, score médio do time e taxa de engajamento serão calculados a partir das avaliações e 1:1s registradas."
            />
          </div>

          {/* Minha Equipe */}
          <div className="card-elevated space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Minha Equipe</h2>
              <Badge>{teamMembers.length} membros</Badge>
            </div>
            
            {isLoading ? (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
              </div>
            ) : teamMembers.length === 0 ? (
              <div className="text-center p-8 text-muted-foreground">
                <p>Você ainda não possui membros na sua equipe.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {teamMembers.map((member: any) => {
                  const memberProfile = member.profiles;
                  const initials = memberProfile?.full_name
                    ?.split(' ')
                    .map((n: string) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2) || '??';
                  
                  return (
                    <div key={member.id} className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow">
                      <div className="flex items-start gap-4">
                        <Avatar className="h-12 w-12">
                          <AvatarFallback className="bg-accent text-accent-foreground font-semibold">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 space-y-2">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-semibold">{memberProfile?.full_name || 'Nome não disponível'}</h3>
                              <p className="text-sm text-muted-foreground">{member.position || 'Cargo não definido'}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between pt-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => navigate(`/colaborador/${member.user_id}`)}
                            >
                              Ver Perfil
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          
          {/* Matriz 9BOX — empty state até o ciclo de avaliação gerar dados */}
          <div className="card-elevated space-y-3">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-accent" />
              Matriz 9BOX
            </h2>
            <EmptyState
              title="Matriz indisponível"
              message="A distribuição do time pelos 9 quadrantes será gerada quando o ciclo de avaliação atual for fechado."
            />
          </div>
        </main>
      </div>
    </div>
  );
}