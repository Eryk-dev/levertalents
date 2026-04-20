import { cn } from "@/lib/utils";
import { forwardRef, type ButtonHTMLAttributes, type HTMLAttributes, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";

/* ──────────────────────────────────────────────────────────────
 * Linear-inspired primitives (Btn, Chip, PriorityDot, Kbd, Row/Col,
 * SectionHeader, Card, KV, ActionRow). Dense, neutral, action-first.
 * ─────────────────────────────────────────────────────────────── */

type BtnVariant = "primary" | "secondary" | "ghost" | "accent" | "danger";
type BtnSize = "xs" | "sm" | "md" | "lg";

interface BtnProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "size"> {
  variant?: BtnVariant;
  size?: BtnSize;
  icon?: ReactNode;
  iconRight?: ReactNode;
}

const btnVariants: Record<BtnVariant, string> = {
  primary:
    "bg-text text-[hsl(var(--text-inverse))] border-text hover:bg-[#1f2128]",
  secondary:
    "bg-surface text-text border-border hover:bg-bg-subtle",
  ghost:
    "bg-transparent text-text-muted border-transparent hover:bg-bg-subtle hover:text-text",
  accent:
    "bg-accent text-[hsl(var(--accent-foreground))] border-accent hover:bg-accent-hover",
  danger:
    "bg-status-red text-white border-status-red hover:bg-status-red/90",
};

const btnSizes: Record<BtnSize, string> = {
  xs: "h-[22px] px-2 text-[12px] gap-1",
  sm: "h-[26px] px-2.5 text-[12.5px] gap-1.5",
  md: "h-[30px] px-3 text-[13px] gap-1.5",
  lg: "h-[36px] px-3.5 text-[14px] gap-2",
};

export const Btn = forwardRef<HTMLButtonElement, BtnProps>(function Btn(
  { variant = "primary", size = "md", icon, iconRight, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled}
      className={cn(
        "inline-flex items-center font-medium rounded-md border whitespace-nowrap",
        "transition-[background-color,border-color,color] duration-100",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-1",
        btnVariants[variant],
        btnSizes[size],
        className,
      )}
      {...rest}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
      {iconRight && <span className="shrink-0">{iconRight}</span>}
    </button>
  );
});

/* ─── Chip ─────────────────────────────────────────────────── */

type ChipColor = "neutral" | "accent" | "green" | "amber" | "red" | "blue" | "purple" | "solid";
type ChipSize = "sm" | "md" | "lg";

interface ChipProps extends HTMLAttributes<HTMLSpanElement> {
  color?: ChipColor;
  size?: ChipSize;
  icon?: ReactNode;
}

const chipColors: Record<ChipColor, string> = {
  neutral: "bg-bg-subtle text-text-muted border-border",
  accent:  "bg-accent-soft text-accent-text border-transparent",
  green:   "bg-status-green-soft text-status-green border-transparent",
  amber:   "bg-status-amber-soft text-status-amber border-transparent",
  red:     "bg-status-red-soft text-status-red border-transparent",
  blue:    "bg-status-blue-soft text-status-blue border-transparent",
  purple:  "bg-status-purple-soft text-status-purple border-transparent",
  solid:   "bg-text text-[hsl(var(--text-inverse))] border-text",
};

const chipSizes: Record<ChipSize, string> = {
  sm: "h-[18px] px-1.5 text-[11px] gap-1",
  md: "h-[22px] px-2 text-[12px] gap-1",
  lg: "h-[26px] px-2.5 text-[13px] gap-1.5",
};

export function Chip({ color = "neutral", size = "md", icon, className, children, ...rest }: ChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center font-medium rounded-[4px] border whitespace-nowrap",
        chipColors[color],
        chipSizes[size],
        className,
      )}
      {...rest}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </span>
  );
}

/* ─── PriorityDot — 3 bars ─────────────────────────────────── */

type Priority = "urgent" | "high" | "med" | "low";

const prioColor: Record<Priority, string> = {
  urgent: "hsl(var(--prio-urgent))",
  high:   "hsl(var(--prio-high))",
  med:    "hsl(var(--prio-med))",
  low:    "hsl(var(--prio-low))",
};

const prioLabel: Record<Priority, string> = {
  urgent: "Urgente",
  high: "Alta",
  med: "Média",
  low: "Baixa",
};

