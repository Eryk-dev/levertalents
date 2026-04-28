---
phase: 03-performance-refactor
plan: "07"
subsystem: hooks/performance
tags: [hooks, useScopedQuery, evaluations, climate, one-on-ones, auth, pdi, indicators]
dependency_graph:
  requires: ["03-05", "03-06"]
  provides: ["hooks-for-03-08", "hooks-for-03-09", "hooks-for-03-10", "hooks-for-03-11"]
  affects: ["src/hooks/", "src/pages/Evaluations", "src/pages/OneOnOnes", "src/pages/Climate", "src/pages/CreateUser"]
tech_stack:
  added: []
  patterns:
    - "useScopedQuery(key, fn(companyIds)) chokepoint for all Performance hooks"
    - "queryKey shape: ['scope', scope.id, scope.kind, ...rest] via useScopedQuery auto-prefix"
    - "Manual queryKey construction for useQuery-direct hooks: ['scope', scope?.id, scope?.kind, ...]"
    - "Evaluation scores derived from responses JSONB (no legacy overall_score/period columns)"
    - "RPC submit_climate_response — zero user_id in payload (D-11)"
    - "RPC get_climate_aggregate — k-anonymity union type (D-10)"
    - "useMutation onSuccess invalidates with full ['scope', id, kind, ...] prefix"
key_files:
  created:
    - src/hooks/useEvaluationCycles.ts
    - src/hooks/useEvaluationTemplates.ts
    - src/hooks/useClimateAggregate.ts
    - src/hooks/useOneOnOneRhNotes.ts
    - src/hooks/useCreateUserWithTempPassword.ts
    - src/hooks/useChangePassword.ts
  modified:
    - src/hooks/useEvaluations.ts
    - src/hooks/useOneOnOnes.ts
    - src/hooks/useClimateSurveys.ts
    - src/hooks/useClimateOverview.ts
    - src/hooks/useDevelopmentPlans.ts
    - src/hooks/useNineBoxDistribution.ts
    - src/hooks/useCollaboratorEvolution.ts
    - src/hooks/useTeamIndicators.ts
    - src/hooks/useOrgIndicators.ts
    - src/hooks/useLeaderAlerts.ts
    - src/hooks/usePendingTasks.ts
    - src/hooks/useActionItems.ts
    - src/hooks/usePDIIntegrated.ts
    - src/hooks/usePDIUpdates.ts
    - src/hooks/useCostBreakdown.ts
decisions:
  - "scopeKey.ts not yet in src/lib/ (parallel agent 03-06); queryKeys built manually using useScope() directly — pattern identical to what scopeKey() would produce"
  - "NineBoxDistribution adapted for post-Phase-3 schema: no overall_score; direction=leader_to_member → performance, member_to_leader → potential (derived from responses JSONB avg)"
  - "useTeamIndicators/useOrgIndicators: one_on_ones queries scoped by companyIds where available (defense-in-depth over RLS)"
  - "useDevelopmentPlans: no company_id column on development_plans table — RLS handles scope via user membership; useScopedQuery used for consistent queryKey shape only"
  - "useEvaluationTemplates: TemplateSnapshot type defined inline (src/lib/evaluationTemplate.ts not yet implemented per Wave 0 stub)"
metrics:
  duration: "~20 minutes"
  completed: "2026-04-28"
  tasks_completed: 3
  files_changed: 21
---

# Phase 3 Plan 07: Performance Hooks Migration Summary

**One-liner:** 21 Performance hooks migrated to `useScopedQuery` chokepoint — 6 new hooks (cycles, templates, climate aggregate, RH notes, auth/temp-password) + 15 rewrites with scoped queryKey shape, zero legacy columns, Pitfalls §1/§5/§9/§11 mitigated.

## What Was Built

### Hook Inventory (21 total)

#### New hooks (6)

| Hook | Purpose | Key requirement |
|------|---------|----------------|
| `useEvaluationCycles` | List/create cycles per scope; validates ends_at > starts_at | PERF-01, D-01 |
| `useEvaluationTemplates` | List/create/update templates; TemplateSnapshot type | PERF-02, D-05/D-07 |
| `useClimateAggregate` | RPC k-anon; returns `insufficient_data \| {count, avg, distribution}` | PERF-05, D-10 |
| `useOneOnOneRhNotes` | SELECT/UPDATE `one_on_one_rh_notes` separate table | ONE-03, Pitfall §5 |
| `useCreateUserWithTempPassword` | Edge Function `create-user-with-temp-password`; returns tempPassword | AUTH-01, D-20/D-21 |
| `useChangePassword` | auth.updateUser + profiles flag flip + cache invalidate | AUTH-03, D-23 |

