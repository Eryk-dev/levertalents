import { useEffect, useRef, useState } from 'react';
import { Plus, Trash2, Check, Loader2, CircleHelp, ListChecks, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useUpdateTemplate, type TemplateSnapshot } from '@/hooks/useEvaluationTemplates';
import type { Database } from '@/integrations/supabase/types';

type TemplateRow = Database['public']['Tables']['evaluation_templates']['Row'];
type QuestionType = TemplateSnapshot['sections'][number]['questions'][number]['type'];

const TYPE_LABEL: Record<QuestionType, string> = {
  scale_1_5: 'Nota 1 a 5',
  text: 'Texto livre',
  choice: 'Múltipla escolha',
};

const TYPE_ICON: Record<QuestionType, typeof CircleHelp> = {
  scale_1_5: BarChart3,
  text: CircleHelp,
  choice: ListChecks,
};

const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `id-${Math.random().toString(36).slice(2, 10)}`;

const emptySnapshot = (): TemplateSnapshot => ({ version: 1, sections: [] });

const ensureSnapshot = (raw: unknown): TemplateSnapshot => {
  if (!raw || typeof raw !== 'object') return emptySnapshot();
  const snap = raw as Partial<TemplateSnapshot>;
  if (!Array.isArray(snap.sections)) return emptySnapshot();
  return { version: snap.version ?? 1, sections: snap.sections };
};

export interface EvaluationTemplateEditorProps {
  template: TemplateRow;
}

export function EvaluationTemplateEditor({ template }: EvaluationTemplateEditorProps) {
  const update = useUpdateTemplate();
  const [snapshot, setSnapshot] = useState<TemplateSnapshot>(() =>
    ensureSnapshot(template.schema_json),
  );
  const [name, setName] = useState(template.name);
  const [justSaved, setJustSaved] = useState(false);
  const savedTimer = useRef<number | null>(null);

  useEffect(() => {
    setSnapshot(ensureSnapshot(template.schema_json));
    setName(template.name);
  }, [template.id, template.schema_json, template.name]);

  const markSaved = () => {
    if (savedTimer.current) window.clearTimeout(savedTimer.current);
    setJustSaved(true);
    savedTimer.current = window.setTimeout(() => setJustSaved(false), 1500);
  };

  const persist = (next: TemplateSnapshot) => {
    setSnapshot(next);
    update.mutate(
      { id: template.id, schema_json: next },
      { onSuccess: markSaved },
    );
  };

  const persistName = () => {
    const trimmed = name.trim();
    if (!trimmed || trimmed === template.name) return;
    update.mutate({ id: template.id, name: trimmed }, { onSuccess: markSaved });
  };

  const addSection = () => {
    persist({
      ...snapshot,
      sections: [
        ...snapshot.sections,
        { id: newId(), title: '', weight: 1, questions: [] },
      ],
    });
  };

  const updateSection = (
    sectionId: string,
    patch: Partial<TemplateSnapshot['sections'][number]>,
  ) => {
    persist({
      ...snapshot,
      sections: snapshot.sections.map((s) => (s.id === sectionId ? { ...s, ...patch } : s)),
    });
  };

  const deleteSection = (sectionId: string) => {
    persist({
      ...snapshot,
      sections: snapshot.sections.filter((s) => s.id !== sectionId),
    });
  };

  const addQuestion = (sectionId: string) => {
    persist({
      ...snapshot,
      sections: snapshot.sections.map((s) =>
        s.id === sectionId
          ? {
              ...s,
              questions: [
                ...s.questions,
                { id: newId(), label: '', type: 'scale_1_5', required: true },
              ],
            }
          : s,
      ),
    });
  };

  const updateQuestion = (
    sectionId: string,
    questionId: string,
    patch: Partial<TemplateSnapshot['sections'][number]['questions'][number]>,
  ) => {
    persist({
      ...snapshot,
      sections: snapshot.sections.map((s) =>
        s.id === sectionId
          ? {
              ...s,
              questions: s.questions.map((q) =>
                q.id === questionId ? { ...q, ...patch } : q,
              ),
            }
          : s,
      ),
    });
  };

  const deleteQuestion = (sectionId: string, questionId: string) => {
    persist({
      ...snapshot,
      sections: snapshot.sections.map((s) =>
        s.id === sectionId
          ? { ...s, questions: s.questions.filter((q) => q.id !== questionId) }
          : s,
      ),
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-1">
          <Label htmlFor="template-name" className="text-[11px] font-medium text-text-muted">
            Nome do template
          </Label>
          <Input
            id="template-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={persistName}
            placeholder="Ex.: Avaliação 360 — Líder direto"
          />
        </div>
        <SaveIndicator saving={update.isPending} justSaved={justSaved} />
      </div>

      {snapshot.sections.length === 0 ? (
        <div className="rounded-md border border-dashed border-border bg-bg-subtle/40 px-4 py-8 text-center">
          <p className="text-sm font-medium text-text">Sem seções ainda</p>
          <p className="mt-1 text-xs text-text-muted">
            Comece criando uma seção (ex.: "Competências técnicas").
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {snapshot.sections.map((section, idx) => (
            <SectionEditor
              key={section.id}
              index={idx + 1}
              section={section}
              onChange={(patch) => updateSection(section.id, patch)}
              onDelete={() => deleteSection(section.id)}
              onAddQuestion={() => addQuestion(section.id)}
              onChangeQuestion={(qid, patch) => updateQuestion(section.id, qid, patch)}
              onDeleteQuestion={(qid) => deleteQuestion(section.id, qid)}
            />
          ))}
        </ul>
      )}

      <Button variant="outline" className="w-full border-dashed" onClick={addSection}>
        <Plus className="mr-1 h-4 w-4" /> Adicionar seção
      </Button>
    </div>
  );
}

function SaveIndicator({ saving, justSaved }: { saving: boolean; justSaved: boolean }) {
  if (saving) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] text-text-muted whitespace-nowrap">
        <Loader2 className="h-3 w-3 animate-spin" />
        Salvando…
      </span>
    );
  }
  if (justSaved) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] text-status-green whitespace-nowrap">
        <Check className="h-3 w-3" />
        Salvo
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-text-muted/60 whitespace-nowrap">
      <Check className="h-3 w-3" />
      Tudo salvo
    </span>
  );
}

