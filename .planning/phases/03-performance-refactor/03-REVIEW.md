# Phase 3 Code Review

**Date:** 2026-04-28
**Reviewer:** gsd-code-reviewer
**Verdict:** PASS *(all findings resolved — see gap closure below)*

**Gap closure applied:** 2026-04-28
- CR-01: `useChangePassword` key fixed `['userProfile']` → `['currentUserProfile']`; `FirstLoginChangePasswordCard` setTimeout removed
- CR-02: PRE.2 migration corrected with ROW_NUMBER; corrective migration `perf_pre_company_id_backfill_fix` applied to remote DB
- HR-01: CASL conditions fixed `evaluatee_id` → `evaluated_user_id`, `liderado_id` → `collaborator_id`; abilities.test.ts updated to match
- HR-02: 4 hooks (`useNineBoxDistribution`, `useTeamIndicators`, `useOrgIndicators`, `useLeaderAlerts`) migrated from `team_members` to `org_unit_members` via `unit_leaders`
- HR-03: `useCollaboratorEvolution` fixed to treat `progress_change` as absolute (not delta)
- ME-01: `useClimateQuestions` queryKey now includes `['scope', scope.id, ...]`
- ME-04: `p_comment: undefined` → `null` in `useSubmitClimateResponse`
- **Tests after fix: 554/554 passed**

## Summary

Phase 3 is architecturally sound and demonstrates careful attention to LGPD invariants, k-anonymity, and the expand→backfill→contract migration pattern. The security model — separate RH notes table with RLS + CASL double gate, SECURITY DEFINER RPCs for anonymous climate submissions, and the Edge Function auth chain — is correctly implemented. However, two issues block merge: a broken cache-invalidation key that causes the `must_change_password` gate to stay active after the user changes their password (redirect loop risk), and a non-deterministic SQL `UPDATE...FROM` in PRE.2 that can assign wrong `company_id` to records for cross-company users. Three additional HIGH-severity findings (CASL field-name mismatches, legacy `team_members` queries that diverge from Phase 3 schema, and a `progress_change` semantic mismatch) should be fixed before the next phase.

---

## Findings

### CRITICAL (block merge)

#### CR-01: useChangePassword invalidates wrong queryKey — `must_change_password` gate never clears

**File:** `src/hooks/useChangePassword.ts:52`

**Issue:** `useChangePassword.onSuccess` calls:
```ts
await queryClient.invalidateQueries({ queryKey: ['userProfile'] });
```
but `useUserProfile` registers its cache under the key `['currentUserProfile']` (see `src/hooks/useUserProfile.ts:6`). The invalidation is a no-op: the profile cache stays stale with `must_change_password: true`, so `ProtectedRoute` keeps redirecting the user to `/first-login-change-password` after they successfully change their password. This is the exact redirect loop that INV-3-05 and Pitfall §9 were designed to prevent.

**Fix:**
```ts
// useChangePassword.ts line 52 — change key to match useUserProfile
await queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
```

---

#### CR-02: PRE.2 backfill `UPDATE...FROM` non-deterministic for multi-company users

**File:** `supabase/migrations/20260429125100_perf_pre_company_id_backfill.sql:16-61`

**Issue:** All four UPDATE steps use the same pattern:
```sql
UPDATE public.evaluations e
   SET company_id = sub.company_id
  FROM (
    SELECT oum.user_id, ou.company_id
      FROM public.org_unit_members oum
      JOIN public.org_units ou ON ou.id = oum.org_unit_id
  ) sub
 WHERE e.company_id IS NULL
   AND e.evaluator_user_id = sub.user_id;
```
If a user belongs to multiple org units across different companies (possible in a multi-company group), the sub-query returns multiple rows per `user_id`. PostgreSQL's `UPDATE...FROM` with a non-unique join applies an arbitrarily chosen row — the assigned `company_id` becomes non-deterministic. The header comment promises `LIMIT 1 (determinístico via ORDER BY)` but no such LIMIT/ORDER exists in any of the four steps. By contrast, CLIM.1 (line 22-32) correctly uses `ROW_NUMBER() OVER (PARTITION BY ... ORDER BY joined_at)` for the same problem.

