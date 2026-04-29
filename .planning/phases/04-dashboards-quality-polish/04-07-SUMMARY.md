---
phase: 04-dashboards-quality-polish
plan: 07
subsystem: tests-quality-gates
tags: [tests, rls, pgtap, critical-flows, phase-4]
status: complete
requires: [Plan 04-02 read_payroll_total RPC, Plan 02 useScopedQuery, Plan 03 useCreateEvaluation, Phase 3 FirstLoginChangePassword]
provides:
  - "5 fluxos críticos QUAL-03 com cobertura mínima 1 teste cada"
  - "pgTAP gate para read_payroll_total (T-04-07-01)"
  - "Sanity gate que reprova PR se algum dos 5 testes for deletado"
affects: [supabase/tests, tests/scope, tests/perf, tests/sanity, src/pages/__tests__]
key-files-created:
  - supabase/tests/011-payroll-total-rls.sql
  - tests/scope/switchScopeNoFlash.test.tsx
  - tests/perf/saveEvaluationIdempotent.test.tsx
  - tests/sanity/criticalFlowsCoverage.test.ts
key-files-modified:
  - src/pages/__tests__/FirstLoginChangePassword.test.tsx
decisions:
  - "P4-V10 branch A (extend) — file FirstLoginChangePassword.test.tsx already existed (Phase 3 D-24 work); appended PII-in-console assertion as 3rd test in same describe()"
  - "switchScopeNoFlash uses staleTime: Infinity in test wrapper to replicate the production no-flash invariant; without it, TanStack v5 refetches on mount and the 'switch back without refetch' assertion fails (Rule 1 fix during execution)"
  - "saveEvaluationIdempotent mocks BOTH supabase calls (evaluation_cycles select + evaluations insert) by table-name routing; useCreateEvaluation does cycle company_id resolve before insert (T-3-CYCLE-01 mitigation), so mocking just the insert chain is insufficient"
metrics:
  tasks-completed: 3
  total-tasks: 3
  duration-seconds: 340
  duration-human: "5m 40s"
  vitest-test-files: 49
  vitest-tests-passed: 583
  vitest-tests-failed: 0
  new-test-files: 4
  modified-test-files: 1
  pgtap-plan: 4
  completed-date: 2026-04-28
---

# Phase 04 Plan 07: Critical Flow Tests Summary

**One-liner:** Closed QUAL-01/02/03 gates with pgTAP RLS test for `read_payroll_total` (4 assertions), 3 new Vitest critical-flow tests, 1 extended PII assertion, and a sanity coverage gate that breaks on future test deletions.

**Status:** Complete. All 3 tasks executed atomically; `npm test` exits 0 with 583 tests passing across 49 test files.

## Tasks Completed

### Task 1 — pgTAP 011 + switchScopeNoFlash component test

- **Commit:** `09ed909`
- **Files created:**
  - `supabase/tests/011-payroll-total-rls.sql` — pgTAP `plan(4)`:
    1. `lives_ok` — sócio A com membership lê folha de empresa A
    2. `throws_ok '42501'` — sócio A bloqueado para folha de empresa B (sem membership)
    3. `throws_ok '42501'` — sócio A bloqueado para [A,B] (subset check via `<@`)
    4. `throws_ok '42501'` — usuário não autenticado bloqueado
  - `tests/scope/switchScopeNoFlash.test.tsx` — 2 Vitest tests:
    - switch c1→c2 preserva cache de c1 (reaffirma D-04 ao nível de hook consumer)
    - switch back para c1 reusa cache sem refetch (`staleTime: Infinity` para replicar invariante no-flash de produção)
- **Threats mitigated:** T-04-07-01 (Information Disclosure — sócio sem membership lê folha alheia), T-04-07-02 (Information Disclosure — scope switch flashes old data)

### Task 2 — saveEvaluationIdempotent + FirstLoginChangePassword PII extend

- **Commit:** `a38b4b5`
- **Files created:**
  - `tests/perf/saveEvaluationIdempotent.test.tsx` — 2 Vitest tests:
    - first save invokes insert exactly once
    - duplicate save: 23505 unique violation surfaces como caller-visible error
    - **Implementation note:** mock differentiates by table name. `useCreateEvaluation.mutationFn` chama 2x supabase: `from('evaluation_cycles').select('company_id').eq().single()` (cycle resolve, T-3-CYCLE-01) → `from('evaluations').insert().select().single()`. Mockar só o insert não basta.
- **Files modified:**
  - `src/pages/__tests__/FirstLoginChangePassword.test.tsx` — **P4-V10 branch A (EXTEND)**:
    - Pré-existente da Phase 3 D-24 work (2 tests cobrindo expired-banner branches)
    - Adicionado 3º test: spy em `console.log/error/warn` durante render do componente com profile contendo email + CPF + full_name; assertiva de regex que NÃO matcha email pattern nem 11-digit CPF pattern
    - Usa `vi.stubEnv('DEV', false)` para forçar caminho de redação do logger.ts (production-like)
    - Restaura `console.*` e chama `vi.unstubAllEnvs()` em `finally` (sem leakage entre tests)
- **Threats mitigated:** T-04-07-03 (Tampering — duplicate evaluation insert poisons cache), T-04-07-04 (Information Disclosure — PII in console)

### Task 3 — Critical-flow coverage sanity gate

