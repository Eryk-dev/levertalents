-- T004 — Hiring core entities: all enums + 16 new tables + indexes + tg_set_updated_at trigger.
--
-- Source of truth: specs/001-hiring-pipeline/data-model.md. Every mutable table
-- gets (a) `updated_at` maintained by `public.tg_set_updated_at` (the optimistic
-- locking clock, research R1) and (b) RLS enabled here (policies land in T006).

-- --- Shared trigger function -----------------------------------------------

CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- --- Enums -----------------------------------------------------------------

CREATE TYPE public.work_mode_enum AS ENUM ('presencial', 'remoto', 'hibrido');
CREATE TYPE public.contract_type_enum AS ENUM ('clt', 'pj', 'estagio', 'pj_equity');
CREATE TYPE public.job_status_enum AS ENUM (
  'aguardando_descritivo',
  'em_ajuste_pelo_rh',
  'aguardando_aprovacao_do_gestor',
  'pronta_para_publicar',
  'publicada',
  'em_triagem',
  'encerrada'
);
CREATE TYPE public.job_close_reason_enum AS ENUM ('contratado', 'cancelado', 'congelado');
CREATE TYPE public.publication_channel_enum AS ENUM ('linkedin', 'indeed', 'instagram', 'outros');
CREATE TYPE public.description_approval_enum AS ENUM ('rascunho', 'enviado', 'aprovado', 'rejeitado');
CREATE TYPE public.document_type_enum AS ENUM ('cpf', 'passport', 'rne', 'other');
CREATE TYPE public.anonymization_reason_enum AS ENUM ('solicitacao', 'retencao_expirada');
CREATE TYPE public.application_stage_enum AS ENUM (
  'recebido',
  'em_interesse',
  'aguardando_fit_cultural',
  'sem_retorno',
  'fit_recebido',
  'antecedentes_ok',
  'apto_entrevista_rh',
  'entrevista_rh_agendada',
  'entrevista_rh_feita',
  'apto_entrevista_final',
  'entrevista_final_agendada',
  'aguardando_decisao_dos_gestores',
  'aprovado',
  'em_admissao',
  'admitido',
  'reprovado_pelo_gestor',
  'recusado'
);
CREATE TYPE public.fit_question_kind_enum AS ENUM ('scale', 'text', 'multi_choice');
CREATE TYPE public.background_status_enum AS ENUM (
  'limpo', 'pendencia_leve', 'pendencia_grave', 'nao_aplicavel'
);
CREATE TYPE public.interview_kind_enum AS ENUM ('rh', 'final');
CREATE TYPE public.interview_mode_enum AS ENUM ('presencial', 'remota');
CREATE TYPE public.interview_status_enum AS ENUM ('agendada', 'realizada', 'cancelada');
CREATE TYPE public.evaluator_decision_enum AS ENUM ('aprovado', 'reprovado', 'pendente');
CREATE TYPE public.hiring_outcome_enum AS ENUM ('aprovado', 'reprovado');
CREATE TYPE public.standard_message_kind_enum AS ENUM (
  'recusa', 'convite_fit', 'oferta', 'aprovacao_proxima_etapa'
);
CREATE TYPE public.log_action_enum AS ENUM ('view', 'update', 'optimistic_conflict');

-- Extensions needed for `citext` email column (Supabase default images ship it).
CREATE EXTENSION IF NOT EXISTS citext;

-- --- 1. job_openings -------------------------------------------------------

CREATE TABLE public.job_openings (
  id                           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id                   UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  requested_by                 UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  title                        TEXT NOT NULL,
  summary                      TEXT,
  sector                       TEXT,
  work_mode                    public.work_mode_enum,
  contract_type                public.contract_type_enum,
  hours_per_week               SMALLINT,
  required_skills              TEXT[] NOT NULL DEFAULT '{}',
  salary_min_cents             INTEGER,
  salary_max_cents             INTEGER,
  benefits                     TEXT,
  confidential                 BOOLEAN NOT NULL DEFAULT false,
  confidential_participant_ids UUID[] NOT NULL DEFAULT '{}',
  status                       public.job_status_enum NOT NULL DEFAULT 'aguardando_descritivo',
  close_reason                 public.job_close_reason_enum,
  target_deadline              DATE,
  opened_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at                    TIMESTAMPTZ,
  created_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_job_openings_company_status ON public.job_openings (company_id, status);
CREATE INDEX idx_job_openings_status_opened ON public.job_openings (status, opened_at DESC);
CREATE INDEX idx_job_openings_requested_by ON public.job_openings (requested_by);
ALTER TABLE public.job_openings ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER tg_job_openings_updated_at BEFORE UPDATE ON public.job_openings
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- --- 2. job_descriptions ---------------------------------------------------

CREATE TABLE public.job_descriptions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_opening_id   UUID NOT NULL REFERENCES public.job_openings(id) ON DELETE CASCADE,
  version          SMALLINT NOT NULL,
  content_md       TEXT NOT NULL,
  author_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  approval_state   public.description_approval_enum NOT NULL DEFAULT 'rascunho',
  approver_id      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at      TIMESTAMPTZ,
  rejection_reason TEXT,
  pdf_path         TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (job_opening_id, version)
);
CREATE INDEX idx_job_descriptions_job ON public.job_descriptions (job_opening_id, version DESC);
ALTER TABLE public.job_descriptions ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER tg_job_descriptions_updated_at BEFORE UPDATE ON public.job_descriptions
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- --- 3. job_external_publications ------------------------------------------

