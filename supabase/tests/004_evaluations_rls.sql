-- =========================================================================
-- pgTAP — Phase 3 Wave 0 stub
-- Covers: INV-3-02 (direction CHECK), INV-3-03 (liderado RLS), INV-3-04 (líder via descendants), INV-3-07 (legacy cols dropped)
-- Implements when: Wave 2 (perf1 + perf2 migrations applied)
-- =========================================================================
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap;
SELECT plan(8);

SELECT skip('Wave 2 — evaluations rewrite (perf2) not yet applied', 8);

-- TODO Wave 2:
-- 1. SELECT has_column('evaluations', 'cycle_id');
-- 2. SELECT has_column('evaluations', 'direction');
-- 3. SELECT col_check('evaluations', 'direction', $$direction IN ('leader_to_member', 'member_to_leader')$$); [INV-3-02]
-- 4. SELECT hasnt_column('evaluations', 'period');  -- legacy dropped [INV-3-07]
-- 5. SELECT hasnt_column('evaluations', 'overall_score');  -- legacy dropped [INV-3-07]
-- 6. As liderado X: SELECT * FROM evaluations returns ONLY rows where evaluated_user_id=X or evaluator_user_id=X [INV-3-03]
-- 7. As líder L com unit U: SELECT * FROM evaluations returns rows of users in org_unit_descendants(U) [INV-3-04]
-- 8. As RH: SELECT count returns ALL evaluations of visible_companies

SELECT * FROM finish();
ROLLBACK;
