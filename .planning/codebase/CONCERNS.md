# Codebase Concerns

**Analysis Date:** 2026-04-27

## Tech Debt

**Profile Schema Missing Senioridade & Nivel Salarial:**
- Issue: Salary level and seniority fields are not persisted in the profiles table schema. Currently hardcoded as "—" (em dash).
- Files: `src/pages/Profile.tsx:181-192`
- Impact: Users cannot track or filter by career level or salary expectations. Profile information is incomplete.
- Fix approach: Add `senioridade` and `nivel_salarial` columns to `profiles` table, update migration, add UI controls in Profile form.

**Duplicate PDI Form Components:**
- Issue: Two separate PDI form implementations exist — `ManualPDIForm.tsx` and `PDIFormIntegrated.tsx` — handling the same domain with divergent logic.
- Files: `src/components/ManualPDIForm.tsx:24` (TODO comment), `src/components/PDIFormIntegrated.tsx`
- Impact: Maintenance burden; bug fixes must be applied to both; future changes risk inconsistency.
- Fix approach: Consolidate into a single, parameterized form component; retire the manual version or keep only if there's a UX reason to support both.

**Missing Team-Level Climate & PDI Aggregation:**
- Issue: TeamManagement page does not display aggregated climate responses or active development plans by team. Lines reference TODOs for integration.
- Files: `src/pages/TeamManagement.tsx:165-167`
- Impact: Team leaders cannot see team-wide climate health or PDI progress at a glance; requires drilling into individual profiles.
- Fix approach: Add team-level RPC or materialized view to aggregate `climate_responses` and `development_plans` grouped by team; wire into TeamManagement dashboard.

**Layout Sidebar Collapse State Not Persisted:**
- Issue: Sidebar collapse state is reset on page reload. TODO notes this was left for later iteration.
- Files: `src/components/Layout.tsx:11`
- Impact: Poor UX persistence; users must re-collapse sidebar on every session.
- Fix approach: Use `localStorage` to persist `sidebarOpen` state; read on mount and sync with UI state.

**Unimplemented Meeting Transcript Highlighting:**
- Issue: OneOnOne meeting form mentions TODO for text selection highlighting; left as future iteration.
- Files: `src/components/OneOnOneMeetingForm.tsx:528`
- Impact: Transcript viewer lacks visual affordance for selecting/highlighting important passages.
- Fix approach: Implement text selection highlighting (e.g., triple-click to select sentence, highlight with color picker, persist highlights to DB).

**Missing Real Stats in Meeting Dashboard:**
- Issue: Meeting form stats section has TODO for wiring real data (evaluation/climate/last 3 meetings).
- Files: `src/components/OneOnOneMeetingForm.tsx:697`
- Impact: Stats section shows placeholder; no actionable insights about meeting history or performance trends.
- Fix approach: Query last 3 one_on_ones + latest evaluation + latest climate response; compute aggregates; display trends.

---

## Known Bugs

**Orphaned Stage: `sem_retorno` Not in Kanban Columns:**
- Symptoms: Candidates stuck at `sem_retorno` (no response from candidate) may become invisible in Kanban because the stage exists in `APPLICATION_STAGE_TRANSITIONS` but not explicitly in `STAGE_GROUPS.stages`.
- Files: `src/lib/hiring/statusMachine.ts:16` (transitions) vs `src/lib/hiring/stageGroups.ts:50` (groups)
- Trigger: Candidate reaches `sem_retorno` stage; user opens Kanban and does not see them in expected column.
- Workaround: Stage is now grouped under "Triagem" (per stageGroups.ts line 50), but UX audit (F11) flagged this as a visibility bug. The mapping works but is implicit and fragile.
- Fix approach: Ensure all stages in `APPLICATION_STAGE_TRANSITIONS` are explicitly mapped in `STAGE_GROUPS` or have a documented fallback. Add unit test to verify no stage is orphaned.