export function PriorityDot({ level = "med" }: { level?: Priority }) {
  const fill = prioColor[level];
  const border = "hsl(var(--border-default))";
  return (
    <span title={prioLabel[level]} className="prio-bar shrink-0">
      <span style={{ width: 3, height: 6, background: level === "low" ? "transparent" : fill, borderRadius: 1 }} />
      <span style={{ width: 3, height: 9, background: level === "low" ? border : fill, borderRadius: 1 }} />
      <span style={{ width: 3, height: 12, background: (level === "low" || level === "med") ? border : fill, borderRadius: 1 }} />
    </span>
  );
}

/* ─── Kbd ──────────────────────────────────────────────────── */

export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return <kbd className={cn("kbd", className)}>{children}</kbd>;
}

/* ─── Row / Col ────────────────────────────────────────────── */

interface FlexProps extends HTMLAttributes<HTMLDivElement> {
  gap?: number;
  align?: "start" | "center" | "end" | "stretch" | "baseline";
  justify?: "start" | "center" | "end" | "between" | "around";
  wrap?: boolean;
}

const alignMap = {
  start: "items-start",
  center: "items-center",
  end: "items-end",
  stretch: "items-stretch",
  baseline: "items-baseline",
} as const;
const justifyMap = {
  start: "justify-start",
  center: "justify-center",
  end: "justify-end",
  between: "justify-between",
  around: "justify-around",
} as const;

export function Row({ gap = 8, align = "center", justify = "start", wrap = false, className, style, children, ...rest }: FlexProps) {
  return (
    <div
      className={cn("flex", alignMap[align], justifyMap[justify], wrap && "flex-wrap", className)}
      style={{ gap, ...style }}
      {...rest}
    >
      {children}
    </div>
  );
}

export function Col({ gap = 8, align = "stretch", className, style, children, ...rest }: Omit<FlexProps, "justify">) {
  return (
    <div
      className={cn("flex flex-col", alignMap[align], className)}
      style={{ gap, ...style }}
      {...rest}
    >
      {children}
    </div>
  );
}

/* ─── SectionHeader ────────────────────────────────────────── */

export function SectionHeader({ title, right, className }: { title: ReactNode; right?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-center justify-between mt-4 mb-2.5", className)}>
      <h2 className="text-[13px] font-semibold text-text tracking-[-0.005em] m-0">{title}</h2>
      {right}
    </div>
  );
}

/* ─── Card ─────────────────────────────────────────────────── */

export function Card({
  title,
  action,
  children,
  className,
  contentClassName,
}: {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <div className={cn("bg-surface border border-border rounded-lg overflow-hidden", className)}>
      {(title || action) && (
        <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-border">
          {typeof title === "string" ? (
            <div className="text-[12.5px] font-semibold text-text">{title}</div>
          ) : (
            title
          )}
          {action && <div className="text-[11.5px] text-text-muted">{action}</div>}
        </div>
      )}
      <div className={cn("p-3.5", contentClassName)}>{children}</div>
    </div>
  );
}

/* ─── KV ───────────────────────────────────────────────────── */

export function KV({ label, value, link = false }: { label: ReactNode; value: ReactNode; link?: boolean }) {
  return (
    <div>
      <div className="text-[10.5px] text-text-subtle uppercase tracking-[0.04em] font-semibold">{label}</div>
      <div className={cn("text-[13px] mt-0.5", link ? "text-accent-text underline" : "text-text")}>{value}</div>
    </div>
  );
}

/* ─── ProgressBar ──────────────────────────────────────────── */

export function ProgressBar({ value, size = 4, color, className }: { value: number; size?: number; color?: string; className?: string }) {
  const v = Math.min(100, Math.max(0, value));
  return (
    <div
      className={cn("w-full rounded-full overflow-hidden bg-bg-muted", className)}
      style={{ height: size }}
    >
      <div
        className="h-full transition-[width] duration-300 rounded-full"
        style={{ width: `${v}%`, background: color || "hsl(var(--accent))" }}
      />
    </div>
  );
}

/* ─── MiniStat ─────────────────────────────────────────────── */

