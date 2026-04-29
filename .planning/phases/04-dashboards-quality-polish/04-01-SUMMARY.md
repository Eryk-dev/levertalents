---
phase: 04-dashboards-quality-polish
plan: 01
subsystem: observability
tags:
  - sentry
  - observability
  - pii
  - phase-4
  - qual-06
  - foundation
requirements:
  - QUAL-06
  - QUAL-01
dependency_graph:
  requires:
    - "src/lib/logger.ts redact() (Phase 1) — single source of truth for PII keys"
    - "src/app/providers/ScopeProvider.tsx (Phase 1) — scope.id and scope.kind already exposed"
    - "src/components/ErrorBoundary.tsx (existing) — fallback UI preserved by inner boundary"
    - "@sentry/react 10.50 (already in package.json)"
  provides:
    - "Sentry.init at app boot before React renders, with PII-safe beforeSend"
    - "Sentry.ErrorBoundary outer net wrapping the app tree"
    - "scope_id + scope_kind tags on every Sentry event (per-company filtering)"
    - "SessionReplayToggle component (default OFF, masks all when ON)"
    - "VITE_SENTRY_DSN env var documented in .env.example"
  affects:
    - "All Phase 4+ plans benefit from PII-scrubbed Sentry events"
    - "Plan 04-04 SocioDashboard refactor — render errors will now report to Sentry"
    - "Plan 04-05 CmdK refactor — search errors will now report to Sentry"
tech-stack:
  added: []
  patterns:
    - "Sentry beforeSend reuses redact() from logger.ts (no PII_KEYS duplication)"
    - "Sentry.replayIntegration with maskAllText/maskAllInputs/blockAllMedia"
    - "Defense-in-depth: outer Sentry.ErrorBoundary + inner UX ErrorBoundary"
    - "Reactive Sentry.setTag via useEffect on scope.id/scope.kind change"
key-files:
  created:
    - "src/components/admin/SessionReplayToggle.tsx (57 lines)"
    - "src/components/admin/SessionReplayToggle.test.tsx (44 lines, 3 tests)"
    - ".planning/phases/04-dashboards-quality-polish/deferred-items.md"
  modified:
    - "src/main.tsx (5 → 44 lines) — Sentry.init before createRoot"
    - "src/App.tsx (343 → 354 lines) — Sentry.ErrorBoundary wrap"
    - "src/app/providers/ScopeProvider.tsx (237 → 248 lines) — scope tags useEffect"
    - "src/pages/AdminDashboard.tsx (+9 lines) — Observabilidade section"
    - ".env.example (+8 lines) — VITE_SENTRY_DSN placeholder"
decisions:
  - "redact() reused (NOT redefined) — single source of truth in src/lib/logger.ts"
  - "Replay default OFF (replaysSessionSampleRate: 0) is a QUAL-06 lock; replayIntegration pre-configured with maskAllText/maskAllInputs/blockAllMedia so toggling ON does not leak content"
  - "event.user reduced to {id} (strips email/name); breadcrumbs.data scrubbed as belt-and-suspenders against PII in fetch payloads"
  - "Defense-in-depth: outer Sentry.ErrorBoundary captures + reports; inner ErrorBoundary still renders the existing fallback UI so user-facing UX is unchanged"
  - "SessionReplayToggle is local component state (not persisted) — Phase 4 D-04 deferred server-side persistence to a future iteration"
metrics:
  duration: "6.3 min"
  completed: "2026-04-29"
  tasks_completed: 3
  files_touched: 7
  tests_added: 3
  tests_total_after: 557
  commits:
    - "7ed8f2c feat(04-01): wire Sentry init in main.tsx with PII-safe beforeSend"
    - "0624032 feat(04-01): wrap app tree with Sentry.ErrorBoundary + scope tags"
    - "1a2962a test(04-01): add failing test for SessionReplayToggle (RED)"
    - "191d9a7 feat(04-01): add SessionReplayToggle component + mount in AdminDashboard (GREEN)"
---

# Phase 4 Plan 01: Sentry Foundation — Summary

Activated Sentry observability with PII scrubbing on day one. Reuses `redact()` from `src/lib/logger.ts` as the single source of truth for PII rules; replay defaults OFF and masks all content when toggled ON. Foundation for Phase 4 — all subsequent plans (04-02..04-08) emit PII-scrubbed events to Sentry.

