# Phase 1 Data Model: Hiring Pipeline

All tables live in the `public` schema. Every table declared here has RLS
enabled and at least one explicit policy (constitution II). Every table
has:

- `id uuid PRIMARY KEY DEFAULT gen_random_uuid()`
- `created_at timestamptz NOT NULL DEFAULT now()`
- `updated_at timestamptz NOT NULL DEFAULT now()` (maintained by a
  `tg_set_updated_at` trigger) — the optimistic-locking clock (R1).

Column-level NOT NULL / DEFAULT declarations are shown only when
non-obvious. Enums are defined as Postgres `enum` types unless noted.

---

## 1. `job_openings`

Purpose: the vaga. 1 row per open/closed job.

| Column                         | Type             | Notes |
|-------------------------------|------------------|-------|
| `id`                          | uuid PK          |       |
| `company_id`                  | uuid NOT NULL    | FK → `companies.id` (existing) |
| `requested_by`                | uuid NOT NULL    | FK → `profiles.id` — gestor solicitante |
| `title`                       | text NOT NULL    | cargo/função |
| `summary`                     | text             | função resumida |
| `sector`                      | text             | setor |
| `work_mode`                   | `work_mode_enum` | `presencial` \| `remoto` \| `hibrido` |
| `contract_type`               | `contract_type_enum` | `clt` \| `pj` \| `estagio` \| `pj_equity` |
| `hours_per_week`              | smallint         |       |
| `required_skills`             | text[]           |       |
| `salary_min_cents`            | integer          |       |
| `salary_max_cents`            | integer          |       |
| `benefits`                    | text             |       |
| `confidential`                | boolean NOT NULL DEFAULT false | FR-027 |
| `confidential_participant_ids`| uuid[] NOT NULL DEFAULT '{}' | ids de profiles autorizados (quando `confidential`) |
| `status`                      | `job_status_enum` | ver estados abaixo |
| `close_reason`                | `job_close_reason_enum` NULL | `contratado` \| `cancelado` \| `congelado` |
| `target_deadline`             | date             | prazo desejado |
| `opened_at`                   | timestamptz NOT NULL DEFAULT now() |  |
| `closed_at`                   | timestamptz NULL |  |
| `created_at`, `updated_at`    | timestamptz      |  |

**`job_status_enum`** values (FR-002):
`aguardando_descritivo`, `em_ajuste_pelo_rh`,
`aguardando_aprovacao_do_gestor`, `pronta_para_publicar`, `publicada`,
`em_triagem`, `encerrada`.

**State transitions**:

```
aguardando_descritivo → em_ajuste_pelo_rh → aguardando_aprovacao_do_gestor
  → (rejected) → em_ajuste_pelo_rh
  → (approved) → pronta_para_publicar → publicada → em_triagem → encerrada
```

All transitions are enforced in `lib/hiring/statusMachine.ts` AND at the
DB level via a trigger that rejects impossible moves.

**Indexes**: `(company_id, status)`, `(status, opened_at DESC)` for
dashboard, `(requested_by)` for "vagas que pedi".

**RLS**:

- SELECT: caller has role `rh`/`socio`/`admin` → all rows; role `lider`
  → rows where `company_id ∈ allowed_companies(caller)` AND
  (`NOT confidential` OR caller ∈ `confidential_participant_ids`).
- INSERT: caller role `lider`/`rh`/`socio`/`admin`, `company_id ∈
  allowed_companies(caller)`.
- UPDATE: same as INSERT.
- DELETE: `rh`/`socio`/`admin` only.

---

## 2. `job_descriptions`

Versioned descritivo attached to a vaga (FR-003).

| Column             | Type         | Notes |
|--------------------|--------------|-------|
| `id`               | uuid PK      |       |
| `job_opening_id`   | uuid NOT NULL| FK → `job_openings.id` ON DELETE CASCADE |
| `version`          | smallint NOT NULL | começa em 1, incrementa a cada envio |
| `content_md`       | text NOT NULL| markdown |
| `author_id`        | uuid NOT NULL| FK → `profiles.id` |
| `approval_state`   | `description_approval_enum` | `rascunho` \| `enviado` \| `aprovado` \| `rejeitado` |
| `approver_id`      | uuid NULL    | FK → `profiles.id` |
| `approved_at`      | timestamptz NULL |  |
| `rejection_reason` | text NULL    |  |
| `pdf_path`         | text NULL    | path no bucket `hiring/…` quando aprovado |
| `created_at`, `updated_at` | timestamptz |  |

