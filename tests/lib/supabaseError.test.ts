import { describe, it, expect } from 'vitest';
import {
  detectRlsDenial,
  detectNetworkDrop,
  detectConflict,
  detectTransitionReject,
  getMoveErrorToastConfig,
  type MoveApplicationError,
} from '@/lib/supabaseError';
import type { PostgrestError } from '@supabase/supabase-js';

// Plan 02-03 Wave 1 — exercises the discriminated union + 4 detect helpers
// added to src/lib/supabaseError.ts (RESEARCH §4 lines 547-656).

describe('detectRlsDenial', () => {
  it('retorna true para PostgrestError com code 42501', () => {
    expect(detectRlsDenial({ code: '42501', message: 'permission denied' })).toBe(true);
  });
  it('retorna false para code != 42501', () => {
    expect(detectRlsDenial({ code: '23514' })).toBe(false);
  });
  it('retorna false para null/undefined/strings', () => {
    expect(detectRlsDenial(null)).toBe(false);
    expect(detectRlsDenial(undefined)).toBe(false);
    expect(detectRlsDenial('oops')).toBe(false);
  });
});

describe('detectNetworkDrop', () => {
  it('retorna true para TypeError com /fetch/i message', () => {
    expect(detectNetworkDrop(new TypeError('Failed to fetch'))).toBe(true);
  });
  it('retorna true para AbortError', () => {
    const e = new Error('timeout');
    e.name = 'AbortError';
    expect(detectNetworkDrop(e)).toBe(true);
  });
  it('retorna true para PostgrestError com code === ""', () => {
    expect(detectNetworkDrop({ code: '' })).toBe(true);
  });
  it('retorna false para PostgrestError com code 42501', () => {
    expect(detectNetworkDrop({ code: '42501' })).toBe(false);
  });
  it('retorna false para erro genérico (Error sem fetch nem AbortError)', () => {
    expect(detectNetworkDrop(new Error('boom'))).toBe(false);
  });
});

describe('detectConflict', () => {
  it('retorna true para code 23514 com /transition/i message', () => {
    expect(
      detectConflict({
        code: '23514',
        message: 'Invalid stage transition em_interesse -> contratado',
      }),
    ).toBe(true);
  });
  it('retorna false para code 23514 sem "transition" na mensagem', () => {
    expect(detectConflict({ code: '23514', message: 'check_violation other' })).toBe(false);
  });
  it('retorna false para code != 23514', () => {
    expect(detectConflict({ code: '23505', message: 'transition' })).toBe(false);
  });
  it('retorna false para null/undefined', () => {
    expect(detectConflict(null)).toBe(false);
    expect(detectConflict(undefined)).toBe(false);
  });
});

describe('detectTransitionReject', () => {
  it('retorna true para objeto kind=transition', () => {
    const err: MoveApplicationError = {
      kind: 'transition',
      from: 'em_interesse',
      to: 'contratado',
    };
    expect(detectTransitionReject(err)).toBe(true);
  });
  it('retorna false para kind!=transition', () => {
    expect(
      detectTransitionReject({
        kind: 'rls',
        error: { code: '42501' } as PostgrestError,
      } as MoveApplicationError),
    ).toBe(false);
  });
  it('retorna false para null/undefined', () => {
    expect(detectTransitionReject(null)).toBe(false);
    expect(detectTransitionReject(undefined)).toBe(false);
  });
});

describe('getMoveErrorToastConfig', () => {
  it('rls: title "Sem permissão" + duration 8000', () => {
    const cfg = getMoveErrorToastConfig({
      kind: 'rls',
      error: { code: '42501', message: '' } as PostgrestError,
    });
    expect(cfg.title).toBe('Sem permissão');
    expect(cfg.duration).toBe(8000);
  });
  it('network: title "Sem conexão" + duration 4000', () => {
    const cfg = getMoveErrorToastConfig({ kind: 'network', error: new Error('net') });
    expect(cfg.title).toBe('Sem conexão');
    expect(cfg.duration).toBe(4000);
  });
  it('conflict: title "Atualizado por outra pessoa"', () => {
    expect(getMoveErrorToastConfig({ kind: 'conflict' }).title).toBe(
      'Atualizado por outra pessoa',
    );
  });
  it('transition: description inclui from + to', () => {
    const cfg = getMoveErrorToastConfig({
      kind: 'transition',
      from: 'Em interesse',
      to: 'Contratado',
    });
    expect(cfg.description).toContain('Em interesse');
    expect(cfg.description).toContain('Contratado');
  });
  it('unknown: title "Erro ao mover candidato"', () => {
    expect(getMoveErrorToastConfig({ kind: 'unknown', error: '??' }).title).toBe(
      'Erro ao mover candidato',
    );
  });
});
