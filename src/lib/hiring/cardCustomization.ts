/**
 * Card customization — Phase 2 D-08.
 *
 * Persistência localStorage namespaced: `leverup:rs:card-fields:{userId}`.
 * Schema Zod versionado para tolerar evolução sem crash (versão antiga →
 * fallback para DEFAULT_CARD_PREFERENCES).
 *
 * Mínimo fixo do card (D-07: nome + cargo + dias na etapa + vaga) NÃO mora
 * aqui — esses são sempre renderizados. Este módulo só governa os 6 campos
 * opcionais que cada usuário liga/desliga via `CardFieldsCustomizer` (Plan 02-08).
 *
 * Threat: T-02-03-01 (localStorage tampering) — `safeParse` rejeita valores
 * fora de OPTIONAL_FIELDS e retorna DEFAULT, nunca crasha o app.
 */

import { z } from "zod";

const SCHEMA_VERSION = 1 as const;

export const OPTIONAL_FIELDS = [
  "avatar",
  "next_interview",
  "cv_icon",
  "fit_score",
  "bg_check_dot",
  "source_tag",
] as const;

export type OptionalField = (typeof OPTIONAL_FIELDS)[number];

export const CardPreferencesSchema = z.object({
  version: z.literal(SCHEMA_VERSION),
  enabledFields: z.array(z.enum(OPTIONAL_FIELDS)),
});

export type CardPreferences = z.infer<typeof CardPreferencesSchema>;

export const DEFAULT_CARD_PREFERENCES: CardPreferences = {
  version: SCHEMA_VERSION,
  enabledFields: ["avatar", "next_interview", "cv_icon"],
};

const STORAGE_KEY = (userId: string) => `leverup:rs:card-fields:${userId}`;

/**
 * Lê preferências do localStorage; retorna DEFAULT em qualquer caminho de erro
 * (userId ausente, chave inexistente, JSON inválido, schema antigo). Nunca
 * lança — render path é resiliente por design.
 */
export function loadCardPreferences(userId: string | null | undefined): CardPreferences {
  if (!userId) return DEFAULT_CARD_PREFERENCES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY(userId));
    if (!raw) return DEFAULT_CARD_PREFERENCES;
    const parsed: unknown = JSON.parse(raw);
    const result = CardPreferencesSchema.safeParse(parsed);
    return result.success ? result.data : DEFAULT_CARD_PREFERENCES;
  } catch {
    return DEFAULT_CARD_PREFERENCES;
  }
}

/**
 * Persiste preferências em localStorage. Silent fail se storage estiver cheio
 * ou desabilitado (privado/incognito) — UI continua funcionando com state em memória.
 */
export function saveCardPreferences(userId: string, prefs: CardPreferences): void {
  try {
    localStorage.setItem(STORAGE_KEY(userId), JSON.stringify(prefs));
  } catch {
    // localStorage quota exceeded ou storage disabled — não bloqueia render.
  }
}

export function isFieldEnabled(prefs: CardPreferences, field: OptionalField): boolean {
  return prefs.enabledFields.includes(field);
}
