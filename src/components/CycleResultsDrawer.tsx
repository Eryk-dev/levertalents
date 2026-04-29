import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Check, ChevronRight } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Btn, Chip, LinearAvatar } from '@/components/primitives/LinearKit';
import { supabase } from '@/integrations/supabase/client';
import { useEvaluations, type EvaluationDirection } from '@/hooks/useEvaluations';
import { useCycleAudienceUsers, type AudienceUser } from '@/hooks/useCycleAudienceUsers';
import { useAuth } from '@/hooks/useAuth';
import { EvaluationForm } from '@/components/EvaluationForm';
import {
  templateSnapshotSchema,
  type TemplateSnapshot,
  type TemplateQuestion,
} from '@/lib/evaluationTemplate';
import type { Database } from '@/integrations/supabase/types';

type CycleRow = Database['public']['Tables']['evaluation_cycles']['Row'];
type EvaluationRow = Database['public']['Tables']['evaluations']['Row'];

export interface CycleResultsDrawerProps {
  cycle: CycleRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const directionLabel: Record<string, string> = {
  self: 'Autoavaliação',
  leader_to_member: 'Líder → liderado',
  member_to_leader: 'Liderado → líder',
  peer: 'Entre pares',
};

export function CycleResultsDrawer({ cycle, open, onOpenChange }: CycleResultsDrawerProps) {
  const { user } = useAuth();
  const evaluationsQuery = useEvaluations(cycle?.id ?? null);
  const audienceQuery = useCycleAudienceUsers(cycle);
  const evaluations = evaluationsQuery.data ?? [];
  const audience = audienceQuery.data ?? [];

  const [evaluating, setEvaluating] = useState<AudienceUser | null>(null);

  // Resolve profiles for evaluator/evaluated names that aren't in the audience
  // (e.g. evaluator could be outside the audience for member→leader cycles).
  const extraIds = useMemo(() => {
    const set = new Set<string>();
    const known = new Set(audience.map((a) => a.id));
    for (const e of evaluations) {
      if (!known.has(e.evaluator_user_id)) set.add(e.evaluator_user_id);
      if (!known.has(e.evaluated_user_id)) set.add(e.evaluated_user_id);
    }
    return Array.from(set);
  }, [evaluations, audience]);

  const extraProfilesQuery = useQuery({
    queryKey: ['profiles-by-ids', extraIds.sort().join(',')],
    enabled: extraIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', extraIds);
      if (error) throw error;
      return data ?? [];
    },
  });

  const profileMap = useMemo(() => {
    const m = new Map<string, { full_name: string; avatar_url: string | null }>();
    for (const p of audience) m.set(p.id, p);
    for (const p of extraProfilesQuery.data ?? []) m.set(p.id, p);
    return m;
  }, [audience, extraProfilesQuery.data]);

  const snapshot = useMemo<TemplateSnapshot | null>(() => {
    if (!cycle) return null;
    const parsed = templateSnapshotSchema.safeParse(cycle.template_snapshot);
    return parsed.success ? parsed.data : null;
  }, [cycle]);

  const questions = useMemo(() => {
    if (!snapshot) return [] as TemplateQuestion[];
    return snapshot.sections.flatMap((s) => s.questions);
  }, [snapshot]);

  const submitted = evaluations.filter((e) => e.status === 'submitted');
  const draft = evaluations.filter((e) => e.status !== 'submitted');

  // Direction defaults: prefer the first non-self direction; fallback to self.
  const directions = (cycle?.directions ?? []) as EvaluationDirection[];
  const defaultDirection: EvaluationDirection =
    directions.find((d) => d !== 'self') ?? directions[0] ?? 'leader_to_member';

  // Who the current user still needs to evaluate (audience minus self,
  // minus people they already evaluated).
  const myEvaluations = useMemo(
    () => evaluations.filter((e) => e.evaluator_user_id === user?.id),
    [evaluations, user?.id],
  );
  const myEvaluatedSet = useMemo(
    () => new Set(myEvaluations.map((e) => e.evaluated_user_id)),
    [myEvaluations],
  );

