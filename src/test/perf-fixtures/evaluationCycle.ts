import { buildTemplateSnapshot, type TemplateSnapshot } from './templateSnapshot';

// Fixture for evaluation_cycles table (Wave 2 perf1 migration creates this table)
// INV-3-01: cycles are scoped per company; INV-3-05: template_snapshot is immutable after creation
export type EvaluationCycleFixture = {
  id: string;
  company_id: string;
  template_id: string;
  template_snapshot: TemplateSnapshot;
  name: string;
  starts_at: string;
  ends_at: string;
  status: 'active' | 'closed';
};

export function buildEvaluationCycle(
  overrides?: Partial<EvaluationCycleFixture>,
): EvaluationCycleFixture {
  const now = Date.now();
  return {
    id: 'cycle-0001',
    company_id: 'company-0001',
    template_id: 'tmpl-0001',
    template_snapshot: buildTemplateSnapshot(),
    name: 'Q1 2026',
    starts_at: new Date(now - 7 * 24 * 3600 * 1000).toISOString(),
    ends_at: new Date(now + 30 * 24 * 3600 * 1000).toISOString(),
    status: 'active',
    ...overrides,
  };
}
