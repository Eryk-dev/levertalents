import { NineBoxCell, NineBoxDistribution, NineBoxUser } from "@/hooks/useNineBoxDistribution";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/primitives/EmptyState";
import { BarChart3 } from "lucide-react";

type CellConfig = {
  key: NineBoxCell;
  label: string;
  description: string;
  tone: "danger" | "warning" | "neutral" | "info" | "success" | "accent";
};

// Layout: rows go from high potential (top) to low potential (bottom).
// Cols go from low performance (left) to high performance (right).
const ROWS: { potentialCat: "high" | "mid" | "low"; label: string }[] = [
  { potentialCat: "high", label: "Potencial alto" },
  { potentialCat: "mid", label: "Potencial médio" },
  { potentialCat: "low", label: "Potencial baixo" },
];

const CELL_META: Record<NineBoxCell, Omit<CellConfig, "key">> = {
  "low-high": { label: "Enigma", description: "Alto potencial, baixa entrega — investigar contexto", tone: "warning" },
  "mid-high": { label: "Crescimento", description: "Bom potencial, entrega razoável — plano de aceleração", tone: "info" },
  "high-high": { label: "Estrela", description: "Alta entrega com alto potencial — reter e expor", tone: "success" },
  "low-mid": { label: "Dilema", description: "Potencial médio, baixa entrega — avaliar ajuste de função", tone: "warning" },
  "mid-mid": { label: "Mantenedor", description: "Sólido e previsível — consistência é valor", tone: "neutral" },
  "high-mid": { label: "Alto performer", description: "Entrega forte com potencial médio — recompensar", tone: "info" },
  "low-low": { label: "Em risco", description: "Baixa entrega e baixo potencial — intervenção urgente", tone: "danger" },
  "mid-low": { label: "Efetivo", description: "Entrega média, potencial limitado — manter na função", tone: "neutral" },
  "high-low": { label: "Especialista", description: "Alta entrega, potencial técnico — chave no time", tone: "accent" },
};

const toneStyles: Record<CellConfig["tone"], string> = {
  danger: "bg-status-red-soft border-status-red/20",
  warning: "bg-status-amber-soft border-status-amber/20",
  neutral: "bg-bg-subtle border-border",
  info: "bg-accent-soft border-accent/20",
  success: "bg-status-green-soft border-status-green/20",
  accent: "bg-accent-soft border-accent/20",
};

const toneLabel: Record<CellConfig["tone"], string> = {
  danger: "text-status-red",
  warning: "text-status-amber",
  neutral: "text-text-muted",
  info: "text-accent-text",
  success: "text-status-green",
  accent: "text-accent-text",
};

function UserChip({ user }: { user: NineBoxUser }) {
  const initials = user.fullName
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Avatar className="h-7 w-7 ring-2 ring-background cursor-default transition-transform hover:scale-110">
          <AvatarImage src={user.avatarUrl || undefined} />
          <AvatarFallback className="text-[10px] bg-accent text-white font-semibold">
            {initials || "?"}
          </AvatarFallback>
        </Avatar>
      </TooltipTrigger>
      <TooltipContent side="top">
        <div className="space-y-0.5">
          <p className="font-semibold">{user.fullName}</p>
          <p className="text-xs text-muted-foreground">
            Perf: {user.performance.toFixed(1)} · Pot: {user.potential.toFixed(1)}
          </p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

function Cell({ cell, users }: { cell: NineBoxCell; users: NineBoxUser[] }) {
  const meta = CELL_META[cell];
  return (
    <div
      className={cn(
        "min-h-[120px] p-3 rounded-lg border flex flex-col gap-2 transition-base",
        toneStyles[meta.tone],
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className={cn("text-xs font-semibold uppercase tracking-wide", toneLabel[meta.tone])}>
            {meta.label}
          </p>
          <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
            {meta.description}
          </p>
        </div>
        <span className="text-xs font-semibold tabular-nums text-foreground shrink-0">
          {users.length}
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5 mt-auto">
        {users.slice(0, 6).map((u) => (
          <UserChip key={u.userId} user={u} />
        ))}
        {users.length > 6 && (
          <div className="h-7 min-w-7 px-1.5 rounded-full bg-background border border-border flex items-center justify-center text-[10px] font-medium text-muted-foreground">
            +{users.length - 6}
          </div>
        )}
      </div>
    </div>
  );
}

interface NineBoxMatrixProps {
  distribution: NineBoxDistribution | undefined;
  emptyMessage?: string;
}

export function NineBoxMatrix({ distribution, emptyMessage }: NineBoxMatrixProps) {
  const total = distribution?.totalEvaluated || 0;

  if (!distribution || total === 0) {
    return (
      <EmptyState
        icon={BarChart3}
        title="Matriz 9BOX em construção"
        message={
          emptyMessage ||
          "A distribuição aparece aqui quando há avaliações concluídas com score de performance e liderança."
        }
        variant="decorated"
      />
    );
  }

  return (
    <TooltipProvider delayDuration={120}>
      <div className="flex gap-3">
        <div className="flex flex-col justify-between py-2 text-xs text-muted-foreground uppercase tracking-wider">
          {ROWS.map((row) => (
            <div key={row.potentialCat} className="h-[120px] flex items-center">
              <span className="-rotate-90 whitespace-nowrap">{row.label}</span>
            </div>
          ))}
        </div>
        <div className="flex-1">
          <div className="grid grid-cols-3 gap-3">
            {ROWS.map((row) =>
              (["low", "mid", "high"] as const).map((perfCat) => {
                const cell = `${perfCat}-${row.potentialCat}` as NineBoxCell;
                const users = distribution.byCell[cell] || [];
                return <Cell key={cell} cell={cell} users={users} />;
              }),
            )}
          </div>
          <div className="grid grid-cols-3 gap-3 mt-2 text-xs text-muted-foreground uppercase tracking-wider text-center">
            <span>Performance baixa</span>
            <span>Performance média</span>
            <span>Performance alta</span>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
