-- =========================================================================
-- pgTAP test: Migration F.2 — data_access_log + read_candidate_with_log RPC
-- Status: PENDING (skip habilitado até Plan 02-03 aplicar a migration)
-- REQs: TAL-05, TAL-06, TAL-07
-- =========================================================================
begin;
select plan(4);

-- Skipped até Plan 02-03 (Migration F.2) implementar:
select skip(4, 'pending Migration F.2 apply by Plan 02-03');

-- TODO Plan 02-03: remover linha de skip acima e ativar os testes abaixo.
--
-- Setup esperado:
--   select tests.authenticate_as_service_role();
--   insert into public.companies (id, name) values
--     ('dddddddd-1111-1111-1111-111111111111', 'DataAccessLog Test');
--   insert into public.candidates (id, full_name, email) values
--     ('dddddddd-2222-2222-2222-222222222222', 'Candidato Teste', 'teste@example.com');
--   set local request.jwt.claims to '{"sub":"<rh-user-uuid>","role":"authenticated"}';
--
-- TEST 1: read_candidate_with_log escreve exatamente 1 row em data_access_log
--   select public.read_candidate_with_log(
--     'dddddddd-2222-2222-2222-222222222222'::uuid,
--     'view-from-test'
--   );
--   select is(
--     (select count(*)::bigint from public.data_access_log
--      where entity_id = 'dddddddd-2222-2222-2222-222222222222'::uuid
--        and entity_type = 'candidate'
--        and action = 'view'
--        and context = 'view-from-test'),
--     1::bigint,
--     'RPC escreve exatamente 1 row em data_access_log'
--   );
--
-- TEST 2: INSERT direto em data_access_log é bloqueado por RLS
--   (sem policy INSERT — apenas a RPC SECURITY DEFINER pode inserir)
--   prepare direct_insert as
--     insert into public.data_access_log
--       (actor_id, entity_type, entity_id, action)
--     values (auth.uid(), 'candidate', gen_random_uuid(), 'view');
--   select throws_ok(
--     'execute direct_insert',
--     '42501',
--     null,
--     'RLS bloqueia INSERT direto em data_access_log (apenas RPC autorizada)'
--   );
--
-- TEST 3: SELECT em data_access_log requer is_people_manager (admin/rh/socio)
--   set local request.jwt.claims to '{"sub":"<liderado-user-uuid>","role":"authenticated"}';
--   select is(
--     (select count(*)::bigint from public.data_access_log),
--     0::bigint,
--     'Liderado não vê linhas (RLS filtra)'
--   );
--
-- TEST 4: pg_cron job 'data_access_log_retention_cleanup' existe
--   E schedule = '30 3 * * 1' (segundas 03:30 UTC)
--   select is(
--     (select schedule from cron.job
--      where jobname = 'data_access_log_retention_cleanup'),
--     '30 3 * * 1',
--     'Retention cron job rodando segundas 03:30 UTC'
--   );

select * from finish();
rollback;
