import { useEffect, useMemo, useRef, useState } from "react";
import { PDIFormData } from "@/hooks/usePDIIntegrated";
import {
  Btn,
  Chip,
  Col,
  Row,
  ProgressBar,
} from "@/components/primitives/LinearKit";
import { Icon } from "@/components/primitives/Icon";
import { cn } from "@/lib/utils";

interface PDIFormIntegratedProps {
  onSubmit: (data: PDIFormData) => void;
  isSubmitting?: boolean;
  initialData?: Partial<PDIFormData>;
}

type CategoryKey = "tecnica" | "soft" | "carreira" | "bemestar";

const CATEGORIES: Array<{ k: CategoryKey; label: string }> = [
  { k: "tecnica", label: "Competência técnica" },
  { k: "soft", label: "Soft skill" },
  { k: "carreira", label: "Carreira" },
  { k: "bemestar", label: "Bem-estar" },
];

const STEPS = [
  { k: "objetivo", label: "Objetivo" },
  { k: "criterio", label: "Critério" },
  { k: "acoes", label: "Ações" },
  { k: "revisar", label: "Revisar" },
] as const;

type ActionItem = { id: string; text: string };

const STORAGE_KEY = "pdi:draft";

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function formatAgo(seconds: number) {
  if (seconds < 5) return "agora";
  if (seconds < 60) return `há ${Math.floor(seconds)}s`;
  const m = Math.floor(seconds / 60);
  return `há ${m}min`;
}

/**
 * Wizard de criação de PDI — 4 passos (Objetivo · Critério · Ações · Revisar).
 * Segue o padrão Linear denso sans. Salva rascunho em localStorage
 * para o indicador "Rascunho salvo · há Ns" (não persiste no banco).
 */
