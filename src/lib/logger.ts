/**
 * PII-aware logger wrapper.
 *
 * - DEV (`import.meta.env.DEV`): forwards untouched to console.* — full
 *   visibility for local debugging.
 * - PROD: redacts known PII fields in objects (`PII_KEYS`) and string-form
 *   email + CPF patterns. Phase 4 (QUAL-06) will replace this with
 *   Sentry beforeSend integration; the redact() function is the same.
 *
 * AUTH-04, AUTH-05.
 *
 * Adoption: new code in Phase 1 uses logger.* exclusively. The 6+ existing
 * console.log/error sites flagged in CONCERNS.md stay until Phase 4
 * polish (per RESEARCH.md Gate 4 adoption strategy).
 */

const PII_KEYS = new Set([
  'email',
  'cpf',
  'full_name',
  'fullName',
  'name',
  'nome',
  'phone',
  'telefone',
  'salary',
  'salario',
  'birth_date',
  'birthDate',
  'data_nascimento',
]);

const EMAIL_RE = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
const CPF_RE = /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g;
// Generic 11-digit CPF (no formatting) — covers patterns like `cpf=12345678900`.
const CPF_DIGITS_RE = /\b\d{11}\b/g;

export function redact(value: unknown): unknown {
  if (typeof value === 'string') {
    return value
      .replace(EMAIL_RE, '[email-redacted]')
      .replace(CPF_RE, '[cpf-redacted]')
      .replace(CPF_DIGITS_RE, '[cpf-redacted]');
  }
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = PII_KEYS.has(k) ? '[redacted]' : redact(v);
    }
    return out;
  }
  return value;
}

const isDev =
  typeof import.meta !== 'undefined' &&
  Boolean((import.meta as ImportMeta).env?.DEV);

/* eslint-disable no-console */
export const logger = {
  log: (...args: unknown[]) => {
    if (isDev) {
      console.log(...args);
      return;
    }
    console.log(...args.map(redact));
  },
  warn: (...args: unknown[]) => {
    if (isDev) {
      console.warn(...args);
      return;
    }
    console.warn(...args.map(redact));
  },
  error: (...args: unknown[]) => {
    if (isDev) {
      console.error(...args);
      return;
    }
    console.error(...args.map(redact));
  },
  debug: (...args: unknown[]) => {
    if (isDev) {
      console.debug(...args);
    }
    // No-op in production
  },
};
/* eslint-enable no-console */
