import { useMemo, useState } from "react";
import { useEvaluations, EvaluationInput } from "@/hooks/useEvaluations";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  Btn,
  Chip,
  Col,
  Kbd,
  ProgressBar,
  Row,
} from "@/components/primitives/LinearKit";
import { Icon } from "@/components/primitives/Icon";
import { cn } from "@/lib/utils";

/* ──────────────────────────────────────────────────────────────
 * EvaluationForm — wizard 3 colunas por competência.
 * Mantém o schema original (4 scores: overall/technical/behavioral/leadership).
 * As 5 competências UX são mapeadas para esses 4 scores no salvamento,
 * calculando médias por categoria.
 * ─────────────────────────────────────────────────────────────── */

type CompKey =
  | "comunicacao"
  | "colaboracao"
  | "dominio_tecnico"
  | "autonomia"
  | "ownership";

type CompCategory = "technical" | "behavioral" | "leadership";

interface Competency {
  k: CompKey;
  label: string;
  description: string;
  category: CompCategory;
}

const COMPETENCIES: Competency[] = [
  {
    k: "comunicacao",
    label: "Comunicação",
    description:
      "Clareza ao transmitir ideias, escuta ativa e capacidade de adaptar o discurso para o público.",
    category: "behavioral",
  },
  {
    k: "colaboracao",
    label: "Colaboração",
    description:
      "Trabalho em equipe, disponibilidade para ajudar, construção conjunta de soluções.",
    category: "behavioral",
  },
  {
    k: "dominio_tecnico",
    label: "Domínio técnico",
    description:
      "Capacidade de resolver problemas complexos com profundidade, fazer escolhas técnicas fundamentadas e evoluir o nível da equipe.",
    category: "technical",
  },
  {
    k: "autonomia",
    label: "Autonomia",
    description:
      "Toma decisões, destrava bloqueios sem depender do líder e assume responsabilidade por resultados.",
    category: "leadership",
  },
  {
    k: "ownership",
    label: "Ownership",
    description:
      "Cuida do produto/processo como dono: antecipa problemas, eleva o padrão e influencia positivamente o time.",
    category: "leadership",
  },
];

const LEVELS = [
  { n: 1, label: "Abaixo das expectativas", hint: "Ainda está construindo" },
  { n: 2, label: "Parcial", hint: "Supervisão frequente" },
  { n: 3, label: "Atende", hint: "Entrega consistente" },
  { n: 4, label: "Supera", hint: "Eleva o time" },
  { n: 5, label: "Referência", hint: "Padrão da empresa" },
];

type CompScores = Record<CompKey, { score: number; evidence: string }>;

const initialScores: CompScores = {
  comunicacao: { score: 0, evidence: "" },
  colaboracao: { score: 0, evidence: "" },
  dominio_tecnico: { score: 0, evidence: "" },
  autonomia: { score: 0, evidence: "" },
  ownership: { score: 0, evidence: "" },
};

