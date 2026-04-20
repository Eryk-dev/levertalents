import type { ApplicationStage, JobStatus } from "@/integrations/supabase/hiring-types";

export const JOB_STATUS_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  aguardando_publicacao: ["publicada", "fechada"],
  publicada: ["aguardando_publicacao", "fechada"],
  fechada: ["aguardando_publicacao", "publicada"],
};

export const APPLICATION_STAGE_TRANSITIONS: Record<ApplicationStage, ApplicationStage[]> = {
  recebido: ["em_interesse", "recusado"],
  // Fit Cultural deixou de ser etapa do Kanban — vai direto para Checagem.
  em_interesse: ["antecedentes_ok", "recusado"],
  // Stages legados mantidos para compatibilidade com dados antigos; todos
  // avançam para antecedentes_ok quando o RH mover adiante.
  aguardando_fit_cultural: ["antecedentes_ok", "recusado"],
  sem_retorno: ["antecedentes_ok", "recusado"],
  fit_recebido: ["antecedentes_ok", "recusado"],
  antecedentes_ok: ["apto_entrevista_rh", "recusado"],
  apto_entrevista_rh: ["entrevista_rh_agendada", "recusado"],
  entrevista_rh_agendada: ["entrevista_rh_feita", "recusado"],
  entrevista_rh_feita: ["apto_entrevista_final", "recusado"],
  apto_entrevista_final: ["entrevista_final_agendada", "recusado"],
  entrevista_final_agendada: ["aguardando_decisao_dos_gestores", "recusado"],
  aguardando_decisao_dos_gestores: ["aprovado", "reprovado_pelo_gestor"],
  aprovado: ["em_admissao"],
  em_admissao: ["admitido"],
  admitido: [],
  reprovado_pelo_gestor: [],
  recusado: [],
};

export type TransitionKind = "job" | "application";

export function canTransition(
  from: JobStatus | ApplicationStage,
  to: JobStatus | ApplicationStage,
  kind: TransitionKind,
): boolean {
  if (from === to) return true;
  const table = kind === "job" ? JOB_STATUS_TRANSITIONS : APPLICATION_STAGE_TRANSITIONS;
  const allowed = (table as Record<string, string[]>)[from];
  return Array.isArray(allowed) && allowed.includes(to);
}

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  aguardando_publicacao: "Aguardando publicação",
  publicada: "Publicada",
  fechada: "Fechada",
};

export const APPLICATION_STAGE_LABELS: Record<ApplicationStage, string> = {
  recebido: "Recebido",
  em_interesse: "Em interesse",
  aguardando_fit_cultural: "Aguardando Fit Cultural",
  sem_retorno: "Sem retorno",
  fit_recebido: "Fit recebido",
  antecedentes_ok: "Antecedentes OK",
  apto_entrevista_rh: "Apto p/ entrevista RH",
  entrevista_rh_agendada: "Entrevista RH agendada",
  entrevista_rh_feita: "Entrevista RH feita",
  apto_entrevista_final: "Apto p/ entrevista final",
  entrevista_final_agendada: "Entrevista final agendada",
  aguardando_decisao_dos_gestores: "Aguardando decisão",
  aprovado: "Aprovado",
  em_admissao: "Em admissão",
  admitido: "Admitido",
  reprovado_pelo_gestor: "Reprovado",
  recusado: "Recusado",
};