CREATE TABLE public.job_external_publications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_opening_id  UUID NOT NULL REFERENCES public.job_openings(id) ON DELETE CASCADE,
  channel         public.publication_channel_enum NOT NULL,
  url             TEXT NOT NULL,
  published_at    DATE NOT NULL,
  published_by    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  note            TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_job_external_publications_job ON public.job_external_publications (job_opening_id);
ALTER TABLE public.job_external_publications ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER tg_job_external_publications_updated_at BEFORE UPDATE ON public.job_external_publications
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- --- 4. candidates ---------------------------------------------------------

CREATE TABLE public.candidates (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name            TEXT NOT NULL,
  email                CITEXT NOT NULL UNIQUE,
  phone                TEXT,
  cpf                  TEXT,
  document_type        public.document_type_enum NOT NULL DEFAULT 'cpf',
  document_number      TEXT,
  source               TEXT,
  cv_storage_path      TEXT,
  anonymized_at        TIMESTAMPTZ,
  anonymization_reason public.anonymization_reason_enum,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX idx_candidates_document_unique
  ON public.candidates (document_type, document_number)
  WHERE document_number IS NOT NULL AND anonymized_at IS NULL;
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER tg_candidates_updated_at BEFORE UPDATE ON public.candidates
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- --- 5. applications -------------------------------------------------------

CREATE TABLE public.applications (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id          UUID NOT NULL REFERENCES public.candidates(id) ON DELETE RESTRICT,
  job_opening_id        UUID NOT NULL REFERENCES public.job_openings(id) ON DELETE RESTRICT,
  stage                 public.application_stage_enum NOT NULL DEFAULT 'recebido',
  stage_entered_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_moved_by         UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes                 TEXT,
  rejection_message_id  UUID, -- FK added after standard_messages table is created below
  closed_at             TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (candidate_id, job_opening_id)
);
CREATE INDEX idx_applications_job_stage ON public.applications (job_opening_id, stage);
CREATE INDEX idx_applications_candidate ON public.applications (candidate_id);
CREATE INDEX idx_applications_stage_entered ON public.applications (stage, stage_entered_at);
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER tg_applications_updated_at BEFORE UPDATE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- --- 6. application_stage_history (append-only) ----------------------------

CREATE TABLE public.application_stage_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id  UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  from_stage      public.application_stage_enum,
  to_stage        public.application_stage_enum NOT NULL,
  moved_by        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  moved_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  note            TEXT
);
CREATE INDEX idx_application_stage_history_app ON public.application_stage_history (application_id, moved_at DESC);
ALTER TABLE public.application_stage_history ENABLE ROW LEVEL SECURITY;

-- --- 7. cultural_fit_surveys ----------------------------------------------

CREATE TABLE public.cultural_fit_surveys (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  company_id  UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  active      BOOLEAN NOT NULL DEFAULT true,
  created_by  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_cultural_fit_surveys_company ON public.cultural_fit_surveys (company_id);
ALTER TABLE public.cultural_fit_surveys ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER tg_cultural_fit_surveys_updated_at BEFORE UPDATE ON public.cultural_fit_surveys
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- --- 8. cultural_fit_questions --------------------------------------------

CREATE TABLE public.cultural_fit_questions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id   UUID NOT NULL REFERENCES public.cultural_fit_surveys(id) ON DELETE CASCADE,
  order_index SMALLINT NOT NULL,
  kind        public.fit_question_kind_enum NOT NULL,
  prompt      TEXT NOT NULL,
  options     JSONB,
  scale_min   SMALLINT,
  scale_max   SMALLINT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (survey_id, order_index)
);
ALTER TABLE public.cultural_fit_questions ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER tg_cultural_fit_questions_updated_at BEFORE UPDATE ON public.cultural_fit_questions
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- --- 9. cultural_fit_tokens -----------------------------------------------

CREATE TABLE public.cultural_fit_tokens (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  survey_id      UUID NOT NULL REFERENCES public.cultural_fit_surveys(id) ON DELETE RESTRICT,
  token_hash     TEXT NOT NULL UNIQUE,
  issued_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at     TIMESTAMPTZ NOT NULL,
  consumed_at    TIMESTAMPTZ,
  revoked_at     TIMESTAMPTZ
);
CREATE INDEX idx_cultural_fit_tokens_app ON public.cultural_fit_tokens (application_id);
CREATE INDEX idx_cultural_fit_tokens_expiry ON public.cultural_fit_tokens (expires_at) WHERE consumed_at IS NULL AND revoked_at IS NULL;
ALTER TABLE public.cultural_fit_tokens ENABLE ROW LEVEL SECURITY;