UNIQUE `(job_opening_id, version)`.

**RLS**: inherits from `job_openings` visibility (join on `job_opening_id`).

---

## 3. `job_external_publications`

Registro manual dos links de publicação (FR-005, FR-007).

| Column          | Type         | Notes |
|-----------------|--------------|-------|
| `id`            | uuid PK      |       |
| `job_opening_id`| uuid NOT NULL| FK → `job_openings.id` ON DELETE CASCADE |
| `channel`       | `publication_channel_enum` | `linkedin` \| `indeed` \| `instagram` \| `outros` |
| `url`           | text NOT NULL|       |
| `published_at`  | date NOT NULL|       |
| `published_by`  | uuid NOT NULL| FK → `profiles.id` |
| `note`          | text NULL    |       |
| `created_at`, `updated_at` | timestamptz |  |

**RLS**: inherits from `job_openings`.

---

## 4. `candidates`

1 row per pessoa. Compartilhado entre múltiplas aplications (R8).

| Column              | Type       | Notes |
|---------------------|------------|-------|
| `id`                | uuid PK    |       |
| `full_name`         | text NOT NULL |    |
| `email`             | citext NOT NULL UNIQUE |  |
| `phone`             | text       |       |
| `cpf`               | text NULL  | legacy convenience column; kept in sync when `document_type='cpf'` |
| `document_type`     | `document_type_enum` NOT NULL DEFAULT `'cpf'` | `cpf` \| `passport` \| `rne` \| `other` |
| `document_number`   | text NULL  | unique together with `document_type` when present |
| `source`            | text       | origem (linkedin, indeed, indicação…) |
| `cv_storage_path`   | text NULL  | path em `hiring/…/cv.<ext>` |
| `anonymized_at`     | timestamptz NULL |  |
| `anonymization_reason` | `anonymization_reason_enum` NULL | `solicitacao` \| `retencao_expirada` |
| `created_at`, `updated_at` | timestamptz |  |

PARTIAL UNIQUE INDEX on `(document_type, document_number)` WHERE
`document_number IS NOT NULL AND anonymized_at IS NULL`.

**RLS**: SELECT allowed to `rh`/`socio`/`admin` always; `lider` only via
the `applications` table (there is no direct candidate list for gestores).

INSERT/UPDATE: `rh`/`socio`/`admin`. Anonymization goes through
`anonymize_candidate(id)` SQL function, not direct UPDATE.

---

## 5. `applications`

Relação Candidate ↔ Job Opening (FR-010/012).

| Column                | Type         | Notes |
|-----------------------|--------------|-------|
| `id`                  | uuid PK      |       |
| `candidate_id`        | uuid NOT NULL| FK → `candidates.id` |
| `job_opening_id`      | uuid NOT NULL| FK → `job_openings.id` |
| `stage`               | `application_stage_enum` | ver abaixo |
| `stage_entered_at`    | timestamptz NOT NULL DEFAULT now() |  |
| `last_moved_by`       | uuid NULL    | FK → `profiles.id` |
| `notes`               | text NULL    |       |
| `rejection_message_id`| uuid NULL    | FK → `standard_messages.id` quando recusado |
| `closed_at`           | timestamptz NULL |  |
| `created_at`, `updated_at` | timestamptz |  |

UNIQUE `(candidate_id, job_opening_id)` — um candidato em cada vaga no
máximo uma vez.

**`application_stage_enum`** (FR-010):
`recebido`, `em_interesse`, `aguardando_fit_cultural`,
`sem_retorno` (Fit expirado), `fit_recebido`, `antecedentes_ok`,
`apto_entrevista_rh`, `entrevista_rh_agendada`, `entrevista_rh_feita`,
`apto_entrevista_final`, `entrevista_final_agendada`,
`aguardando_decisao_dos_gestores`, `aprovado`, `em_admissao`,
`admitido`, `reprovado_pelo_gestor`, `recusado`.

**State machine**: enforced in DB trigger + UI; transitions respect the
unanimidade rule (Clarifications Q1) — from
`entrevista_final_agendada` → `aguardando_decisao_dos_gestores` as soon
as the interview is marked realizada; once every required evaluator
has approved → `aprovado`; any single rejection → `reprovado_pelo_gestor`.