export function EvaluationForm({ onSuccess }: { onSuccess?: () => void }) {
  const { createEvaluation } = useEvaluations();

  const { data: teamMembers } = useQuery({
    queryKey: ["team-members-for-evaluation"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("team_members")
        .select(
          `
          user_id,
          leader_id,
          profiles!team_members_user_id_fkey (
            id,
            full_name
          )
        `,
        )
        .eq("leader_id", user.id)
        .neq("user_id", user.id);

      if (error) throw error;
      return data;
    },
  });

  const [stepIdx, setStepIdx] = useState(0);
  const [evaluatedUserId, setEvaluatedUserId] = useState("");
  const [period, setPeriod] = useState(() => defaultPeriod());
  const [scores, setScores] = useState<CompScores>(initialScores);
  const [finalComments, setFinalComments] = useState("");
  const [strengths, setStrengths] = useState("");
  const [improvements, setImprovements] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Etapas: 0 = setup (quem/qual período); 1..5 = competências; 6 = resumo
  const setupValid = evaluatedUserId && period.trim().length > 0;
  const totalSteps = COMPETENCIES.length + 2;
  const currentComp =
    stepIdx >= 1 && stepIdx <= COMPETENCIES.length
      ? COMPETENCIES[stepIdx - 1]
      : null;

  const done = useMemo(
    () => COMPETENCIES.filter((c) => scores[c.k].score > 0).length,
    [scores],
  );
  const progressPct = Math.round((done / COMPETENCIES.length) * 100);

  const collaboratorName = useMemo(() => {
    if (!teamMembers || !evaluatedUserId) return "—";
    const m = (teamMembers as any[]).find((t) => t.user_id === evaluatedUserId);
    return m?.profiles?.full_name || "—";
  }, [teamMembers, evaluatedUserId]);

  const canAdvance = useMemo(() => {
    if (stepIdx === 0) return setupValid;
    if (currentComp) {
      const s = scores[currentComp.k];
      return s.score > 0 && s.evidence.trim().length >= 10;
    }
    if (stepIdx === totalSteps - 1) {
      return (
        strengths.trim().length >= 10 &&
        improvements.trim().length >= 10 &&
        finalComments.trim().length >= 10
      );
    }
    return true;
  }, [stepIdx, setupValid, currentComp, scores, strengths, improvements, finalComments, totalSteps]);

  const setScore = (n: number) => {
    if (!currentComp) return;
    setScores((prev) => ({
      ...prev,
      [currentComp.k]: { ...prev[currentComp.k], score: n },
    }));
  };

  const setEvidence = (v: string) => {
    if (!currentComp) return;
    setScores((prev) => ({
      ...prev,
      [currentComp.k]: { ...prev[currentComp.k], evidence: v },
    }));
  };

  const next = () => setStepIdx((i) => Math.min(i + 1, totalSteps - 1));
  const prev = () => setStepIdx((i) => Math.max(i - 1, 0));

  const handleSubmit = () => {
    // Calcula médias por categoria
    const byCategory: Record<CompCategory, number[]> = {
      technical: [],
      behavioral: [],
      leadership: [],
    };
    COMPETENCIES.forEach((c) => {
      const s = scores[c.k].score;
      if (s > 0) byCategory[c.category].push(s);
    });
    const avg = (arr: number[]) =>
      arr.length ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : 3;

    const technical_score = avg(byCategory.technical);
    const behavioral_score = avg(byCategory.behavioral);
    const leadership_score = avg(byCategory.leadership);
    const overall_score =
      Math.round(
        ((technical_score + behavioral_score + leadership_score) / 3) * 10,
      ) / 10;

    // Concatena evidências no comentário final para preservar contexto
    const evidenceBlock = COMPETENCIES.map((c) => {
      const s = scores[c.k];
      if (s.score <= 0) return "";
      return `${c.label} (${s.score}/5)\n${s.evidence}`.trim();
    })
      .filter(Boolean)
      .join("\n\n");

    const comments = finalComments + (evidenceBlock ? `\n\n---\n${evidenceBlock}` : "");

    const payload: EvaluationInput = {
      evaluated_user_id: evaluatedUserId,
      period: period.trim(),
      overall_score,
      technical_score,
      behavioral_score,
      leadership_score,
      comments,
      strengths: strengths.trim(),
      areas_for_improvement: improvements.trim(),
      status: "completed",
    };

    setIsSubmitting(true);
    createEvaluation(payload);
    setIsSubmitting(false);
    onSuccess?.();
  };

  return (
    <div className="font-sans text-text h-[calc(94vh-8px)] grid grid-cols-[220px_1fr_260px] overflow-hidden bg-surface">
      {/* ── Rail esquerdo — progresso + stepper ─────────────── */}
      <aside className="border-r border-border bg-bg-subtle overflow-y-auto p-4">
        <div className="text-[10.5px] font-semibold uppercase tracking-[0.05em] text-text-subtle">
          Avaliação de desempenho
        </div>
        <div className="text-[15px] font-semibold mt-1 tracking-[-0.01em]">
          {collaboratorName}
        </div>
        <div className="text-[11.5px] text-text-muted mt-0.5">
          {period || "Período —"}
        </div>
        <ProgressBar value={progressPct} className="mt-3" />
        <div className="text-[11.5px] text-text-muted mt-1.5">
          {done} de {COMPETENCIES.length} competências
        </div>

        <div className="text-[10.5px] font-semibold uppercase tracking-[0.05em] text-text-subtle mt-5 mb-2">
          Etapas
        </div>
        <Col gap={2}>
          <StepperRow
            idx={0}
            label="Configuração"
            active={stepIdx === 0}
            done={setupValid && stepIdx !== 0}
            onClick={() => setStepIdx(0)}
          />
          {COMPETENCIES.map((c, i) => {
            const scoreVal = scores[c.k].score;
            const isDone = scoreVal > 0 && scores[c.k].evidence.trim().length >= 10;
            return (
              <StepperRow
                key={c.k}
                idx={i + 1}
                label={c.label}
                active={stepIdx === i + 1}
                done={isDone}
                score={scoreVal}
                onClick={() => {
                  if (setupValid) setStepIdx(i + 1);
                }}
              />
            );
          })}
          <StepperRow
            idx={totalSteps - 1}
            label="Resumo"
            active={stepIdx === totalSteps - 1}
            done={false}
            onClick={() => {
              if (done >= COMPETENCIES.length) setStepIdx(totalSteps - 1);
            }}
          />
        </Col>
      </aside>

      {/* ── Centro — pergunta única ───────────────────────── */}
      <main className="overflow-y-auto">
        <div className="max-w-[680px] mx-auto w-full px-10 py-7">
          {stepIdx === 0 && (
            <SetupStep
              teamMembers={teamMembers as any[] | undefined}
              evaluatedUserId={evaluatedUserId}
              setEvaluatedUserId={setEvaluatedUserId}
              period={period}
              setPeriod={setPeriod}
            />
          )}

          {currentComp && (
            <CompetencyStep
              comp={currentComp}
              idx={stepIdx}
              total={COMPETENCIES.length}
              score={scores[currentComp.k].score}
              evidence={scores[currentComp.k].evidence}
              onScore={setScore}
              onEvidence={setEvidence}
            />
          )}

          {stepIdx === totalSteps - 1 && (
            <SummaryStep
              scores={scores}
              strengths={strengths}
              setStrengths={setStrengths}
              improvements={improvements}
              setImprovements={setImprovements}
              finalComments={finalComments}
              setFinalComments={setFinalComments}
            />
          )}

          {/* Actions */}
          <Row justify="between" className="mt-8 pt-4 border-t border-border">
            <Btn
              variant="ghost"
              size="md"
              onClick={prev}
              disabled={stepIdx === 0}
              icon={<Icon name="chevLeft" size={13} />}
            >
              Anterior
            </Btn>
            <Row gap={8} align="center">
              <span className="text-[11px] text-text-subtle hidden md:inline-flex items-center gap-1.5">
                <Kbd>⌘↵</Kbd> próxima
              </span>
              {stepIdx < totalSteps - 1 ? (
                <Btn
                  variant="primary"
                  size="md"
                  onClick={next}
                  disabled={!canAdvance}
                  iconRight={<Icon name="arrow" size={13} />}
                >
                  {stepIdx === 0 ? "Começar" : "Próxima"}
                </Btn>
              ) : (
                <Btn
                  variant="primary"
                  size="md"
                  onClick={handleSubmit}
                  disabled={!canAdvance || isSubmitting}
                  icon={<Icon name="check" size={13} />}
                >
                  {isSubmitting ? "Salvando…" : "Salvar avaliação"}
                </Btn>
              )}
            </Row>
          </Row>
        </div>
      </main>

      {/* ── Rail direito — contexto ───────────────────────── */}
      <aside className="border-l border-border bg-bg-subtle overflow-y-auto p-4 text-[12.5px]">
        <div className="text-[10.5px] font-semibold uppercase tracking-[0.05em] text-text-subtle mb-2">
          Contexto
        </div>
        <ContextCard
          label="Avaliação anterior"
          title="— sem histórico"
          sub="Primeira avaliação neste ciclo"
        />
        <ContextCard
          label="PDI relacionado"
          title="—"
          sub="Sem PDI vinculado"
        />
        <ContextCard
          label="Auto-avaliação"
          title="—"
          sub="Ainda não preenchida pelo colaborador"
        />

        <div className="text-[10.5px] font-semibold uppercase tracking-[0.05em] text-text-subtle mt-5 mb-2">
          Anonimato
        </div>
        <div className="text-[11.5px] text-text-muted leading-[1.5]">
          O colaborador não verá seu nome. Apenas a agregação de todos os avaliadores
          será compartilhada.
        </div>
      </aside>
    </div>
  );
}

