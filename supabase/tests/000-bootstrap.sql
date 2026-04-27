begin;
select plan(2);

-- Verify pgTAP is installed (Supabase ships it; just check)
select has_extension('pgtap', 'pgTAP extension is available');

-- Verify the basejump-supabase_test_helpers schema is installed.
-- Per docs (https://github.com/usebasejump/supabase-test-helpers):
--   This is installed via dbdev, but Supabase test runner installs it
--   automatically when you place tests under supabase/tests/.
select has_schema('tests', 'tests schema (basejump-supabase_test_helpers) is available');

select * from finish();
rollback;