**Indexes**: `(job_opening_id, stage)` for Kanban, `(candidate_id)` for
histórico do candidato, `(stage, stage_entered_at)` for dashboard
bottleneck query.

**RLS**: same visibility rules as `job_openings` (`lider` sees apps of
jobs they have access to, incl. confidentiality gate); `rh`/`socio`/`admin`
see all.

---

## 6. `application_stage_history`

1 row per stage transition (R4, FR-011/012).

| Column          | Type         | Notes |
|-----------------|--------------|-------|
| `id`            | uuid PK      |       |
| `application_id`| uuid NOT NULL| FK → `applications.id` |
| `from_stage`    | `application_stage_enum` NULL | NULL na criação inicial |
| `to_stage`      | `application_stage_enum` NOT NULL |  |
| `moved_by`      | uuid NOT NULL| FK → `profiles.id` |
| `moved_at`      | timestamptz NOT NULL DEFAULT now() |  |
| `note`          | text NULL    |       |

Append-only. No UPDATEs. No DELETEs (except via anonymization, which
sets `note` NULL and `moved_by` to a placeholder but preserves
transitions).

**RLS**: mirror `applications`.

---

## 7. `cultural_fit_surveys`

Reusable template (FR-013).

| Column          | Type    | Notes |
|-----------------|---------|-------|
| `id`            | uuid PK |       |
| `name`          | text NOT NULL |  |
| `company_id`    | uuid NULL | FK → `companies.id` — NULL = template global |
| `active`        | boolean NOT NULL DEFAULT true |  |
| `created_by`    | uuid NOT NULL | FK → `profiles.id` |
| `created_at`, `updated_at` | timestamptz |  |

---

## 8. `cultural_fit_questions`

Perguntas de um survey.

| Column        | Type     | Notes |
|---------------|----------|-------|
| `id`          | uuid PK  |       |
| `survey_id`   | uuid NOT NULL | FK → `cultural_fit_surveys.id` ON DELETE CASCADE |
| `order_index` | smallint NOT NULL |  |
| `kind`        | `fit_question_kind_enum` | `scale` \| `text` \| `multi_choice` |
| `prompt`      | text NOT NULL |  |
| `options`     | jsonb NULL | quando `kind='multi_choice'` |
| `scale_min`   | smallint NULL | quando `kind='scale'` |
| `scale_max`   | smallint NULL |  |
| `created_at`, `updated_at` | timestamptz |  |

UNIQUE `(survey_id, order_index)`.

---

## 9. `cultural_fit_tokens`

Token de uso único do link público (R2, FR-015).

| Column          | Type         | Notes |
|-----------------|--------------|-------|
| `id`            | uuid PK      |       |
| `application_id`| uuid NOT NULL| FK → `applications.id` |
| `survey_id`     | uuid NOT NULL| FK → `cultural_fit_surveys.id` |
| `token_hash`    | text NOT NULL UNIQUE | SHA-256 hex do token raw |
| `issued_at`     | timestamptz NOT NULL DEFAULT now() |  |
| `expires_at`    | timestamptz NOT NULL | issued_at + 3 dias |
| `consumed_at`   | timestamptz NULL |  |
| `revoked_at`    | timestamptz NULL |  |

**RLS**: `anon` has no access whatsoever. Only the service role (used
by `hiring-issue-fit-cultural-link` and `hiring-submit-fit-cultural-public`)
reads/writes. Authenticated non-admin users see nothing.

---

## 10. `cultural_fit_responses`

Respostas de um candidato.

| Column          | Type         | Notes |
|-----------------|--------------|-------|
| `id`            | uuid PK      |       |
| `application_id`| uuid NOT NULL UNIQUE | FK → `applications.id` — uma resposta por aplicação |
| `survey_id`     | uuid NOT NULL | FK → `cultural_fit_surveys.id` |
| `submitted_at`  | timestamptz NOT NULL DEFAULT now() |  |
| `payload`       | jsonb NOT NULL | `{ question_id: answer }` |
| `anonymized_at` | timestamptz NULL |  |
| `created_at`, `updated_at` | timestamptz |  |

