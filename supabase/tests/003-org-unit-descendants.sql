begin;
select plan(4);

select tests.authenticate_as_service_role();

insert into public.companies (id, name) values
  ('11111111-2222-3333-4444-555555555555', 'Empresa Tree Test');

-- Build a 5-node tree: root → mid_a → leaf_a, mid_b → leaf_b
insert into public.org_units (id, company_id, parent_id, name, kind, position) values
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-2222-3333-4444-555555555555', NULL, 'Root', 'empresa', 0),
  ('aaaaaaaa-0000-0000-0000-000000000002', '11111111-2222-3333-4444-555555555555', 'aaaaaaaa-0000-0000-0000-000000000001', 'Mid A', 'departamento', 0),
  ('aaaaaaaa-0000-0000-0000-000000000003', '11111111-2222-3333-4444-555555555555', 'aaaaaaaa-0000-0000-0000-000000000002', 'Leaf A', 'time', 0),
  ('aaaaaaaa-0000-0000-0000-000000000004', '11111111-2222-3333-4444-555555555555', 'aaaaaaaa-0000-0000-0000-000000000001', 'Mid B', 'departamento', 0),
  ('aaaaaaaa-0000-0000-0000-000000000005', '11111111-2222-3333-4444-555555555555', 'aaaaaaaa-0000-0000-0000-000000000004', 'Leaf B', 'time', 0);

-- TEST 1: Descendants of root = all 5 (inclusive of root)
select results_eq(
  $$select array_length(public.org_unit_descendants('aaaaaaaa-0000-0000-0000-000000000001'::uuid), 1)$$,
  array[5],
  'root descendants count = 5 (root + 2 mids + 2 leaves)'
);

-- TEST 2: Descendants of Mid A = 2 (Mid A + Leaf A)
select results_eq(
  $$select array_length(public.org_unit_descendants('aaaaaaaa-0000-0000-0000-000000000002'::uuid), 1)$$,
  array[2],
  'Mid A descendants count = 2 (self + leaf)'
);

-- TEST 3: Descendants of leaf = 1 (just self)
select results_eq(
  $$select array_length(public.org_unit_descendants('aaaaaaaa-0000-0000-0000-000000000003'::uuid), 1)$$,
  array[1],
  'leaf descendants count = 1 (self only)'
);

-- TEST 4: Recursive CTE includes the root (depth 0 row)
select results_eq(
  $$select 'aaaaaaaa-0000-0000-0000-000000000001'::uuid = ANY(public.org_unit_descendants('aaaaaaaa-0000-0000-0000-000000000001'::uuid))$$,
  array[true],
  'descendants array includes the start node itself'
);

select * from finish();
rollback;
