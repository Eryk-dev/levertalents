-- =========================================================================
-- pgTAP test: Migration F.4 — CPF UNIQUE partial index + normalize trigger
-- Status: PENDING (skip habilitado até Plan 02-02 aplicar a migration)
-- REQs: TAL-09
-- =========================================================================
begin;
select plan(4);

-- Skipped até Plan 02-02 (Migration F.4) implementar:
select skip(4, 'pending Migration F.4 apply by Plan 02-02');

-- TODO Plan 02-02: remover linha de skip acima e ativar os testes abaixo.
--
-- Setup esperado:
--   select tests.authenticate_as_service_role();
--
-- TEST 1: idx_candidates_cpf_unique rejeita CPF duplicado (mesmo após normalize)
--   insert into public.candidates (full_name, email, cpf)
--     values ('Candidato A', 'a@example.com', '123.456.789-00');
--   prepare dup_cpf as
--     insert into public.candidates (full_name, email, cpf)
--     values ('Candidato B', 'b@example.com', '12345678900');
--   select throws_ok(
--     'execute dup_cpf',
--     '23505',  -- unique_violation
--     null,
--     'UNIQUE rejeita CPF duplicado mesmo com formatação diferente (após normalize)'
--   );
--
-- TEST 2: Múltiplos candidatos com cpf NULL são permitidos
--   (partial index WHERE cpf IS NOT NULL)
--   insert into public.candidates (full_name, email, cpf) values
--     ('Sem CPF 1', 'sem1@example.com', null),
--     ('Sem CPF 2', 'sem2@example.com', null);
--   select lives_ok(
--     $$insert into public.candidates (full_name, email, cpf)
--       values ('Sem CPF 3', 'sem3@example.com', null)$$,
--     'Múltiplos NULL permitidos (partial index)'
--   );
--
-- TEST 3: tg_normalize_candidate_cpf armazena '987.654.321-00' como '98765432100'
--   insert into public.candidates (full_name, email, cpf)
--     values ('Candidato Normalize', 'norm@example.com', '987.654.321-00');
--   select is(
--     (select cpf from public.candidates where email = 'norm@example.com'),
--     '98765432100',
--     'Trigger normaliza CPF removendo pontuação'
--   );
--
-- TEST 4: tg_normalize_candidate_cpf rejeita CPF != 11 dígitos
--   prepare bad_cpf as
--     insert into public.candidates (full_name, email, cpf)
--     values ('Bad CPF', 'bad@example.com', '12345');
--   select throws_ok(
--     'execute bad_cpf',
--     null,        -- qualquer SQLSTATE (raise exception)
--     null,
--     'Trigger rejeita CPF != 11 dígitos'
--   );

select * from finish();
rollback;
