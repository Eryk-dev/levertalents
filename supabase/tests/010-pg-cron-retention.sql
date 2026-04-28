-- =========================================================================
-- pgTAP test: Migration F.2 — pg_cron retention job (data_access_log 36mo)
-- Activated by: Plan 02-02 (Wave 1)
-- REQs: TAL-07
-- =========================================================================
begin;
select plan(2);

select tests.authenticate_as_service_role();

-- TEST 1: Cron job 'data_access_log_retention_cleanup' existe com schedule semanal Mon 03:30 UTC
select is(
  (select schedule from cron.job where jobname = 'data_access_log_retention_cleanup'),
  '30 3 * * 1',
  'Retention cron job rodando segundas 03:30 UTC'
);

-- TEST 2: Manual run da query DELETE remove rows >36 meses
-- Setup: profile + insercao manual de 1 row antiga (37 meses) + 1 recente (35 meses)
insert into public.profiles (id, full_name, email) values
  ('ffffffff-0000-0000-0000-000000000020', 'Old Actor F2 Cron', 'old-actor+cron@example.com')
  on conflict (id) do nothing;

-- Inserts via service role (sem RLS bloqueando)
insert into public.data_access_log (id, actor_id, entity_type, entity_id, action, at)
  values
    ('ffffffff-0000-0000-0000-000000000021'::uuid,
     'ffffffff-0000-0000-0000-000000000020'::uuid,
     'candidate',
     'ffffffff-0000-0000-0000-000000000022'::uuid,
     'view',
     now() - interval '37 months'),
    ('ffffffff-0000-0000-0000-000000000023'::uuid,
     'ffffffff-0000-0000-0000-000000000020'::uuid,
     'candidate',
     'ffffffff-0000-0000-0000-000000000022'::uuid,
     'view',
     now() - interval '35 months');

delete from public.data_access_log where at < now() - interval '36 months';

select is(
  (select count(*)::bigint from public.data_access_log
    where id = 'ffffffff-0000-0000-0000-000000000021'::uuid),
  0::bigint,
  'Cleanup remove rows >36 meses (37m row deletada)'
);

select * from finish();
rollback;
