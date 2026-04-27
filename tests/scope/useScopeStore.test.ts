import { describe, it, expect, beforeEach } from 'vitest';
import { useScopeStore } from '@/features/tenancy/lib/store';

describe('useScopeStore (Zustand persist)', () => {
  beforeEach(() => {
    localStorage.clear();
    useScopeStore.setState({ scopeToken: null });
  });

  it('starts with null scopeToken', () => {
    expect(useScopeStore.getState().scopeToken).toBeNull();
  });

  it('setScopeToken updates state', () => {
    useScopeStore.getState().setScopeToken('company:abc-123-def-456-aaaa-bbbb-cccc-dddd');
    expect(useScopeStore.getState().scopeToken).toBe('company:abc-123-def-456-aaaa-bbbb-cccc-dddd');
  });

  it('persists to localStorage with key "leverup:scope"', () => {
    useScopeStore.getState().setScopeToken('group:00000000-0000-0000-0000-000000000001');
    const persisted = localStorage.getItem('leverup:scope');
    expect(persisted).not.toBeNull();
    const parsed = JSON.parse(persisted!);
    expect(parsed.state.scopeToken).toBe('group:00000000-0000-0000-0000-000000000001');
  });

  it('persists with version 1 in payload (migration-ready)', () => {
    useScopeStore.getState().setScopeToken('company:00000000-0000-0000-0000-00000000aaaa');
    const persisted = localStorage.getItem('leverup:scope');
    const parsed = JSON.parse(persisted!);
    expect(parsed.version).toBe(1);
  });

  it('setScopeToken(null) clears state', () => {
    useScopeStore.getState().setScopeToken('company:00000000-0000-0000-0000-000000000001');
    useScopeStore.getState().setScopeToken(null);
    expect(useScopeStore.getState().scopeToken).toBeNull();
  });
});