**Rapid Changes in Hiring Module May Indicate Instability:**
- Symptoms: Recent git history shows 8+ commits in hiring module in 1 week (feat: banco de talentos, fix: RLS gaps, fix: stage transitions, feat: card enrichment).
- Files: Multiple (`src/lib/hiring/`, `src/components/hiring/`, `src/pages/hiring/`)
- Trigger: Frequent refactors suggest unclear requirements or correctness issues being discovered post-release.
- Impact: High churn increases risk of regressions; indicates UX audit findings (UX-AUDIT-VAGAS.md) were not anticipated during initial build.
- Fix approach: Freeze hiring module for 1-2 weeks; write comprehensive test suite for stage transitions, RLS policies, and UI interactions; do not add features until test coverage >80%.

---

## Security Considerations

**RLS Policy for `cultural_fit_responses` Lacks Confidentiality Gate:**
- Risk: `cultural_fit_responses` are readable by leaders if they have access to the job opening, but the policy does not check if the job is marked `confidential`. A leader could view a confidential candidate's fit scores.
- Files: `supabase/migrations/20260416193100_hiring_rls_policies.sql:261-276`
- Current mitigation: Job-level `confidential` check exists in related tables (job_openings, interviews) but not in cultural_fit_responses policy.
- Recommendations: Extend the policy to join to `job_openings` and include `AND (NOT j.confidential OR auth.uid() = ANY(j.confidential_participant_ids))` in the subquery.

**Sensitive Console Logging in Production:**
- Risk: `console.log()` and `console.error()` emit user-facing data (email, IDs, timestamps) to browser DevTools. Attackers with page access or leaked logs can correlate user activity.
- Files: `src/components/AudioPlayer.tsx:30,43,47,93,127` (audio URLs logged), `src/hooks/useTeams.ts:81,98,111` (team/member errors logged), multiple error handlers
- Current mitigation: Logs only visible in dev console; not sent to server. But in development mode, `fallbackRole` is logged (line 37 in useAuth.ts).
- Recommendations: Replace console.log with conditional debug logger (e.g., only in `DEV` mode); sanitize error messages before logging; never log auth tokens, UUIDs, or email addresses.

**ENV Variable Casting Without Validation:**
- Risk: `import.meta.env.VITE_SUPABASE_URL` is cast to string with `as string | undefined` or `as string`, but no runtime validation that it exists.
- Files: `src/integrations/supabase/client.ts:5-6`, `src/components/hiring/PublicApplicationForm.tsx:297-298`, `src/hooks/hiring/useCulturalFit.ts:197`
- Current mitigation: Vite will fail build if env var is missing. But at runtime, if .env is misconfigured, app crashes silently or sends requests to undefined URL.
- Recommendations: Create a validation module to check all VITE_ vars at startup (in `main.tsx`); throw readable error if any are missing; add `.env.example` in repo root (already exists per git history).

**Anonymization RPC Lacks Audit Logging:**
- Risk: Candidates can be anonymized (PII redacted) with no audit trail. Regulatory compliance (LGPD) may require logging of PII access/deletion.
- Files: `src/hooks/hiring/useCandidates.ts` (useAnonymizeCandidate), `supabase/migrations/` (anonymize trigger/RPC not examined in detail)
- Current mitigation: RLS policy limits who can anonymize (admin/socio/rh only per line 156).
- Recommendations: Ensure anonymize RPC writes to `candidate_access_log` with action='anonymize'. Audit that log regularly.

---

## Performance Bottlenecks

**CandidateProfile Component Is 1169 Lines (Monolithic):**
- Problem: Single component handles candidate identity, application history, fit surveys, interviews, hiring decision, admission, and background checks.
- Files: `src/pages/hiring/CandidateProfile.tsx`
- Cause: No component splitting; all state management is local to one component.
- Improvement path: Break into smaller sub-components (CandidateHeader, CandidateApplicationList, CandidateDecision, etc.); extract state to context or custom hooks; use React.memo on expensive children.

