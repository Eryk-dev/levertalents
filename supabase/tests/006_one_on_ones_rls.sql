-- =========================================================================
-- pgTAP — Phase 3 Wave 0 stub
-- Covers: INV-3-14 (rh_notes RLS — separate table)
-- Implements when: Wave 2 (one1 migration applied)
-- =========================================================================
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap;
SELECT plan(5);

SELECT skip('Wave 2 — one1 migration (one_on_one_rh_notes table) not yet applied', 5);

-- TODO Wave 2:
-- 1. SELECT has_table('one_on_one_rh_notes'); [Pitfall §5 decision A3]
-- 2. As liderado: SELECT * FROM one_on_one_rh_notes returns 0 rows [INV-3-14]
-- 3. As admin: SELECT count > 0 (after RH inserts row)
-- 4. SELECT has_column('one_on_ones', 'company_id') AND col_not_null('one_on_ones', 'company_id');
-- 5. INSERT one_on_one with meeting_structure containing transcricao_plaud + resumo_plaud → SELECT preserves keys

SELECT * FROM finish();
ROLLBACK;
