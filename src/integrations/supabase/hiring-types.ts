// T013 equivalent — hiring schema types.
//
// Ideal path: regenerate `src/integrations/supabase/types.ts` via
// `supabase gen types typescript --local`. In this environment the CLI is not
// available, so these handwritten shapes mirror the 9 hiring migrations
// (20260416193000–20260416193700_*) and are kept here as a dedicated module
// that augments `Database["public"]["Tables"] | ["Enums"] | ["Functions"]`
// via TypeScript declaration merging — no edit to the auto-generated file.

import type { Database } from "./types";

// --- Hiring enums ---------------------------------------------------------

export type WorkMode = "presencial" | "remoto" | "hibrido";
export type ContractType = "clt" | "pj" | "estagio" | "pj_equity";
export type JobStatus =
  | "aguardando_publicacao"
  | "publicada"
  | "fechada";
export type JobCloseReason = "contratado" | "cancelado" | "congelado";
export type PublicationChannel = "linkedin" | "indeed" | "instagram" | "outros";
export type DescriptionApproval = "rascunho" | "enviado" | "aprovado" | "rejeitado";
export type DocumentType = "cpf" | "passport" | "rne" | "other";
export type AnonymizationReason = "solicitacao" | "retencao_expirada";
export type ApplicationStage =
  | "recebido"
  | "em_interesse"
  | "aguardando_fit_cultural"
  | "sem_retorno"
  | "fit_recebido"
  | "antecedentes_ok"
  | "apto_entrevista_rh"
  | "entrevista_rh_agendada"
  | "entrevista_rh_feita"
  | "apto_entrevista_final"
  | "entrevista_final_agendada"
  | "aguardando_decisao_dos_gestores"
  | "aprovado"
  | "em_admissao"
  | "admitido"
  | "reprovado_pelo_gestor"
  | "recusado";
export type FitQuestionKind = "scale" | "text" | "multi_choice";
export type BackgroundStatus = "limpo" | "pendencia_leve" | "pendencia_grave" | "nao_aplicavel";
export type InterviewKind = "rh" | "final";
export type InterviewMode = "presencial" | "remota";
export type InterviewStatus = "agendada" | "realizada" | "cancelada";
export type EvaluatorDecision = "aprovado" | "reprovado" | "pendente";
export type HiringOutcome = "aprovado" | "reprovado";
export type StandardMessageKind = "recusa" | "convite_fit" | "oferta" | "aprovacao_proxima_etapa";
export type LogAction = "view" | "update" | "optimistic_conflict";
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
export type CandidateConversationKind =
  | "discovery"
  | "followup"
  | "referencia"
  | "alinhamento"
  | "outro";

// --- Table rows -----------------------------------------------------------

export type JobOpeningRow = {
  id: string;
  company_id: string;
  requested_by: string;
  title: string;
  summary: string | null;
  sector: string | null;
  work_mode: WorkMode | null;
  contract_type: ContractType | null;
  hours_per_week: number | null;
  required_skills: string[];
  salary_min_cents: number | null;
  salary_max_cents: number | null;
  benefits: string | null;
  confidential: boolean;
  confidential_participant_ids: string[];
  status: JobStatus;
  close_reason: JobCloseReason | null;
  target_deadline: string | null;
  opened_at: string;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
  // Estrutura da vaga (migration 20260420120100)
  num_openings: number;
  shift: string | null;
  override_address: boolean;
  address_street: string | null;
  address_number: string | null;
  address_complement: string | null;
  address_neighborhood: string | null;
  address_city: string | null;
  address_state: string | null;
  address_zip: string | null;
  public_slug: string | null;
  cultural_fit_survey_id: string | null;
};
export type JobOpeningInsert = Omit<
  JobOpeningRow,
  | "id"
  | "created_at"
  | "updated_at"
  | "opened_at"
  | "closed_at"
  | "num_openings"
  | "override_address"
> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
  opened_at?: string;
  closed_at?: string | null;
  required_skills?: string[];
  confidential?: boolean;
  confidential_participant_ids?: string[];
  status?: JobStatus;
  num_openings?: number;
  override_address?: boolean;
  shift?: string | null;
  address_street?: string | null;
  address_number?: string | null;
  address_complement?: string | null;
  address_neighborhood?: string | null;
  address_city?: string | null;
  address_state?: string | null;
  address_zip?: string | null;
  public_slug?: string | null;
  cultural_fit_survey_id?: string | null;
};
export type JobOpeningUpdate = Partial<JobOpeningRow>;

export type JobDescriptionRow = {
  id: string;
  job_opening_id: string;
  version: number;
  content_md: string | null;
  author_id: string;
  approval_state: DescriptionApproval;
  approver_id: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  pdf_path: string | null;
  created_at: string;
  updated_at: string;
  // Campos estruturados (migration 20260420120100)
  daily_routine: string | null;
  requirements: string[];
  expectations: string | null;
  work_schedule: string | null;
  benefits_list: string[];
};
export type JobDescriptionInsert = Omit<
  JobDescriptionRow,
  | "id"
  | "created_at"
  | "updated_at"
  | "approval_state"
  | "approver_id"
  | "approved_at"
  | "rejection_reason"
  | "pdf_path"
  | "requirements"
  | "benefits_list"
> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
  approval_state?: DescriptionApproval;
  approver_id?: string | null;
  approved_at?: string | null;
  rejection_reason?: string | null;
  pdf_path?: string | null;
  requirements?: string[];
  benefits_list?: string[];
  daily_routine?: string | null;
  expectations?: string | null;
  work_schedule?: string | null;
};
export type JobDescriptionUpdate = Partial<JobDescriptionRow>;

export type JobExternalPublicationRow = {
  id: string;
  job_opening_id: string;
  channel: PublicationChannel;
  url: string;
  published_at: string;
  published_by: string;
  note: string | null;
  created_at: string;
  updated_at: string;
};
export type JobExternalPublicationInsert = Omit<
  JobExternalPublicationRow,
  "id" | "created_at" | "updated_at"
> & { id?: string; created_at?: string; updated_at?: string };
export type JobExternalPublicationUpdate = Partial<JobExternalPublicationRow>;

export type CandidateRow = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  cpf: string | null;
  document_type: DocumentType;
  document_number: string | null;
  source: string | null;
  cv_storage_path: string | null;
  anonymized_at: string | null;
  anonymization_reason: AnonymizationReason | null;
  created_at: string;
  updated_at: string;
};
export type CandidateInsert = Omit<CandidateRow, "id" | "created_at" | "updated_at" | "document_type" | "anonymized_at" | "anonymization_reason"> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
  document_type?: DocumentType;
  anonymized_at?: string | null;
  anonymization_reason?: AnonymizationReason | null;
};
export type CandidateUpdate = Partial<CandidateRow>;

export type ApplicationRow = {
  id: string;
  candidate_id: string;
  job_opening_id: string;
  stage: ApplicationStage;
  stage_entered_at: string;
  last_moved_by: string | null;
  notes: string | null;
  rejection_message_id: string | null;
  discard_reason: DiscardReason | null;
  discard_notes: string | null;
  added_to_talent_pool: boolean;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
};
export type ApplicationInsert = Omit<
  ApplicationRow,
  | "id"
  | "created_at"
  | "updated_at"
  | "stage"
  | "stage_entered_at"
  | "last_moved_by"
  | "notes"
  | "rejection_message_id"
  | "discard_reason"
  | "discard_notes"
  | "added_to_talent_pool"
  | "closed_at"
> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
  stage?: ApplicationStage;
  stage_entered_at?: string;
  last_moved_by?: string | null;
  notes?: string | null;
  rejection_message_id?: string | null;
  discard_reason?: DiscardReason | null;
  discard_notes?: string | null;
  added_to_talent_pool?: boolean;
  closed_at?: string | null;
};
export type ApplicationUpdate = Partial<ApplicationRow>;

