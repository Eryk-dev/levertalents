-- ----------------------------------------------------------------------------
-- Índices nas FK columns que referenciam auth.users(id) e public.profiles(id)
-- ----------------------------------------------------------------------------
-- Motivo: DELETE de usuário via admin_hard_delete_user estava levando minutos.
-- Postgres não cria índice automático em FK child; sem índice, cada CASCADE /
-- SET NULL / RESTRICT em auth.users → profiles → tabelas do domínio faz seq
-- scan completo. Com ~25 FKs apontando para profiles(id), cada DELETE de
-- usuário rodava ~25 scans sequenciais.
--
-- Escopo: todas as colunas que referenciam auth.users(id) ou profiles(id) e
-- que ainda não possuem índice dedicado (PK, UNIQUE simples ou CREATE INDEX
-- já existente).
--
-- Já cobertos (não duplicar):
--   profiles.id                              (PK)
--   user_roles(user_id, role)                UNIQUE composto — user_id é 1ª
--   job_openings.requested_by                idx_job_openings_requested_by
--   development_plans(user_id, created_at)   idx_development_plans_user_id_created_at
--
-- UNIQUE(team_id, user_id) em team_members NÃO cobre lookup por user_id
-- isolado (Postgres só usa índice composto se a primeira coluna estiver na
-- query), então team_members.user_id recebe índice próprio.
-- ----------------------------------------------------------------------------

-- auth.users(id) direto
CREATE INDEX IF NOT EXISTS idx_team_members_user_id     ON public.team_members (user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_leader_id   ON public.team_members (leader_id);
CREATE INDEX IF NOT EXISTS idx_teams_leader_id          ON public.teams        (leader_id);

-- profiles(id) — performance / engagement
CREATE INDEX IF NOT EXISTS idx_evaluations_evaluated_user_id      ON public.evaluations              (evaluated_user_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_evaluator_user_id      ON public.evaluations              (evaluator_user_id);
CREATE INDEX IF NOT EXISTS idx_one_on_ones_leader_id              ON public.one_on_ones              (leader_id);
CREATE INDEX IF NOT EXISTS idx_one_on_ones_collaborator_id        ON public.one_on_ones              (collaborator_id);
CREATE INDEX IF NOT EXISTS idx_one_on_one_action_items_assigned_to ON public.one_on_one_action_items (assigned_to);
CREATE INDEX IF NOT EXISTS idx_climate_surveys_created_by         ON public.climate_surveys          (created_by);
CREATE INDEX IF NOT EXISTS idx_climate_responses_user_id          ON public.climate_responses        (user_id);
CREATE INDEX IF NOT EXISTS idx_development_plans_approved_by      ON public.development_plans        (approved_by);
CREATE INDEX IF NOT EXISTS idx_development_plan_updates_created_by ON public.development_plan_updates(created_by);
CREATE INDEX IF NOT EXISTS idx_pending_tasks_user_id              ON public.pending_tasks            (user_id);

-- profiles(id) — hiring
CREATE INDEX IF NOT EXISTS idx_job_descriptions_author_id             ON public.job_descriptions          (author_id);
CREATE INDEX IF NOT EXISTS idx_job_descriptions_approver_id           ON public.job_descriptions          (approver_id);
CREATE INDEX IF NOT EXISTS idx_job_external_publications_published_by ON public.job_external_publications (published_by);
CREATE INDEX IF NOT EXISTS idx_applications_last_moved_by             ON public.applications              (last_moved_by);
CREATE INDEX IF NOT EXISTS idx_application_stage_history_moved_by     ON public.application_stage_history (moved_by);
CREATE INDEX IF NOT EXISTS idx_cultural_fit_surveys_created_by        ON public.cultural_fit_surveys      (created_by);
CREATE INDEX IF NOT EXISTS idx_background_checks_uploaded_by          ON public.background_checks         (uploaded_by);
CREATE INDEX IF NOT EXISTS idx_interviews_created_by                  ON public.interviews                (created_by);
CREATE INDEX IF NOT EXISTS idx_interview_decisions_evaluator_id       ON public.interview_decisions       (evaluator_id);
CREATE INDEX IF NOT EXISTS idx_employee_onboarding_handoffs_profile_id ON public.employee_onboarding_handoffs (profile_id);
CREATE INDEX IF NOT EXISTS idx_employee_onboarding_handoffs_leader_id  ON public.employee_onboarding_handoffs (leader_id);
CREATE INDEX IF NOT EXISTS idx_standard_messages_created_by           ON public.standard_messages         (created_by);
CREATE INDEX IF NOT EXISTS idx_candidate_access_log_actor_id          ON public.candidate_access_log      (actor_id);
CREATE INDEX IF NOT EXISTS idx_candidate_conversations_created_by     ON public.candidate_conversations   (created_by);