export const PDIFormIntegrated = ({
  onSubmit,
  isSubmitting,
  initialData,
}: PDIFormIntegratedProps) => {
  const [stepIdx, setStepIdx] = useState(0);
  const [mainObjective, setMainObjective] = useState(initialData?.main_objective || "");
  const [category, setCategory] = useState<CategoryKey>("tecnica");
  const [successMetrics, setSuccessMetrics] = useState(initialData?.success_metrics || "");
  const [metricNumeric, setMetricNumeric] = useState<string>("");
  const [requiredSupport, setRequiredSupport] = useState(initialData?.required_support || "");
  const [anticipatedChallenges, setAnticipatedChallenges] = useState(
    initialData?.anticipated_challenges || "",
  );
  const [deadline, setDeadline] = useState(initialData?.deadline || "");
  const [actions, setActions] = useState<ActionItem[]>(() => {
    const raw = initialData?.committed_actions;
    if (!raw) return [{ id: uid(), text: "" }];
    const split = raw
      .split(/\n+/)
      .map((s) => s.trim())
      .filter(Boolean);
    return split.length ? split.map((t) => ({ id: uid(), text: t })) : [{ id: uid(), text: "" }];
  });

  // Rascunho
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const firstRender = useRef(true);

  useEffect(() => {
    // Hidrata rascunho se existir e não houver initialData
    if (initialData) return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.mainObjective) setMainObjective(parsed.mainObjective);
        if (parsed.category) setCategory(parsed.category);
        if (parsed.successMetrics) setSuccessMetrics(parsed.successMetrics);
        if (parsed.metricNumeric) setMetricNumeric(parsed.metricNumeric);
        if (parsed.actions?.length) setActions(parsed.actions);
        if (parsed.deadline) setDeadline(parsed.deadline);
        if (parsed.requiredSupport) setRequiredSupport(parsed.requiredSupport);
        if (parsed.anticipatedChallenges) setAnticipatedChallenges(parsed.anticipatedChallenges);
        if (typeof parsed.stepIdx === "number") setStepIdx(parsed.stepIdx);
        if (parsed.savedAt) setLastSavedAt(parsed.savedAt);
      }
    } catch {
      // noop
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced save
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const t = window.setTimeout(() => {
      const payload = {
        mainObjective,
        category,
        successMetrics,
        metricNumeric,
        actions,
        deadline,
        requiredSupport,
        anticipatedChallenges,
        stepIdx,
        savedAt: Date.now(),
      };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
        setLastSavedAt(payload.savedAt);
      } catch {
        // noop
      }
    }, 600);
    return () => window.clearTimeout(t);
  }, [
    mainObjective,
    category,
    successMetrics,
    metricNumeric,
    actions,
    deadline,
    requiredSupport,
    anticipatedChallenges,
    stepIdx,
  ]);

  // Update "now" every second while we have a saved marker
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  const filledActions = useMemo(
    () => actions.filter((a) => a.text.trim().length > 0),
    [actions],
  );

  const stepValid = useMemo<Record<number, boolean>>(
    () => ({
      0: mainObjective.trim().length > 0,
      1: successMetrics.trim().length > 0,
      2: filledActions.length >= 1 && filledActions.length <= 3,
      3: true,
    }),
    [mainObjective, successMetrics, filledActions.length],
  );

  const progress = useMemo(() => {
    const completed = [0, 1, 2].filter((i) => stepValid[i]).length;
    return Math.round(((completed + (stepIdx === 3 ? 1 : 0)) / 4) * 100);
  }, [stepValid, stepIdx]);

  const goTo = (i: number) => {
    if (i < 0 || i > 3) return;
    // Só deixa pular para frente se a etapa atual for válida
    if (i > stepIdx) {
      for (let s = stepIdx; s < i; s++) {
        if (!stepValid[s]) return;
      }
    }
    setStepIdx(i);
  };

  const next = () => goTo(stepIdx + 1);
  const back = () => goTo(stepIdx - 1);

  const addAction = () => {
    if (actions.length >= 3) return;
    setActions((prev) => [...prev, { id: uid(), text: "" }]);
  };

  const removeAction = (id: string) => {
    setActions((prev) => (prev.length <= 1 ? prev : prev.filter((a) => a.id !== id)));
  };

  const updateAction = (id: string, text: string) => {
    setActions((prev) => prev.map((a) => (a.id === id ? { ...a, text } : a)));
  };

  const handleFinalize = () => {
    const committed_actions = filledActions.map((a) => a.text.trim()).join("\n");
    const payload: PDIFormData = {
      main_objective: mainObjective.trim(),
      committed_actions,
      required_support: requiredSupport.trim(),
      success_metrics: metricNumeric
        ? `${successMetrics.trim()}\nMétrica: ${metricNumeric}`
        : successMetrics.trim(),
      anticipated_challenges: anticipatedChallenges.trim(),
      deadline: deadline || "",
    };
    onSubmit(payload);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // noop
    }
  };

  const draftLabel = lastSavedAt
    ? `Rascunho salvo · ${formatAgo((now - lastSavedAt) / 1000)}`
    : "Rascunho · nada salvo ainda";

  return (
    <div className="bg-surface border border-border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-4 border-b border-border">
        <Row justify="between" align="start" className="mb-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.05em] text-text-subtle">
              Novo PDI
            </div>
            <h2 className="text-[18px] font-semibold tracking-[-0.02em] text-text mt-0.5">
              Plano de Desenvolvimento
            </h2>
            <p className="text-[12.5px] text-text-muted mt-1">
              Um bom PDI responde três perguntas:{" "}
              <span className="text-text font-semibold">o que</span>,{" "}
              <span className="text-text font-semibold">como medir</span> e{" "}
              <span className="text-text font-semibold">como fazer</span>.
            </p>
          </div>
          <div className="text-[11px] text-text-subtle shrink-0">
            Passo {stepIdx + 1} de 4
          </div>
        </Row>
        <ProgressBar value={progress} />

        {/* Stepper */}
        <Row gap={0} className="mt-4 -mb-px border-b border-border">
          {STEPS.map((s, i) => {
            const isDone = i < stepIdx && stepValid[i];
            const isActive = i === stepIdx;
            return (
              <button
                key={s.k}
                type="button"
                onClick={() => goTo(i)}
                className={cn(
                  "h-[34px] inline-flex items-center gap-1.5 px-3 text-[12.5px] border-b-2 -mb-px transition-colors font-medium",
                  isActive
                    ? "text-text border-text"
                    : isDone
                      ? "text-text-muted border-transparent hover:text-text"
                      : "text-text-subtle border-transparent hover:text-text",
                )}
              >
                <span
                  className={cn(
                    "w-[18px] h-[18px] rounded-full text-[10.5px] font-semibold inline-grid place-items-center",
                    isDone && "bg-status-green text-white",
                    isActive && "bg-accent-soft text-accent-text",
                    !isDone && !isActive && "bg-bg-muted text-text-subtle",
                  )}
                >
                  {isDone ? "✓" : i + 1}
                </span>
                {s.label}
              </button>
            );
          })}
          <div className="flex-1" />
          <div className="text-[11px] text-text-subtle self-center px-2 py-1">{draftLabel}</div>
        </Row>
      </div>

      {/* Body */}
      <div className="px-5 py-5 min-h-[280px]">
        {stepIdx === 0 && (
          <StepObjetivo
            objective={mainObjective}
            setObjective={setMainObjective}
            category={category}
            setCategory={setCategory}
          />
        )}
        {stepIdx === 1 && (
          <StepCriterio
            objective={mainObjective}
            successMetrics={successMetrics}
            setSuccessMetrics={setSuccessMetrics}
            metricNumeric={metricNumeric}
            setMetricNumeric={setMetricNumeric}
            deadline={deadline}
            setDeadline={setDeadline}
          />
        )}
        {stepIdx === 2 && (
          <StepAcoes
            actions={actions}
            addAction={addAction}
            removeAction={removeAction}
            updateAction={updateAction}
            requiredSupport={requiredSupport}
            setRequiredSupport={setRequiredSupport}
          />
        )}
        {stepIdx === 3 && (
          <StepRevisar
            mainObjective={mainObjective}
            category={CATEGORIES.find((c) => c.k === category)?.label || "—"}
            successMetrics={successMetrics}
            metricNumeric={metricNumeric}
            actions={filledActions}
            requiredSupport={requiredSupport}
            anticipatedChallenges={anticipatedChallenges}
            setAnticipatedChallenges={setAnticipatedChallenges}
            deadline={deadline}
            onEdit={setStepIdx}
          />
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-3.5 border-t border-border flex items-center justify-between bg-bg-subtle">
        <Btn
          variant="ghost"
          size="sm"
          onClick={back}
          disabled={stepIdx === 0}
          icon={<Icon name="chevLeft" size={13} />}
        >
          Voltar
        </Btn>
        <Row gap={10} align="center">
          <span className="text-[11px] text-text-subtle">Passo {stepIdx + 1} de 4</span>
          {stepIdx < 3 ? (
            <Btn
              variant="primary"
              size="sm"
              onClick={next}
              disabled={!stepValid[stepIdx]}
              iconRight={<Icon name="arrow" size={13} />}
            >
              Continuar
            </Btn>
          ) : (
            <Btn
              variant="primary"
              size="sm"
              onClick={handleFinalize}
              disabled={isSubmitting || !stepValid[0] || !stepValid[1] || !stepValid[2]}
              icon={<Icon name="check" size={13} />}
            >
              {isSubmitting ? "Salvando…" : "Salvar PDI"}
            </Btn>
          )}
        </Row>
      </div>
    </div>
  );
};

/* ─── Passo 1 — Objetivo ────────────────────────────────────── */

function StepObjetivo({
  objective,
  setObjective,
  category,
  setCategory,
}: {
  objective: string;
  setObjective: (v: string) => void;
  category: CategoryKey;
  setCategory: (v: CategoryKey) => void;
}) {
  return (
    <Col gap={18}>
      <div>
        <div className="text-[15px] font-semibold text-text tracking-[-0.01em]">
          Qual sua meta?
        </div>
        <div className="text-[12.5px] text-text-muted mt-1">
          Descreva em 1 frase, com foco claro. Prefira{" "}
          <span className="text-text">“chegar a Y”</span> em vez de{" "}
          <span className="text-text">“melhorar X”</span>.
        </div>
      </div>
      <FieldLabel label="Objetivo" hint="1 frase · foco claro">
        <textarea
          value={objective}
          onChange={(e) => setObjective(e.target.value)}
          placeholder="Ex: Conduzir 1:1s com propósito e estrutura clara"
          className="w-full min-h-[84px] p-2.5 text-[13px] text-text bg-surface border border-border rounded-md resize-y outline-none focus:border-border-focus transition-colors font-sans leading-[1.55]"
        />
      </FieldLabel>

      <FieldLabel label="Categoria">
        <Row gap={6} wrap>
          {CATEGORIES.map((c) => {
            const active = c.k === category;
            return (
              <button
                key={c.k}
                type="button"
                onClick={() => setCategory(c.k)}
                className={cn(
                  "h-[26px] px-2.5 text-[12px] font-medium rounded-[4px] border transition-colors",
                  active
                    ? "bg-text text-[hsl(var(--text-inverse))] border-text"
                    : "bg-bg-subtle text-text-muted border-border hover:border-border-strong hover:text-text",
                )}
              >
                {c.label}
              </button>
            );
          })}
        </Row>
      </FieldLabel>

      {/* AI helper */}
      {objective.trim().length > 10 && (
        <div className="p-3 bg-accent-soft border border-accent/10 rounded-md flex gap-2.5">
          <Icon name="sparkles" size={14} className="text-accent-text shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="text-[12px] font-semibold text-accent-text">
              Sugestão baseada no seu objetivo
            </div>
            <div className="text-[12px] text-accent-text mt-1 leading-[1.5]">
              Objetivos formulados como resultado observável + prazo trimestral têm{" "}
              <span className="font-semibold">2,3×</span> mais chance de concluir. Boa escolha.
            </div>
          </div>
        </div>
      )}
    </Col>
  );
}

/* ─── Passo 2 — Critério ────────────────────────────────────── */

function StepCriterio({
  objective,
  successMetrics,
  setSuccessMetrics,
  metricNumeric,
  setMetricNumeric,
  deadline,
  setDeadline,
}: {
  objective: string;
  successMetrics: string;
  setSuccessMetrics: (v: string) => void;
  metricNumeric: string;
  setMetricNumeric: (v: string) => void;
  deadline: string;
  setDeadline: (v: string) => void;
}) {
  return (
    <Col gap={16}>
      {/* Objetivo (read-only) */}
      <div className="bg-bg-subtle border border-border rounded-md p-3 flex gap-2 items-start">
        <Icon name="check" size={13} className="text-status-green shrink-0 mt-1" />
        <div className="flex-1">
          <div className="text-[10.5px] font-semibold uppercase tracking-[0.05em] text-text-subtle">
            Objetivo
          </div>
          <div className="text-[13px] text-text mt-0.5">{objective || "—"}</div>
        </div>
      </div>

      <div>
        <div className="text-[15px] font-semibold text-text tracking-[-0.01em]">
          Como saberemos que deu certo?
        </div>
        <div className="text-[12.5px] text-text-muted mt-1">
          Defina um critério observável — algo que alguém de fora possa confirmar.
        </div>
      </div>

      <FieldLabel label="Critério de sucesso" hint="Obrigatório">
        <textarea
          value={successMetrics}
          onChange={(e) => setSuccessMetrics(e.target.value)}
          placeholder="Ex: Nota média ≥ 4.2/5 nas pesquisas de 1:1 ao final do trimestre."
          className="w-full min-h-[78px] p-2.5 text-[13px] text-text bg-surface border border-border rounded-md resize-y outline-none focus:border-border-focus transition-colors font-sans leading-[1.55]"
        />
      </FieldLabel>

      <Row gap={10} align="start">
        <FieldLabel label="Métrica numérica (opcional)" className="flex-1">
          <input
            value={metricNumeric}
            onChange={(e) => setMetricNumeric(e.target.value)}
            placeholder="Ex: 4.2 / 8 de 10 / 80%"
            className="w-full h-[34px] px-2.5 text-[13px] text-text bg-surface border border-border rounded-md outline-none focus:border-border-focus transition-colors font-sans"
          />
        </FieldLabel>
        <FieldLabel label="Prazo" className="flex-1">
          <div className="relative">
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full h-[34px] px-2.5 pr-8 text-[13px] text-text bg-surface border border-border rounded-md outline-none focus:border-border-focus transition-colors font-sans"
            />
            <Icon
              name="calendar"
              size={13}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-subtle pointer-events-none"
            />
          </div>
        </FieldLabel>
      </Row>
    </Col>
  );
}

/* ─── Passo 3 — Ações ──────────────────────────────────────── */

function StepAcoes({
  actions,
  addAction,
  removeAction,
  updateAction,
  requiredSupport,
  setRequiredSupport,
}: {
  actions: ActionItem[];
  addAction: () => void;
  removeAction: (id: string) => void;
  updateAction: (id: string, text: string) => void;
  requiredSupport: string;
  setRequiredSupport: (v: string) => void;
}) {
  const canAdd = actions.length < 3;
  return (
    <Col gap={16}>
      <div>
        <div className="text-[15px] font-semibold text-text tracking-[-0.01em]">
          Quais ações vão te levar até lá?
        </div>
        <div className="text-[12.5px] text-text-muted mt-1">
          Pense em ações concretas, com verbo no infinitivo.
        </div>
      </div>

      <FieldLabel label="Ações" hint="Mínimo 1 · máximo 3">
        <Col gap={6}>
          {actions.map((a, i) => (
            <div
              key={a.id}
              className="flex items-center gap-2 bg-surface border border-border rounded-md px-2.5 h-[38px]"
            >
              <span className="text-[11px] font-semibold text-text-subtle tabular w-[18px] text-center">
                {i + 1}
              </span>
              <input
                value={a.text}
                onChange={(e) => updateAction(a.id, e.target.value)}
                placeholder="Ex: Ler 2 livros sobre liderança situacional"
                className="flex-1 text-[13px] text-text outline-none bg-transparent font-sans"
              />
              {actions.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeAction(a.id)}
                  className="text-text-subtle hover:text-text-muted transition-colors w-6 h-6 inline-grid place-items-center"
                  aria-label="Remover ação"
                >
                  <Icon name="x" size={12} />
                </button>
              )}
            </div>
          ))}
          {canAdd && (
            <button
              type="button"
              onClick={addAction}
              className="flex items-center gap-1.5 h-[34px] px-2.5 text-[12.5px] font-medium text-text-muted bg-bg-subtle border border-dashed border-border-strong rounded-md hover:bg-bg-muted hover:text-text transition-colors self-start"
            >
              <Icon name="plus" size={13} />
              Adicionar ação
            </button>
          )}
        </Col>
      </FieldLabel>

      <FieldLabel label="Apoio necessário (opcional)">
        <textarea
          value={requiredSupport}
          onChange={(e) => setRequiredSupport(e.target.value)}
          placeholder="O que seu líder ou a empresa precisam fazer para te apoiar?"
          className="w-full min-h-[60px] p-2.5 text-[13px] text-text bg-surface border border-border rounded-md resize-y outline-none focus:border-border-focus transition-colors font-sans leading-[1.55]"
        />
      </FieldLabel>
    </Col>
  );
}

