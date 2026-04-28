import { describe, it } from 'vitest';

// Wave 3 will implement src/lib/climateAggregation.ts (TS mirror of RPC for unit tests).
// This file is a Wave 0 stub — failing-by-default until then.
// TODO Wave 3: remover describe.skip e implementar src/lib/climateAggregation.ts
describe.skip('climateAggregation k-anon (Wave 3)', () => {
  it.todo(
    'count<3 returns { insufficient_data: true } WITHOUT count field [INV-3-09 + Pitfall §3]',
  );
  it.todo('count===3 returns { count, avg: numeric, distribution: Record<score, count> }');
  it.todo(
    'does NOT auto-aggregate to parent org_unit when child has <3 (Open Question §4 default)',
  );
  it.todo(
    'refuses to compute when caller lacks visible_companies(survey.company_id) — security guard',
  );
});
