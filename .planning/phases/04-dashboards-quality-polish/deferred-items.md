# Phase 04 — Deferred Items

Items discovered during execution but out-of-scope for the current plan. To be addressed in a follow-up plan or later wave.

---

## From Plan 04-01 (Sentry Foundation)

### `useUserResponseIds` not exported by `useClimateSurveys.ts` (build-blocking — pre-existing)

- **Discovered during:** Task 1 (`npm run build` smoke test)
- **File:** `src/components/ClimateAnswerDialog.tsx` line 9 imports `useUserResponseIds` from `@/hooks/useClimateSurveys`, but the hook is NOT exported in that module
- **Pre-existence:** This file was last touched in commit `ffb6b0a feat(climate): CRUD de perguntas e fluxo de resposta` — long before Phase 4. The mismatch existed before Plan 04-01 started; not introduced by Sentry init.
- **Impact:** `npm run build` fails with rollup error during module transformation. `npm test` and `tsc --noEmit -p tsconfig.app.json` still work because vitest/tsc skip the broken module gracefully.
- **Why deferred:** Per plan SCOPE BOUNDARY, only fix issues directly caused by current task changes. This is a Climate-module bug unrelated to Sentry.
- **Suggested owner:** Phase 4 polish or a Climate-area patch; whoever next touches `ClimateAnswerDialog.tsx` should either remove the import or add the missing hook to `useClimateSurveys.ts`.

### Pre-existing tsc errors (179 total)

- **Discovered during:** Task 1 build verification
- **Source:** Same backlog documented in STATE.md after Plan 02-04 (`38 latent tsc errors revealed by regen ... documented in deferred-items.md with owners (Plans 02-05 to 02-09). Were latent before (masked by declaration merging)`). The number has grown since to 179 — Plans 03-XX added more files.
- **Phase 4 contribution:** Zero. Plan 04-01 added no new tsc errors (verified: `tsc --noEmit -p tsconfig.app.json | grep -E "main\.tsx|logger\.ts"` returns empty).
- **Why deferred:** Out of scope for foundation plan; Plans 04-04 (SocioDashboard refactor), 04-06 (component splits), and 04-07 (test infra) will likely retire many of these as they touch the relevant files.

---

## From Plan 04-03 (Schema Push Additive)

### types.ts regen produced ZERO net new tsc errors (104 → 104)

- **Discovered during:** Task 1 build verification post-regen
- **Verification:** `git stash && tsc --noEmit | grep -cE "error TS"` returned **104** pre-regen; post-regen returned **104**. Net delta = 0.
- **Critical paths (`src/integrations/`, `src/lib/`, `src/app/`) remain TS-clean** post-regen — same gating standard established in Plan 02-04.
- **Pre-existing build break (rollup):** `src/components/ClimateAnswerDialog.tsx` import of `useUserResponseIds` is the same Phase 4 issue logged from Plan 04-01 above; unchanged by Plan 04-03 regen.
- **CmdKPalette.tsx still calls `global_search` with 2-arg signature** — runtime will fail until Plan 05 refactor lands. Pre-mitigated by threat model T-04-03-03: deploy CmdKPalette refactor before user-facing build.

---

## From Plan 04-05 (CmdK Palette Refactor)

### `src/pages/RHDashboard.tsx` ClimateOverview shape mismatch (~20 tsc errors)

- **Discovered during:** Task 1 typecheck verification
- **File:** `src/pages/RHDashboard.tsx` lines 141, 142, 147, 150, 176, 177, 285, 286, 289, 290, 292, 300, 302, 303 — references properties (`survey`, `participationRate`, `avgScore`, `distinctRespondents`, `totalEligible`) that no longer exist on the current `ClimateOverview` type (post-Phase-3 climate refactor likely renamed `survey` → `surveys` and removed flat aggregate fields).
- **Pre-existence:** RHDashboard was NOT touched by Plan 04-05 (which only modifies CmdKPalette). Errors pre-existed and are part of the 179-tsc-error backlog catalogued under Plan 04-01.
- **Phase 4 contribution from this plan:** Zero. `tsc --noEmit | grep CmdKPalette` returns empty after Plan 04-05.
- **Suggested owner:** A future polish plan that touches RHDashboard, or Plan 04-08 if the integration suite covers the RH dashboard surface.
