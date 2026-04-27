import { formatInTimeZone, toZonedTime } from 'date-fns-tz';
import { ptBR } from 'date-fns/locale';

const TZ = 'America/Sao_Paulo';

/**
 * Format any timestamp/date in São Paulo timezone with PT-BR locale.
 * Replaces `new Date(x).toLocaleString('pt-BR', ...)` (browser-tz-dependent).
 *
 * QUAL-10.
 */
export function formatBR(
  input: string | Date | number | null | undefined,
  fmt = 'dd/MM/yyyy HH:mm',
): string {
  if (input === null || input === undefined || input === '') return '';
  return formatInTimeZone(input, TZ, fmt, { locale: ptBR });
}

/** Date-only formatter (no time). */
export function formatBRDate(input: string | Date | number | null | undefined): string {
  return formatBR(input, 'dd/MM/yyyy');
}

/** Time-only formatter. */
export function formatBRTime(input: string | Date | number | null | undefined): string {
  return formatBR(input, 'HH:mm');
}

/** Relative format (e.g., "há 3 dias"). */
export function formatBRRelative(input: string | Date | number | null | undefined): string {
  if (input === null || input === undefined || input === '') return '';
  const zoned = toZonedTime(input, TZ);
  const diff = (Date.now() - zoned.getTime()) / 1000;
  if (diff < 60) return 'agora';
  if (diff < 3600) return `há ${Math.floor(diff / 60)} min`;
  if (diff < 86_400) return `há ${Math.floor(diff / 3600)} h`;
  if (diff < 604_800) return `há ${Math.floor(diff / 86_400)} d`;
  return formatBRDate(zoned);
}
