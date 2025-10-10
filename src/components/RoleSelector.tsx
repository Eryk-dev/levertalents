import { Button } from "@/components/ui/button";
import { Users, Briefcase, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export function RoleSelector() {
  const navigate = useNavigate();
  const { userRole } = useAuth();
  
  const handleRoleClick = (targetRole: string, path: string) => {
    // Map de roles permitidas
    const rolePermissions: Record<string, string[]> = {
      'colaborador': ['colaborador'],
      'lider': ['colaborador', 'gestor'],
      'rh': ['colaborador', 'rh'],
      'socio': ['colaborador', 'gestor', 'rh', 'socio'],
      'admin': ['colaborador', 'gestor', 'rh', 'socio', 'admin']
    };

    const allowedRoles = rolePermissions[userRole || 'colaborador'] || ['colaborador'];
    
    if (!allowedRoles.includes(targetRole)) {
      toast.error("Você não tem permissão para acessar esta área");
      return;
    }
    
    navigate(path);
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-4xl space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold">Bem-vindo ao Lever Talents</h1>
          <p className="text-xl text-muted-foreground">
            Selecione seu perfil para acessar o dashboard
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <button
            onClick={() => handleRoleClick('colaborador', '/colaborador')}
            className="group relative overflow-hidden rounded-2xl border-2 border-border bg-card p-8 text-left transition-all hover:border-accent hover:shadow-lg"
          >
            <div className="space-y-4">
              <div className="rounded-xl bg-accent/10 w-16 h-16 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                <Users className="h-8 w-8 text-accent" />
              </div>
              <div>
                <h3 className="text-2xl font-bold mb-2">Colaborador</h3>
                <p className="text-muted-foreground">
                  Visualize sua evolução, responda avaliações e acompanhe seu desenvolvimento
                </p>
              </div>
            </div>
          </button>
          
          <button
            onClick={() => handleRoleClick('gestor', '/gestor')}
            className="group relative overflow-hidden rounded-2xl border-2 border-border bg-card p-8 text-left transition-all hover:border-accent hover:shadow-lg"
          >
            <div className="space-y-4">
              <div className="rounded-xl bg-accent/10 w-16 h-16 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                <Briefcase className="h-8 w-8 text-accent" />
              </div>
              <div>
                <h3 className="text-2xl font-bold mb-2">Gestor</h3>
                <p className="text-muted-foreground">
                  Gerencie sua equipe, conduza 1:1s e identifique pontos de desenvolvimento
                </p>
              </div>
            </div>
          </button>
          
          <button
            onClick={() => handleRoleClick('rh', '/rh')}
            className="group relative overflow-hidden rounded-2xl border-2 border-border bg-card p-8 text-left transition-all hover:border-accent hover:shadow-lg"
          >
            <div className="space-y-4">
              <div className="rounded-xl bg-accent/10 w-16 h-16 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                <Shield className="h-8 w-8 text-accent" />
              </div>
              <div>
                <h3 className="text-2xl font-bold mb-2">RH</h3>
                <p className="text-muted-foreground">
                  Acesse dashboards executivos e visão estratégica da organização
                </p>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
