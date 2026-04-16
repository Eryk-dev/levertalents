import { cn } from "@/lib/utils";
import { LucideIcon, Info } from "lucide-react";

interface EmptyStateProps {
  message: string;
  title?: string;
  icon?: LucideIcon;
  className?: string;
}

// Bloco visual para uso em cards/dashboards que ainda não têm dados reais
// para exibir. Princípio III da constituição: não fabricar números.
export function EmptyState({ message, title, icon: Icon = Info, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center p-6 rounded-lg border border-dashed bg-muted/30",
        className
      )}
    >
      <Icon className="h-6 w-6 text-muted-foreground mb-2" />
      {title && <p className="font-medium text-sm mb-1">{title}</p>}
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
