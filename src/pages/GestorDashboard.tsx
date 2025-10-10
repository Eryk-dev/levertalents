import { supabase } from "@/integrations/supabase/client";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { StatCard } from "@/components/StatCard";
import { Users, AlertTriangle, Calendar, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useUserProfile } from "@/hooks/useUserProfile";

const teamMembers = [
  { id: 1, name: "Ana Santos", role: "Desenvolvedora", quadrant: "Estrela", score: 4.7, avatar: "AS", next11: "2 dias", risk: false },
  { id: 2, name: "Carlos Lima", role: "Designer", quadrant: "Promissor", score: 4.2, avatar: "CL", next11: "5 dias", risk: false },
  { id: 3, name: "Maria Costa", role: "QA", quadrant: "Regular", score: 3.5, avatar: "MC", next11: "Pendente", risk: true },
  { id: 4, name: "Pedro Silva", role: "DevOps", quadrant: "Confiável", score: 4.5, avatar: "PS", next11: "1 dia", risk: false },
];

const alerts = [
  { type: "gap", message: "Gap crítico: Ana Santos (2 níveis de diferença)", action: "Calibrar" },
  { type: "score", message: "Score baixo: Maria Costa (3.5)", action: "Agendar 1:1" },
  { type: "pending", message: "2 formulários mensais pendentes", action: "Enviar lembretes" },
];

export default function GestorDashboard() {
  const { data: profile } = useUserProfile();

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
          </div>
          
          {/* Indicadores do Time */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard
              title="Reuniões 1:1 Realizadas"
              value="6/8"
              icon={Calendar}
              trend="neutral"
              trendValue="75% de conclusão"
            />
            
            <StatCard
              title="Score Médio do Time"
              value="4.1"
              icon={TrendingUp}
              trend="up"
              trendValue="+0.3 vs trimestre anterior"
            />
            
            <StatCard
              title="Taxa de Engajamento"
              value="87%"
              icon={Users}
              trend="up"
              trendValue="+5% este mês"
            />
          </div>

          {/* Minha Equipe */}
          <div className="card-elevated space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Minha Equipe</h2>
              <Badge>{teamMembers.length} membros</Badge>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {teamMembers.map((member) => (
                <div key={member.id} className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-accent text-accent-foreground font-semibold">
                        {member.avatar}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold">{member.name}</h3>
                          <p className="text-sm text-muted-foreground">{member.role}</p>
                        </div>
                        {member.risk && (
                          <Badge variant="destructive" className="text-xs">
                            Risco
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">9BOX: </span>
                          <span className="font-medium">{member.quadrant}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Score: </span>
                          <span className="font-medium">{member.score}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between pt-2">
                        <span className="text-xs text-muted-foreground">
                          Próxima 1:1: {member.next11}
                        </span>
                        <Button size="sm" variant="outline">
                          Ver Perfil
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Mini Matriz 9BOX - Compacta */}
          <div className="card-elevated space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Matriz 9BOX</h2>
              <Button variant="outline" size="sm">Ver Detalhes</Button>
            </div>
            
            <div className="grid grid-cols-3 gap-1 max-w-md">
              {/* Row 3 - Alto */}
              <div className="aspect-square rounded bg-status-green/10 border border-status-green p-1 flex flex-col items-center justify-center">
                <p className="text-[9px] font-medium text-center leading-tight">Incógnita</p>
                <p className="text-sm font-bold">0</p>
              </div>
              <div className="aspect-square rounded bg-status-green/10 border border-status-green p-1 flex flex-col items-center justify-center">
                <p className="text-[9px] font-medium text-center leading-tight">Promissor</p>
                <p className="text-sm font-bold">2</p>
              </div>
              <div className="aspect-square rounded bg-status-green/10 border border-status-green p-1 flex flex-col items-center justify-center">
                <p className="text-[9px] font-medium text-center leading-tight">Estrela</p>
                <p className="text-sm font-bold">1</p>
              </div>
              
              {/* Row 2 - Médio */}
              <div className="aspect-square rounded bg-status-yellow/10 border border-status-yellow p-1 flex flex-col items-center justify-center">
                <p className="text-[9px] font-medium text-center leading-tight">Zona Risco</p>
                <p className="text-sm font-bold">0</p>
              </div>
              <div className="aspect-square rounded bg-status-yellow/10 border border-status-yellow p-1 flex flex-col items-center justify-center">
                <p className="text-[9px] font-medium text-center leading-tight">Regular</p>
                <p className="text-sm font-bold">3</p>
              </div>
              <div className="aspect-square rounded bg-status-green/10 border border-status-green p-1 flex flex-col items-center justify-center">
                <p className="text-[9px] font-medium text-center leading-tight">Confiável</p>
                <p className="text-sm font-bold">2</p>
              </div>
              
              {/* Row 1 - Baixo */}
              <div className="aspect-square rounded bg-status-red/10 border border-status-red p-1 flex flex-col items-center justify-center">
                <p className="text-[9px] font-medium text-center leading-tight">Crítico</p>
                <p className="text-sm font-bold">0</p>
              </div>
              <div className="aspect-square rounded bg-status-yellow/10 border border-status-yellow p-1 flex flex-col items-center justify-center">
                <p className="text-[9px] font-medium text-center leading-tight">Precisa Apoio</p>
                <p className="text-sm font-bold">0</p>
              </div>
              <div className="aspect-square rounded bg-status-yellow/10 border border-status-yellow p-1 flex flex-col items-center justify-center">
                <p className="text-[9px] font-medium text-center leading-tight">Desempenho</p>
                <p className="text-sm font-bold">0</p>
              </div>
            </div>
            
            <div className="flex justify-between text-[10px] text-muted-foreground max-w-md">
              <span>← Baixo Potencial</span>
              <span>Alto Potencial →</span>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}