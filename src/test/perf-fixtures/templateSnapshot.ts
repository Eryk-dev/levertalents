// D-07 schema literal — keep in sync with src/lib/evaluationTemplate.ts (Wave 3)
// TemplateSnapshot is frozen when evaluation cycle opens (INV-3-05)
export type TemplateQuestion =
  | { id: string; label: string; type: 'scale_1_5'; required: boolean }
  | { id: string; label: string; type: 'text'; required: boolean }
  | { id: string; label: string; type: 'choice'; required: boolean; options: string[] };

export type TemplateSnapshot = {
  version: 1;
  sections: Array<{ id: string; title: string; weight: number; questions: TemplateQuestion[] }>;
};

export function buildTemplateSnapshot(overrides?: Partial<TemplateSnapshot>): TemplateSnapshot {
  return {
    version: 1,
    sections: [
      {
        id: 'sec-tech',
        title: 'Competências técnicas',
        weight: 0.5,
        questions: [
          {
            id: 'q-tech-1',
            label: 'Domina ferramentas do dia a dia',
            type: 'scale_1_5',
            required: true,
          },
          { id: 'q-tech-2', label: 'Comentário livre', type: 'text', required: false },
        ],
      },
      {
        id: 'sec-behav',
        title: 'Competências comportamentais',
        weight: 0.5,
        questions: [
          {
            id: 'q-beh-1',
            label: 'Frequência de feedback',
            type: 'choice',
            required: true,
            options: ['nunca', 'as vezes', 'sempre'],
          },
        ],
      },
    ],
    ...overrides,
  };
}