**Large Components with Multiple Heavy Queries:**
- Problem: Components like `OneOnOneMeetingForm.tsx` (909 lines), `CandidateDrawer.tsx` (867 lines), `JobOpeningForm.tsx` (854 lines) each fetch and manage multiple entities (forms, relationships, history).
- Files: `src/components/OneOnOneMeetingForm.tsx`, `src/components/hiring/CandidateDrawer.tsx`, `src/components/hiring/JobOpeningForm.tsx`
- Cause: React Query caching is good, but component rerender on any dependency change triggers full re-render of large subtree.
- Improvement path: Memoize sub-components; extract form logic to custom hooks; use `useDeferredValue` for non-critical updates; lazy load tabs in drawers.

**Kanban Rendering All Applications Without Virtualization:**
- Problem: `CandidatesKanban.tsx` renders all applications in all columns. If a job has 100+ applications, the DOM is massive.
- Files: `src/pages/hiring/CandidatesKanban.tsx` (uses dnd-kit but no windowing)
- Cause: `STAGE_GROUPS` groups applications; each application renders a `CandidateCard`. No lazy loading or virtualization.
- Improvement path: Implement react-window or similar virtualization for each column; render only visible cards; lazy load as user scrolls.

**N+1 Query Risk in Hiring Dashboard KPIs:**
- Problem: HiringDashboard likely queries `job_openings`, then for each job, queries applications by status. This is a loop-and-query anti-pattern.
- Files: `src/pages/hiring/HiringDashboard.tsx` (not fully examined)
- Cause: If using separate useQuery hooks per job without aggregation.
- Improvement path: Use a single RPC or materialized view to fetch job counts and application counts grouped by job_id and stage in one query; memoize result.

---

## Fragile Areas

**Kanban Column Collapsibility State Not Saved:**
- Files: `src/components/hiring/CandidatesKanban.tsx` (useState for column open/close)
- Why fragile: If user collapses "Descartados" (rejected) column to focus on active pipeline, refresh or navigation loses that preference. User must re-collapse on every visit.
- Safe modification: Add `localStorage` persistence for column visibility; read on mount; tie to jobId to allow per-job preferences.
- Test coverage: No tests found for Kanban column state (assumptions based on code review).

**Stage Transitions Enforced Only Client-Side + Server-Side Async:**
- Files: `src/lib/hiring/statusMachine.ts:APPLICATION_STAGE_TRANSITIONS`, RLS policies in migrations
- Why fragile: Client validates transitions, but if multiple users drag the same candidate concurrently, race conditions can occur. Server validates too, but error messaging is generic ("You don't have permission").
- Safe modification: Add optimistic update with rollback; display conflict dialog if update fails; implement version/etag on applications to detect concurrent edits.
- Test coverage: No integration tests found for concurrent stage changes.

**Fit Cultural Survey Issuance Uses Public Link with Expiry:**
- Files: `src/hooks/hiring/useCulturalFit.ts:useIssueFitLink`, `src/pages/hiring/PublicCulturalFit.tsx`
- Why fragile: Token is issued with an expiry; if the RPC that validates tokens is not properly scoped, expired tokens might still work or be forgeable.
- Safe modification: Review `cultural_fit_tokens` RPC (not examined); ensure tokens are one-time use and tied to candidate_id + survey_id.
- Test coverage: No tests found for token expiry or one-time-use enforcement.

**Supabase Migration Dependency Chain:**
- Files: `supabase/migrations/20260416*.sql` (17+ migration files)
- Why fragile: If a recent migration (e.g., "dedupe_user_roles", "grant_admin_to_test_user") is incomplete or assumes old state, applying to a fresh database will fail. Order matters; rollbacks are untested.
- Safe modification: Add pre-migration script to validate schema state (e.g., check if column exists before ALTER); document idempotency. Test full migrate-from-scratch on CI.
- Test coverage: No migration test fixtures found.

