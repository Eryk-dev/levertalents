-- =========================================================================
-- pgTAP test: Migration F.2 — data_access_log + read_candidate_with_log RPC
-- Activated by: Plan 02-02 (Wave 1)
-- REQs: TAL-05, TAL-06, TAL-07
-- =========================================================================
begin;
select plan(4);

select tests.authenticate_as_service_role();

-- Setup fixture: company + RH profile + candidate
insert into public.companies (id, name) values
  ('ffffffff-0000-0000-0000-000000000010', 'Test F2 Co')
  on conflict (id) do nothing;

insert into public.profiles (id, full_name, username) values
  ('ffffffff-0000-0000-0000-000000000011', 'RH F2', 'rh-f2')
  on conflict (id) do nothing;

-- Garante role 'rh' para que is_people_manager retorne true
insert into public.user_roles (user_id, role) values
  ('ffffffff-0000-0000-0000-000000000011', 'rh'::public.app_role)
  on conflict do nothing;

insert into public.candidates (id, full_name, email) values
  ('ffffffff-0000-0000-0000-000000000012', 'Test Cand F2', 'cand+f2@example.com')
  on conflict (id) do nothing;

-- TEST 1: read_candidate_with_log escreve >= 1 row em data_access_log
set local request.jwt.claims to '{"sub":"ffffffff-0000-0000-0000-000000000011","role":"authenticated"}';
select lives_ok(
  $$ select public.read_candidate_with_log('ffffffff-0000-0000-0000-000000000012'::uuid, 'pgtap_test') $$,
  'RPC read_candidate_with_log executa para RH'
);

-- Re-elevar para service_role para inspecionar a tabela (RLS bloquearia o role default)
select tests.authenticate_as_service_role();

select cmp_ok(
  (select count(*)::bigint from public.data_access_log
    where entity_id = 'ffffffff-0000-0000-0000-000000000012'::uuid
      and context = 'pgtap_test'),
  '>=', 1::bigint,
  'RPC escreve >= 1 log row em data_access_log'
);

-- TEST 3: INSERT direto em data_access_log via authenticated (sem service-role) e bloqueado por RLS
-- Trocamos para o RH como authenticated (RLS aplica; nao ha policy de INSERT)
set local request.jwt.claims to '{"sub":"ffffffff-0000-0000-0000-000000000011","role":"authenticated"}';
set local role authenticated;

prepare direct_insert as
  insert into public.data_access_log (actor_id, entity_type, entity_id, action)
  values ('ffffffff-0000-0000-0000-000000000011'::uuid, 'candidate', 'ffffffff-0000-0000-0000-000000000012'::uuid, 'view');

select throws_ok(
  'execute direct_insert',
  '42501',
  null,
  'INSERT direto em data_access_log e bloqueado por RLS (sem policy INSERT)'
);

reset role;
select tests.authenticate_as_service_role();

-- TEST 4: SELECT em data_access_log via RH (is_people_manager=true) retorna pelo menos a row do TEST 1
set local request.jwt.claims to '{"sub":"ffffffff-0000-0000-0000-000000000011","role":"authenticated"}';
set local role authenticated;

select cmp_ok(
  (select count(*)::bigint from public.data_access_log
    where entity_id = 'ffffffff-0000-0000-0000-000000000012'::uuid),
  '>=', 1::bigint,
  'RH (is_people_manager) consegue SELECT em data_access_log via policy'
);

reset role;

select * from finish();
rollback;
