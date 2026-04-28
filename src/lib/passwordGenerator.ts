/**
 * D-21: 8 chars from [a-z A-Z 2-9] excluindo 0, O, o, 1, l, I (chars ambíguos)
 * 56-char alphabet × 8 positions = 56^8 ≈ 9.6T combinations
 *
 * Uses Web Crypto (crypto.getRandomValues) — same primitive as Edge Function;
 * never use Math.random.
 */
export const TEMP_PASSWORD_ALPHABET = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateTempPassword(): string {
  if (TEMP_PASSWORD_ALPHABET.length !== 56) {
    throw new Error('TEMP_PASSWORD_ALPHABET must be exactly 56 chars (D-21)');
  }
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  let out = '';
  for (let i = 0; i < 8; i++) {
    out += TEMP_PASSWORD_ALPHABET[bytes[i] % TEMP_PASSWORD_ALPHABET.length];
  }
  return out;
}
