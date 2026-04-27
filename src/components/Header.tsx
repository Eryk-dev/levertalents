import { Link, useLocation } from "react-router-dom";
import { ChevronRight, Plus } from "lucide-react";
import { MobileNav } from "@/components/MobileNav";
import { PendingTasksDropdown } from "@/components/PendingTasksDropdown";
import { getBreadcrumbs } from "@/lib/routes";
import { Fragment } from "react";
import { Btn } from "@/components/primitives/LinearKit";
import { Icon } from "@/components/primitives/Icon";
import { ScopeDropdown } from "@/components/scope";

interface HeaderProps {
  /**
   * Toggle the desktop sidebar visibility. When provided, renders a
   * ghost-icon menu button at the start of the header. Visual only
   * for now — state can live anywhere.
   */
  onToggleSidebar?: () => void;
}

export function Header({ onToggleSidebar }: HeaderProps) {
  const location = useLocation();
  const crumbs = getBreadcrumbs(location.pathname);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-bg/95 backdrop-blur h-[42px] shrink-0">
      <div className="flex h-full items-center justify-between px-3.5 gap-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {/* Desktop sidebar toggle */}
          {onToggleSidebar && (
            <button
              type="button"
              onClick={onToggleSidebar}
              aria-label="Alternar sidebar"
              className="hidden lg:grid h-6 w-6 place-items-center rounded text-text-muted hover:bg-bg-subtle hover:text-text transition-colors shrink-0"
            >
              <Icon name="menu" size={14} />
            </button>
          )}
          <MobileNav />
          <nav aria-label="Breadcrumb" className="min-w-0">
            <ol className="flex items-center gap-1.5 text-[12.5px] min-w-0">
              {crumbs.map((crumb, idx) => {
                const isLast = idx === crumbs.length - 1;
                return (
                  <Fragment key={`${crumb.label}-${idx}`}>
                    {idx > 0 && (
                      <ChevronRight className="h-3 w-3 text-text-subtle shrink-0" strokeWidth={1.75} />
                    )}
                    {crumb.to && !isLast ? (
                      <Link
                        to={crumb.to}
                        className="text-text-muted hover:text-text transition-colors whitespace-nowrap"
                      >
                        {crumb.label}
                      </Link>
                    ) : (
                      <span
                        className={
                          isLast
                            ? "text-text font-medium truncate"
                            : "text-text-muted whitespace-nowrap"
                        }
                        aria-current={isLast ? "page" : undefined}
                      >
                        {crumb.label}
                      </span>
                    )}
                  </Fragment>
                );
              })}
            </ol>
          </nav>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <ScopeDropdown />
          <PendingTasksDropdown />
          <Btn
            variant="secondary"
            size="sm"
            icon={<Plus className="w-3.5 h-3.5" strokeWidth={2} />}
            onClick={() => window.dispatchEvent(new CustomEvent("open-cmdk"))}
          >
            Criar
          </Btn>
        </div>
      </div>
    </header>
  );
}
