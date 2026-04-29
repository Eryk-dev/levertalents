import {
  ChevronsUpDown,
  User as UserIcon,
  LogOut,
  Eye,
  RotateCcw,
} from "lucide-react";
import { NavLink as RouterNavLink, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth, type AppRole } from "@/hooks/useAuth";
import { useSidebarHiringCounts } from "@/hooks/hiring/useSidebarCounts";
import { useUserProfile } from "@/hooks/useUserProfile";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Kbd } from "@/components/primitives/LinearKit";
import { LeverArrow } from "@/components/primitives/LeverArrow";
import { Icon, type IconName } from "@/components/primitives/Icon";

interface NavItemProps {
  to: string;
  icon: IconName;
  label: string;
  end?: boolean;
  badge?: string | number;
}

const ROLE_LABEL: Record<AppRole, string> = {
  admin: "Administrador",
  socio: "Sócio",
  rh: "RH · Business Partner",
  lider: "Líder",
  colaborador: "Colaboradora(o)",
  liderado: "Liderada(o)",
};

const ROLE_HOME: Record<AppRole, string> = {
  admin: "/admin",
  socio: "/socio",
  lider: "/gestor",
  rh: "/rh",
  colaborador: "/colaborador",
  liderado: "/colaborador",
};

const VIEW_AS_ORDER: AppRole[] = ["admin", "socio", "lider", "rh", "colaborador", "liderado"];

function NavItem({ to, icon, label, end = true, badge }: NavItemProps) {
  return (
    <RouterNavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          "group relative flex items-center gap-2 px-2 py-[5px] rounded-md text-[13px] w-full text-left",
          "text-text-muted font-[450] transition-colors duration-100",
          "hover:bg-bg-subtle hover:text-text",
          isActive && "bg-bg-muted text-text font-medium",
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon name={icon} size={15} strokeWidth={1.7} className="shrink-0" />
          <span className="truncate flex-1 tracking-[-0.005em]">{label}</span>
          {badge != null && (
            <span
              className={cn(
                "text-[10px] leading-none px-1.5 py-[2px] rounded-full font-semibold",
                typeof badge === "number"
                  ? "bg-bg-muted text-text-muted"
                  : "bg-accent-soft text-accent-text",
                isActive && typeof badge === "number" && "bg-white text-text-muted",
              )}
            >
              {badge}
            </span>
          )}
        </>
      )}
    </RouterNavLink>
  );
}

interface NavSection {
  label?: string;
  items: NavItemProps[];
}

/**
 * Sidebar NAV_GROUPS — aligned with the Linear reference model
 * (`Lever talents hub (1)/src/shell.jsx::NAV_GROUPS`). Items listed
 * per role: admin, rh (canManage), lider (gestor), colaborador.
 */
