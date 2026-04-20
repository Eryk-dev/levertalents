import { useState } from "react";
import { ClimateSurveyFormDialog } from "@/components/ClimateSurveyFormDialog";
import { ClimateQuestionsDialog } from "@/components/ClimateQuestionsDialog";
import { ClimateAnswerDialog } from "@/components/ClimateAnswerDialog";
import { useClimateSurveys, ClimateSurvey } from "@/hooks/useClimateSurveys";
import { useClimateOverview } from "@/hooks/useClimateOverview";
import { useAuth } from "@/hooks/useAuth";
import { Calendar, Plus, ListChecks, MessageSquare, Users, TrendingUp, Download, Bell, Filter } from "lucide-react";
import { StatusBadge } from "@/components/primitives/StatusBadge";
import { ScoreDisplay } from "@/components/primitives/ScoreDisplay";
import {
  Btn,
  Chip,
  Row,
  SectionHeader,
  LinearEmpty,
} from "@/components/primitives/LinearKit";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type DialogTarget = { survey: ClimateSurvey } | null;

export default function Climate() {
  const { surveys } = useClimateSurveys();
  const { data: overview } = useClimateOverview();
  const { userRole } = useAuth();

  const canManage = userRole === "rh" || userRole === "socio" || userRole === "admin";

  const [createOpen, setCreateOpen] = useState(false);
  const [manageTarget, setManageTarget] = useState<DialogTarget>(null);
  const [answerTarget, setAnswerTarget] = useState<DialogTarget>(null);

  const activeSurveys = surveys.filter((s) => s.status === "active");

  return (
    <div className="p-5 lg:p-7 font-sans text-text max-w-[1400px] mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="text-[20px] font-semibold tracking-[-0.02em] m-0">
            Clima · {overview?.survey?.title || "Sem pesquisa ativa"}
          </h1>
          <div className="text-[13px] text-text-muted mt-0.5">
            {overview?.distinctRespondents != null && overview?.totalEligible
              ? `${overview.distinctRespondents} de ${overview.totalEligible} respondentes · ${Math.round((overview.participationRate ?? 0) * 100)}% participação`
              : "Configure uma pesquisa para começar a medir o clima"}
          </div>
        </div>
        <Row gap={6}>
          {canManage && (
            <>
              <Btn variant="secondary" size="sm" icon={<Download className="w-3.5 h-3.5" />}>
                Exportar
              </Btn>
              <Btn variant="secondary" size="sm" icon={<Bell className="w-3.5 h-3.5" />}>
                Lembrar pendentes
              </Btn>
              <Btn
                variant="primary"
                size="sm"
                icon={<Plus className="w-3.5 h-3.5" strokeWidth={2} />}
                onClick={() => setCreateOpen(true)}
              >
                Nova pesquisa
              </Btn>
            </>
          )}
        </Row>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
        <KpiTile
          label="Pesquisas ativas"
          value={String(activeSurveys.length)}
          detail={activeSurveys.length ? "em andamento" : "nenhuma ativa"}
          icon={<Calendar className="w-4 h-4" />}
          highlight={activeSurveys.length > 0}
        />
        <KpiTile
          label="Score médio"
          value={overview?.avgScore != null ? overview.avgScore.toFixed(1) : "—"}
          detail={overview?.survey?.title || "sem pesquisa"}
          icon={<TrendingUp className="w-4 h-4" />}
          delta={overview?.avgScore && overview.avgScore >= 4 ? "good" : undefined}
        />
        <KpiTile
          label="Participação"
          value={overview?.participationRate != null ? `${Math.round(overview.participationRate * 100)}%` : "—"}
          detail={overview?.distinctRespondents != null ? `${overview.distinctRespondents} respostas` : "—"}
          icon={<Users className="w-4 h-4" />}
        />
        <KpiTile
          label="Respostas"
          value={String(overview?.totalResponses ?? 0)}
          detail={overview?.totalQuestions ? `${overview.totalQuestions} perguntas` : "—"}
          icon={<MessageSquare className="w-4 h-4" />}
        />
      </div>

      {/* Surveys */}
      <SectionHeader
        title="Pesquisas"
        right={<span className="text-[11.5px] text-text-subtle tabular">{surveys.length} total</span>}
      />
      {surveys.length === 0 ? (
        <LinearEmpty
          icon={<Calendar className="w-[18px] h-[18px]" strokeWidth={1.75} />}
          title="Nenhuma pesquisa criada"
          description={
            canManage
              ? "Crie a primeira pesquisa para começar a medir o clima da organização."
              : "Quando uma pesquisa estiver ativa, você poderá respondê-la aqui."
          }
          actions={
            canManage ? (
              <Btn
                variant="primary"
                size="sm"
                icon={<Plus className="w-3.5 h-3.5" strokeWidth={2} />}
                onClick={() => setCreateOpen(true)}
              >
                Nova pesquisa
              </Btn>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {surveys.map((survey) => (
            <div key={survey.id} className="surface-paper p-3.5">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-semibold leading-tight text-text tracking-[-0.01em] line-clamp-2">
                    {survey.title}
                  </div>
                  {survey.description && (
                    <div className="text-[11.5px] text-text-muted mt-1 line-clamp-2">
                      {survey.description}
                    </div>
                  )}
                </div>
                <StatusBadge kind="survey" status={survey.status} size="sm" />
              </div>
              <div className="text-[11.5px] text-text-subtle mt-2">
                {format(new Date(survey.start_date), "dd MMM", { locale: ptBR })} –{" "}
                {format(new Date(survey.end_date), "dd MMM yyyy", { locale: ptBR })}
              </div>
              <Row gap={6} className="mt-3" wrap>
                {canManage && (
                  <Btn
                    variant="secondary"
                    size="sm"
                    icon={<ListChecks className="w-3.5 h-3.5" strokeWidth={1.75} />}
                    onClick={() => setManageTarget({ survey })}
                  >
                    Perguntas
                  </Btn>
                )}
                {survey.status === "active" && (
                  <Btn variant="primary" size="sm" onClick={() => setAnswerTarget({ survey })}>
                    Responder
                  </Btn>
                )}
              </Row>
            </div>
          ))}
        </div>
      )}

      <ClimateSurveyFormDialog open={createOpen} onOpenChange={setCreateOpen} />
      <ClimateQuestionsDialog
        open={!!manageTarget}
        onOpenChange={(v) => !v && setManageTarget(null)}
        surveyId={manageTarget?.survey.id}
        surveyTitle={manageTarget?.survey.title}
      />
      <ClimateAnswerDialog
        open={!!answerTarget}
        onOpenChange={(v) => !v && setAnswerTarget(null)}
        surveyId={answerTarget?.survey.id}
        surveyTitle={answerTarget?.survey.title}
      />
    </div>
  );
}

function KpiTile({
  label,
  value,
  detail,
  icon,
  delta,
  highlight,
}: {
  label: string;
  value: string;
  detail: string;
  icon: React.ReactNode;
  delta?: "good" | "bad";
  highlight?: boolean;
}) {
  return (
    <div className={`surface-paper p-3.5 ${highlight ? "bg-accent-soft border-accent/20" : ""}`}>
      <div className="flex items-center justify-between">
        <div
          className={`text-[11px] uppercase tracking-[0.05em] font-semibold ${
            highlight ? "text-accent-text" : "text-text-subtle"
          }`}
        >
          {label}
        </div>
        <span className={highlight ? "text-accent-text" : "text-text-muted"}>{icon}</span>
      </div>
      <div
        className={`text-[26px] font-semibold tabular tracking-[-0.02em] mt-1 leading-[1.05] ${
          highlight ? "text-accent-text" : ""
        }`}
      >
        {value}
      </div>
      <div
        className={`text-[11.5px] mt-1 ${
          delta === "good" ? "text-status-green" : delta === "bad" ? "text-status-red" : "text-text-muted"
        }`}
      >
        {detail}
      </div>
    </div>
  );
}