/* ─── Passo 4 — Revisar ────────────────────────────────────── */

function StepRevisar({
  mainObjective,
  category,
  successMetrics,
  metricNumeric,
  actions,
  requiredSupport,
  anticipatedChallenges,
  setAnticipatedChallenges,
  deadline,
  onEdit,
}: {
  mainObjective: string;
  category: string;
  successMetrics: string;
  metricNumeric: string;
  actions: ActionItem[];
  requiredSupport: string;
  anticipatedChallenges: string;
  setAnticipatedChallenges: (v: string) => void;
  deadline: string;
  onEdit: (idx: number) => void;
}) {
  return (
    <Col gap={14}>
      <div>
        <div className="text-[15px] font-semibold text-text tracking-[-0.01em]">
          Revisar antes de salvar
        </div>
        <div className="text-[12.5px] text-text-muted mt-1">
          Você ainda pode editar cada passo.
        </div>
      </div>

      <ReviewBlock label="Objetivo" stepIdx={0} onEdit={onEdit}>
        <Row gap={6} align="center" wrap>
          <Chip color="neutral" size="sm">
            {category}
          </Chip>
          <span className="text-[13px] text-text">{mainObjective || "—"}</span>
        </Row>
      </ReviewBlock>

      <ReviewBlock label="Critério" stepIdx={1} onEdit={onEdit}>
        <div className="text-[13px] text-text whitespace-pre-wrap">
          {successMetrics || "—"}
        </div>
        <Row gap={6} className="mt-1.5" wrap>
          {metricNumeric && (
            <Chip color="accent" size="sm" icon={<Icon name="target" size={11} />}>
              {metricNumeric}
            </Chip>
          )}
          {deadline && (
            <Chip color="neutral" size="sm" icon={<Icon name="calendar" size={11} />}>
              {formatDeadline(deadline)}
            </Chip>
          )}
        </Row>
      </ReviewBlock>

      <ReviewBlock label="Ações" stepIdx={2} onEdit={onEdit}>
        <Col gap={4}>
          {actions.length === 0 ? (
            <div className="text-[12px] text-text-subtle">Nenhuma ação definida.</div>
          ) : (
            actions.map((a, i) => (
              <Row gap={8} key={a.id} align="start">
                <span className="text-[11px] font-semibold text-text-subtle tabular w-[14px] shrink-0">
                  {i + 1}
                </span>
                <span className="text-[13px] text-text">{a.text}</span>
              </Row>
            ))
          )}
        </Col>
        {requiredSupport && (
          <div className="mt-2 pt-2 border-t border-border">
            <div className="text-[10.5px] font-semibold uppercase tracking-[0.05em] text-text-subtle">
              Apoio necessário
            </div>
            <div className="text-[12.5px] text-text-muted mt-0.5 whitespace-pre-wrap">
              {requiredSupport}
            </div>
          </div>
        )}
      </ReviewBlock>

      <FieldLabel label="Desafios previstos (opcional)">
        <textarea
          value={anticipatedChallenges}
          onChange={(e) => setAnticipatedChallenges(e.target.value)}
          placeholder="O que pode atrapalhar?"
          className="w-full min-h-[60px] p-2.5 text-[13px] text-text bg-surface border border-border rounded-md resize-y outline-none focus:border-border-focus transition-colors font-sans leading-[1.55]"
        />
      </FieldLabel>
    </Col>
  );
}

/* ─── Helpers ─────────────────────────────────────────────── */

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

function ReviewBlock({
  label,
  stepIdx,
  onEdit,
  children,
}: {
  label: string;
  stepIdx: number;
  onEdit: (idx: number) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-bg-subtle border border-border rounded-md p-3">
      <div className="flex items-center justify-between mb-1.5">
        <div className="text-[10.5px] font-semibold uppercase tracking-[0.05em] text-text-subtle">
          {label}
        </div>
        <button
          type="button"
          onClick={() => onEdit(stepIdx)}
          className="text-[11.5px] text-text-muted hover:text-text transition-colors"
        >
          Editar
        </button>
      </div>
      {children}
    </div>
  );
}

function formatDeadline(iso: string) {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}
