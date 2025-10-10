import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { ScoreGauge } from "@/components/ScoreGauge";
import { StatCard } from "@/components/StatCard";
import { EvolutionChart } from "@/components/EvolutionChart";
import { Calendar, Target, CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: nextOneOnOne } = useQuery({
    queryKey: ['nextOneOnOne', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('one_on_ones')
        .select(`
          *,
          leader:leader_id(full_name),
          collaborator:collaborator_id(full_name)
        `)
        .eq('collaborator_id', user.id)
        .eq('status', 'scheduled')
        .gte('scheduled_date', new Date().toISOString())
        .order('scheduled_date', { ascending: true })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: activePDIs } = useQuery({
    queryKey: ['activePDIs', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from('development_plans')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['in_progress', 'pending_approval'])
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!user?.id,
  });

  const { data: pendingTasks } = useQuery({
    queryKey: ['pendingTasks', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from('pending_tasks')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .order('due_date', { ascending: true })
        .limit(2);
      return data || [];
    },
    enabled: !!user?.id,
  });

  const getNextOneOnOneText = () => {
    if (!nextOneOnOne) return "Sem 1:1 agendado";
    const scheduledDate = new Date(nextOneOnOne.scheduled_date);
    const today = new Date();
    const diffTime = scheduledDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "1:1 hoje";
    if (diffDays === 1) return "1:1 amanhã";
    return `1:1 em ${diffDays} dias`;
  };

  const averageProgress = activePDIs && activePDIs.length > 0
    ? Math.round(activePDIs.reduce((acc, pdi) => acc + (pdi.progress_percentage || 0), 0) / activePDIs.length)
    : 0;
  return (
    <div className="flex min-h-screen w-full bg-background">
      <Sidebar />
      
      <div className="flex-1 flex flex-col">
        <Header />
        
        <main className="flex-1 p-6 space-y-6">
          {/* Welcome Section */}
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">Olá, {profile?.full_name || 'Colaborador'}! 👋</h1>
            <p className="text-muted-foreground text-lg">
              Seu desenvolvimento é nossa prioridade
            </p>
          </div>
          
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <StatCard
              title="PDIs Ativos"
              value={activePDIs?.length.toString() || "0"}
              icon={Target}
              className="flex items-center"
            />
            
            <StatCard
              title="Próxima Ação"
              value={getNextOneOnOneText()}
              icon={Calendar}
              className="flex items-center"
            />
            
            <StatCard
              title="Progresso Médio"
              value={`${averageProgress}%`}
              icon={CheckSquare}
            />
          </div>
          
          {/* Evolution Chart */}
          <EvolutionChart />
          
          {/* Current Objectives */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card-elevated space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">PDI Mais Recente</h3>
                <Target className="h-5 w-5 text-accent" />
              </div>
              {activePDIs && activePDIs.length > 0 ? (
                <>
                  <p className="text-muted-foreground">
                    {activePDIs[0].title}
                  </p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Progresso</span>
                      <span className="font-medium">{activePDIs[0].progress_percentage || 0}%</span>
                    </div>
                    <Progress value={activePDIs[0].progress_percentage || 0} className="h-2" />
                  </div>
                  <Button 
                    onClick={() => navigate('/pdi')}
                    className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
                  >
                    Ver Detalhes
                  </Button>
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum PDI ativo no momento
                </div>
              )}
            </div>
            
            <div className="card-elevated space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Ações Pendentes</h3>
                <CheckSquare className="h-5 w-5 text-accent" />
              </div>
              {pendingTasks && pendingTasks.length > 0 ? (
                <>
                  <div className="space-y-3">
                    {pendingTasks.map((task) => {
                      const dueDate = task.due_date ? new Date(task.due_date) : null;
                      const today = new Date();
                      const isOverdue = dueDate && dueDate < today;
                      const daysUntilDue = dueDate 
                        ? Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                        : null;
                      
                      return (
                        <div key={task.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                          <div className={`h-2 w-2 rounded-full ${
                            isOverdue ? 'bg-status-red' : 
                            daysUntilDue && daysUntilDue <= 1 ? 'bg-status-yellow' : 
                            'bg-status-green'
                          }`} />
                          <span className="flex-1">{task.title}</span>
                          <span className="text-xs text-muted-foreground">
                            {dueDate ? (
                              isOverdue ? 'Atrasado' :
                              daysUntilDue === 0 ? 'Vence hoje' :
                              daysUntilDue === 1 ? 'Vence amanhã' :
                              `Vence em ${daysUntilDue} dias`
                            ) : 'Sem prazo'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <Button variant="outline" className="w-full">
                    Ver Todas
                  </Button>
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma ação pendente
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Index;
