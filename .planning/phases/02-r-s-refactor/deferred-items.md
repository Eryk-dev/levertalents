# Phase 2 — Deferred Items (out-of-scope auto-fix discoveries)

Items found during execution that are NOT part of the current task's changes.
Documented here per executor scope boundary rule.

---

## Plan 02-01 (Wave 0 test scaffolding)

### Pre-existing TypeScript errors (42 errors, unrelated to test scaffolding)

`npx tsc --noEmit -p tsconfig.app.json` returns 42 errors in pre-existing source
files BEFORE this plan ran. None of them touch `tests/hiring/` or
`tests/lib/supabaseError.test.ts` (the files created in Plan 02-01).

**Sample categories:**
- `lucide-react` icon prop typing in `src/pages/hiring/PublicJobOpening.tsx`
  (multiple lines: 247, 385, 393) — type widening from string|number to number.
- `src/pages/Index.tsx` lines 366-400: `target_date` and `full_name` properties
  missing from inferred Supabase select shape (PostgREST embed disambiguation).

**Not blocking Plan 02-01:** the test skeletons compile cleanly and the test
suite runs (`npm test` exits 0 with all new tests as `skipped`/`todo`).

**Recommended owner:** Plan 02-09 (refactor split of CandidateProfile + drawer)
or Plan 02-08 (UI inline filters + JobCard sparkbar) when those files are
touched. Document if the icon-typing comes from the `lucide-react` major
upgrade and pin if needed.
