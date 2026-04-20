import { LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

type StatVariant = "default" | "emphasis" | "muted";
type TrendDirection = "up" | "down" | "neutral";

interface StatCardProps {
  label: string;
  value: string | number | ReactNode;
  icon?: LucideIcon;
  trend?: {
    direction: TrendDirection;
    value?: string;
    label?: string;
  };
  hint?: string;
  variant?: StatVariant;
  className?: string;
}

const trendIconMap: Record<TrendDirection, LucideIcon> = {
  up: TrendingUp,
  down: TrendingDown,
  neutral: Minus,
};

const trendColorMap: Record<TrendDirection, string> = {
  up: "text-status-green",
  down: "text-status-red",
  neutral: "text-text-subtle",
};

/**
 * Linear-style stat tile — neutral surface, tabular number, optional trend.
 * Emphasis variant inverts (dark surface + light text) for hero KPIs.
 */
export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  hint,
  variant = "default",
  className,
}: StatCardProps) {
  const TrendIcon = trend ? trendIconMap[trend.direction] : null;
  const isEmphasis = variant === "emphasis";
  const isMuted = variant === "muted";

  const isEmptyValue =
    value === "—" || value === "-" || value === null || value === undefined || value === "";

  return (
    <div
      className={cn(
        "group rounded-md p-3.5 transition-colors",
        isEmphasis
          ? "bg-text text-[hsl(var(--text-inverse))] border border-text"
          : isMuted
          ? "bg-bg-subtle border border-border"
          : "bg-surface border border-border",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <p
          className={cn(
            "text-[10.5px] uppercase tracking-[0.06em] font-semibold leading-none",
            isEmphasis ? "text-white/65" : "text-text-subtle",
          )}
        >
          {label}
        </p>
        {Icon && (
          <Icon
            className={cn(
              "h-3.5 w-3.5 shrink-0",
              isEmphasis ? "text-white/50" : "text-text-muted",
            )}
            strokeWidth={1.75}
          />
        )}
      </div>

      <p
        className={cn(
          "text-[26px] font-semibold leading-[1.05] tabular tracking-[-0.02em] mt-1",
          isEmphasis
            ? "text-[hsl(var(--text-inverse))]"
            : isEmptyValue
            ? "text-text-subtle"
            : "text-text",
        )}
      >
        {value}
      </p>

      {(trend || hint) && (
        <div className="mt-2 space-y-0.5">
          {trend && TrendIcon && (
            <div
              className={cn(
                "flex items-center gap-1 text-[11.5px] font-medium",
                isEmphasis ? "text-white/85" : trendColorMap[trend.direction],
              )}
            >
              <TrendIcon className="h-3 w-3" strokeWidth={2} />
              {trend.value && <span className="tabular">{trend.value}</span>}
              {trend.label && (
                <span className={isEmphasis ? "text-white/55" : "text-text-muted font-normal"}>
                  {trend.label}
                </span>
              )}
            </div>
          )}
          {hint && (
            <p
              className={cn(
                "text-[11.5px] leading-[1.45]",
                isEmphasis ? "text-white/60" : "text-text-muted",
              )}
            >
              {hint}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
