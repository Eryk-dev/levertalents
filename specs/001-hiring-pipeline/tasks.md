---
description: "Task list for Hiring Pipeline feature implementation"
---

# Tasks: Hiring Pipeline

**Input**: Design documents from `/specs/001-hiring-pipeline/`
**Prerequisites**: plan.md (loaded), spec.md (loaded), research.md (loaded), data-model.md (loaded), contracts/ (7 files loaded), quickstart.md (loaded)

**Tests**: NOT included — spec and plan explicitly state "the repo does not ship a unit-test framework yet and this feature does not introduce one." Acceptance is validated via `quickstart.md` against a running dev server + local Supabase. `tsc --noEmit` and `npm run lint` are the only constitutional gates.

**Organization**: Tasks are grouped by user story so each story can be implemented, validated, and shipped independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US5)
- All paths are relative to repo root `/Users/eryk/Documents/APP LEVER TALETS/leverup-talent-hub/`

## Path Conventions

- **Frontend**: `src/pages/hiring/`, `src/components/hiring/`, `src/hooks/hiring/`, `src/lib/hiring/`
- **Backend (Supabase)**: `supabase/migrations/`, `supabase/functions/hiring-*/`
- **Shared primitives (read-only reuse)**: `src/components/primitives/`
- **Shell touchpoints (extend, do not duplicate)**: `src/App.tsx`, `src/lib/routes.ts`, `src/components/Sidebar.tsx`, `src/components/primitives/StatusBadge.tsx`, `src/components/PendingTasksDropdown.tsx`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Scaffold new directories and confirm dev stack boots before any work begins.

- [X] T001 Create frontend directory scaffolding: `src/pages/hiring/`, `src/components/hiring/`, `src/hooks/hiring/`, `src/lib/hiring/` (empty folders with a `.gitkeep`)
- [X] T002 Create backend directory scaffolding: `supabase/functions/hiring-approve-application/`, `supabase/functions/hiring-anonymize-candidate/`, `supabase/functions/hiring-export-pipeline-csv/`, `supabase/functions/hiring-issue-fit-cultural-link/`, `supabase/functions/hiring-submit-fit-cultural-public/`, `supabase/functions/hiring-cron-anonymize-expired/`, `supabase/functions/hiring-cron-expire-fit-links/` (empty dirs with placeholder `index.ts` importing `Deno.serve`)
- [X] T003 Verify local Supabase stack boots with `supabase start` and dev server boots with `npm run dev`; note that `npx tsc --noEmit` and `npm run lint` are green on `main` before starting hiring work

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core DB schema, RLS, storage, shell integration, and shared primitives that ALL user stories depend on.

**CRITICAL**: No user story work can begin until this phase is complete.

### DB schema and enums

- [X] T004 Create migration `supabase/migrations/20260416193000_hiring_core_entities.sql` defining all enums (`work_mode_enum`, `contract_type_enum`, `job_status_enum`, `job_close_reason_enum`, `publication_channel_enum`, `description_approval_enum`, `document_type_enum`, `anonymization_reason_enum`, `application_stage_enum`, `fit_question_kind_enum`, `background_status_enum`, `interview_kind_enum`, `interview_mode_enum`, `interview_status_enum`, `evaluator_decision_enum`, `hiring_outcome_enum`, `standard_message_kind_enum`, `log_action_enum`) and all 16 new hiring tables (`job_openings`, `job_descriptions`, `job_external_publications`, `candidates`, `applications`, `application_stage_history`, `cultural_fit_surveys`, `cultural_fit_questions`, `cultural_fit_tokens`, `cultural_fit_responses`, `background_checks`, `interviews`, `interview_decisions`, `hiring_decisions`, `employee_onboarding_handoffs`, `standard_messages`, `candidate_access_log`) per data-model.md; include indexes and `tg_set_updated_at` trigger on every mutable table
- [X] T005 Create migration `supabase/migrations/20260416193050_extend_pending_tasks_hiring_kinds.sql` that DROPs the existing `pending_tasks_task_type_check` CHECK constraint and re-adds it with the 8 new hiring `task_type` values (`hiring_job_approval`, `hiring_job_review`, `hiring_candidate_stage_change`, `hiring_interview_reminder`, `hiring_final_decision`, `hiring_admission_followup`, `hiring_fit_cultural_received`, `hiring_fit_cultural_expired`) alongside existing values per research R7
- [X] T006 Create migration `supabase/migrations/20260416193100_hiring_rls_policies.sql` enabling RLS on all 16 new tables and declaring per-role policies (SELECT/INSERT/UPDATE/DELETE) for `admin`, `socio`, `rh`, `lider`, `colaborador` per data-model.md; include helper SQL function `allowed_companies(profile_id uuid) returns uuid[]` used by `lider` visibility rules; enforce `confidential` vagas gate via `confidential_participant_ids`
- [X] T007 Create migration `supabase/migrations/20260416193200_hiring_public_cultural_fit.sql` locking `cultural_fit_tokens` RLS to deny ALL access to `anon` and authenticated non-admin roles (only service role reads/writes); add SQL function `public.validate_and_consume_fit_token(p_token_raw text)` that takes raw token, computes SHA-256 hash, and atomically marks `consumed_at` for the returned row (used by the public submit Edge Function)
- [X] T008 Create migration `supabase/migrations/20260416193300_hiring_storage_bucket.sql` creating a `hiring` Supabase Storage bucket (private) with RLS policies on `storage.objects` enforcing prefix `companies/<company_id>/…` against caller's `allowed_companies()` and the `confidential_participant_ids` check per research R6
- [X] T009 Create migration `supabase/migrations/20260416193400_hiring_audit_and_locking.sql` defining: (a) `tg_log_candidate_access` trigger that writes to `candidate_access_log` on SELECT-equivalent via RPC and on UPDATE of `candidates`/`applications`/`interviews`; (b) state-machine CHECK triggers `tg_enforce_job_status_transition` and `tg_enforce_application_stage_transition` rejecting impossible transitions; (c) trigger `tg_fanout_interview_decision` that flips `applications.stage` to `aprovado` when all `interview_decisions` are `aprovado`, or to `reprovado_pelo_gestor` on first `reprovado`, and inserts the consolidated `hiring_decisions` row
- [X] T010 Create migration `supabase/migrations/20260416193500_hiring_cron_jobs.sql` scheduling pg_cron entries `hiring_anonymize_expired` (`0 3 * * *` calling `hiring-cron-anonymize-expired`), `hiring_expire_fit_links` (`*/30 * * * *` calling `hiring-cron-expire-fit-links`), and `hiring_interview_reminder` (`*/15 * * * *` — pure SQL insert into `pending_tasks` for entrevistas 24h ahead, dedupe via `ON CONFLICT DO NOTHING`); read shared cron secret from `current_setting('app.cron_secret', true)`
- [X] T011 Create migration `supabase/migrations/20260416193600_hiring_anonymize_function.sql` defining `public.anonymize_candidate(p_candidate_id uuid) returns void` per research R3 and data-model §Anonymization contract — rewrites PII columns to sentinels, nulls CV/bucket refs, wipes `cultural_fit_responses.payload`, `background_checks.note`/`file_path`, `interviews.summary`/`transcript_*`; idempotent via `anonymized_at` guard
- [X] T012 Create migration `supabase/migrations/20260416193700_pending_tasks_hiring_triggers.sql` with all hiring triggers that populate/close `pending_tasks` (as SECURITY DEFINER): `tg_hiring_job_approval`, `tg_hiring_job_review`, `tg_hiring_fit_received`, `tg_hiring_final_decision`, `tg_hiring_admission_followup` — mirroring the existing `create_pending_tasks_for_one_on_one` / `close_…` patterns per research R7

