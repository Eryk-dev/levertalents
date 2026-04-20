export type RouteCrumb = {
  label: string;
  to?: string;
};

const LABELS: Record<string, string> = {
  "/colaborador": "Início",
  "/gestor": "Dashboard",
  "/rh": "Dashboard Executivo",
  "/socio": "Dashboard do Sócio",
  "/admin": "Administração",
  "/admin/criar-usuario": "Criar Usuário",
  "/avaliacoes": "Avaliações",
  "/11s": "Reuniões 1:1",
  "/clima": "Clima",
  "/pdi": "Desenvolvimento (PDI)",
  "/perfil": "Meu Perfil",
  "/times": "Times",
  "/empresas": "Empresas",
  "/criar-usuario": "Criar Usuário",
  "/meu-time": "Meu Time",
  "/kanban": "Kanban de Desenvolvimento",
  "/hiring/jobs": "Vagas",
  "/hiring/candidates": "Candidatos",
  "/hiring/dashboard": "Dashboard de Hiring",
  "/hiring/fit-templates": "Fit Cultural",
};

export function getPageTitle(pathname: string): string {
  if (pathname.startsWith("/colaborador/") && pathname !== "/colaborador") {
    return "Perfil do Colaborador";
  }
  if (pathname.startsWith("/hiring/jobs/") && pathname.endsWith("/candidates")) {
    return "Candidatos da vaga";
  }
  if (pathname.startsWith("/hiring/jobs/") && pathname !== "/hiring/jobs") {
    return "Detalhe da vaga";
  }
  if (pathname.startsWith("/hiring/candidates/") && pathname !== "/hiring/candidates") {
    return "Perfil do candidato";
  }
  return LABELS[pathname] || "Lever Talents";
}

export function getBreadcrumbs(pathname: string): RouteCrumb[] {
  // Dynamic routes
  if (pathname.startsWith("/colaborador/") && pathname !== "/colaborador") {
    return [{ label: "Meu Time", to: "/meu-time" }, { label: "Perfil do Colaborador" }];
  }

  if (pathname === "/admin/criar-usuario") {
    return [{ label: "Administração", to: "/admin" }, { label: "Criar Usuário" }];
  }

  if (pathname.startsWith("/hiring/jobs/") && pathname.endsWith("/candidates")) {
    return [
      { label: "Vagas", to: "/hiring/jobs" },
      { label: "Detalhe da vaga", to: pathname.replace(/\/candidates$/, "") },
      { label: "Candidatos" },
    ];
  }

  if (pathname.startsWith("/hiring/jobs/") && pathname !== "/hiring/jobs") {
    return [{ label: "Vagas", to: "/hiring/jobs" }, { label: "Detalhe da vaga" }];
  }

  if (pathname.startsWith("/hiring/candidates/") && pathname !== "/hiring/candidates") {
    return [{ label: "Candidatos", to: "/hiring/candidates" }, { label: "Perfil do candidato" }];
  }

  const label = LABELS[pathname];
  if (label) return [{ label }];
  return [{ label: "Lever Talents" }];
}
