import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: string[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { userRole, loading } = useAuth();

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Carregando...</div>;
  }

  if (!userRole || !allowedRoles.includes(userRole)) {
    // Redireciona para a rota correta do usuário baseado no seu role
    const redirectPath = 
      userRole === 'admin' ? '/admin' :
      userRole === 'socio' ? '/socio' :
      userRole === 'lider' ? '/gestor' :
      userRole === 'rh' ? '/rh' :
      '/colaborador';
    
    return <Navigate to={redirectPath} replace />;
  }

  return <>{children}</>;
}
