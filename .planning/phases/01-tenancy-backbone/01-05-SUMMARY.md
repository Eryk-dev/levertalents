---
phase: 01-tenancy-backbone
plan: 05
subsystem: frontend
tags: [react, context, zustand, react-router, react-query, casl, rbac, broadcast-channel, vitest, multi-tenant, scope]

# Dependency graph
requires:
  - phase: 01-tenancy-backbone (Wave 1)
    provides: |
      - 01-04 Migration C: socio_company_memberships + visible_companies(uid) + resolve_default_scope(uid) RPC
      - 01-04 Regenerated src/integrations/supabase/types.ts (company_groups, org_units, socio_company_memberships rows + RPC return types)
      - 01-01 Test infra (vitest 3.2 + @testing-library/react 16 + msw 2.10 + tests/setup.ts + tests/msw)
provides:
  - src/features/tenancy/types.ts (Scope, ScopeKind, VisibleCompanySummary, VisibleGroupSummary)
  - src/features/tenancy/lib/scopeKey.ts (parseScopeToken, serializeScope — pure URL/token utils)
  - src/features/tenancy/lib/store.ts (useScopeStore — Zustand persist, 'leverup:scope', version 1)
  - src/features/tenancy/lib/resolveDefaultScope.ts (fetchDefaultScope wrapping resolve_default_scope RPC)
  - src/features/tenancy/hooks/useVisibleScopes.ts (companies + groups fetcher with embedded company list)
  - src/features/tenancy/hooks/useScopeBroadcast.ts (BroadcastChannel + storage-event fallback)
  - src/features/tenancy/hooks/useDirtyForms.ts (Zustand registry for D-05 dirty-form gate)
  - src/features/tenancy/lib/abilities.ts (defineAppAbility for 5 roles + AppAbility, Subject, Action types)
  - src/features/tenancy/lib/abilityContext.ts (AbilityContext + Can + useAbility)
  - src/app/providers/ScopeProvider.tsx (URL > Zustand persist > RPC default precedence; D-08 fallback toast; D-05 dirty-form gate; D-09 empty state; cross-tab sync)
  - src/app/providers/AbilityProvider.tsx (rebuilds ability on userRole/visibleCompanies change)
  - src/app/providers/index.tsx (AppProviders composing ScopeProvider → AbilityProvider)
  - src/shared/data/useScopedQuery.ts (chokepoint queryKey ['scope', scope.id, scope.kind, ...])
  - src/shared/data/useScopedRealtime.ts (channel name 'scope-{id}-{topic}', foundation for Phase 2-3)
  - src/App.tsx (AppProviders mounted INSIDE BrowserRouter wrapping the authenticated <Layout/> route element)
affects: [phase-01 plan-06 scope selector UI, phase-01 plan-07 quality gates, phase-02 R&S kanban, phase-03 performance hooks rewrite]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Chokepoint hook: useScopedQuery wraps useQuery with ['scope', id, kind, ...userKey] prefix. Switching scope produces a new key — old scope cache stays in gcTime; voltar = instantâneo (D-04)."
    - "URL > store > RPC fallback: ScopeProvider resolves on auth/scopes ready; URL invalid → silent fallback + neutral toast (1s throttle, D-08)."
    - "BroadcastChannel('leverup:scope') with storage-event fallback for Safari < 15.4 (Pitfall #3) — cross-tab adopts new scope without re-resolving."
    - "CASL relaxed CanFn cast: MongoAbility<[Action, Subject]> with permissive CanFn signature so condition object literals (`{id: {$in: [...]}}`) aren't rejected by strict CASL typing of unbranded string subjects."
    - "Provider mount inside BrowserRouter (Pitfall #1) — useSearchParams() requires Router context; mount in <Route element=...> after isAuthenticated."
    - "Zustand store with version: 1 + partialize — migration-ready persistence; version bump on schema changes."