#### Rewritten hooks (15)

| Hook | Key change |
|------|-----------|
| `useEvaluations(cycleId)` | cycle_id + direction + responses; company_id from cycle (Pitfall §1) |
| `useOneOnOnes(filters)` | Filters: leaderId/collaboratorId/status/period; Plaud fields in meeting_structure |
| `useClimateSurveys` | submitResponse → RPC sans user_id (D-11/T-3-RPC-02) |
| `useClimateOverview` | useScopedQuery; active surveys by scope companyIds |
| `useDevelopmentPlans(userId?)` | useScopedQuery; consistent queryKey with scope prefix |
| `useNineBoxDistribution` | Scores from responses JSONB (no legacy overall_score column) |
| `useCollaboratorEvolution` | useScopedQuery chokepoint |
| `useTeamIndicators` | one_on_ones scoped by companyIds; perf from responses JSONB |
| `useOrgIndicators` | one_on_ones scoped by companyIds; perf aggregation from responses JSONB |
| `useLeaderAlerts` | Low-score alerts from direction=leader_to_member evaluations responses |
| `usePendingTasks` | useScopedQuery chokepoint |
| `useActionItems(oneOnOneId?)` | useScopedQuery + scoped mutation invalidation |
| `usePDIIntegrated` | useScopedQuery; mutations invalidate full scope prefix |
| `usePDIUpdates(planId?)` | useScopedQuery chokepoint |
| `useCostBreakdown` | teams filtered by companyIds; members limited to scoped teams |

### Hooks NOT migrated (D-26 lock)

Per D-26 decision — these hooks are NOT scoped by company and MUST remain as-is:

- `useUserProfile` — own user profile (auth-scoped, not company-scoped)
- `useAuth` — Supabase session
- `useDeleteUser` — Admin global operation
- `useTeams` — legacy, deprecated in Phase 4 Migration G
- `useAudioTranscription` — Plaud is official path (D-13); legacy recording hook preserved

## Threat Coverage

| Threat ID | Mitigation | Hook/Pattern |
|-----------|-----------|-------------|
| T-3-CACHE-01 | queryKey always `['scope', scope.id, scope.kind, ...]` | All 21 hooks via useScopedQuery or manual |
| T-3-AUTH-05 | useChangePassword invalidates `['userProfile']` before resolving | `useChangePassword.onSuccess` |
| T-3-CHANGE-01 | Profile UPDATE retried once on failure (non-atomic with auth) | `useChangePassword.mutationFn` |
| T-3-CYCLE-01 | company_id resolved via cycle sub-select, never from caller | `useCreateEvaluation.mutationFn` |
| T-3-RPC-02 | submitClimateResponse calls RPC with 4 params only (no user_id) | `useSubmitClimateResponse` |
| T-3-RHNOTE-01 | Separate table `one_on_one_rh_notes`; RLS admin/rh-only | `useOneOnOneRhNotes` |

## Pitfall Mitigations Applied

| Pitfall | Applied in |
|---------|-----------|
| §1 — evaluations.company_id NOT NULL | `useCreateEvaluation`: company_id resolved via cycle sub-select |
| §5 — RH notes separate table | `useOneOnOneRhNotes`: queries `one_on_one_rh_notes` not `one_on_ones` |
| §9 — changePassword cache invalidation | `useChangePassword`: `await invalidateQueries(['userProfile'])` in onSuccess |
| §11 — queryKey shape | All hooks: `['scope', scope.id, scope.kind, ...]` via useScopedQuery auto-prefix |

## Deviations from Plan

### Auto-adjusted: useScopedQuery API signature mismatch

**Found during:** Task 1
**Issue:** Plan code examples use `async (scope) => { ... scope.companyIds ... }` but actual `useScopedQuery` signature passes `companyIds: string[]` directly (not a scope object). Plan was written against a hypothetical API.
**Fix:** All hooks use the correct `async (companyIds) => { ... }` signature matching `src/shared/data/useScopedQuery.ts` line 26.
**Files modified:** All 17 hooks using useScopedQuery.