export type ApplicationStageHistoryRow = {
  id: string;
  application_id: string;
  from_stage: ApplicationStage | null;
  to_stage: ApplicationStage;
  moved_by: string;
  moved_at: string;
  note: string | null;
};

export type CulturalFitSurveyRow = {
  id: string;
  name: string;
  company_id: string | null;
  active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
};
export type CulturalFitSurveyInsert = Omit<
  CulturalFitSurveyRow,
  "id" | "created_at" | "updated_at" | "active"
> & { id?: string; created_at?: string; updated_at?: string; active?: boolean };
export type CulturalFitSurveyUpdate = Partial<CulturalFitSurveyRow>;

export type CulturalFitQuestionRow = {
  id: string;
  survey_id: string;
  order_index: number;
  kind: FitQuestionKind;
  prompt: string;
  options: unknown | null;
  scale_min: number | null;
  scale_max: number | null;
  created_at: string;
  updated_at: string;
};
export type CulturalFitQuestionInsert = Omit<
  CulturalFitQuestionRow,
  "id" | "created_at" | "updated_at"
> & { id?: string; created_at?: string; updated_at?: string };
export type CulturalFitQuestionUpdate = Partial<CulturalFitQuestionRow>;

export type CulturalFitTokenRow = {
  id: string;
  application_id: string;
  survey_id: string;
  token_hash: string;
  issued_at: string;
  expires_at: string;
  consumed_at: string | null;
  revoked_at: string | null;
};

export type CulturalFitResponseRow = {
  id: string;
  application_id: string;
  survey_id: string;
  submitted_at: string;
  payload: Record<string, unknown>;
  anonymized_at: string | null;
  created_at: string;
  updated_at: string;
};

export type BackgroundCheckRow = {
  id: string;
  application_id: string;
  status_flag: BackgroundStatus;
  file_path: string | null;
  note: string | null;
  uploaded_by: string;
  uploaded_at: string;
  created_at: string;
  updated_at: string;
};
export type BackgroundCheckInsert = Omit<
  BackgroundCheckRow,
  "id" | "created_at" | "updated_at" | "uploaded_at"
> & { id?: string; created_at?: string; updated_at?: string; uploaded_at?: string };
export type BackgroundCheckUpdate = Partial<BackgroundCheckRow>;

export type InterviewRow = {
  id: string;
  application_id: string;
  kind: InterviewKind;
  scheduled_at: string;
  duration_minutes: number;
  mode: InterviewMode;
  location_or_link: string | null;
  participants: string[];
  status: InterviewStatus;
  summary: string | null;
  transcript_path: string | null;
  transcript_text: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};
export type InterviewInsert = Omit<
  InterviewRow,
  "id" | "created_at" | "updated_at" | "status" | "duration_minutes" | "summary" | "transcript_path" | "transcript_text" | "location_or_link"
> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
  status?: InterviewStatus;
  duration_minutes?: number;
  summary?: string | null;
  transcript_path?: string | null;
  transcript_text?: string | null;
  location_or_link?: string | null;
};
export type InterviewUpdate = Partial<InterviewRow>;

export type InterviewDecisionRow = {
  id: string;
  interview_id: string;
  evaluator_id: string;
  decision: EvaluatorDecision;
  comments: string | null;
  decided_at: string | null;
  created_at: string;
  updated_at: string;
};
export type InterviewDecisionInsert = Omit<
  InterviewDecisionRow,
  "id" | "created_at" | "updated_at" | "decision" | "comments" | "decided_at"
> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
  decision?: EvaluatorDecision;
  comments?: string | null;
  decided_at?: string | null;
};
export type InterviewDecisionUpdate = Partial<InterviewDecisionRow>;

export type HiringDecisionRow = {
  id: string;
  application_id: string;
  outcome: HiringOutcome;
  decided_at: string;
  summary: string | null;
  created_at: string;
  updated_at: string;
};

