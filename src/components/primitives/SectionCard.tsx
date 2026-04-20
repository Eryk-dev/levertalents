import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface SectionCardProps {
  title?: string;
  description?: string;
  icon?: LucideIcon;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  variant?: "default" | "hero" | "bordered" | "ghost";
  kicker?: string;
}

/**
 * Linear-style section card — neutral surface, sans-serif heading,
 * optional kicker (uppercase eyebrow). The "hero" variant inverts to ink bg.
 */
export function SectionCard({
  title,
  description,
  icon: Icon,
  action,
  children,
  className,
  contentClassName,
  variant = "default",
  kicker,
}: SectionCardProps) {
  const variantStyles = {
    default: "bg-surface border border-border",
    bordered: "bg-surface border border-border",
    hero: "bg-text text-[hsl(var(--text-inverse))] border border-text",
    ghost: "bg-transparent border-0",
  };

  const titleColor = variant === "hero" ? "text-[hsl(var(--text-inverse))]" : "text-text";
  const descriptionColor = variant === "hero" ? "text-white/65" : "text-text-muted";
  const kickerColor = variant === "hero" ? "text-white/70" : "text-text-subtle";
  const borderColor = variant === "hero" ? "border-white/10" : "border-border";
  const iconColor = variant === "hero" ? "text-white/70" : "text-text-muted";

  const hasHeader = title || description || action || kicker;

  return (
    <section className={cn("rounded-md overflow-hidden", variantStyles[variant], className)}>
      {hasHeader && (
        <header
          className={cn(
            "flex items-start justify-between gap-3 px-4 py-3",
            children ? `pb-3 border-b ${borderColor}` : "",
          )}
        >
          <div className="flex-1 min-w-0">
            {kicker && (
              <p
                className={cn(
                  "text-[10.5px] font-semibold uppercase tracking-[0.06em] mb-1.5 leading-none",
                  kickerColor,
                )}
              >
                {kicker}
              </p>
            )}
            <div className="flex items-baseline gap-2.5">
              {Icon && <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", iconColor)} strokeWidth={1.75} />}
              <div className="space-y-0.5 min-w-0 flex-1">
                {title && (
                  <h2
                    className={cn(
                      "text-[14px] font-semibold tracking-[-0.01em] leading-tight",
                      titleColor,
                    )}
                  >
                    {title}
                  </h2>
                )}
                {description && (
                  <p className={cn("text-[12.5px] leading-relaxed", descriptionColor)}>
                    {description}
                  </p>
                )}
              </div>
            </div>
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </header>
      )}
      <div className={cn(hasHeader ? "px-4 py-4" : "p-4", contentClassName)}>{children}</div>
    </section>
  );
}