export function useSidebarGroups(): NavSection[] {
  const { userRole } = useAuth();
  const isAdmin = userRole === "admin";
  const isRH = userRole === "rh";
  const isSocio = userRole === "socio";
  const isLeader = userRole === "lider";
  const canManage = isAdmin || isRH || isSocio;
  const hasTeamView = canManage || isLeader;
  const { data: hiringCounts } = useSidebarHiringCounts();
  const jobsBadge = hiringCounts?.jobs && hiringCounts.jobs > 0 ? hiringCounts.jobs : undefined;
  const candidatesBadge =
    hiringCounts?.candidates && hiringCounts.candidates > 0 ? hiringCounts.candidates : undefined;

  const homeRoute = ROLE_HOME[(userRole as AppRole) ?? "colaborador"] ?? "/colaborador";

  const sections: NavSection[] = [];

  // ─── Visão geral (admin/socio) ─────────────────────────────
  if (canManage) {
    sections.push({
      label: "Visão geral",
      items: [
        { to: homeRoute, icon: "home", label: "Início" },
      ],
    });
  } else {
    // Colaborador / Líder — Pessoal first
    sections.push({
      label: "Pessoal",
      items: [
        { to: homeRoute, icon: "home", label: "Início" },
        { to: "/pdi", icon: "target", label: "Meu PDI" },
        { to: "/avaliacoes", icon: "chart", label: "Avaliações" },
      ],
    });
  }

  // ─── Pessoas (admin/rh/socio) ──────────────────────────────
  if (canManage) {
    sections.push({
      label: "Pessoas",
      items: [
        { to: "/avaliacoes", icon: "chart", label: "Avaliações" },
        { to: "/pdi", icon: "target", label: "PDIs" },
        { to: "/11s", icon: "calendar", label: "1:1s" },
        { to: "/clima", icon: "pulse", label: "Clima" },
      ],
    });
  }

  // ─── Meu time (leaders only, not admin/rh list above) ──────
  if (hasTeamView) {
    const teamItems: NavItemProps[] = [
      { to: "/meu-time", icon: "users", label: "Time" },
    ];
    if (!canManage) {
      // Leader-only extras; canManage already has these under Pessoas
      teamItems.push({ to: "/11s", icon: "calendar", label: "1:1s" });
    }
    teamItems.push({ to: "/kanban", icon: "kanban", label: "PDI Kanban" });
    if (!canManage) teamItems.push({ to: "/clima", icon: "pulse", label: "Clima" });
    sections.push({ label: "Meu time", items: teamItems });
  }

  // ─── Recrutamento ──────────────────────────────────────────
  const hiringItems: NavItemProps[] = [];
  if (canManage || isLeader)
    hiringItems.push({ to: "/hiring/jobs", icon: "briefcase", label: "Vagas", end: false, badge: jobsBadge });
  if (canManage)
    hiringItems.push({ to: "/hiring/candidates", icon: "userPlus", label: "Candidatos", end: false, badge: candidatesBadge });
  if (canManage)
    hiringItems.push({ to: "/hiring/talent-pool", icon: "book", label: "Banco de Talentos", end: false });
  if (canManage || isLeader)
    hiringItems.push({ to: "/hiring/dashboard", icon: "chart", label: "Dashboard" });
  if (canManage)
    hiringItems.push({ to: "/hiring/fit-templates", icon: "sparkles", label: "Fit Cultural" });
  if (hiringItems.length) {
    sections.push({ label: "Recrutamento", items: hiringItems });
  }

  // ─── Administração (admin/rh/socio) ────────────────────────
  if (canManage) {
    const adminItems: NavItemProps[] = [
      { to: "/empresas", icon: "building", label: "Empresas" },
      { to: "/times", icon: "users", label: "Times" },
      { to: "/admin", icon: "userPlus", label: "Pessoas" },
    ];
    adminItems.push({ to: "/nine-box", icon: "grid", label: "9-Box" });
    sections.push({ label: "Administração", items: adminItems });
  }

  return sections;
}

