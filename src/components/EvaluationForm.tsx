import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form } from '@/components/ui/form';
import { Btn } from '@/components/primitives/LinearKit';
import { EvaluationFormSection } from './EvaluationFormSection';
import { buildZodFromTemplate, type TemplateSnapshot } from '@/lib/evaluationTemplate';
import {
  useCreateEvaluation,
  useUpdateEvaluation,
  type EvaluationDirection,
} from '@/hooks/useEvaluations';
import { toast } from 'sonner';

export interface EvaluationFormProps {
  cycleId: string;
  templateSnapshot: TemplateSnapshot;
  evaluatorUserId: string;
  evaluatedUserId: string;
  direction: EvaluationDirection;
  existingEvaluationId?: string;
  initialResponses?: Record<string, unknown>;
  onSaved?: () => void;
}

export function EvaluationForm(props: EvaluationFormProps) {
  // Build Zod resolver dynamically from template snapshot (D-07 + Pattern 3)
  const responsesSchema = useMemo(
    () => buildZodFromTemplate(props.templateSnapshot),
    [props.templateSnapshot],
  );
  const formSchema = useMemo(
    () => z.object({ responses: responsesSchema }),
    [responsesSchema],
  );

  type FormValues = z.infer<typeof formSchema>;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { responses: (props.initialResponses ?? {}) as FormValues['responses'] },
  });

  const create = useCreateEvaluation();
  const update = useUpdateEvaluation();
  const isPending = create.isPending || update.isPending;

  const onSubmit = (values: FormValues) => {
    const onSuccess = () => {
      toast.success('Avaliação salva');
      props.onSaved?.();
    };
    const onError = (e: Error) =>
      toast.error('Não foi possível salvar', { description: e.message });

    if (props.existingEvaluationId) {
      update.mutate(
        {
          id: props.existingEvaluationId,
          cycle_id: props.cycleId,
          responses: values.responses,
        },
        { onSuccess, onError },
      );
    } else {
      create.mutate(
        {
          cycle_id: props.cycleId,
          evaluator_user_id: props.evaluatorUserId,
          evaluated_user_id: props.evaluatedUserId,
          direction: props.direction,
          responses: values.responses,
        },
        { onSuccess, onError },
      );
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pb-24">
        {props.templateSnapshot.sections.map((section) => (
          <EvaluationFormSection
            key={section.id}
            control={form.control as unknown as Parameters<typeof EvaluationFormSection>[0]['control']}
            section={section}
          />
        ))}

        <div className="sticky bottom-0 bg-bg p-4 border-t border-border flex gap-2 justify-end">
          <Btn variant="secondary" type="button" onClick={() => form.reset()}>
            Salvar rascunho
          </Btn>
          <Btn variant="accent" type="submit" disabled={isPending}>
            {isPending ? 'Salvando…' : 'Salvar avaliação'}
          </Btn>
        </div>
      </form>
    </Form>
  );
}