## What Shipped

### Task 1 — Sentry init in main.tsx + .env.example (commit 7ed8f2c)

`src/main.tsx` extended from 5 to 44 lines. `Sentry.init()` runs **before** `createRoot`, so any error during React mount is captured. Configuration locked per QUAL-06:

- `enabled: !import.meta.env.DEV && Boolean(import.meta.env.VITE_SENTRY_DSN)` — graceful no-op in dev or when DSN absent
- `replaysSessionSampleRate: 0` and `replaysOnErrorSampleRate: 0` — replay is OFF until the admin toggle flips it
- `Sentry.replayIntegration({ maskAllText: true, maskAllInputs: true, blockAllMedia: true })` — pre-configured so even if replay starts later, no PII leaks
- `beforeSend` imports `redact` from `src/lib/logger.ts` and runs it over `event.request`, `event.extra`, and `event.breadcrumbs[].data`. `event.user` is reduced to `{ id }` only — email/full_name never reach Sentry.

`.env.example` documents `VITE_SENTRY_DSN=` (empty in dev keeps Sentry disabled).

### Task 2 — Sentry.ErrorBoundary wrap + scope tags (commit 0624032)

`src/App.tsx`: wrapped the existing `<ErrorBoundary>` tree with `<Sentry.ErrorBoundary>`. Defense-in-depth — the inner boundary still renders the existing user-facing fallback UI; the outer boundary is the safety net that captures the event into Sentry. Render errors that escape the inner boundary still get reported.

`src/app/providers/ScopeProvider.tsx`: new `useEffect` keyed on `scope?.id` and `scope?.kind` calls `Sentry.setTag('scope_id', ...)` and `Sentry.setTag('scope_kind', ...)` whenever scope resolves or changes. Subsequent Sentry events carry these tags so debugging can be filtered per company/group without leaking identity (UUIDs + literal `'company' | 'group'` are non-PII).

### Task 3 — SessionReplayToggle component (RED commit 1a2962a, GREEN commit 191d9a7)

TDD cycle:

- **RED:** wrote `src/components/admin/SessionReplayToggle.test.tsx` first with 3 tests (default OFF / ON shows warning + starts replay / OFF hides warning + stops replay) using a mocked `Sentry.getReplay()`. Confirmed test fails because component does not exist.
- **GREEN:** created `src/components/admin/SessionReplayToggle.tsx` (57 lines): shadcn `Switch` primitive, `useState(false)` default, `Sentry.getReplay()?.start()`/`stop()` on toggle, warning banner with exact UI-SPEC copy when enabled.
- Mounted in `src/pages/AdminDashboard.tsx` under a new "Observabilidade" section (eyebrow uppercase + subtle, matching dashboard typography conventions).

## Verification

