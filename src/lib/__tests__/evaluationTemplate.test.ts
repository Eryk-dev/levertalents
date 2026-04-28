import { describe, it, expect } from 'vitest';
import { buildZodFromTemplate, templateSnapshotSchema } from '../evaluationTemplate';
import { buildTemplateSnapshot } from '@/test/perf-fixtures/templateSnapshot';

describe('buildZodFromTemplate (D-07 + Pattern 3) [INV-3-06]', () => {
  it('builds object schema with question.id keys', () => {
    const snap = buildTemplateSnapshot();
    const schema = buildZodFromTemplate(snap);
    const result = schema.safeParse({});
    expect(result.success).toBe(false); // required questions missing
  });

  it('scale_1_5 → z.number().int().min(1).max(5)', () => {
    const snap = buildTemplateSnapshot({
      version: 1,
      sections: [{ id: 's', title: 't', weight: 1, questions: [{ id: 'q', label: 'l', type: 'scale_1_5', required: true }] }],
    });
    const schema = buildZodFromTemplate(snap);
    expect(schema.safeParse({ q: 3 }).success).toBe(true);
    expect(schema.safeParse({ q: 0 }).success).toBe(false);
    expect(schema.safeParse({ q: 6 }).success).toBe(false);
    expect(schema.safeParse({ q: 3.5 }).success).toBe(false);
  });

  it('text required → string().min(1)', () => {
    const snap = buildTemplateSnapshot({
      version: 1,
      sections: [{ id: 's', title: 't', weight: 1, questions: [{ id: 'q', label: 'l', type: 'text', required: true }] }],
    });
    const schema = buildZodFromTemplate(snap);
    expect(schema.safeParse({ q: 'hello' }).success).toBe(true);
    expect(schema.safeParse({ q: '' }).success).toBe(false);
  });

  it('text optional → string().optional()', () => {
    const snap = buildTemplateSnapshot({
      version: 1,
      sections: [{ id: 's', title: 't', weight: 1, questions: [{ id: 'q', label: 'l', type: 'text', required: false }] }],
    });
    const schema = buildZodFromTemplate(snap);
    expect(schema.safeParse({}).success).toBe(true);
    expect(schema.safeParse({ q: '' }).success).toBe(true);
  });

  it('choice required → enum(options)', () => {
    const snap = buildTemplateSnapshot({
      version: 1,
      sections: [{ id: 's', title: 't', weight: 1, questions: [{ id: 'q', label: 'l', type: 'choice', required: true, options: ['a', 'b'] }] }],
    });
    const schema = buildZodFromTemplate(snap);
    expect(schema.safeParse({ q: 'a' }).success).toBe(true);
    expect(schema.safeParse({ q: 'c' }).success).toBe(false);
  });

  it('templateSnapshotSchema validates snapshot shape', () => {
    expect(templateSnapshotSchema.safeParse(buildTemplateSnapshot()).success).toBe(true);
    expect(templateSnapshotSchema.safeParse({ version: 2, sections: [] }).success).toBe(false);
  });
});
