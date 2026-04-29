export function normalizeUsername(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "");
}

export function usernameToAuthEmail(username: string): string {
  return `${normalizeUsername(username)}@users.levertalents.com`;
}

export const usernameSchemaMessage =
  "Usuário deve ter 3 a 40 caracteres e usar letras, números, ponto, hífen ou underscore";
