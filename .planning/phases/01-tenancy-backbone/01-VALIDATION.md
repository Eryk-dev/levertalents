---
phase: 1
slug: tenancy-backbone
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-27
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Source: `.planning/phases/01-tenancy-backbone/01-RESEARCH.md` § Validation Architecture

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.2 + RTL 16 + MSW 2.10 (frontend) + pgTAP + supabase-test-helpers 0.0.6 (database) |
| **Config file** | `vitest.config.ts` + `supabase/tests/` (Wave 0 installs both) |
| **Quick run command** | `npm test -- --run` (frontend) and `supabase test db` (database) |
| **Full suite command** | `npm test -- --run && supabase test db` |
| **Estimated runtime** | ~30 seconds (frontend ~15s, pgTAP ~15s) |

---

## Sampling Rate

- **After every task commit:** Run scoped quick command (`npm test -- --run path/to/affected.test.ts` or `supabase test db --files supabase/tests/{NN}-*.sql`)
- **After every plan wave:** Run full suite (`npm test -- --run && supabase test db`)
- **Before `/gsd-verify-work`:** Full suite must be green; cross-tenant pgTAP test (`002-cross-tenant-leakage.sql`) MUST pass
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

> Detailed mapping populated by gsd-planner during plan generation. Each task with `<automated>` verify entries seeds a row here. Manual rows pulled from "Manual-Only Verifications" below.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD-by-planner | — | — | — | — | — | — | — | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Test infrastructure does NOT exist today (zero tests). Wave 0 of Phase 1 MUST install and configure both frameworks before any other plan can have automated verify steps.

- [ ] `vitest.config.ts` — Vitest config with `jsdom` env, RTL setup, coverage thresholds
- [ ] `tests/setup.ts` — global test setup (RTL `beforeEach`/`cleanup`, MSW server start)
- [ ] `tests/msw/handlers.ts` — MSW request handlers for Supabase RPC stubs
- [ ] `supabase/tests/000-bootstrap.sql` — pgTAP plan + `supabase-test-helpers` v0.0.6 install verification
- [ ] `supabase/tests/001-helpers-smoke.sql` — `visible_companies` / `visible_org_units` / `org_unit_descendants` smoke
- [ ] `supabase/tests/002-cross-tenant-leakage.sql` — RH from Empresa A SELECTing from Empresa B → 0 rows AND 42501 on insert (CRITICAL gate)
- [ ] `supabase/tests/003-org-unit-descendants.sql` — recursive CTE produces correct uuid[] for arbitrary depth
- [ ] `supabase/tests/004-anti-cycle-trigger.sql` — BEFORE trigger blocks circular parent_id chain
- [ ] `supabase/tests/005-resolve-default-scope.sql` — RPC returns correct default per role
- [ ] `package.json` test scripts (`test`, `test:watch`, `test:coverage`)
- [ ] `.github/workflows/test.yml` (or equivalent) — runs `npm test -- --run && supabase test db` on every PR

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Scope switch perceptual smoothness (no flash) | TEN-06 | Visual perception across browsers | Open `/vagas` as Admin in Empresa A; switch to Empresa B in trigger; observe 0 frames showing Empresa A data on Empresa B page |
| Cross-tab BroadcastChannel propagation | (D-04 follow-up) | Multi-tab interaction | Open same app in 2 tabs; switch scope in tab 1; tab 2 must update trigger label + queryKeys within 1s |
| WhatsApp-friendly copy of disabled-trigger tooltip | RBAC-07 | Subjective wording | Login as `liderado` in 1 empresa; hover scope trigger; tooltip reads "Seu escopo é fixo" with no jargon |
| Default scope feel for first-login Sócio | D-10 | UX-perceived correctness | New sócio with 1 membership lands; trigger shows that empresa, no flash, no modal of choice |
| Mobile responsiveness of trigger + dropdown | TEN-05 | Real device feel | iPhone 13 Safari + Galaxy S22 Chrome — trigger compacto, dropdown não vaza viewport, busca funciona com keyboard mobile |
| ESLint rule message clarity | QUAL-07 | Readability of error message | `npm run lint` on a violating file shows actionable message ("Move `supabase.from()` into a hook in `src/hooks/`") |

---

## Threat-to-Test Map

> Phase 1 is security-sensitive. Each pitfall (PITFALLS.md P1/P3/P4/P6) has at least one automated test that fails when the mitigation is removed.

| Threat | Test File | Failure Mode |
|--------|-----------|--------------|
| P1 — Cross-tenant data leakage | `supabase/tests/002-cross-tenant-leakage.sql` | RH from Empresa A reads Empresa B data → test asserts 0 rows + 42501 on insert |
| P3 — RLS recursion / auth.uid() perf | `supabase/tests/001-helpers-smoke.sql` (EXPLAIN ANALYZE) | Helper not wrapped in `(SELECT auth.uid())` → query plan shows initPlan miss, runtime regresses |
| P4 — Cache pollution on scope switch | `tests/scope/useScopedQuery.test.tsx` | Switching scope leaks queryKey of previous scope into active queries — assert previous scope's query is `idle`, current scope refetches |
| P6 — org_units missing index / depth blow-up | `supabase/tests/003-org-unit-descendants.sql` (with pg_stat_statements) | Recursive CTE on `org_units` without `(company_id, parent_id)` index — assert query uses Index Scan, not Seq Scan |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies (planner enforces during plan generation)
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify (planner enforces)
- [ ] Wave 0 covers all MISSING references (frontend + database harness installed)
- [ ] No watch-mode flags (CI-friendly: `--run` for vitest, no `--watch` for pgTAP)
- [ ] Feedback latency < 30s (verified after Wave 0 lands)
- [ ] Cross-tenant pgTAP test (`002-cross-tenant-leakage.sql`) is GREEN — security gate
- [ ] `nyquist_compliant: true` set in frontmatter after first execute-phase pass

**Approval:** pending