/* ─── Sub-componentes ──────────────────────────────────────── */

function StepperRow({
  idx,
  label,
  active,
  done,
  score,
  onClick,
}: {
  idx: number;
  label: string;
  active: boolean;
  done: boolean;
  score?: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-2 py-1.5 rounded-md text-[12.5px] transition-colors text-left w-full",
        active
          ? "bg-surface text-text font-medium border border-border"
          : "text-text-muted hover:bg-surface/60 hover:text-text",
      )}
    >
      <span
        className={cn(
          "w-[18px] h-[18px] rounded-full text-[10.5px] font-semibold inline-grid place-items-center shrink-0",
          done && "bg-status-green text-white",
          !done && active && "bg-accent text-white",
          !done && !active && "bg-bg-muted text-text-subtle border border-border",
        )}
      >
        {done ? "✓" : idx}
      </span>
      <span className="flex-1 truncate">{label}</span>
      {typeof score === "number" && score > 0 && (
        <span className="text-[10.5px] text-text-subtle tabular">{score}/5</span>
      )}
    </button>
  );
}

function SetupStep({
  teamMembers,
  evaluatedUserId,
  setEvaluatedUserId,
  period,
  setPeriod,
}: {
  teamMembers?: any[];
  evaluatedUserId: string;
  setEvaluatedUserId: (v: string) => void;
  period: string;
  setPeriod: (v: string) => void;
}) {
  return (
    <Col gap={18}>
      <div>
        <div className="text-[10.5px] font-semibold uppercase tracking-[0.05em] text-text-subtle">
          Configuração
        </div>
        <h1 className="text-[22px] font-semibold tracking-[-0.02em] mt-1">
          Quem você vai avaliar?
        </h1>
        <p className="text-[12.5px] text-text-muted mt-1.5 leading-[1.5]">
          Selecione o colaborador e o período. A avaliação é feita uma competência por vez
          para manter o foco.
        </p>
      </div>

      <FieldLabel label="Colaborador">
        <select
          value={evaluatedUserId}
          onChange={(e) => setEvaluatedUserId(e.target.value)}
          className="w-full h-[36px] px-2.5 text-[13px] text-text bg-surface border border-border rounded-md outline-none focus:border-border-focus transition-colors font-sans appearance-none cursor-pointer"
        >
          <option value="">Selecione…</option>
          {teamMembers && teamMembers.length > 0 ? (
            teamMembers.map((m: any) => (
              <option key={m.user_id} value={m.user_id}>
                {m.profiles?.full_name || "Sem nome"}
              </option>
            ))
          ) : (
            <option value="" disabled>
              Nenhum colaborador disponível
            </option>
          )}
        </select>
      </FieldLabel>

      <FieldLabel label="Período">
        <input
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          placeholder="Ex: 2026.Q2"
          className="w-full h-[36px] px-2.5 text-[13px] text-text bg-surface border border-border rounded-md outline-none focus:border-border-focus transition-colors font-sans"
        />
      </FieldLabel>
    </Col>
  );
}

