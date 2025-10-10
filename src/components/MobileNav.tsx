import { useState } from "react";
import { Home, Calendar, FileText, BarChart3, TrendingUp, CloudSun, Users, UserPlus, Building } from "lucide-react";
import { Menu } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import logo from "@/assets/lever-logo.png";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

interface NavLinkProps {
  to: string;
  icon: React.ElementType;
  label: string;
  onClick?: () => void;
}

const NavLink = ({ to, icon: Icon, label, onClick }: NavLinkProps) => {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link
      to={to}
      onClick={onClick}
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

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const { userRole } = useAuth();
  
  const isAdmin = userRole === "admin";
  const isRH = userRole === "rh";
  const isSocio = userRole === "socio";
  const canManage = isAdmin || isRH || isSocio;

  const getHomeRoute = () => {
    if (userRole === "admin") return "/admin";
    if (userRole === "socio") return "/socio";
    if (userRole === "lider" || userRole === "gestor") return "/gestor";
    if (userRole === "rh") return "/rh";
    return "/colaborador";
  };

  const closeSheet = () => setOpen(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden">
          <Menu className="h-6 w-6" />
          <span className="sr-only">Toggle navigation menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0 bg-primary">
        <div className="flex flex-col h-full">
          <div className="p-6">
            <img src={logo} alt="Lever Talents" className="w-full h-auto" />
          </div>
          
          <nav className="flex-1 px-4 space-y-1">
            <NavLink to={getHomeRoute()} icon={Home} label="Início" onClick={closeSheet} />
            <NavLink to="/avaliacoes" icon={FileText} label="Avaliações" onClick={closeSheet} />
            {(userRole === "lider" || userRole === "gestor" || canManage) && (
              <>
                <NavLink to="/11s" icon={Calendar} label="1:1s" onClick={closeSheet} />
                <NavLink to="/meu-time" icon={Users} label="Meu Time" onClick={closeSheet} />
                <NavLink to="/kanban" icon={TrendingUp} label="Kanban" onClick={closeSheet} />
              </>
            )}
            <NavLink to="/pdi" icon={BarChart3} label="PDI" onClick={closeSheet} />
            <NavLink to="/clima" icon={CloudSun} label="Clima" onClick={closeSheet} />
            {canManage && (
              <>
                <NavLink to="/criar-usuario" icon={UserPlus} label="Criar Usuário" onClick={closeSheet} />
                <NavLink to="/empresas" icon={Building} label="Empresas" onClick={closeSheet} />
                <NavLink to="/times" icon={Users} label="Times" onClick={closeSheet} />
              </>
            )}
          </nav>
        </div>
      </SheetContent>
    </Sheet>
  );
}