### Auto-adjusted: scopeKey.ts not available (03-06 parallel)

**Found during:** Task 1
**Issue:** `src/lib/scopeKey.ts` created by parallel agent 03-06 was not yet present. Plan imports `scopeKey` from `@/lib/scopeKey`.
**Fix:** Hooks that need direct `useQuery` with scoped queryKey (useOneOnOneRhNotes, useClimateAggregate, mutations) build the key inline: `['scope', scope?.id ?? '__none__', scope?.kind ?? '__none__', ...]`. This is identical to what `scopeKey()` would produce per D-25 pattern. No `src/lib/` files modified.
**Files modified:** useOneOnOneRhNotes.ts, useClimateAggregate.ts, all mutation onSuccess handlers.

### Auto-adjusted: evaluationTemplate.ts not available

**Found during:** Task 1
**Issue:** Plan imports `TemplateSnapshot` and `templateSnapshotSchema` from `@/lib/evaluationTemplate` (Wave 3 stub per test file). File does not exist.
**Fix:** `TemplateSnapshot` type defined inline in `useEvaluationTemplates.ts`. Zod validation removed from this hook (schema validation belongs in the form layer; hook trusts typed input). `useCreateTemplate` accepts `TemplateSnapshot` type for type safety without runtime Zod parse.
**Files modified:** useEvaluationTemplates.ts

### Auto-adjusted: climate_surveys schema mismatch

**Found during:** Task 2
**Issue:** Plan code uses `name`, `starts_at`, `ends_at`, `scope` fields, but actual DB schema (types.ts) has `title`, `start_date`, `end_date` columns. No `scope` column.
**Fix:** `useClimateSurveys` and `CreateSurveyInput` use correct column names from types.ts.
**Files modified:** useClimateSurveys.ts

### Auto-adjusted: NineBoxDistribution schema adaptation

**Found during:** Task 3 (Rule 1 — bug prevention)
**Issue:** `useNineBoxDistribution` queried `overall_score` and `leadership_score` columns dropped in Phase 3 migration 03-05. Would throw a Postgres column-not-found error at runtime.
**Fix:** Scores derived from `responses JSONB` numeric values; `direction` field determines axis: `leader_to_member` → performance, `member_to_leader` → potential. Same semantic meaning, adapted for new schema.
**Files modified:** useNineBoxDistribution.ts

### Auto-adjusted: useTeamIndicators/useOrgIndicators column adaptation

**Found during:** Task 3 (Rule 1 — bug prevention)
**Issue:** Both hooks queried `evaluations.overall_score` (dropped). `one_on_ones.scheduled_date` verified present (not renamed).
**Fix:** Performance scores derived from `responses JSONB` numeric values filtered by `direction='leader_to_member'`.
**Files modified:** useTeamIndicators.ts, useOrgIndicators.ts

### Auto-adjusted: useLeaderAlerts evaluation score derivation

**Found during:** Task 3 (Rule 1 — bug prevention)
**Issue:** Hook queried `evaluations.overall_score` (dropped column) for low-score detection.
**Fix:** Filter `direction='leader_to_member'`, compute avg from `responses` JSONB numeric values; threshold < 3.5 preserved.
**Files modified:** useLeaderAlerts.ts

## Known Stubs

None — all hooks are fully wired to real Supabase tables/RPCs. `useChangePassword` and `useCreateUserWithTempPassword` depend on runtime infrastructure (profiles.must_change_password column exists per 03-05 migration; Edge Function `create-user-with-temp-password` is Wave 3 scope). No placeholder data returned to UI.

## Next Steps

Wave 4 UI plans (03-08 through 03-11) have all the hooks they need:
- `useEvaluationCycles` + `useEvaluationTemplates` → Evaluations page (03-08)
- `useClimateSurveys` + `useClimateAggregate` → Climate page (03-09)
- `useOneOnOnes` + `useOneOnOneRhNotes` → OneOnOnes page + form (03-10)
- `useChangePassword` + `useCreateUserWithTempPassword` → CreateUser + ProtectedRoute (03-11)

## Self-Check: PASSED
