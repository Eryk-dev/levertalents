import { type Control } from 'react-hook-form';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import type { TemplateQuestion } from '@/lib/evaluationTemplate';

export interface EvaluationFormQuestionProps {
  control: Control<Record<string, unknown>>;
  question: TemplateQuestion;
  fieldPath: string; // e.g. "responses.q-1"
}

export function EvaluationFormQuestion({
  control,
  question,
  fieldPath,
}: EvaluationFormQuestionProps) {
  return (
    <FormField
      control={control}
      name={fieldPath}
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            {question.label}
            {question.required && <span className="text-status-red ml-1">*</span>}
          </FormLabel>
          <FormControl>
            {question.type === 'scale_1_5' ? (
              <RadioGroup
                value={field.value != null ? String(field.value) : ''}
                onValueChange={(v) => field.onChange(parseInt(v, 10))}
                className="flex gap-2"
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <label key={n} className="flex flex-col items-center gap-1 cursor-pointer">
                    <RadioGroupItem value={String(n)} id={`${fieldPath}-${n}`} />
                    <span className="text-xs">{n}</span>
                  </label>
                ))}
              </RadioGroup>
            ) : question.type === 'scale_1_3' ? (
              <Scale1to3
                value={typeof field.value === 'number' ? field.value : null}
                onChange={field.onChange}
                fieldPath={fieldPath}
                questionId={question.id}
              />
            ) : question.type === 'text' ? (
              <Textarea
                {...field}
                value={(field.value as string) ?? ''}
                rows={3}
              />
            ) : (
              <Select
                value={(field.value as string) ?? ''}
                onValueChange={field.onChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione…" />
                </SelectTrigger>
                <SelectContent>
                  {question.options.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

// Standard 9box rubric labels. Detected by question.id (the seed template uses
// 'performance' and 'potential'). Other scale_1_3 questions fall back to numeric.
const SCALE_1_3_LABELS: Record<string, [string, string, string]> = {
  performance: ['Abaixo do esperado', 'Dentro do esperado', 'Acima do esperado'],
  potential: ['Baixo', 'Médio', 'Alto'],
};

function Scale1to3({
  value,
  onChange,
  fieldPath,
  questionId,
}: {
  value: number | null;
  onChange: (v: number) => void;
  fieldPath: string;
  questionId: string;
}) {
  const labels = SCALE_1_3_LABELS[questionId] ?? ['1', '2', '3'];
  return (
    <div className="grid grid-cols-3 gap-2">
      {[1, 2, 3].map((n, idx) => {
        const selected = value === n;
        return (
          <button
            key={n}
            type="button"
            id={`${fieldPath}-${n}`}
            onClick={() => onChange(n)}
            aria-pressed={selected}
            className={
              selected
                ? 'flex flex-col items-center justify-center gap-1 rounded-md border-2 border-accent bg-accent-soft/30 px-3 py-3 cursor-pointer transition-colors'
                : 'flex flex-col items-center justify-center gap-1 rounded-md border border-border bg-card px-3 py-3 cursor-pointer hover:bg-bg-subtle/40 transition-colors'
            }
          >
            <span className={selected ? 'text-[18px] font-semibold tabular-nums text-accent-text' : 'text-[18px] font-semibold tabular-nums text-text'}>
              {n}
            </span>
            <span className="text-[11px] text-text-muted text-center leading-tight">
              {labels[idx]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
