import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Auth from "./pages/Auth";
import Index from "./pages/Index";
import GestorDashboard from "./pages/GestorDashboard";
import RHDashboard from "./pages/RHDashboard";
import SocioDashboard from "./pages/SocioDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import CreateUser from "./pages/CreateUser";
import Evaluations from "./pages/Evaluations";
import OneOnOnes from "./pages/OneOnOnes";
import Climate from "./pages/Climate";
import DevelopmentPlans from "./pages/DevelopmentPlans";
import Profile from "./pages/Profile";
import TeamManagement from "./pages/TeamManagement";
import CompanyManagement from "./pages/CompanyManagement";
import MyTeam from "./pages/MyTeam";
import CollaboratorProfile from "./pages/CollaboratorProfile";
import DevelopmentKanban from "./pages/DevelopmentKanban";
import NotFound from "./pages/NotFound";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/hooks/useAuth";

const queryClient = new QueryClient();

const App = () => {
  const { user, loading, userRole } = useAuth();
  const isAuthenticated = !!user;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mb-4"></div>
        <p className="text-muted-foreground">Verificando autenticação...</p>
      </div>
    );
  }

  // Redireciona para o dashboard correto baseado no role
  const getDefaultRoute = () => {
    if (!isAuthenticated) return "/auth";
    
    switch (userRole) {
      case 'admin':
        return '/admin';
      case 'socio':
        return '/socio';
      case 'lider':
        return '/gestor';
      case 'rh':
        return '/rh';
      default:
        return '/colaborador';
    }
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={!isAuthenticated ? <Auth /> : <Navigate to={getDefaultRoute()} replace />} />
            <Route path="/" element={<Navigate to={getDefaultRoute()} replace />} />
            <Route path="/colaborador" element={isAuthenticated ? <Index /> : <Navigate to="/auth" />} />
            <Route 
              path="/gestor" 
              element={
                isAuthenticated ? (
                  <ProtectedRoute allowedRoles={["lider", "socio", "admin"]}>
                    <GestorDashboard />
                  </ProtectedRoute>
                ) : <Navigate to="/auth" />
              } 
            />
            <Route 
              path="/rh" 
              element={
                isAuthenticated ? (
                  <ProtectedRoute allowedRoles={["rh", "socio", "admin"]}>
                    <RHDashboard />
                  </ProtectedRoute>
                ) : <Navigate to="/auth" />
              } 
            />
            <Route 
              path="/socio" 
              element={
                isAuthenticated ? (
                  <ProtectedRoute allowedRoles={["socio", "admin"]}>
                    <SocioDashboard />
                  </ProtectedRoute>
                ) : <Navigate to="/auth" />
              } 
            />
            <Route 
              path="/admin" 
              element={
                isAuthenticated ? (
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <AdminDashboard />
                  </ProtectedRoute>
                ) : <Navigate to="/auth" />
              } 
            />
            <Route 
              path="/admin/criar-usuario" 
              element={
                isAuthenticated ? (
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <CreateUser />
                  </ProtectedRoute>
                ) : <Navigate to="/auth" />
              } 
            />
            <Route path="/avaliacoes" element={isAuthenticated ? <Evaluations /> : <Navigate to="/auth" />} />
            <Route 
              path="/11s" 
              element={
                isAuthenticated ? (
                  <ProtectedRoute allowedRoles={["lider", "gestor", "socio", "admin", "rh"]}>
                    <OneOnOnes />
                  </ProtectedRoute>
                ) : <Navigate to="/auth" />
              } 
            />
            <Route path="/clima" element={isAuthenticated ? <Climate /> : <Navigate to="/auth" />} />
            <Route path="/pdi" element={isAuthenticated ? <DevelopmentPlans /> : <Navigate to="/auth" />} />
            <Route path="/perfil" element={isAuthenticated ? <Profile /> : <Navigate to="/auth" />} />
            <Route path="/times" element={isAuthenticated ? <TeamManagement /> : <Navigate to="/auth" />} />
            <Route path="/empresas" element={isAuthenticated ? <CompanyManagement /> : <Navigate to="/auth" />} />
            <Route path="/criar-usuario" element={isAuthenticated ? <CreateUser /> : <Navigate to="/auth" />} />
            <Route 
              path="/meu-time" 
              element={
                isAuthenticated ? (
                  <ProtectedRoute allowedRoles={["lider", "gestor", "socio", "admin", "rh"]}>
                    <MyTeam />
                  </ProtectedRoute>
                ) : <Navigate to="/auth" />
              } 
            />
            <Route path="/colaborador/:userId" element={isAuthenticated ? <CollaboratorProfile /> : <Navigate to="/auth" />} />
            <Route 
              path="/kanban" 
              element={
                isAuthenticated ? (
                  <ProtectedRoute allowedRoles={["lider", "gestor", "socio", "admin", "rh"]}>
                    <DevelopmentKanban />
                  </ProtectedRoute>
                ) : <Navigate to="/auth" />
              } 
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
