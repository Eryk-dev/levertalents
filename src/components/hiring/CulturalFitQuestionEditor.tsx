import { useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/primitives";
import { cn } from "@/lib/utils";
import {
  GripVertical,
  Plus,
  Trash2,
  Check,
  Loader2,
  CircleHelp,
  ListChecks,
  BarChart3,
} from "lucide-react";
import {
  useCreateFitQuestion,
  useDeleteFitQuestion,
  useFitQuestions,
  useUpdateFitQuestion,
} from "@/hooks/hiring/useCulturalFit";
import type {
  CulturalFitQuestionRow,
  FitQuestionKind,
} from "@/integrations/supabase/hiring-types";

interface CulturalFitQuestionEditorProps {
  surveyId: string;
}

const KIND_LABEL: Record<FitQuestionKind, string> = {
  text: "Texto",
  scale: "Escala",
  multi_choice: "Múltipla escolha",
};

const KIND_ICON: Record<FitQuestionKind, typeof CircleHelp> = {
  text: CircleHelp,
  scale: BarChart3,
  multi_choice: ListChecks,
};

export function CulturalFitQuestionEditor({ surveyId }: CulturalFitQuestionEditorProps) {
  const { data: questions = [] } = useFitQuestions(surveyId);
  const createQ = useCreateFitQuestion();
  const updateQ = useUpdateFitQuestion();
  const deleteQ = useDeleteFitQuestion();

  const isSaving = createQ.isPending || updateQ.isPending || deleteQ.isPending;
  const [justSaved, setJustSaved] = useState(false);
  const savedTimer = useRef<number | null>(null);

  const markSaved = () => {
    if (savedTimer.current) window.clearTimeout(savedTimer.current);
    setJustSaved(true);
    savedTimer.current = window.setTimeout(() => setJustSaved(false), 1500);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const questionIds = useMemo(() => questions.map((q) => q.id), [questions]);

  const handleAdd = () => {
    const order = (questions[questions.length - 1]?.order_index ?? 0) + 1;
    createQ.mutate(
      {
        survey_id: surveyId,
        order_index: order,
        kind: "text",
        prompt: "",
        options: null,
        scale_min: null,
        scale_max: null,
      },
      { onSuccess: markSaved },
    );
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const activeIdx = questions.findIndex((q) => q.id === active.id);
    const overIdx = questions.findIndex((q) => q.id === over.id);
    if (activeIdx === -1 || overIdx === -1) return;
    const reordered = arrayMove(questions, activeIdx, overIdx);
    reordered.forEach((q, i) => {
      const newIdx = i + 1;
      if (q.order_index !== newIdx) {
        updateQ.mutate(
          { id: q.id, surveyId, patch: { order_index: newIdx } },
          { onSuccess: markSaved },
        );
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-ink">Perguntas</h3>
          <p className="text-xs text-muted-foreground">
            Arraste para reordenar. Alterações são salvas automaticamente.
          </p>
        </div>
        <SaveIndicator saving={isSaving} justSaved={justSaved} />
      </div>

      {questions.length === 0 ? (
        <EmptyState
          variant="compact"
          icon={Plus}
          title="Sem perguntas ainda"
          message="Clique em adicionar para começar."
        />
      ) : (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <SortableContext items={questionIds} strategy={verticalListSortingStrategy}>
            <ul className="space-y-2">
              {questions.map((q, i) => (
                <SortableQuestion
                  key={q.id}
                  index={i + 1}
                  question={q}
                  onUpdate={(patch) =>
                    updateQ.mutate({ id: q.id, surveyId, patch }, { onSuccess: markSaved })
                  }
                  onDelete={() =>
                    deleteQ.mutate({ id: q.id, surveyId }, { onSuccess: markSaved })
                  }
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      <Button
        variant="outline"
        className="w-full border-dashed"
        onClick={handleAdd}
        disabled={createQ.isPending}
      >
        <Plus className="mr-1 h-4 w-4" aria-hidden />
        Adicionar pergunta
      </Button>
    </div>
  );
}

function SaveIndicator({ saving, justSaved }: { saving: boolean; justSaved: boolean }) {
  if (saving) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
        Salvando…
      </span>
    );
  }
  if (justSaved) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] text-status-green">
        <Check className="h-3 w-3" aria-hidden />
        Salvo
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground/60">
      <Check className="h-3 w-3" aria-hidden />
      Tudo salvo
    </span>
  );
}

interface SortableQuestionProps {
  question: CulturalFitQuestionRow;
  index: number;
  onUpdate: (patch: Partial<CulturalFitQuestionRow>) => void;
  onDelete: () => void;
}

function SortableQuestion({ question, index, onUpdate, onDelete }: SortableQuestionProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: question.id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  const [prompt, setPrompt] = useState(question.prompt);
  const [optionsText, setOptionsText] = useState(
    Array.isArray(question.options) ? (question.options as string[]).join(", ") : "",
  );
  const [scaleMin, setScaleMin] = useState(String(question.scale_min ?? 1));
  const [scaleMax, setScaleMax] = useState(String(question.scale_max ?? 5));

  const Icon = KIND_ICON[question.kind];

  const commitKind = (kind: FitQuestionKind) => {
    const patch: Partial<CulturalFitQuestionRow> = { kind };
    if (kind === "scale") {
      patch.scale_min = Number(scaleMin) || 1;
      patch.scale_max = Number(scaleMax) || 5;
      patch.options = null;
    } else if (kind === "multi_choice") {
      patch.scale_min = null;
      patch.scale_max = null;
      patch.options = optionsText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    } else {
      patch.scale_min = null;
      patch.scale_max = null;
      patch.options = null;
    }
    onUpdate(patch);
  };

  const commitPrompt = () => {
    if (prompt !== question.prompt) onUpdate({ prompt });
  };

  const commitOptions = () => {
    const list = optionsText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const current = Array.isArray(question.options) ? (question.options as string[]) : [];
    if (list.join("|") !== current.join("|")) onUpdate({ options: list });
  };

  const commitScale = () => {
    const min = Number(scaleMin) || 1;
    const max = Number(scaleMax) || 5;
    if (min !== question.scale_min || max !== question.scale_max) {
      onUpdate({ scale_min: min, scale_max: max });
    }
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        "group rounded-md border border-border bg-card p-3 shadow-ds-sm",
        isDragging && "opacity-60 ring-2 ring-turquoise",
      )}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          className="mt-1 inline-flex h-5 w-5 shrink-0 cursor-grab items-center justify-center rounded text-muted-foreground hover:bg-muted active:cursor-grabbing"
          aria-label="Arrastar para reordenar"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>

        <span className="mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ink/5 text-[10px] font-semibold tabular-nums text-ink/70">
          {index}
        </span>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Select value={question.kind} onValueChange={(v) => commitKind(v as FitQuestionKind)}>
              <SelectTrigger className="h-7 w-auto gap-1 text-[11px]">
                <Icon className="h-3 w-3" aria-hidden />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(["text", "scale", "multi_choice"] as FitQuestionKind[]).map((k) => (
                  <SelectItem key={k} value={k}>
                    {KIND_LABEL[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {question.kind === "scale" ? (
              <div className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                <Input
                  type="number"
                  className="h-7 w-14 text-[11px]"
                  value={scaleMin}
                  onChange={(e) => setScaleMin(e.target.value)}
                  onBlur={commitScale}
                  aria-label="Mínimo"
                />
                <span>→</span>
                <Input
                  type="number"
                  className="h-7 w-14 text-[11px]"
                  value={scaleMax}
                  onChange={(e) => setScaleMax(e.target.value)}
                  onBlur={commitScale}
                  aria-label="Máximo"
                />
              </div>
            ) : null}
          </div>

          <Textarea
            rows={2}
            placeholder="Escreva a pergunta…"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onBlur={commitPrompt}
            className="resize-y text-sm"
          />

          {question.kind === "multi_choice" ? (
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-muted-foreground">
                Opções (separadas por vírgula)
              </label>
              <Input
                value={optionsText}
                onChange={(e) => setOptionsText(e.target.value)}
                onBlur={commitOptions}
                placeholder="Opção 1, Opção 2, Opção 3"
              />
            </div>
          ) : null}
        </div>

        <Button
          size="icon"
          variant="ghost"
          onClick={onDelete}
          className="h-7 w-7 shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
          aria-label="Remover pergunta"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </li>
  );
}
