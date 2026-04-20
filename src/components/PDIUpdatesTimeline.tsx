import { usePDIUpdates } from "@/hooks/usePDIUpdates";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TrendingUp, TrendingDown, Minus, Clock } from "lucide-react";
import { LoadingState } from "@/components/primitives/LoadingState";
import { EmptyState } from "@/components/primitives/EmptyState";
import { cn } from "@/lib/utils";

interface PDIUpdatesTimelineProps {
  pdiId: string;
}

export function PDIUpdatesTimeline({ pdiId }: PDIUpdatesTimelineProps) {
  const { data: updates = [], isLoading } = usePDIUpdates(pdiId);

  if (isLoading) {
    return <LoadingState variant="inline" message="Carregando histórico..." />;
  }

  if (updates.length === 0) {
    return (
      <EmptyState
        icon={Clock}
        title="Sem atualizações ainda"
        message="O histórico aparece à medida que você registra avanços ou ajustes no PDI."
        variant="compact"
      />
    );
  }

  return (
    <ol className="relative border-l border-border ml-4 space-y-5 pl-6">
      {updates.map((u) => {
        const change = u.progress_change ?? 0;
        const ChangeIcon = change > 0 ? TrendingUp : change < 0 ? TrendingDown : Minus;
        const changeColor =
          change > 0 ? "text-status-green" : change < 0 ? "text-destructive" : "text-muted-foreground";
        const initials = (u.author_name || "?")
          .split(" ")
          .map((n) => n[0])
          .filter(Boolean)
          .slice(0, 2)
          .join("")
          .toUpperCase();
        return (
          <li key={u.id} className="relative">
            <span className="absolute -left-[33px] h-5 w-5 rounded-full bg-surface border-2 border-accent" />
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={u.author_avatar || undefined} />
                  <AvatarFallback className="text-[10px] bg-accent-soft text-accent-text font-semibold">
                    {initials || "?"}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">{u.author_name || "Autor desconhecido"}</span>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(u.created_at), { locale: ptBR, addSuffix: true })}
                </span>
                {change !== 0 && (
                  <span className={cn("text-xs font-semibold inline-flex items-center gap-1", changeColor)}>
                    <ChangeIcon className="h-3.5 w-3.5" />
                    {change > 0 ? "+" : ""}
                    {change}%
                  </span>
                )}
              </div>
              <p className="text-sm whitespace-pre-wrap text-foreground/90">{u.update_text}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