**RLS**: SELECT por `rh`/`socio`/`admin` sempre, `lider` quando a
`application` estiver em vaga visível. Inserção apenas via Edge Function
de token público (service role).

---

## 11. `background_checks`

Resultado da checagem (FR-017).

| Column          | Type         | Notes |
|-----------------|--------------|-------|
| `id`            | uuid PK      |       |
| `application_id`| uuid NOT NULL UNIQUE | FK → `applications.id` |
| `status_flag`   | `background_status_enum` | `limpo` \| `pendencia_leve` \| `pendencia_grave` \| `nao_aplicavel` |
| `file_path`     | text NULL    | path no bucket |
| `note`          | text NULL    |       |
| `uploaded_by`   | uuid NOT NULL | FK → `profiles.id` |
| `uploaded_at`   | timestamptz NOT NULL DEFAULT now() |  |
| `created_at`, `updated_at` | timestamptz |  |

**RLS**: mirror `applications`. UPDATE/INSERT apenas `rh`/`socio`/`admin`.

---

## 12. `interviews`

Agendamento e resultado (FR-019/020/022).

| Column             | Type         | Notes |
|--------------------|--------------|-------|
| `id`               | uuid PK      |       |
| `application_id`   | uuid NOT NULL | FK → `applications.id` |
| `kind`             | `interview_kind_enum` | `rh` \| `final` |
| `scheduled_at`     | timestamptz NOT NULL |  |
| `duration_minutes` | smallint NOT NULL DEFAULT 60 |  |
| `mode`             | `interview_mode_enum` | `presencial` \| `remota` |
| `location_or_link` | text NULL    |       |
| `participants`     | uuid[] NOT NULL | FK logical → profiles.id |
| `status`           | `interview_status_enum` | `agendada` \| `realizada` \| `cancelada` |
| `summary`          | text NULL    |       |
| `transcript_path`  | text NULL    | path no bucket |
| `transcript_text`  | text NULL    | colado, se preferido |
| `created_by`       | uuid NOT NULL | FK → `profiles.id` |
| `created_at`, `updated_at` | timestamptz |  |

**RLS**: mirror `applications`. 24 h-ahead reminder criado pelo cron
(R7).

---

## 13. `interview_decisions`

Decisão individual de cada entrevistador (unanimidade, Clarifications
Q1).

| Column          | Type         | Notes |
|-----------------|--------------|-------|
| `id`            | uuid PK      |       |
| `interview_id`  | uuid NOT NULL | FK → `interviews.id` |
| `evaluator_id`  | uuid NOT NULL | FK → `profiles.id` |
| `decision`      | `evaluator_decision_enum` | `aprovado` \| `reprovado` \| `pendente` |
| `comments`      | text NULL    | obrigatório quando `reprovado` |
| `decided_at`    | timestamptz NULL | NULL enquanto pendente |
| `created_at`, `updated_at` | timestamptz |  |

UNIQUE `(interview_id, evaluator_id)`.

Trigger: quando todas as entradas de uma `interviews` ficam
`aprovado` → seta `applications.stage = 'aprovado'`. Primeira
`reprovado` → seta `applications.stage = 'reprovado_pelo_gestor'` e
encerra o processo.

---

## 14. `hiring_decisions`

Decisão consolidada final do processo (snapshot para auditoria).

| Column          | Type         | Notes |
|-----------------|--------------|-------|
| `id`            | uuid PK      |       |
| `application_id`| uuid NOT NULL UNIQUE | FK → `applications.id` |
| `outcome`       | `hiring_outcome_enum` | `aprovado` \| `reprovado` |
| `decided_at`    | timestamptz NOT NULL DEFAULT now() |  |
| `summary`       | text NULL    | composição das decisões individuais |
| `created_at`, `updated_at` | timestamptz |  |

Populated automatically by the trigger from `interview_decisions`.

---

## 15. `employee_onboarding_handoffs`

Pré-cadastro criado ao aprovar (FR-025/026), ligando hiring ao módulo
existente de gestão de talentos.

