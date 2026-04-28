import { describe, it } from 'vitest';

// Wave 3 will implement src/lib/evaluationTemplate.ts (Pattern 3 from RESEARCH).
// This file is a Wave 0 stub — failing-by-default until then.
// TODO Wave 3: remover describe.skip e implementar src/lib/evaluationTemplate.ts (buildZodFromTemplate)
describe.skip('buildZodFromTemplate (Wave 3)', () => {
  it.todo('builds object schema where keys = question.id strings [INV-3-06]');
  it.todo('scale_1_5 question → z.number().int().min(1).max(5)');
  it.todo('text required → z.string().min(1, "Resposta obrigatória")');
  it.todo('text optional → z.string().optional() (D-07)');
  it.todo('choice required → z.enum(options as [string, ...string[]])');
  it.todo('choice required + empty options → schema rejects (z.never)');
  it.todo('templateSnapshotSchema validates the snapshot shape itself');
});
