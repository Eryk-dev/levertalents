import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  eyebrow?: ReactNode;
  icon?: LucideIcon;
  /** Legacy aliases kept for backward compat — all render the same Linear layout. */
  variant?: "default" | "hero" | "editorial";
  /** Retained for API compat; now rendered as right-aligned muted caption. */
  sectionNumber?: string;
  className?: string;
}

/**
 * Linear-style page header: eyebrow + title + description + action.
 * Previously serif/editorial — simplified to match the refined design system.
 */
export function PageHeader({
  title,
  description,
  action,
  eyebrow,
  icon: Icon,
  sectionNumber,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "flex flex-col gap-3 md:flex-row md:items-baseline md:justify-between md:gap-4",
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        {(eyebrow || sectionNumber) && (
          <div className="flex items-center gap-2 mb-1.5">
            {eyebrow && (
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-text-subtle">
                {eyebrow}
              </p>
            )}
            {sectionNumber && (
              <span className="text-[10.5px] text-text-subtle tabular">§ {sectionNumber}</span>
            )}
          </div>
        )}

        <div className="flex items-center gap-2.5">
          {Icon && (
            <span className="hidden md:inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-bg-subtle border border-border">
              <Icon className="h-4 w-4 text-text-muted" strokeWidth={1.75} />
            </span>
          )}
          <h1 className="text-[20px] md:text-[22px] font-semibold tracking-[-0.02em] leading-tight text-text m-0">
            {title}
          </h1>
        </div>

        {description && (
          <p className="mt-1 text-[13px] text-text-muted leading-relaxed max-w-[60ch]">
            {description}
          </p>
        )}
      </div>

      {action && <div className="shrink-0 flex flex-wrap items-center gap-2">{action}</div>}
    </header>
  );
}
