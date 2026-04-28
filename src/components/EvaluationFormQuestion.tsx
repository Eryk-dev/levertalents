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
