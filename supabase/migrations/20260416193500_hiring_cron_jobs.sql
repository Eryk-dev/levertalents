-- T010 — pg_cron schedules for hiring.
--
-- Three jobs:
--   hiring_anonymize_expired   — daily 03:00 UTC, invokes Edge Function
--   hiring_expire_fit_links    — every 30 min, invokes Edge Function
--   hiring_interview_reminder  — every 15 min, pure SQL → pending_tasks
--
-- The Edge-Function-invoking jobs use `net.http_post` with a shared secret
-- pulled from `current_setting('app.cron_secret', true)` (set via Supabase
-- Vault or ALTER DATABASE SET). If the setting is missing the cron body is
-- skipped — keeps `supabase db reset` clean in local dev.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Helper — reads the configured Supabase URL for self-calling Edge Functions.
CREATE OR REPLACE FUNCTION public.hiring_supabase_url()
RETURNS TEXT
LANGUAGE SQL
STABLE
AS $$
  SELECT COALESCE(current_setting('app.supabase_url', true), '');
$$;

CREATE OR REPLACE FUNCTION public.hiring_cron_secret()
RETURNS TEXT
LANGUAGE SQL
STABLE
AS $$
  SELECT COALESCE(current_setting('app.cron_secret', true), '');
$$;

-- --- hiring_anonymize_expired (daily 03:00 UTC) --------------------------

CREATE OR REPLACE FUNCTION public.hiring_cron_invoke_anonymize_expired()
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_url TEXT := public.hiring_supabase_url();
  v_secret TEXT := public.hiring_cron_secret();
BEGIN
  IF v_url = '' OR v_secret = '' THEN
    RAISE NOTICE 'hiring_cron_invoke_anonymize_expired: missing app.supabase_url or app.cron_secret; skipping';
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := v_url || '/functions/v1/hiring-cron-anonymize-expired',
    headers := jsonb_build_object(
      'content-type', 'application/json',
      'x-cron-secret', v_secret
    ),
    body := '{}'::jsonb
  );
END;
$$;

SELECT cron.schedule(
  'hiring_anonymize_expired',
  '0 3 * * *',
  $$SELECT public.hiring_cron_invoke_anonymize_expired();$$
);

-- --- hiring_expire_fit_links (every 30 min) -------------------------------

CREATE OR REPLACE FUNCTION public.hiring_cron_invoke_expire_fit_links()
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_url TEXT := public.hiring_supabase_url();
  v_secret TEXT := public.hiring_cron_secret();
BEGIN
  IF v_url = '' OR v_secret = '' THEN
    RAISE NOTICE 'hiring_cron_invoke_expire_fit_links: missing settings; skipping';
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := v_url || '/functions/v1/hiring-cron-expire-fit-links',
    headers := jsonb_build_object(
      'content-type', 'application/json',
      'x-cron-secret', v_secret
    ),
    body := '{}'::jsonb
  );
END;
$$;

SELECT cron.schedule(
  'hiring_expire_fit_links',
  '*/30 * * * *',
  $$SELECT public.hiring_cron_invoke_expire_fit_links();$$
);

-- --- hiring_interview_reminder (every 15 min, pure SQL) -------------------

CREATE OR REPLACE FUNCTION public.hiring_cron_interview_reminder()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_participant UUID;
  v_interview RECORD;
BEGIN
  FOR v_interview IN
    SELECT i.id, i.application_id, i.scheduled_at, i.participants
    FROM public.interviews i
    WHERE i.status = 'agendada'
      AND i.scheduled_at > NOW()
      AND i.scheduled_at <= NOW() + INTERVAL '24 hours'
  LOOP
    FOREACH v_participant IN ARRAY v_interview.participants LOOP
      INSERT INTO public.pending_tasks (
        user_id, title, description, task_type, related_id, priority, due_date
      )
      SELECT
        v_participant,
        'Entrevista em menos de 24h',
        'Preparar e participar da entrevista agendada.',
        'hiring_interview_reminder',
        v_interview.id,
        'high',
        v_interview.scheduled_at::date
      WHERE NOT EXISTS (
        SELECT 1 FROM public.pending_tasks pt
        WHERE pt.user_id = v_participant
          AND pt.task_type = 'hiring_interview_reminder'
          AND pt.related_id = v_interview.id
          AND pt.status IN ('pending', 'in_progress')
      );
    END LOOP;
  END LOOP;
END;
$$;

SELECT cron.schedule(
  'hiring_interview_reminder',
  '*/15 * * * *',
  $$SELECT public.hiring_cron_interview_reminder();$$
);
