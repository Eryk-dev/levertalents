import { describe, it, expect } from 'vitest';
import { redact } from '@/lib/logger';

describe('logger.redact()', () => {
  it('redacts email-like strings', () => {
    const result = redact('User foo@bar.com signed in');
    expect(result).toBe('User [email-redacted] signed in');
  });

  it('redacts CPF-like strings (formatted)', () => {
    expect(redact('CPF 123.456.789-00')).toBe('CPF [cpf-redacted]');
  });

  it('redacts CPF-like strings (unformatted)', () => {
    expect(redact('cpf=12345678900')).toBe('cpf=[cpf-redacted]');
  });

  it('redacts known PII keys in objects', () => {
    expect(redact({ email: 'a@b.com', cpf: '123', other: 'safe' })).toEqual({
      email: '[redacted]',
      cpf: '[redacted]',
      other: 'safe',
    });
  });

  it('redacts full_name + nome variants', () => {
    expect(redact({ full_name: 'João Silva', fullName: 'Maria', nome: 'Pedro' })).toEqual({
      full_name: '[redacted]',
      fullName: '[redacted]',
      nome: '[redacted]',
    });
  });

  it('redacts deeply nested PII', () => {
    expect(
      redact({
        user: { profile: { email: 'a@b.com', name: 'Foo', age: 30 } },
      }),
    ).toEqual({
      user: { profile: { email: '[redacted]', name: '[redacted]', age: 30 } },
    });
  });

  it('handles arrays', () => {
    expect(redact(['user@a.com', 'safe'])).toEqual(['[email-redacted]', 'safe']);
  });

  it('passes through primitives', () => {
    expect(redact(42)).toBe(42);
    expect(redact(true)).toBe(true);
    expect(redact(null)).toBe(null);
  });
});
