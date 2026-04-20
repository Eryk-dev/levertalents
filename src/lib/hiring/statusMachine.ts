import type { ApplicationStage, JobStatus } from "@/integrations/supabase/hiring-types";

export const JOB_STATUS_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  aguardando_descritivo: ["em_ajuste_pelo_rh", "encerrada"],
  em_ajuste_pelo_rh: ["aguardando_aprovacao_do_gestor", "encerrada"],
  aguardando_aprovacao_do_gestor: ["em_ajuste_pelo_rh", "pronta_para_publicar", "encerrada"],
  pronta_para_publicar: ["publicada", "encerrada"],
  publicada: ["em_triagem", "encerrada"],
  em_triagem: ["encerrada"],
  encerrada: [],
};

export const APPLICATION_STAGE_TRANSITIONS: Record<ApplicationStage, ApplicationStage[]> = {
  recebido: ["em_interesse", "recusado"],
  em_interesse: ["aguardando_fit_cultural", "recusado"],
  aguardando_fit_cultural: ["fit_recebido", "sem_retorno", "recusado"],
  sem_retorno: ["aguardando_fit_cultural", "recusado"],
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
  aguardando_descritivo: "Aguardando descritivo",
  em_ajuste_pelo_rh: "Em ajuste pelo RH",
  aguardando_aprovacao_do_gestor: "Aguardando aprovação do gestor",
  pronta_para_publicar: "Pronta para publicar",
  publicada: "Publicada",
  em_triagem: "Em triagem",
  encerrada: "Encerrada",
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
