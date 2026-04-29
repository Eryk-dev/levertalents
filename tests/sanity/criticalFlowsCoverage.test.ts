import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * QUAL-01/02/03 sanity gate: every critical flow MUST have at least one test file.
 * If a future edit deletes one of these, this sanity test breaks first.
 *
 * Reference: ROADMAP.md Phase 4 success criterion 4 (5 fluxos críticos).
 */
const FLOWS: Array<{ name: string; path: string }> = [
  {
    name: '1) Login + troca de senha',
    path: 'src/pages/__tests__/FirstLoginChangePassword.test.tsx',
  },
  {
    name: '2) Switch de escopo sem flash',
    path: 'tests/scope/switchScopeNoFlash.test.tsx',
  },
  {
    name: '3) Mover candidato no kanban (conflict/network/permission)',
    path: 'tests/hiring/useMoveApplicationStage.test.tsx',
  },
  {
    name: '4) Salvar avaliação idempotente',
    path: 'tests/perf/saveEvaluationIdempotent.test.tsx',
  },
  {
    name: '5) RLS cross-empresa fail-test (payroll)',
    path: 'supabase/tests/011-payroll-total-rls.sql',
  },
];

describe('5 fluxos críticos QUAL-03 — coverage gate', () => {
  it.each(FLOWS)('flow exists: $name', ({ path }) => {
    expect(
      existsSync(resolve(path)),
      `Missing test for critical flow: ${path}`,
    ).toBe(true);
  });
});
