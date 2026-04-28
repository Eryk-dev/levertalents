import { PostgrestError } from "@supabase/supabase-js";
import { toast } from "sonner";

type SupabaseLikeError = Pick<PostgrestError, "message" | "code" | "details" | "hint"> | Error | null | undefined;

const RLS_CODE = "42501";

const FRIENDLY_MESSAGES: Record<string, string> = {
  "23505": "Registro duplicado. Verifique se já não existe.",
  "23503": "Referência inválida — o item relacionado foi removido.",
  "23514": "Valor fora das regras permitidas.",
  "42501": "Você não tem permissão para essa operação.",
  PGRST116: "Nada encontrado para esses critérios.",
};

function isPostgrestError(err: unknown): err is PostgrestError {
  return typeof err === "object" && err !== null && "code" in err && "message" in err;
}

export function formatSupabaseError(err: SupabaseLikeError, fallback = "Algo deu errado"): string {
  if (!err) return fallback;
  if (isPostgrestError(err)) {
    return FRIENDLY_MESSAGES[err.code] ?? err.message ?? fallback;
  }
  if (err instanceof Error) return err.message || fallback;
  return fallback;
}

export function handleSupabaseError(err: SupabaseLikeError, userMessage: string, opts?: { silent?: boolean }): Error {
  const detail = formatSupabaseError(err);
  const finalMessage = `${userMessage}: ${detail}`;
  if (!opts?.silent) toast.error(finalMessage);
  if (err && typeof err === "object" && "code" in err && err.code === RLS_CODE) {
    console.warn("[RLS] blocked by policy:", err);
  } else {
    console.error("[supabase]", err);
  }
  return new Error(finalMessage);
}

export function throwOnError<T>(data: T | null, err: SupabaseLikeError, userMessage: string): T {
  if (err) throw handleSupabaseError(err, userMessage, { silent: true });
  if (data === null) throw handleSupabaseError(null, `${userMessage}: sem retorno`, { silent: true });
  return data;
}

// =========================================================================
// Phase 2 (Plan 02-03) — Move-application error model
//
// Discriminated union + 4 detect helpers used by useMoveApplicationStage
// (Plan 02-05) to translate raw fetch / Postgrest failures into user-facing
// toasts. Copy of the toast strings is locked by D-05 / UI-SPEC §"Error states".
// =========================================================================

export type MoveApplicationError =
  | { kind: "rls"; error: PostgrestError }
  | { kind: "network"; error: Error }
  | { kind: "conflict"; error?: PostgrestError }
  | { kind: "transition"; from: string; to: string }
  | { kind: "unknown"; error: unknown };

const CHECK_VIOLATION_CODE = "23514";

/** Postgrest emits 42501 when a row-level security policy denies the action. */
export function detectRlsDenial(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  return (err as PostgrestError).code === RLS_CODE;
}

/**
 * Best-effort detection of network-layer failures (browser fetch errors,
 * AbortController-driven timeouts, supabase-js fetch fallthrough where
 * `code === ""`).
 */
export function detectNetworkDrop(err: unknown): boolean {
  if (err instanceof TypeError && /fetch/i.test(err.message)) return true;
  if (err instanceof Error && err.name === "AbortError") return true;
  if (err && typeof err === "object" && "code" in err && (err as { code: unknown }).code === "") {
    return true;
  }
  return false;
}

/**
 * 23514 (check_violation) raised by the application_stage transition trigger
 * (`tg_enforce_application_stage_transition`) — message contains the word
 * "transition" so we can distinguish from other CHECK constraints.
 */
export function detectConflict(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as PostgrestError;
  return e.code === CHECK_VIOLATION_CODE && /transition/i.test(e.message ?? "");
}

/** Type guard for the synthetic `transition` kind raised by client-side canTransition guard. */
export function detectTransitionReject(err: unknown): err is MoveApplicationError {
  return (
    !!err &&
    typeof err === "object" &&
    "kind" in err &&
    (err as { kind: unknown }).kind === "transition"
  );
}

/**
 * Toast config (UI-locked by UI-SPEC §"Error states (D-05 — LOCKED toast copy)").
 * Returned shape is consumed by `sonner`-style `toast({ title, description, duration })`.
 */
export function getMoveErrorToastConfig(err: MoveApplicationError): {
  title: string;
  description?: string;
  duration?: number;
} {
  switch (err.kind) {
    case "rls":
      return {
        title: "Sem permissão",
        description: "Você não tem permissão pra mover esse candidato.",
        duration: 8000,
      };
    case "network":
      return {
        title: "Sem conexão",
        description: "Tentando de novo automaticamente...",
        duration: 4000,
      };
    case "conflict":
      return {
        title: "Atualizado por outra pessoa",
        description: "O card já foi movido. Recarregando.",
        duration: 5000,
      };
    case "transition":
      return {
        title: "Transição inválida",
        description: `Não é possível mover de "${err.from}" direto para "${err.to}".`,
        duration: 6000,
      };
    case "unknown":
    default:
      return {
        title: "Erro ao mover candidato",
        description: "Tente de novo em alguns segundos.",
        duration: 6000,
      };
  }
}
