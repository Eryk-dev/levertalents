-- ========================================================================
-- 012-data-access-log-cron.sql — TAL-07 / QUAL-09 retention guarantee
--
-- Verifies pg_cron retention job for data_access_log is scheduled.
-- This is a pre-condition for Migration G; this test must pass BEFORE
-- the contract migration runs.
-- REQs: TAL-07, QUAL-09
-- ========================================================================
begin;
select plan(2);

select isnt_empty(
  $$select 1 from cron.job where jobname = 'data_access_log_retention_cleanup'$$,
  'pg_cron retention job is scheduled'
);

select ok(
  (SELECT active FROM cron.job WHERE jobname = 'data_access_log_retention_cleanup'),
  'pg_cron retention job is active'
);

select * from finish();
rollback;