| Column              | Type         | Notes |
|---------------------|--------------|-------|
| `id`                | uuid PK      |       |
| `application_id`    | uuid NOT NULL UNIQUE | FK → `applications.id` |
| `profile_id`        | uuid NOT NULL | FK → `profiles.id` (existing) — o pré-cadastro criado |
| `team_id`           | uuid NULL    | FK → `teams.id` |
| `leader_id`         | uuid NULL    | FK → `profiles.id` |
| `start_date`        | date NULL    |       |
| `contract_type`     | `contract_type_enum` |  |
| `cost_cents`        | integer NULL |       |
| `final_title`       | text NULL    |       |
| `onboarded_at`      | timestamptz NULL | quando vira colaborador efetivo |
| `created_at`, `updated_at` | timestamptz |  |

A mera criação dessa linha marca `applications.stage = 'em_admissao'`.
Preenchimento final + `onboarded_at` → `admitido`.

**RLS**: apenas `rh`/`socio`/`admin`.

---

## 16. `standard_messages`

Mensagens padronizadas editáveis (FR-024).

| Column          | Type         | Notes |
|-----------------|--------------|-------|
| `id`            | uuid PK      |       |
| `kind`          | `standard_message_kind_enum` | `recusa` \| `convite_fit` \| `oferta` \| `aprovacao_proxima_etapa` |
| `title`         | text NOT NULL |  |
| `body_md`       | text NOT NULL |  |
| `active`        | boolean NOT NULL DEFAULT true |  |
| `created_by`    | uuid NOT NULL | FK → `profiles.id` |
| `created_at`, `updated_at` | timestamptz |  |

**RLS**: SELECT all authenticated `rh`/`socio`/`admin`; INSERT/UPDATE
same.

---

## 17. `candidate_access_log`

Log de quem viu/alterou cada candidato (FR-028).

| Column          | Type         | Notes |
|-----------------|--------------|-------|
| `id`            | uuid PK      |       |
| `candidate_id`  | uuid NOT NULL | FK → `candidates.id` |
| `actor_id`      | uuid NOT NULL | FK → `profiles.id` |
| `action`        | `log_action_enum` | `view` \| `update` \| `optimistic_conflict` |
| `resource`      | text NOT NULL | ex. `candidates`, `applications`, `interviews` |
| `resource_id`   | uuid NOT NULL |  |
| `expected_version` | timestamptz NULL | para conflitos (FR-033) |
| `actual_version`   | timestamptz NULL |  |
| `at`            | timestamptz NOT NULL DEFAULT now() |  |

Append-only; no UPDATE. DELETE only via candidate anonymization.

**RLS**: SELECT only `socio`/`admin` (LGPD: não expor log a todo RH sem
necessidade); INSERT via trigger/service role.

---

## 18. `pending_tasks` (existente — extensão mínima, ver R7 revisado)

A tabela `pending_tasks` já existe (migration
`20251009195041_…sql`) e já é populada por triggers de 1:1 e PDI
(migration `20260416192400_populate_pending_tasks.sql`). O hiring
**reusa** a mesma tabela em vez de criar `notifications` nova.

Migration `20260416193050_extend_pending_tasks_hiring_kinds.sql`
faz:

```sql
ALTER TABLE public.pending_tasks DROP CONSTRAINT pending_tasks_task_type_check;
ALTER TABLE public.pending_tasks ADD CONSTRAINT pending_tasks_task_type_check
  CHECK (task_type IN (
    -- existentes
    'evaluation', 'one_on_one', 'climate_survey', 'pdi_approval',
    'pdi_update', 'action_item', 'other',
    -- novos (hiring)
    'hiring_job_approval', 'hiring_job_review',
    'hiring_candidate_stage_change', 'hiring_interview_reminder',
    'hiring_final_decision', 'hiring_admission_followup',
    'hiring_fit_cultural_received', 'hiring_fit_cultural_expired'
  ));
```

Convenção de `related_id`:

| task_type                           | related_id aponta para  |
|-------------------------------------|-------------------------|
| `hiring_job_approval`               | `job_openings.id`       |
| `hiring_job_review`                 | `job_openings.id`       |
| `hiring_candidate_stage_change`     | `applications.id`       |
| `hiring_interview_reminder`         | `interviews.id`         |
| `hiring_final_decision`             | `applications.id`       |
| `hiring_admission_followup`         | `applications.id`       |
| `hiring_fit_cultural_received`      | `applications.id`       |
| `hiring_fit_cultural_expired`       | `applications.id`       |

Triggers responsáveis por inserir/fechar tasks (mesmo padrão de
`create_pending_tasks_for_one_on_one` / `close_…`):