  const includesSelf = directions.includes('self');
  const targets = useMemo(() => {
    if (!user) return [] as AudienceUser[];
    const list: AudienceUser[] = [];
    if (includesSelf && audience.some((a) => a.id === user.id)) {
      const me = audience.find((a) => a.id === user.id)!;
      list.push(me);
    }
    for (const a of audience) {
      if (a.id === user.id) continue;
      list.push(a);
    }
    return list;
  }, [audience, user, includesSelf]);

  const myExistingFor = (targetId: string) =>
    myEvaluations.find((e) => e.evaluated_user_id === targetId);

  const scaleAverages = useMemo(() => {
    const out: { question: TemplateQuestion; avg: number; count: number }[] = [];
    for (const q of questions) {
      if (q.type !== 'scale_1_5') continue;
      const values: number[] = [];
      for (const e of submitted) {
        const r = (e.responses ?? {}) as Record<string, unknown>;
        const v = r[q.id];
        if (typeof v === 'number') values.push(v);
      }
      if (values.length === 0) continue;
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      out.push({ question: q, avg, count: values.length });
    }
    return out;
  }, [questions, submitted]);

  const overallAvg = useMemo(() => {
    if (scaleAverages.length === 0) return null;
    return scaleAverages.reduce((a, s) => a + s.avg, 0) / scaleAverages.length;
  }, [scaleAverages]);

  const grouped = useMemo(() => {
    const map = new Map<string, EvaluationRow[]>();
    for (const e of evaluations) {
      const arr = map.get(e.evaluated_user_id) ?? [];
      arr.push(e);
      map.set(e.evaluated_user_id, arr);
    }
    return Array.from(map.entries());
  }, [evaluations]);

