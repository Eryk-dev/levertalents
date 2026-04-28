import { describe, it, expect } from 'vitest';
import {
  canTransition,
  APPLICATION_STAGE_TRANSITIONS,
} from '@/lib/hiring/statusMachine';
import type { ApplicationStage } from '@/integrations/supabase/hiring-types';

// Plan 02-03 Wave 1 — exhaustive truth-table coverage of canTransition()
// for the 'application' kind. Phase 2 does NOT alter the transition table;
// this suite locks current behaviour so Plan 02-05 (CandidatesKanban
// rewrite) can wire `canTransition` BEFORE `mutate` (D-02) without fear
// of regression.

describe('canTransition (application) — exhaustive truth table', () => {
  const allStages = Object.keys(APPLICATION_STAGE_TRANSITIONS) as ApplicationStage[];

  for (const from of allStages) {
    for (const to of allStages) {
      const expected =
        from === to || APPLICATION_STAGE_TRANSITIONS[from].includes(to);
      it(`${from} → ${to} = ${expected}`, () => {
        expect(canTransition(from, to, 'application')).toBe(expected);
      });
    }
  }
});

describe('canTransition (application) — sanity', () => {
  it('retorna true para mesma stage (idempotente)', () => {
    expect(canTransition('em_interesse', 'em_interesse', 'application')).toBe(true);
  });

  it('retorna true para transição válida no mapping (em_interesse → antecedentes_ok)', () => {
    expect(canTransition('em_interesse', 'antecedentes_ok', 'application')).toBe(true);
  });

  it('retorna false para transição não-listada (em_interesse → admitido pula etapas)', () => {
    expect(canTransition('em_interesse', 'admitido', 'application')).toBe(false);
  });

  it('admitido é estado terminal (sem destinos)', () => {
    expect(APPLICATION_STAGE_TRANSITIONS['admitido']).toEqual([]);
    expect(canTransition('admitido', 'em_interesse', 'application')).toBe(false);
  });

  it('recusado é estado terminal (sem destinos)', () => {
    expect(APPLICATION_STAGE_TRANSITIONS['recusado']).toEqual([]);
    expect(canTransition('recusado', 'em_interesse', 'application')).toBe(false);
  });
});
