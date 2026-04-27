begin;
select plan(15);

-- =========================================================================
-- Helper functions exist (will fail in Wave 0; pass after Wave 1 Migration B/C)
-- =========================================================================
select has_function('public', 'visible_companies', array['uuid'],
  'visible_companies(uuid) exists');
select has_function('public', 'visible_org_units', array['uuid'],
  'visible_org_units(uuid) exists');
select has_function('public', 'org_unit_descendants', array['uuid'],
  'org_unit_descendants(uuid) exists');
select has_function('public', 'resolve_default_scope', array['uuid'],
  'resolve_default_scope(uuid) exists');

-- =========================================================================
-- Each helper is STABLE SECURITY DEFINER with search_path=public
-- =========================================================================
select results_eq(
  $$select prosecdef from pg_proc where proname = 'visible_companies' and pronamespace = 'public'::regnamespace$$,
  array[true],
  'visible_companies is SECURITY DEFINER'
);
select results_eq(
  $$select provolatile::text from pg_proc where proname = 'visible_companies' and pronamespace = 'public'::regnamespace$$,
  array['s'::text],
  'visible_companies is STABLE'
);
select results_eq(
  $$select array_to_string(proconfig, ',') from pg_proc where proname = 'visible_companies' and pronamespace = 'public'::regnamespace$$,
  array['search_path=public'::text],
  'visible_companies has search_path=public'
);

select results_eq(
  $$select prosecdef from pg_proc where proname = 'visible_org_units' and pronamespace = 'public'::regnamespace$$,
  array[true],
  'visible_org_units is SECURITY DEFINER'
);
select results_eq(
  $$select provolatile::text from pg_proc where proname = 'visible_org_units' and pronamespace = 'public'::regnamespace$$,
  array['s'::text],
  'visible_org_units is STABLE'
);
select results_eq(
  $$select array_to_string(proconfig, ',') from pg_proc where proname = 'visible_org_units' and pronamespace = 'public'::regnamespace$$,
  array['search_path=public'::text],
  'visible_org_units has search_path=public'
);

select results_eq(
  $$select prosecdef from pg_proc where proname = 'org_unit_descendants' and pronamespace = 'public'::regnamespace$$,
  array[true],
  'org_unit_descendants is SECURITY DEFINER'
);
select results_eq(
  $$select provolatile::text from pg_proc where proname = 'org_unit_descendants' and pronamespace = 'public'::regnamespace$$,
  array['s'::text],
  'org_unit_descendants is STABLE'
);

select results_eq(
  $$select prosecdef from pg_proc where proname = 'resolve_default_scope' and pronamespace = 'public'::regnamespace$$,
  array[true],
  'resolve_default_scope is SECURITY DEFINER'
);
select results_eq(
  $$select provolatile::text from pg_proc where proname = 'resolve_default_scope' and pronamespace = 'public'::regnamespace$$,
  array['s'::text],
  'resolve_default_scope is STABLE'
);

-- =========================================================================
-- All new tenancy tables have RLS enabled (Pitfall 5 in RESEARCH.md)
-- =========================================================================
select results_eq(
  $$select tablename::text from pg_tables t
    join pg_class c on c.relname = t.tablename
    where t.schemaname = 'public'
      and t.tablename in ('company_groups','org_units','org_unit_members','unit_leaders','socio_company_memberships')
      and c.relrowsecurity = false$$,
  array[]::text[],
  'all new tenancy tables (company_groups, org_units, org_unit_members, unit_leaders, socio_company_memberships) have RLS enabled'
);

-- =========================================================================
-- app_role enum has 'liderado' value (RBAC-01)
-- =========================================================================
select results_eq(
  $$select 'liderado' = ANY(enum_range(null::public.app_role)::text[])$$,
  array[true],
  'app_role enum contains "liderado"'
);

select * from finish();
rollback;
