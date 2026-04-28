---
phase: 2
slug: r-s-refactor
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-27
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Reads from RESEARCH.md §"Validation Architecture" (line 2131+).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.2 + @testing-library/react 16 + msw 2.10 (frontend) / pgTAP + supabase-test-helpers (DB) |
| **Config file** | `vitest.config.ts` (Phase 1) + `supabase/tests/pgtap/` (added in Wave 0) |
| **Quick run command** | `npm run test -- --run --changed` |
| **Full suite command** | `npm run test -- --run && npm run test:db` |
| **Estimated runtime** | ~30s frontend + ~20s pgTAP = ~50s |

---

## Sampling Rate

- **After every task commit:** `npm run test -- --run --changed` (filters to changed files only)
- **After every plan wave:** Full suite (`npm run test -- --run && npm run test:db`)
- **Before `/gsd-verify-work`:** Full suite must be green AND pgTAP green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

> To be populated by gsd-planner per task. Cross-reference with RESEARCH.md §Validation Architecture (the test inventory matrix).

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD     | TBD  | 0    | infra       | —          | Test scaffolding present | scaffold | `test -f src/lib/hiring/__tests__/statusMachine.test.ts` | ❌ W0 | ⬜ pending |

*Planner: replace this row with a row per task. Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Test files to create BEFORE implementation work begins (per RESEARCH.md inventory):

**Vitest unit tests (16 files):**
- [ ] `src/lib/hiring/__tests__/statusMachine.test.ts` — canTransition exhaustive table
- [ ] `src/lib/hiring/__tests__/stageGroups.test.ts` — todo legacy stage tem mapping
- [ ] `src/lib/hiring/__tests__/sla.test.ts` — computeSla thresholds, daysInStage timezone
- [ ] `src/lib/__tests__/supabaseError.test.ts` — 4 detect helpers + getMoveErrorToastConfig
- [ ] `src/hooks/hiring/__tests__/useApplications.test.ts` — moveApplicationStage onMutate/onError/onSettled
- [ ] `src/hooks/hiring/__tests__/useApplicationsRealtime.test.ts` — channel subscribe/unsubscribe + cache merge
- [ ] `src/hooks/hiring/__tests__/useApplicationCountsByJob.test.ts` — count by stage_group
- [ ] `src/hooks/hiring/__tests__/useTalentPool.test.ts` — filter active consents
- [ ] `src/hooks/hiring/__tests__/useRevokeConsent.test.ts` — revoke flow
- [ ] `src/hooks/hiring/__tests__/useCardPreferences.test.ts` — localStorage schema + migration
- [ ] `src/components/hiring/__tests__/CandidatesKanban.test.tsx` — drag → canTransition → optimistic → rollback
- [ ] `src/components/hiring/__tests__/CandidateCard.test.tsx` — minimum fields + customizable
- [ ] `src/components/hiring/__tests__/CandidateDrawer.test.tsx` — sub-components + ESC + click-outside
- [ ] `src/components/hiring/__tests__/PipelineFilters.test.tsx` — URL state + debounce
- [ ] `src/components/hiring/__tests__/JobsKanbanToggle.test.tsx` — Board↔Tabela + sort persist
- [ ] `src/components/hiring/__tests__/ConsentForm.test.tsx` — opt-in NÃO pré-marcado

**pgTAP tests (5 files):**
- [ ] `supabase/tests/pgtap/migration_f_stages.sql` — zero candidatos órfãos pós-backfill
- [ ] `supabase/tests/pgtap/data_access_log.sql` — RLS insert-only via RPC; read_candidate_with_log atomic write
- [ ] `supabase/tests/pgtap/candidate_consents.sql` — constraint integrity (revoked_at >= granted_at), 1-ativo-por-purpose
- [ ] `supabase/tests/pgtap/cpf_unique.sql` — partial UNIQUE index nullable
- [ ] `supabase/tests/pgtap/pg_cron_retention.sql` — pg_cron job exists + schedule weekly

**MSW handlers (added to `src/mocks/handlers.ts`):**
- [ ] `mockMoveApplication.rlsDenial` — 42501
- [ ] `mockMoveApplication.networkDrop` — TypeError("Failed to fetch")
- [ ] `mockMoveApplication.conflict` — 409 + realtime payload
- [ ] `mockRealtimeChannel` — postgres_changes mock for applications:job:{jobId}

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Sparkbar visualmente correta (verde/amarelo/azul/vermelho per D-11) | RS-08, D-11 | Visual color perception | Open `/hiring/jobs` in browser; verify green=aprovados, amarelo=entrevistas, azul=triagem+fit_cultural+checagem, vermelho=recusados/descartados |
| Drawer não navega + preserva scroll do board | RS-07 | Browser focus/scroll behavior | Open kanban, scroll to mid-board, click candidato. Drawer abre. ESC fecha. Click-outside fecha. Scroll do board permanece. |
| Opt-in **NÃO pré-marcado** no `PublicApplicationForm` | TAL-03 | First-time DOM render assertion in real browser | Open public job link in incógnito; checkbox de consent renderiza unchecked. |
| LGPD: nenhum console.log de PII em prod build | CLAUDE.md project rule | Production build inspection | `npm run build && npm run preview`, abrir DevTools console, exercitar fluxo R&S, grep "@" or "cpf" — zero hits |
| SLA: card muda cor após 2 dias / 5 dias | RS-12, D-10 | Time-based, requires data manipulation | Inserir aplicação com `current_stage_started_at = now() - interval '2 days'` → cor laranja; `interval '5 days'` → cor vermelha |
| Realtime silent re-render entre 2 RHs simultâneos | RS-04, D-04 | Multi-session test | Abrir kanban em 2 abas/users; mover candidato em uma; segunda aba atualiza sem toast |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify command OR mapped to Wave 0 dependency
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING test files in inventory above
- [ ] No `--watch` flags (CI/non-blocking only)
- [ ] Feedback latency < 60s
- [ ] All 6 manual-only verifications have UAT scripts in plans
- [ ] `nyquist_compliant: true` set in frontmatter once planner fills the per-task map

**Approval:** pending
