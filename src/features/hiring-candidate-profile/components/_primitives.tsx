/**
 * Primitives compartilhados pelos sub-componentes do CandidateProfile.
 * Mantidos privados ao feature folder (prefixo `_`).
 */

export function SectionTitle({
  children,
  icon,
  count,
  right,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
  count?: number;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        {icon ? <span className="text-text-subtle">{icon}</span> : null}
        <h2 className="text-[13px] font-semibold tracking-[-0.005em] text-text m-0">
          {children}
        </h2>
        {typeof count === "number" ? (
          <span className="inline-flex items-center justify-center rounded bg-bg-muted px-1.5 text-[10.5px] tabular-nums text-text-muted">
            {count}
          </span>
        ) : null}
      </div>
      {right}
    </div>
  );
}

export function KVLine({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-[10.5px] font-semibold text-text-subtle uppercase tracking-[0.04em]">
        {label}
      </div>
      <div className="text-[13px] text-text mt-0.5">{children}</div>
    </div>
  );
}

export function PropertyRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-border last:border-b-0 min-h-[30px]">
      <div className="text-[10.5px] font-semibold uppercase tracking-[0.04em] text-text-subtle shrink-0">
        {label}
      </div>
      <div className="text-[12.5px] text-text min-w-0 text-right truncate">
        {children}
      </div>
    </div>
  );
}

export function formatRelative(timestamp: number) {
  const diff = Date.now() - timestamp;
  const dayMs = 86_400_000;
  const days = Math.floor(diff / dayMs);
  if (days <= 0) return "hoje";
  if (days === 1) return "ontem";
  if (days < 30) return `há ${days}d`;
  const months = Math.floor(days / 30);
  if (months < 12) return `há ${months}m`;
  return `há ${Math.floor(months / 12)}a`;
}
