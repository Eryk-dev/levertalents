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

---

## Plan 02-04 (Wave 2 schema push + types regen)

### Latent type-divergence errors revealed by `supabase gen types` regen

The pre-Plan 02-04 `hiring-types.ts` declared a `declare module "./types"`
augmentation block that overrode the auto-generated `Database` type with
hand-written shapes (created when the Supabase CLI was unavailable). Plan 02-04
regenerated `src/integrations/supabase/types.ts` from the linked remote
project. The auto-gen is now the canonical source of truth; the
declaration-merging block was removed because `type Database = { ... }` (auto-gen)
cannot be merged with `interface Database` via `declare module`.

Removing the augmentation revealed 40 latent tsc errors in hooks/components/pages
that were referencing hand-written shapes which had drifted from the real DB
schema. The plan's verification gate explicitly allows this: only
`src/integrations/`, `src/lib/`, and `src/app/` must be tsc-clean (they are);
hooks and components are scheduled for refactoring in Plans 02-05 through 02-09.

**Files with new (latent-revealed) errors:**
- `src/components/hiring/CandidateForm.tsx` — `cv_storage_path` required by auto-gen `CandidateInsert`
- `src/components/hiring/JobCard.tsx` — `JobApplicationCounts.today` property mismatch
- `src/components/hiring/JobOpeningForm.tsx` — `public_slug` required
- `src/components/hiring/PublicApplicationForm.tsx` (9 errors) — react-hook-form `Resolver`/`Control` generics
- `src/components/MobileNav.tsx` — lucide-react icon prop typing
- `src/hooks/hiring/useCulturalFit.ts` (2 errors) — `options: unknown` vs auto-gen `options?: Json`
- `src/hooks/hiring/useHiringMetrics.ts` (7 errors) — supabase querybuilder shape divergence
- `src/hooks/hiring/useOptimisticVersion.ts` (3 errors) — supabase querybuilder shape divergence
- `src/pages/hiring/JobOpeningDetail.tsx` (1 error)

**Recommended owners:**
- `useHiringMetrics.ts` + `useOptimisticVersion.ts` + `useCulturalFit.ts`: Plan 02-05/06 (hooks rewrite — Wave 3)
- `CandidateForm.tsx` + `JobOpeningForm.tsx` + `PublicApplicationForm.tsx`: Plan 02-08/09 (UI Wave 4)
- `JobCard.tsx`, `JobOpeningDetail.tsx`, `MobileNav.tsx`: Plan 02-08 (UI inline filters / drawer split)

These errors do NOT block Plan 02-04 completion. The Phase 2 schema is correct
on the remote and the regenerated types contain every Phase 2 artifact
(data_access_log, candidate_consents, active_candidate_consents,
read_candidate_with_log, the consent enums).

---

## Plan 02-05 (Wave 3 hooks core)

### Consumers usando shape antigo de useMoveApplicationStage args (4 errors)

Plan 02-05 reescreveu `useMoveApplicationStage` para o shape canonical
`MoveApplicationStageArgs` (`{ id, fromStage, toStage, jobId, companyId }`)
seguindo D-03 last-writer-wins (sem `expectedUpdatedAt` optimistic locking).

Os 4 consumers atuais ainda passam `expectedUpdatedAt` (campo agora removido
do tipo) e omitem `jobId` + `companyId` (campos agora obrigatorios). TS reporta:

```
src/components/hiring/AllCandidatesKanban.tsx(252,7): TS2353
src/components/hiring/CandidateDrawer.tsx(433,23): TS2353
src/components/hiring/CandidatesKanban.tsx(219,7): TS2353
src/pages/hiring/CandidateProfile.tsx(498,23): TS2353
```

**Recommended owners:**
- `CandidatesKanban.tsx` + `AllCandidatesKanban.tsx`: Plan 02-08 (UI Wave 4 -
  refactor kanban onDragEnd para canTransition + nova API; D-02)
- `CandidateDrawer.tsx`: Plan 02-08/09 (drawer split + decisao move flow)
- `CandidateProfile.tsx`: Plan 02-09 (split do CandidateProfile 1169 linhas)

Esses errors NAO bloqueiam Plan 02-05 — o plan explicitamente diz que apenas
`src/hooks/hiring/useApplications.ts` + `useApplicationsRealtime.ts` +
`useApplicationCountsByJob.ts` precisam ficar tsc-clean (estao). Plans 02-08
e 02-09 vao reescrever os call sites com o shape correto.
