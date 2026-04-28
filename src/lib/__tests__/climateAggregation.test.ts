import { describe, it, expect } from 'vitest';
import { aggregateClimateResponses, K_ANONYMITY_THRESHOLD } from '../climateAggregation';

describe('climateAggregation k-anon (D-10) [INV-3-09]', () => {
  it('K_ANONYMITY_THRESHOLD = 3', () => {
    expect(K_ANONYMITY_THRESHOLD).toBe(3);
  });

  it('count<3 returns { insufficient_data: true } WITHOUT count field', () => {
    const result = aggregateClimateResponses([
      { score: 4, org_unit_id: null },
      { score: 5, org_unit_id: null },
    ]);
    expect(result).toEqual({ insufficient_data: true });
    expect('count' in result).toBe(false); // Pitfall §3
  });

  it('count===3 returns { count, avg, distribution }', () => {
    const result = aggregateClimateResponses([
      { score: 4, org_unit_id: null },
      { score: 5, org_unit_id: null },
      { score: 3, org_unit_id: null },
    ]);
    expect('insufficient_data' in result).toBe(false);
    if (!('insufficient_data' in result)) {
      expect(result.count).toBe(3);
      expect(result.avg).toBe(4);
      expect(result.distribution).toMatchObject({ '3': 1, '4': 1, '5': 1 });
    }
  });

  it('count===0 returns insufficient_data', () => {
    const result = aggregateClimateResponses([]);
    expect(result).toEqual({ insufficient_data: true });
  });
});
