import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { EmptyState } from "@/components/EmptyState";
import { AlertTriangle, BarChart3, TrendingUp } from "lucide-react";
import { useUserProfile } from "@/hooks/useUserProfile";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

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
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">Dashboard Executivo</h1>
            <p className="text-muted-foreground text-lg">
              Visão estratégica da organização
            </p>
          </div>

          <div className="card-elevated space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-accent" />
              Indicadores principais
            </h2>
            <EmptyState
              title="Aguardando dados reais"
              message="Score de clima, participação, 1:1s e colaboradores em risco aparecerão aqui quando houver avaliações, pesquisas e reuniões registradas."
            />
          </div>

          <div className="card-elevated space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-status-red" />
              Alertas críticos
            </h2>
            <EmptyState
              title="Sem alertas"
              message="Avaliações de baixa confiança, líderes com score baixo e formulários pendentes serão listados aqui."
            />
          </div>

          <div className="card-elevated space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-accent" />
              Distribuição 9BOX
            </h2>
            <EmptyState
              title="Matriz indisponível"
              message="A distribuição dos colaboradores pelos 9 quadrantes exige um ciclo de avaliação fechado — assim que houver, ela aparece aqui."
            />
          </div>

          <div className="card-elevated space-y-4">
            <h2 className="text-xl font-semibold">Evolução geral</h2>
            <EmptyState
              title="Sem histórico ainda"
              message="Tendência de clima e engajamento nos últimos meses será traçada quando houver ao menos duas pesquisas fechadas."
            />
          </div>
        </main>
      </div>
    </div>
  );
}
