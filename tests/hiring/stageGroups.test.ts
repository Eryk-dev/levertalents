import { describe, it, expect } from 'vitest';
import {
  STAGE_GROUPS,
  STAGE_GROUP_BY_STAGE,
  STAGE_GROUP_BAR_COLORS,
  type StageGroupKey,
} from '@/lib/hiring/stageGroups';
import { APPLICATION_STAGE_TRANSITIONS } from '@/lib/hiring/statusMachine';

// Plan 02-03 Wave 1 — locks the 6-group mapping (RS-06) and forces
// STAGE_GROUP_BAR_COLORS to follow D-11 (intencionalidade do funil) — the
// regression guard for "alguém volta para cores antigas" listed as
// T-02-03-03 in the threat model.

describe('STAGE_GROUPS', () => {
  it('tem 6 grupos consolidados (RS-06)', () => {
    expect(STAGE_GROUPS.length).toBe(6);
  });

  it('cada grupo tem key + label + defaultStage + stages array', () => {
    for (const g of STAGE_GROUPS) {
      expect(typeof g.key).toBe('string');
      expect(typeof g.label).toBe('string');
      expect(typeof g.defaultStage).toBe('string');
      expect(Array.isArray(g.stages)).toBe(true);
      expect(g.stages.length).toBeGreaterThan(0);
    }
  });

  it('keys são exactly: triagem checagem entrevista_rh entrevista_final decisao descartados', () => {
    const keys = STAGE_GROUPS.map((g) => g.key).sort();
    expect(keys).toEqual(
      ['checagem', 'decisao', 'descartados', 'entrevista_final', 'entrevista_rh', 'triagem'].sort(),
    );
  });
});

describe('STAGE_GROUP_BY_STAGE', () => {
  it('todo stage de APPLICATION_STAGE_TRANSITIONS tem mapping para grupo', () => {
    const stages = Object.keys(APPLICATION_STAGE_TRANSITIONS);
    for (const stage of stages) {
      expect(
        STAGE_GROUP_BY_STAGE[stage as keyof typeof STAGE_GROUP_BY_STAGE],
      ).toBeDefined();
    }
  });

  it('stages legados estão mapeados (compat até Migration G)', () => {
    expect(
      STAGE_GROUP_BY_STAGE['aguardando_fit_cultural' as keyof typeof STAGE_GROUP_BY_STAGE],
    ).toBeDefined();
    expect(
      STAGE_GROUP_BY_STAGE['sem_retorno' as keyof typeof STAGE_GROUP_BY_STAGE],
    ).toBeDefined();
    expect(
      STAGE_GROUP_BY_STAGE['fit_recebido' as keyof typeof STAGE_GROUP_BY_STAGE],
    ).toBeDefined();
  });

  it('aguardando_fit_cultural mapeia para grupo triagem', () => {
    expect(STAGE_GROUP_BY_STAGE['aguardando_fit_cultural']).toBe('triagem');
  });

  it('sem_retorno mapeia para grupo triagem', () => {
    expect(STAGE_GROUP_BY_STAGE['sem_retorno']).toBe('triagem');
  });

  it('fit_recebido mapeia para grupo triagem', () => {
    expect(STAGE_GROUP_BY_STAGE['fit_recebido']).toBe('triagem');
  });
});

describe('STAGE_GROUP_BAR_COLORS — D-11 intencionalidade', () => {
  const expectedColors: Record<StageGroupKey, RegExp> = {
    triagem: /status-blue/, // movimento inicial
    checagem: /status-blue/, // movimento inicial
    entrevista_rh: /status-amber/, // entrevista
    entrevista_final: /status-amber/, // entrevista
    decisao: /status-green/, // aprovados / decisão
    descartados: /status-red/, // recusados
  };

  for (const [group, pattern] of Object.entries(expectedColors)) {
    it(`${group} usa ${pattern} (D-11)`, () => {
      const cls = STAGE_GROUP_BAR_COLORS[group as StageGroupKey];
      expect(cls).toMatch(pattern);
    });
  }

  it('todos os 6 grupos têm classe definida', () => {
    expect(Object.keys(STAGE_GROUP_BAR_COLORS).length).toBe(6);
  });

  it('triagem NÃO usa text-subtle (regression guard contra cor cinza antiga)', () => {
    expect(STAGE_GROUP_BAR_COLORS.triagem).not.toMatch(/text-subtle/);
  });

  it('entrevista_rh NÃO usa status-blue (regression guard contra azul antigo)', () => {
    expect(STAGE_GROUP_BAR_COLORS.entrevista_rh).not.toMatch(/status-blue/);
  });
});
