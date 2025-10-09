import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { ScoreGauge } from "@/components/ScoreGauge";
import { StatCard } from "@/components/StatCard";
import { EvolutionChart } from "@/components/EvolutionChart";
import { Calendar, Target, CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

const Index = () => {
  return (
    <div className="flex min-h-screen w-full bg-background">
      <Sidebar />
      
      <div className="flex-1 flex flex-col">
        <Header />
        
        <main className="flex-1 p-6 space-y-6">
          {/* Welcome Section */}
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">Olá, João Silva! 👋</h1>
            <p className="text-muted-foreground text-lg">
              Seu desenvolvimento é nossa prioridade
            </p>
          </div>
          
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="stat-card col-span-1 flex flex-col items-center justify-center py-8">
              <ScoreGauge 
                score={4.5} 
                size="md"
                label="Score Clima 360°"
              />
            </div>
            
            <StatCard
              title="Próxima Ação"
              value="1:1 em 3 dias"
              icon={Calendar}
              className="flex items-center"
            />
            
            <StatCard
              title="Progresso Mensal"
              value="85%"
              icon={Target}
              trend="up"
              trendValue="+12% vs mês anterior"
            />
          </div>
          
          {/* Evolution Chart */}
          <EvolutionChart />
          
          {/* Current Objectives */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card-elevated space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Objetivo Mensal Atual</h3>
                <Target className="h-5 w-5 text-accent" />
              </div>
              <p className="text-muted-foreground">
                Melhorar organização do projeto X
              </p>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Progresso</span>
                  <span className="font-medium">75%</span>
                </div>
                <Progress value={75} className="h-2" />
              </div>
              <Button className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
                Ver Detalhes
              </Button>
            </div>
            
            <div className="card-elevated space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Ações Pendentes</h3>
                <CheckSquare className="h-5 w-5 text-accent" />
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                  <div className="h-2 w-2 rounded-full bg-status-yellow" />
                  <span className="flex-1">Formulário Mensal 1:1</span>
                  <span className="text-xs text-muted-foreground">Vence em 2 dias</span>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                  <div className="h-2 w-2 rounded-full bg-status-red" />
                  <span className="flex-1">Pesquisa Clima 360°</span>
                  <span className="text-xs text-muted-foreground">Vence amanhã</span>
                </div>
              </div>
              <Button variant="outline" className="w-full">
                Ver Todas
              </Button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Index;
