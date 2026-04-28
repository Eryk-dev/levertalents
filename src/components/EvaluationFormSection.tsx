import { type Control } from 'react-hook-form';
import { Card } from '@/components/primitives/LinearKit';
import { EvaluationFormQuestion } from './EvaluationFormQuestion';
import type { TemplateSection } from '@/lib/evaluationTemplate';

export interface EvaluationFormSectionProps {
  control: Control<Record<string, unknown>>;
  section: TemplateSection;
}

export function EvaluationFormSection({ control, section }: EvaluationFormSectionProps) {
  return (
    <Card title={section.title}>
      <div className="space-y-4">
        {section.questions.map((q) => (
          <EvaluationFormQuestion
            key={q.id}
            control={control}
            question={q}
            fieldPath={`responses.${q.id}`}
          />
        ))}
      </div>
    </Card>
  );
}
