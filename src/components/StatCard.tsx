import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: LucideIcon;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  className?: string;
}

export function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  trendValue,
  className 
}: StatCardProps) {
  return (
    <div className={cn("stat-card", className)}>
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold">{value}</p>
          {trendValue && (
            <p className={cn(
              "text-sm font-medium",
              trend === "up" && "text-status-green",
              trend === "down" && "text-status-red",
              trend === "neutral" && "text-muted-foreground"
            )}>
              {trendValue}
            </p>
          )}
        </div>
        {Icon && (
          <div className="rounded-lg bg-accent/10 p-3">
            <Icon className="h-6 w-6 text-accent" />
          </div>
        )}
      </div>
    </div>
  );
}
