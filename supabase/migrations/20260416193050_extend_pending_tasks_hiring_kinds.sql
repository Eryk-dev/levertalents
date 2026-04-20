-- T005 — Extend pending_tasks.task_type CHECK constraint with the 8 hiring
-- kinds introduced by this feature (research R7). Existing kinds stay untouched.

ALTER TABLE public.pending_tasks
  DROP CONSTRAINT IF EXISTS pending_tasks_task_type_check;

ALTER TABLE public.pending_tasks
  ADD CONSTRAINT pending_tasks_task_type_check
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