function SidebarFooterUser({ onNavigate }: { onNavigate?: () => void }) {
  const { data: profile } = useUserProfile();
  const { userRole, realRole, viewAsRole, setViewAsRole, isViewingAs } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    setViewAsRole(null);
    await supabase.auth.signOut();
    onNavigate?.();
    navigate("/auth");
  };

  const canSwitchRole = realRole === "admin";

  const handleViewAs = (next: AppRole) => {
    if (next === realRole) {
      // Selecting own role just clears the override.
      setViewAsRole(null);
      toast.success("Voltou à visualização de Administrador");
    } else {
      setViewAsRole(next);
      toast.success(`Visualizando como ${ROLE_LABEL[next]}`);
    }
    onNavigate?.();
    navigate(ROLE_HOME[next]);
  };

  const handleResetView = () => {
    setViewAsRole(null);
    toast.success("Voltou à visualização de Administrador");
    onNavigate?.();
    navigate(ROLE_HOME.admin);
  };

  const name = profile?.full_name || "Usuário";
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const roleLabel = ROLE_LABEL[(userRole as AppRole) ?? "colaborador"] ?? "Colaboradora(o)";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left",
            "hover:bg-bg-subtle transition-colors",
          )}
        >
          <Avatar className="h-[22px] w-[22px] shrink-0">
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback className="bg-accent text-white text-[10px] font-semibold">
              {initials || "LT"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-[12px] font-medium text-text truncate leading-[1.1]">
              {name}
            </p>
            <p className="text-[10.5px] text-text-subtle leading-[1.1] truncate">{roleLabel}</p>
          </div>
          <ChevronsUpDown className="h-3 w-3 text-text-subtle shrink-0" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="top" sideOffset={8} className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col">
            <span className="font-semibold">{name}</span>
            <span className="text-xs text-muted-foreground">{roleLabel}</span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            onNavigate?.();
            navigate("/perfil");
          }}
        >
          <UserIcon className="mr-2 h-4 w-4" />
          Meu Perfil
        </DropdownMenuItem>
        {canSwitchRole && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="px-2 py-1.5 text-sm">
                <Eye className="mr-2 h-4 w-4" />
                <span>Ver como</span>
                {isViewingAs && (
                  <span className="ml-auto text-[10px] text-text-subtle">
                    {ROLE_LABEL[viewAsRole as AppRole]}
                  </span>
                )}
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-52">
                <DropdownMenuLabel className="text-[10.5px] font-medium uppercase tracking-[0.06em] text-text-subtle">
                  Visualizar como
                </DropdownMenuLabel>
                <DropdownMenuRadioGroup
                  value={(viewAsRole ?? realRole) as string}
                  onValueChange={(v) => handleViewAs(v as AppRole)}
                >
                  {VIEW_AS_ORDER.map((role) => (
                    <DropdownMenuRadioItem key={role} value={role}>
                      {ROLE_LABEL[role]}
                      {role === realRole && (
                        <span className="ml-auto text-[10px] text-text-subtle">você</span>
                      )}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
                {isViewingAs && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleResetView}>
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Voltar para Administrador
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function Sidebar() {
  const groups = useSidebarGroups();

  return (
    <aside className="hidden lg:flex flex-col w-[216px] shrink-0 bg-sidebar min-h-screen sticky top-0 border-r border-sidebar-border">
      {/* Workspace header */}
      <button
        type="button"
        className="h-[42px] px-2.5 flex items-center gap-2 border-b border-sidebar-border shrink-0 hover:bg-bg-subtle transition-colors text-left"
      >
        <div className="w-[22px] h-[22px] rounded-[5px] bg-text text-white grid place-items-center shrink-0">
          <LeverArrow className="w-3 h-3 text-turquoise" />
        </div>
        <div className="flex-1 min-w-0 leading-[1.1]">
          <div className="text-[12.5px] font-semibold text-text truncate">Lever Talents</div>
          <div className="text-[10.5px] text-text-subtle truncate">NetAir · Plano Pro</div>
        </div>
        <Icon name="chevDown" size={13} className="text-text-subtle shrink-0" />
      </button>

      {/* Search / CmdK */}
      <div className="px-2.5 py-2">
        <button
          onClick={() => window.dispatchEvent(new CustomEvent("open-cmdk"))}
          className="w-full h-[28px] flex items-center gap-2 px-2 bg-surface border border-border rounded-md text-[12.5px] text-text-subtle hover:border-border-strong transition-colors"
        >
          <Icon name="search" size={13} />
          <span className="flex-1 text-left">Buscar…</span>
          <Kbd>⌘K</Kbd>
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 pb-2 overflow-y-auto scrollbar-linear">
        {groups.map((group, i) => (
          <div key={group.label || i} className="mb-1">
            {group.label && (
              <div className="text-[10.5px] font-medium text-text-subtle uppercase tracking-[0.06em] px-2 pt-3 pb-1">
                {group.label}
              </div>
            )}
            <div className="space-y-[1px]">
              {group.items.map((item) => (
                <NavItem key={`${item.label}-${item.to}`} {...item} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-2 border-t border-sidebar-border">
        <SidebarFooterUser />
      </div>
    </aside>
  );
}

export { SidebarFooterUser };