-- --- 10. cultural_fit_responses -------------------------------------------

CREATE TABLE public.cultural_fit_responses (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL UNIQUE REFERENCES public.applications(id) ON DELETE CASCADE,
  survey_id      UUID NOT NULL REFERENCES public.cultural_fit_surveys(id) ON DELETE RESTRICT,
  submitted_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payload        JSONB NOT NULL,
  anonymized_at  TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.cultural_fit_responses ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER tg_cultural_fit_responses_updated_at BEFORE UPDATE ON public.cultural_fit_responses
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- --- 11. background_checks ------------------------------------------------

CREATE TABLE public.background_checks (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL UNIQUE REFERENCES public.applications(id) ON DELETE CASCADE,
  status_flag    public.background_status_enum NOT NULL,
  file_path      TEXT,
  note           TEXT,
  uploaded_by    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  uploaded_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.background_checks ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER tg_background_checks_updated_at BEFORE UPDATE ON public.background_checks
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- --- 12. interviews -------------------------------------------------------

CREATE TABLE public.interviews (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id    UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  kind              public.interview_kind_enum NOT NULL,
  scheduled_at      TIMESTAMPTZ NOT NULL,
  duration_minutes  SMALLINT NOT NULL DEFAULT 60,
  mode              public.interview_mode_enum NOT NULL,
  location_or_link  TEXT,
  participants      UUID[] NOT NULL DEFAULT '{}',
  status            public.interview_status_enum NOT NULL DEFAULT 'agendada',
  summary           TEXT,
  transcript_path   TEXT,
  transcript_text   TEXT,
  created_by        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_interviews_app ON public.interviews (application_id);
CREATE INDEX idx_interviews_scheduled ON public.interviews (scheduled_at) WHERE status = 'agendada';
ALTER TABLE public.interviews ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER tg_interviews_updated_at BEFORE UPDATE ON public.interviews
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- --- 13. interview_decisions ----------------------------------------------

CREATE TABLE public.interview_decisions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id  UUID NOT NULL REFERENCES public.interviews(id) ON DELETE CASCADE,
  evaluator_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  decision      public.evaluator_decision_enum NOT NULL DEFAULT 'pendente',
  comments      TEXT,
  decided_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (interview_id, evaluator_id),
  CONSTRAINT interview_decisions_reprovado_needs_comments
    CHECK (decision <> 'reprovado' OR (comments IS NOT NULL AND length(trim(comments)) > 0))
);
ALTER TABLE public.interview_decisions ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER tg_interview_decisions_updated_at BEFORE UPDATE ON public.interview_decisions
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- --- 14. hiring_decisions -------------------------------------------------

CREATE TABLE public.hiring_decisions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id  UUID NOT NULL UNIQUE REFERENCES public.applications(id) ON DELETE CASCADE,
  outcome         public.hiring_outcome_enum NOT NULL,
  decided_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  summary         TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.hiring_decisions ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER tg_hiring_decisions_updated_at BEFORE UPDATE ON public.hiring_decisions
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- --- 15. employee_onboarding_handoffs -------------------------------------

CREATE TABLE public.employee_onboarding_handoffs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id   UUID NOT NULL UNIQUE REFERENCES public.applications(id) ON DELETE RESTRICT,
  profile_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  team_id          UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  leader_id        UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  start_date       DATE,
  contract_type    public.contract_type_enum,
  cost_cents       INTEGER,
  final_title      TEXT,
  onboarded_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.employee_onboarding_handoffs ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER tg_employee_onboarding_handoffs_updated_at BEFORE UPDATE ON public.employee_onboarding_handoffs
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- --- 16. standard_messages ------------------------------------------------

CREATE TABLE public.standard_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind        public.standard_message_kind_enum NOT NULL,
  title       TEXT NOT NULL,
  body_md     TEXT NOT NULL,
  active      BOOLEAN NOT NULL DEFAULT true,
  created_by  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.standard_messages ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER tg_standard_messages_updated_at BEFORE UPDATE ON public.standard_messages
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Forward-declared FK from applications.rejection_message_id now that
-- standard_messages exists.
ALTER TABLE public.applications
  ADD CONSTRAINT applications_rejection_message_fkey
  FOREIGN KEY (rejection_message_id)
  REFERENCES public.standard_messages(id)
  ON DELETE SET NULL;

-- --- 17. candidate_access_log (append-only audit) -------------------------

CREATE TABLE public.candidate_access_log (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id     UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  actor_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  action           public.log_action_enum NOT NULL,
  resource         TEXT NOT NULL,
  resource_id      UUID NOT NULL,
  expected_version TIMESTAMPTZ,
  actual_version   TIMESTAMPTZ,
  at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_candidate_access_log_candidate ON public.candidate_access_log (candidate_id, at DESC);
ALTER TABLE public.candidate_access_log ENABLE ROW LEVEL SECURITY;
