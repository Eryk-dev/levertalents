import { useState } from "react";
import { Menu, X } from "lucide-react";
import { NavLink } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import logo from "@/assets/lever-logo.png";
import { Home, FileText, Calendar, TrendingUp, Target, Settings, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { icon: Home, label: "Início", path: "/colaborador" },
  { icon: FileText, label: "Avaliações", path: "/avaliacoes" },
  { icon: Calendar, label: "1:1s", path: "/11s" },
  { icon: TrendingUp, label: "Meu Clima", path: "/clima" },
  { icon: Target, label: "Meu PDI", path: "/pdi" },
  { icon: Users, label: "Times", path: "/times" },
  { icon: Settings, label: "Perfil", path: "/perfil" },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);

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
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setOpen(false)}
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
        </div>
      </SheetContent>
    </Sheet>
  );
}
