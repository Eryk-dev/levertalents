// LGPD retention helpers (FR-029): candidatos cujo último processo fechou há
// mais de 5 anos devem ser anonimizados. UI uses `isRetentionExpired` to
// show the "Anonimizar candidato" action and surface the expunge date.

export function computeExpungeDate(lastProcessClosedAt: Date | string): Date {
  const base = typeof lastProcessClosedAt === "string"
    ? new Date(lastProcessClosedAt)
    : lastProcessClosedAt;
  const out = new Date(base.getTime());
  out.setFullYear(out.getFullYear() + 5);
  return out;
}

export function isRetentionExpired(candidate: {
  closed_at?: string | null;
  lastProcessClosedAt?: string | null;
  anonymized_at?: string | null;
}): boolean {
  if (candidate.anonymized_at) return false;
  const closedAt = candidate.lastProcessClosedAt ?? candidate.closed_at;
  if (!closedAt) return false;
  return computeExpungeDate(closedAt).getTime() <= Date.now();
}
