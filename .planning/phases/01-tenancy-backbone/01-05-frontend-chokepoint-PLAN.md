---
phase: 1
plan: 05
type: execute
wave: 2
depends_on: [01, 04]
files_modified:
  - src/features/tenancy/types.ts
  - src/features/tenancy/lib/scopeKey.ts
  - src/features/tenancy/lib/store.ts
  - src/features/tenancy/lib/abilities.ts
  - src/features/tenancy/lib/abilityContext.ts
  - src/features/tenancy/lib/resolveDefaultScope.ts
  - src/features/tenancy/hooks/useVisibleScopes.ts
  - src/features/tenancy/hooks/useDirtyForms.ts
  - src/features/tenancy/hooks/useScopeBroadcast.ts
  - src/app/providers/ScopeProvider.tsx
  - src/app/providers/AbilityProvider.tsx
  - src/app/providers/index.tsx
  - src/shared/data/useScopedQuery.ts
  - src/shared/data/useScopedRealtime.ts
  - src/App.tsx
  - tests/scope/scopeKey.test.ts
  - tests/scope/useScopeStore.test.ts
  - tests/scope/useScopedQuery.test.tsx
  - tests/scope/ScopeProvider.fallback.test.tsx
  - tests/scope/abilities.test.ts
autonomous: true
requirements: [TEN-05, TEN-06, TEN-07, TEN-08, TEN-09, TEN-10, RBAC-08, RBAC-01, RBAC-02, RBAC-03, RBAC-04, RBAC-05, RBAC-06]
---

# Plan 05: Frontend Chokepoint — ScopeProvider + Zustand Store + URL Sync + useScopedQuery + CASL Abilities

<objective>
Implement Migration D (the frontend "migration"): the `ScopeProvider` Context (URL > Zustand persist > server RPC default precedence), Zustand persisted store (`leverup:scope`), `parseScopeToken`/`serializeScope` URL utilities, the `useScopedQuery` chokepoint hook (`['scope', scope.id, scope.kind, ...]` queryKey prefix), `useScopedRealtime` foundation, the CASL `defineAppAbility` for 5 roles, the `AbilityProvider`, and BroadcastChannel cross-tab sync. Mount providers in `App.tsx` INSIDE `<BrowserRouter>` (Pitfall 1) AFTER auth resolves. Ship 5 vitest test files exercising the chokepoint, store, URL parsing, fallback, and abilities.

This plan is the centerpiece of Phase 1 — every screen in the app eventually queries data through `useScopedQuery`; this plan installs the conduit.
</objective>

<requirements_addressed>
- **TEN-05**: ScopeProvider exposes `visibleCompanies` + `visibleGroups` to drive the header dropdown (Plan 06 consumes).
- **TEN-06**: `useScopedQuery` chokepoint guarantees every key starts with `['scope', scope.id, scope.kind, ...]` — switching scope makes new keys, old keys' caches stay (D-04 cache preservation = "voltar é instantâneo").
- **TEN-07**: ScopeProvider's `resolveScope` expands `group` kind into `companyIds[]` so consumers receive the union of empresas-membro.
- **TEN-08**: Zustand persist with `name: 'leverup:scope'` writes to localStorage; reabrir aba volta no mesmo escopo.
- **TEN-09**: URL `?scope=company:UUID` / `?scope=group:UUID` is the canonical source — `useSearchParams` from react-router v6.
- **TEN-10**: TanStack Query partial-key invalidation default (`exact: false`) preserves old scope cache; `useScopedQuery` + `invalidateQueries({ queryKey: ['scope', scope.id] })` matches all keys for current scope.
- **RBAC-08**: CASL `defineAppAbility` for 5 roles; `AbilityProvider` rebuilds on scope/role change; consumed via `<Can>` and `useAbility()` (Plan 06 wires UI surfaces).
- **RBAC-01..06**: Implicit through `defineAppAbility` (5 role branches mapping to capabilities).
</requirements_addressed>

<threat_model>
- **T-1-03 (MEDIUM) — Cache pollution on scope switch:** `useScopedQuery` is the chokepoint — every key starts with `['scope', scope.id, scope.kind, ...]`. Switching scope produces a new prefix; old cache stays in `gcTime`. Plan 07's ESLint rule blocks raw `supabase.from()` outside hooks, so consumers can't smuggle scope-less queries.
- **T-1-06 (LOW) — URL scope tampering:** `ScopeProvider` validates URL token against the user's `visibleCompanies` ∪ `visibleGroups` (sourced via authenticated Supabase queries — RLS pre-filters). On mismatch, fallback to default + neutral toast (D-08).
- **T-1-08 (LOW) — Stale Zustand persist after role change:** Same flow as T-1-06 — persisted token validated against current visible scopes; if user no longer has access, fallback path triggers.
- **T-1-04 (MEDIUM) — PII in logs:** `ScopeProvider` does not log user emails/names; only ids. The toast message renders the resolved scope NAME (e.g., "Grupo Lever") — not the UUID — which is acceptable since names are not PII (UI-SPEC.md confirms).
</threat_model>

<tasks>

<task id="05-01">
<action>
Create the type definitions and pure URL utility module. These are the contracts the rest of the plan builds against.

**File 1: `src/features/tenancy/types.ts`**

```typescript
/**
 * Scope = the active tenancy filter selected in the header dropdown.
 * Either a single company or a group of companies. companyIds is the
 * expanded array fed to `.in('company_id', companyIds)` queries.
 */
export type ScopeKind = 'company' | 'group';

export type Scope =
  | { kind: 'company'; id: string; companyIds: [string]; name: string }
  | { kind: 'group';   id: string; companyIds: string[];  name: string };

export interface VisibleCompanySummary {
  id: string;
  name: string;
}

export interface VisibleGroupSummary {
  id: string;
  name: string;
  companyIds: string[];
}
```

**File 2: `src/features/tenancy/lib/scopeKey.ts`**

```typescript
import type { Scope, ScopeKind } from '@/features/tenancy/types';

/**
 * Parse a scope token like "company:UUID" or "group:UUID" from the URL.
 * Returns null on any format violation. Pure — no React imports.
 */
export function parseScopeToken(
  token: string | null | undefined,
): { kind: ScopeKind; id: string } | null {
  if (!token) return null;
  const idx = token.indexOf(':');
  if (idx <= 0) return null;
  const kind = token.slice(0, idx);
  const id = token.slice(idx + 1);
  if ((kind !== 'company' && kind !== 'group') || !id) return null;
  // Loose UUID shape check (matches Supabase uuid format with hyphens; we
  // don't enforce strict v4 because internal/test uuids may differ).
  if (!/^[0-9a-fA-F-]{8,}$/.test(id)) return null;
  return { kind, id };
}

/**
 * Serialize a scope back to "kind:id" form for URL/localStorage.
 */
export function serializeScope(scope: Pick<Scope, 'kind' | 'id'>): string {
  return `${scope.kind}:${scope.id}`;
}
```

**File 3: Wave-0 test `tests/scope/scopeKey.test.ts`**

```typescript
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
```