### TypeScript type regen and shared frontend utilities

- [X] T013 Run `supabase gen types typescript --local > src/integrations/supabase/types.ts` after migrations T004–T012 apply; commit the regenerated types file
- [X] T014 [P] Create `src/lib/hiring/statusMachine.ts` exporting `JOB_STATUS_TRANSITIONS`, `APPLICATION_STAGE_TRANSITIONS`, and `canTransition(from, to, kind)` helpers mirroring the DB-enforced state machines from data-model.md (§1 job_status_enum, §5 application_stage_enum)
- [X] T015 [P] Create `src/lib/hiring/rlsScope.ts` exporting `useVisibleCompanies()` hook/selector that returns the caller's allowed company IDs (by `app_role`) — used to pre-filter queries and to decide button visibility per FR-027
- [X] T016 [P] Create `src/lib/hiring/retention.ts` exporting `computeExpungeDate(lastProcessClosedAt: Date): Date` (= +5 years) and `isRetentionExpired(candidate)` helper per FR-029
- [X] T017 [P] Create `src/hooks/hiring/useOptimisticVersion.ts` — generic React Query mutation wrapper that accepts `{ tableName, id, expectedUpdatedAt, patch }`, runs the `UPDATE … WHERE id=$1 AND updated_at=$2` guarded mutation, handles 0-row response by surfacing a conflict state, and invalidates affected queries per research R1
- [X] T018 [P] Create `src/components/hiring/OptimisticMutationToast.tsx` — generic toast that displays "Este registro mudou, recarregue e tente de novo" with a "Recarregar" action button when a conflict is detected (FR-032/033)

### Shell integration (existing files — add entries only)

- [X] T019 Edit `src/components/primitives/StatusBadge.tsx` to add two new `kind` values `"job"` and `"application"` with `JOB_MAP` (mapping `job_status_enum` → tone `success|warning|danger|info|neutral|pending`) and `APPLICATION_MAP` (mapping `application_stage_enum` → tone) constants next to the existing maps; no API break to existing callers
- [X] T020 Edit `src/lib/routes.ts` to add entries in `LABELS` for `/hiring/jobs`, `/hiring/candidates`, `/hiring/dashboard`, `/hiring/fit-templates`; extend `getPageTitle()` and `getBreadcrumbs()` with branches for `/hiring/jobs/:id`, `/hiring/jobs/:id/candidates`, `/hiring/candidates/:id` per research R11
- [X] T021 Edit `src/components/Sidebar.tsx` (the `useSidebarGroups()` function) to conditionally append a `"Recrutamento"` group with items `Vagas`, `Candidatos`, `Dashboard de Hiring`, `Fit Cultural` when `canManage = isAdmin || isRH || isSocio` (icons from `lucide-react`: `Briefcase`, `UserSearch`, `LineChart`, `Sparkles`)
- [X] T022 Edit `src/components/PendingTasksDropdown.tsx` extending `TASK_ICONS` and `TASK_ROUTES` maps for each of the 8 new `task_type` values introduced in T005 (icons from `lucide-react`; routes point to `/hiring/jobs`, `/hiring/candidates/:id`, etc. per data-model.md §18 convention)
- [X] T023 Edit `src/App.tsx` to register the 6 authenticated hiring routes (`/hiring/jobs`, `/hiring/jobs/:id`, `/hiring/jobs/:id/candidates`, `/hiring/candidates/:id`, `/hiring/dashboard`, `/hiring/fit-templates`) INSIDE the `<Route element={isAuthenticated ? <Layout /> : <Navigate to="/auth" />}>` block, AND register the single public route `/hiring/fit/:token` OUTSIDE the Layout block (before the catch-all) without any `ProtectedRoute` wrapper — pages imported lazily

**Checkpoint**: Foundation ready. Every subsequent user story can proceed in parallel if staffed; foundational DB + RLS + shell + shared libs guarantee no story blocks another structurally.

---

## Phase 3: User Story 1 — Abrir vaga e gerir aprovação do descritivo (Priority: P1) 🎯 MVP

