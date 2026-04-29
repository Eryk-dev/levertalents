import { Link } from "react-router-dom";
import {
  ArrowRight,
  Calendar,
  Mail,
  MessageSquare,
  Phone,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { Icon, StatusBadge } from "@/components/primitives";
import {
  Btn,
  Chip,
  LinearAvatar,
  Row,
} from "@/components/primitives/LinearKit";
import type {
  ApplicationRow,
  ApplicationStage,
  CandidateRow,
} from "@/integrations/supabase/hiring-types";

export interface CandidateHeaderProps {
  candidate: CandidateRow;
  active: ApplicationRow | null;
  nextStages: ApplicationStage[];
  onAdvance: (next: ApplicationStage) => void;
  onSchedule: () => void;
  onIssueFit: () => void;
  onRefuse: () => void;
  onAnonymize: () => void;
}

/**
 * Top bar (breadcrumb + action buttons) + identity row (avatar + name + status chip + contacts).
 * Renders all action buttons; the page shell owns the underlying state and dialogs.
 */
export function CandidateHeader({
  candidate,
  active,
  nextStages,
  onAdvance,
  onSchedule,
  onIssueFit,
  onRefuse,
  onAnonymize,
}: CandidateHeaderProps) {
  return (
    <div className="px-5 lg:px-7 pt-5 pb-3 border-b border-border">
      <div className="flex items-center justify-between gap-4 mb-2.5">
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-1.5 text-[13px] text-text-muted min-w-0"
        >
          <Link
            to="/hiring/candidates"
            className="inline-flex items-center gap-1.5 hover:text-text transition-colors"
          >
            <Icon name="users" size={13} />
            Candidatos
          </Link>
          <span className="text-text-subtle">/</span>
          <span className="truncate font-medium text-text">
            {candidate.full_name}
          </span>
        </nav>
        <Row gap={6}>
          {active ? (
            <>
              {nextStages.length > 0 ? (
                <Btn
                  variant="primary"
                  size="sm"
                  icon={<ArrowRight className="h-3.5 w-3.5" />}
                  onClick={() => onAdvance(nextStages[0])}
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
                variant="accent"
                size="sm"
                icon={<Sparkles className="h-3.5 w-3.5" />}
                onClick={onIssueFit}
              >
                Fit
              </Btn>
            </>
          ) : null}
          <Btn
            variant="ghost"
            size="sm"
            icon={<MessageSquare className="h-3.5 w-3.5" />}
            onClick={onRefuse}
            disabled={!active}
            className="text-status-red hover:!text-status-red"
          >
            Recusar
          </Btn>
          <Btn
            variant="ghost"
            size="sm"
            icon={<ShieldAlert className="h-3.5 w-3.5" />}
            onClick={onAnonymize}
            className="text-text-muted hover:!text-status-red"
          >
            Anonimizar
          </Btn>
        </Row>
      </div>

      {/* Title row */}
      <Row align="start" gap={12}>
        <LinearAvatar name={candidate.full_name} size={40} />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <h1 className="text-[22px] font-semibold tracking-[-0.02em] m-0 truncate">
              {candidate.full_name}
            </h1>
            {active ? (
              <StatusBadge
                kind="application"
                status={active.stage}
                size="sm"
                showIcon
              />
            ) : null}
            {candidate.anonymized_at ? (
              <Chip color="neutral" size="sm">
                Anonimizado
              </Chip>
            ) : null}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[12.5px] text-text-muted">
            {candidate.email ? (
              <span className="inline-flex items-center gap-1 truncate">
                <Mail className="h-3 w-3 shrink-0" /> {candidate.email}
              </span>
            ) : null}
            {candidate.phone ? (
              <>
                <span className="text-text-subtle">·</span>
                <span className="inline-flex items-center gap-1 truncate">
                  <Phone className="h-3 w-3 shrink-0" /> {candidate.phone}
                </span>
              </>
            ) : null}
            {candidate.source ? (
              <>
                <span className="text-text-subtle">·</span>
                <span>Origem: {candidate.source}</span>
              </>
            ) : null}
          </div>
        </div>
      </Row>
    </div>
  );
}
