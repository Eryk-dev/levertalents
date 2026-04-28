import { ShieldAlert } from "lucide-react";
import { LinearAvatar } from "@/components/primitives/LinearKit";
import { useDataAccessLog } from "@/hooks/hiring/useDataAccessLog";
import type { DataAccessLogEntry } from "@/integrations/supabase/hiring-types";

interface AuditLogPanelProps {
  candidateId: string;
}

/**
 * Plan 02-09 Task 4 — Lista últimas 50 entradas de `data_access_log` para
 * o candidato (TAL-05 / TAL-07). Visível RH/admin (gating duplo: tab via
 * useAuth role check + RLS policy server-side em data_access_log).
 *
 * Cada row mostra:
 *   - actor_id (truncado — sem PII per CLAUDE.md; futura Phase 4 vai resolver
 *     pra nome via JOIN)
 *   - action (view | update | optimistic_conflict)
 *   - context (e.g. "drawer", "export")
 *   - timestamp
 */
export function AuditLogPanel({ candidateId }: AuditLogPanelProps) {
  const { data: entries = [], isLoading } = useDataAccessLog(
    "candidate",
    candidateId,
    50,
  );

  if (isLoading) {
    return (
      <div className="text-[12.5px] text-text-muted px-1 py-2">
        Carregando histórico de acessos...
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <header className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-text-subtle">
        <ShieldAlert className="h-3 w-3" aria-hidden />
        RH visível · auditoria LGPD
      </header>

      {entries.length === 0 ? (
        <div className="text-[13px] text-text-muted">
          <p>Nenhuma leitura registrada ainda.</p>
          <p className="mt-1 text-[11.5px] text-text-subtle">
            Toda vez que alguém abrir esse perfil ou exportar dados, fica
            registrado aqui (LGPD §37 — direito à transparência).
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {entries.map((e: DataAccessLogEntry) => (
            <li
              key={e.id}
              className="flex items-start gap-2 rounded-md border border-border bg-bg-subtle p-2.5"
            >
              <LinearAvatar
                name={e.actor_id?.slice(0, 2).toUpperCase() ?? "?"}
                size={24}
              />
              <div className="flex-1 min-w-0">
                <div className="text-[12.5px]">
                  <span className="font-medium tabular-nums">
                    {e.actor_id ? e.actor_id.slice(0, 8) : "—"}
                  </span>{" "}
                  <span className="text-text-muted">
                    {actionLabel(e.action)}
                  </span>
                  {e.context ? (
                    <span className="text-text-muted"> · {e.context}</span>
                  ) : null}
                </div>
                <div className="text-[11px] text-text-subtle tabular-nums mt-0.5">
                  {e.at
                    ? new Date(e.at).toLocaleString("pt-BR", {
                        timeZone: "America/Sao_Paulo",
                      })
                    : "—"}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function actionLabel(action: string | null | undefined): string {
  switch (action) {
    case "view":
      return "leu PII";
    case "update":
      return "atualizou";
    case "optimistic_conflict":
      return "conflito otimista";
    default:
      return action ?? "—";
  }
}
