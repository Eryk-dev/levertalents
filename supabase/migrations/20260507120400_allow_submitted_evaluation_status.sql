-- The current evaluation flow and pending-task triggers use status='submitted',
-- but the legacy table constraint still only allowed draft/completed/reviewed.
-- Keep legacy values for existing data and allow the canonical submitted state.

ALTER TABLE public.evaluations
  DROP CONSTRAINT IF EXISTS evaluations_status_check;

ALTER TABLE public.evaluations
  ADD CONSTRAINT evaluations_status_check
  CHECK (status = ANY (ARRAY['draft'::text, 'submitted'::text, 'completed'::text, 'reviewed'::text]));
