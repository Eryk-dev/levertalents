import { describe, it } from 'vitest';

// Wave 3 will implement src/lib/passwordGenerator.ts (mirror of Edge Function CSPRNG).
// This file is a Wave 0 stub — failing-by-default until then.
// TODO Wave 3: remover describe.skip e implementar src/lib/passwordGenerator.ts
describe.skip('passwordGenerator (Wave 3)', () => {
  it.todo('returns exactly 8 characters [INV-3-16]');
  it.todo(
    'every char ∈ ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789 (56 chars, D-21)',
  );
  it.todo('rejects ambiguous chars 0/O/o/1/l/I from output across 1000 samples');
  it.todo('uses crypto.getRandomValues (Web Crypto), not Math.random');
});