key-files:
  created:
    - src/features/tenancy/types.ts (21 lines)
    - src/features/tenancy/lib/scopeKey.ts (28 lines)
    - src/features/tenancy/lib/store.ts (29 lines)
    - src/features/tenancy/lib/resolveDefaultScope.ts (21 lines)
    - src/features/tenancy/lib/abilities.ts (130 lines)
    - src/features/tenancy/lib/abilityContext.ts (11 lines)
    - src/features/tenancy/hooks/useVisibleScopes.ts (76 lines)
    - src/features/tenancy/hooks/useScopeBroadcast.ts (72 lines)
    - src/features/tenancy/hooks/useDirtyForms.ts (40 lines)
    - src/app/providers/ScopeProvider.tsx (227 lines)
    - src/app/providers/AbilityProvider.tsx (32 lines)
    - src/app/providers/index.tsx (24 lines)
    - src/shared/data/useScopedQuery.ts (44 lines)
    - src/shared/data/useScopedRealtime.ts (38 lines)
    - tests/scope/scopeKey.test.ts (51 lines, 10 tests)
    - tests/scope/useScopeStore.test.ts (40 lines, 5 tests)
    - tests/scope/abilities.test.ts (70 lines, 6 tests)
    - tests/scope/useScopedQuery.test.tsx (104 lines, 5 tests)
    - tests/scope/ScopeProvider.fallback.test.tsx (105 lines, 3 tests)
  modified:
    - src/App.tsx (+5/-2 lines — added AppProviders import + wrap authenticated Layout)
    - tests/setup.ts (+5/-1 lines — added VITE_SUPABASE_URL/KEY env stubs so the supabase singleton constructs under tests)

key-decisions:
  - "AppProviders wraps ONLY the authenticated <Layout/> route element, not the whole <Routes>. Public routes (/vagas/:id and /hiring/fit/:token) stay outside scope context — they don't need it and ScopeProvider would otherwise try to load visibleScopes for unauthenticated users."
  - "Test environment stubs VITE_SUPABASE_URL + VITE_SUPABASE_PUBLISHABLE_KEY at tests/setup.ts via vi.stubEnv. Without them the Supabase singleton in src/integrations/supabase/client.ts throws 'supabaseUrl is required' on import (which happens transitively from useAuth → ScopeProvider). Plan 01-01 ledger lacked these stubs — this plan adds them as Rule 3 (blocking) deviation."
  - "CASL ability typing: declared MongoAbility<[Action, Subject]> with bare-string subjects (matches research/PATTERNS recommendation). The strict typing of the resulting RuleBuilder rejects condition object literals (it expects MongoQuery<never> for unbranded subjects). Cast can/cannot to a permissive CanFn shape inside defineAppAbility — runtime is unchanged. Test code uses subject() tagging + a narrow asAnyAbility helper to call .can() with tagged objects without leaking `as any` into src/."
  - "useScopedQuery.queryKey shape: ['scope', scope?.id ?? '__none__', scope?.kind ?? '__none__', ...key]. The '__none__' sentinel is never produced because the hook is gated `enabled: !!scope` — it exists only so the queryKey type is stable while scope is still resolving (avoids React useMemo identity churn when scope toggles null→present)."
  - "ScopeProvider exposes pendingScope + confirmPendingScope + cancelPendingScope INSIDE the context. The dirty-form dialog (D-05) is wired in Plan 01-06 (UI). Plan 01-05 ships the contract — Plan 01-06 renders the dialog."

# Metrics
metrics:
  duration_minutes: ~14
  tasks_completed: 7
  tests_added: 5 files / 29 assertions
  lines_added: ~1.1k (src + tests)
  completed_date: 2026-04-27
---

# Phase 1 Plan 5: Frontend Chokepoint — ScopeProvider + Zustand + URL Sync + useScopedQuery + CASL Summary