**Goal**: Gestor opens a vaga in the app; RH writes the descritivo; Gestor approves; vaga becomes "Pronta para publicar"; RH registers external publication links. Replaces the Notion+Monday+e-mail approval flow.

**Independent Test**: Per quickstart.md §1–3 — Gestor opens a vaga, RH submits descritivo, Gestor approves, RH registers 3 external links. Verify vaga status transitions `aguardando_descritivo` → `em_ajuste_pelo_rh` → `aguardando_aprovacao_do_gestor` → `pronta_para_publicar` → `publicada`; version history shows at least v1; PendingTasksDropdown fires for Gestor on "aguardando aprovação" and for RH on "rejeição/pronta". Maps to FR-001 through FR-007.

### Hooks and data access — US1

- [X] T024 [P] [US1] Create `src/hooks/hiring/useJobOpenings.ts` exposing `useJobOpeningsList({ status?, companyId?, confidentialScope? })`, `useCreateJobOpening()`, `useUpdateJobOpeningStatus()` — queries scoped via `rlsScope.ts`; wraps `useOptimisticVersion` for updates
- [X] T025 [P] [US1] Create `src/hooks/hiring/useJobOpening.ts` exposing `useJobOpening(id)` (single vaga with joined `job_descriptions` array ordered by `version DESC` and `job_external_publications` array) and `useCloseJobOpening(id, reason)` — uses `statusMachine.ts` to validate transitions before calling `useOptimisticVersion`
- [X] T026 [P] [US1] Create `src/hooks/hiring/useJobDescription.ts` exposing `useSaveDescriptionDraft()`, `useSubmitDescriptionForApproval()`, `useRequestDescriptionChanges(reason)`, `useApproveDescription()`, `useUploadDescriptionPdf(file)` — each enforces `expectedUpdatedAt` on the underlying `job_descriptions` row

### UI components — US1

- [X] T027 [P] [US1] Create `src/components/hiring/JobOpeningForm.tsx` — react-hook-form + zod form rendering the FR-001 fields (empresa-cliente select, setor, cargo, função resumida, modalidade, tipo de contratação, carga horária, competências multi-input, faixa salarial min/max, benefícios, `confidential` toggle + `confidential_participant_ids` picker); composes `SectionCard` from primitives (no custom cards)
- [X] T028 [P] [US1] Create `src/components/hiring/JobDescriptionEditor.tsx` — markdown editor wired to `useJobDescription`; shows version chips, "Salvar rascunho" / "Enviar para aprovação" / "Solicitar ajustes" / "Aprovar" actions driven by caller role + current status; composes `SectionCard` + `StatusBadge kind="job"`
- [X] T029 [P] [US1] Create `src/components/hiring/JobDescriptionPrintView.tsx` — print-only layout for FR-004 PDF via browser print (research R10); `@media print` styles; hide `<Layout />` chrome; caller clicks "Baixar PDF" → opens print dialog; companion helper reads the saved file from `<input type="file">` and uploads to `hiring` bucket under `companies/<company_id>/jobs/<job_id>/descricao/v<version>.pdf`
- [X] T030 [P] [US1] Create `src/components/hiring/JobExternalPublicationsList.tsx` — table of `job_external_publications` with "Adicionar link" form (channel select, URL, data, nota) and delete action; composes `SectionCard`, `EmptyState`

### Pages — US1

- [X] T031 [US1] Create `src/pages/hiring/JobOpenings.tsx` (route `/hiring/jobs`) — `PageHeader` with "Nova vaga" CTA (opens modal with `JobOpeningForm`), filter bar (status, empresa, confidencial), list of `SectionCard` rows (title, `StatusBadge`, gestor solicitante, dias aberta); uses `useJobOpeningsList`; empty state via `EmptyState`
- [X] T032 [US1] Create `src/pages/hiring/JobOpeningDetail.tsx` (route `/hiring/jobs/:id`) — `PageHeader` with vaga title + status badge + "Ver candidatos" / "Encerrar" actions; composes `JobDescriptionEditor`, `JobExternalPublicationsList`, a "Histórico de versões" `SectionCard` listing prior `job_descriptions` with diff preview; uses `useJobOpening`
- [X] T033 [US1] Wire navigation from PendingTasksDropdown (already mapped in T022) — clicking a `hiring_job_approval` task navigates to `/hiring/jobs/:id` and scrolls to the descritivo section; clicking `hiring_job_review` navigates to `/hiring/jobs` (RH queue)

### Validation — US1

- [X] T034 [US1] Run `npx tsc --noEmit && npm run lint` on the US1 surface — must be clean; walk through quickstart.md §1–3 against a local dev server + local Supabase; confirm (a) state transitions, (b) `pending_tasks` population, (c) version history, (d) PDF upload path

**Checkpoint**: User Story 1 is fully functional and independently testable. Feature can be shipped as MVP here if US2+ are not yet ready.

---

## Phase 4: User Story 2 — Receber candidatos e gerenciar triagem inicial (Priority: P2)

**Goal**: Candidates enter the system (manual RH cadastro or public Fit Cultural form); RH moves them across the Kanban; Fit Cultural questionnaire and background check are attached; duplicate detection offers reuse.

**Independent Test**: Per quickstart.md §4–6 — cadastrar 5 candidatos numa vaga, mover pelo Kanban, enviar e receber Fit Cultural, anexar background check, testar duplicate detection por e-mail, testar expiração de link (invoke `hiring-cron-expire-fit-links`), confirmar que o perfil consolidado abre numa única tela. Maps to FR-008 through FR-018.

### Edge Functions — US2

