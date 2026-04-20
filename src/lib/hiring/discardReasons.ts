/**
 * Motivos de descarte de candidato.
 *
 * O RH escolhe um motivo obrigatório e, separadamente, decide se o candidato
 * entra no Banco de Talentos. `suggestTalentPool` é só um default para o toggle
 * — a decisão final é sempre do RH.
 */
export type DiscardReason =
  | "antecedentes_reprovados"
  | "perfil_desalinhado"
  | "experiencia_insuficiente"
  | "expectativa_salarial"
  | "candidato_desistiu"
  | "sem_retorno_candidato"
  | "reprovado_entrevista_rh"
  | "reprovado_entrevista_final"
  | "avaliacao_rh_negativa"
  | "posicao_preenchida"
  | "outro";

export interface DiscardReasonOption {
  value: DiscardReason;
  label: string;
  description: string;
  suggestTalentPool: boolean;
}

export const DISCARD_REASONS: DiscardReasonOption[] = [
  {
    value: "perfil_desalinhado",
    label: "Perfil não bate com a vaga",
    description: "Pode servir para outra oportunidade",
    suggestTalentPool: true,
  },
  {
    value: "experiencia_insuficiente",
    label: "Experiência insuficiente",
    description: "Pode amadurecer e reaplicar",
    suggestTalentPool: true,
  },
  {
    value: "posicao_preenchida",
    label: "Posição preenchida por outro candidato",
    description: "Bom candidato, só não foi o escolhido",
    suggestTalentPool: true,
  },
  {
    value: "expectativa_salarial",
    label: "Expectativa salarial incompatível",
    description: "Pode servir para vagas com outra faixa",
    suggestTalentPool: true,
  },
  {
    value: "candidato_desistiu",
    label: "Candidato desistiu",
    description: "Retirou-se do processo espontaneamente",
    suggestTalentPool: true,
  },
  {
    value: "reprovado_entrevista_rh",
    label: "Reprovado na entrevista de RH",
    description: "RH decide se volta ao banco",
    suggestTalentPool: false,
  },
  {
    value: "reprovado_entrevista_final",
    label: "Reprovado na entrevista final",
    description: "Gestor reprovou — RH decide o banco",
    suggestTalentPool: false,
  },
  {
    value: "antecedentes_reprovados",
    label: "Antecedentes reprovados",
    description: "Não volta ao banco de talentos",
    suggestTalentPool: false,
  },
  {
    value: "avaliacao_rh_negativa",
    label: "Avaliação negativa do RH",
    description: "Comportamento / postura incompatível",
    suggestTalentPool: false,
  },
  {
    value: "sem_retorno_candidato",
    label: "Candidato não retornou",
    description: "Sumiu ao longo do processo",
    suggestTalentPool: false,
  },
  {
    value: "outro",
    label: "Outro motivo",
    description: "Detalhar nas observações",
    suggestTalentPool: false,
  },
];

export const DISCARD_REASON_LABELS: Record<DiscardReason, string> = Object.fromEntries(
  DISCARD_REASONS.map((r) => [r.value, r.label]),
) as Record<DiscardReason, string>;

export function findDiscardReason(value: DiscardReason | null | undefined): DiscardReasonOption | null {
  if (!value) return null;
  return DISCARD_REASONS.find((r) => r.value === value) ?? null;
}
