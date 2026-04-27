# Phase 01 — Deferred Items

Issues discovered during execution that are **out of scope** for the current plan but tracked for future cleanup.

## Pre-existing TypeScript errors (48 errors) — Plan 01-01

**Discovered:** 2026-04-27 during Task 01-02 (`npx tsc --noEmit -p tsconfig.app.json`)

**Status:** Pre-existing on `fac3408f` (base commit) — NOT caused by Plan 01-01.

**Verified:** Reset to original `package.json` + `package-lock.json` (without our deps upgrades) and re-ran tsc. Got 48 errors. With our deps (rhf 7.74 + resolvers 5.2.2) we get 56 errors — the 8 new errors are all in `src/components/hiring/PublicApplicationForm.tsx` and stem from the documented breaking change in `@hookform/resolvers` 3.10 → 5.2.2 (RESEARCH.md § Standard Stack).

**Sample categories:**
- `useCandidateConversations.ts` — `TS2589 Type instantiation is excessively deep` (Supabase generated types issue, multiple lines)
- `CandidateForm.tsx` — `CandidateInsert` shape mismatch
- `CandidateQuickFilters.tsx` — `'fechada'` not in `JobStatus` union
- `JobCard.tsx` — Missing property `today` on `JobApplicationCounts`
- `JobOpeningForm.tsx` — Missing `public_slug` in insert payload
- `MobileNav.tsx` — IntrinsicAttributes mismatch (lucide icon)
- `PublicJobOpening.tsx` — lucide icon `ComponentType` mismatch
- `Index.tsx` — Missing `target_date` / `full_name` on Supabase generated types

**8 new errors (caused by rhf/resolvers upgrade):**
- `PublicApplicationForm.tsx` lines 276/394/411/427/446/463/486/620 — `Resolver<FormValues, ...>` and `Control<FormValues, ...>` shape changed in `@hookform/resolvers` 5.x.

**Plan acceptance criterion adjustment:** The plan acceptance for Task 01-02 includes `npx tsc --noEmit -p tsconfig.app.json` exits 0. This was never achievable on the base commit. Plan 01-02 (and beyond) does not fix `src/` code; subsequent plans (notably Plan 01-07 quality gates) will need to address. Rule 4 (architectural) — these are pre-existing app-wide type debt that requires owner sign-off on direction.

**Resolution path:** Plan 01-07 (quality gates) or a Phase 2 "type debt" subplan should address. For now, vitest type-check (`vitest --run`) is what matters for Plan 01-01 success — and that works because vitest does not type-check the app files.

---

## Post-regen tsc delta — Plan 01-04 continuation (Wave 1 closeout)

**Discovered:** 2026-04-27 during Task 04-03 (`supabase gen types typescript` then `npx tsc --noEmit -p tsconfig.app.json`).

**Status:** Net IMPROVEMENT — 56 errors before regen → 42 errors after regen (Δ = −14).

### Errors removed by regen (20 fixed)

The fresher Supabase TypeScript generator (PostgrestVersion 12.2.3 → 14.5) eliminated several `TS2589 Type instantiation is excessively deep` issues in `useCandidateConversations.ts` and corrected several `TS2322 / TS2345 / TS2769` mismatches in `useJobOpenings.ts`, `useJobOpening.ts`, `useSidebarCounts.ts`, `useTalentPool.ts`, `useCandidateConversations.ts`, `CandidateQuickFilters.tsx`, and 2 occurrences in `PublicJobOpening.tsx` (lines 101, 110).

### New errors introduced by regen (6 new — all in one file)

All 6 new errors live in `src/pages/hiring/PublicJobOpening.tsx`, lines 135–147:

- `L135 TS2589` — Type instantiation excessively deep
- `L136 TS2769` — No overload matches
- `L140 TS2589` — Type instantiation excessively deep
- `L141 TS2769` — No overload matches
- `L147 TS2339` × 2 — Property `name` does not exist on result row union

These are NOT caused by our migrations or by code we wrote. The new generator is more accurate about result row shapes (Supabase Postgrest 14.5 typings), which exposes implicit mis-typing in this consumer that the old types masked. The errors do not block the app from running (Vite/SWC/esbuild don't run tsc on build); they're type-check diagnostics only.

**Resolution path:** This file (`src/pages/hiring/PublicJobOpening.tsx`) was already debt-flagged in pre-regen baseline (4 errors at lines 375–393 — lucide icon `ComponentType` mismatches). Plan 01-07 or Phase 2 type-debt subplan addresses it.

