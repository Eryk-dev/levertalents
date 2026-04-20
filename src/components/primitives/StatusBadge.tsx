import { cn } from "@/lib/utils";
import { CheckCircle2, Circle, Clock, XCircle, AlertCircle, PlayCircle } from "lucide-react";

type StatusTone = "neutral" | "pending" | "success" | "warning" | "danger" | "info";

interface StatusConfig {
  label: string;
  tone: StatusTone;
}

const EVALUATION_MAP: Record<string, StatusConfig> = {
  draft: { label: "Rascunho", tone: "neutral" },
  completed: { label: "Concluída", tone: "success" },
  reviewed: { label: "Revisada", tone: "info" },
};

const ONE_ON_ONE_MAP: Record<string, StatusConfig> = {
  scheduled: { label: "Agendada", tone: "info" },
  processing: { label: "Processando", tone: "pending" },
  completed: { label: "Concluída", tone: "success" },
  cancelled: { label: "Cancelada", tone: "danger" },
  rescheduled: { label: "Reagendada", tone: "warning" },
};

const PDI_MAP: Record<string, StatusConfig> = {
  pending_approval: { label: "Aguardando aprovação", tone: "warning" },
  approved: { label: "Aprovado", tone: "info" },
  in_progress: { label: "Em andamento", tone: "info" },
  completed: { label: "Concluído", tone: "success" },
  cancelled: { label: "Cancelado", tone: "danger" },
};

const SURVEY_MAP: Record<string, StatusConfig> = {
  draft: { label: "Rascunho", tone: "neutral" },
  active: { label: "Ativa", tone: "success" },
  closed: { label: "Encerrada", tone: "neutral" },
};

const TASK_MAP: Record<string, StatusConfig> = {
  pending: { label: "Pendente", tone: "warning" },
  in_progress: { label: "Em andamento", tone: "info" },
  completed: { label: "Concluída", tone: "success" },
  cancelled: { label: "Cancelada", tone: "danger" },
};

const ROLE_MAP: Record<string, StatusConfig> = {
  admin: { label: "Admin", tone: "danger" },
  socio: { label: "Sócio", tone: "info" },
  lider: { label: "Líder", tone: "info" },
  rh: { label: "RH", tone: "warning" },
  colaborador: { label: "Colaborador", tone: "neutral" },
};

const JOB_MAP: Record<string, StatusConfig> = {
  aguardando_descritivo: { label: "Aguardando descritivo", tone: "warning" },
  em_ajuste_pelo_rh: { label: "Em ajuste pelo RH", tone: "pending" },
  aguardando_aprovacao_do_gestor: { label: "Aguardando aprovação", tone: "warning" },
  pronta_para_publicar: { label: "Pronta para publicar", tone: "info" },
  publicada: { label: "Publicada", tone: "success" },
  em_triagem: { label: "Em triagem", tone: "info" },
  encerrada: { label: "Encerrada", tone: "neutral" },
};

const APPLICATION_MAP: Record<string, StatusConfig> = {
  recebido: { label: "Recebido", tone: "neutral" },
  em_interesse: { label: "Em interesse", tone: "info" },
  aguardando_fit_cultural: { label: "Aguardando Fit", tone: "warning" },
  sem_retorno: { label: "Sem retorno", tone: "pending" },
  fit_recebido: { label: "Fit recebido", tone: "info" },
  antecedentes_ok: { label: "Antecedentes OK", tone: "info" },
  apto_entrevista_rh: { label: "Apto p/ RH", tone: "info" },
  entrevista_rh_agendada: { label: "Entrevista RH agendada", tone: "info" },
  entrevista_rh_feita: { label: "Entrevista RH feita", tone: "info" },
  apto_entrevista_final: { label: "Apto p/ final", tone: "info" },
  entrevista_final_agendada: { label: "Entrevista final agendada", tone: "info" },
  aguardando_decisao_dos_gestores: { label: "Aguardando decisão", tone: "warning" },
  aprovado: { label: "Aprovado", tone: "success" },
  em_admissao: { label: "Em admissão", tone: "success" },
  admitido: { label: "Admitido", tone: "success" },
  reprovado_pelo_gestor: { label: "Reprovado", tone: "danger" },
  recusado: { label: "Recusado", tone: "danger" },
};

const MAPS = {
  evaluation: EVALUATION_MAP,
  "one-on-one": ONE_ON_ONE_MAP,
  pdi: PDI_MAP,
  survey: SURVEY_MAP,
  task: TASK_MAP,
  role: ROLE_MAP,
  job: JOB_MAP,
  application: APPLICATION_MAP,
};

type StatusKind = keyof typeof MAPS;

interface StatusBadgeProps {
  kind: StatusKind;
  status: string | null | undefined;
  showIcon?: boolean;
  size?: "sm" | "md";
  className?: string;
}

const toneStyles: Record<StatusTone, string> = {
  neutral: "bg-bg-subtle text-text-muted border-border",
  pending: "bg-bg-subtle text-text-muted border-border",
  success: "bg-status-green-soft text-status-green border-transparent",
  warning: "bg-status-amber-soft text-status-amber border-transparent",
  danger: "bg-status-red-soft text-status-red border-transparent",
  info: "bg-accent-soft text-accent-text border-transparent",
};

const toneIcons: Record<StatusTone, typeof Circle> = {
  neutral: Circle,
  pending: Clock,
  success: CheckCircle2,
  warning: AlertCircle,
  danger: XCircle,
  info: PlayCircle,
};

export function StatusBadge({ kind, status, showIcon = false, size = "md", className }: StatusBadgeProps) {
  const map = MAPS[kind];
  const config = (status && map[status]) || { label: status || "—", tone: "neutral" as StatusTone };
  const Icon = toneIcons[config.tone];

  const sizeStyles =
    size === "sm" ? "h-[18px] px-1.5 text-[11px] gap-1" : "h-[22px] px-2 text-[12px] gap-1";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[4px] border font-medium whitespace-nowrap",
        sizeStyles,
        toneStyles[config.tone],
        className,
      )}
    >
      {showIcon && <Icon className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} />}
      {config.label}
    </span>
  );
}
