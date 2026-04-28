/**
 * SLA visual da Phase 2 (D-10): 2 dias = warning (amber), 5 dias = critical (red).
 * Global em v1, sem customização por empresa/vaga (V2 — depende de demanda real
 * de cliente externo).
 *
 * Pure functions: zero React, zero supabase, zero side-effects. Reusado por
 * `CandidateCard` (Plan 02-07), `SlaBadge` (Plan 02-07) e qualquer surface
 * downstream que precise mostrar "dias na etapa" com tom semântico.
 */

export type SlaTone = "ok" | "warning" | "critical";

export const SLA_THRESHOLDS = { warning: 2, critical: 5 } as const;

const ONE_DAY_MS = 86_400_000;

/**
 * Dias-corridos desde `at`. Clamp em 0 para datas futuras ou inválidas.
 * Aceita Date | string ISO | null | undefined.
 */
export function daysSince(at: Date | string | null | undefined): number {
  if (at === null || at === undefined) return 0;
  const ts = typeof at === "string" ? new Date(at).getTime() : at.getTime();
  if (Number.isNaN(ts)) return 0;
  const diffMs = Date.now() - ts;
  if (diffMs <= 0) return 0;
  return Math.floor(diffMs / ONE_DAY_MS);
}

export function computeSlaTone(stageEnteredAt: Date | string | null | undefined): SlaTone {
  const days = daysSince(stageEnteredAt);
  if (days >= SLA_THRESHOLDS.critical) return "critical";
  if (days >= SLA_THRESHOLDS.warning) return "warning";
  return "ok";
}

/** Tailwind border-left classes — usar em `<button class="border-l-[3px] ...">`. */
export const SLA_BORDER_CLASSES: Record<SlaTone, string> = {
  ok: "border-l-transparent",
  warning: "border-l-status-amber",
  critical: "border-l-status-red",
};

/** Tailwind dot classes — usar em `<span class="h-1.5 w-1.5 rounded-full ...">`. */
export const SLA_DOT_CLASSES: Record<SlaTone, string> = {
  ok: "bg-text-subtle/60",
  warning: "bg-status-amber",
  critical: "bg-status-red",
};
