import { LucideIcon } from "lucide-react";
import { StatCard as StatCardPrimitive } from "@/components/primitives/StatCard";

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: LucideIcon;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  className?: string;
}

export function StatCard({ title, value, icon, trend, trendValue, className }: StatCardProps) {
  return (
    <StatCardPrimitive
      label={title}
      value={value}
      icon={icon}
      trend={trend && trendValue ? { direction: trend, value: trendValue } : undefined}
      className={className}
    />
  );
}
