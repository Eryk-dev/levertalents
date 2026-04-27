import { describe, it, expect } from 'vitest';
import {
  formatBR,
  formatBRDate,
  formatBRTime,
  formatBRRelative,
} from '@/lib/formatBR';

describe('formatBR', () => {
  it('formats UTC timestamp in São Paulo timezone (UTC-3)', () => {
    // 2026-04-27T15:00:00Z UTC = 2026-04-27 12:00 in São Paulo (UTC-3)
    expect(formatBR('2026-04-27T15:00:00Z')).toBe('27/04/2026 12:00');
  });

  it('returns empty string for null/undefined/empty', () => {
    expect(formatBR(null)).toBe('');
    expect(formatBR(undefined)).toBe('');
    expect(formatBR('')).toBe('');
  });

  it('formats Date objects', () => {
    expect(formatBR(new Date('2026-01-01T03:00:00Z'))).toBe('01/01/2026 00:00');
  });

  it('accepts a custom format string', () => {
    expect(formatBR('2026-04-27T15:00:00Z', 'yyyy')).toBe('2026');
  });
});

describe('formatBRDate', () => {
  it('returns date only', () => {
    expect(formatBRDate('2026-04-27T15:00:00Z')).toBe('27/04/2026');
  });
});

describe('formatBRTime', () => {
  it('returns time only', () => {
    expect(formatBRTime('2026-04-27T15:00:00Z')).toBe('12:00');
  });
});

describe('formatBRRelative', () => {
  it('returns "agora" for very recent timestamps', () => {
    expect(formatBRRelative(Date.now() - 30_000)).toBe('agora');
  });

  it('returns "há N min" for minute-old timestamps', () => {
    const fiveMinAgo = Date.now() - 5 * 60 * 1000;
    expect(formatBRRelative(fiveMinAgo)).toMatch(/^há \d+ min$/);
  });

  it('returns empty for null', () => {
    expect(formatBRRelative(null)).toBe('');
  });
});