**One-liner:** Centerpiece of Phase 1 — ScopeProvider Context (URL > Zustand persist > RPC default), useScopedQuery chokepoint hook auto-prefixing every TanStack queryKey with `['scope', id, kind, ...]`, CASL ability matrix for 5 roles, BroadcastChannel cross-tab sync, all mounted INSIDE BrowserRouter after auth resolves. 5 vitest test files = 29 green assertions.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 05-01 | Scope types + scopeKey utils + 10 tests | `4418cb7` | `types.ts`, `scopeKey.ts`, `scopeKey.test.ts` |
| 05-02 | Zustand store + RPC client + visibleScopes + 5 tests | `1f55877` | `store.ts`, `resolveDefaultScope.ts`, `useVisibleScopes.ts`, `useScopeStore.test.ts` |
| 05-03 | BroadcastChannel + dirty-form registry | `7be4978` | `useScopeBroadcast.ts`, `useDirtyForms.ts` |
| 05-04 | CASL abilities + AbilityContext + 6 tests | `0df2740` | `abilities.ts`, `abilityContext.ts`, `abilities.test.ts` |
| 05-05 | ScopeProvider + useScopedQuery + Realtime + 5 tests | `0ab9de9` | `ScopeProvider.tsx`, `useScopedQuery.ts`, `useScopedRealtime.ts`, `useScopedQuery.test.tsx`, `tests/setup.ts` |
| 05-06 | AbilityProvider + AppProviders + App.tsx mount | `adabae8` | `AbilityProvider.tsx`, `providers/index.tsx`, `App.tsx` |
| 05-07 | D-08 fallback integration test | `62a3a76` | `ScopeProvider.fallback.test.tsx` |

## Decisions Made

1. **AppProviders mount point.** Wrap the authenticated `<Layout/>` route element only — keep public routes outside scope context. Avoids unnecessary scope resolution for `/vagas/:id` and `/hiring/fit/:token`.
2. **Env stubs in test setup.** `vi.stubEnv` for `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` is required because Supabase singleton client imports transitively. Stubbing in `tests/setup.ts` fixes the entire test suite (Rule 3 deviation).
3. **CASL strict-typing relaxation.** `MongoAbility<[Action, Subject]>` with bare-string subjects + permissive `CanFn` cast inside `defineAppAbility`. Runtime unchanged; CASL's strict typing of unbranded subjects would reject our `{ id: { $in: ids } }` literals otherwise.
4. **Chokepoint queryKey shape.** `['scope', id, kind, ...key]` — TanStack partial-key invalidation matches naturally and old scope's cache is preserved (D-04).
5. **`Cmd+K` integration deferred.** Scope switching via `CmdKPalette` not in Phase 1 (CONTEXT.md discretion).

## Verification

