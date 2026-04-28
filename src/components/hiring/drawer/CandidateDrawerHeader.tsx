import {
  ArrowRight,
  Calendar,
  Download,
  Mail,
  MessageSquare,
  Phone,
  Sparkles,
  X,
} from "lucide-react";
import { Btn, LinearAvatar, Row } from "@/components/primitives/LinearKit";
import { StatusBadge } from "@/components/primitives";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { APPLICATION_STAGE_LABELS } from "@/lib/hiring/statusMachine";
import type { CandidateRow, ApplicationRow } from "@/integrations/supabase/hiring-types";

interface CandidateDrawerHeaderProps {
  candidate: Pick<CandidateRow, "id" | "full_name" | "email" | "phone" | "cv_storage_path">;
  active: ApplicationRow | null;
  applications: ApplicationRow[];
  hasNextStage: boolean;
  hasCv: boolean;
  onClose: () => void;
  onAdvanceStage: () => void;
  onSchedule: () => void;
  onIssueFit: () => void;
  onDownloadCv: () => void;
  onRefuse: () => void;
  onSelectApplication: (id: string) => void;
}

/**
 * Plan 02-09 Task 1a — Header presentacional do CandidateDrawer.
 * State e callbacks ficam no shell; este componente renderiza:
 *   - Avatar + nome + contato
 *   - Stage badge + (opcional) seletor de aplicação ativa
 *   - Action row: Avançar / Agendar / Fit / CV / Recusar
 *   - Close button (X) — chama `onClose`
 */
export function CandidateDrawerHeader({
  candidate,
  active,
  applications,
  hasNextStage,
  hasCv,
  onClose,
  onAdvanceStage,
  onSchedule,
  onIssueFit,
  onDownloadCv,
  onRefuse,
  onSelectApplication,
}: CandidateDrawerHeaderProps) {
  const contactMeta = [candidate.email, candidate.phone].filter(Boolean).join(" · ");

  return (
    <div className="px-4 py-3.5 border-b border-border">
      <Row align="start" gap={10}>
        <LinearAvatar name={candidate.full_name} size={36} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="text-[15px] font-semibold text-text tracking-[-0.01em] truncate">
                {candidate.full_name}
              </h2>
              {contactMeta ? (
                <div className="mt-0.5 flex flex-wrap gap-2 text-[11.5px] text-text-muted">
                  {candidate.email ? (
                    <span className="inline-flex items-center gap-1 truncate">
                      <Mail className="h-3 w-3 shrink-0" aria-hidden /> {candidate.email}
                    </span>
                  ) : null}
                  {candidate.phone ? (
                    <span className="inline-flex items-center gap-1 truncate">
                      <Phone className="h-3 w-3 shrink-0" aria-hidden /> {candidate.phone}
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              className="rounded p-1 text-text-subtle hover:bg-bg-subtle hover:text-text-muted transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </Row>

      {active ? (
        <>
          <Row gap={6} className="mt-2.5 flex-wrap">
            <StatusBadge kind="application" status={active.stage} size="sm" showIcon />
            {applications.length > 1 ? (
              <Select value={active.id} onValueChange={onSelectApplication}>
                <SelectTrigger className="h-[22px] w-auto px-2 text-[11px] gap-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {applications.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {APPLICATION_STAGE_LABELS[a.stage]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
          </Row>

          <Row gap={6} className="mt-3 flex-wrap">
            {hasNextStage ? (
              <Btn
                variant="primary"
                size="sm"
                icon={<ArrowRight className="h-3.5 w-3.5" />}
                onClick={onAdvanceStage}
              >
                Avançar etapa
              </Btn>
            ) : null}
            <Btn
              variant="secondary"
              size="sm"
              icon={<Calendar className="h-3.5 w-3.5" />}
              onClick={onSchedule}
            >
              Agendar
            </Btn>
            <Btn
              variant="secondary"
              size="sm"
              icon={<Sparkles className="h-3.5 w-3.5" />}
              onClick={onIssueFit}
            >
              Fit
            </Btn>
            {hasCv ? (
              <Btn
                variant="secondary"
                size="sm"
                icon={<Download className="h-3.5 w-3.5" />}
                onClick={onDownloadCv}
              >
                CV
              </Btn>
            ) : null}
            <div className="flex-1" />
            <Btn
              variant="ghost"
              size="sm"
              className="text-status-red hover:!text-status-red"
              icon={<MessageSquare className="h-3.5 w-3.5" />}
              onClick={onRefuse}
            >
              Recusar
            </Btn>
          </Row>
        </>
      ) : null}
    </div>
  );
}
