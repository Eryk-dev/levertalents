-- =========================================================================
-- pgTAP test: Migration F.1 — Normalize legacy application stages
-- Status: PENDING (skip habilitado até Plan 02-02 aplicar a migration)
-- REQs: RS-05, RS-06
-- =========================================================================
begin;
select plan(3);

-- Skipped até Plan 02-02 (Migration F.1) implementar:
select skip(3, 'pending Migration F.1 apply by Plan 02-02');

-- TODO Plan 02-02: remover linha de skip acima e ativar os testes abaixo.
--
-- Setup esperado:
--   select tests.authenticate_as_service_role();
--   insert into public.companies (id, name) values
--     ('cccccccc-1111-1111-1111-111111111111', 'F Stages Test');
--   insert into public.job_openings (id, company_id, title) values
--     ('cccccccc-2222-2222-2222-222222222222',
--      'cccccccc-1111-1111-1111-111111111111', 'Vaga Migration F');
--
-- TEST 1: Zero candidatos órfãos pós-Migration F.1
--   select is(
--     (select count(*)::bigint from public.applications
--      where stage in ('aguardando_fit_cultural', 'sem_retorno', 'fit_recebido')),
--     0::bigint,
--     'Zero applications em stages legados pós-Migration F.1'
--   );
--
-- TEST 2: legacy_marker preservado em metadata para rows backfilladas
--   select cmp_ok(
--     (select count(*)::bigint from public.applications
--      where metadata ? 'legacy_marker'),
--     '>=',
--     0::bigint,
--     'metadata.legacy_marker preservado para candidatos normalizados (sem_retorno_legacy)'
--   );
--
-- TEST 3: Trigger tg_applications_block_legacy_stages bloqueia stage legado
--   prepare insert_legacy as
--     insert into public.applications (candidate_id, job_opening_id, stage)
--     values (gen_random_uuid(), 'cccccccc-2222-2222-2222-222222222222'::uuid,
--             'aguardando_fit_cultural');
--   select throws_ok(
--     'execute insert_legacy',
--     '23514',
--     null,
--     'Trigger bloqueia stage legado em INSERT'
--   );

select * from finish();
rollback;
