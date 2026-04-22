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
