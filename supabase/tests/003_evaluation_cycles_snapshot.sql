-- =========================================================================
-- pgTAP — Phase 3 Wave 0 stub
-- Covers: INV-3-01 (cycles refilter), INV-3-05 (snapshot immutable), INV-3-23 (cron auto-close)
-- Implements when: Wave 2 (perf1 + cron1 migrations applied)
-- =========================================================================
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap;
SELECT plan(8);

SELECT skip('Wave 2 — evaluation_cycles + perf1 trigger + cron1 not yet applied', 8);

-- TODO Wave 2: Replace skip() with these 8 tests
-- 1. SELECT has_table('evaluation_cycles');
-- 2. SELECT has_table('evaluation_templates');
-- 3. SELECT col_not_null('evaluation_cycles', 'company_id');
-- 4. SELECT col_not_null('evaluation_cycles', 'template_snapshot');
-- 5. INSERT cycle + UPDATE template.schema_json + assert cycle.template_snapshot UNCHANGED [INV-3-05]
-- 6. UPDATE cycle.template_snapshot directly + assert RAISE EXCEPTION (immutable trigger)
-- 7. SELECT cron.job WHERE jobname = 'evaluation_cycles_auto_close' [INV-3-23]
-- 8. UPDATE cycle SET ends_at = NOW() - '1 hour'::interval, run cron logic manually, assert status = 'closed'

SELECT * FROM finish();
ROLLBACK;
