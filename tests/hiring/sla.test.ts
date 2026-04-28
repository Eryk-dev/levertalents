import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { computeSlaTone, daysSince, SLA_THRESHOLDS } from '@/lib/hiring/sla';

// Plan 02-03 Wave 1 — pure SLA helpers (D-10).
// Thresholds: 0-1d ok, 2-4d warning (amber), >=5d critical (red).

describe('daysSince', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-27T12:00:00.000Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('0 dias = 0', () => {
    expect(daysSince('2026-04-27T12:00:00.000Z')).toBe(0);
  });
  it('clamp em 0 para data futura', () => {
    expect(daysSince('2026-04-30T12:00:00.000Z')).toBe(0);
  });
  it('aceita Date object', () => {
    expect(daysSince(new Date('2026-04-25T12:00:00.000Z'))).toBe(2);
  });
  it('retorna 0 para null/undefined', () => {
    expect(daysSince(null)).toBe(0);
    expect(daysSince(undefined)).toBe(0);
  });
  it('retorna 0 para string inválida (NaN)', () => {
    expect(daysSince('not-a-date')).toBe(0);
  });
});

describe('computeSlaTone', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-27T12:00:00.000Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('0d retorna ok', () => {
    expect(computeSlaTone('2026-04-27T12:00:00.000Z')).toBe('ok');
  });
  it('1d retorna ok', () => {
    expect(computeSlaTone('2026-04-26T12:00:00.000Z')).toBe('ok');
  });
  it('2d retorna warning (limite inferior amber)', () => {
    expect(computeSlaTone('2026-04-25T12:00:00.000Z')).toBe('warning');
  });
  it('3d retorna warning', () => {
    expect(computeSlaTone('2026-04-24T12:00:00.000Z')).toBe('warning');
  });
  it('4d retorna warning', () => {
    expect(computeSlaTone('2026-04-23T12:00:00.000Z')).toBe('warning');
  });
  it('5d retorna critical (limite inferior red)', () => {
    expect(computeSlaTone('2026-04-22T12:00:00.000Z')).toBe('critical');
  });
  it('10d retorna critical', () => {
    expect(computeSlaTone('2026-04-17T12:00:00.000Z')).toBe('critical');
  });
  it('aceita Date object', () => {
    expect(computeSlaTone(new Date('2026-04-25T12:00:00.000Z'))).toBe('warning');
  });
  it('data futura retorna ok (clamp em 0)', () => {
    expect(computeSlaTone('2026-04-30T12:00:00.000Z')).toBe('ok');
  });
  it('null retorna ok', () => {
    expect(computeSlaTone(null)).toBe('ok');
  });
  it('undefined retorna ok', () => {
    expect(computeSlaTone(undefined)).toBe('ok');
  });
});

describe('SLA_THRESHOLDS', () => {
  it('expõe warning=2 e critical=5 (D-10)', () => {
    expect(SLA_THRESHOLDS.warning).toBe(2);
    expect(SLA_THRESHOLDS.critical).toBe(5);
  });
});