export function MiniStat({ label, value, sub }: { label: ReactNode; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="py-2 border-b border-border">
      <div className="text-[11px] text-text-subtle uppercase tracking-[0.04em] font-semibold">{label}</div>
      <div className="text-[15px] font-semibold tabular mt-0.5">{value}</div>
      {sub && <div className="text-[11.5px] text-text-muted mt-0.5">{sub}</div>}
    </div>
  );
}

/* ─── Avatar (stable color from name) ──────────────────────── */

const AVATAR_COLORS = ["#5E6AD2", "#10894B", "#B56B0B", "#2463EB", "#D1344F", "#7C3AED", "#0891B2"];

export function LinearAvatar({
  name = "?",
  size = 28,
  color,
  className,
}: {
  name?: string;
  size?: number;
  color?: string;
  className?: string;
}) {
  const initials =
    name
      ?.split(" ")
      .map((n) => n[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?";
  const c = color || AVATAR_COLORS[((name?.charCodeAt(0) || 0) % AVATAR_COLORS.length + AVATAR_COLORS.length) % AVATAR_COLORS.length];
  return (
    <div
      className={cn("inline-flex items-center justify-center rounded-full shrink-0 text-white font-semibold", className)}
      style={{ width: size, height: size, background: c, fontSize: size * 0.4, letterSpacing: "-0.01em" }}
    >
      {initials}
    </div>
  );
}

/* ─── ActionRow — inbox-style hoverable row ────────────────── */

export interface ActionRowProps {
  title: ReactNode;
  subtitle?: ReactNode;
  priority?: Priority;
  icon?: ReactNode;
  right?: ReactNode;
  onClick?: () => void;
  className?: string;
  chevron?: boolean;
}

export function ActionRow({ title, subtitle, priority, icon, right, onClick, className, chevron = true }: ActionRowProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 px-3.5 py-2.5 border-b border-border last:border-b-0 cursor-pointer",
        "hover:bg-bg-subtle transition-colors",
        className,
      )}
      onClick={onClick}
    >
      {priority && <PriorityDot level={priority} />}
      {icon && <span className="text-text-muted shrink-0">{icon}</span>}
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-[450] text-text truncate">{title}</div>
        {subtitle && <div className="text-[11.5px] text-text-subtle mt-0.5">{subtitle}</div>}
      </div>
      {right}
      {chevron && <ChevronRight className="w-3.5 h-3.5 text-text-subtle shrink-0" />}
    </div>
  );
}

/* ─── TimelineItem ─────────────────────────────────────────── */

export function TimelineItem({
  icon,
  title,
  time,
  sub,
  active,
  last,
}: {
  icon: ReactNode;
  title: ReactNode;
  time?: ReactNode;
  sub?: ReactNode;
  active?: boolean;
  last?: boolean;
}) {
  return (
    <div className={cn("flex gap-2.5 relative", last ? "pb-0" : "pb-3")}>
      <div className="relative shrink-0">
        <div
          className={cn(
            "w-[22px] h-[22px] rounded-full grid place-items-center",
            active ? "bg-accent text-white" : "bg-bg-muted text-text-muted",
          )}
        >
          {icon}
        </div>
        {!last && (
          <div className="absolute left-[10.5px] top-[22px] -bottom-3 w-px bg-border" />
        )}
      </div>
      <div className="flex-1 pt-0.5">
        <div className="flex items-center justify-between">
          <div className={cn("text-[12.5px] text-text", active ? "font-semibold" : "font-medium")}>{title}</div>
          {time && <div className="text-[11px] text-text-subtle">{time}</div>}
        </div>
        {sub && <div className="text-[11.5px] text-text-muted mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

/* ─── EmptyState (Linear-style) ────────────────────────────── */

export function LinearEmpty({
  icon,
  title,
  description,
  actions,
  dashed = true,
}: {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  dashed?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-lg p-7 text-center bg-surface",
        dashed ? "border border-dashed border-border-strong" : "border border-border",
      )}
    >
      {icon && (
        <div className="mx-auto mb-2.5 w-9 h-9 rounded-md bg-bg-subtle grid place-items-center text-text-muted">
          {icon}
        </div>
      )}
      <div className="text-[14px] font-medium text-text">{title}</div>
      {description && <div className="text-[12.5px] text-text-muted mt-1 max-w-[360px] mx-auto">{description}</div>}
      {actions && <div className="flex items-center justify-center gap-2 mt-3.5">{actions}</div>}
    </div>
  );
}