Run `npm test -- --run tests/scope/scopeKey.test.ts` — must report 10 passing assertions.
</action>
<read_first>
- `src/lib/supabaseError.ts` — existing pure utility module style (analog from PATTERNS.md).
- `.planning/phases/01-tenancy-backbone/01-RESEARCH.md` lines 591-606 — `parseScopeToken` and `serializeScope` reference impl.
- `.planning/phases/01-tenancy-backbone/01-PATTERNS.md` lines 460-507 — pure-function module convention.
- Verify `src/features/` is empty (`ls src/features 2>/dev/null`) — Plan 05 establishes `src/features/tenancy/`.
</read_first>
<acceptance_criteria>
- File `src/features/tenancy/types.ts` exists exporting `ScopeKind`, `Scope`, `VisibleCompanySummary`, `VisibleGroupSummary`.
- File `src/features/tenancy/lib/scopeKey.ts` exports `parseScopeToken` and `serializeScope`.
- File `tests/scope/scopeKey.test.ts` exists.
- `npm test -- --run tests/scope/scopeKey.test.ts` exits 0 with 10+ tests passing.
- `npx tsc --noEmit -p tsconfig.app.json` exits 0.
</acceptance_criteria>
<files>
- `src/features/tenancy/types.ts`
- `src/features/tenancy/lib/scopeKey.ts`
- `tests/scope/scopeKey.test.ts`
</files>
<automated>
test -f src/features/tenancy/types.ts && test -f src/features/tenancy/lib/scopeKey.ts && test -f tests/scope/scopeKey.test.ts && npm test -- --run tests/scope/scopeKey.test.ts
</automated>
</task>

<task id="05-02">
<action>
Create the Zustand store + the `resolveDefaultScope` RPC client + the `useVisibleScopes` hook (which fetches `companies` and `company_groups` via Supabase).

**File 1: `src/features/tenancy/lib/store.ts`**

```typescript
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * Zustand persisted store for the active scope token.
 * Namespace 'leverup:scope' is intentionally distinct from existing
 * 'lt:*' keys (used by useAuth) and Supabase auth UUID-prefixed keys.
 * TEN-08.
 */
interface ScopeStoreState {
  scopeToken: string | null;
  setScopeToken: (t: string | null) => void;
}

export const useScopeStore = create<ScopeStoreState>()(
  persist(
    (set) => ({
      scopeToken: null,
      setScopeToken: (scopeToken) => set({ scopeToken }),
    }),
    {
      name: 'leverup:scope',
      storage: createJSONStorage(() => localStorage),
      version: 1,
      partialize: (state) => ({ scopeToken: state.scopeToken }),
    },
  ),
);
```

**File 2: `src/features/tenancy/lib/resolveDefaultScope.ts`**

```typescript
import { supabase } from '@/integrations/supabase/client';
import { parseScopeToken } from './scopeKey';
import type { ScopeKind } from '@/features/tenancy/types';

/**
 * Calls the public.resolve_default_scope(uid) RPC. Returns the parsed
 * scope hint or null if the user has no default (e.g., sócio sem
 * empresa atribuída — D-09 empty state).
 */
export async function fetchDefaultScope(
  uid: string,
): Promise<{ kind: ScopeKind; id: string } | null> {
  const { data, error } = await supabase.rpc('resolve_default_scope', { _uid: uid });
  if (error) {
    // Don't crash the app on RPC failure — return null and let provider
    // surface the empty state. PII discipline: do not log uid.
    return null;
  }
  return parseScopeToken(typeof data === 'string' ? data : null);
}
```

**File 3: `src/features/tenancy/hooks/useVisibleScopes.ts`**

```typescript
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import type {
  VisibleCompanySummary,
  VisibleGroupSummary,
} from '@/features/tenancy/types';

/**
 * Fetches the empresas and grupos the current user can see (RLS-filtered
 * server-side via visible_companies). Returns lists for the dropdown panel
 * and for resolveScope() validation.
 *
 * Note: this hook lives in src/features/tenancy/hooks/ which is on the
 * QUAL-07 ESLint allowlist for direct supabase.from() calls. Plan 07's
 * ESLint rule allows hooks/ paths.
 */
export function useVisibleScopes() {
  const { user, loading: authLoading } = useAuth();
  const [companies, setCompanies] = useState<VisibleCompanySummary[]>([]);
  const [groups, setGroups] = useState<VisibleGroupSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (authLoading || !user?.id) {
      setIsLoading(true);
      return;
    }
    let aborted = false;
    setIsLoading(true);
    setError(null);

    (async () => {
      try {
        const [cRes, gRes] = await Promise.all([
          supabase
            .from('companies')
            .select('id, name')
            .order('name', { ascending: true }),
          supabase
            .from('company_groups')
            .select('id, name, slug, companies:companies(id)')
            .order('name', { ascending: true }),
        ]);
        if (cRes.error) throw cRes.error;
        if (gRes.error) throw gRes.error;
        if (aborted) return;

        setCompanies(
          (cRes.data ?? []).map((c) => ({ id: c.id, name: c.name })),
        );
        setGroups(
          (gRes.data ?? []).map((g) => ({
            id: g.id,
            name: g.name,
            companyIds: (g.companies ?? []).map(
              (c: { id: string }) => c.id,
            ),
          })),
        );
      } catch (err) {
        if (!aborted) setError(err as Error);
      } finally {
        if (!aborted) setIsLoading(false);
      }
    })();

    return () => {
      aborted = true;
    };
  }, [user?.id, authLoading]);

  return { companies, groups, isLoading, error };
}
```

**File 4: Wave-0 test `tests/scope/useScopeStore.test.ts`**

```typescript
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
```

Run `npm test -- --run tests/scope/useScopeStore.test.ts` — must pass.
</action>
<read_first>
- `src/hooks/useAuth.ts` — confirm `loading` state name and `user` shape.
- `src/integrations/supabase/client.ts` — confirm exported `supabase` singleton name.
- `.planning/phases/01-tenancy-backbone/01-RESEARCH.md` lines 622-650 — Zustand store reference.
- `.planning/phases/01-tenancy-backbone/01-PATTERNS.md` lines 429-456 — Zustand persist precedent.
</read_first>
<acceptance_criteria>
- File `src/features/tenancy/lib/store.ts` exists exporting `useScopeStore` Zustand store with `name: 'leverup:scope'`, `version: 1`, `partialize` for scopeToken only.
- File `src/features/tenancy/lib/resolveDefaultScope.ts` exists exporting `fetchDefaultScope` function.
- File `src/features/tenancy/hooks/useVisibleScopes.ts` exists exporting `useVisibleScopes` hook.
- `useVisibleScopes` calls `supabase.from('companies').select(...)` and `supabase.from('company_groups').select(...)`.
- File `tests/scope/useScopeStore.test.ts` exists.
- `npm test -- --run tests/scope/useScopeStore.test.ts` exits 0 with 5+ assertions passing.
- `npx tsc --noEmit -p tsconfig.app.json` exits 0.
</acceptance_criteria>
<files>
- `src/features/tenancy/lib/store.ts`
- `src/features/tenancy/lib/resolveDefaultScope.ts`
- `src/features/tenancy/hooks/useVisibleScopes.ts`
- `tests/scope/useScopeStore.test.ts`
</files>
<automated>
test -f src/features/tenancy/lib/store.ts && grep -q "name: 'leverup:scope'" src/features/tenancy/lib/store.ts && grep -q "version: 1" src/features/tenancy/lib/store.ts && test -f src/features/tenancy/lib/resolveDefaultScope.ts && test -f src/features/tenancy/hooks/useVisibleScopes.ts && npm test -- --run tests/scope/useScopeStore.test.ts && npx tsc --noEmit -p tsconfig.app.json
</automated>
</task>

