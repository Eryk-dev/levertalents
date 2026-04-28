import { useEffect, type ReactNode } from 'react';
import { Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserProfile } from '@/hooks/useUserProfile';

const FIRST_LOGIN_PATH = '/first-login-change-password';

interface ProtectedRouteProps {
  children: ReactNode;
  /** When provided, only these roles can access this route. */
  allowedRoles?: string[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, userRole, loading } = useAuth();
  const { data: profile, isLoading: profileLoading } = useUserProfile();
  const navigate = useNavigate();
  const location = useLocation();

  // D-23 + Pitfall §4: redirect to first-login when must_change_password=true,
  // but SKIP if already on that path to avoid infinite redirect loop.
  useEffect(() => {
    if (loading || profileLoading || !user || !profile) return;
    if (profile.must_change_password && location.pathname !== FIRST_LOGIN_PATH) {
      navigate(FIRST_LOGIN_PATH, { replace: true });
    }
  }, [profile?.must_change_password, location.pathname, user, loading, profileLoading, navigate, profile]);

  if (loading || profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">Carregando...</div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Role-based access control (Phase 1 behaviour — preserved)
  if (allowedRoles && allowedRoles.length > 0 && userRole && !allowedRoles.includes(userRole)) {
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