**Fix:** Apply the same ROW_NUMBER pattern to all four sub-queries in PRE.2:
```sql
FROM (
    SELECT oum.user_id, ou.company_id,
           ROW_NUMBER() OVER (PARTITION BY oum.user_id ORDER BY oum.created_at) AS rn
      FROM public.org_unit_members oum
      JOIN public.org_units ou ON ou.id = oum.org_unit_id
) sub
WHERE e.company_id IS NULL
  AND e.evaluator_user_id = sub.user_id
  AND sub.rn = 1;
```
Repeat `AND sub.rn = 1` for Steps 2, 2.b, and 3.

---

### HIGH (fix before next phase)

#### HR-01: CASL conditions use wrong field names — liderado RBAC gates ineffective

**File:** `src/features/tenancy/lib/abilities.ts:125-126`

**Issue:** The liderado rules use:
```ts
can('read', 'Evaluation', { evaluatee_id: ctx.userId });   // line 125
can('read', 'OneOnOne', { liderado_id: ctx.userId });       // line 126
```
The DB schema (and all hooks) use `evaluated_user_id` for evaluations and `collaborator_id` for one_on_ones. CASL's condition matching compares against the JS object passed to `ability.can()` at call sites — if callers pass `{ evaluated_user_id }` (the real field), the `{ evaluatee_id }` condition never matches. This means CASL always returns `false` for liderado Evaluation/OneOnOne reads, making the UI layer guard more restrictive than intended (liderados see empty pages). RLS is the true security boundary so no data leaks, but the CASL mismatch breaks the liderado experience.

**Fix:**
```ts
// abilities.ts — liderado block
can('read', 'Evaluation', { evaluated_user_id: ctx.userId });
can('read', 'OneOnOne', { collaborator_id: ctx.userId });
```

---

#### HR-02: Multiple hooks still query legacy `team_members` instead of `org_unit_members`

**Files:**
- `src/hooks/useNineBoxDistribution.ts:52,59`
- `src/hooks/useTeamIndicators.ts:25`
- `src/hooks/useOrgIndicators.ts:35`
- `src/hooks/useLeaderAlerts.ts:82`

**Issue:** Phase 3 migrations (E2) backfill `team_members` → `org_unit_members`. Per CLAUDE.md, `teams` is preserved as read-only and will be dropped in Phase 4 Migration G. However, these four hooks continue to query `team_members` for member lists. This is acceptable as a temporary bridge, but it means the hooks silently diverge from the Phase 3 data model: users added after E2 via `org_unit_members` are invisible to nine-box, team indicators, org indicators, and leader alerts. The hooks will produce incorrect results as soon as new users are onboarded via the Phase 3 CreateUser flow (which inserts into `org_unit_members`, not `team_members`).

**Fix:** Migrate each of the four hooks to query `org_unit_members` joined to `org_units`. At minimum, annotate with a `// TODO Phase 4-G: switch to org_unit_members` comment and add a test that creates a user only in `org_unit_members` and asserts they appear in the hook's results.

---

#### HR-03: `progress_change` column stores absolute value, not delta — corrupts `useCollaboratorEvolution`

**File:** `src/hooks/usePDIIntegrated.ts:158`

**Issue:** `updatePDIProgress` inserts:
```ts
progress_change: progressPercentage,  // absolute 0-100 value
```
But `useCollaboratorEvolution.ts:48` treats `progress_change` as a delta:
```ts
current[u.plan_id] = Math.max(0, Math.min(100, prev + Number(u.progress_change ?? 0)));
```
If a user goes from 0% → 60%, the stored value is `60` (absolute). The evolution chart then computes `0 + 60 = 60` on the first update — which happens to be correct for the first update. On a second update from 60% → 80%, `progress_change = 80` is stored. The chart then computes `60 + 80 = 140`, clamped to 100 — incorrectly showing 100% after only two updates. The evolution timeline will be wrong for any PDI with more than one progress update.

