begin;
select plan(3);

select tests.authenticate_as_service_role();

insert into public.companies (id, name) values
  ('22222222-3333-4444-5555-666666666666', 'Empresa Cycle Test');

-- Build a 3-node chain: A → B → C (A is root, C is leaf)
insert into public.org_units (id, company_id, parent_id, name) values
  ('bbbbbbbb-0000-0000-0000-000000000001', '22222222-3333-4444-5555-666666666666', NULL, 'A'),
  ('bbbbbbbb-0000-0000-0000-000000000002', '22222222-3333-4444-5555-666666666666', 'bbbbbbbb-0000-0000-0000-000000000001', 'B'),
  ('bbbbbbbb-0000-0000-0000-000000000003', '22222222-3333-4444-5555-666666666666', 'bbbbbbbb-0000-0000-0000-000000000002', 'C');

-- TEST 1: Self-parent rejected by CHECK constraint
select throws_ok(
  $$update public.org_units set parent_id = 'bbbbbbbb-0000-0000-0000-000000000002'::uuid
    where id = 'bbbbbbbb-0000-0000-0000-000000000002'::uuid$$,
  NULL,
  NULL,
  'self-parent rejected (CHECK no_self_parent or anti-cycle trigger)'
);

-- TEST 2: Direct cycle (A → C → B → A) rejected
select throws_ok(
  $$update public.org_units set parent_id = 'bbbbbbbb-0000-0000-0000-000000000003'::uuid
    where id = 'bbbbbbbb-0000-0000-0000-000000000001'::uuid$$,
  'P0001',
  NULL,
  'cycle (A→C creates A→C→B→A loop) rejected with cycle error'
);

-- TEST 3: Valid re-parent (B's parent changes from A to NULL — make B a new root) works
select lives_ok(
  $$update public.org_units set parent_id = NULL
    where id = 'bbbbbbbb-0000-0000-0000-000000000002'::uuid$$,
  'valid re-parent (set to NULL) succeeds'
);

select * from finish();
rollback;
