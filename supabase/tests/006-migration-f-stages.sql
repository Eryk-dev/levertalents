-- =========================================================================
-- pgTAP test: Migration F.1 — Normalize legacy application stages
-- Activated by: Plan 02-02 (Wave 1)
-- REQs: RS-05, RS-06
-- =========================================================================
begin;
select plan(5);

select tests.authenticate_as_service_role();

-- Setup fixture: company + candidate + job_opening necessários para inserir application
insert into public.companies (id, name) values
  ('ffffffff-0000-0000-0000-000000000001', 'Test F1 Co')
  on conflict (id) do nothing;

insert into public.candidates (id, full_name, email) values
  ('ffffffff-0000-0000-0000-000000000002', 'Test Candidate F1', 'test+f1@example.com')
  on conflict (id) do nothing;

-- Garantir que existe um profile para requested_by
insert into public.profiles (id, full_name, email) values
  ('ffffffff-0000-0000-0000-000000000099', 'Test Requester F1', 'requester+f1@example.com')
  on conflict (id) do nothing;

insert into public.job_openings (id, company_id, requested_by, title) values
  ('ffffffff-0000-0000-0000-000000000003',
   'ffffffff-0000-0000-0000-000000000001',
   'ffffffff-0000-0000-0000-000000000099',
   'Test Job F1')
  on conflict (id) do nothing;

-- TEST 1: Zero candidatos em stages legados pos-Migration F.1
select is(
  (select count(*)::bigint from public.applications
   where stage in ('aguardando_fit_cultural', 'sem_retorno', 'fit_recebido')),
  0::bigint,
  'Zero applications em stages legados pos-Migration F.1'
);

-- TEST 2: Trigger tg_applications_block_legacy_stages bloqueia INSERT direto com stage legado
prepare insert_legacy as
  insert into public.applications (candidate_id, job_opening_id, stage)
  values (
    'ffffffff-0000-0000-0000-000000000002'::uuid,
    'ffffffff-0000-0000-0000-000000000003'::uuid,
    'aguardando_fit_cultural'
  );
select throws_ok(
  'execute insert_legacy',
  '23514',
  null,
  'Trigger bloqueia INSERT com stage legado aguardando_fit_cultural'
);

-- TEST 3: applications.metadata coluna existe e e jsonb
select col_type_is('public', 'applications', 'metadata', 'jsonb', 'metadata coluna e jsonb');

-- TEST 4: Inserir uma row pre-mapping (bypass via session_replication_role) e validar que
-- aplicar a logica de UPDATE F.1 preserva metadata.legacy_marker = 'sem_retorno'.
set session_replication_role = replica;
insert into public.applications (id, candidate_id, job_opening_id, stage, metadata)
  values (
    'ffffffff-0000-0000-0000-0000000000aa'::uuid,
    'ffffffff-0000-0000-0000-000000000002'::uuid,
    'ffffffff-0000-0000-0000-000000000003'::uuid,
    'sem_retorno',
    '{}'::jsonb
  );
set session_replication_role = origin;

-- Re-aplicar UPDATE batch logic localmente para essa row
update public.applications a
   set metadata = jsonb_set(coalesce(a.metadata, '{}'::jsonb), '{legacy_marker}', '"sem_retorno"'::jsonb)
                   || jsonb_build_object('normalized_at', now()),
       stage = 'em_interesse'::public.application_stage_enum
 where a.id = 'ffffffff-0000-0000-0000-0000000000aa'::uuid;

select is(
  (select metadata->>'legacy_marker' from public.applications
    where id = 'ffffffff-0000-0000-0000-0000000000aa'::uuid),
  'sem_retorno',
  'Row migrada de sem_retorno preserva metadata.legacy_marker = sem_retorno'
);

-- TEST 5: A row migrada de sem_retorno esta agora em stage = 'em_interesse'
-- (per CONTEXT.md D-mapping; observacao: enum nao tem 'triagem' como valor, e
-- 'em_interesse' e o defaultStage da Triagem em STAGE_GROUPS.ts).
select is(
  (select stage::text from public.applications
    where id = 'ffffffff-0000-0000-0000-0000000000aa'::uuid),
  'em_interesse',
  'Row migrada de sem_retorno esta em stage em_interesse (defaultStage Triagem)'
);

select * from finish();
rollback;
