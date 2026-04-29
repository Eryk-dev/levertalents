import { z } from "zod";

/**
 * Zod schema da JobOpeningForm.
 * Extraído para arquivo dedicado de modo que sub-sections possam tipar `register/errors/watch`
 * sem dependência circular com o componente shell.
 */

export const SHIFTS = [
  "Manhã",
  "Tarde",
  "Noite",
  "Integral",
  "Horário comercial",
  "Livre",
] as const;
export type Shift = (typeof SHIFTS)[number];

export const schema = z
  .object({
    company_id: z.string().uuid("Selecione uma empresa"),
    title: z.string().min(2, "Cargo obrigatório"),
    summary: z.string().optional(),
    sector: z.string().optional(),
    work_mode: z.enum(["presencial", "remoto", "hibrido"]).optional(),
    contract_type: z.enum(["clt", "pj", "estagio", "pj_equity"]).optional(),
    hours_per_week: z.coerce.number().int().min(1).max(80).optional(),
    num_openings: z.coerce.number().int().min(1).default(1),
    shift: z.enum(SHIFTS).optional(),
    salary_min_reais: z.coerce.number().nonnegative().optional(),
    salary_max_reais: z.coerce.number().nonnegative().optional(),
    target_deadline: z.string().optional(),
    address_street: z.string().optional(),
    address_number: z.string().optional(),
    address_complement: z.string().optional(),
    address_neighborhood: z.string().optional(),
    address_city: z.string().optional(),
    address_state: z.string().optional(),
    address_zip: z.string().optional(),
    cultural_fit_survey_id: z.string().uuid().optional().or(z.literal("")),
  })
  .refine(
    (v) =>
      !v.salary_min_reais ||
      !v.salary_max_reais ||
      v.salary_max_reais >= v.salary_min_reais,
    { message: "Máximo deve ser ≥ mínimo", path: ["salary_max_reais"] },
  );

export type JobFormValues = z.infer<typeof schema>;
