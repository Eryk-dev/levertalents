import { cn } from "@/lib/utils";

interface ScoreGaugeProps {
  score: number;
  maxScore?: number;
  size?: "sm" | "md" | "lg";
  label?: string;
}

export function ScoreGauge({ score, maxScore = 5, size = "md", label }: ScoreGaugeProps) {
  const percentage = (score / maxScore) * 100;
  const angle = (percentage / 100) * 180;
  
  const getColor = () => {
    if (score >= 4.2) return "hsl(var(--status-green))";
    if (score >= 3.8) return "hsl(var(--status-yellow))";
    return "hsl(var(--status-red))";
  };
  
  const sizeClasses = {
    sm: "w-32 h-32",
    md: "w-48 h-48",
    lg: "w-64 h-64",
  };
  
  return (
    <div className={cn("gauge-container flex-col", sizeClasses[size])}>
      <div className="relative w-full h-full">
        <svg viewBox="0 0 200 120" className="w-full h-full">
          {/* Background arc */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="hsl(var(--border))"
            strokeWidth="20"
            strokeLinecap="round"
          />
          {/* Colored arc */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke={getColor()}
            strokeWidth="20"
            strokeLinecap="round"
            strokeDasharray={`${(angle / 180) * 251.2} 251.2`}
            style={{ transition: "stroke-dasharray 1s ease-in-out" }}
          />
          {/* Score text */}
          <text
            x="100"
            y="90"
            textAnchor="middle"
            className="text-4xl font-bold fill-foreground"
          >
            {score.toFixed(1)}
          </text>
          <text
            x="100"
            y="110"
            textAnchor="middle"
            className="text-sm fill-muted-foreground"
          >
            / {maxScore.toFixed(1)}
          </text>
        </svg>
      </div>
      {label && (
        <p className="mt-2 text-sm font-medium text-center text-muted-foreground">
          {label}
        </p>
      )}
    </div>
  );
}
