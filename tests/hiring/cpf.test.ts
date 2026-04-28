import { describe, it, expect } from 'vitest';
import { normalizeCpf, formatCpf, isValidCpfFormat } from '@/lib/hiring/cpf';

// Plan 02-03 Wave 1 — pure CPF helpers (mirrors DB trigger
// tg_normalize_candidate_cpf from Migration F.4).

describe('normalizeCpf', () => {
  it('remove pontuação 123.456.789-00', () => {
    expect(normalizeCpf('123.456.789-00')).toBe('12345678900');
  });
  it('preserva CPF já normalizado', () => {
    expect(normalizeCpf('12345678901')).toBe('12345678901');
  });
  it('retorna null para null/undefined', () => {
    expect(normalizeCpf(null)).toBeNull();
    expect(normalizeCpf(undefined)).toBeNull();
  });
  it('retorna null para string vazia', () => {
    expect(normalizeCpf('')).toBeNull();
  });
  it('retorna null para string sem dígitos', () => {
    expect(normalizeCpf('---')).toBeNull();
    expect(normalizeCpf('abc')).toBeNull();
  });
  it('preserva CPFs curtos (não-validados aqui — só normaliza)', () => {
    expect(normalizeCpf('123')).toBe('123');
  });
  it('aceita CPF com hífen e ponto: 987.654.321-00', () => {
    expect(normalizeCpf('987.654.321-00')).toBe('98765432100');
  });
});

describe('formatCpf', () => {
  it('formata 11 dígitos', () => {
    expect(formatCpf('12345678901')).toBe('123.456.789-01');
  });
  it('formata input já formatado (re-format)', () => {
    expect(formatCpf('987.654.321-00')).toBe('987.654.321-00');
  });
  it('retorna string vazia para null', () => {
    expect(formatCpf(null)).toBe('');
  });
  it('retorna string vazia para undefined', () => {
    expect(formatCpf(undefined)).toBe('');
  });
  it('retorna input se !=11 dígitos (não tenta formatar inválido)', () => {
    expect(formatCpf('123')).toBe('123');
  });
});

describe('isValidCpfFormat', () => {
  it('true para 11 dígitos', () => {
    expect(isValidCpfFormat('12345678901')).toBe(true);
    expect(isValidCpfFormat('123.456.789-01')).toBe(true);
  });
  it('false para !=11 dígitos', () => {
    expect(isValidCpfFormat('12345')).toBe(false);
    expect(isValidCpfFormat(null)).toBe(false);
    expect(isValidCpfFormat(undefined)).toBe(false);
    expect(isValidCpfFormat('')).toBe(false);
  });
});