<task id="05-03">
<action>
Create the BroadcastChannel cross-tab sync hook + the dirty-form registry hook.

**File 1: `src/features/tenancy/hooks/useScopeBroadcast.ts`**

```typescript
import { useEffect, useRef } from 'react';

const CHANNEL_NAME = 'leverup:scope';
const STORAGE_KEY = 'leverup:scope';

/**
 * Cross-tab scope sync. Uses BroadcastChannel where available, falls back
 * to the storage event for older browsers (Safari < 15.4 — RESEARCH.md
 * Common Pitfalls #3).
 *
 * `onChange` receives the raw token string from the other tab (e.g.,
 * "company:UUID"). The caller is responsible for parsing + validating.
 *
 * Returns a `broadcast` function the caller invokes after a local scope
 * change to notify other tabs.
 */
export function useScopeBroadcast(onChange: (token: string) => void) {
  const onChangeRef = useRef(onChange);
  // Keep the latest callback without re-binding listeners
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let channel: BroadcastChannel | null = null;
    const broadcastSupported = 'BroadcastChannel' in window;

    if (broadcastSupported) {
      channel = new BroadcastChannel(CHANNEL_NAME);
      const handleMessage = (e: MessageEvent) => {
        if (typeof e.data === 'string') onChangeRef.current(e.data);
      };
      channel.addEventListener('message', handleMessage);

      return () => {
        channel?.removeEventListener('message', handleMessage);
        channel?.close();
      };
    }

    // Fallback: storage event (fires across tabs but not within same tab)
    const handleStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY || !e.newValue) return;
      try {
        const parsed = JSON.parse(e.newValue);
        const token = parsed?.state?.scopeToken;
        if (typeof token === 'string') onChangeRef.current(token);
      } catch {
        // ignore parse errors
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  function broadcast(token: string) {
    if (typeof window === 'undefined') return;
    if ('BroadcastChannel' in window) {
      const ch = new BroadcastChannel(CHANNEL_NAME);
      ch.postMessage(token);
      ch.close();
    }
    // The storage event fires automatically when Zustand persists, so we
    // don't need to manually re-write localStorage here. The caller's
    // setPersistedToken() in the store handles that path.
  }

  return { broadcast };
}
```

**File 2: `src/features/tenancy/hooks/useDirtyForms.ts`**

```typescript
import { create } from 'zustand';

/**
 * Global registry of currently-dirty react-hook-form instances.
 * Each form opts in by calling `register(formId)` when its
 * `formState.isDirty` becomes true, and `unregister(formId)` on
 * successful save or unmount. ScopeProvider's setScope consults
 * `hasAnyDirty()` to decide whether to open the confirmation dialog
 * (D-05).
 *
 * RESEARCH.md Common Pitfalls #7: forms must call form.reset(values)
 * after a successful submit to clear isDirty — otherwise this
 * registry stays "dirty" forever.
 */
interface DirtyFormsState {
  dirtyForms: Set<string>;
  register: (id: string) => void;
  unregister: (id: string) => void;
  hasAnyDirty: () => boolean;
  // Test helper — internal use only
  _reset: () => void;
}

export const useDirtyForms = create<DirtyFormsState>((set, get) => ({
  dirtyForms: new Set(),
  register: (id) =>
    set((s) => {
      const next = new Set(s.dirtyForms);
      next.add(id);
      return { dirtyForms: next };
    }),
  unregister: (id) =>
    set((s) => {
      const next = new Set(s.dirtyForms);
      next.delete(id);
      return { dirtyForms: next };
    }),
  hasAnyDirty: () => get().dirtyForms.size > 0,
  _reset: () => set({ dirtyForms: new Set() }),
}));
```
</action>
<read_first>
- `.planning/phases/01-tenancy-backbone/01-RESEARCH.md` lines 1980-2014 — `useDirtyForms` reference impl.
- `.planning/phases/01-tenancy-backbone/01-RESEARCH.md` lines 1862-1867 — Common Pitfalls #3 (BroadcastChannel feature detection).
- `src/hooks/useAuth.ts` lines 82-103 — analog for dual-listener cross-tab sync (storage + custom event); Phase 1 substitutes BroadcastChannel for the custom event branch.
</read_first>
<acceptance_criteria>
- File `src/features/tenancy/hooks/useScopeBroadcast.ts` exists and contains `'BroadcastChannel' in window` feature detection AND `window.addEventListener('storage', ...)` fallback.
- File `src/features/tenancy/hooks/useDirtyForms.ts` exists exporting `useDirtyForms` Zustand store with `register`, `unregister`, `hasAnyDirty`.
- `npx tsc --noEmit -p tsconfig.app.json` exits 0.
</acceptance_criteria>
<files>
- `src/features/tenancy/hooks/useScopeBroadcast.ts`
- `src/features/tenancy/hooks/useDirtyForms.ts`
</files>
<automated>
grep -q "BroadcastChannel" src/features/tenancy/hooks/useScopeBroadcast.ts && grep -q "addEventListener('storage'" src/features/tenancy/hooks/useScopeBroadcast.ts && grep -q "hasAnyDirty" src/features/tenancy/hooks/useDirtyForms.ts && npx tsc --noEmit -p tsconfig.app.json
</automated>
</task>

<task id="05-04">
<action>
Create the CASL ability builder and React context.

**File 1: `src/features/tenancy/lib/abilities.ts`**