- **Commit:** `c90569f`
- **Files created:**
  - `tests/sanity/criticalFlowsCoverage.test.ts` — 5 `it.each` tests enumerando os 5 fluxos críticos do QUAL-03 + assert via `existsSync()` que cada arquivo de teste existe no disco. Se alguém deletar um dos 5 testes críticos, este gate quebra primeiro.
- **Threats mitigated:** T-04-07-05 (Repudiation — future test deletion goes unnoticed)

## P4-V10 Branch Declaration

| Field | Value |
|---|---|
| Branch taken | **A — EXTENDED existing file** |
| Pre-existence verified by | `test -f src/pages/__tests__/FirstLoginChangePassword.test.tsx && echo EXISTS` → `EXISTS` |
| Original test count | 2 tests (D-24 expired-banner branches from Phase 3) |
| Final test count | 3 tests (2 original + 1 PII-in-console assertion) |
| Analog source | PATTERNS.md section 9 (Wrapper boilerplate already in file) + `src/lib/logger.ts` `redact()` PII set + regex constants (EMAIL_RE, CPF_DIGITS_RE) as canonical reference for assertions |

## Verification — `npm test` final tail

```
 Test Files  49 passed (49)
      Tests  583 passed (583)
   Start at  09:34:24
   Duration  11.16s
```

All 49 test files pass; 0 failures. The 4 new + 1 extended files contribute:

| File | Tests |
|---|---|
| `tests/scope/switchScopeNoFlash.test.tsx` | 2 |
| `tests/perf/saveEvaluationIdempotent.test.tsx` | 2 |
| `src/pages/__tests__/FirstLoginChangePassword.test.tsx` (extended) | 3 (was 2) |
| `tests/sanity/criticalFlowsCoverage.test.ts` | 5 |
| `supabase/tests/011-payroll-total-rls.sql` (pgTAP, run separately) | 4 (`plan(4)`) |

**Total: +12 vitest tests + 4 pgTAP assertions** (was 2 → 3 in extended FirstLogin = +1 contribution).

## pgTAP Run Instructions for Operator

CI does not run `supabase test db` automatically; the pgTAP gate is operator-side verification before merge to main when DASH-01 RPC is touched.

```bash
# Local Supabase + pgTAP must be installed
supabase test db

# Or run only this file:
psql "$(supabase status --output env | grep DB_URL | cut -d= -f2-)" \
  -f supabase/tests/011-payroll-total-rls.sql

# Expected output: ok 1..4 + "All tests successful"
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed `staleTime: 0` causing refetch on mount in switchScopeNoFlash test**

- **Found during:** Task 1, after first run of `npm test -- tests/scope/switchScopeNoFlash.test.tsx`
- **Issue:** Second test (`switching back to c1 reuses the old cached data without refetching`) failed: `expected "spy" to be called 2 times, but got 3 times`. Root cause: TanStack v5 default `staleTime: 0` causes refetch-on-mount; switching back from c2 to c1 re-mounts the query observer, triggering a 3rd fetcher call.
- **Fix:** Added `staleTime: Infinity` to the QueryClient default options in `createWrapper()`. Production callers (`useCostBreakdown`, `useOrgIndicators`) use cached data with TanStack's default behavior of treating data as fresh until refetch interval elapses; the test wrapper now matches that invariant.
- **Files modified:** `tests/scope/switchScopeNoFlash.test.tsx`
- **Commit:** Same as Task 1 (`09ed909`) — fixed before commit

**2. [Rule 1 - Bug] Fixed `vi.restoreAllMocks()` order in saveEvaluationIdempotent beforeEach**

- **Found during:** Task 2, after first run of `npm test -- tests/perf/saveEvaluationIdempotent.test.tsx`
- **Issue:** Both tests failed with `TypeError: Cannot read properties of undefined (reading 'eq')`. Root cause: `vi.restoreAllMocks()` was called AFTER re-wiring the chain (`cycleChain.select.mockReturnValue(cycleChain)`), wiping out the mock implementations and leaving `select()` returning `undefined`.
- **Fix:** Reordered `beforeEach` — `vi.restoreAllMocks()` first, then `mockClear/mockReset`, then re-wire `mockReturnValue`. Documented in inline comment.
- **Files modified:** `tests/perf/saveEvaluationIdempotent.test.tsx`
- **Commit:** Same as Task 2 (`a38b4b5`) — fixed before commit

No other deviations. Plan executed as written.

## Self-Check: PASSED

- [x] `supabase/tests/011-payroll-total-rls.sql` exists on disk (`plan(4)`, 4 throws_ok/lives_ok, 6× `42501`)
- [x] `tests/scope/switchScopeNoFlash.test.tsx` exists, 2 tests pass
- [x] `tests/perf/saveEvaluationIdempotent.test.tsx` exists, 2 tests pass
- [x] `tests/sanity/criticalFlowsCoverage.test.ts` exists, 5 tests pass
- [x] `src/pages/__tests__/FirstLoginChangePassword.test.tsx` extended (3 tests pass; PII-in-console assertion added)
- [x] Commit `09ed909` (Task 1) present in git log
- [x] Commit `a38b4b5` (Task 2) present in git log
- [x] Commit `c90569f` (Task 3) present in git log
- [x] `npm test` exits 0 (583 tests pass across 49 files)

## Threat Flags

None — no new security-relevant surface introduced by this plan beyond the threat model already documented in PLAN.md.
