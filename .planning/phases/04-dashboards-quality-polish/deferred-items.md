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
