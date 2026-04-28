/**
 * CPF utilities — mirror lado-client do trigger DB `tg_normalize_candidate_cpf`
 * (Migration F.4, supabase/migrations/20260428120300_f4_cpf_canonical_dedup.sql).
 *
 * Usados por:
 * - `DuplicateCandidateDialog` (Plan 02-08): busca candidato existente por CPF
 *   antes de criar duplicata
 * - `CandidateForm` (Plan 02-08): exibe CPF formatado em UI mantendo storage normalizado
 * - `useCandidateByCpf` hook (Plan 02-08): query lookup por chave canonical
 *
 * Pure functions, sem side-effects, sem deps externas.
 */

/**
 * Remove tudo que não é dígito. Retorna `null` para input vazio/null/undefined
 * ou string sem nenhum dígito. NÃO valida tamanho — preserva CPFs curtos
 * (callers que precisam de validação usam `isValidCpfFormat`).
 */
export function normalizeCpf(input: string | null | undefined): string | null {
  if (input === null || input === undefined) return null;
  const digits = input.replace(/[^0-9]/g, "");
  if (digits.length === 0) return null;
  return digits;
}

/**
 * Formata 11 dígitos como '123.456.789-01'. Para input com !=11 dígitos,
 * retorna o input original (não tenta formatar inválido). null/undefined → "".
 */
export function formatCpf(input: string | null | undefined): string {
  if (input === null || input === undefined) return "";
  const norm = normalizeCpf(input);
  if (!norm || norm.length !== 11) return input;
  return `${norm.slice(0, 3)}.${norm.slice(3, 6)}.${norm.slice(6, 9)}-${norm.slice(9, 11)}`;
}

/**
 * Apenas checa formato (11 dígitos pós-normalização). NÃO valida dígitos
 * verificadores — validação semântica é responsabilidade de outra camada
 * se/quando necessária (Receita Federal-grade).
 */
export function isValidCpfFormat(input: string | null | undefined): boolean {
  const norm = normalizeCpf(input);
  return norm !== null && norm.length === 11;
}