```
npx vitest run tests/scope/  →  6 files, 30 tests passing (5 scope + 1 sanity)
npx tsc --noEmit -p tsconfig.app.json  →  0 errors in new files (42 pre-existing app-wide errors documented in deferred-items.md)
npm run build  →  Vite production build green (1.57s build, 4.50s total)
src/App.tsx ordering: <BrowserRouter> at line 80 → <AppProviders> at line 88 (Pitfall #1 honored)
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Plan command `npm test -- --run <path>` is invalid**
- **Found during:** Task 05-01 verification
- **Issue:** `package.json` already has `"test": "vitest --run"`; passing `-- --run` adds a second `--run` flag and vitest CAC parser rejects duplicate option.
- **Fix:** Use `npx vitest run <path>` directly (equivalent semantics, single `run` arg). All scope test runs in this plan use the corrected form.
- **Files modified:** None (this is a runner invocation only — not committed code).
- **Commit:** N/A

**2. [Rule 3 - Blocking] Tests fail at import — Supabase singleton requires env vars**
- **Found during:** Task 05-05 (`useScopedQuery.test.tsx`)
- **Issue:** `src/integrations/supabase/client.ts` calls `createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, ...)` at module-load. Without env vars, the test crashes before the first `it()` runs. The chain is: test → `useScopedQuery` → `ScopeProvider` → `useAuth` → `supabase` singleton.
- **Fix:** Added `vi.stubEnv('VITE_SUPABASE_URL', '...')` + `vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'test-anon-key-not-real')` in `tests/setup.ts`. The MSW handlers in `tests/msw/handlers.ts` already point to the same URL, so stubbed URL matches the mock origin.
- **Files modified:** `tests/setup.ts`
- **Commit:** `0ab9de9` (Task 05-05)

**3. [Rule 1 - Bug] CASL 6.x typing rejects condition object literals on bare string subjects**
- **Found during:** Task 05-04 (`npx tsc --noEmit`)
- **Issue:** `MongoAbility<[Action, Subject]>` infers `MongoQuery<never>` for the conditions parameter when Subject is a string literal (no `TaggedInterface` brand). All `can('read', 'Company', { id: { $in: ... } })` calls would fail tsc.
- **Fix:** Inside `defineAppAbility`, cast `builder.can` and `builder.cannot` to a permissive `CanFn` typed as `(action, subject, conditions?: MongoQuery<Record<string, unknown>>) => unknown`. The runtime path is unchanged. In tests, use `subject('T', {...})` tagging + a narrow `asAnyAbility` helper to call `.can()` with tagged objects without `as any` casts (CLAUDE.md forbids those in `src/`).
- **Files modified:** `src/features/tenancy/lib/abilities.ts`, `tests/scope/abilities.test.ts`
- **Commit:** `0df2740` (Task 05-04)

### Architectural Changes

None — all deviations were Rule 1 (bug) or Rule 3 (blocking) and fit within the plan's `<must_haves>`.

## Self-Check: PASSED

Files created (all FOUND in working tree at HEAD `62a3a76`):
- src/features/tenancy/types.ts
- src/features/tenancy/lib/scopeKey.ts
- src/features/tenancy/lib/store.ts
- src/features/tenancy/lib/resolveDefaultScope.ts
- src/features/tenancy/lib/abilities.ts
- src/features/tenancy/lib/abilityContext.ts
- src/features/tenancy/hooks/useVisibleScopes.ts
- src/features/tenancy/hooks/useScopeBroadcast.ts
- src/features/tenancy/hooks/useDirtyForms.ts
- src/app/providers/ScopeProvider.tsx
- src/app/providers/AbilityProvider.tsx
- src/app/providers/index.tsx
- src/shared/data/useScopedQuery.ts
- src/shared/data/useScopedRealtime.ts
- tests/scope/scopeKey.test.ts
- tests/scope/useScopeStore.test.ts
- tests/scope/abilities.test.ts
- tests/scope/useScopedQuery.test.tsx
- tests/scope/ScopeProvider.fallback.test.tsx

Files modified:
- src/App.tsx
- tests/setup.ts

Commits (all FOUND in `git log`):
- 4418cb7  feat(01-05): add Scope types and scopeKey URL utilities
- 1f55877  feat(01-05): add scope store, default-scope RPC client, visible scopes hook
- 7be4978  feat(01-05): cross-tab scope broadcast and dirty-form registry
- 0df2740  feat(01-05): CASL ability builder + AbilityContext for 5 roles
- 0ab9de9  feat(01-05): ScopeProvider context + useScopedQuery chokepoint + Realtime foundation
- adabae8  feat(01-05): mount AbilityProvider + wire AppProviders into App.tsx
- 62a3a76  test(01-05): integration test for D-08 URL fallback path

29 scope assertions pass (run `npx vitest run tests/scope/`). Vite build green.

Plan 06 (UI) and Plan 07 (quality gates) consume:
- `useScope()` from `@/app/providers` (selector trigger, dropdown, dirty-form dialog wiring)
- `useScopedQuery` from `@/shared/data` (the chokepoint that ESLint rule will pin in 01-07)
- `Can`, `useAbility` from `@/features/tenancy/lib/abilityContext` (UI-level capability gating)
- `useDirtyForms` from `@/features/tenancy/hooks` (forms register/unregister on isDirty toggles)
