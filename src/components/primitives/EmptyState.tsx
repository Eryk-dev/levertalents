import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  title: string;
  message?: string;
  icon?: LucideIcon;
  action?: ReactNode;
  variant?: "default" | "compact" | "decorated";
  className?: string;
}

/**
 * Linear-style empty state — neutral surface, muted icon, restrained typography.
 * Variants:
 *   - default: centered block with padding
 *   - compact: inline row (used inside kanban cards, drawers)
 *   - decorated: dashed surface with more visual weight
 */
export function EmptyState({
  title,
  message,
  icon: Icon,
  action,
  variant = "default",
  className,
}: EmptyStateProps) {
  if (variant === "compact") {
    return (
      <div
        className={cn(
          "flex items-center gap-2.5 py-3 px-3 text-[12.5px] text-text-muted",
          className,
        )}
      >
        {Icon && <Icon className="h-4 w-4 shrink-0 text-text-subtle" strokeWidth={1.75} />}
        <div className="min-w-0">
          <p className="font-medium text-text">{title}</p>
          {message && <p className="text-[11.5px] text-text-subtle">{message}</p>}
        </div>
        {action && <div className="ml-auto">{action}</div>}
      </div>
    );
  }

  if (variant === "decorated") {
    return (
      <div
        className={cn(
          "rounded-md bg-surface border border-dashed border-border-strong",
          "flex flex-col items-center justify-center text-center px-6 py-10",
          className,
        )}
      >
        {Icon && (
          <div className="mb-3 grid h-9 w-9 place-items-center rounded-md bg-bg-subtle text-text-muted">
            <Icon className="h-4 w-4" strokeWidth={1.75} />
          </div>
        )}
        <h3 className="text-[14px] font-medium text-text">{title}</h3>
        {message && (
          <p className="mt-1 text-[12.5px] text-text-muted max-w-[360px]">{message}</p>
        )}
        {action && <div className="pt-3">{action}</div>}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center py-10 px-5 space-y-3",
        className,
      )}
    >
      {Icon && (
        <div className="grid h-9 w-9 place-items-center rounded-md bg-bg-subtle text-text-muted">
          <Icon className="h-4 w-4" strokeWidth={1.75} />
        </div>
      )}
      <div className="space-y-1 max-w-[400px]">
        <h3 className="text-[14px] font-medium text-text">{title}</h3>
        {message && <p className="text-[12.5px] text-text-muted">{message}</p>}
      </div>
      {action && <div className="pt-1">{action}</div>}
    </div>
  );
}
