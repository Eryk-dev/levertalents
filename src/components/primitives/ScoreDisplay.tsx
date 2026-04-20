import { cn } from "@/lib/utils";

type ScoreVariant = "gauge" | "badge" | "inline" | "bar";

interface ScoreDisplayProps {
  score: number | null | undefined;
  max?: number;
  variant?: ScoreVariant;
  label?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

function toneForScore(score: number, max: number): "low" | "mid" | "high" {
  const ratio = score / max;
  if (ratio >= 0.7) return "high";
  if (ratio >= 0.4) return "mid";
  return "low";
}

const toneColor: Record<"low" | "mid" | "high", string> = {
  low: "hsl(var(--status-red))",
  mid: "hsl(var(--status-yellow))",
  high: "hsl(var(--status-green))",
};

const toneClass: Record<"low" | "mid" | "high", string> = {
  low: "text-status-red",
  mid: "text-[hsl(38_90%_38%)]",
  high: "text-status-green",
};

export function ScoreDisplay({
  score,
  max = 5,
  variant = "inline",
  label,
  className,
  size = "md",
}: ScoreDisplayProps) {
  const hasScore = typeof score === "number" && !isNaN(score);
  const normalized = hasScore ? Math.max(0, Math.min(max, score)) : 0;
  const tone = hasScore ? toneForScore(normalized, max) : "low";
  const display = hasScore ? normalized.toFixed(1) : "—";

  if (variant === "gauge") {
    const sizePx = size === "sm" ? 80 : size === "lg" ? 140 : 110;
    const stroke = size === "sm" ? 6 : size === "lg" ? 10 : 8;
    const radius = sizePx / 2 - stroke;
    const circumference = 2 * Math.PI * radius;
    const offset = hasScore ? circumference * (1 - normalized / max) : circumference;

    return (
      <div className={cn("flex flex-col items-center gap-2", className)}>
        <div className="relative" style={{ width: sizePx, height: sizePx }}>
          <svg width={sizePx} height={sizePx} className="-rotate-90">
            <circle
              cx={sizePx / 2}
              cy={sizePx / 2}
              r={radius}
              stroke="hsl(var(--border))"
              strokeWidth={stroke}
              fill="none"
            />
            <circle
              cx={sizePx / 2}
              cy={sizePx / 2}
              r={radius}
              stroke={toneColor[tone]}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              fill="none"
              className="transition-all duration-500"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={cn("font-bold tabular-nums", size === "lg" ? "text-3xl" : size === "sm" ? "text-lg" : "text-2xl")}>
              {display}
            </span>
            <span className="text-xs text-muted-foreground">de {max}</span>
          </div>
        </div>
        {label && <span className="text-xs text-muted-foreground">{label}</span>}
      </div>
    );
  }

  if (variant === "badge") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium tabular-nums",
          toneClass[tone],
          `border-current/20 bg-current/5`,
          className,
        )}
      >
        <span>{display}</span>
        <span className="text-muted-foreground">/ {max}</span>
      </span>
    );
  }

  if (variant === "bar") {
    const pct = hasScore ? (normalized / max) * 100 : 0;
    return (
      <div className={cn("space-y-1.5 min-w-[120px]", className)}>
        {label && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{label}</span>
            <span className={cn("font-semibold tabular-nums", toneClass[tone])}>{display}</span>
          </div>
        )}
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, backgroundColor: toneColor[tone] }}
          />
        </div>
      </div>
    );
  }

  // inline
  return (
    <div className={cn("inline-flex items-baseline gap-1.5 tabular-nums", className)}>
      <span className={cn("font-bold", toneClass[tone], size === "lg" ? "text-2xl" : size === "sm" ? "text-sm" : "text-lg")}>
        {display}
      </span>
      <span className="text-xs text-muted-foreground">/ {max}</span>
      {label && <span className="text-xs text-muted-foreground ml-1">{label}</span>}
    </div>
  );
}