Use `@casl/ability` 6.8.1 — the function-style `defineAbility` pattern. Note that `useAuth.AppRole` currently is `'admin' | 'socio' | 'lider' | 'rh' | 'colaborador'` — this plan extends it to include `'liderado'` (Plan 07's task adds it to the enum if not already done). For now, accept both `'liderado'` and `'colaborador'` as synonymous (RESEARCH.md Q1).

```typescript
import { AbilityBuilder, createMongoAbility, type MongoAbility } from '@casl/ability';

// Local AppRole — supplemented from useAuth's existing definition; we
// accept both 'liderado' and 'colaborador' until Phase 4 contracts.
export type AppRoleForAbility = 'admin' | 'socio' | 'lider' | 'rh' | 'colaborador' | 'liderado';

export type Subject =
  | 'Company'
  | 'CompanyGroup'
  | 'OrgUnit'
  | 'OrgUnitMember'
  | 'UnitLeader'
  | 'JobOpening'
  | 'Application'
  | 'Candidate'
  | 'Evaluation'
  | 'OneOnOne'
  | 'ClimateSurvey'
  | 'Folha'
  | 'Platform'
  | 'all';

export type Action = 'manage' | 'create' | 'read' | 'update' | 'delete';

export type AppAbility = MongoAbility<[Action, Subject]>;

export interface AbilityContext {
  role: AppRoleForAbility;
  userId: string;
  visibleCompanyIds: string[];
  visibleOrgUnitIds: string[];
  ledOrgUnitIds: string[];
  ownOrgUnitIds: string[];
}

export function defineAppAbility(ctx: AbilityContext): AppAbility {
  const { can, cannot, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

  if (ctx.role === 'admin') {
    can('manage', 'all');
    return build();
  }

  if (ctx.role === 'rh') {
    // Operational total
    can('manage', 'Company');
    can('manage', 'CompanyGroup');
    can('manage', 'OrgUnit');
    can('manage', 'OrgUnitMember');
    can('manage', 'UnitLeader');
    can('manage', 'JobOpening');
    can('manage', 'Application');
    can('manage', 'Candidate');
    can('manage', 'Evaluation');
    can('manage', 'OneOnOne');
    can('manage', 'ClimateSurvey');
    can('read', 'Folha');
    cannot('manage', 'Platform'); // RBAC-03
    return build();
  }

  if (ctx.role === 'socio') {
    can('read', 'Company',     { id: { $in: ctx.visibleCompanyIds } });
    can('read', 'OrgUnit',     { company_id: { $in: ctx.visibleCompanyIds } });
    can('read', 'JobOpening',  { company_id: { $in: ctx.visibleCompanyIds } });
    can('read', 'Application', { company_id: { $in: ctx.visibleCompanyIds } });
    can('read', 'Candidate');
    can('read', 'Folha',       { company_id: { $in: ctx.visibleCompanyIds } });
    can('update', 'Company',   { id: { $in: ctx.visibleCompanyIds } });
    cannot('manage', 'Platform');
    cannot('manage', 'Evaluation');
    return build();
  }

  if (ctx.role === 'lider') {
    can('read', 'Company',     { id: { $in: ctx.visibleCompanyIds } });
    can('read', 'OrgUnit',     { id: { $in: ctx.visibleOrgUnitIds } });
    can('read', 'OrgUnitMember', { org_unit_id: { $in: ctx.visibleOrgUnitIds } });
    can('read', 'JobOpening',  { company_id: { $in: ctx.visibleCompanyIds } });
    can('read', 'Application', { company_id: { $in: ctx.visibleCompanyIds } });
    can('create', 'JobOpening', { company_id: { $in: ctx.visibleCompanyIds } });
    can('update', 'JobOpening', { requested_by: ctx.userId });
    can('manage', 'Evaluation', { org_unit_id: { $in: ctx.visibleOrgUnitIds } });
    can('manage', 'OneOnOne', { leader_id: ctx.userId });
    return build();
  }

  if (ctx.role === 'liderado' || ctx.role === 'colaborador') {
    can('read', 'Company', { id: { $in: ctx.visibleCompanyIds } });
    can('read', 'OrgUnit', { id: { $in: ctx.ownOrgUnitIds } });
    can('read', 'Evaluation', { evaluatee_id: ctx.userId });
    can('read', 'OneOnOne',   { liderado_id: ctx.userId });
    return build();
  }

  return build(); // empty
}
```

**File 2: `src/features/tenancy/lib/abilityContext.ts`**

```typescript
import { createContext } from 'react';
import { createContextualCan, useAbility as useCASLAbility } from '@casl/react';
import type { AppAbility } from './abilities';

// Initial value is a no-op ability — replaced by AbilityProvider on mount.
export const AbilityContext = createContext<AppAbility>(null as unknown as AppAbility);

export const Can = createContextualCan(AbilityContext.Consumer);

export const useAbility = () => useCASLAbility(AbilityContext);
```

**File 3: Wave-0 test `tests/scope/abilities.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import { defineAppAbility } from '@/features/tenancy/lib/abilities';

const baseCtx = {
  userId: 'user-123',
  visibleCompanyIds: ['c1', 'c2'],
  visibleOrgUnitIds: ['ou1'],
  ledOrgUnitIds: ['ou1'],
  ownOrgUnitIds: ['ou1'],
};

describe('defineAppAbility', () => {
  it('admin can manage all', () => {
    const ability = defineAppAbility({ ...baseCtx, role: 'admin' });
    expect(ability.can('manage', 'all')).toBe(true);
    expect(ability.can('manage', 'Platform')).toBe(true);
  });

  it('rh can manage operational subjects but NOT Platform', () => {
    const ability = defineAppAbility({ ...baseCtx, role: 'rh' });
    expect(ability.can('manage', 'JobOpening')).toBe(true);
    expect(ability.can('manage', 'Evaluation')).toBe(true);
    expect(ability.can('manage', 'Platform')).toBe(false);
  });

  it('socio can read scoped data, NOT Platform, NOT Evaluation', () => {
    const ability = defineAppAbility({ ...baseCtx, role: 'socio' });
    expect(ability.can('read', 'Company', { id: 'c1' })).toBe(true);
    expect(ability.can('read', 'Company', { id: 'c-not-mine' })).toBe(false);
    expect(ability.can('manage', 'Platform')).toBe(false);
    expect(ability.can('manage', 'Evaluation')).toBe(false);
  });

  it('lider can read in visibleOrgUnit and create JobOpening', () => {
    const ability = defineAppAbility({ ...baseCtx, role: 'lider' });
    expect(ability.can('read', 'OrgUnit', { id: 'ou1' })).toBe(true);
    expect(ability.can('read', 'OrgUnit', { id: 'ou-other' })).toBe(false);
    expect(ability.can('create', 'JobOpening', { company_id: 'c1' })).toBe(true);
  });

  it('liderado can read own evaluations only', () => {
    const ability = defineAppAbility({ ...baseCtx, role: 'liderado' });
    expect(ability.can('read', 'Evaluation', { evaluatee_id: 'user-123' })).toBe(true);
    expect(ability.can('read', 'Evaluation', { evaluatee_id: 'someone-else' })).toBe(false);
  });

  it('colaborador (legacy synonym) behaves like liderado', () => {
    const ability = defineAppAbility({ ...baseCtx, role: 'colaborador' });
    expect(ability.can('read', 'OneOnOne', { liderado_id: 'user-123' })).toBe(true);
    expect(ability.can('read', 'OneOnOne', { liderado_id: 'other' })).toBe(false);
  });
});
```

Run `npm test -- --run tests/scope/abilities.test.ts` — must pass 6+ tests.
</action>
<read_first>
- `src/hooks/useAuth.ts` line 5 — current `AppRole` type definition. Confirms `'colaborador'` is the existing value.
- `.planning/phases/01-tenancy-backbone/01-RESEARCH.md` lines 871-1027 — full Pattern 4 (CASL setup).
- `node_modules/@casl/ability/package.json` — confirm `6.8.x` is installed (Plan 01 task 01-01 added the dep).
</read_first>
<acceptance_criteria>
- File `src/features/tenancy/lib/abilities.ts` exists exporting `defineAppAbility`, `AppAbility`, `Subject`, `Action`, `AbilityContext`.
- File `src/features/tenancy/lib/abilityContext.ts` exists exporting `AbilityContext`, `Can`, `useAbility`.
- File `tests/scope/abilities.test.ts` exists.
- `defineAppAbility` has 5 role branches: `admin`, `rh`, `socio`, `lider`, `liderado` (with `colaborador` synonym).
- `npm test -- --run tests/scope/abilities.test.ts` exits 0 with 6+ tests passing.
- `npx tsc --noEmit -p tsconfig.app.json` exits 0.
</acceptance_criteria>
<files>
- `src/features/tenancy/lib/abilities.ts`
- `src/features/tenancy/lib/abilityContext.ts`
- `tests/scope/abilities.test.ts`
</files>
<automated>
grep -q "defineAppAbility" src/features/tenancy/lib/abilities.ts && grep -q "createMongoAbility" src/features/tenancy/lib/abilities.ts && grep -q "if (ctx.role === 'admin')" src/features/tenancy/lib/abilities.ts && grep -q "if (ctx.role === 'liderado' || ctx.role === 'colaborador')" src/features/tenancy/lib/abilities.ts && test -f src/features/tenancy/lib/abilityContext.ts && npm test -- --run tests/scope/abilities.test.ts && npx tsc --noEmit -p tsconfig.app.json
</automated>
</task>

<task id="05-05">
<action>
Create the `ScopeProvider` Context (the core of the chokepoint system) and the `useScopedQuery` hook (the data-layer chokepoint).

**File 1: `src/app/providers/ScopeProvider.tsx`**

```typescript
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import {
  parseScopeToken,
  serializeScope,
} from '@/features/tenancy/lib/scopeKey';
import { useScopeStore } from '@/features/tenancy/lib/store';
import { fetchDefaultScope } from '@/features/tenancy/lib/resolveDefaultScope';
import { useVisibleScopes } from '@/features/tenancy/hooks/useVisibleScopes';
import { useScopeBroadcast } from '@/features/tenancy/hooks/useScopeBroadcast';
import { useDirtyForms } from '@/features/tenancy/hooks/useDirtyForms';
import type {
  Scope,
  ScopeKind,
  VisibleCompanySummary,
  VisibleGroupSummary,
} from '@/features/tenancy/types';

interface ScopeContextValue {
  scope: Scope | null;
  setScope: (
    next: { kind: ScopeKind; id: string },
    opts?: { skipDirtyCheck?: boolean },
  ) => boolean; // returns true if accepted, false if blocked by dirty-form
  pendingScope: { kind: ScopeKind; id: string } | null; // when dirty-form blocks; consumer renders confirmation
  cancelPendingScope: () => void;
  confirmPendingScope: () => void;
  isFixed: boolean;
  visibleCompanies: VisibleCompanySummary[];
  visibleGroups: VisibleGroupSummary[];
  isResolving: boolean;
}

const ScopeContext = createContext<ScopeContextValue | null>(null);

function resolveScope(
  hint: { kind: ScopeKind; id: string },
  companies: VisibleCompanySummary[],
  groups: VisibleGroupSummary[],
): Scope | null {
  if (hint.kind === 'company') {
    const c = companies.find((x) => x.id === hint.id);
    if (!c) return null;
    return { kind: 'company', id: c.id, companyIds: [c.id], name: c.name };
  }
  const g = groups.find((x) => x.id === hint.id);
  if (!g || !g.companyIds.length) return null;
  return { kind: 'group', id: g.id, companyIds: g.companyIds, name: g.name };
}

export function ScopeProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const persistedToken = useScopeStore((s) => s.scopeToken);
  const setPersistedToken = useScopeStore((s) => s.setScopeToken);
  const { companies, groups, isLoading: scopesLoading } = useVisibleScopes();

  const [scope, setScopeState] = useState<Scope | null>(null);
  const [pendingScope, setPendingScope] = useState<
    { kind: ScopeKind; id: string } | null
  >(null);
  const [isResolving, setIsResolving] = useState(true);

  const lastFallbackToastAt = useRef(0);

  const showFallbackToast = useCallback((scopeName: string) => {
    // Throttle to 1 toast per second (UI-SPEC.md § 6)
    const now = Date.now();
    if (now - lastFallbackToastAt.current < 1000) return;
    lastFallbackToastAt.current = now;
    toast(`Você não tem acesso àquele escopo. Abrindo ${scopeName}.`);
  }, []);

  // Resolve scope on first render (URL > Zustand persist > server RPC default)
  useEffect(() => {
    if (authLoading || !user?.id || scopesLoading) {
      setIsResolving(true);
      return;
    }
    let aborted = false;
    setIsResolving(true);

    (async () => {
      try {
        const urlToken = searchParams.get('scope');
        const fromUrl = parseScopeToken(urlToken);
        const fromPersist = parseScopeToken(persistedToken);

        let resolved: Scope | null = null;
        let usedFallback = false;

        if (fromUrl) {
          resolved = resolveScope(fromUrl, companies, groups);
          if (!resolved) {
            // D-08 fallback path
            usedFallback = true;
            const fallbackHint =
              fromPersist ?? (await fetchDefaultScope(user.id));
            resolved = fallbackHint
              ? resolveScope(fallbackHint, companies, groups)
              : null;
          }
        } else if (fromPersist) {
          resolved = resolveScope(fromPersist, companies, groups);
          if (!resolved) {
            const def = await fetchDefaultScope(user.id);
            resolved = def ? resolveScope(def, companies, groups) : null;
          }
        } else {
          const def = await fetchDefaultScope(user.id);
          resolved = def ? resolveScope(def, companies, groups) : null;
        }

        if (aborted) return;

        if (resolved) {
          setScopeState(resolved);
          const token = serializeScope(resolved);
          setSearchParams(
            (prev) => {
              prev.set('scope', token);
              return prev;
            },
            { replace: true },
          );
          setPersistedToken(token);
          if (usedFallback) showFallbackToast(resolved.name);
        } else {
          // D-09 empty state
          setScopeState(null);
        }
      } finally {
        if (!aborted) setIsResolving(false);
      }
    })();

    return () => {
      aborted = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, authLoading, scopesLoading, companies.length, groups.length]);

  // Cross-tab sync — when another tab broadcasts, adopt its scope
  const { broadcast } = useScopeBroadcast(
    useCallback(
      (token: string) => {
        const hint = parseScopeToken(token);
        if (!hint) return;
        const resolved = resolveScope(hint, companies, groups);
        if (resolved) setScopeState(resolved);
      },
      [companies, groups],
    ),
  );

  const applyScope = useCallback(
    (next: { kind: ScopeKind; id: string }) => {
      const resolved = resolveScope(next, companies, groups);
      if (!resolved) return;
      setScopeState(resolved);
      const token = serializeScope(resolved);
      setSearchParams((prev) => {
        prev.set('scope', token);
        return prev;
      });
      setPersistedToken(token);
      broadcast(token);
    },
    [companies, groups, setSearchParams, setPersistedToken, broadcast],
  );

  const setScope = useCallback<ScopeContextValue['setScope']>(
    (next, opts) => {
      // D-05: dirty-form confirmation gate
      if (!opts?.skipDirtyCheck && useDirtyForms.getState().hasAnyDirty()) {
        setPendingScope(next);
        return false;
      }
      applyScope(next);
      return true;
    },
    [applyScope],
  );

  const confirmPendingScope = useCallback(() => {
    if (pendingScope) {
      applyScope(pendingScope);
      setPendingScope(null);
    }
  }, [pendingScope, applyScope]);

  const cancelPendingScope = useCallback(() => {
    setPendingScope(null);
  }, []);

  const isFixed = useMemo(() => {
    if (!companies.length) return true;
    if (companies.length === 1 && !groups.length) return true;
    return false;
  }, [companies, groups]);

  const value: ScopeContextValue = {
    scope,
    setScope,
    pendingScope,
    confirmPendingScope,
    cancelPendingScope,
    isFixed,
    visibleCompanies: companies,
    visibleGroups: groups,
    isResolving,
  };

  return (
    <ScopeContext.Provider value={value}>{children}</ScopeContext.Provider>
  );
}

export function useScope() {
  const ctx = useContext(ScopeContext);
  if (!ctx) {
    throw new Error('useScope must be used inside <ScopeProvider>');
  }
  return ctx;
}
```

**File 2: `src/shared/data/useScopedQuery.ts`**

```typescript
import {
  useQuery,
  type QueryKey,
  type UseQueryOptions,
} from '@tanstack/react-query';
import { useScope } from '@/app/providers/ScopeProvider';

/**
 * The chokepoint for ALL scope-aware data fetching. Every consumer hook
 * MUST call this instead of useQuery directly. The queryKey is prefixed
 * with ['scope', scope.id, scope.kind, ...] so that:
 *   - switching scope produces a NEW key (current data refetches)
 *   - the OLD scope's cache is preserved (D-04 — voltar é instantâneo)
 *   - invalidateQueries({ queryKey: ['scope', currentScopeId] }) hits
 *     only the current scope's cache (TEN-10 partial-key match)
 *
 * The fetcher receives `companyIds: string[]` — pass it to your
 * supabase.from().in('company_id', companyIds) query.
 *
 * RLS is the security boundary; this filtering is purely UX/perf.
 *
 * QUAL-07/08: this hook is the only allowed entry point for scoped data.
 * The ESLint rule no-supabase-from-outside-hooks blocks raw supabase.from
 * outside hooks/, so consumers can't smuggle scope-less queries.
 */
export function useScopedQuery<TData = unknown, TError = Error>(
  key: QueryKey,
  fn: (companyIds: string[]) => Promise<TData>,
  options?: Omit<
    UseQueryOptions<TData, TError, TData, QueryKey>,
    'queryKey' | 'queryFn'
  >,
) {
  const { scope, isResolving } = useScope();
  return useQuery<TData, TError>({
    queryKey: ['scope', scope?.id ?? '__none__', scope?.kind ?? '__none__', ...key],
    queryFn: () => {
      if (!scope) return Promise.resolve([] as unknown as TData);
      return fn(scope.companyIds);
    },
    enabled: !!scope && !isResolving && (options?.enabled ?? true),
    ...options,
  });
}
```

**File 3: `src/shared/data/useScopedRealtime.ts`**

```typescript
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useScope } from '@/app/providers/ScopeProvider';

/**
 * Foundation for scope-aware Supabase Realtime channels.
 * Phase 1 ships the chokepoint; Phase 2-3 wires consumers (e.g.,
 * the kanban realtime subscription).
 *
 * Pattern:
 *   useScopedRealtime('hiring:applications', (channel) => {
 *     channel.on('postgres_changes', {
 *       event: '*', schema: 'public', table: 'applications',
 *       filter: `company_id=in.(${scopedCompanyIds.join(',')})`,
 *     }, handler);
 *   });
 */
export function useScopedRealtime(
  topic: string,
  configure: (
    channel: ReturnType<typeof supabase.channel>,
    companyIds: string[],
  ) => void,
) {
  const { scope } = useScope();

  useEffect(() => {
    if (!scope) return;
    const channelName = `scope-${scope.id}-${topic}`;
    const channel = supabase.channel(channelName);
    configure(channel, scope.companyIds);
    channel.subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope?.id, topic]);
}
```

**File 4: Wave-0 test `tests/scope/useScopedQuery.test.tsx`**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useScopedQuery } from '@/shared/data/useScopedQuery';
import * as scopeModule from '@/app/providers/ScopeProvider';

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, Wrapper };
}

