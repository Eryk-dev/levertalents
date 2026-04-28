-- =========================================================================
-- Migration CRON.1: pg_cron job evaluation_cycles_auto_close
--                   Schedule: daily 06:00 UTC = 03:00 BRT (Claude's Discretion lock)
--
-- Threats: T-3-CRON-01 (cron failure leaves expired cycles 'active') — accept
--          UI fallback: check ends_at on read (cycle.status='active' AND ends_at > NOW())
-- REQs: PERF-01 (status auto-flips on ends_at), D-01
-- Reversibility: SELECT cron.unschedule('evaluation_cycles_auto_close')
-- DEPENDENCIES: perf1 (evaluation_cycles table + status column exists)
--               pg_cron extension must be enabled (Phase 2 retention job confirms it is active)
-- =========================================================================

-- Idempotent: unschedule first if exists, then re-schedule
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'evaluation_cycles_auto_close') THEN
    PERFORM cron.unschedule('evaluation_cycles_auto_close');
  END IF;
END $$;

SELECT cron.schedule(
  'evaluation_cycles_auto_close',
  '0 6 * * *',  -- 06:00 UTC = 03:00 BRT (Claude's Discretion — matches CONTEXT.md §Claude's Discretion)
  $$
    UPDATE public.evaluation_cycles
       SET status     = 'closed',
           updated_at = NOW()
     WHERE status  = 'active'
       AND ends_at <= NOW();
  $$
);

COMMENT ON EXTENSION pg_cron
  IS 'Phase 2: data_access_log_retention_cleanup (weekly). Phase 3: evaluation_cycles_auto_close (daily 06:00 UTC)';
