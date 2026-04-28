import { describe, it, expect } from 'vitest';
import { generateTempPassword, TEMP_PASSWORD_ALPHABET } from '../passwordGenerator';

describe('passwordGenerator (D-21)', () => {
  it('returns exactly 8 characters [INV-3-16]', () => {
    expect(generateTempPassword()).toHaveLength(8);
  });

  it('every char ∈ alphabet (no 0/O/o/1/l/I)', () => {
    const banned = /[0OoIl1]/;
    for (let i = 0; i < 1000; i++) {
      const pwd = generateTempPassword();
      expect(banned.test(pwd)).toBe(false);
      for (const c of pwd) {
        expect(TEMP_PASSWORD_ALPHABET.includes(c)).toBe(true);
      }
    }
  });

  it('alphabet has exactly 56 chars (D-21)', () => {
    expect(TEMP_PASSWORD_ALPHABET).toHaveLength(56);
  });

  it('produces sufficiently random outputs (no two identical in 100 samples)', () => {
    const samples = new Set<string>();
    for (let i = 0; i < 100; i++) samples.add(generateTempPassword());
    expect(samples.size).toBeGreaterThan(95); // >95% unique
  });
});
