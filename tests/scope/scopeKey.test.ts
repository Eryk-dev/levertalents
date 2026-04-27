import { describe, it, expect } from 'vitest';
import { parseScopeToken, serializeScope } from '@/features/tenancy/lib/scopeKey';

describe('parseScopeToken', () => {
  it('parses valid company tokens', () => {
    expect(parseScopeToken('company:abc-123-def-456-aaaa-bbbb-cccc-dddd')).toEqual({
      kind: 'company',
      id: 'abc-123-def-456-aaaa-bbbb-cccc-dddd',
    });
  });
  it('parses valid group tokens', () => {
    expect(parseScopeToken('group:00000000-0000-0000-0000-000000000001')).toEqual({
      kind: 'group',
      id: '00000000-0000-0000-0000-000000000001',
    });
  });
  it('returns null for null/undefined/empty', () => {
    expect(parseScopeToken(null)).toBeNull();
    expect(parseScopeToken(undefined)).toBeNull();
    expect(parseScopeToken('')).toBeNull();
  });
  it('returns null for malformed kind', () => {
    expect(parseScopeToken('user:00000000-0000-0000-0000-000000000001')).toBeNull();
    expect(parseScopeToken('admin:abc')).toBeNull();
  });
  it('returns null for missing id', () => {
    expect(parseScopeToken('company:')).toBeNull();
    expect(parseScopeToken('group:')).toBeNull();
  });
  it('returns null for missing colon', () => {
    expect(parseScopeToken('companyabc')).toBeNull();
  });
  it('returns null for non-uuid-looking id', () => {
    expect(parseScopeToken('company:short')).toBeNull();
  });
});

describe('serializeScope', () => {
  it('serializes company scope', () => {
    expect(serializeScope({ kind: 'company', id: 'abc-123-def-456-aaaa-bbbb-cccc-dddd' }))
      .toBe('company:abc-123-def-456-aaaa-bbbb-cccc-dddd');
  });
  it('serializes group scope', () => {
    expect(serializeScope({ kind: 'group', id: 'xyz-456-aaaa-bbbb-cccc-dddd-eeee-ffff' }))
      .toBe('group:xyz-456-aaaa-bbbb-cccc-dddd-eeee-ffff');
  });
  it('roundtrips through parse', () => {
    const token = 'company:00000000-0000-0000-0000-000000000123';
    const parsed = parseScopeToken(token);
    expect(parsed).not.toBeNull();
    expect(serializeScope(parsed!)).toBe(token);
  });
});
