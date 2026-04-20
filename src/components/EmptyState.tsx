import { LucideIcon, Info } from "lucide-react";
import { EmptyState as EmptyStatePrimitive } from "@/components/primitives/EmptyState";

interface EmptyStateProps {
  message: string;
  title?: string;
  icon?: LucideIcon;
  className?: string;
}

export function EmptyState({ message, title, icon = Info, className }: EmptyStateProps) {
  return (
    <EmptyStatePrimitive
      title={title || message}
      message={title ? message : undefined}
      icon={icon}
      variant="decorated"
      className={className}
    />
  );
}
