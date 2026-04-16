import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { StatCard } from "@/components/StatCard";
import { EmptyState } from "@/components/EmptyState";
import { Users, DollarSign, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useUserProfile } from "@/hooks/useUserProfile";

export default function SocioDashboard() {
  const [loading, setLoading] = useState(true);
  const [totalCost, setTotalCost] = useState(0);
  const [totalEmployees, setTotalEmployees] = useState(0);
  const [totalCompanies, setTotalCompanies] = useState(0);
  const navigate = useNavigate();
  const { data: profile } = useUserProfile();

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
      toast.error("Acesso negado: Você não tem permissão para acessar esta página.");
      navigate('/');
    }
  };

  const loadDashboardData = async () => {
    try {
      const [{ data: teamMembers }, { count: companiesCount }] = await Promise.all([
        supabase.from('team_members').select('cost'),
        supabase.from('companies').select('id', { count: 'exact', head: true }),
      ]);

      if (teamMembers) {
        const total = teamMembers.reduce((sum, member) =>
          sum + (Number(member.cost) || 0), 0
        );
        setTotalCost(total);
        setTotalEmployees(teamMembers.length);
      }
      setTotalCompanies(companiesCount ?? 0);
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
        <Header userName={profile?.full_name || 'Sócio'} onLogout={handleLogout} />
        
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
                value={totalCompanies}
                icon={Building2}
                trend="neutral"
              />
            </div>

            <div className="card-elevated p-6 space-y-4">
              <h3 className="text-lg font-semibold">Score médio geral</h3>
              <EmptyState
                title="Aguardando avaliações"
                message="A média consolidada entre empresas será exibida quando o ciclo atual de avaliações fechar."
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
                <EmptyState
                  title="Breakdown por time em breve"
                  message="A agregação de custo por time virá de team_members agrupado — assim que essa visão estiver implementada, aparece aqui."
                />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}