export type EmployeeOnboardingHandoffRow = {
  id: string;
  application_id: string;
  profile_id: string;
  team_id: string | null;
  leader_id: string | null;
  start_date: string | null;
  contract_type: ContractType | null;
  cost_cents: number | null;
  final_title: string | null;
  onboarded_at: string | null;
  created_at: string;
  updated_at: string;
};
export type EmployeeOnboardingHandoffInsert = Omit<
  EmployeeOnboardingHandoffRow,
  "id" | "created_at" | "updated_at" | "onboarded_at"
> & { id?: string; created_at?: string; updated_at?: string; onboarded_at?: string | null };
export type EmployeeOnboardingHandoffUpdate = Partial<EmployeeOnboardingHandoffRow>;

export type StandardMessageRow = {
  id: string;
  kind: StandardMessageKind;
  title: string;
  body_md: string;
  active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
};
export type StandardMessageInsert = Omit<
  StandardMessageRow,
  "id" | "created_at" | "updated_at" | "active"
> & { id?: string; created_at?: string; updated_at?: string; active?: boolean };
export type StandardMessageUpdate = Partial<StandardMessageRow>;

export type CandidateAccessLogRow = {
  id: string;
  candidate_id: string;
  actor_id: string;
  action: LogAction;
  resource: string;
  resource_id: string;
  expected_version: string | null;
  actual_version: string | null;
  at: string;
};

export type CandidateConversationRow = {
  id: string;
  candidate_id: string;
  kind: CandidateConversationKind;
  title: string | null;
  occurred_at: string;
  transcript_text: string | null;
  transcript_path: string | null;
  summary: string | null;
  created_by: string;
  anonymized_at: string | null;
  created_at: string;
  updated_at: string;
};
export type CandidateConversationInsert = Omit<
  CandidateConversationRow,
  | "id"
  | "created_at"
  | "updated_at"
  | "kind"
  | "occurred_at"
  | "title"
  | "transcript_text"
  | "transcript_path"
  | "summary"
  | "anonymized_at"
> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
  kind?: CandidateConversationKind;
  occurred_at?: string;
  title?: string | null;
  transcript_text?: string | null;
  transcript_path?: string | null;
  summary?: string | null;
  anonymized_at?: string | null;
};
export type CandidateConversationUpdate = Partial<CandidateConversationRow>;

// --- Company expandida (migration 20260420120000) --------------------------

export type CompanyRow = {
  id: string;
  name: string;
  logo_url: string | null;
  website: string | null;
  tagline: string | null;
  overview: string | null;
  values_list: string[];
  differentials: string | null;
  address_street: string | null;
  address_number: string | null;
  address_complement: string | null;
  address_neighborhood: string | null;
  address_city: string | null;
  address_state: string | null;
  address_zip: string | null;
  address_country: string | null;
  linkedin_url: string | null;
  instagram_url: string | null;
  created_at: string | null;
  updated_at: string | null;
};
export type CompanyUpdate = Partial<CompanyRow>;
export type CompanyInsert = Omit<CompanyRow, "id" | "created_at" | "updated_at"> & {
  id?: string;
  created_at?: string | null;
  updated_at?: string | null;
};

// Views públicas (migration 20260420120200)
export type JobPublicRow = Pick<
  JobOpeningRow,
  | "id"
  | "company_id"
  | "title"
  | "summary"
  | "sector"
  | "work_mode"
  | "contract_type"
  | "hours_per_week"
  | "required_skills"
  | "salary_min_cents"
  | "salary_max_cents"
  | "benefits"
  | "num_openings"
  | "shift"
  | "override_address"
  | "address_street"
  | "address_number"
  | "address_complement"
  | "address_neighborhood"
  | "address_city"
  | "address_state"
  | "address_zip"
  | "public_slug"
  | "opened_at"
  | "target_deadline"
  | "status"
  | "updated_at"
  | "cultural_fit_survey_id"
>;

