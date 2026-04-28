-- =========================================================================
-- pgTAP test: Migration F.4 — CPF UNIQUE partial index + normalize trigger
-- Activated by: Plan 02-02 (Wave 1)
-- REQs: TAL-09
-- =========================================================================
begin;
select plan(4);

select tests.authenticate_as_service_role();

-- TEST 1: idx_candidates_cpf_unique rejeita CPF duplicado (mesmo apos normalize)
insert into public.candidates (id, full_name, email, cpf) values
  ('ffffffff-0000-0000-0000-000000000050'::uuid,
   'Cand A F4', 'a+f4@example.com', '12345678901');

prepare duplicate_cpf as
  insert into public.candidates (full_name, email, cpf)
  values ('Cand B F4', 'b+f4@example.com', '123.456.789-01');
select throws_ok(
  'execute duplicate_cpf',
  '23505',  -- unique_violation
  null,
  'UNIQUE rejeita CPF duplicado mesmo com formatacao diferente (apos trigger normalize)'
);

-- TEST 2: Multiplos candidatos com CPF NULL sao permitidos (partial WHERE cpf IS NOT NULL)
insert into public.candidates (full_name, email) values
  ('Cand C F4', 'c+f4@example.com'),
  ('Cand D F4', 'd+f4@example.com');

select lives_ok(
  $$ insert into public.candidates (full_name, email) values ('Cand E F4', 'e+f4@example.com') $$,
  '3 candidatos sem CPF sao permitidos (partial UNIQUE nao conta NULLs)'
);

-- TEST 3: Trigger tg_candidates_normalize_cpf armazena '987.654.321-00' como '98765432100'
insert into public.candidates (id, full_name, email, cpf) values
  ('ffffffff-0000-0000-0000-000000000051'::uuid,
   'Cand Norm F4', 'norm+f4@example.com', '987.654.321-00');
select is(
  (select cpf from public.candidates where id = 'ffffffff-0000-0000-0000-000000000051'::uuid),
  '98765432100',
  'Trigger normaliza CPF removendo pontuacao'
);

-- TEST 4: Trigger rejeita CPF com !=11 digitos (SQLSTATE 23514)
prepare invalid_cpf as
  insert into public.candidates (full_name, email, cpf)
  values ('Bad CPF F4', 'bad+f4@example.com', '12345');
select throws_ok(
  'execute invalid_cpf',
  '23514',
  null,
  'Trigger rejeita CPF com menos de 11 digitos (check_violation)'
);

select * from finish();
rollback;
