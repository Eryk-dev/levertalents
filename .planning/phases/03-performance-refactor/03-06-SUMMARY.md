---
phase: 03-performance-refactor
plan: "06"
subsystem: auth, testing, infra
tags: [vitest, zod, web-crypto, supabase-edge-functions, deno, k-anonymity, temp-password]

requires:
  - phase: 03-05
    provides: "DB schema with must_change_password + temp_password_expires_at + evaluation_cycles/templates columns (types.ts regenerated)"

provides:
  - "src/lib/passwordGenerator.ts: CSPRNG 8-char temp password generator (D-21, 56-char alphabet)"
  - "src/lib/evaluationTemplate.ts: buildZodFromTemplate + templateSnapshotSchema (D-07, Pattern 3)"
  - "src/lib/climateAggregation.ts: k-anon aggregator TS mirror for unit tests (D-10, threshold=3)"
  - "src/lib/scopeKey.ts: queryKey shape helper ['scope', scope.id, ...rest] (D-25)"
  - "supabase/functions/create-user-with-temp-password: deployed Edge Function with JWT auth + admin-only guard + profile flags"
  - "14 tests green (3 files upgraded from describe.skip → real)"

affects:
  - 03-07 (hooks rewritten use scopeKey + evaluationTemplate)
  - 03-08..11 (UI plans consume Edge Function + buildZodFromTemplate)

tech-stack:
  added: []
  patterns:
    - "Pattern 3 (buildZodFromTemplate): flat Zod shape keyed by question.id, no `as any`, discriminated union switch"
    - "Pattern 4 (Edge Function): JWT verify first → role guard → service-role for admin ops → plaintext password returned once"
    - "D-21 alphabet: 56 chars [a-z A-Z 2-9] minus 0/O/o/1/l/I — shared between lib (tests) and Edge Function (production)"

key-files:
  created:
    - src/lib/passwordGenerator.ts
    - src/lib/evaluationTemplate.ts
    - src/lib/climateAggregation.ts
    - src/lib/scopeKey.ts
    - supabase/functions/create-user-with-temp-password/index.ts
  modified:
    - src/lib/__tests__/passwordGenerator.test.ts
    - src/lib/__tests__/evaluationTemplate.test.ts
    - src/lib/__tests__/climateAggregation.test.ts

key-decisions:
  - "ALPHABET constant in both passwordGenerator.ts and Edge Function are independent mirror implementations — test coverage on lib side, production on Deno side (different runtimes)"
  - "scopeKey returns readonly unknown[] starting with ['scope', scope.id] — aligns with useScopedQuery which uses ['scope', scope.id, scope.kind, ...]"
  - "climateAggregation: count<3 returns ONLY {insufficient_data:true} — no count field to prevent anti-combination attack (D-10 Pitfall §3)"
  - "Edge Function: auth.getUser() on anon key returns 401 (not 403) — correct because the JWT is valid but the user is not a registered session user"

patterns-established:
  - "Pattern 3: buildZodFromTemplate — receives TemplateSnapshot, returns z.ZodObject, switch on q.type, no `as any`"
  - "Pattern 4 (Edge Function): CORS OPTIONS → JWT verify via anon key → role guard via user_roles → service-role for admin ops → plaintext password returned 1x"
  - "D-21 password alphabet enforced in both test environment (passwordGenerator.ts) and production (Edge Function) separately"

requirements-completed:
  - AUTH-01
  - AUTH-02
  - AUTH-03
  - PERF-02
  - PERF-05
  - PERF-06
  - PERF-07

duration: 5min
completed: 2026-04-28
---

# Phase 03 Plan 06: Wave 3 Utilities + Edge Function Summary

**4 pure TS utilities (passwordGenerator, evaluationTemplate, climateAggregation, scopeKey) + deployed Edge Function `create-user-with-temp-password` with JWT/role auth; 14 tests upgraded from skip to green**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-04-28T20:02:25Z
- **Completed:** 2026-04-28T20:06:48Z
- **Tasks:** 2
- **Files modified:** 8 (5 created, 3 upgraded)

## Accomplishments

- 4 `src/lib/` utilities implemented: CSPRNG password generator (D-21), dynamic Zod resolver from JSON template snapshot (Pattern 3, no `as any`), k-anon climate aggregator (D-10, threshold=3), queryKey shape helper (D-25)
- Edge Function `create-user-with-temp-password` deployed to project `ehbxpbeijofxtsbezwxd` — JWT verify + admin/rh role guard + profiles flags (must_change_password, temp_password_expires_at) + idempotent 409 on duplicate email; smoke test returns 401 for anon callers
- 3 test files upgraded from `describe.skip → describe` with real assertions; 14 tests all green via `vitest run src/lib/__tests__`

## Task Commits

