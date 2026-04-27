-- ========================================================================
-- 002-cross-tenant-leakage.sql — CRITICAL SECURITY GATE
--
-- Mitigates threat T-1-01 (cross-tenant data leakage during retrofit).
-- This test MUST pass on every PR. Failure means RLS is broken and the
-- phase cannot ship.
-- ========================================================================
begin;
select plan(6);

-- Setup: 2 companies, 1 RH per company
select tests.create_supabase_user('rh_a@test.com');
select tests.create_supabase_user('rh_b@test.com');

select tests.authenticate_as_service_role();

-- Create companies
insert into public.companies (id, name) values
  ('00000000-0000-0000-0000-00000000000a', 'Empresa A'),
  ('00000000-0000-0000-0000-00000000000b', 'Empresa B');

-- Grant rh role to both users
insert into public.user_roles (user_id, role) values
  (tests.get_supabase_uid('rh_a@test.com'), 'rh'::public.app_role),
  (tests.get_supabase_uid('rh_b@test.com'), 'rh'::public.app_role);

-- Create 1 job opening per company
insert into public.job_openings (id, company_id, title, status, created_by)
values
  ('11111111-1111-1111-1111-11111111111a', '00000000-0000-0000-0000-00000000000a',
   'Vaga A', 'open', tests.get_supabase_uid('rh_a@test.com')),
  ('22222222-2222-2222-2222-22222222222b', '00000000-0000-0000-0000-00000000000b',
   'Vaga B', 'open', tests.get_supabase_uid('rh_b@test.com'));

-- TEST 1+2: Both RHs see all (because rh role is global per RBAC-03)
select tests.authenticate_as('rh_a@test.com');
select results_eq(
  'select count(*) from public.job_openings',
  array[2::bigint],
  'rh@A sees BOTH openings (RBAC-03: rh has global access)'
);

select tests.authenticate_as('rh_b@test.com');
select results_eq(
  'select count(*) from public.job_openings',
  array[2::bigint],
  'rh@B also sees BOTH (same reason)'
);

-- TEST 3+4: a sócio of A should NOT see B
select tests.authenticate_as_service_role();
select tests.create_supabase_user('socio_a@test.com');
insert into public.user_roles (user_id, role) values
  (tests.get_supabase_uid('socio_a@test.com'), 'socio'::public.app_role);
insert into public.socio_company_memberships (user_id, company_id) values
  (tests.get_supabase_uid('socio_a@test.com'), '00000000-0000-0000-0000-00000000000a');

select tests.authenticate_as('socio_a@test.com');
select results_eq(
  'select count(*) from public.job_openings',
  array[1::bigint],
  'socio@A sees ONLY company A''s openings (not B)'
);
select results_eq(
  $$select count(*) from public.job_openings where company_id = '00000000-0000-0000-0000-00000000000b'$$,
  array[0::bigint],
  'socio@A cannot read company B job_openings (RLS blocks)'
);

-- TEST 5: socio@A blocked from creating in company B (write-side denial)
select throws_ok(
  $$insert into public.job_openings (company_id, title, status, created_by)
    values ('00000000-0000-0000-0000-00000000000b', 'Hacked', 'open', auth.uid())$$,
  '42501',
  'new row violates row-level security policy for table "job_openings"',
  'socio@A blocked from creating opening in company B (42501 RLS denial)'
);

-- TEST 6: unauthenticated user sees zero rows (default-deny)
select tests.clear_authentication();
select results_eq(
  'select count(*) from public.job_openings',
  array[0::bigint],
  'unauthenticated user sees zero rows'
);

select * from finish();
rollback;
