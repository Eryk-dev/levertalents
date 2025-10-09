import { Home, FileText, Calendar, TrendingUp, Target, Settings } from "lucide-react";
import { NavLink } from "react-router-dom";
import logo from "@/assets/lever-logo.png";
import { cn } from "@/lib/utils";

const navItems = [
  { icon: Home, label: "Início", path: "/colaborador" },
  { icon: FileText, label: "Avaliações", path: "/avaliacoes" },
  { icon: Calendar, label: "1:1s", path: "/11s" },
  { icon: TrendingUp, label: "Meu Clima", path: "/clima" },
  { icon: Target, label: "Meu PDI", path: "/pdi" },
  { icon: Settings, label: "Perfil", path: "/perfil" },
];

export function Sidebar() {
  return (
    <aside className="hidden lg:flex flex-col w-64 bg-primary min-h-screen">
      <div className="p-6">
        <img src={logo} alt="Lever Talents" className="w-full h-auto" />
      </div>
      
      <nav className="flex-1 px-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg text-sidebar-foreground transition-all duration-200",
                "hover:bg-sidebar-accent",
                isActive && "bg-sidebar-accent border-l-4 border-accent"
              )
            }
          >
            <item.icon className="w-5 h-5" />
            <span className="font-medium">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
