import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
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

const NineBoxPage = lazy(() => import("./pages/NineBoxPage"));
const JobOpenings = lazy(() => import("./pages/hiring/JobOpenings"));
const JobOpeningDetail = lazy(() => import("./pages/hiring/JobOpeningDetail"));
const CandidatesList = lazy(() => import("./pages/hiring/CandidatesList"));
const CandidateProfile = lazy(() => import("./pages/hiring/CandidateProfile"));
const TalentPool = lazy(() => import("./pages/hiring/TalentPool"));
const HiringDashboard = lazy(() => import("./pages/hiring/HiringDashboard"));
const CulturalFitTemplates = lazy(() => import("./pages/hiring/CulturalFitTemplates"));
const PublicCulturalFit = lazy(() => import("./pages/hiring/PublicCulturalFit"));
const PublicJobOpening = lazy(() => import("./pages/hiring/PublicJobOpening"));
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Layout } from "@/components/Layout";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useAuth } from "@/hooks/useAuth";
import { AppProviders } from "@/app/providers";

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
        <ErrorBoundary>
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={!isAuthenticated ? <Auth /> : <Navigate to={getDefaultRoute()} replace />} />
            <Route path="/" element={!isAuthenticated ? <Auth /> : <Navigate to={getDefaultRoute()} replace />} />

            {/* Authenticated routes share a persistent Layout (sidebar + header).
                AppProviders mounts INSIDE BrowserRouter (Pitfall #1) and AFTER
                auth resolves. Public routes below stay outside the providers. */}
            <Route element={isAuthenticated ? <AppProviders><Layout /></AppProviders> : <Navigate to="/auth" replace />}>
              <Route path="/colaborador" element={<Index />} />
              <Route
                path="/gestor"
                element={
                  <ProtectedRoute allowedRoles={["lider", "socio", "admin"]}>
                    <GestorDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/rh"
                element={
                  <ProtectedRoute allowedRoles={["rh", "socio", "admin"]}>
                    <RHDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/socio"
                element={
                  <ProtectedRoute allowedRoles={["socio", "admin"]}>
                    <SocioDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute allowedRoles={["admin", "socio"]}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/criar-usuario"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <CreateUser />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/avaliacoes"
                element={
                  <ProtectedRoute allowedRoles={["colaborador", "lider", "rh", "socio", "admin"]}>
                    <Evaluations />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/11s"
                element={
                  <ProtectedRoute allowedRoles={["lider", "socio", "admin", "rh"]}>
                    <OneOnOnes />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/clima"
                element={
                  <ProtectedRoute allowedRoles={["colaborador", "lider", "rh", "socio", "admin"]}>
                    <Climate />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/pdi"
                element={
                  <ProtectedRoute allowedRoles={["colaborador", "lider", "rh", "socio", "admin"]}>
                    <DevelopmentPlans />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/perfil"
                element={
                  <ProtectedRoute allowedRoles={["colaborador", "lider", "rh", "socio", "admin"]}>
                    <Profile />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/times"
                element={
                  <ProtectedRoute allowedRoles={["rh", "socio", "admin"]}>
                    <TeamManagement />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/empresas"
                element={
                  <ProtectedRoute allowedRoles={["rh", "socio", "admin"]}>
                    <CompanyManagement />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/meu-time"
                element={
                  <ProtectedRoute allowedRoles={["lider", "socio", "admin", "rh"]}>
                    <MyTeam />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/colaborador/:userId"
                element={
                  <ProtectedRoute allowedRoles={["lider", "rh", "socio", "admin"]}>
                    <CollaboratorProfile />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/kanban"
                element={
                  <ProtectedRoute allowedRoles={["lider", "socio", "admin", "rh"]}>
                    <DevelopmentKanban />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/nine-box"
                element={
                  <ProtectedRoute allowedRoles={["admin", "socio", "rh"]}>
                    <Suspense fallback={<div className="p-8 text-sm text-muted-foreground">Carregando…</div>}>
                      <NineBoxPage />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/hiring/jobs"
                element={
                  <ProtectedRoute allowedRoles={["lider", "rh", "socio", "admin"]}>
                    <Suspense fallback={<div className="p-8 text-sm text-muted-foreground">Carregando…</div>}>
                      <JobOpenings />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/hiring/jobs/:id"
                element={
                  <ProtectedRoute allowedRoles={["lider", "rh", "socio", "admin"]}>
                    <Suspense fallback={<div className="p-8 text-sm text-muted-foreground">Carregando…</div>}>
                      <JobOpeningDetail />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/hiring/candidates"
                element={
                  <ProtectedRoute allowedRoles={["lider", "rh", "socio", "admin"]}>
                    <Suspense fallback={<div className="p-8 text-sm text-muted-foreground">Carregando…</div>}>
                      <CandidatesList />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/hiring/candidates/:id"
                element={
                  <ProtectedRoute allowedRoles={["rh", "socio", "admin", "lider"]}>
                    <Suspense fallback={<div className="p-8 text-sm text-muted-foreground">Carregando…</div>}>
                      <CandidateProfile />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/hiring/talent-pool"
                element={
                  <ProtectedRoute allowedRoles={["rh", "socio", "admin"]}>
                    <Suspense fallback={<div className="p-8 text-sm text-muted-foreground">Carregando…</div>}>
                      <TalentPool />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/hiring/dashboard"
                element={
                  <ProtectedRoute allowedRoles={["rh", "socio", "admin", "lider"]}>
                    <Suspense fallback={<div className="p-8 text-sm text-muted-foreground">Carregando…</div>}>
                      <HiringDashboard />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/hiring/fit-templates"
                element={
                  <ProtectedRoute allowedRoles={["rh", "socio", "admin"]}>
                    <Suspense fallback={<div className="p-8 text-sm text-muted-foreground">Carregando…</div>}>
                      <CulturalFitTemplates />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
            </Route>

            <Route
              path="/hiring/fit/:token"
              element={
                <Suspense fallback={<div className="p-8 text-sm text-muted-foreground">Carregando…</div>}>
                  <PublicCulturalFit />
                </Suspense>
              }
            />

            <Route
              path="/vagas/:id"
              element={
                <Suspense fallback={<div className="p-8 text-sm text-muted-foreground">Carregando…</div>}>
                  <PublicJobOpening />
                </Suspense>
              }
            />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        </ErrorBoundary>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