---

## Scaling Limits

**Single-Lock Architecture for Simultaneous Applicant Moves:**
- Current capacity: Kanban drag-and-drop updates via Supabase in real-time. If 10 RH staff drag candidates simultaneously, each update is serialized by Supabase row-level locks.
- Limit: Beyond ~5 concurrent updates per 10 seconds, users see "operation in progress" delays or conflicts.
- Scaling path: Implement client-side conflict resolution (e.g., last-write-wins with version numbers); batch updates; use Supabase Realtime to push updates to other clients instead of polling.

**CSV Export of Hiring Pipeline Is Synchronous:**
- Current capacity: Export of all jobs + candidates as CSV is a single RPC call; large datasets (1000+ applications) block UI.
- Limit: Export takes >10 seconds; user sees loading spinner; browser may throttle.
- Scaling path: Move to Edge Function with streaming CSV download; paginate export; offer incremental exports (by date range, job, status).

**Media Upload for Audio Recordings Has No Size Limit Enforcement:**
- Current capacity: One-on-one meeting form uploads audio to Supabase storage. No client-side size check or resumable upload.
- Limit: 100MB+ uploads will fail silently or time out.
- Scaling path: Add file size validation on client (warn if >50MB); implement resumable upload (tus.io or similar); add soft limit to schema (max_audio_size column on meetings table).

---

## Dependencies at Risk

**Dual Lockfile Situation (bun.lockb + package-lock.json):**
- Risk: Project has both `bun.lockb` and `package-lock.json` checked in. This causes inconsistency: npm ci installs from npm lockfile, `bun install` from bun lockfile. Dependency versions may diverge.
- Impact: CI pipeline (if using npm) and local dev (if using bun) have different dependency trees. Bugs that don't reproduce locally.
- Migration plan: Choose one package manager (recommend npm for broad CI/CD support); delete the unused lockfile; document in README. Or, enforce single manager in pre-commit hook.

**Large Generated Type Definitions (hiring-types.ts: 834 lines):**
- Risk: Type definitions are hand-maintained (not auto-generated from schema). If schema changes, types become stale. Increases chance of type-casting errors (`as any`).
- Impact: `ManualOneOnOneForm.tsx:35` uses `data: any`, `OneOnOneMeetingForm.tsx:358` uses `as any` to bypass type errors.
- Migration plan: Consider auto-generating types from Supabase schema (supabase-js provides this); or enforce strict TypeScript compilation to catch `any` casts.

---

## Missing Critical Features

**No Progress Tracking for Job Opening Lifecycle:**
- Problem: Users cannot see at a glance how far along a job opening is from "draft" to "published" to "filled". No SLA or deadline tracking.
- Blocks: RH cannot prioritize which job openings are urgent; gestor cannot see handoff status.
- Improvement: Add `target_start_date` and `sla_days_to_fill` columns to job_openings; wire into JobCard with visual indicator (progress bar or "5 days overdue" badge).

**No Bulk Actions on Candidates (Move Stage, Tag, Email):**
- Problem: Kanban only supports individual card drag-and-drop. If RH wants to move 10 candidates from "Triagem" to "Checagem" at once, must drag one by one.
- Blocks: Batch workflows are slow; tedious for RH.
- Improvement: Add checkbox selection to cards; "Move Selected To" dropdown in header; execute as batch RPC.

**No Search/Filter Across All Hiring Data:**
- Problem: Global search bar (cmdk) searches candidates, vagas, PDIs, people — but not integrated. User must click a result and navigate separately.
- Blocks: Quick navigation for RH who says "find all C# developers across all open jobs" is cumbersome.
- Improvement: Wire hiring search results to deep links; show candidate + job in search preview; allow filtering by skill, status, company in search.

---

## Test Coverage Gaps