| Check | Result |
|-------|--------|
| `grep "PII_KEYS" src/main.tsx` | **0 matches** (not duplicated — reuses logger's set) |
| `grep "redact" src/main.tsx` | 7 matches (import + 4 usage sites + comments) |
| `grep "Sentry.setTag" src/app/providers/ScopeProvider.tsx` | 2 matches (scope_id + scope_kind) |
| `grep "Sentry.ErrorBoundary" src/App.tsx` | 3 matches (open + close + comment) |
| `grep "replaysSessionSampleRate: 0" src/main.tsx` | 1 match (QUAL-06 default OFF lock) |
| `grep "maskAllText: true" src/main.tsx` | 1 match |
| `grep "VITE_SENTRY_DSN" .env.example` | 1 match |
| `grep "useState(false)" src/components/admin/SessionReplayToggle.tsx` | 1 match (default OFF lock) |
| `grep "<SessionReplayToggle" src/pages/AdminDashboard.tsx` | 1 match (mounted in admin) |
| Exact UI-SPEC copy for Replay Active warning | match |
| `npm test` (full suite) | **557 passed (557)** — no regressions; 3 new tests added |
| `npm test -- src/components/admin/SessionReplayToggle.test.tsx` | **3 passed (3)** |
| Existing scope tests (`tests/scope/*`) | 8/8 still green |
| `npm run lint` on touched files | 0 new errors / 0 new warnings (1 pre-existing fast-refresh warning unchanged) |

## Test Output (new toggle test)

```
RUN  v3.2.4 /Users/eryk/Documents/APP LEVER TALETS/leverup-talent-hub

 ✓ src/components/admin/SessionReplayToggle.test.tsx (3 tests) 53ms

 Test Files  1 passed (1)
      Tests  3 passed (3)
```

## Threat Model Confirmation

| Threat ID | Disposition | Mitigation Confirmed |
|-----------|-------------|---------------------|
| T-04-01-01 (PII to Sentry) | mitigate | `beforeSend` imports `redact` from `src/lib/logger.ts`; `event.user` reduced to `{id}`; breadcrumbs.data scrubbed; **PII_KEYS not duplicated in main.tsx (verified 0)** |
| T-04-01-02 (Replay leakage) | mitigate | `replaysSessionSampleRate: 0` (default OFF); `maskAllText/maskAllInputs/blockAllMedia` pre-configured so toggle ON does not leak |
| T-04-01-03 (Scope tag exposure) | accept | `scope_id` (UUID) + `scope_kind` (`'company' | 'group'`) are non-PII identifiers |
| T-04-01-04 (Replay toggle tampering) | accept | Local component state in admin UI; admin path is gated by `ProtectedRoute` |
| T-04-01-05 (Sentry quota DoS) | accept | `tracesSampleRate: 0.1` limits volume; replay default OFF prevents quota burn |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Resolved react-hooks/exhaustive-deps lint warning on new useEffect**
- **Found during:** Task 2 lint pass
- **Issue:** New `useEffect` referenced `scope` but listed `scope?.id`/`scope?.kind` as deps; lint flagged missing `scope` dependency
- **Fix:** Added `// eslint-disable-next-line react-hooks/exhaustive-deps` directive matching the pre-existing pattern in the same file (line 151 of original). The deps are intentional — we only want to re-emit tags when scope identity changes, not when companyIds/name change.
- **Files modified:** src/app/providers/ScopeProvider.tsx
- **Commit:** 0624032

### Auth Gates

None — Sentry DSN is an env var, not an interactive auth flow.

## Deferred Issues

Tracked in `.planning/phases/04-dashboards-quality-polish/deferred-items.md`:

1. **`useUserResponseIds` build break in `ClimateAnswerDialog.tsx`** — pre-existing import/export mismatch in the Climate module (commit `ffb6b0a`, long before Phase 4). Causes `npm run build` to fail with rollup error. Not introduced by Sentry init; out of scope for this plan. `npm test` and `tsc --noEmit -p tsconfig.app.json` still work.
2. **179 pre-existing tsc errors** — same backlog STATE.md flagged after Plan 02-04. Plans 04-04, 04-06, 04-07 will likely retire many as they touch the relevant files.

Plan 04-01 added zero new tsc errors and zero new build errors.

## Known Stubs

None. The toggle is intentionally local state for this rev (Phase 4 D-04 deferred server-side persistence) — documented in the component's JSDoc and in the Decisions section above. This is not a stub; it's an explicit design choice with a future iteration path.

## TDD Gate Compliance

Task 3 followed RED → GREEN cycle:

- **RED commit (1a2962a):** `test(04-01): add failing test for SessionReplayToggle (RED)` — test file created first; failed because component did not exist.
- **GREEN commit (191d9a7):** `feat(04-01): add SessionReplayToggle component + mount in AdminDashboard (GREEN)` — implementation passes all 3 tests.
- **REFACTOR:** Not needed — component is clean and matches UI-SPEC contract.

## Self-Check: PASSED

Verified files and commits exist:

```
[ -f src/main.tsx ] && FOUND
[ -f .env.example ] && FOUND
[ -f src/App.tsx ] && FOUND
[ -f src/app/providers/ScopeProvider.tsx ] && FOUND
[ -f src/components/admin/SessionReplayToggle.tsx ] && FOUND
[ -f src/components/admin/SessionReplayToggle.test.tsx ] && FOUND
[ -f src/pages/AdminDashboard.tsx ] && FOUND

git log --oneline | grep 7ed8f2c → FOUND
git log --oneline | grep 0624032 → FOUND
git log --oneline | grep 1a2962a → FOUND
git log --oneline | grep 191d9a7 → FOUND
```
