import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Auth from "./pages/Auth";
import RoleSelection from "./pages/RoleSelection";
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

const queryClient = new QueryClient();

const App = () => {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Carregando...</div>;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={!isAuthenticated ? <Auth /> : <Navigate to="/" />} />
            <Route path="/" element={isAuthenticated ? <RoleSelection /> : <Navigate to="/auth" />} />
            <Route path="/colaborador" element={isAuthenticated ? <Index /> : <Navigate to="/auth" />} />
            <Route path="/gestor" element={isAuthenticated ? <GestorDashboard /> : <Navigate to="/auth" />} />
            <Route path="/rh" element={isAuthenticated ? <RHDashboard /> : <Navigate to="/auth" />} />
            <Route path="/socio" element={isAuthenticated ? <SocioDashboard /> : <Navigate to="/auth" />} />
            <Route path="/admin" element={isAuthenticated ? <AdminDashboard /> : <Navigate to="/auth" />} />
            <Route path="/admin/criar-usuario" element={isAuthenticated ? <CreateUser /> : <Navigate to="/auth" />} />
            <Route path="/avaliacoes" element={isAuthenticated ? <Evaluations /> : <Navigate to="/auth" />} />
            <Route path="/11s" element={isAuthenticated ? <OneOnOnes /> : <Navigate to="/auth" />} />
            <Route path="/clima" element={isAuthenticated ? <Climate /> : <Navigate to="/auth" />} />
            <Route path="/pdi" element={isAuthenticated ? <DevelopmentPlans /> : <Navigate to="/auth" />} />
            <Route path="/perfil" element={isAuthenticated ? <Profile /> : <Navigate to="/auth" />} />
            <Route path="/times" element={isAuthenticated ? <TeamManagement /> : <Navigate to="/auth" />} />
            <Route path="/empresas" element={isAuthenticated ? <CompanyManagement /> : <Navigate to="/auth" />} />
            <Route path="/criar-usuario" element={isAuthenticated ? <CreateUser /> : <Navigate to="/auth" />} />
            <Route path="/meu-time" element={isAuthenticated ? <MyTeam /> : <Navigate to="/auth" />} />
            <Route path="/colaborador/:userId" element={isAuthenticated ? <CollaboratorProfile /> : <Navigate to="/auth" />} />
            <Route path="/kanban" element={isAuthenticated ? <DevelopmentKanban /> : <Navigate to="/auth" />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
