import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { StatCard } from "@/components/StatCard";
import { TrendingUp, Users, Calendar, AlertTriangle, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { useUserProfile } from "@/hooks/useUserProfile";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

const pilaresData = [
  { name: 'Liderança', score: 4.2, status: 'green' },
  { name: 'Desenvolvimento', score: 4.0, status: 'yellow' },
  { name: 'Cultura', score: 4.5, status: 'green' },
  { name: 'Comunicação', score: 3.9, status: 'yellow' },
  { name: 'Bem-estar', score: 3.5, status: 'red' },
  { name: 'Estrutura', score: 3.7, status: 'red' },
];

const evolutionData = [
  { month: 'Jan', clima: 3.9, engajamento: 82 },
  { month: 'Fev', clima: 4.0, engajamento: 84 },
  { month: 'Mar', clima: 4.1, engajamento: 85 },
  { month: 'Abr', clima: 4.0, engajamento: 83 },
  { month: 'Mai', clima: 4.2, engajamento: 87 },
  { month: 'Jun', clima: 4.3, engajamento: 92 },
];

const alertasCriticos = [
  { type: 'calibration', message: '5 avaliações com baixa confiança', action: 'Ir para Calibração', count: 5 },
  { type: 'low-score', message: 'Líderes com score baixo: Marketing, Vendas', action: 'Ver Detalhes', count: 2 },
  { type: 'pending', message: '12 formulários mensais pendentes', action: 'Enviar Lembretes', count: 12 },
];

export default function RHDashboard() {
  const { data: profile } = useUserProfile();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  return (
    <div className="flex min-h-screen w-full bg-background">
      <Sidebar />
      
      <div className="flex-1 flex flex-col">
        <Header userName={profile?.full_name || 'RH'} onLogout={handleLogout} />
        
        <main className="flex-1 p-6 space-y-6">
          {/* Welcome Section */}
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">Dashboard Executivo</h1>
            <p className="text-muted-foreground text-lg">
              Visão estratégica da organização
            </p>
          </div>
          
          {/* Indicadores Principais */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Score Clima Geral"
              value="4.3"
              icon={TrendingUp}
              trend="up"
              trendValue="+0.2 vs ciclo anterior"
            />
            
            <StatCard
              title="Participação Pesquisa"
              value="92%"
              icon={Users}
              trend="up"
              trendValue="Meta: 85%"
            />
            
            <StatCard
              title="1:1s Realizados"
              value="85%"
              icon={Calendar}
              trend="neutral"
              trendValue="72/85 colaboradores"
            />
            
            <StatCard
              title="Colaboradores em Risco"
              value="3"
              icon={AlertTriangle}
              trend="down"
              trendValue="-2 vs mês anterior"
              className="border-destructive/20"
            />
          </div>
          
          {/* Alertas Críticos */}
          <div className="card-elevated space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-status-red" />
                Alertas Críticos
              </h2>
              <Badge variant="destructive">{alertasCriticos.length}</Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {alertasCriticos.map((alert, idx) => (
                <div key={idx} className="p-4 rounded-lg border bg-card space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">{alert.count}</Badge>
                    <AlertTriangle className="h-4 w-4 text-status-red" />
                  </div>
                  <p className="text-sm font-medium">{alert.message}</p>
                  <Button size="sm" variant="outline" className="w-full">
                    {alert.action}
                  </Button>
                </div>
              ))}
            </div>
          </div>
          
          {/* Distribuição 9BOX */}
          <div className="card-elevated space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-accent" />
                Distribuição 9BOX - 85 Colaboradores
              </h2>
              <Button variant="outline">Ver Matriz Completa</Button>
            </div>
            
            <div className="grid grid-cols-3 gap-3">
              {/* Row 3 - Alto Potencial */}
              <div className="aspect-square rounded-lg bg-status-yellow/10 border-2 border-status-yellow p-4 flex flex-col items-center justify-center hover:shadow-md transition-shadow cursor-pointer">
                <p className="text-xs font-medium text-center mb-2">Incógnita</p>
                <p className="text-3xl font-bold">8</p>
                <p className="text-xs text-muted-foreground mt-1">9%</p>
                <span className="text-xs text-status-green mt-1">↑ +2</span>
              </div>
              <div className="aspect-square rounded-lg bg-status-green/10 border-2 border-status-green p-4 flex flex-col items-center justify-center hover:shadow-md transition-shadow cursor-pointer">
                <p className="text-xs font-medium text-center mb-2">Promissor</p>
                <p className="text-3xl font-bold">18</p>
                <p className="text-xs text-muted-foreground mt-1">21%</p>
                <span className="text-xs text-status-green mt-1">↑ +3</span>
              </div>
              <div className="aspect-square rounded-lg bg-status-green/10 border-2 border-status-green p-4 flex flex-col items-center justify-center hover:shadow-md transition-shadow cursor-pointer">
                <p className="text-xs font-medium text-center mb-2">Estrela</p>
                <p className="text-3xl font-bold">12</p>
                <p className="text-xs text-muted-foreground mt-1">14%</p>
                <span className="text-xs text-status-green mt-1">↑ +2</span>
              </div>
              
              {/* Row 2 - Médio Potencial */}
              <div className="aspect-square rounded-lg bg-status-yellow/10 border-2 border-status-yellow p-4 flex flex-col items-center justify-center hover:shadow-md transition-shadow cursor-pointer">
                <p className="text-xs font-medium text-center mb-2">Zona de Risco</p>
                <p className="text-3xl font-bold">5</p>
                <p className="text-xs text-muted-foreground mt-1">6%</p>
                <span className="text-xs text-muted-foreground mt-1">→ 0</span>
              </div>
              <div className="aspect-square rounded-lg bg-status-yellow/10 border-2 border-status-yellow p-4 flex flex-col items-center justify-center hover:shadow-md transition-shadow cursor-pointer">
                <p className="text-xs font-medium text-center mb-2">Regular</p>
                <p className="text-3xl font-bold">25</p>
                <p className="text-xs text-muted-foreground mt-1">29%</p>
                <span className="text-xs text-status-red mt-1">↓ -3</span>
              </div>
              <div className="aspect-square rounded-lg bg-status-green/10 border-2 border-status-green p-4 flex flex-col items-center justify-center hover:shadow-md transition-shadow cursor-pointer">
                <p className="text-xs font-medium text-center mb-2">Confiável</p>
                <p className="text-3xl font-bold">14</p>
                <p className="text-xs text-muted-foreground mt-1">16%</p>
                <span className="text-xs text-status-green mt-1">↑ +1</span>
              </div>
              
              {/* Row 1 - Baixo Potencial */}
              <div className="aspect-square rounded-lg bg-status-red/10 border-2 border-status-red p-4 flex flex-col items-center justify-center hover:shadow-md transition-shadow cursor-pointer">
                <p className="text-xs font-medium text-center mb-2">Crítico</p>
                <p className="text-3xl font-bold">1</p>
                <p className="text-xs text-muted-foreground mt-1">1%</p>
                <span className="text-xs text-status-red mt-1">↓ -1</span>
              </div>
              <div className="aspect-square rounded-lg bg-status-yellow/10 border-2 border-status-yellow p-4 flex flex-col items-center justify-center hover:shadow-md transition-shadow cursor-pointer">
                <p className="text-xs font-medium text-center mb-2">Precisa Apoio</p>
                <p className="text-3xl font-bold">2</p>
                <p className="text-xs text-muted-foreground mt-1">2%</p>
                <span className="text-xs text-muted-foreground mt-1">→ 0</span>
              </div>
              <div className="aspect-square rounded-lg bg-status-yellow/10 border-2 border-status-yellow p-4 flex flex-col items-center justify-center hover:shadow-md transition-shadow cursor-pointer">
                <p className="text-xs font-medium text-center mb-2">Desempenho Sólido</p>
                <p className="text-3xl font-bold">0</p>
                <p className="text-xs text-muted-foreground mt-1">0%</p>
                <span className="text-xs text-muted-foreground mt-1">→ 0</span>
              </div>
            </div>
            
            <div className="flex justify-between text-xs text-muted-foreground pt-2 border-t">
              <span>← Baixo Desempenho</span>
              <span>Alto Desempenho →</span>
            </div>
          </div>
          
          {/* Pilares em Atenção */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card-elevated space-y-4">
              <h2 className="text-xl font-semibold">Pilares em Atenção (Score &lt; 3.8)</h2>
              <div className="space-y-3">
                {pilaresData.filter(p => p.status === 'red').map((pilar) => (
                  <div key={pilar.name} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{pilar.name}</span>
                      <span className="text-sm font-bold text-status-red">{pilar.score}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-status-red rounded-full"
                        style={{ width: `${(pilar.score / 5) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <Button variant="outline" className="w-full">
                Ver Planos de Ação
              </Button>
            </div>
            
            <div className="card-elevated space-y-4">
              <h2 className="text-xl font-semibold">Análise por Pilares</h2>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={pilaresData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="name" 
                    stroke="hsl(var(--muted-foreground))"
                    style={{ fontSize: '10px' }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis 
                    domain={[0, 5]}
                    stroke="hsl(var(--muted-foreground))"
                    style={{ fontSize: '12px' }}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 'var(--radius)',
                    }}
                  />
                  <Bar dataKey="score" fill="hsl(var(--accent))" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          {/* Evolução Geral */}
          <div className="card-elevated space-y-4">
            <h2 className="text-xl font-semibold">Evolução Geral - Últimos 6 Meses</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={evolutionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="month" 
                  stroke="hsl(var(--muted-foreground))"
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  yAxisId="left"
                  domain={[0, 5]}
                  stroke="hsl(var(--muted-foreground))"
                  style={{ fontSize: '12px' }}
                  label={{ value: 'Score Clima', angle: -90, position: 'insideLeft' }}
                />
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  domain={[0, 100]}
                  stroke="hsl(var(--muted-foreground))"
                  style={{ fontSize: '12px' }}
                  label={{ value: 'Engajamento %', angle: 90, position: 'insideRight' }}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 'var(--radius)',
                  }}
                />
                <Line 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="clima" 
                  stroke="hsl(var(--accent))" 
                  strokeWidth={3}
                  dot={{ fill: 'hsl(var(--accent))', r: 5 }}
                  name="Score Clima 360°"
                />
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="engajamento" 
                  stroke="hsl(var(--status-green))" 
                  strokeWidth={3}
                  dot={{ fill: 'hsl(var(--status-green))', r: 5 }}
                  name="Taxa de Engajamento"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </main>
      </div>
    </div>
  );
}
