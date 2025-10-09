import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { StatCard } from "@/components/StatCard";
import { Users, DollarSign, Building2, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

export default function SocioDashboard() {
  const [loading, setLoading] = useState(true);
  const [totalCost, setTotalCost] = useState(0);
  const [totalEmployees, setTotalEmployees] = useState(0);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
    loadDashboardData();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/auth');
      return;
    }

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id)
      .single();

    if (roleData?.role !== 'socio') {
      toast({
        title: "Acesso negado",
        description: "Você não tem permissão para acessar esta página.",
        variant: "destructive",
      });
      navigate('/');
    }
  };

  const loadDashboardData = async () => {
    try {
      const { data: teamMembers } = await supabase
        .from('team_members')
        .select('cost');

      if (teamMembers) {
        const total = teamMembers.reduce((sum, member) => 
          sum + (Number(member.cost) || 0), 0
        );
        setTotalCost(total);
        setTotalEmployees(teamMembers.length);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Carregando...</div>;
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      
      <div className="flex-1 flex flex-col">
        <Header userName="Sócio" onLogout={handleLogout} />
        
        <main className="flex-1 p-6 overflow-auto">
          <div className="max-w-7xl mx-auto space-y-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">Dashboard do Sócio</h1>
              <p className="text-muted-foreground">Visão completa da empresa</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                title="Custo Total da Folha"
                value={`R$ ${totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                icon={DollarSign}
                trend="neutral"
              />
              
              <StatCard
                title="Total de Colaboradores"
                value={totalEmployees}
                icon={Users}
                trend="neutral"
              />
              
              <StatCard
                title="Empresas Ativas"
                value="2"
                icon={Building2}
                trend="up"
              />
              
              <StatCard
                title="Score Médio Geral"
                value="4.2/5.0"
                icon={TrendingUp}
                trend="up"
                trendValue="+0.3 vs mês anterior"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="card-elevated p-6">
                <h3 className="text-lg font-semibold mb-4">Ações Rápidas</h3>
                <div className="space-y-3">
                  <Button 
                    className="w-full justify-start" 
                    variant="outline"
                    onClick={() => navigate('/admin')}
                  >
                    <Users className="mr-2 h-4 w-4" />
                    Gerenciar Usuários e Roles
                  </Button>
                  <Button 
                    className="w-full justify-start" 
                    variant="outline"
                  >
                    <Building2 className="mr-2 h-4 w-4" />
                    Gerenciar Empresas e Times
                  </Button>
                  <Button 
                    className="w-full justify-start" 
                    variant="outline"
                  >
                    <DollarSign className="mr-2 h-4 w-4" />
                    Relatório de Custos Detalhado
                  </Button>
                </div>
              </div>

              <div className="card-elevated p-6">
                <h3 className="text-lg font-semibold mb-4">Custo por Time</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-accent/10 rounded-lg">
                    <span>Engenharia</span>
                    <span className="font-bold">R$ 45.000,00</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-accent/10 rounded-lg">
                    <span>Comercial</span>
                    <span className="font-bold">R$ 32.000,00</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-accent/10 rounded-lg">
                    <span>Marketing</span>
                    <span className="font-bold">R$ 28.000,00</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}