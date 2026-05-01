import { AlertTriangle, ArrowRight, Minus } from 'lucide-react';
import { Chip, LinearAvatar } from '@/components/primitives/LinearKit';
import type { Database } from '@/integrations/supabase/types';

type EvaluationRow = Database['public']['Tables']['evaluations']['Row'];

export interface NineBoxComparisonProps {
  evaluatedName: string;
  /**
   * Evaluations for a single evaluated user, both directions if available.
   * Expected: at most one row with direction='leader_to_member' and one with
   * direction='self' per evaluated user (per cycle).
   */
  evaluations: EvaluationRow[];
}

const PERF_LABEL: Record<number, string> = {
  1: 'Abaixo do esperado',
  2: 'Dentro do esperado',
  3: 'Acima do esperado',
};

const POT_LABEL: Record<number, string> = {
  1: 'Baixo',
  2: 'Médio',
  3: 'Alto',
};

function readScore(ev: EvaluationRow | undefined, key: 'performance' | 'potential'): number | null {
  if (!ev) return null;
  const r = (ev.responses ?? {}) as Record<string, unknown>;
  const v = r[key];
  return typeof v === 'number' ? v : null;
}

function readComment(ev: EvaluationRow | undefined): string | null {
  if (!ev) return null;
  const r = (ev.responses ?? {}) as Record<string, unknown>;
  const c = r.comments;
  return typeof c === 'string' && c.trim().length > 0 ? c : null;
}

export function NineBoxComparison({ evaluatedName, evaluations }: NineBoxComparisonProps) {
  const leader = evaluations.find((e) => e.direction === 'leader_to_member' && e.status === 'submitted');
  const self = evaluations.find((e) => e.direction === 'self' && e.status === 'submitted');

  const leaderPerf = readScore(leader, 'performance');
  const leaderPot = readScore(leader, 'potential');
  const selfPerf = readScore(self, 'performance');
  const selfPot = readScore(self, 'potential');

  const perfDelta = leaderPerf != null && selfPerf != null ? leaderPerf - selfPerf : null;
  const potDelta = leaderPot != null && selfPot != null ? leaderPot - selfPot : null;

  const divergent =
    (perfDelta != null && Math.abs(perfDelta) >= 1) ||
    (potDelta != null && Math.abs(potDelta) >= 1);

  const bothSubmitted = !!leader && !!self;
  const onlyLeader = !!leader && !self;
  const onlySelf = !leader && !!self;

  return (
    <div className="rounded-md border border-border bg-card p-4 space-y-4">
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <LinearAvatar name={evaluatedName} size={22} />
          <span className="text-[14px] font-semibold text-text truncate">{evaluatedName}</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {bothSubmitted && divergent && (
            <Chip size="sm" color="amber" className="gap-1">
              <AlertTriangle className="h-3 w-3" /> Visões divergentes
            </Chip>
          )}
          {onlyLeader && (
            <Chip size="sm" color="neutral">Aguardando auto-avaliação</Chip>
          )}
          {onlySelf && (
            <Chip size="sm" color="neutral">Aguardando líder</Chip>
          )}
          {!leader && !self && (
            <Chip size="sm" color="neutral">Sem respostas</Chip>
          )}
        </div>
      </header>

      <div className="overflow-x-auto">
        <div className="grid min-w-[460px] grid-cols-[minmax(120px,1fr)_112px_112px_32px] gap-x-3 gap-y-2 items-center">
          <div className="text-[10.5px] uppercase tracking-wide text-text-subtle font-semibold">Eixo</div>
          <div className="text-[10.5px] uppercase tracking-wide text-text-subtle font-semibold text-center">Auto</div>
          <div className="text-[10.5px] uppercase tracking-wide text-text-subtle font-semibold text-center">Líder</div>
          <div className="text-[10.5px] uppercase tracking-wide text-text-subtle font-semibold text-right">Δ</div>

          <Row
            axis="Desempenho"
            self={selfPerf}
            leader={leaderPerf}
            delta={perfDelta}
            labels={PERF_LABEL}
          />
          <Row
            axis="Potencial"
            self={selfPot}
            leader={leaderPot}
            delta={potDelta}
            labels={POT_LABEL}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-border">
        <CommentBlock title="Comentário do liderado" body={readComment(self)} />
        <CommentBlock title="Comentário do líder" body={readComment(leader)} />
      </div>
    </div>
  );
}

function Row({
  axis,
  self,
  leader,
  delta,
  labels,
}: {
  axis: string;
  self: number | null;
  leader: number | null;
  delta: number | null;
  labels: Record<number, string>;
}) {
  return (
    <>
      <div className="text-[12.5px] font-medium text-text">{axis}</div>
      <ScoreCell value={self} label={self != null ? labels[self] : null} />
      <ScoreCell value={leader} label={leader != null ? labels[leader] : null} highlight />
      <DeltaCell delta={delta} />
    </>
  );
}

function ScoreCell({ value, label, highlight }: { value: number | null; label: string | null; highlight?: boolean }) {
  if (value == null) {
    return (
      <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-border bg-bg-subtle/30 px-2 py-1.5 min-h-[44px]">
        <span className="text-[16px] font-semibold tabular-nums text-text-muted">—</span>
      </div>
    );
  }
  return (
    <div
      className={
        highlight
          ? 'flex flex-col items-center justify-center rounded-md border-2 border-accent bg-accent-soft/30 px-2 py-1.5 min-h-[44px]'
          : 'flex flex-col items-center justify-center rounded-md border border-border bg-card px-2 py-1.5 min-h-[44px]'
      }
    >
      <span className={highlight ? 'text-[16px] font-semibold tabular-nums text-accent-text' : 'text-[16px] font-semibold tabular-nums text-text'}>
        {value}
      </span>
      <span className="text-[10px] text-text-muted text-center leading-tight">{label}</span>
    </div>
  );
}

function DeltaCell({ delta }: { delta: number | null }) {
  if (delta == null) {
    return (
      <span className="text-[12px] text-text-muted text-right tabular-nums">—</span>
    );
  }
  if (delta === 0) {
    return (
      <span className="inline-flex items-center justify-end gap-1 text-[12.5px] tabular-nums text-text-muted">
        <Minus className="h-3 w-3" /> 0
      </span>
    );
  }
  const isHigh = Math.abs(delta) >= 1;
  const sign = delta > 0 ? '+' : '';
  return (
    <span
      className={
        isHigh
          ? 'inline-flex items-center justify-end gap-1 text-[12.5px] font-semibold tabular-nums text-status-amber'
          : 'inline-flex items-center justify-end gap-1 text-[12.5px] tabular-nums text-text-muted'
      }
    >
      <ArrowRight className="h-3 w-3" />
      {sign}
      {delta}
    </span>
  );
}

function CommentBlock({ title, body }: { title: string; body: string | null }) {
  return (
    <div className="space-y-1">
      <p className="text-[10.5px] uppercase tracking-wide text-text-subtle font-semibold">{title}</p>
      {body ? (
        <p className="text-[12.5px] text-text whitespace-pre-wrap leading-snug">{body}</p>
      ) : (
        <p className="text-[12px] text-text-muted italic">Sem comentário.</p>
      )}
    </div>
  );
}