function CompetencyStep({
  comp,
  idx,
  total,
  score,
  evidence,
  onScore,
  onEvidence,
}: {
  comp: Competency;
  idx: number;
  total: number;
  score: number;
  evidence: string;
  onScore: (n: number) => void;
  onEvidence: (v: string) => void;
}) {
  return (
    <Col gap={18}>
      <div>
        <div className="text-[10.5px] font-semibold uppercase tracking-[0.05em] text-text-subtle">
          Competência {idx} de {total}
        </div>
        <h1 className="text-[22px] font-semibold tracking-[-0.02em] mt-1">
          {comp.label}
        </h1>
        <p className="text-[12.5px] text-text-muted mt-1.5 leading-[1.5]">
          {comp.description}
        </p>
      </div>

      <div>
        <div className="text-[10.5px] font-semibold uppercase tracking-[0.05em] text-text mb-2">
          Sua avaliação
        </div>
        <div className="grid grid-cols-5 gap-2">
          {LEVELS.map((o) => {
            const active = score === o.n;
            return (
              <button
                key={o.n}
                type="button"
                onClick={() => onScore(o.n)}
                className={cn(
                  "p-2.5 text-left rounded-md border transition-colors",
                  active
                    ? "bg-accent-soft border-accent text-accent-text"
                    : "bg-surface border-border hover:border-border-strong hover:bg-bg-subtle",
                )}
              >
                <div
                  className={cn(
                    "text-[18px] font-semibold tabular",
                    active ? "text-accent-text" : "text-text",
                  )}
                >
                  {o.n}
                </div>
                <div
                  className={cn(
                    "text-[11.5px] font-medium mt-0.5",
                    active ? "text-accent-text" : "text-text",
                  )}
                >
                  {o.label}
                </div>
                <div
                  className={cn(
                    "text-[10.5px] mt-0.5 leading-[1.3]",
                    active ? "text-accent-text" : "text-text-subtle",
                  )}
                >
                  {o.hint}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <Row justify="between" className="mb-1.5">
          <label className="text-[10.5px] font-semibold uppercase tracking-[0.05em] text-text">
            Evidência
          </label>
          <span className="text-[11px] text-text-subtle">
            Obrigatório · 1–3 exemplos concretos
          </span>
        </Row>
        <textarea
          value={evidence}
          onChange={(e) => onEvidence(e.target.value)}
          placeholder="Descreva situações concretas que justificam sua nota. Cite projetos, comportamentos e resultados observáveis."
          className="w-full min-h-[110px] p-2.5 text-[13px] text-text bg-surface border border-border rounded-md resize-y outline-none focus:border-border-focus transition-colors font-sans leading-[1.55]"
        />
        <Row gap={6} className="mt-2" wrap>
          <Chip color="neutral" size="sm" icon={<Icon name="sparkles" size={11} />}>
            Exemplo de Q1
          </Chip>
          <Chip color="neutral" size="sm" icon={<Icon name="sparkles" size={11} />}>
            Resumir PDI
          </Chip>
          <Chip color="neutral" size="sm" icon={<Icon name="sparkles" size={11} />}>
            Referenciar 1:1
          </Chip>
        </Row>
      </div>
    </Col>
  );
}

function SummaryStep({
  scores,
  strengths,
  setStrengths,
  improvements,
  setImprovements,
  finalComments,
  setFinalComments,
}: {
  scores: CompScores;
  strengths: string;
  setStrengths: (v: string) => void;
  improvements: string;
  setImprovements: (v: string) => void;
  finalComments: string;
  setFinalComments: (v: string) => void;
}) {
  const overall =
    Object.values(scores).filter((s) => s.score > 0).reduce((a, s) => a + s.score, 0) /
    Math.max(
      1,
      Object.values(scores).filter((s) => s.score > 0).length,
    );

  return (
    <Col gap={18}>
      <div>
        <div className="text-[10.5px] font-semibold uppercase tracking-[0.05em] text-text-subtle">
          Resumo
        </div>
        <h1 className="text-[22px] font-semibold tracking-[-0.02em] mt-1">
          Revise e finalize
        </h1>
        <p className="text-[12.5px] text-text-muted mt-1.5 leading-[1.5]">
          Confirme as notas por competência e adicione seus comentários gerais.
        </p>
      </div>

      <div className="bg-bg-subtle border border-border rounded-md p-3">
        <Row justify="between" className="mb-2">
          <span className="text-[10.5px] font-semibold uppercase tracking-[0.05em] text-text-subtle">
            Nota média
          </span>
          <span className="text-[18px] font-semibold text-text tabular">
            {overall.toFixed(1)}
            <span className="text-[12px] text-text-subtle">/5</span>
          </span>
        </Row>
        <Col gap={6}>
          {COMPETENCIES.map((c) => {
            const s = scores[c.k];
            return (
              <Row key={c.k} justify="between" align="center">
                <span className="text-[13px] text-text">{c.label}</span>
                <Chip
                  color={s.score >= 4 ? "green" : s.score === 3 ? "neutral" : s.score > 0 ? "amber" : "neutral"}
                  size="sm"
                >
                  {s.score > 0 ? `${s.score}/5` : "—"}
                </Chip>
              </Row>
            );
          })}
        </Col>
      </div>

      <FieldLabel label="Pontos fortes" hint="Obrigatório · min 10 caracteres">
        <textarea
          value={strengths}
          onChange={(e) => setStrengths(e.target.value)}
          placeholder="O que o colaborador faz muito bem?"
          className="w-full min-h-[76px] p-2.5 text-[13px] text-text bg-surface border border-border rounded-md resize-y outline-none focus:border-border-focus transition-colors font-sans leading-[1.55]"
        />
      </FieldLabel>

      <FieldLabel label="Áreas de melhoria" hint="Obrigatório · min 10 caracteres">
        <textarea
          value={improvements}
          onChange={(e) => setImprovements(e.target.value)}
          placeholder="Onde ainda há espaço para crescer?"
          className="w-full min-h-[76px] p-2.5 text-[13px] text-text bg-surface border border-border rounded-md resize-y outline-none focus:border-border-focus transition-colors font-sans leading-[1.55]"
        />
      </FieldLabel>

      <FieldLabel label="Comentários gerais" hint="Obrigatório · min 10 caracteres">
        <textarea
          value={finalComments}
          onChange={(e) => setFinalComments(e.target.value)}
          placeholder="Mensagem final ao colaborador — seja específico e construtivo."
          className="w-full min-h-[88px] p-2.5 text-[13px] text-text bg-surface border border-border rounded-md resize-y outline-none focus:border-border-focus transition-colors font-sans leading-[1.55]"
        />
      </FieldLabel>
    </Col>
  );
}

function ContextCard({
  label,
  title,
  sub,
}: {
  label: string;
  title: string;
  sub: string;
}) {
  return (
    <div className="bg-surface border border-border rounded-md p-2.5 mb-2">
      <div className="text-[10.5px] font-semibold uppercase tracking-[0.05em] text-text-subtle">
        {label}
      </div>
      <div className="text-[13px] font-medium text-text mt-0.5">{title}</div>
      <div className="text-[11.5px] text-text-muted mt-0.5">{sub}</div>
    </div>
  );
}

function FieldLabel({
  label,
  hint,
  className,
  children,
}: {
  label: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-[10.5px] font-semibold uppercase tracking-[0.05em] text-text">
          {label}
        </label>
        {hint && <span className="text-[11px] text-text-subtle">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function defaultPeriod() {
  const now = new Date();
  const q = Math.floor(now.getMonth() / 3) + 1;
  return `${now.getFullYear()}.Q${q}`;
}