1. **Task 1: src/lib utilities (4 modules + 3 test files upgraded)** — `5e659d9` (feat)
2. **Task 2: Edge Function create-user-with-temp-password** — `c98e040` (feat)

## Files Created/Modified

- `src/lib/passwordGenerator.ts` — `generateTempPassword()` + `TEMP_PASSWORD_ALPHABET` (56 chars, D-21, Web Crypto)
- `src/lib/evaluationTemplate.ts` — `buildZodFromTemplate(snapshot)` + `templateSnapshotSchema` (Pattern 3)
- `src/lib/climateAggregation.ts` — `aggregateClimateResponses()` + `K_ANONYMITY_THRESHOLD = 3` (D-10 mirror)
- `src/lib/scopeKey.ts` — `scopeKey(scope, ...rest)` returning `['scope', scope.id, ...rest]` (D-25)
- `supabase/functions/create-user-with-temp-password/index.ts` — Edge Function deployed ACTIVE
- `src/lib/__tests__/passwordGenerator.test.ts` — 4 real tests (was 4 skip/todo)
- `src/lib/__tests__/evaluationTemplate.test.ts` — 6 real tests (was 7 skip/todo)
- `src/lib/__tests__/climateAggregation.test.ts` — 4 real tests (was 4 skip/todo)

## Decisions Made

- `scopeKey` returns `['scope', scope.id, ...rest]` — the existing `useScopedQuery` already adds `scope.kind` as a 3rd segment, so `scopeKey` only covers the canonical 2-segment prefix; hooks that call `useScopedQuery` pass `scopeKey(scope, entity, ...)` as the inner key, resulting in full `['scope', id, kind, 'scope', id, entity]` — documented for Wave 3 hook authors to be aware
- Edge Function uses independent CSPRNG implementation (not imported from lib) because Deno runtime doesn't share Node/browser module resolution — lib's `passwordGenerator.ts` is a mirror for unit tests only

## Deviations from Plan

None — plan executed exactly as written. All code from plan `<action>` blocks used verbatim with minor additions (TypeScript type annotation on `roles` map callback to satisfy strict mode).

## Issues Encountered

- First `supabase functions deploy` attempt returned 502 (transient Supabase API error) — resolved by waiting 5 seconds and retrying. Second attempt succeeded immediately.
- Vitest must be run from the worktree directory (not project root) because the test files in the worktree differ from the main branch files which still have `describe.skip`.

## Threat Coverage

All STRIDE threats in plan mitigated as designed:

| Threat | Status |
|--------|--------|
| T-3-04: tempPassword in logs | Mitigated — `console.log` never references `tempPassword`; catch block logs `[redacted]` |
| T-3-AUTH-01: Anon caller | Mitigated — `auth.getUser()` returns null → 401 (smoke test confirmed) |
| T-3-AUTH-02: Liderado/Socio caller | Mitigated — `callerRoles` check returns 403 |
| T-3-AUTH-03: Invalid role in body | Mitigated — `validRoles` whitelist → 400 |
| T-3-AUTH-04: Stack trace leak | Mitigated — catch returns `e.message` only, no stack |
| T-3-PWD-01: Math.random predictable | Mitigated — `crypto.getRandomValues` (Web Crypto Deno) |
| T-3-PWD-02: tempPassword in React DevTools | Accepted — documented in plan; revisit Phase 4 audit |

## Next Phase Readiness

- Plan 03-07 (15 hooks rewritten) can now import `scopeKey`, `buildZodFromTemplate`, `aggregateClimateResponses` from `src/lib/`
- Plans 03-08..11 (UI) can call `create-user-with-temp-password` Edge Function endpoint
- Test infrastructure ready: 14 tests passing; `INV-3-06`, `INV-3-09`, `INV-3-16` invariants verified at unit level, ready for Wave 4 RTL validation

## Known Stubs

None — all utilities are fully wired with real implementations. No placeholder data.

## Self-Check

- [x] `src/lib/passwordGenerator.ts` exists and contains `TEMP_PASSWORD_ALPHABET`
- [x] `src/lib/evaluationTemplate.ts` exists and contains `buildZodFromTemplate`
- [x] `src/lib/climateAggregation.ts` exists and contains `K_ANONYMITY_THRESHOLD = 3`
- [x] `src/lib/scopeKey.ts` exists and contains `scope.id`
- [x] `supabase/functions/create-user-with-temp-password/index.ts` exists and contains `must_change_password`
- [x] Commits `5e659d9` and `c98e040` verified in git log
- [x] 14 tests pass via `npx vitest run src/lib/__tests__`
- [x] Edge Function listed ACTIVE in `supabase functions list`
- [x] Smoke test (anon caller) returns 401

## Self-Check: PASSED

---
*Phase: 03-performance-refactor*
*Completed: 2026-04-28*