- [X] T035 [P] [US2] Implement `supabase/functions/hiring-issue-fit-cultural-link/index.ts` per `contracts/hiring-issue-fit-cultural-link.md` — `verify_jwt = true`; role-check ∈ {`rh`,`socio`,`admin`}; generates 32-byte base64url raw token, stores SHA-256 hash in `cultural_fit_tokens` with `expires_at = issued_at + 3 days`, returns `{ url: <SITE_URL>/hiring/fit/<raw> }` (raw token never logged)
- [X] T036 [P] [US2] Implement `supabase/functions/hiring-submit-fit-cultural-public/index.ts` per `contracts/hiring-submit-fit-cultural-public.md` — `verify_jwt = false`; validates honeypot field empty, per-IP rate-limit (in-memory or via `cultural_fit_tokens` signal), calls `validate_and_consume_fit_token(raw)` (T007), writes `cultural_fit_responses.payload`, advances `applications.stage` to `fit_recebido`, inserts `pending_tasks` row `hiring_fit_cultural_received` for the RH owner
- [X] T037 [P] [US2] Implement `supabase/functions/hiring-cron-expire-fit-links/index.ts` per `contracts/hiring-cron-expire-fit-links.md` — verifies shared cron secret header; for every `cultural_fit_tokens` row with `expires_at < now()` AND `consumed_at IS NULL` AND `revoked_at IS NULL`, sets `revoked_at = now()`, flips the related `applications.stage` to `sem_retorno`, inserts `pending_tasks` row `hiring_fit_cultural_expired` for RH

### Hooks — US2

- [X] T038 [P] [US2] Create `src/hooks/hiring/useCandidates.ts` — `useCandidate(id)`, `useCandidateByEmail(email)` (for duplicate detection per FR-009), `useCreateCandidate()`, `useUpdateCandidate()` with optimistic-version guard, `useUploadCv(file)` (uploads to `hiring/companies/<company_id>/jobs/<job_id>/candidates/<candidate_id>/cv.<ext>`), `useAnonymizeCandidate(id)` (calls `hiring-anonymize-candidate` Edge Function)
- [X] T039 [P] [US2] Create `src/hooks/hiring/useApplications.ts` — `useApplicationsByJob(jobId)` (returns candidates grouped by `stage` for Kanban), `useApplication(id)`, `useMoveApplicationStage({ id, fromStage, toStage, note?, expectedUpdatedAt })` (uses the `UPDATE … WHERE id AND updated_at AND stage=fromStage` guarded pattern from research R4), `useReuseCandidateForJob({ candidateId, jobId })` (creates a second `applications` row for an existing candidate)
- [X] T040 [P] [US2] Create `src/hooks/hiring/useCulturalFit.ts` — `useFitSurveys()`, `useFitSurvey(id)`, `useCreateFitSurvey()`, `useUpdateFitSurvey()`, `useFitQuestions(surveyId)`, `useCreateFitQuestion()`, `useUpdateFitQuestion()`, `useDeleteFitQuestion()`, `useIssueFitLink(applicationId, surveyId)` (invokes the `hiring-issue-fit-cultural-link` function), `useFitResponse(applicationId)`, `usePublicFitForm(token)` (public-facing: fetches survey schema via `hiring-submit-fit-cultural-public` GET helper or equivalent)
- [X] T041 [P] [US2] Create `src/hooks/hiring/useBackgroundCheck.ts` — `useBackgroundCheck(applicationId)`, `useUploadBackgroundCheck({ applicationId, file, statusFlag, note })` (uploads to `hiring/companies/<company_id>/jobs/<job_id>/candidates/<candidate_id>/background/<uuid>.<ext>` + inserts `background_checks` row)
- [X] T042 [P] [US2] Create `src/hooks/hiring/useStandardMessages.ts` — `useStandardMessages(kind?)`, `useCreateStandardMessage()`, `useUpdateStandardMessage()` (FR-024); scoped to `rh`/`socio`/`admin`

### UI components — US2

- [X] T043 [P] [US2] Create `src/components/hiring/CandidateForm.tsx` — react-hook-form + zod; fields: full_name, email, phone, `document_type` select (default `cpf`), `document_number`, source, CV file upload; on submit, check duplicate via `useCandidateByEmail` + `(document_type, document_number)`; if duplicate, render `<DuplicateCandidateDialog>` offering "Reaproveitar perfil" vs "Cancelar"
- [X] T044 [P] [US2] Create `src/components/hiring/CandidateCard.tsx` — Kanban card composed of `SectionCard` variant compact; shows avatar initials, name, current stage badge, dias na etapa, background-check dot (red if `pendencia_grave` per FR-018); draggable via `@dnd-kit/core`
- [X] T045 [P] [US2] Create `src/components/hiring/CandidatesKanban.tsx` — `@dnd-kit/core`+`sortable` Kanban with columns per `application_stage_enum`; drag-and-drop calls `useMoveApplicationStage` with optimistic update; rollback + `OptimisticMutationToast` on conflict per research R4; uses `LoadingState layout="cards"` and `EmptyState` per-column
- [X] T046 [P] [US2] Create `src/components/hiring/CulturalFitQuestionEditor.tsx` — list of questions with drag-sort, per-question editor (kind=scale shows min/max, kind=multi_choice shows options editor); buttons "Adicionar pergunta", "Remover"
- [X] T047 [P] [US2] Create `src/components/hiring/CulturalFitResponseViewer.tsx` — renders a `cultural_fit_responses.payload` alongside the empresa's cultura/valores (FR-016); uses `ScoreDisplay` from primitives for numeric scale questions
- [X] T048 [P] [US2] Create `src/components/hiring/BackgroundCheckUploader.tsx` — file dropzone + `status_flag` radio group (limpo, pendencia_leve, pendencia_grave, nao_aplicavel) + note textarea; wired to `useUploadBackgroundCheck`
- [X] T049 [P] [US2] Create `src/components/hiring/DuplicateCandidateDialog.tsx` — dialog shown by `CandidateForm` when duplicate detected; shows prior applications (vaga + status) and offers "Reaproveitar este perfil" (calls `useReuseCandidateForJob`) or "Criar mesmo assim com outro e-mail"
- [X] T050 [P] [US2] Create `src/components/hiring/StandardMessagePicker.tsx` — dropdown used on the "Recusar candidato" action (FR-024) to pick a `standard_messages` template, writing `applications.rejection_message_id` + moving stage to `recusado`

