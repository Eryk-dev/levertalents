import { z, type ZodTypeAny } from 'zod';

export type TemplateQuestion =
  | { id: string; label: string; type: 'scale_1_5'; required: boolean }
  | { id: string; label: string; type: 'text'; required: boolean }
  | { id: string; label: string; type: 'choice'; required: boolean; options: string[] };

export type TemplateSection = {
  id: string;
  title: string;
  weight: number;
  questions: TemplateQuestion[];
};

export type TemplateSnapshot = {
  version: 1;
  sections: TemplateSection[];
};

function buildQuestionSchema(q: TemplateQuestion): ZodTypeAny {
  switch (q.type) {
    case 'scale_1_5': {
      const base = z.number().int().min(1).max(5);
      return q.required ? base : base.optional();
    }
    case 'text': {
      const base = z.string().min(1, 'Resposta obrigatória');
      return q.required ? base : z.string().optional();
    }
    case 'choice': {
      if (q.options.length === 0) {
        return q.required ? z.never() : z.string().optional();
      }
      const tuple = q.options as [string, ...string[]];
      const base = z.enum(tuple);
      return q.required ? base : base.optional();
    }
  }
}

/**
 * Builds a flat Zod object whose keys are question.id strings.
 * Returns z.ZodObject — type-safe, no `as any`.
 * D-07 + Pattern 3 from RESEARCH.md
 */
export function buildZodFromTemplate(snapshot: TemplateSnapshot) {
  const shape: Record<string, ZodTypeAny> = {};
  for (const section of snapshot.sections) {
    for (const q of section.questions) {
      shape[q.id] = buildQuestionSchema(q);
    }
  }
  return z.object(shape);
}

export const templateSnapshotSchema = z.object({
  version: z.literal(1),
  sections: z.array(z.object({
    id: z.string().min(1),
    title: z.string().min(1),
    weight: z.number().min(0).max(1),
    questions: z.array(z.discriminatedUnion('type', [
      z.object({ id: z.string(), label: z.string(), type: z.literal('scale_1_5'), required: z.boolean() }),
      z.object({ id: z.string(), label: z.string(), type: z.literal('text'), required: z.boolean() }),
      z.object({ id: z.string(), label: z.string(), type: z.literal('choice'), required: z.boolean(), options: z.array(z.string()).min(1) }),
    ])),
  })),
});
