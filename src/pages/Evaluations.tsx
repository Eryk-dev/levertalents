import { useState } from "react";
import { useEvaluations, Evaluation } from "@/hooks/useEvaluations";
import { EvaluationForm } from "@/components/EvaluationForm";
import { EvaluationCard } from "@/components/EvaluationCard";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, FileText, TrendingUp, CheckCircle2, Filter } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { OneOnOnesTab } from "@/components/OneOnOnesTab";
import { StatusBadge } from "@/components/primitives/StatusBadge";
import { LoadingState } from "@/components/primitives/LoadingState";
import { ScoreDisplay } from "@/components/primitives/ScoreDisplay";
import { Btn, Chip, Row, Col, SectionHeader, LinearEmpty } from "@/components/primitives/LinearKit";
import { cn } from "@/lib/utils";

export default function Evaluations() {
  const [showForm, setShowForm] = useState(false);
  const [selectedEvaluation, setSelectedEvaluation] = useState<Evaluation | null>(null);
  const [activeTab, setActiveTab] = useState<"evaluations" | "1on1s">("evaluations");
  const { evaluations, isLoading } = useEvaluations();

  const { data: userRole } = useQuery({
    queryKey: ["user-role"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();
      return data?.role;
    },
  });

  const { data: currentUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  const isLeader = userRole === "lider";
  const isRHorSocio = userRole === "rh" || userRole === "socio";
  const isCollaborator = userRole === "colaborador";

  const filteredEvaluations = isCollaborator
    ? evaluations.filter((e) => e.evaluated_user_id === currentUser?.id)
    : evaluations;

  const averageScore =
    filteredEvaluations.length > 0
      ? filteredEvaluations.reduce((sum, e) => sum + e.overall_score, 0) / filteredEvaluations.length
      : null;

  const completedCount = filteredEvaluations.filter((e) => e.status === "completed").length;

  const description = isCollaborator
    ? "Acompanhe suas avaliações, 1:1s e seu desenvolvimento ao longo do tempo."
    : isLeader
    ? "Avalie seu time com evidências observáveis e feedback estruturado."
    : "Visão consolidada de avaliações e 1:1s do ciclo atual.";

  return (
    <div className="p-5 lg:p-7 font-sans text-text max-w-[1400px] mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="text-[20px] font-semibold tracking-[-0.02em] m-0">
            Avaliações de desempenho
          </h1>
          <div className="text-[13px] text-text-muted mt-0.5">{description}</div>
        </div>
        <Row gap={6}>
          <Btn variant="ghost" size="sm" icon={<Filter className="w-3.5 h-3.5" />}>
            Filtros
          </Btn>
          {isLeader && (
            <Btn
              variant="primary"
              size="sm"
              icon={<Plus className="w-3.5 h-3.5" strokeWidth={2} />}
              onClick={() => setShowForm(true)}
            >
              Nova avaliação
            </Btn>
          )}
        </Row>
      </div>

      {/* Tabs */}
      <div className="mt-5 border-b border-border flex items-center">
        {[
          { k: "evaluations" as const, label: "Avaliações" },
          { k: "1on1s" as const, label: "1:1s" },
        ].map((t) => (
          <button
            key={t.k}
            onClick={() => setActiveTab(t.k)}
            className={cn(
              "px-3 py-2 text-[12.5px] font-medium cursor-pointer -mb-px border-b-2 transition-colors",
              activeTab === t.k
                ? "text-text border-text"
                : "text-text-muted border-transparent hover:text-text",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "evaluations" ? (
        <div className="mt-4">
          {/* KPIs */}
          <div className="grid grid-cols-3 gap-3">
            <KpiMini label="Total" value={String(filteredEvaluations.length)} icon={<FileText className="w-4 h-4" />} />
            <KpiMini
              label="Score médio"
              value={averageScore != null ? averageScore.toFixed(1) : "—"}
              icon={<TrendingUp className="w-4 h-4" />}
              highlight={averageScore != null}
            />
            <KpiMini label="Concluídas" value={String(completedCount)} icon={<CheckCircle2 className="w-4 h-4" />} />
          </div>

          <SectionHeader title="Lista de avaliações" />
          {isLoading ? (
            <LoadingState variant="skeleton" layout="cards" count={3} />
          ) : filteredEvaluations.length === 0 ? (
            <LinearEmpty
              icon={<FileText className="w-[18px] h-[18px]" strokeWidth={1.75} />}
              title={isLeader ? "Nenhuma avaliação ainda" : "Sem avaliações"}
              description={
                isLeader
                  ? "Crie a primeira avaliação para começar a dar feedback estruturado."
                  : "Quando houver avaliações registradas, elas aparecem aqui."
              }
              actions={
                isLeader ? (
                  <Btn
                    variant="primary"
                    size="sm"
                    icon={<Plus className="w-3.5 h-3.5" strokeWidth={2} />}
                    onClick={() => setShowForm(true)}
                  >
                    Nova avaliação
                  </Btn>
                ) : undefined
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredEvaluations.map((evaluation) => (
                <EvaluationCard
                  key={evaluation.id}
                  evaluation={evaluation}
                  onViewDetails={setSelectedEvaluation}
                  showEvaluatedUser={!isCollaborator}
                  showEvaluator={isCollaborator}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="mt-4">
          <OneOnOnesTab
            isLeader={isLeader}
            isRHorSocio={isRHorSocio}
            isCollaborator={isCollaborator}
            currentUserId={currentUser?.id}
          />
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-[1100px] w-[96vw] max-h-[94vh] p-0 overflow-hidden gap-0">
          <DialogHeader className="sr-only">
            <DialogTitle>Nova avaliação</DialogTitle>
            <DialogDescription>
              Avaliação por competência — 5 níveis com evidência obrigatória.
            </DialogDescription>
          </DialogHeader>
          <EvaluationForm onSuccess={() => setShowForm(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedEvaluation} onOpenChange={() => setSelectedEvaluation(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes da avaliação</DialogTitle>
          </DialogHeader>
          {selectedEvaluation && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-3 p-3.5 bg-bg-subtle rounded-md border border-border">
                <InfoRow label="Avaliado" value={selectedEvaluation.evaluated_user?.full_name} />
                <InfoRow label="Avaliador" value={selectedEvaluation.evaluator_user?.full_name} />
                <InfoRow label="Período" value={selectedEvaluation.period} />
                <div>
                  <div className="text-[10.5px] text-text-subtle uppercase tracking-[0.05em] font-semibold">
                    Status
                  </div>
                  <div className="mt-1">
                    <StatusBadge kind="evaluation" status={selectedEvaluation.status} />
                  </div>
                </div>
              </div>

              <div>
                <SectionHeader title="Pontuações" />
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <ScoreTile label="Geral" score={selectedEvaluation.overall_score} />
                  <ScoreTile label="Técnica" score={selectedEvaluation.technical_score} />
                  <ScoreTile label="Comportamental" score={selectedEvaluation.behavioral_score} />
                  <ScoreTile label="Liderança" score={selectedEvaluation.leadership_score} />
                </div>
              </div>

              <TextBlock title="Pontos fortes" text={selectedEvaluation.strengths} />
              <TextBlock title="Áreas de melhoria" text={selectedEvaluation.areas_for_improvement} />
              <TextBlock title="Comentários gerais" text={selectedEvaluation.comments} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function KpiMini({
  label,
  value,
  icon,
  highlight,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div className={cn("surface-paper p-3.5", highlight && "bg-accent-soft border-accent/20")}>
      <div className="flex items-center justify-between">
        <div
          className={cn(
            "text-[11px] uppercase tracking-[0.05em] font-semibold",
            highlight ? "text-accent-text" : "text-text-subtle",
          )}
        >
          {label}
        </div>
        <span className={cn(highlight ? "text-accent-text" : "text-text-muted")}>{icon}</span>
      </div>
      <div
        className={cn(
          "text-[26px] font-semibold tabular tracking-[-0.02em] mt-1 leading-[1.05]",
          highlight && "text-accent-text",
        )}
      >
        {value}
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <div className="text-[10.5px] text-text-subtle uppercase tracking-[0.05em] font-semibold">
        {label}
      </div>
      <div className="text-[13px] font-medium mt-1">{value || "—"}</div>
    </div>
  );
}

function ScoreTile({ label, score }: { label: string; score: number }) {
  return (
    <div className="surface-paper p-3.5">
      <div className="text-[10.5px] text-text-subtle uppercase tracking-[0.05em] font-semibold">
        {label}
      </div>
      <div className="mt-1.5">
        <ScoreDisplay score={score} variant="inline" size="lg" />
      </div>
    </div>
  );
}

function TextBlock({ title, text }: { title: string; text?: string | null }) {
  if (!text) return null;
  return (
    <div>
      <h3 className="text-[13px] font-semibold mb-1.5">{title}</h3>
      <p className="text-[13px] whitespace-pre-wrap text-text-muted leading-relaxed">{text}</p>
    </div>
  );
}