### Pages — US2

- [X] T051 [US2] Create `src/pages/hiring/CandidatesKanban.tsx` (route `/hiring/jobs/:id/candidates`) — `PageHeader` with vaga title + "Novo candidato" CTA (opens `CandidateForm`); body is `<CandidatesKanban>`; composes breadcrumb via `getBreadcrumbs()` already registered in T020
- [X] T052 [US2] Create `src/pages/hiring/CandidateProfile.tsx` (route `/hiring/candidates/:id`) — `PageHeader` with candidate name + status badge + "Recusar" / "Anonimizar" / "Enviar Fit Cultural" actions; body has `SectionCard` panels for: Dados básicos, CV (download), Applications (tabela de vagas em que está/esteve), Fit Cultural (viewer per active application), Antecedentes (viewer/uploader), Timeline (from `application_stage_history` + `candidate_access_log`), per FR-012
- [X] T053 [US2] Create `src/pages/hiring/CulturalFitTemplates.tsx` (route `/hiring/fit-templates`) — `PageHeader` with "Novo questionário" CTA; list of surveys (global and per-empresa) with edit/disable; opens a drawer with `CulturalFitQuestionEditor`
- [X] T054 [US2] Create `src/pages/hiring/PublicCulturalFit.tsx` (route `/hiring/fit/:token`, rendered OUTSIDE `<Layout />` per T023) — minimal chrome (just Lever Talents brand header); uses `usePublicFitForm(token)` to fetch survey schema; renders questions; honeypot field named `website` visually hidden (`aria-hidden`, CSS `display:none`); submit calls `hiring-submit-fit-cultural-public`; on 409/expired shows "Este link expirou" or "Este link já foi utilizado" states

### Validation — US2

- [X] T055 [US2] Run `npx tsc --noEmit && npm run lint`; walk through quickstart.md §4–6 including the two negative paths (reused token, expired token via manually invoking `hiring-cron-expire-fit-links`); confirm duplicate detection warns and reuses, Kanban drag conflict surfaces toast, background check dot shows in Kanban per FR-018

**Checkpoint**: User Stories 1 AND 2 both fully functional. RH already off Notion/Drive/WhatsApp for candidates.

---

## Phase 5: User Story 3 — Conduzir entrevistas e registrar avaliações (Priority: P3)

**Goal**: RH schedules entrevistas (RH + Final), attaches transcrição/resumo; Gestor consulta prontuário consolidado antes da entrevista final; cada avaliador registra decisão; unanimidade consolida aprovação, primeira reprovação encerra como reprovado (Clarifications Q1).

**Independent Test**: Per quickstart.md §7–8 — agendar entrevista RH, registrar transcrição, agendar entrevista final com 2 gestores, cenários de unanimidade (ambos aprovam → `aprovado`) e reprovação individual (um reprova → `reprovado_pelo_gestor` mesmo que outro aprove). Maps to FR-019 through FR-023.

### Hooks — US3

- [X] T056 [P] [US3] Create `src/hooks/hiring/useInterviews.ts` — `useInterviewsByApplication(applicationId)`, `useCreateInterview()` (inserts `interviews` + creates `interview_decisions` rows with `decision='pendente'` for each participant when `kind='final'`), `useUpdateInterviewStatus(id, status, expectedUpdatedAt)`, `useAttachInterviewTranscript({ id, file | text, summary })` (uploads to `hiring/companies/…/interviews/<interview_id>/transcript.<ext>`)
- [X] T057 [P] [US3] Create `src/hooks/hiring/useInterviewDecision.ts` — `useMyInterviewDecision(interviewId)` (returns the row for `evaluator_id = auth.uid()`), `useSubmitInterviewDecision({ interviewId, decision, comments? })` — requires `comments` when `decision='reprovado'` (enforced client + server side)

### UI components — US3

- [X] T058 [P] [US3] Create `src/components/hiring/InterviewScheduler.tsx` — datetime picker, duration select, mode (presencial/remota), location_or_link input, participants multi-select (pulls from `profiles` filtered by role + empresa); "Agendar entrevista RH" vs "Agendar entrevista final" variant toggle
- [X] T059 [P] [US3] Create `src/components/hiring/InterviewNotesEditor.tsx` — tabs "Transcrição" (paste textarea or file upload) and "Resumo" (markdown); "Marcar como realizada" action calls `useUpdateInterviewStatus`
- [X] T060 [P] [US3] Create `src/components/hiring/HiringDecisionPanel.tsx` — rendered on `CandidateProfile` for each interview with `kind='final'`; for current user shows their pending `interview_decisions` row with "Aprovar" / "Reprovar (com comentário)" buttons; for all users shows the roster of evaluators with their current state (pending/aprovado/reprovado) — makes unanimidade transparent
- [X] T061 [P] [US3] Create `src/components/hiring/InterviewTimeline.tsx` — vertical timeline of all interviews for an application: agendada/realizada/cancelada status, summary preview, decisões de cada avaliador (composed into `CandidateProfile` Timeline section)

### Page integration — US3

- [X] T062 [US3] Extend `src/pages/hiring/CandidateProfile.tsx` (from T052) — add `SectionCard` "Entrevistas" wired to `useInterviewsByApplication`; wire "Agendar entrevista" action opening `InterviewScheduler` drawer; render `HiringDecisionPanel` when any `kind='final'` interview exists; render `InterviewTimeline`
- [X] T063 [US3] Wire PendingTasksDropdown (maps already in T022): `hiring_interview_reminder` (from the pg_cron job T010) navigates to `/hiring/candidates/:id` and scrolls to the interview section; `hiring_final_decision` navigates to the same place and focuses `HiringDecisionPanel`