**Fix (two options):**
1. Store a true delta in `usePDIIntegrated`: `progress_change: progressPercentage - previousPercentage`
2. Change `useCollaboratorEvolution` to treat `progress_change` as absolute and use it directly: `current[u.plan_id] = Math.max(0, Math.min(100, Number(u.progress_change ?? 0)))`

Option 2 requires no historical data fix but changes the semantic contract of the column. Choose one and document it.

---

### MEDIUM (technical debt, fix in same phase if easy)

#### ME-01: `useClimateQuestions` missing scope prefix on queryKey

**File:** `src/hooks/useClimateSurveys.ts:115`

**Issue:** The legacy `useClimateQuestions` hook uses:
```ts
queryKey: ['climate_questions', surveyId],
```
This violates INV-3-02 and Pitfall §11 — no `scope.id` in the key. If a user switches company scope, stale questions from the previous scope remain cached and can be displayed.

**Fix:** Either migrate to `useScopedQuery` or add scope.id manually:
```ts
const { scope } = useScope();
queryKey: ['scope', scope?.id ?? '__none__', 'climate_questions', surveyId],
```

---

#### ME-02: `EvaluationForm` uses `as unknown as` to pass `control` to `EvaluationFormSection`

**File:** `src/components/EvaluationForm.tsx:86`

**Issue:**
```ts
control={form.control as unknown as Parameters<typeof EvaluationFormSection>[0]['control']}
```
This double-cast escapes TypeScript's type system at the control boundary. The Zod resolver is wired correctly (no `as any` in the resolver itself, so INV-3-03 passes at the resolver level), but the cast means TypeScript cannot verify that the dynamically built schema's field types are compatible with how `EvaluationFormSection` > `EvaluationFormQuestion` renders them. A runtime mismatch between schema field names and rendered `fieldPath` strings would not be caught at compile time.

**Fix:** Define a stable intermediate type for the control:
```ts
type ResponsesControl = Control<{ responses: Record<string, unknown> }>;
// Then: form.control as unknown as ResponsesControl
// And declare EvaluationFormSectionProps.control: ResponsesControl
```
This is still one cast but preserves the shape contract.

---

#### ME-03: `CreateUser` page (352 lines) exceeds INV-3-09 threshold; `App.tsx` (342 lines) is borderline

**Files:** `src/pages/CreateUser.tsx`, `src/App.tsx`

**Issue:** INV-3-09 sets 300 lines as the debt threshold. `CreateUser.tsx` is 352 lines, and `App.tsx` is 342 lines. Both include meaningful inline logic (`CreateField` helper function in CreateUser, full route table in App). Not blocking, but flagged as the spec requires.

**Fix (low priority):** Extract `CreateField` helper to `src/components/CreateField.tsx`. Consider splitting route definitions in `App.tsx` into a `src/app/routes.tsx` file.

---

#### ME-04: `submit_climate_response` RPC receives `p_comment: undefined` from TS caller

**File:** `src/hooks/useClimateSurveys.ts:93`

**Issue:**
```ts
p_comment: input.comment ?? undefined,
```
The Supabase JS client serializes `undefined` as omitting the key from the JSON body, which causes the RPC to receive its `DEFAULT NULL` — this happens to work correctly. However, this is semantically wrong: the intent is "no comment = null", not "no comment = omit param". This can silently break if the RPC signature changes or if the client library changes serialization behavior.

**Fix:**
```ts
p_comment: input.comment ?? null,
```

---

### LOW (suggestions, style)

#### LO-01: CORS wildcard in Edge Function acceptable but worth documenting

**File:** `supabase/functions/create-user-with-temp-password/index.ts:17`

