// Fixture for climate_responses table — POST Wave 2 clim1 migration schema
// INV-3-08: user_id column REMOVED for full anonymity (D-09)
// INV-3-09: k-anon threshold = 3; submit via RPC submit_climate_response (no user_id param)
export type ClimateResponseFixture = {
  id: string;
  survey_id: string;
  question_id: string;
  org_unit_id: string | null;
  score: number; // 1..5
  comment: string | null;
  submitted_at: string;
};

export function buildClimateResponse(
  overrides?: Partial<ClimateResponseFixture>,
): ClimateResponseFixture {
  return {
    id: 'resp-0001',
    survey_id: 'survey-0001',
    question_id: 'q-climate-1',
    org_unit_id: 'unit-0001',
    score: 4,
    comment: null,
    submitted_at: new Date().toISOString(),
    ...overrides,
  };
}