interface SectionEditorProps {
  section: TemplateSnapshot['sections'][number];
  index: number;
  onChange: (patch: Partial<TemplateSnapshot['sections'][number]>) => void;
  onDelete: () => void;
  onAddQuestion: () => void;
  onChangeQuestion: (
    qid: string,
    patch: Partial<TemplateSnapshot['sections'][number]['questions'][number]>,
  ) => void;
  onDeleteQuestion: (qid: string) => void;
}

function SectionEditor({
  section,
  index,
  onChange,
  onDelete,
  onAddQuestion,
  onChangeQuestion,
  onDeleteQuestion,
}: SectionEditorProps) {
  const [title, setTitle] = useState(section.title);
  const [weight, setWeight] = useState(String(section.weight ?? 1));

  useEffect(() => {
    setTitle(section.title);
    setWeight(String(section.weight ?? 1));
  }, [section.title, section.weight]);

  const commitTitle = () => {
    if (title !== section.title) onChange({ title });
  };
  const commitWeight = () => {
    const w = Number(weight);
    if (!Number.isFinite(w) || w <= 0) {
      setWeight(String(section.weight ?? 1));
      return;
    }
    if (w !== section.weight) onChange({ weight: w });
  };

  return (
    <li className="rounded-md border border-border bg-card p-4 space-y-3">
      <div className="flex items-start gap-2">
        <span className="mt-1.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-text/5 text-[10px] font-semibold tabular-nums text-text/70">
          {index}
        </span>
        <div className="flex-1 grid grid-cols-[1fr_88px] gap-2">
          <div className="space-y-1">
            <Label className="text-[11px] font-medium text-text-muted">Seção</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={commitTitle}
              placeholder="Ex.: Competências técnicas"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] font-medium text-text-muted">Peso</Label>
            <Input
              type="number"
              min={1}
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              onBlur={commitWeight}
            />
          </div>
        </div>
        <Button
          size="icon"
          variant="ghost"
          onClick={onDelete}
          className="h-8 w-8 text-text-muted hover:text-status-red"
          aria-label="Remover seção"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="pl-7 space-y-2">
        {section.questions.length === 0 ? (
          <p className="text-[12px] text-text-muted">Nenhuma pergunta nesta seção.</p>
        ) : (
          <ul className="space-y-2">
            {section.questions.map((q, i) => (
              <QuestionEditor
                key={q.id}
                index={i + 1}
                question={q}
                onChange={(patch) => onChangeQuestion(q.id, patch)}
                onDelete={() => onDeleteQuestion(q.id)}
              />
            ))}
          </ul>
        )}
        <Button
          variant="outline"
          size="sm"
          className="w-full border-dashed"
          onClick={onAddQuestion}
        >
          <Plus className="mr-1 h-3.5 w-3.5" /> Adicionar pergunta
        </Button>
      </div>
    </li>
  );
}

