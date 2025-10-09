import { Home, Calendar, FileText, BarChart3, TrendingUp, CloudSun, Users, UserPlus, Building } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import logo from "@/assets/lever-logo.png";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

interface NavLinkProps {
  to: string;
  icon: React.ElementType;
  label: string;
}

const NavLink = ({ to, icon: Icon, label }: NavLinkProps) => {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link
      to={to}
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-lg text-sidebar-foreground transition-all duration-200",
        "hover:bg-sidebar-accent",
        isActive && "bg-sidebar-accent border-l-4 border-accent"
      )}
    >
      <Icon className="w-5 h-5" />
      <span className="font-medium">{label}</span>
    </Link>
  );
};

export function Sidebar() {
  const { userRole } = useAuth();
  
  const isAdmin = userRole === "admin";
  const isRH = userRole === "rh";
  const isSocio = userRole === "socio";
  const canManage = isAdmin || isRH || isSocio;

  return (
    <aside className="hidden lg:flex flex-col w-64 bg-primary min-h-screen">
      <div className="p-6">
        <img src={logo} alt="Lever Talents" className="w-full h-auto" />
      </div>
      
      <nav className="flex-1 px-4 space-y-1">
        <NavLink to="/colaborador" icon={Home} label="Início" />
        <NavLink to="/avaliacoes" icon={FileText} label="Avaliações" />
        {(userRole === "lider" || userRole === "gestor" || canManage) && (
          <NavLink to="/11s" icon={Calendar} label="1:1s" />
        )}
        <NavLink to="/pdi" icon={BarChart3} label="PDI" />
        <NavLink to="/clima" icon={CloudSun} label="Clima" />
        {canManage && (
          <>
            <NavLink to="/criar-usuario" icon={UserPlus} label="Criar Usuário" />
            <NavLink to="/empresas" icon={Building} label="Empresas" />
            <NavLink to="/times" icon={Users} label="Times" />
          </>
        )}
      </nav>
    </aside>
  );
}
