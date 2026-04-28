import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useActiveConsents } from "@/hooks/hiring/useCandidateConsents";
import { RevokeConsentDialog } from "./RevokeConsentDialog";
import type { ConsentPurpose } from "@/integrations/supabase/hiring-types";

const PURPOSE_LABELS: Record<ConsentPurpose, string> = {
  aplicar_a_esta_vaga: "Candidatura desta vaga",
  incluir_no_banco_de_talentos_global: "Banco de Talentos global",
  compartilhar_com_cliente_externo: "Compartilhar com clientes externos",
  manter_cv_pos_recusa: "Manter CV pós-recusa",
  considerar_outras_vagas_lever: "Outras vagas Lever",
  considerar_vagas_grupo_lever: "Vagas Grupo Lever",
};

interface ConsentListProps {
  candidateId: string;
  candidateName: string;
}

/**
 * Plan 02-09 Task 2 — Lista active_candidate_consents do candidato com botão
 * "Revogar" (RH em nome do candidato). Acionado abre RevokeConsentDialog
 * (UI-SPEC §"Destructive actions" copy).
 *
 * Renderizado dentro do drawer (PerfilTabContent ou seção dedicada). Hook
 * useActiveConsents (Plan 06) já filtra revoked + expired via view.
 */
export function ConsentList({ candidateId, candidateName }: ConsentListProps) {
  const { data: consents = [], isLoading } = useActiveConsents(candidateId);
  const [revokeId, setRevokeId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <p className="text-[13px] text-text-muted">Carregando consentimentos...</p>
    );
  }

  if (consents.length === 0) {
    return (
      <p className="text-[13px] text-text-muted">
        Nenhum consentimento ativo. Esse candidato só aparece em vagas onde se
        aplicou diretamente.
      </p>
    );
  }

  return (
    <>
      <ul className="flex flex-col gap-2">
        {consents.map((c) => {
          const purposeLabel = c.purpose
            ? PURPOSE_LABELS[c.purpose] ?? c.purpose
            : "Finalidade não informada";
          return (
            <li
              key={c.id ?? `${c.candidate_id}-${c.purpose}`}
              className="flex items-start justify-between gap-3 rounded-md border border-border bg-bg-subtle p-2.5"
            >
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium">{purposeLabel}</div>
                <div className="text-[11px] text-text-muted">
                  {c.granted_at ? (
                    <>
                      Concedido em{" "}
                      {new Date(c.granted_at).toLocaleDateString("pt-BR")}
                    </>
                  ) : (
                    <>Concedido</>
                  )}
                  {c.expires_at ? (
                    <>
                      {" · expira em "}
                      {new Date(c.expires_at).toLocaleDateString("pt-BR")}
                    </>
                  ) : null}
                  {c.legal_basis ? <> · base legal: {c.legal_basis}</> : null}
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-status-red hover:!text-status-red h-7 px-2"
                onClick={() => c.id && setRevokeId(c.id)}
                aria-label={`Revogar ${purposeLabel}`}
                disabled={!c.id}
              >
                <Trash2 className="h-3 w-3 mr-1" /> Revogar
              </Button>
            </li>
          );
        })}
      </ul>
      {revokeId ? (
        <RevokeConsentDialog
          open={!!revokeId}
          onOpenChange={(open) => !open && setRevokeId(null)}
          consentId={revokeId}
          candidateId={candidateId}
          candidateName={candidateName}
        />
      ) : null}
    </>
  );
}
