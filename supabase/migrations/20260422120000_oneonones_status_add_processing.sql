-- Extend one_on_ones.status CHECK constraint with the intermediate 'processing'
-- state used by OneOnOneMeetingForm.tsx during finalization (transcript upload
-- + AI summary). The original constraint was inline (PostgreSQL named it
-- one_on_ones_status_check by default) and only allowed the four terminal
-- statuses, so every meeting finalization failed the intermediate update.

ALTER TABLE public.one_on_ones
  DROP CONSTRAINT IF EXISTS one_on_ones_status_check;

ALTER TABLE public.one_on_ones
  ADD CONSTRAINT one_on_ones_status_check
  CHECK (status IN ('scheduled', 'completed', 'cancelled', 'rescheduled', 'processing'));