export type CompanyPublicRow = Pick<
  CompanyRow,
  | "id"
  | "name"
  | "logo_url"
  | "website"
  | "tagline"
  | "overview"
  | "values_list"
  | "differentials"
  | "address_street"
  | "address_number"
  | "address_complement"
  | "address_neighborhood"
  | "address_city"
  | "address_state"
  | "address_zip"
  | "address_country"
  | "linkedin_url"
  | "instagram_url"
>;

export type JobDescriptionPublicRow = Pick<
  JobDescriptionRow,
  | "id"
  | "job_opening_id"
  | "version"
  | "content_md"
  | "daily_routine"
  | "requirements"
  | "expectations"
  | "work_schedule"
  | "benefits_list"
>;

// --- Module augmentation REMOVED in Plan 02-04 ---------------------------
// Pre-Plan 02-04, this file declared a `declare module "./types"` block to merge
// the hiring tables/enums/views into the auto-generated `Database` type.
//
// In Plan 02-04 the Supabase CLI became available and `types.ts` was regenerated
// from the linked remote project. The auto-generated `types.ts` now contains
// the canonical shape of every public table/view/function (including all hiring
// entities AND the new Phase 2 surface — data_access_log, candidate_consents,
// active_candidate_consents view, read_candidate_with_log RPC, the consent
// enums). The declaration-merging block became a `Duplicate identifier
// 'Database'` conflict because the auto-gen exports `type Database = { ... }`
// (a type alias, NOT an interface), and TypeScript cannot merge a type alias
// with a `declare module` interface augmentation.
//
// All hand-written aliases above (JobOpeningRow, ApplicationRow, CandidateRow,
// etc.) remain valid as standalone type aliases and continue to be the
// canonical entry points for hiring code (avoiding deeply-nested
// `Database["public"]["Tables"][...]` lookups). The Phase 2 additions below
// reference the auto-gen `Database` type directly because the Phase 2 schema
// did not exist in any hand-written form.

// =========================================================================
// Phase 2 — Migration F types (hand-written extensions)
// =========================================================================

// candidate_consents
export type Consent = Database["public"]["Tables"]["candidate_consents"]["Row"];
export type ConsentInsert =
  Database["public"]["Tables"]["candidate_consents"]["Insert"];
export type ConsentUpdate =
  Database["public"]["Tables"]["candidate_consents"]["Update"];

// View active_candidate_consents (revoked_at IS NULL AND not expired)
export type ActiveConsent =
  Database["public"]["Views"]["active_candidate_consents"]["Row"];

// LGPD enums
export type ConsentPurpose =
  Database["public"]["Enums"]["consent_purpose_enum"];
export type ConsentLegalBasis =
  Database["public"]["Enums"]["consent_legal_basis_enum"];

// data_access_log (append-only audit log; INSERT only via SECURITY DEFINER RPCs)
export type DataAccessLogEntry =
  Database["public"]["Tables"]["data_access_log"]["Row"];
export type DataAccessLogInsert =
  Database["public"]["Tables"]["data_access_log"]["Insert"];

// RPC read_candidate_with_log — only sanctioned read path for candidate PII
export type ReadCandidateWithLogArgs =
  Database["public"]["Functions"]["read_candidate_with_log"]["Args"];
export type ReadCandidateWithLogReturn =
  Database["public"]["Functions"]["read_candidate_with_log"]["Returns"];

// =========================================================================
// Phase 2 — Move application stage args (consumed by useMoveApplicationStage)
// =========================================================================

export interface MoveApplicationStageArgs {
  id: string;
  fromStage: ApplicationStage;
  toStage: ApplicationStage;
  jobId: string;
  companyId: string;
}

// =========================================================================
// Phase 2 — ApplicationWithCandidate (used by useApplicationsByJob)
// =========================================================================

export type ApplicationWithCandidate = ApplicationRow & {
  candidate: Pick<
    CandidateRow,
    "id" | "full_name" | "email" | "anonymized_at"
  > | null;
};
