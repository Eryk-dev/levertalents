---
phase: 03-performance-refactor
plan: 11
subsystem: auth
tags: [react, supabase, whatsapp-onboarding, temp-password, first-login, protected-route, rtl, vitest]

# Dependency graph
requires:
  - phase: 03-07
    provides: useCreateUserWithTempPassword, useChangePassword hooks (Edge Function + profile flag flip)
  - phase: 03-performance-refactor
    provides: LeverArrow primitive, LinearKit primitives, useUserProfile hook

provides:
  - OnboardingMessageBlock (D-20 locked WhatsApp template + clipboard copy)
  - TempPasswordExpiredBanner (D-24 amber alert)
  - FirstLoginChangePasswordCard (LeverArrow + Zod 8-char/match validation)
  - FirstLoginChangePassword page (blocking, no Layout)
  - ProtectedRoute extended with must_change_password gate (D-23)
  - App.tsx route /first-login-change-password (line 307, outside Layout)
  - CreateUser.tsx refactored: Edge Function hook + post-success OnboardingMessageBlock

affects:
  - Any future plan touching ProtectedRoute or auth flow
  - CreateUser page users (AUTH-01/02/03 flows)
  - First-login UX (AUTH-03)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pitfall §4 anti-loop guard: ProtectedRoute useEffect skips navigate when location.pathname === FIRST_LOGIN_PATH"
    - "Pitfall §9 cache-invalidation-before-navigate: useChangePassword.onSuccess invalidates userProfile, 200ms settle before navigate"
    - "Pitfall §12 ephemeral tempPassword: stored only in local state, cleared via setResult(null) before navigate"
    - "D-20 locked template: buildMessage() function with 4 interpolations only, verbatim copy enforced"

key-files:
  created:
    - src/components/OnboardingMessageBlock.tsx
    - src/components/TempPasswordExpiredBanner.tsx
    - src/components/FirstLoginChangePasswordCard.tsx
    - src/pages/FirstLoginChangePassword.tsx
    - src/components/__tests__/OnboardingMessageBlock.test.tsx
    - src/components/__tests__/ProtectedRoute.test.tsx
    - src/pages/__tests__/FirstLoginChangePassword.test.tsx
    - src/pages/__tests__/CreateUser.test.tsx
  modified:
    - src/components/ProtectedRoute.tsx
    - src/pages/CreateUser.tsx
    - src/App.tsx

key-decisions:
  - "ProtectedRoute made allowedRoles optional to support /first-login-change-password (no role restriction needed)"
  - "CreateUser keeps company/team/leader selects from original (preserves existing functionality); adds defaultValues role=liderado to prevent silent Zod validation failure"
  - "/first-login-change-password placed outside the Layout route wrapper — page is intentionally full-screen blocking without sidebar/header"
  - "useUserProfile returns { data, isLoading } (standard useQuery); plan code used { profile } alias — adjusted throughout"

patterns-established:
  - "must_change_password gate: useEffect in ProtectedRoute, not in render path"
  - "D-20 template: buildMessage() helper isolates interpolation from render"

requirements-completed: [AUTH-01, AUTH-02, AUTH-03, PERF-04, ONE-03, ONE-06]

# Metrics
duration: 30min
completed: 2026-04-28
---

# Phase 03 Plan 11: Onboarding WhatsApp + First-login Flow + ProtectedRoute Gate Summary

**WhatsApp onboarding message (D-20 locked template) + blocking first-login password change page (AUTH-03) + ProtectedRoute must_change_password redirect gate (D-23) wired into CreateUser via Edge Function hook**

## Performance

- **Duration:** ~30 min
- **Started:** 2026-04-28T17:15:00Z
- **Completed:** 2026-04-28T17:23:00Z
- **Tasks:** 3
- **Files modified:** 11 (3 new components + 1 new page + 4 RTL test files + ProtectedRoute + CreateUser + App.tsx)

## Accomplishments

- `OnboardingMessageBlock` renders D-20 locked WhatsApp template with 4 interpolations; Clipboard API copy + 1.2s "Copiado ✓" flash (AUTH-02)
- `FirstLoginChangePasswordCard` uses `LeverArrow` primitive (never Lucide), Zod schema enforcing 8-char min + match, calls `useChangePassword` hook, navigates to `/` after 200ms cache settle (Pitfall §9)
- `ProtectedRoute` extended with `useEffect` gate: reads `profile.must_change_password` from `useUserProfile`, redirects to `/first-login-change-password` unless already there (Pitfall §4 anti-loop); `allowedRoles` made optional
- `CreateUser.tsx` rewritten: password field removed, calls `useCreateUserWithTempPassword` Edge Function hook, renders `OnboardingMessageBlock` post-success, clears tempPassword on Concluir (Pitfall §12)
- App.tsx Route `/first-login-change-password` added at line 307 outside Layout wrapper (blocking full-screen page)
- 9 RTL tests across 4 files — all green

## Task Commits

1. **Task 1: OnboardingMessageBlock + TempPasswordExpiredBanner + FirstLoginChangePasswordCard** - `463254e` (feat)
2. **Task 2: ProtectedRoute + FirstLoginChangePassword page + App.tsx route + RTL tests** - `31eb692` (feat)
3. **Task 3: Refactor CreateUser — Edge Function hook + OnboardingMessageBlock post-success** - `568a32f` (feat)

## Files Created/Modified