**Hiring Stage Transitions — No Validation Tests:**
- What's not tested: `APPLICATION_STAGE_TRANSITIONS` machine; all valid and invalid paths.
- Files: `src/lib/hiring/statusMachine.ts` (no .test.ts file found)
- Risk: If a transition is removed or added incorrectly, users might drag candidates to illegal states; RLS policy blocks, but UX is broken.
- Priority: High — stage transitions are core business logic.

**RLS Policies — No Policy Coverage Tests:**
- What's not tested: Job confidentiality, leader-specific access, admin overrides.
- Files: `supabase/migrations/20260416193100_hiring_rls_policies.sql` (no test file)
- Risk: A policy could be silently broken by a schema change; unauthorized access goes undetected.
- Priority: High — RLS is security-critical.

**Concurrent Applicant Updates — No Race Condition Tests:**
- What's not tested: Two users moving the same application simultaneously; version conflicts.
- Files: `src/hooks/hiring/useApplications.ts:useMoveApplicationStage` (no test file)
- Risk: Silent data loss or conflicting updates.
- Priority: Medium — affects reliability under load.

**Audio Transcription Pipeline — No End-to-End Tests:**
- What's not tested: Audio upload → save to storage → invoke Edge Function → transcription received → update meeting record.
- Files: `src/hooks/useAudioTranscription.ts`, `src/components/AudioPlayer.tsx`, `src/components/AudioRecorder.tsx` (no integration tests)
- Risk: Transcription fails silently; user assumes it worked but meeting has no transcript.
- Priority: High — core feature of one-on-one module.

**Profile Schema Mismatch — No Schema Validation Tests:**
- What's not tested: Profile form save → database schema; missing fields (senioridade, nivel_salarial).
- Files: `src/pages/Profile.tsx:181-192` (hardcoded "—" values)
- Risk: Data loss when new fields are added; forms do not save them.
- Priority: Medium — affects data completeness.

**Sidebar Visibility for Leaders — No Role-Based Access Tests:**
- What's not tested: Sidebar shows/hides "Recrutamento" based on user role; UX audit (F5) flagged inconsistency.
- Files: `src/components/Sidebar.tsx:126-136` vs `src/App.tsx:158-166`
- Risk: UX inconsistency if test does not pass; leader sees route works but menu is hidden.
- Priority: Medium — affects discoverability.

---

## Environmental & Configuration Issues

**Supabase Project Migration Not Fully Documented:**
- Issue: Project migrated from `wrbrbhuhsaaupqsimkqz` to `ehbxpbeijofxtsbezwxd` on 2026-04-23 (per project memory). Old env references may still exist.
- Files: `.env`, `config.toml`, git history (`chore(supabase): appoints config.toml to project wrbrbuhsaaupqsimkqz` was reverted later)
- Impact: Developers or CI/CD referencing old project ID will fail.
- Recommendations: Document migration in README or DEVELOPMENT.md; add migration script to update project references; verify all Supabase CLI commands point to new project ID.

**Test User Seeds May Be Stale:**
- Issue: Reference credentials (admin.teste@levertalents.com, mariana.costa@levertalents.com) were seeded but may not exist in current Supabase project post-migration.
- Files: Seed data (not in repo, likely in Supabase database)
- Impact: New developers cannot log in with test accounts; must create test users manually.
- Recommendations: Add a seed script to `supabase/seed.sql` that creates these test users with known roles; run on `supabase start` or provide instructions in DEVELOPMENT.md.

---

## UX Audit Debt — Hiring Pipeline (Already Documented)

Per UX-AUDIT-VAGAS.md (parent directory), the following are known friction points:

- **F1**: Job openings is a vertical list, not a Kanban. Users cannot see funil by status at a glance.
- **F2**: 3 pages to reach a candidate (Vagas → Job Detail → Kanban → Profile). Context lost at each click.
- **F3**: Kanban has 16 columns; horizontal scroll is tedious. Consolidate to 6-7 groups.
- **F4**: Candidate card opens as new page (Link) instead of drawer. Kanban context is lost.
- **F5**: Sidebar hides "Recrutamento" menu for leaders, even though route allows access.
- **F6**: Job card lacks candidate count and distribution by stage.
- **F7**: Filters occupy a full SectionCard; could be more compact.
- **F8**: No visual distinction between active and closed jobs.
- **F9**: Modal closes after creating job; does not navigate to job detail or ask next step.
- **F10**: Candidate profile is a wall of vertical SectionCards; tabs would be better.
- **F11**: Stage `sem_retorno` is not in Kanban columns (now mitigated by grouping in "Triagem").
- **F12**: No onboarding; new users don't know where "Vagas" is.

**Implementation Plan (from audit):**
- Sprint 1 (1-2 days): Fix sidebar, consolidate columns, enrich job card, clarify sem_retorno.
- Sprint 2 (3-5 days): Build JobsKanban to replace vertical list.
- Sprint 3 (5-7 days): Implement job expansion + drawer pattern for candidates.
- Sprint 4: Polish (SLAs, badges, keyboard shortcuts).

---

## Resolved Concerns (Phase 4 — Migration G, 2026-05-07)

**Legacy `allowed_companies` helper dropped:**
- Migration G removeu `public.allowed_companies(uuid)` da base remota. Anteriormente listado em CONCERNS como dual-path durante o Phase 1; agora resolvido. Antes do drop, a auditoria do plano 04-08 detectou 2 storage policies (`hiring_bucket:select`, `hiring_bucket:insert`) que ainda chamavam `allowed_companies` — Migration C tinha reescrito apenas as policies em `public.*`. Migration G fechou esse gap antes do `DROP FUNCTION`.

**LGPD retention cron job verificado:**
- `pg_cron data_access_log_retention_cleanup` confirmado scheduled+active no remoto via Migration G Step 3 + pgTAP 012. Listado anteriormente como "validar antes de Migration G"; agora resolvido.

## Outstanding Concerns

**`teams` + `team_members` tables ainda em uso por ~10 arquivos (Option A em vigor):**
- Files: `src/hooks/useTeams.ts` (CRUD completo), `src/hooks/useCostBreakdown.ts`, `src/components/ManualOneOnOneForm.tsx`, `src/components/ManualPDIForm.tsx`, `src/components/hiring/AdmissionForm.tsx`, `src/pages/GestorDashboard.tsx`, `src/pages/MyTeam.tsx`, `src/pages/CollaboratorProfile.tsx`, `src/pages/Profile.tsx`, `src/pages/OneOnOnes.tsx`, `src/pages/DevelopmentKanban.tsx`, `src/lib/hiring/rlsScope.ts` (lider join).
- Impact: `DROP TABLE teams + team_members` ficou COMENTADO em Migration G; só será aplicado quando esses readers forem migrados para `org_units` + nova fonte de custo.
- Suggested follow-up: Plano post-Phase-4 que migra useCostBreakdown para `org_unit_members` + um campo de custo (em `member_costs` ou `profiles.salary_cents`) e refatora os demais consumidores.

**`src/lib/hiring/rlsScope.ts` comentário stale:**
- File: `src/lib/hiring/rlsScope.ts` linha 5 ainda diz "Mirrors the DB allowed_companies(profile_id) helper" — o helper DB foi dropado em Migration G; o código local continua funcionando porque ele consulta `companies` + `team_members` diretamente, mas o comentário ficou stale.
- Impact: Documentação interna desatualizada; risco de confundir desenvolvedores.
- Suggested follow-up: Atualizar comentário para "Mirrors the DB visible_companies(uid) helper" (idêntico ao plano de Phase 4 originalmente — fica para quem tocar o arquivo).

---

*Concerns audit: 2026-04-27 (updated 2026-05-07 — Migration G resolved + outstanding teams readers)*
