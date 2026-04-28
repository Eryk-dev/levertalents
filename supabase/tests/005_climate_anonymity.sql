-- =========================================================================
-- pgTAP — Phase 3 Wave 0 stub
-- Covers: INV-3-08 (drop user_id), INV-3-09 (k-anon RPC)
-- Implements when: Wave 2 (clim1 + clim2 migrations applied)
-- =========================================================================
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap;
SELECT plan(6);

SELECT skip('Wave 2 — clim1 (drop user_id) + clim2 (k-anon RPC) not yet applied', 6);

-- TODO Wave 2:
-- 1. SELECT hasnt_column('climate_responses', 'user_id'); [INV-3-08]
-- 2. SELECT hasnt_index('climate_responses', 'idx_climate_responses_user_id');
-- 3. INSERT 2 responses, call get_climate_aggregate(survey, unit) → assert returns {insufficient_data: true} sem count [INV-3-09 + Pitfall §3]
-- 4. INSERT 3 responses, call RPC → assert returns {count, avg, distribution}
-- 5. Call submit_climate_response with user_id param → assert RAISE EXCEPTION ou ignored
-- 6. As liderado sem visible_companies(survey): RPC raises 42501

SELECT * FROM finish();
ROLLBACK;
