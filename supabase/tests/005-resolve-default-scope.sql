begin;
select plan(5);

select tests.authenticate_as_service_role();

-- Setup: Grupo Lever + 2 empresas (1 in group, 1 standalone)
insert into public.company_groups (id, slug, name) values
  ('ccccccccc000-0000-0000-0000-cccccccccccc', 'grupo-lever', 'Grupo Lever');
insert into public.companies (id, name, group_id) values
  ('ddddddddd000-0000-0000-0000-aaaaaaaaaaaa', 'Empresa Lever 1', 'ccccccccc000-0000-0000-0000-cccccccccccc'),
  ('ddddddddd000-0000-0000-0000-bbbbbbbbbbbb', 'Empresa Externa', NULL);

-- Create users with different roles
select tests.create_supabase_user('admin_test@test.com');
select tests.create_supabase_user('rh_test@test.com');
select tests.create_supabase_user('socio_test@test.com');
select tests.create_supabase_user('lider_test@test.com');
select tests.create_supabase_user('liderado_test@test.com');

insert into public.user_roles (user_id, role) values
  (tests.get_supabase_uid('admin_test@test.com'), 'admin'::public.app_role),
  (tests.get_supabase_uid('rh_test@test.com'), 'rh'::public.app_role),
  (tests.get_supabase_uid('socio_test@test.com'), 'socio'::public.app_role),
  (tests.get_supabase_uid('lider_test@test.com'), 'lider'::public.app_role),
  (tests.get_supabase_uid('liderado_test@test.com'), 'liderado'::public.app_role);

-- Sócio gets membership to Empresa Externa
insert into public.socio_company_memberships (user_id, company_id) values
  (tests.get_supabase_uid('socio_test@test.com'), 'ddddddddd000-0000-0000-0000-bbbbbbbbbbbb');

-- Líder + Liderado get org_unit (auto-created root for Empresa Lever 1)
-- The backfill in Migration C creates a root org_unit per company, so this row should already exist.
-- For test isolation we insert one explicitly.
insert into public.org_units (id, company_id, parent_id, name)
values ('eeeeeeee-0000-0000-0000-000000000001', 'ddddddddd000-0000-0000-0000-aaaaaaaaaaaa', NULL, 'Lever 1 Root')
on conflict (id) do nothing;

insert into public.unit_leaders (org_unit_id, user_id) values
  ('eeeeeeee-0000-0000-0000-000000000001', tests.get_supabase_uid('lider_test@test.com'));
insert into public.org_unit_members (org_unit_id, user_id, is_primary) values
  ('eeeeeeee-0000-0000-0000-000000000001', tests.get_supabase_uid('liderado_test@test.com'), true);

-- TEST 1: Admin → 'group:grupo-lever-uuid'
select results_eq(
  $$select public.resolve_default_scope(tests.get_supabase_uid('admin_test@test.com'))$$,
  array['group:ccccccccc000-0000-0000-0000-cccccccccccc'::text],
  'admin defaults to Grupo Lever (D-10)'
);

-- TEST 2: RH → 'group:grupo-lever-uuid'
select results_eq(
  $$select public.resolve_default_scope(tests.get_supabase_uid('rh_test@test.com'))$$,
  array['group:ccccccccc000-0000-0000-0000-cccccccccccc'::text],
  'rh defaults to Grupo Lever (D-10)'
);

-- TEST 3: Sócio → 'company:externa-uuid' (their only membership)
select results_eq(
  $$select public.resolve_default_scope(tests.get_supabase_uid('socio_test@test.com'))$$,
  array['company:ddddddddd000-0000-0000-0000-bbbbbbbbbbbb'::text],
  'socio defaults to first membership company (D-10)'
);

-- TEST 4: Líder → 'company:lever-1-uuid'
select results_eq(
  $$select public.resolve_default_scope(tests.get_supabase_uid('lider_test@test.com'))$$,
  array['company:ddddddddd000-0000-0000-0000-aaaaaaaaaaaa'::text],
  'lider defaults to org_unit company (D-10)'
);

-- TEST 5: Liderado → 'company:lever-1-uuid'
select results_eq(
  $$select public.resolve_default_scope(tests.get_supabase_uid('liderado_test@test.com'))$$,
  array['company:ddddddddd000-0000-0000-0000-aaaaaaaaaaaa'::text],
  'liderado defaults to primary org_unit company (D-10)'
);

select * from finish();
rollback;
