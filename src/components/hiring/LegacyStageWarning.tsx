import { useState } from "react";
import { AlertCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLegacyStageCount } from "@/hooks/hiring/useLegacyStageCount";

const SESSION_KEY = "leverup:rs:legacy-warning-dismissed";

interface LegacyStageWarningProps {
  jobId?: string;
}

/**
 * Phase 2 Plan 02-07 — banner sessão alertando RH sobre candidatos com
 * `metadata.legacy_marker` (residual da Migration F.1 backfill).
 *
 * Auto-dismiss em 2 cenários:
 *  1. Usuário clica no X (persiste em sessionStorage durante a sessão).
 *  2. `legacyCount === 0` — após cutover completo o componente nunca renderiza.
 *
 * CLAUDE.md compliance: `supabase.from()` vive em `useLegacyStageCount`
 * (src/hooks/), NÃO inline neste componente.
 */
export function LegacyStageWarning({ jobId }: LegacyStageWarningProps) {
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(SESSION_KEY) === "true";
    } catch {
      return false;
    }
  });

  const { data: legacyCount = 0 } = useLegacyStageCount(jobId);

  if (dismissed || legacyCount === 0) return null;

  const handleDismiss = () => {
    try {
      sessionStorage.setItem(SESSION_KEY, "true");
    } catch {
      // sessionStorage indisponível — apenas atualizamos state em memória.
    }
    setDismissed(true);
  };

  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-md border border-status-amber/30",
        "bg-status-amber-soft/50 px-3 py-2 text-[13px]",
      )}
      role="status"
    >
      <AlertCircle
        className="w-4 h-4 mt-0.5 text-status-amber shrink-0"
        aria-hidden
      />
      <div className="flex-1">
        <span className="font-medium">
          {legacyCount} candidato(s) normalizado(s) recentemente.
        </span>{" "}
        <span className="text-text-muted">
          Esses cards estavam em etapas legadas e foram migrados para Triagem
          com tag de auditoria.
        </span>
      </div>
      <button
        type="button"
        onClick={handleDismiss}
        className="text-text-muted hover:text-text shrink-0"
        aria-label="Fechar aviso"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
