import type { ApplicationStage } from "@/integrations/supabase/hiring-types";
import {
  FileText,
  Sparkles,
  ShieldCheck,
  Users,
  CalendarCheck2,
  Check,
  XOctagon,
  type LucideIcon,
} from "lucide-react";

/**
 * Grupos consolidados para o Kanban de candidatos.
 * De 16 stages → 6 colunas ativas + 1 descartados (colapsada).
 * Cada grupo agrupa sub-stages; a primeira sub-stage é o "smart default"
 * ao receber um card via drag-and-drop.
 */
export type StageGroupKey =
  | "triagem"
  | "fit"
  | "checagem"
  | "entrevista_rh"
  | "entrevista_final"
  | "decisao"
  | "descartados";

export interface StageGroup {
  key: StageGroupKey;
  label: string;
  description?: string;
  icon: LucideIcon;
  stages: ApplicationStage[];
  tone: "neutral" | "info" | "warning" | "success" | "danger";
  /** Sub-stage usada ao dropar um card aqui sem escolher sub-stage. */
  defaultStage: ApplicationStage;
}

export const STAGE_GROUPS: StageGroup[] = [
  {
    key: "triagem",
    label: "Triagem",
    description: "Recebidos + pré-seleção",
    icon: FileText,
    tone: "neutral",
    stages: ["recebido", "em_interesse"],
    defaultStage: "em_interesse",
  },
  {
    key: "fit",
    label: "Fit Cultural",
    description: "Questionário enviado / respondido",
    icon: Sparkles,
    tone: "info",
    stages: ["aguardando_fit_cultural", "sem_retorno", "fit_recebido"],
    defaultStage: "aguardando_fit_cultural",
  },
  {
    key: "checagem",
    label: "Checagem",
    description: "Antecedentes aprovados",
    icon: ShieldCheck,
    tone: "info",
    stages: ["antecedentes_ok"],
    defaultStage: "antecedentes_ok",
  },
  {
    key: "entrevista_rh",
    label: "Entrevista RH",
    description: "Apto → agendada → feita",
    icon: Users,
    tone: "info",
    stages: ["apto_entrevista_rh", "entrevista_rh_agendada", "entrevista_rh_feita"],
    defaultStage: "apto_entrevista_rh",
  },
  {
    key: "entrevista_final",
    label: "Entrevista Final",
    description: "Apto → agendada → aguardando",
    icon: CalendarCheck2,
    tone: "warning",
    stages: [
      "apto_entrevista_final",
      "entrevista_final_agendada",
      "aguardando_decisao_dos_gestores",
    ],
    defaultStage: "apto_entrevista_final",
  },
  {
    key: "decisao",
    label: "Decisão",
    description: "Aprovado → admissão → admitido",
    icon: Check,
    tone: "success",
    stages: ["aprovado", "em_admissao", "admitido"],
    defaultStage: "aprovado",
  },
  {
    key: "descartados",
    label: "Descartados",
    description: "Recusados / reprovados",
    icon: XOctagon,
    tone: "danger",
    stages: ["recusado", "reprovado_pelo_gestor"],
    defaultStage: "recusado",
  },
];

export const STAGE_GROUP_BY_STAGE: Record<ApplicationStage, StageGroupKey> = (() => {
  const map = {} as Record<ApplicationStage, StageGroupKey>;
  for (const g of STAGE_GROUPS) {
    for (const s of g.stages) map[s] = g.key;
  }
  return map;
})();

export function groupOf(stage: ApplicationStage): StageGroup {
  const key = STAGE_GROUP_BY_STAGE[stage];
  return STAGE_GROUPS.find((g) => g.key === key) ?? STAGE_GROUPS[0];
}

export const STAGE_GROUP_TONE_CLASSES: Record<StageGroup["tone"], string> = {
  neutral: "bg-bg-subtle text-text-muted",
  info: "bg-accent-soft text-accent-text",
  warning: "bg-status-amber-soft text-status-amber",
  success: "bg-status-green-soft text-status-green",
  danger: "bg-status-red-soft text-status-red",
};

/** Cores (dot) para a coluna kanban — Linear-style: só a bolinha do header. */
export const STAGE_GROUP_DOT_COLORS: Record<StageGroupKey, string> = {
  triagem: "hsl(var(--text-subtle))",
  fit: "#8B5CF6",
  checagem: "hsl(var(--status-blue))",
  entrevista_rh: "hsl(var(--status-blue))",
  entrevista_final: "hsl(var(--status-amber))",
  decisao: "hsl(var(--status-green))",
  descartados: "hsl(var(--text-subtle))",
};

/** Cores para a mini-sparkbar do JobCard (distribuição por grupo). */
export const STAGE_GROUP_BAR_COLORS: Record<StageGroupKey, string> = {
  triagem: "bg-text-subtle/40",
  fit: "bg-[#8B5CF6]/70",
  checagem: "bg-status-blue/70",
  entrevista_rh: "bg-status-blue/80",
  entrevista_final: "bg-status-amber/80",
  decisao: "bg-status-green",
  descartados: "bg-status-red/60",
};
