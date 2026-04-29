import { Link } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { Icon, StatusBadge } from "@/components/primitives";
import { Chip, LinearEmpty } from "@/components/primitives/LinearKit";
import { BackgroundCheckUploader } from "@/components/hiring/BackgroundCheckUploader";
import type {
  ApplicationRow,
  CandidateRow,
} from "@/integrations/supabase/hiring-types";
import { SectionTitle, PropertyRow } from "./_primitives";

export interface CandidateAuditSectionProps {
  candidate: CandidateRow;
  active: ApplicationRow | null;
  job: { id: string; company_id: string; title?: string } | null;
}

/**
 * Background check uploader (LGPD audit surface).
 * Renderiza apenas a seção "Antecedentes" — o controle de anonimização é exposto
 * no header (CandidateHeader.onAnonymize) e o status de anonimização aparece no
 * right rail (CandidateRightRail).
 */
export function CandidateAuditSection({
  candidate,
  active,
  job,
}: CandidateAuditSectionProps) {
  return (
    <section id="antecedentes" className="scroll-mt-5 space-y-3">
      <SectionTitle icon={<ShieldCheck className="h-3.5 w-3.5" />}>
        Antecedentes
      </SectionTitle>
      {active && job ? (
        <BackgroundCheckUploader
          applicationId={active.id}
          candidateId={candidate.id}
          companyId={job.company_id}
          jobOpeningId={job.id}
        />
      ) : (
        <LinearEmpty
          icon={<ShieldCheck className="w-[18px] h-[18px]" />}
          title="Sem aplicação ativa"
          description="Sem uma aplicação, não é possível enviar antecedentes."
        />
      )}
    </section>
  );
}

export interface CandidateRightRailProps {
  candidate: Pick<
    CandidateRow,
    "id" | "document_type" | "document_number" | "source" | "anonymized_at"
  >;
  applications: ApplicationRow[];
  active: ApplicationRow | null;
  job: { id: string; title?: string } | null;
  fitDone: boolean;
  onPickApplication: (id: string) => void;
}

/**
 * Right rail (Linear-style "Properties" panel): vaga atual, stage, fit, documento,
 * status de anonimização, e lista de outras aplicações do candidato.
 *
 * Co-locado com CandidateAuditSection porque o painel surfaces dados de auditoria
 * (origem, documento, anonymized_at) — pertence ao mesmo recorte de "trilha".
 */
export function CandidateRightRail({
  candidate,
  applications,
  active,
  job,
  fitDone,
  onPickApplication,
}: CandidateRightRailProps) {
  const otherApps = applications.filter((a) => a.id !== active?.id);
  return (
    <div className="px-4 py-4 space-y-1">
      <div className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-text-subtle mb-2">
        Propriedades
      </div>

      <PropertyRow label="Vaga atual">
        {job ? (
          <Link
            to={`/hiring/jobs/${job.id}`}
            className="inline-flex items-center gap-1 text-accent-text hover:underline min-w-0 truncate"
          >
            <Icon name="briefcase" size={12} className="shrink-0" />
            <span className="truncate">{job.title ?? "Abrir vaga"}</span>
          </Link>
        ) : (
          <span className="text-text-muted">—</span>
        )}
      </PropertyRow>

      <PropertyRow label="Stage atual">
        {active ? (
          <StatusBadge kind="application" status={active.stage} size="sm" />
        ) : (
          <span className="text-text-muted">—</span>
        )}
      </PropertyRow>

      <PropertyRow label="Aplicou em">
        {active ? (
          <span className="tabular-nums">
            {new Date(active.created_at).toLocaleDateString("pt-BR")}
          </span>
        ) : (
          <span className="text-text-muted">—</span>
        )}
      </PropertyRow>

      <PropertyRow label="Origem">
        <span>{candidate.source ?? "—"}</span>
      </PropertyRow>

      <PropertyRow label="Fit cultural">
        {fitDone ? (
          <Chip color="green" size="sm">
            Concluído
          </Chip>
        ) : active ? (
          <Chip color="neutral" size="sm">
            Pendente
          </Chip>
        ) : (
          <span className="text-text-muted">—</span>
        )}
      </PropertyRow>

      <PropertyRow label="Documento">
        <span className="truncate">
          {candidate.document_type?.toUpperCase() ?? "—"}
          {candidate.document_number ? ` · ${candidate.document_number}` : ""}
        </span>
      </PropertyRow>

      {candidate.anonymized_at ? (
        <PropertyRow label="Anonimizado em">
          <span className="tabular-nums">
            {new Date(candidate.anonymized_at).toLocaleDateString("pt-BR")}
          </span>
        </PropertyRow>
      ) : null}

      {otherApps.length > 0 ? (
        <div className="pt-3 mt-2 border-t border-border">
          <div className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-text-subtle mb-1.5">
            Outras aplicações
          </div>
          <div className="flex flex-col gap-1">
            {otherApps.map((a) => (
              <button
                key={a.id}
                onClick={() => onPickApplication(a.id)}
                className="flex items-center justify-between gap-2 w-full text-left rounded px-2 py-1 hover:bg-bg-subtle transition-colors"
              >
                <span className="text-[12px] text-text truncate">
                  Vaga {a.job_opening_id.slice(0, 8)}…
                </span>
                <StatusBadge kind="application" status={a.stage} size="sm" />
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