### Validation — US3

- [X] T064 [US3] Run `npx tsc --noEmit && npm run lint`; walk through quickstart.md §7–8; verify (a) 24h reminder inserts `pending_tasks` via cron (manual invoke), (b) unanimidade aprovação sets `applications.stage='aprovado'` and creates `hiring_decisions` row via trigger T009, (c) first reprovação immediately sets stage to `reprovado_pelo_gestor` even if peer is still pending, (d) reprovação requires non-empty comments

**Checkpoint**: User Stories 1, 2, 3 all independently functional.

---

## Phase 6: User Story 4 — Visão consolidada do pipeline e métricas (Priority: P3)

**Goal**: RH dashboard mostra vagas por status, candidatos por etapa, gargalos (>3 dias), tempo médio, taxa de conversão, taxa final de aprovação; filtros por empresa, gestor, período; Gestor vê apenas suas empresas; RH exporta CSV para clientes externos.

**Independent Test**: Per quickstart.md §10 — abrir `/hiring/dashboard` com dados seed, bater números com Kanban, filtrar por empresa/gestor/período, verificar que Gestor vê só suas empresas, exportar CSV e validar colunas contra `contracts/hiring-export-pipeline-csv.md`. Maps to FR-027, FR-030, FR-031.

### Edge Function — US4

- [X] T065 [P] [US4] Implement `supabase/functions/hiring-export-pipeline-csv/index.ts` per `contracts/hiring-export-pipeline-csv.md` — `verify_jwt = true`; re-validates caller `app_role` ∈ {`rh`,`socio`,`admin`} OR caller is `lider` (scoped to their `allowed_companies`); accepts `{ empresa_id?, start_date?, end_date?, status? }` body; streams `text/csv; charset=utf-8` with committed column set from contract; logs `{actor, filters, row_count, ts}`

### SQL views and hooks — US4

- [X] T066 [P] [US4] Create migration `supabase/migrations/20260416193800_hiring_dashboard_views.sql` defining SQL views for the dashboard (all honor RLS on underlying tables): `v_hiring_jobs_by_status` (count by `job_status_enum`), `v_hiring_applications_by_stage` (count by `application_stage_enum`), `v_hiring_bottlenecks` (applications stuck >3 days at current stage via `stage_entered_at` vs `now()`), `v_hiring_avg_time_per_job` (opened_at → closed_at), `v_hiring_stage_conversion` (transitions count per from→to stage pair from `application_stage_history`), `v_hiring_final_approval_rate`
- [X] T067 [P] [US4] Create `src/hooks/hiring/useHiringMetrics.ts` — `useHiringMetrics({ companyId?, managerId?, start?, end? })` returning `{ jobsByStatus, applicationsByStage, bottlenecks, avgDaysPerJob, conversionByStage, finalApprovalRate }`; React Query with `staleTime: 60*1000` per SC-007 freshness target; scoped via `rlsScope.ts`

### UI components — US4