function mockScope(scope: any, isResolving = false) {
  vi.spyOn(scopeModule, 'useScope').mockReturnValue({
    scope,
    setScope: vi.fn(),
    pendingScope: null,
    confirmPendingScope: vi.fn(),
    cancelPendingScope: vi.fn(),
    isFixed: false,
    visibleCompanies: [],
    visibleGroups: [],
    isResolving,
  } as any);
}

describe('useScopedQuery', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('queryKey starts with [scope, scope.id, scope.kind, ...]', async () => {
    mockScope({
      kind: 'company',
      id: 'c1',
      companyIds: ['c1'],
      name: 'Empresa 1',
    });
    const fetcher = vi.fn().mockResolvedValue(['data']);
    const { Wrapper, client } = createWrapper();
    renderHook(() => useScopedQuery(['my-feature'], fetcher), {
      wrapper: Wrapper,
    });
    await waitFor(() => expect(fetcher).toHaveBeenCalled());
    const cacheKeys = client.getQueryCache().getAll().map((q) => q.queryKey);
    expect(cacheKeys[0]).toEqual(['scope', 'c1', 'company', 'my-feature']);
  });

  it('switching scope produces a new key; old cache preserved (D-04)', async () => {
    const fetcher = vi.fn().mockResolvedValue(['data']);
    const { Wrapper, client } = createWrapper();

    mockScope({ kind: 'company', id: 'c1', companyIds: ['c1'], name: 'A' });
    const { rerender } = renderHook(() => useScopedQuery(['feat'], fetcher), {
      wrapper: Wrapper,
    });
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));

    mockScope({ kind: 'company', id: 'c2', companyIds: ['c2'], name: 'B' });
    rerender();
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));

    const allKeys = client.getQueryCache().getAll().map((q) => q.queryKey);
    expect(allKeys.some((k: any) => k[1] === 'c1')).toBe(true); // OLD cache present
    expect(allKeys.some((k: any) => k[1] === 'c2')).toBe(true); // NEW cache present
  });

  it('does not call fetcher when scope is null', () => {
    mockScope(null);
    const fetcher = vi.fn().mockResolvedValue([]);
    const { Wrapper } = createWrapper();
    renderHook(() => useScopedQuery(['x'], fetcher), { wrapper: Wrapper });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('does not call fetcher when isResolving=true', () => {
    mockScope(
      { kind: 'company', id: 'c1', companyIds: ['c1'], name: 'A' },
      true,
    );
    const fetcher = vi.fn().mockResolvedValue([]);
    const { Wrapper } = createWrapper();
    renderHook(() => useScopedQuery(['x'], fetcher), { wrapper: Wrapper });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('passes companyIds to the fetcher', async () => {
    mockScope({
      kind: 'group',
      id: 'g1',
      companyIds: ['c1', 'c2', 'c3'],
      name: 'Grupo',
    });
    const fetcher = vi.fn().mockResolvedValue([]);
    const { Wrapper } = createWrapper();
    renderHook(() => useScopedQuery(['x'], fetcher), { wrapper: Wrapper });
    await waitFor(() => expect(fetcher).toHaveBeenCalled());
    expect(fetcher).toHaveBeenCalledWith(['c1', 'c2', 'c3']);
  });
});
```

Run `npm test -- --run tests/scope/useScopedQuery.test.tsx` — must pass.
</action>
<read_first>
- `src/hooks/useAuth.ts` — `useAuth()` shape: `{ user, loading, userRole, ... }`.
- `src/integrations/supabase/client.ts` — confirms `supabase` singleton import path.
- `.planning/phases/01-tenancy-backbone/01-RESEARCH.md` lines 591-866 — full Pattern 3 (ScopeProvider + useScopedQuery + partial-key invalidation).
- `.planning/phases/01-tenancy-backbone/01-PATTERNS.md` lines 295-422 — analog references for Context provider + useQuery wrapper.
- `.planning/phases/01-tenancy-backbone/01-RESEARCH.md` lines 1849-1853 — Common Pitfalls #1 (Provider must mount inside BrowserRouter).
</read_first>
<acceptance_criteria>
- File `src/app/providers/ScopeProvider.tsx` exists exporting `ScopeProvider` and `useScope`.
- `ScopeProvider` calls `useSearchParams` from `react-router-dom`.
- `ScopeProvider` resolves scope precedence URL > Zustand persist > RPC default.
- `ScopeProvider` calls `fetchDefaultScope` on missing/invalid token.
- `ScopeProvider` shows fallback toast (D-08) — `toast()` from sonner — when URL token resolves to fallback.
- `ScopeProvider` exposes `pendingScope` + `confirmPendingScope` + `cancelPendingScope` for D-05 dirty-form gate.
- File `src/shared/data/useScopedQuery.ts` exists and exports `useScopedQuery`.
- `useScopedQuery` queryKey starts with `['scope', scope?.id ?? '__none__', scope?.kind ?? '__none__', ...key]`.
- File `src/shared/data/useScopedRealtime.ts` exists with the channel-name pattern `scope-${scope.id}-${topic}`.
- File `tests/scope/useScopedQuery.test.tsx` exists.
- `npm test -- --run tests/scope/useScopedQuery.test.tsx` exits 0 with 5+ tests passing.
- `npx tsc --noEmit -p tsconfig.app.json` exits 0.
</acceptance_criteria>
<files>
- `src/app/providers/ScopeProvider.tsx`
- `src/shared/data/useScopedQuery.ts`
- `src/shared/data/useScopedRealtime.ts`
- `tests/scope/useScopedQuery.test.tsx`
</files>
<automated>
test -f src/app/providers/ScopeProvider.tsx && grep -q "useSearchParams" src/app/providers/ScopeProvider.tsx && grep -q "useScope" src/app/providers/ScopeProvider.tsx && grep -q "fetchDefaultScope" src/app/providers/ScopeProvider.tsx && test -f src/shared/data/useScopedQuery.ts && grep -q "'scope', scope?.id" src/shared/data/useScopedQuery.ts && test -f src/shared/data/useScopedRealtime.ts && npm test -- --run tests/scope/useScopedQuery.test.tsx && npx tsc --noEmit -p tsconfig.app.json
</automated>
</task>

<task id="05-06">
<action>
Create the `AbilityProvider` and the providers composition module, then mount everything in `App.tsx`.

**File 1: `src/app/providers/AbilityProvider.tsx`**

```typescript
import { useMemo, type ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useScope } from '@/app/providers/ScopeProvider';
import {
  defineAppAbility,
  type AppRoleForAbility,
} from '@/features/tenancy/lib/abilities';
import { AbilityContext } from '@/features/tenancy/lib/abilityContext';

export function AbilityProvider({ children }: { children: ReactNode }) {
  const { user, userRole } = useAuth();
  const { visibleCompanies } = useScope();

  const ability = useMemo(() => {
    const role = (userRole ?? 'colaborador') as AppRoleForAbility;
    return defineAppAbility({
      role,
      userId: user?.id ?? '',
      visibleCompanyIds: visibleCompanies.map((c) => c.id),
      // Phase 2-3 wires these via dedicated queries; Phase 1 ships
      // empty arrays — guard `<Can>` checks against expectation that
      // org_unit-level abilities aren't fully accurate yet.
      visibleOrgUnitIds: [],
      ledOrgUnitIds: [],
      ownOrgUnitIds: [],
    });
  }, [user?.id, userRole, visibleCompanies]);

  return (
    <AbilityContext.Provider value={ability}>{children}</AbilityContext.Provider>
  );
}
```

**File 2: `src/app/providers/index.tsx`**

```typescript
import type { ReactNode } from 'react';
import { ScopeProvider } from './ScopeProvider';
import { AbilityProvider } from './AbilityProvider';

/**
 * Composes the Phase 1 providers in the canonical order:
 *   ScopeProvider → AbilityProvider → (children)
 *
 * IMPORTANT: this composition MUST be mounted INSIDE <BrowserRouter>
 * because ScopeProvider uses useSearchParams() (RESEARCH.md
 * Common Pitfalls #1). App.tsx is responsible for the BrowserRouter.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ScopeProvider>
      <AbilityProvider>{children}</AbilityProvider>
    </ScopeProvider>
  );
}

// Re-exports for convenience
export { ScopeProvider, useScope } from './ScopeProvider';
export { AbilityProvider } from './AbilityProvider';
```

**File 3: Edit `src/App.tsx`** — wrap the authenticated `<Routes>` block with `<AppProviders>` INSIDE `<BrowserRouter>`. Do NOT wrap the unauthenticated branch.

Read the current `src/App.tsx`, find the `<BrowserRouter>` opening tag, and identify the conditional that renders authenticated routes. Insert `<AppProviders>` opening tag right after the auth-guarded conditional starts and `</AppProviders>` right before it ends.

The exact edit depends on the current structure. The minimum edit is: import `AppProviders` from `@/app/providers`, then wrap the authenticated branch.

Add this import at the top of `App.tsx`:
```typescript
import { AppProviders } from '@/app/providers';
```

Then find the authenticated routing branch (e.g., a fragment containing `<Layout>` or `<Routes>` for logged-in users) and wrap it:
```jsx
<AppProviders>
  {/* existing authenticated content */}
</AppProviders>
```

CRITICAL constraint: The `<AppProviders>` MUST be inside `<BrowserRouter>` (not above it) — otherwise `useSearchParams()` throws.

If the executor cannot determine the exact line ranges, the safe edit is to:
1. Locate `<BrowserRouter>` opening.
2. Inside, locate the conditional like `isAuthenticated && (` or `{isAuthenticated ? (...) : (...)}`.
3. Wrap the truthy branch's outer JSX in `<AppProviders>...</AppProviders>`.

After edit, run `npx tsc --noEmit -p tsconfig.app.json` and `npm run build` to confirm app still compiles + builds.
</action>
<read_first>
- `src/App.tsx` — full file. Identify the BrowserRouter location (per RESEARCH.md analog at line 1959, BrowserRouter is around line 79). Identify how `isAuthenticated` is computed and where the authenticated routes are rendered.
- `.planning/phases/01-tenancy-backbone/01-RESEARCH.md` lines 1947-1975 — App.tsx provider mount example.
- `.planning/phases/01-tenancy-backbone/01-PATTERNS.md` lines 866-891 — App.tsx insertion details + warnings (preserve existing imports, BrowserRouter must wrap providers).
- `.planning/phases/01-tenancy-backbone/01-RESEARCH.md` lines 1849-1853 — Pitfall #1 about ScopeProvider mount location.
</read_first>
<acceptance_criteria>
- File `src/app/providers/AbilityProvider.tsx` exists exporting `AbilityProvider`.
- File `src/app/providers/index.tsx` exists exporting `AppProviders`, `ScopeProvider`, `useScope`, `AbilityProvider`.
- File `src/App.tsx` contains `import { AppProviders } from '@/app/providers'`.
- File `src/App.tsx` contains `<AppProviders>` JSX tag.
- The `<AppProviders>` is positioned INSIDE `<BrowserRouter>` (i.e., grep that the line containing `<BrowserRouter>` appears BEFORE the line containing `<AppProviders>` in the file).
- `npx tsc --noEmit -p tsconfig.app.json` exits 0.
- `npm run build` exits 0 (Vite production build succeeds).
</acceptance_criteria>
<files>
- `src/app/providers/AbilityProvider.tsx`
- `src/app/providers/index.tsx`
- `src/App.tsx`
</files>
<automated>
test -f src/app/providers/AbilityProvider.tsx && test -f src/app/providers/index.tsx && grep -q "AppProviders" src/App.tsx && grep -q "from '@/app/providers'" src/App.tsx && [ "$(grep -n '<BrowserRouter>' src/App.tsx | head -1 | cut -d: -f1)" -lt "$(grep -n '<AppProviders>' src/App.tsx | head -1 | cut -d: -f1)" ] && npx tsc --noEmit -p tsconfig.app.json && npm run build
</automated>
</task>

<task id="05-07">
<action>
Create the integration test that verifies D-08 fallback behavior end-to-end (URL with inaccessible scope → silent fallback to default + toast).

**File: `tests/scope/ScopeProvider.fallback.test.tsx`**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ScopeProvider, useScope } from '@/app/providers/ScopeProvider';

// Mock useAuth so the provider thinks user is authenticated
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'test-user-uuid' },
    loading: false,
    userRole: 'admin',
  }),
}));

// Mock useVisibleScopes to return only 1 group "Grupo Lever" + 1 company
vi.mock('@/features/tenancy/hooks/useVisibleScopes', () => ({
  useVisibleScopes: () => ({
    companies: [{ id: 'company-real-id', name: 'Empresa Real' }],
    groups: [
      {
        id: 'group-grupo-lever-id',
        name: 'Grupo Lever',
        companyIds: ['company-real-id'],
      },
    ],
    isLoading: false,
    error: null,
  }),
}));

// Mock fetchDefaultScope to return a known default
vi.mock('@/features/tenancy/lib/resolveDefaultScope', () => ({
  fetchDefaultScope: vi
    .fn()
    .mockResolvedValue({ kind: 'group', id: 'group-grupo-lever-id' }),
}));

// Capture toast calls
const toastSpy = vi.fn();
vi.mock('sonner', () => ({
  toast: (msg: string) => toastSpy(msg),
}));

function ScopeReader() {
  const { scope, isResolving } = useScope();
  if (isResolving) return <div>resolving</div>;
  if (!scope) return <div>empty</div>;
  return (
    <div>
      <span data-testid="scope-name">{scope.name}</span>
      <span data-testid="scope-kind">{scope.kind}</span>
    </div>
  );
}

function renderWithRouter(initialUrl: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[initialUrl]}>
        <ScopeProvider>
          <ScopeReader />
        </ScopeProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ScopeProvider URL fallback (D-08)', () => {
  beforeEach(() => {
    toastSpy.mockClear();
    localStorage.clear();
  });

  it('valid URL scope resolves directly without toast', async () => {
    renderWithRouter('/?scope=group:group-grupo-lever-id');
    await waitFor(() =>
      expect(screen.getByTestId('scope-name')).toHaveTextContent('Grupo Lever'),
    );
    expect(toastSpy).not.toHaveBeenCalled();
  });

  it('invalid URL scope falls back to default + emits toast (D-08)', async () => {
    renderWithRouter('/?scope=company:00000000-0000-0000-0000-deadbeefdead');
    await waitFor(() =>
      expect(screen.getByTestId('scope-name')).toHaveTextContent('Grupo Lever'),
    );
    expect(toastSpy).toHaveBeenCalledTimes(1);
    expect(toastSpy.mock.calls[0][0]).toMatch(
      /Você não tem acesso àquele escopo. Abrindo Grupo Lever\./,
    );
  });

  it('no URL token, no persist → uses default scope, no toast', async () => {
    renderWithRouter('/');
    await waitFor(() =>
      expect(screen.getByTestId('scope-name')).toHaveTextContent('Grupo Lever'),
    );
    expect(toastSpy).not.toHaveBeenCalled();
  });
});
```

Run `npm test -- --run tests/scope/ScopeProvider.fallback.test.tsx` — must pass 3 tests.
</action>
<read_first>
- `src/app/providers/ScopeProvider.tsx` (created in 05-05) — confirm export shape.
- `.planning/phases/01-tenancy-backbone/01-VALIDATION.md` line 90 — D-08 fallback test requirement.
- `tests/setup.ts` (created in 01-03) — confirms `@testing-library/jest-dom/vitest` is registered (so `.toHaveTextContent` matchers work).
</read_first>
<acceptance_criteria>
- File `tests/scope/ScopeProvider.fallback.test.tsx` exists.
- `npm test -- --run tests/scope/ScopeProvider.fallback.test.tsx` exits 0 with 3 tests passing.
- Total scope tests passing now: ≥ 24 (10 from scopeKey + 5 from useScopeStore + 6 from abilities + 5 from useScopedQuery + 3 from this).
</acceptance_criteria>
<files>
- `tests/scope/ScopeProvider.fallback.test.tsx`
</files>
<automated>
test -f tests/scope/ScopeProvider.fallback.test.tsx && npm test -- --run tests/scope/ScopeProvider.fallback.test.tsx
</automated>
</task>

</tasks>

<verification>
1. All 5 test files in `tests/scope/` pass: run `npm test -- --run tests/scope/`.
2. `npx tsc --noEmit -p tsconfig.app.json` exits 0 — full project type-checks.
3. `npm run build` exits 0 — Vite production build succeeds with the new providers.
4. `src/features/tenancy/`, `src/app/providers/`, `src/shared/data/` directory structures are populated as designed.
5. ScopeProvider mounted INSIDE `<BrowserRouter>` in `App.tsx` (line-position grep confirms).
6. AbilityProvider mounted as child of ScopeProvider (composition order in `index.tsx`).
7. `useScopedQuery` always prefixes `['scope', scope.id, scope.kind, ...]` — verified by `useScopedQuery.test.tsx`.
8. D-08 fallback path emits neutral toast via sonner when URL scope is invalid — verified by `ScopeProvider.fallback.test.tsx`.
</verification>

<must_haves>
- `Scope` type is `{ kind, id, companyIds, name }` discriminated union.
- `parseScopeToken` and `serializeScope` are pure utilities.
- Zustand store `useScopeStore` persists with `name: 'leverup:scope'`, `version: 1`, `partialize`.
- `useVisibleScopes` fetches `companies` + `company_groups` from Supabase.
- `useScopeBroadcast` uses `BroadcastChannel('leverup:scope')` with `storage` event fallback.
- `useDirtyForms` Zustand registry with `register`, `unregister`, `hasAnyDirty`.
- `defineAppAbility` covers 5 roles (admin, rh, socio, lider, liderado/colaborador).
- `ScopeProvider` precedence: URL > Zustand persist > RPC default. Falls back silently with toast on invalid URL (D-08).
- `ScopeProvider` exposes `pendingScope` + `confirmPendingScope` + `cancelPendingScope` for dirty-form gate (D-05).
- `useScopedQuery` chokepoint queryKey: `['scope', scope.id, scope.kind, ...key]`.
- `useScopedRealtime` foundation hook ships (consumers come Phase 2-3).
- `AbilityProvider` rebuilds ability on `userRole` or `visibleCompanies` change.
- Providers mounted INSIDE `<BrowserRouter>` in `App.tsx` (Pitfall #1 honored).
- 5 vitest test files passing (scopeKey, useScopeStore, abilities, useScopedQuery, ScopeProvider.fallback).
</must_haves>

<success_criteria>
- All scope test files green: `npm test -- --run tests/scope/` exits 0 with ≥ 24 tests passing.
- TypeScript compilation green: `npx tsc --noEmit -p tsconfig.app.json` exits 0.
- Vite build green: `npm run build` exits 0.
- ScopeProvider mounted inside BrowserRouter (line ordering check in App.tsx).
- AbilityProvider rebuilds ability when scope/role changes.
- Cross-tab BroadcastChannel propagates scope changes to listening tabs.
- D-08 silent-fallback path verified by integration test.
- Plan 06 (UI) and Plan 07 (quality gates) can build on this plan's exports without modification.
</success_criteria>
</content>
</invoke>