  // Direction inferred when the user clicks Avaliar on a target
  const directionFor = (targetId: string): EvaluationDirection => {
    if (targetId === user?.id && includesSelf) return 'self';
    return defaultDirection === 'self' ? 'leader_to_member' : defaultDirection;
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-[640px] overflow-y-auto p-0"
        >
          {cycle && (
            <>
              <SheetHeader className="px-6 py-5 border-b border-border bg-surface text-left space-y-1">
                <SheetTitle className="text-[16px] font-semibold tracking-[-0.01em]">
                  {cycle.name}
                </SheetTitle>
                <SheetDescription className="text-[12px] text-text-muted">
                  {format(new Date(cycle.starts_at), "dd 'de' MMM", { locale: ptBR })}
                  {' → '}
                  {format(new Date(cycle.ends_at), "dd 'de' MMM 'de' yyyy", { locale: ptBR })}
                </SheetDescription>
                <div className="flex flex-wrap gap-2 pt-2">
                  <Chip
                    size="sm"
                    color={cycle.status === 'active' ? 'green' : cycle.status === 'closed' ? 'amber' : 'blue'}
                  >
                    {cycle.status === 'active' ? 'Em andamento' : cycle.status === 'closed' ? 'Encerrado' : 'Rascunho'}
                  </Chip>
                  <Chip size="sm" color="neutral">
                    {submitted.length} {submitted.length === 1 ? 'avaliação enviada' : 'avaliações enviadas'}
                  </Chip>
                  {draft.length > 0 && (
                    <Chip size="sm" color="neutral">
                      {draft.length} em rascunho
                    </Chip>
                  )}
                </div>
              </SheetHeader>

              <div className="px-6 py-5 space-y-8">
                {/* CTA: pessoas para o usuário avaliar */}
                {targets.length > 0 && cycle.status === 'active' && (
                  <section>
                    <header className="flex items-baseline justify-between mb-3">
                      <h3 className="text-[14px] font-semibold text-text">Avaliar pessoas</h3>
                      <span className="text-[11px] text-text-muted">
                        {myEvaluatedSet.size}/{targets.length} feitas
                      </span>
                    </header>
                    <ul className="divide-y divide-border rounded-md border border-border bg-card overflow-hidden">
                      {targets.map((t) => {
                        const existing = myExistingFor(t.id);
                        const done = existing?.status === 'submitted';
                        const isMe = t.id === user?.id;
                        return (
                          <li
                            key={t.id}
                            className="flex items-center gap-3 px-3 py-2.5"
                          >
                            <LinearAvatar name={t.full_name} size={26} />
                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] font-medium text-text truncate">
                                {t.full_name}
                                {isMe && (
                                  <span className="ml-2 text-[11px] text-text-muted font-normal">
                                    (você mesmo)
                                  </span>
                                )}
                              </p>
                              {existing && !done && (
                                <p className="text-[11px] text-text-muted">Rascunho salvo</p>
                              )}
                            </div>
                            {done ? (
                              <span className="inline-flex items-center gap-1 text-[12px] text-status-green font-medium">
                                <Check className="h-3.5 w-3.5" /> Avaliado
                              </span>
                            ) : (
                              <Btn
                                size="sm"
                                variant={existing ? 'secondary' : 'accent'}
                                onClick={() => setEvaluating(t)}
                                iconRight={<ChevronRight className="h-3.5 w-3.5" />}
                              >
                                {existing ? 'Continuar' : 'Avaliar'}
                              </Btn>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                )}

                {/* Sem audiência */}
                {audienceQuery.isLoading ? (
                  <div className="text-center py-6 text-sm text-text-muted">Carregando…</div>
                ) : audience.length === 0 ? (
                  <div className="rounded-md border border-dashed border-border bg-bg-subtle/40 px-4 py-8 text-center">
                    <h3 className="text-[14px] font-semibold text-text">
                      Nenhuma pessoa na audiência deste ciclo
                    </h3>
                    <p className="text-[12px] text-text-muted mt-1">
                      Reabra o ciclo escolhendo a empresa, áreas ou pessoas que devem participar.
                    </p>
                  </div>
                ) : null}

                {/* Resultados */}
                {evaluations.length > 0 && (
                  <>
                    {scaleAverages.length > 0 && (
                      <section>
                        <header className="flex items-baseline justify-between mb-3">
                          <h3 className="text-[14px] font-semibold text-text">Médias gerais</h3>
                          {overallAvg !== null && (
                            <span className="text-[20px] font-semibold tabular-nums text-text">
                              {overallAvg.toFixed(2)}
                              <span className="text-[12px] text-text-muted font-normal ml-1">
                                / 5
                              </span>
                            </span>
                          )}
                        </header>
                        <ul className="space-y-2">
                          {scaleAverages.map(({ question, avg, count }) => (
                            <li
                              key={question.id}
                              className="flex items-center gap-3 rounded-md border border-border bg-card px-3 py-2"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-[13px] text-text truncate">
                                  {question.label}
                                </p>
                                <p className="text-[11px] text-text-muted">
                                  {count} {count === 1 ? 'resposta' : 'respostas'}
                                </p>
                              </div>
                              <ScaleBar value={avg} />
                              <span className="text-[14px] font-semibold tabular-nums w-10 text-right">
                                {avg.toFixed(1)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </section>
                    )}

                    <section>
                      <h3 className="text-[14px] font-semibold text-text mb-3">
                        Avaliações por pessoa
                      </h3>
                      <Accordion type="multiple" className="space-y-2">
                        {grouped.map(([evaluatedId, items]) => {
                          const evaluated = profileMap.get(evaluatedId);
                          return (
                            <AccordionItem
                              key={evaluatedId}
                              value={evaluatedId}
                              className="border border-border rounded-md bg-card px-3"
                            >
                              <AccordionTrigger className="hover:no-underline py-3">
                                <div className="flex items-center gap-2 min-w-0">
                                  <LinearAvatar name={evaluated?.full_name ?? '—'} size={22} />
                                  <span className="text-[13px] font-semibold text-text truncate">
                                    {evaluated?.full_name ?? 'Pessoa removida'}
                                  </span>
                                  <span className="text-[11px] text-text-muted ml-1">
                                    {items.length} {items.length === 1 ? 'avaliação' : 'avaliações'}
                                  </span>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent className="pb-3 space-y-3">
                                {items.map((ev) => (
                                  <EvaluationDetails
                                    key={ev.id}
                                    evaluation={ev}
                                    evaluator={profileMap.get(ev.evaluator_user_id)}
                                    questions={questions}
                                  />
                                ))}
                              </AccordionContent>
                            </AccordionItem>
                          );
                        })}
                      </Accordion>
                    </section>
                  </>
                )}

                {evaluations.length === 0 && audience.length > 0 && (
                  <p className="text-center text-[12px] text-text-muted py-2">
                    As médias e respostas aparecem aqui assim que as avaliações começarem a ser enviadas.
                  </p>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Evaluation form dialog */}
      <Dialog
        open={!!evaluating}
        onOpenChange={(o) => (!o ? setEvaluating(null) : undefined)}
      >
        <DialogContent className="max-w-[680px] p-0 gap-0 overflow-hidden flex flex-col max-h-[min(92vh,860px)]">
          {evaluating && cycle && snapshot && user && (
            <>
              <DialogHeader className="border-b border-border bg-surface px-5 py-4 space-y-0.5 text-left">
                <DialogTitle className="text-[16px] font-semibold tracking-[-0.01em] text-text">
                  Avaliar {evaluating.id === user.id ? 'você mesmo' : evaluating.full_name}
                </DialogTitle>
                <DialogDescription className="text-[12px] text-text-muted">
                  {cycle.name} · {directionLabel[directionFor(evaluating.id)]}
                </DialogDescription>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto px-5 py-4">
                <EvaluationForm
                  cycleId={cycle.id}
                  templateSnapshot={snapshot}
                  evaluatorUserId={user.id}
                  evaluatedUserId={evaluating.id}
                  direction={directionFor(evaluating.id) as 'leader_to_member' | 'member_to_leader'}
                  existingEvaluationId={myExistingFor(evaluating.id)?.id}
                  initialResponses={
                    (myExistingFor(evaluating.id)?.responses as Record<string, unknown>) ?? undefined
                  }
                  onSaved={() => setEvaluating(null)}
                />
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function ScaleBar({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, (value / 5) * 100));
  const color =
    value >= 4 ? 'bg-status-green' : value >= 3 ? 'bg-status-amber' : 'bg-status-red';
  return (
    <div className="w-24 h-1.5 rounded-full bg-bg-subtle overflow-hidden">
      <div className={`${color} h-full`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function EvaluationDetails({
  evaluation,
  evaluator,
  questions,
}: {
  evaluation: EvaluationRow;
  evaluator?: { full_name: string; avatar_url: string | null };
  questions: TemplateQuestion[];
}) {
  const responses = (evaluation.responses ?? {}) as Record<string, unknown>;
  return (
    <div className="rounded-md border border-border bg-bg-subtle/40 p-3">
      <header className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <LinearAvatar name={evaluator?.full_name ?? '—'} size={18} />
          <span className="text-[12px] text-text-muted">
            por <span className="text-text">{evaluator?.full_name ?? 'Anônimo'}</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Chip size="sm" color="neutral">
            {directionLabel[evaluation.direction] ?? evaluation.direction}
          </Chip>
          <Chip
            size="sm"
            color={evaluation.status === 'submitted' ? 'green' : 'amber'}
          >
            {evaluation.status === 'submitted' ? 'Enviada' : 'Rascunho'}
          </Chip>
        </div>
      </header>
      <ul className="space-y-2">
        {questions.map((q) => {
          const v = responses[q.id];
          if (v === undefined || v === null || v === '') return null;
          return (
            <li key={q.id} className="text-[12.5px]">
              <p className="text-text-muted">{q.label}</p>
              <p className="text-text mt-0.5 whitespace-pre-wrap">
                {q.type === 'scale_1_5' ? `${String(v)} / 5` : String(v)}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