- [X] T068 [P] [US4] Create `src/components/hiring/PipelineFilters.tsx` — filter bar rendered in `HiringDashboard` PageHeader: empresa select (scoped to user's allowed empresas), gestor select, período (presets Last 7d / 30d / 90d / custom); filter state lifted to parent via controlled props
- [X] T069 [P] [US4] Create `src/components/hiring/BottleneckAlert.tsx` — list row for a stuck application: shows vaga + candidato + "Parada há X dias em `<stage>`" + contextual ação ("Cobrar gestor" button if `stage=aguardando_aprovacao_do_gestor`); `StatusBadge kind="application"`
- [X] T070 [P] [US4] Create `src/components/hiring/ConversionFunnel.tsx` — horizontal/vertical funnel visualisation (pure HTML+Tailwind, no new dep) consuming `conversionByStage`; composes `SectionCard`

### Page — US4

- [X] T071 [US4] Create `src/pages/hiring/HiringDashboard.tsx` (route `/hiring/dashboard`) — `PageHeader` with title "Dashboard de Hiring" + `PipelineFilters`; body grid of `StatCard` (total vagas ativas, tempo médio, taxa final de aprovação, candidatos em pipeline) + `SectionCard` "Vagas por status" bar + `SectionCard` "Candidatos por etapa" funnel (`ConversionFunnel`) + `SectionCard` "Gargalos" list (`BottleneckAlert`) + `SectionCard` "Exportar" with "Exportar CSV" button wiring to `hiring-export-pipeline-csv`
- [X] T072 [US4] For `lider` role, ensure `HiringDashboard` and `JobOpenings` (T031) filter strictly to the user's `allowed_companies` via `rlsScope.ts` in the hook layer — the RLS policies from T006 already enforce this at the DB level, this is the UX-level pre-filter to avoid empty "shouldn't have been shown" filter options

### Validation — US4

- [X] T073 [US4] Run `npx tsc --noEmit && npm run lint`; walk through quickstart.md §10; confirm (a) dashboard numbers match Kanban manual count, (b) Gestor only sees own empresa vagas, (c) CSV download matches committed column set in `contracts/hiring-export-pipeline-csv.md` and contains proper UTF-8 BOM (Excel compatibility if specified in contract)

**Checkpoint**: Full pipeline visibility + external reporting unlocked. RH is now out of the "operação repetitiva" per project north star.

---

## Phase 7: User Story 5 — Aprovação dispara criação do colaborador (Priority: P4)

**Goal**: Aprovar candidato cria pré-cadastro (`profiles` + `team_members`) via Edge Function com `service_role`; RH preenche dados de contratação; ao concluir, candidato vira colaborador efetivo no módulo de gestão de talentos (1:1, PDI, avaliações já funcionais).

**Independent Test**: Per quickstart.md §9 — aprovar candidato, clicar "Iniciar admissão", preencher team/leader/cargo/data/contrato/custo, confirmar; `profiles` row existe com e-mail do candidato, `team_members` aponta ao líder; "Concluir admissão" → stage=`admitido`; colaborador aparece em `/meu-time` do líder sem redigitação. Maps to FR-025, FR-026.

### Edge Function — US5

- [X] T074 [P] [US5] Implement `supabase/functions/hiring-approve-application/index.ts` per `contracts/hiring-approve-application.md` — `verify_jwt = true`; role-check ∈ {`rh`,`socio`,`admin`}; body `{ application_id, team_id?, leader_id?, start_date?, contract_type?, cost_cents?, final_title? }`; validates `applications.stage='aprovado'`; with service role invokes `auth.admin.createUser` (invite flow) for the candidate's e-mail; inserts/updates `profiles` row; inserts `team_members` row with `leader_id`; inserts `employee_onboarding_handoffs` row; sets `applications.stage='em_admissao'`; returns `{ profile_id, handoff_id }`
- [X] T075 [P] [US5] Implement `supabase/functions/hiring-anonymize-candidate/index.ts` per `contracts/hiring-anonymize-candidate.md` — `verify_jwt = true`; role-check ∈ {`rh`,`socio`,`admin`}; calls `anonymize_candidate(p_candidate_id)` (T011); deletes storage objects under `companies/*/jobs/*/candidates/<id>/*`; logs in `candidate_access_log`
- [X] T076 [P] [US5] Implement `supabase/functions/hiring-cron-anonymize-expired/index.ts` per `contracts/hiring-cron-anonymize-expired.md` — verifies shared cron secret; iterates `candidates` where all related `applications.closed_at < now() - interval '5 years'` AND `anonymized_at IS NULL`; calls `anonymize_candidate(id)` for each; logs aggregate count

### Hooks + UI — US5

- [X] T077 [P] [US5] Create `src/hooks/hiring/useOnboardingHandoff.ts` — `useHandoffByApplication(applicationId)`, `useStartAdmission({ applicationId, team_id, leader_id, start_date, contract_type, cost_cents, final_title })` (invokes `hiring-approve-application`), `useCompleteAdmission(handoffId)` (sets `onboarded_at=now()`, advances stage to `admitido`)
- [X] T078 [P] [US5] Create `src/components/hiring/AdmissionForm.tsx` — dialog/drawer rendered from `CandidateProfile` when stage=`aprovado`; fields: team_id select, leader_id select (filtered by selected team), start_date, contract_type, cost_cents, final_title; submit calls `useStartAdmission`; after success shows the created `profile_id` and a CTA to the existing `/meu-time/:id` page
- [X] T079 [P] [US5] Create `src/components/hiring/AdmissionStatusPanel.tsx` — rendered in `CandidateProfile` when stage ∈ {`em_admissao`, `admitido`}; shows the `employee_onboarding_handoffs` summary, link to the created `profiles` record, "Concluir admissão" CTA (when `em_admissao`) calling `useCompleteAdmission`

### Page integration — US5

- [X] T080 [US5] Extend `src/pages/hiring/CandidateProfile.tsx` — add `AdmissionForm` + `AdmissionStatusPanel` conditional on stage; ensure the "Anonimizar candidato" action (wired to `hiring-anonymize-candidate`) is present and confirms destructively before calling the Edge Function

### Validation — US5

- [X] T081 [US5] Run `npx tsc --noEmit && npm run lint`; walk through quickstart.md §9; verify (a) `profiles` + `team_members` rows created without manual redigitation (SC-005), (b) 1:1 and PDI backbone still works for the newly created colaborador (constitution V), (c) `hiring-anonymize-candidate` wipes PII and bucket objects per FR-029

**Checkpoint**: Hiring module end-to-end integrated with gestão de talentos module. All 5 user stories functional.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: SLO instrumentation, LGPD edges, edge-case coverage, documentation hooks, and quickstart drill.

- [X] T082 [P] Verify `src/integrations/supabase/types.ts` is up-to-date (re-run `supabase gen types typescript --local` if any later migration landed); commit alongside
- [X] T083 [P] Seed script `supabase/seed/hiring.sql` with 2 empresas, 1 RH, 1 Sócio, 2 Gestores, 1 Admin, 1 Fit Cultural survey with 5 questions, 2 `standard_messages` (`recusa`, `oferta`) — referenced by quickstart.md §0
- [X] T084 [P] Smoke edge cases from spec.md "Edge Cases": vaga cancelada antes de publicar, vaga reaberta (criar nova reutilizando descritivo com um clique), gestor não decide em prazo (surface in Bottlenecks), candidato sem CPF (passport flow), vaga confidencial — wire missing UX flags / disabled states; verify each path in a dev server session
- [X] T085 [P] Audit that no `supabase.from('<hiring_table>')` call happens OUTSIDE the `src/hooks/hiring/` directory (grep sweep) — all reads/writes funnel through hooks that carry RLS scope + optimistic-version guard
- [X] T086 [P] Audit that no hiring component in `src/components/hiring/` defines its own card/page-header/empty-state — confirm `grep -r 'className="card-' src/components/hiring/` returns zero (quickstart §13 gate per research R11)
- [X] T087 [P] Add SLO instrumentation: surface the SC-007 ≤1-minute freshness gate by making every dashboard query use `staleTime: 60_000`; add a small health-check query in `HiringDashboard` showing "Atualizado há Xs"
- [X] T088 Run `npx tsc --noEmit && npm run lint` on the full repo — clean
- [X] T089 Execute quickstart.md end-to-end on a freshly seeded local stack (all 13 sections); tick every checkbox; file any surface gap as a follow-up issue (not a blocker for merge unless it violates a constitution gate)
- [X] T090 Reporter's final pass: confirm constitution gates I-V per quickstart §13 (no browser `auth.admin.*`, no mock data in dashboards, 1:1/PDI backbone intact, all hiring routes inside `<Layout />` except `/hiring/fit/:token`, StatusBadge used everywhere for status)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately.
- **Phase 2 (Foundational)**: Depends on Phase 1. **Blocks every user story.** Within Phase 2: T004 → T005 → T006 → T007 → T008 → T009 → T010 → T011 → T012 strictly sequential (migration order); T013 runs after all migrations; T014–T018 parallel after T013; T019–T023 sequential (each edits a distinct shell file; no shared file conflict but logically scoped to shell integration) — can be parallelized because each of T019–T023 touches a different file.
- **Phase 3 (US1, P1)**: Depends on Phase 2 complete.
- **Phase 4 (US2, P2)**: Depends on Phase 2 complete. Can run in parallel with Phase 3 if staffed — stories are independently testable.
- **Phase 5 (US3, P3)**: Depends on Phase 2 complete AND US2 data shape for `applications.stage` (but foundational migrations already defined that; no code-level dep on US2 beyond the existing tables).
- **Phase 6 (US4, P3)**: Depends on Phase 2 complete. Benefits from US1+US2+US3 having seeded data for dashboard to show something meaningful, but is independently testable via seed.
- **Phase 7 (US5, P4)**: Depends on Phase 2 complete AND US3 `applications.stage='aprovado'` path (trigger T009 already handles that fanout; US5 consumes it).
- **Phase 8 (Polish)**: Depends on every user story that's in scope.

### Within Each User Story

- Hooks + Edge Functions before components (components consume hooks).
- Components before pages (pages compose components).
- Page wiring before PendingTasksDropdown route wiring.
- Validation task at the end of every story phase.

### Parallel Opportunities

- **Within Phase 2**: T014–T018 (5 shared libs/hooks/components in distinct files) and T019–T023 (5 distinct shell files) can all run concurrently once T013 (type regen) completes.
- **Within US1**: T024, T025, T026 (3 hooks in distinct files) parallel; T027, T028, T029, T030 (4 components in distinct files) parallel.
- **Within US2**: Edge Functions T035, T036, T037 parallel; hooks T038–T042 parallel; components T043–T050 parallel.
- **Within US3**: hooks T056, T057 parallel; components T058–T061 parallel.
- **Within US4**: T065 (Edge Function), T066 (migration), T067 (hook), T068–T070 (components) all parallel.
- **Within US5**: Edge Functions T074, T075, T076 parallel; T077, T078, T079 parallel.
- **Across stories**: Once Phase 2 is green, US1, US2, US3, US4, US5 can each be picked up by a different developer and merged independently.

---

## Parallel Example: User Story 1

```bash
# Launch the three US1 hooks together (distinct files, no cross-deps):
Task: "Create src/hooks/hiring/useJobOpenings.ts — T024"
Task: "Create src/hooks/hiring/useJobOpening.ts — T025"
Task: "Create src/hooks/hiring/useJobDescription.ts — T026"

# Then launch the four US1 components together:
Task: "Create src/components/hiring/JobOpeningForm.tsx — T027"
Task: "Create src/components/hiring/JobDescriptionEditor.tsx — T028"
Task: "Create src/components/hiring/JobDescriptionPrintView.tsx — T029"
Task: "Create src/components/hiring/JobExternalPublicationsList.tsx — T030"
```

---

## Implementation Strategy

### MVP First (US1 only)

1. Phase 1 (Setup) — T001–T003.
2. Phase 2 (Foundational) — T004–T023.
3. Phase 3 (US1, P1) — T024–T034.
4. **STOP and VALIDATE** against quickstart.md §1–3.
5. Ship.

This alone removes the biggest pain (vaga approval fragmented across Notion/Monday/e-mail) and unblocks the rest.

### Incremental Delivery

1. MVP (Setup + Foundational + US1) → Demo → Merge → Deploy to preview env.
2. Add US2 (candidatos + Kanban + Fit Cultural público) → Demo quickstart §4–6 → Merge.
3. Add US3 (entrevistas + unanimidade) → Demo quickstart §7–8 → Merge.
4. Add US4 (dashboard + CSV) → Demo quickstart §10 → Merge.
5. Add US5 (admissão → pré-cadastro) → Demo quickstart §9 → Merge.
6. Polish phase (Phase 8) runs continuously from US1 onward for lint/type/audit gates; final T089+T090 before marking feature complete.

### Parallel Team Strategy (≥3 devs)

Once Phase 2 is merged:

- Dev A: US1 → then US5 (handoff logic reuses aprovado path).
- Dev B: US2 → then US4 (dashboard consumes applications shape).
- Dev C: US3 → then Phase 8 polish.

Merge each story independently behind the existing `<Layout />` shell; no feature flag needed since sidebar group "Recrutamento" is already role-gated (T021).

---

## Notes

- **Tests are intentionally absent** from this task list — the repo's constitution currently requires local dev-server validation (`quickstart.md`) plus `tsc --noEmit` + `npm run lint` as the merge gates. Introducing a unit-test harness for this feature would itself be a separate spec per constitution Dev Workflow.
- **Optimistic locking is a constitution-scale gate**: every UPDATE on a hiring table MUST go through `useOptimisticVersion` (T017) or the corresponding Edge Function guard. Any direct `supabase.from(…).update(…)` bypass should fail code review.
- **Privileged operations** (`hiring-approve-application`, `hiring-anonymize-candidate`, `hiring-export-pipeline-csv`, `hiring-issue-fit-cultural-link`) ALL re-check `app_role` inside the handler — never trust the JWT alone (constitution IV).
- **The single public surface** is `/hiring/fit/:token` + `hiring-submit-fit-cultural-public`. No other endpoint serves unauthenticated traffic.
- **No new top-level dependencies** introduced — every library used is already in `package.json` (verified in plan.md Technical Context).
