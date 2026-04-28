-- =========================================================================
-- pgTAP test: Migration F.2 — pg_cron retention job (data_access_log 36mo)
-- Status: PENDING (skip habilitado até Plan 02-03 aplicar a migration)
-- REQs: TAL-07
-- =========================================================================
begin;
select plan(2);

-- Skipped até Plan 02-03 (Migration F.2 cron) implementar:
select skip(2, 'pending Migration F.2 cron schedule by Plan 02-03');

-- TODO Plan 02-03: remover linha de skip acima e ativar os testes abaixo.
--
-- Setup esperado: select tests.authenticate_as_service_role();
--
-- TEST 1: Job 'data_access_log_retention_cleanup' existe em cron.job
--   select isnt_empty(
--     $$select 1 from cron.job
--       where jobname = 'data_access_log_retention_cleanup'$$,
--     'pg_cron job data_access_log_retention_cleanup existe'
--   );
--
-- TEST 2: Manual run da query de retention DELETA rows com at < NOW() - INTERVAL '36 months'
--   insert into public.data_access_log
--     (actor_id, entity_type, entity_id, action, at)
--   values
--     -- 37 meses: deve ser deletado
--     ((select id from public.profiles limit 1),
--      'candidate', gen_random_uuid(), 'view',
--      now() - interval '37 months'),
--     -- 35 meses: deve ser preservado
--     ((select id from public.profiles limit 1),
--      'candidate', gen_random_uuid(), 'view',
--      now() - interval '35 months');
--
--   delete from public.data_access_log where at < now() - interval '36 months';
--
--   select is(
--     (select count(*)::bigint from public.data_access_log
--      where at < now() - interval '36 months'),
--     0::bigint,
--     'cleanup deleta rows >36 meses; preserva <36 meses'
--   );

select * from finish();
rollback;
