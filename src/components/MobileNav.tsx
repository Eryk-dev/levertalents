import { useState } from "react";
import { Menu, Search } from "lucide-react";
import { NavLink as RouterNavLink } from "react-router-dom";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useSidebarGroups, SidebarFooterUser } from "@/components/Sidebar";
import { LeverArrow } from "@/components/primitives/LeverArrow";
import { cn } from "@/lib/utils";
import { Btn, Kbd } from "@/components/primitives/LinearKit";

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const groups = useSidebarGroups();
  const closeSheet = () => setOpen(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Btn variant="ghost" size="sm" icon={<Menu className="w-4 h-4" strokeWidth={1.75} />} className="lg:hidden">
          <span className="sr-only">Abrir navegação</span>
        </Btn>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0 bg-sidebar text-text border-r border-sidebar-border">
        <div className="flex flex-col h-full">
          <div className="h-[42px] px-2.5 flex items-center gap-2 border-b border-sidebar-border">
            <div className="w-[22px] h-[22px] rounded-[5px] bg-text text-white grid place-items-center">
              <LeverArrow className="w-3 h-3 text-turquoise" />
            </div>
            <div className="flex-1 min-w-0 leading-[1.1]">
              <div className="text-[12.5px] font-semibold text-text truncate">Lever Talents</div>
              <div className="text-[10.5px] text-text-subtle truncate">Talents Platform</div>
            </div>
          </div>

          {/* Search / CmdK */}
          <div className="px-2.5 py-2">
            <button
              onClick={() => {
                setOpen(false);
                setTimeout(() => window.dispatchEvent(new CustomEvent("open-cmdk")), 0);
              }}
              className="w-full h-[28px] flex items-center gap-2 px-2 bg-surface border border-border rounded-md text-[12.5px] text-text-subtle hover:border-border-strong transition-colors"
            >
              <Search className="w-3 h-3" strokeWidth={2} />
              <span className="flex-1 text-left">Buscar…</span>
              <Kbd>⌘K</Kbd>
            </button>
          </div>

          <nav className="flex-1 px-2 pb-2 overflow-y-auto scrollbar-linear">
            {groups.map((group, gi) => (
              <div key={group.label || gi} className="mb-1">
                {group.label && (
                  <div className="text-[10.5px] font-medium text-text-subtle uppercase tracking-[0.06em] px-2 pt-3 pb-1">
                    {group.label}
                  </div>
                )}
                <div className="space-y-[1px]">
                  {group.items.map(({ to, icon: Icon, label, end = true }) => (
                    <RouterNavLink
                      key={to}
                      to={to}
                      end={end}
                      onClick={closeSheet}
                      className={({ isActive }) =>
                        cn(
                          "group relative flex items-center gap-2 px-2 py-[5px] rounded-md text-[13px] w-full",
                          "text-text-muted transition-colors duration-100",
                          "hover:bg-bg-subtle hover:text-text",
                          isActive && "bg-bg-muted text-text font-medium",
                        )
                      }
                    >
                      <Icon className="w-[15px] h-[15px] shrink-0" strokeWidth={1.7} />
                      <span className="truncate flex-1 tracking-[-0.005em]">{label}</span>
                    </RouterNavLink>
                  ))}
                </div>
              </div>
            ))}
          </nav>

          <div className="p-2 border-t border-sidebar-border">
            <SidebarFooterUser onNavigate={closeSheet} />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