- `tg_hiring_job_approval`: INSERT/UPDATE em `job_openings` — abre
  task para `requested_by` quando status → `aguardando_aprovacao_do_gestor`
  e fecha quando sai desse status.
- `tg_hiring_interview_reminder`: pg_cron a cada 15 min insere task
  para participantes quando `scheduled_at` cai dentro de 24h e não
  existe task aberta (`ON CONFLICT DO NOTHING` em um índice único
  parcial).
- `tg_hiring_final_decision`: cada `interviews` que marca
  `status = 'realizada'` do tipo `final` abre task para cada
  `evaluator_id` sem decisão (`interview_decisions.decision =
  'pendente'`). Fecha quando todos decidem.
- `tg_hiring_admission_followup`: aplicação entrando em `aprovado`
  abre task para o RH designado; fechada quando transita para
  `em_admissao`.
- `tg_hiring_fit_received`: `cultural_fit_responses` insert abre
  task informativa para o RH owner.
- `tg_hiring_fit_expired`: `hiring-cron-expire-fit-links` (ver
  `contracts/`) insere task "Link expirou, reenviar?" para o RH.

`PendingTasksDropdown.tsx` ganha entradas nos maps:

```ts
TASK_ICONS.hiring_job_approval = FileCheck;
TASK_ICONS.hiring_interview_reminder = Calendar;
TASK_ICONS.hiring_final_decision = CheckCircle2;
// …etc
TASK_ROUTES.hiring_job_approval = "/hiring/jobs";
TASK_ROUTES.hiring_interview_reminder = "/hiring/candidates";
// …etc
```

**RLS**: já configurado na migration original; o hiring não toca
políticas de `pending_tasks`. SELECT `user_id = auth.uid()`,
UPDATE `user_id = auth.uid()`, INSERT por triggers (SECURITY DEFINER).

---

## Referential Integrity Summary

- `candidates (1) — (N) applications — (1) job_openings`
- `applications (1) — (N) application_stage_history`
- `applications (1) — (0..1) cultural_fit_responses`
- `applications (1) — (0..N) cultural_fit_tokens`
- `applications (1) — (0..1) background_checks`
- `applications (1) — (0..N) interviews — (1..N) interview_decisions`
- `applications (1) — (0..1) hiring_decisions`
- `applications (1) — (0..1) employee_onboarding_handoffs — (1) profiles`
- `job_openings (1) — (N) job_descriptions`
- `job_openings (1) — (N) job_external_publications`
- `cultural_fit_surveys (1) — (N) cultural_fit_questions`
- `candidates (1) — (N) candidate_access_log`

No schema cycles. No FK points at a table outside `public.*`.

## Anonymization contract (FR-029)

`anonymize_candidate(p_candidate_id uuid)` mutates:

- `candidates.full_name = '[anonymized]'`
- `candidates.email = 'anon-' || id || '@anon.invalid'`
- `candidates.phone = NULL`
- `candidates.cpf = NULL`
- `candidates.document_number = NULL`
- `candidates.cv_storage_path = NULL` (and Edge Function deletes the
  object)
- `cultural_fit_responses.payload = '{}'::jsonb` for all related rows
- `background_checks.file_path = NULL` (storage object deleted)
- `background_checks.note = NULL`
- `interviews.transcript_text = NULL`
- `interviews.transcript_path = NULL` (storage object deleted)
- `interviews.summary = NULL`
- `candidates.anonymized_at = now()` — idempotent after first call.

`applications.stage`, `application_stage_history`, `hiring_decisions`,
aggregate counts, and `notifications.payload` are **not** rewritten —
they are already aggregate/non-PII signals retained for metrics
(SC-001/002/005).

## Cron jobs (see R9)

Migration `20260416193500_hiring_cron_jobs.sql` schedules:

| Name                       | Schedule      | Calls                                   |
|----------------------------|---------------|-----------------------------------------|
| `hiring_anonymize_expired` | `0 3 * * *`   | `hiring-cron-anonymize-expired` (Edge)  |
| `hiring_expire_fit_links`  | `*/30 * * * *` | `hiring-cron-expire-fit-links` (Edge)   |
| `hiring_interview_reminder`| `*/15 * * * *` | SQL: insert `notifications` 24 h ahead |