interface QuestionEditorProps {
  question: TemplateSnapshot['sections'][number]['questions'][number];
  index: number;
  onChange: (
    patch: Partial<TemplateSnapshot['sections'][number]['questions'][number]>,
  ) => void;
  onDelete: () => void;
}

function QuestionEditor({ question, index, onChange, onDelete }: QuestionEditorProps) {
  const [label, setLabel] = useState(question.label);
  const [optionsText, setOptionsText] = useState((question.options ?? []).join(', '));
  const Icon = TYPE_ICON[question.type];

  useEffect(() => {
    setLabel(question.label);
    setOptionsText((question.options ?? []).join(', '));
  }, [question.label, question.options]);

  const commitLabel = () => {
    if (label !== question.label) onChange({ label });
  };

  const commitOptions = () => {
    const list = optionsText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const current = question.options ?? [];
    if (list.join('|') !== current.join('|')) onChange({ options: list });
  };

  const commitType = (type: QuestionType) => {
    const patch: Partial<typeof question> = { type };
    if (type === 'choice') {
      patch.options = (question.options ?? []).length ? question.options : ['Opção 1', 'Opção 2'];
    } else {
      patch.options = undefined;
    }
    onChange(patch);
  };

  return (
    <li className="rounded-md border border-border/60 bg-bg-subtle/30 p-2.5 space-y-2">
      <div className="flex items-start gap-2">
        <span className="mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-text/5 text-[10px] font-semibold tabular-nums text-text/70">
          {index}
        </span>
        <div className="flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Select value={question.type} onValueChange={(v) => commitType(v as QuestionType)}>
              <SelectTrigger className="h-7 w-auto gap-1 text-[11px]">
                <Icon className="h-3 w-3" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(['scale_1_5', 'text', 'choice'] as QuestionType[]).map((k) => (
                  <SelectItem key={k} value={k}>
                    {TYPE_LABEL[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <label className="inline-flex items-center gap-1.5 text-[11px] text-text-muted">
              <Switch
                checked={question.required}
                onCheckedChange={(checked) => onChange({ required: checked })}
              />
              Obrigatória
            </label>
          </div>
          <Textarea
            rows={2}
            placeholder="Escreva a pergunta…"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onBlur={commitLabel}
            className="resize-y text-sm"
          />
          {question.type === 'choice' && (
            <div className="space-y-1">
              <Label className="text-[11px] font-medium text-text-muted">
                Opções (separadas por vírgula)
              </Label>
              <Input
                value={optionsText}
                onChange={(e) => setOptionsText(e.target.value)}
                onBlur={commitOptions}
                placeholder="Sim, Não, Talvez"
              />
            </div>
          )}
        </div>
        <Button
          size="icon"
          variant="ghost"
          onClick={onDelete}
          className="h-7 w-7 text-text-muted hover:text-status-red"
          aria-label="Remover pergunta"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </li>
  );
}
