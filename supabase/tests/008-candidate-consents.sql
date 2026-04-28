-- =========================================================================
-- pgTAP test: Migration F.3 — candidate_consents table + view active_
-- Activated by: Plan 02-02 (Wave 1)
-- REQs: TAL-03, TAL-04, TAL-06, TAL-08
-- =========================================================================
begin;
select plan(4);

select tests.authenticate_as_service_role();

insert into public.candidates (id, full_name, email) values
  ('ffffffff-0000-0000-0000-000000000030', 'Cand C1', 'c1+f3@example.com')
  on conflict (id) do nothing;

-- TEST 1: Constraint consents_revoked_after_granted bloqueia revoked_at < granted_at
prepare invalid_revoke as
  insert into public.candidate_consents (candidate_id, purpose, granted_at, revoked_at)
  values (
    'ffffffff-0000-0000-0000-000000000030'::uuid,
    'incluir_no_banco_de_talentos_global',
    now(),
    now() - interval '1 day'
  );
select throws_ok(
  'execute invalid_revoke',
  '23514',
  null,
  'CHECK consents_revoked_after_granted bloqueia revoked_at < granted_at'
);

-- TEST 2: EXCLUDE constraint bloqueia 2 consents ATIVOS para (candidate, purpose)
insert into public.candidate_consents (id, candidate_id, purpose) values
  ('ffffffff-0000-0000-0000-000000000040'::uuid,
   'ffffffff-0000-0000-0000-000000000030'::uuid,
   'incluir_no_banco_de_talentos_global');

prepare duplicate_active as
  insert into public.candidate_consents (candidate_id, purpose) values
    ('ffffffff-0000-0000-0000-000000000030'::uuid,
     'incluir_no_banco_de_talentos_global');
select throws_ok(
  'execute duplicate_active',
  '23P01',  -- exclusion_violation
  null,
  'EXCLUDE bloqueia 2 consents ativos para (candidate, purpose)'
);

-- TEST 3: View active_candidate_consents EXCLUI revogados
update public.candidate_consents set revoked_at = now()
  where id = 'ffffffff-0000-0000-0000-000000000040'::uuid;

insert into public.candidate_consents (id, candidate_id, purpose, revoked_at) values
  ('ffffffff-0000-0000-0000-000000000041'::uuid,
   'ffffffff-0000-0000-0000-000000000030'::uuid,
   'manter_cv_pos_recusa',
   now());

select is(
  (select count(*)::bigint from public.active_candidate_consents
    where candidate_id = 'ffffffff-0000-0000-0000-000000000030'::uuid),
  0::bigint,
  'View active exclui consents com revoked_at IS NOT NULL'
);

-- TEST 4: Re-grant apos revoke e permitido (EXCLUDE so conta revoked_at IS NULL)
select lives_ok(
  $$ insert into public.candidate_consents (candidate_id, purpose) values
       ('ffffffff-0000-0000-0000-000000000030'::uuid,
        'incluir_no_banco_de_talentos_global') $$,
  'Re-grant apos revoke e permitido (EXCLUDE so conta revoked_at IS NULL)'
);

select * from finish();
rollback;
