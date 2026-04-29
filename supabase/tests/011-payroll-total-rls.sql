-- ========================================================================
-- 011-payroll-total-rls.sql — DASH-01 RLS gate
--
-- Mitigates: T-04-02-01 (sócio sem membership lê folha de empresa alheia)
-- Activated by: Plan 04-02 (RPC read_payroll_total)
-- REQs: DASH-01, DASH-02, QUAL-02
-- ========================================================================
begin;
select plan(4);

select tests.create_supabase_user('socio_a@test4.com');
select tests.create_supabase_user('socio_b@test4.com');
select tests.authenticate_as_service_role();

insert into public.companies (id, name) values
  ('00000000-0000-0000-0000-00000000000a', 'Empresa A 04'),
  ('00000000-0000-0000-0000-00000000000b', 'Empresa B 04')
on conflict (id) do nothing;

insert into public.user_roles (user_id, role) values
  (tests.get_supabase_uid('socio_a@test4.com'), 'socio'::public.app_role),
  (tests.get_supabase_uid('socio_b@test4.com'), 'socio'::public.app_role);

insert into public.socio_company_memberships (user_id, company_id) values
  (tests.get_supabase_uid('socio_a@test4.com'), '00000000-0000-0000-0000-00000000000a');

-- TEST 1: socio_a with membership can read folha of Empresa A
select tests.authenticate_as('socio_a@test4.com');
select lives_ok(
  $$select public.read_payroll_total(array['00000000-0000-0000-0000-00000000000a'::uuid])$$,
  'socio@A consegue ler folha da empresa A (com membership)'
);

-- TEST 2: socio_a calling for Empresa B (no membership) → 42501
select throws_ok(
  $$select public.read_payroll_total(array['00000000-0000-0000-0000-00000000000b'::uuid])$$,
  '42501',
  null,
  'socio@A bloqueado de ler folha da empresa B (RLS via visible_companies)'
);

-- TEST 3: socio_a calling for [A, B] (subset check) → 42501
select throws_ok(
  $$select public.read_payroll_total(array['00000000-0000-0000-0000-00000000000a'::uuid, '00000000-0000-0000-0000-00000000000b'::uuid])$$,
  '42501',
  null,
  'socio@A bloqueado de ler folha mista [A, B] — subset check via <@'
);

-- TEST 4: unauthenticated → 42501
select tests.clear_authentication();
select throws_ok(
  $$select public.read_payroll_total(null)$$,
  '42501',
  null,
  'unauth bloqueado de chamar read_payroll_total'
);

select * from finish();
rollback;