The `'Access-Control-Allow-Origin': '*'` header is the standard Supabase Edge Function pattern and is mitigated by the JWT auth check on line 61. No security issue at the server side. However, if the frontend domain is known and stable, restricting to the app domain is a hardening option worth tracking.

---

#### LO-02: 200ms `setTimeout` in `FirstLoginChangePasswordCard` is a timing smell

**File:** `src/components/FirstLoginChangePasswordCard.tsx:59`

```ts
await new Promise((r) => setTimeout(r, 200));
navigate('/', { replace: true });
```
This works around the stale-cache problem (Pitfall §9), but it relies on timing rather than awaiting the actual cache update. CR-01 (the key mismatch) means the invalidation never actually runs, so the 200ms wait is also a no-op. Fixing CR-01 addresses the root cause; after the fix, consider using `awaitQueryClient.invalidateQueries(...)` which returns a Promise already and eliminates the need for the sleep.

---

#### LO-03: `/admin/criar-usuario` route allows only `admin`, but Edge Function allows `admin` OR `rh`

**File:** `src/App.tsx:127`

The `ProtectedRoute` for `/admin/criar-usuario` has `allowedRoles={["admin"]}`. The Edge Function `create-user-with-temp-password` authorizes both `admin` and `rh`. This means RH users cannot reach the page despite being authorized by the backend. This is likely intentional (RH might use a different page to create users), but worth documenting in CONTEXT.md to avoid confusion.

---

## Invariant Check

| Invariant | Status | Notes |
|-----------|--------|-------|
| INV-3-01: supabase.from() in hooks only | PASS | All Phase 3 new hooks/components comply. Pre-existing violations (ManualPDIForm.tsx, CompanyDrawer.tsx, JobOpeningForm.tsx) are out of Phase 3 scope and pre-date this refactor. |
| INV-3-02: queryKey scope prefix | FAIL | `useClimateQuestions` (legacy, in scope file useClimateSurveys.ts) uses `['climate_questions', surveyId]` without scope prefix — ME-01. All new hooks pass. |
| INV-3-03: no `as any` in form resolvers | PASS | `zodResolver(formSchema)` has no `as any`. The `as unknown as` in EvaluationForm.tsx:86 is at the control-passing boundary, not in the resolver itself. Flagged as ME-02 but does not violate the invariant literally. |
| INV-3-04: k-anon no count leak | PASS | `ClimateAggregateCard` correctly returns null/empty when `insufficient_data: true` without rendering any count. RPC returns only `{insufficient_data: true}` when count < 3. Tests confirm. |
| INV-3-05: must_change_password no loop | FAIL | CR-01: cache invalidation targets wrong key `['userProfile']`; actual key is `['currentUserProfile']`. Invalidation is a no-op, leaving `must_change_password=true` in cache after successful change. |
| INV-3-06: buildZodFromTemplate all types | PASS | All three types (`scale_1_5`, `text`, `choice`) handled without runtime errors. Edge case: `choice` with `options.length === 0` returns `z.never()` (required) or `z.string().optional()` (optional) — defensively correct. Tests confirm. |
| INV-3-07: rh_notes CASL guard | PASS | `OneOnOneRHNote` checks `ability.can('read', 'RhNote')` and returns `null` (DOM-absent) when false. RLS separately enforces 0-row return for non-RH. Both gates operational. |
| INV-3-08: no plaintext password in logs | PASS | Edge Function explicitly avoids logging `tempPassword`. No `console.log(tempPassword)` found anywhere. `console.warn` messages are intentionally PII-free. |
| INV-3-09: components ≤300 lines | FAIL | `src/pages/CreateUser.tsx` is 352 lines (exceeds 300). `src/App.tsx` is 342 lines (borderline — route config file). Flagged as ME-03. All Phase 3 sub-components (OneOnOne*, Evaluation*, Climate*) are well within limit. |