- `src/components/OnboardingMessageBlock.tsx` — D-20 locked template, clipboard copy, 1.2s flash
- `src/components/TempPasswordExpiredBanner.tsx` — amber banner for expired temp passwords (D-24)
- `src/components/FirstLoginChangePasswordCard.tsx` — LeverArrow + 2-field form + Zod validation + useChangePassword
- `src/pages/FirstLoginChangePassword.tsx` — blocking page; derives expired flag from temp_password_expires_at (D-24)
- `src/components/ProtectedRoute.tsx` — extended: must_change_password gate via useEffect + allowedRoles made optional
- `src/pages/CreateUser.tsx` — refactored: removed password field + old create-user Edge Function; 352 lines (kept company/team/leader selects)
- `src/App.tsx` — Route /first-login-change-password at line 307 (outside Layout, inside ProtectedRoute)
- `src/components/__tests__/OnboardingMessageBlock.test.tsx` — 2 tests: template interpolation + clipboard (INV-3-16)
- `src/components/__tests__/ProtectedRoute.test.tsx` — 3 tests: redirect, no-loop, normal render (INV-3-17)
- `src/pages/__tests__/FirstLoginChangePassword.test.tsx` — 2 tests: no banner, amber banner (INV-3-18)
- `src/pages/__tests__/CreateUser.test.tsx` — 2 tests: no password field, OnboardingMessageBlock post-success

## Decisions Made

- `allowedRoles` in ProtectedRoute changed from required to optional — the `/first-login-change-password` route only needs auth, no role restriction
- `defaultValues: { role: 'liderado' }` added to CreateUser form — without it, Zod enum validation silently blocks submit when user doesn't interact with the Select
- `/first-login-change-password` route placed OUTSIDE the `<Route element={<Layout />}>` wrapper — page intentionally has no sidebar/header (blocking full-screen UX per plan spec)
- `useUserProfile` returns `{ data, isLoading }` (standard TanStack useQuery shape) — plan code used `{ profile }` alias which doesn't exist; fixed to use `data` throughout

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Added defaultValues.role = 'liderado' to CreateUser form**
- **Found during:** Task 3 — RTL test failure (form submitted without triggering onSubmit)
- **Issue:** Zod enum field `role` had no default value; Radix Select couldn't be pre-filled; form validation silently blocked submit
- **Fix:** Added `defaultValues: { role: 'liderado' }` to `useForm`
- **Files modified:** `src/pages/CreateUser.tsx`
- **Verification:** RTL test "shows OnboardingMessageBlock after success" passes
- **Committed in:** `568a32f` (Task 3 commit)

**2. [Rule 2 - Missing Critical] allowedRoles made optional in ProtectedRoute**
- **Found during:** Task 2 — adding `/first-login-change-password` route without a role restriction
- **Issue:** Original ProtectedRoute required `allowedRoles: string[]`; the new route doesn't restrict by role (any authenticated user can hit first-login)
- **Fix:** Changed interface to `allowedRoles?: string[]`; role check gated on `allowedRoles && allowedRoles.length > 0`
- **Files modified:** `src/components/ProtectedRoute.tsx`
- **Verification:** RTL tests for redirect/no-loop/normal-render all pass; existing routes unaffected (they still pass allowedRoles)
- **Committed in:** `31eb692` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 bug, 1 missing critical)
**Impact on plan:** Both fixes necessary for correctness. No scope creep.

## Issues Encountered

- `tsc --noEmit file.tsx` (without project tsconfig) produces spurious `--jsx` and module resolution errors when given explicit file paths; resolved by running `tsc --noEmit` (uses tsconfig.json) — zero real errors in all three tasks.

## Coverage

- **AUTH-01** (RH cria pessoa via Edge Function): CreateUser.tsx refactored — confirmed
- **AUTH-02** (mensagem WhatsApp pronta + botão Copiar): OnboardingMessageBlock + RTL test — confirmed
- **AUTH-03** (senha temp 24h + força troca): FirstLoginChangePasswordCard + FirstLoginChangePassword page — confirmed
- **D-20** (locked template): `buildMessage()` verbatim — confirmed
- **D-22** (profiles.must_change_password): read in ProtectedRoute + FirstLoginChangePassword — confirmed
- **D-23** (tela bloqueante redirect): ProtectedRoute useEffect gate — confirmed
- **D-24** (expirada = entra + força troca): expired flag derived from temp_password_expires_at + amber banner — confirmed
- **Pitfall §4** (anti-loop): `location.pathname !== FIRST_LOGIN_PATH` guard in useEffect — confirmed
- **Pitfall §9** (cache invalidation): 200ms await before navigate in FirstLoginChangePasswordCard — confirmed
- **Pitfall §12** (tempPassword ephemeral): local state cleared on Concluir — confirmed
- **T-3-05** (ProtectedRoute bypass): gate applies to ALL routes, not just specific ones — confirmed

## Self-Check

- `OnboardingMessageBlock.tsx` exists: FOUND
- `TempPasswordExpiredBanner.tsx` exists: FOUND
- `FirstLoginChangePasswordCard.tsx` exists: FOUND
- `FirstLoginChangePassword.tsx` exists: FOUND
- `ProtectedRoute.tsx` contains `must_change_password`: FOUND
- `App.tsx` contains `/first-login-change-password`: FOUND
- `CreateUser.tsx` contains `useCreateUserWithTempPassword`: FOUND
- All 4 test files exist: FOUND
- Commit `463254e` (Task 1): FOUND
- Commit `31eb692` (Task 2): FOUND
- Commit `568a32f` (Task 3): FOUND

## Self-Check: PASSED

## Next Phase Readiness

- All AUTH-01/02/03 requirements delivered — first-login flow is complete end-to-end
- Phase 3 Wave 4 UI complete — gateway for `/gsd-verify-work`
- No blockers identified

---
*Phase: 03-performance-refactor*
*Completed: 2026-04-28*
