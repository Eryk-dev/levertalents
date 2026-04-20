import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useParams, useNavigate } from "react-router-dom";
import {
  Phone,
  Calendar,
  Briefcase,
  FileText,
  Target,
  type LucideIcon,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { LoadingState } from "@/components/primitives/LoadingState";
import {
  Btn,
  Row,
  Chip,
  SectionHeader,
  LinearAvatar,
  LinearEmpty,
} from "@/components/primitives/LinearKit";
import { EvaluationCard } from "@/components/EvaluationCard";
import { PDIReviewCard } from "@/components/PDIReviewCard";
import { useAuth } from "@/hooks/useAuth";

type TabKey = "overview" | "evaluations" | "pdis" | "onones";

const TAB_LABELS: Record<TabKey, string> = {
  overview: "Visão geral",
  evaluations: "Avaliações",
  pdis: "PDIs",
  onones: "1:1s",
};

export default function CollaboratorProfile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { userRole } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>("overview");

  const canManage =
    userRole === "admin" || userRole === "rh" || userRole === "socio" || userRole === "lider";

  const { data: collaborator, isLoading } = useQuery({
    queryKey: ["collaborator-profile", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      return data;
    },
  });

  const { data: teamMember } = useQuery({
    queryKey: ["team-member-info", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("team_members")
        .select("*, team:teams(id, name, company:companies(id, name))")
        .eq("user_id", userId)
        .maybeSingle();

      return data;
    },
  });

  const { data: leaderProfile } = useQuery({
    queryKey: ["collaborator-leader", teamMember?.leader_id],
    enabled: !!teamMember?.leader_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("id", teamMember!.leader_id)
        .maybeSingle();
      return data;
    },
  });

  const { data: evaluations } = useQuery({
    queryKey: ["collaborator-evaluations", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("evaluations")
        .select(`
          *,
          evaluator_user:profiles!evaluations_evaluator_user_id_fkey(id, full_name, avatar_url)
        `)
        .eq("evaluated_user_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Erro ao buscar avaliações:", error);
      }
      return data || [];
    },
  });

  const { data: plans } = useQuery({
    queryKey: ["collaborator-pdis", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("development_plans")
        .select(`
          *,
          approver:profiles!development_plans_approved_by_fkey(id, full_name, avatar_url)
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      return data || [];
    },
  });

  const { data: oneOnOnes } = useQuery({
    queryKey: ["collaborator-11s", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("one_on_ones")
        .select(`
          *,
          leader:profiles!one_on_ones_leader_id_fkey(id, full_name, avatar_url)
        `)
        .eq("collaborator_id", userId)
        .order("scheduled_date", { ascending: false });

      if (error) {
        console.error("Erro ao buscar 1:1s:", error);
      }
      return data || [];
    },
  });

  const averageScore =
    evaluations && evaluations.length > 0
      ? (
          evaluations.reduce((sum: number, e: any) => sum + e.overall_score, 0) /
          evaluations.length
        ).toFixed(1)
      : "—";

  const activePdis =
    plans?.filter((p: any) => p.status === "in_progress" || p.status === "approved").length || 0;
  const completed11s = oneOnOnes?.filter((o: any) => o.status === "completed").length || 0;

  if (isLoading) {
    return (
      <div className="p-5 lg:p-7">
        <LoadingState variant="spinner" message="Carregando perfil…" />
      </div>
    );
  }

  const displayName = collaborator?.full_name || "Colaborador";
  const position = teamMember?.position || "Colaborador";
  const leaderName = leaderProfile?.full_name;
  const hireDate = collaborator?.hire_date
    ? format(new Date(collaborator.hire_date), "MMM/yyyy", { locale: ptBR })
    : null;

  return (
    <div className="p-5 lg:p-7 font-sans text-text max-w-[1200px] mx-auto animate-fade-in">
      {/* Hero */}
      <div className="flex items-start gap-5 border-b border-border pb-5">
        <LinearAvatar name={displayName} size={64} />
        <div className="flex-1 min-w-0">
          <Row gap={8}>
            <h1 className="text-[20px] font-semibold tracking-[-0.02em] m-0">{displayName}</h1>
            <Chip color="green" size="sm">Ativo</Chip>
          </Row>
          <div className="text-[13px] text-text-muted mt-0.5">
            {position}
            {leaderName && <> · reporta a {leaderName}</>}
            {hireDate && <> · desde {hireDate}</>}
          </div>
          <Row gap={16} className="mt-2.5 text-[12px] text-text-muted" wrap>
            {collaborator?.department && (
              <span>
                <Briefcase className="inline w-3 h-3 mr-1 -mt-0.5" strokeWidth={1.75} />
                {collaborator.department}
              </span>
            )}
            {collaborator?.phone && (
              <span>
                <Phone className="inline w-3 h-3 mr-1 -mt-0.5" strokeWidth={1.75} />
                {collaborator.phone}
              </span>
            )}
            {teamMember?.team?.name && (
              <span>· time {teamMember.team.name}</span>
            )}
          </Row>
        </div>
        {canManage && (
          <Row gap={6} wrap justify="end">
            <Btn variant="ghost" size="sm" onClick={() => navigate("/avaliacoes")}>
              Atribuir avaliação
            </Btn>
            <Btn variant="ghost" size="sm" onClick={() => navigate("/desenvolvimento")}>
              Criar PDI
            </Btn>
            <Btn variant="ghost" size="sm" onClick={() => navigate("/11s")}>
              Marcar 1:1
            </Btn>
          </Row>
        )}
      </div>

      {/* Tabs — underline manual */}
      <div className="mt-4 border-b border-border flex items-center -mb-px">
        {(Object.keys(TAB_LABELS) as TabKey[]).map((key) => {
          const active = activeTab === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={`px-3.5 py-2.5 text-[13px] cursor-pointer border-b-2 transition-colors -mb-px ${
                active
                  ? "text-text font-semibold border-accent"
                  : "text-text-muted font-medium border-transparent hover:text-text"
              }`}
            >
              {TAB_LABELS[key]}
            </button>
          );
        })}
      </div>

      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5 mt-5">
          <div>
            <SectionHeader title="Dados pessoais" />
            <div className="surface-paper p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                <InfoRow icon={Phone} label="Telefone" value={collaborator?.phone} />
                <InfoRow icon={Briefcase} label="Departamento" value={collaborator?.department} />
                <InfoRow
                  icon={Calendar}
                  label="Admissão"
                  value={
                    collaborator?.hire_date
                      ? format(new Date(collaborator.hire_date), "dd 'de' MMMM, yyyy", { locale: ptBR })
                      : undefined
                  }
                />
              </div>
            </div>

            {collaborator?.bio && (
              <>
                <SectionHeader title="Sobre" />
                <div className="surface-paper p-4">
                  <p className="text-[13.5px] text-text leading-relaxed whitespace-pre-wrap">
                    {collaborator.bio}
                  </p>
                </div>
              </>
            )}
          </div>

          <div>
            <SectionHeader title="Resumo" />
            <div className="surface-paper">
              {[
                ["Cargo", position],
                ["Time", teamMember?.team?.name || "—"],
                ["Empresa", teamMember?.team?.company?.name || "—"],
                ["Gestor", leaderName || "—"],
                ["Média de avaliações", averageScore],
                ["PDIs ativos", String(activePdis)],
                ["1:1s realizadas", String(completed11s)],
              ].map(([k, v], i, arr) => (
                <div
                  key={k as string}
                  className={`flex items-baseline justify-between px-3 py-2 text-[12.5px] ${
                    i < arr.length - 1 ? "border-b border-border" : ""
                  }`}
                >
                  <span className="text-text-muted">{k}</span>
                  <span className="font-medium truncate max-w-[60%] text-right">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "evaluations" && (
        <div className="mt-5">
          <SectionHeader title="Avaliações" />
          {evaluations && evaluations.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {evaluations.map((evaluation: any) => (
                <EvaluationCard
                  key={evaluation.id}
                  evaluation={evaluation}
                  onViewDetails={() => {}}
                  showEvaluator={true}
                />
              ))}
            </div>
          ) : (
            <LinearEmpty
              icon={<FileText className="w-[18px] h-[18px]" strokeWidth={1.75} />}
              title="Sem avaliações"
              description="As avaliações de performance desta pessoa aparecem aqui."
            />
          )}
        </div>
      )}

      {activeTab === "pdis" && (
        <div className="mt-5">
          <SectionHeader title="Planos de desenvolvimento" />
          {plans && plans.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {plans.map((plan: any) => (
                <PDIReviewCard key={plan.id} pdi={plan} onViewDetails={() => navigate("/pdi")} />
              ))}
            </div>
          ) : (
            <LinearEmpty
              icon={<Target className="w-[18px] h-[18px]" strokeWidth={1.75} />}
              title="Sem PDIs"
              description="Os planos de desenvolvimento desta pessoa aparecem aqui."
            />
          )}
        </div>
      )}

      {activeTab === "onones" && (
        <div className="mt-5">
          <SectionHeader title="Reuniões 1:1" />
          {oneOnOnes && oneOnOnes.length > 0 ? (
            <div className="surface-paper overflow-hidden">
              {oneOnOnes.map((meeting: any, i: number) => (
                <div
                  key={meeting.id}
                  className={`grid grid-cols-[1fr_auto_auto] gap-4 items-center px-3.5 py-2.5 text-[13px] ${
                    i < oneOnOnes.length - 1 ? "border-b border-border" : ""
                  }`}
                >
                  <div>
                    <div className="font-medium">
                      {meeting.scheduled_date
                        ? format(new Date(meeting.scheduled_date), "dd 'de' MMMM yyyy", { locale: ptBR })
                        : "Sem data"}
                    </div>
                    <div className="text-[11.5px] text-text-subtle mt-0.5">
                      {meeting.leader?.full_name ? `com ${meeting.leader.full_name}` : "líder —"}
                      {meeting.duration_minutes ? ` · ${meeting.duration_minutes} min` : ""}
                    </div>
                  </div>
                  <Chip
                    color={
                      meeting.status === "completed"
                        ? "green"
                        : meeting.status === "scheduled"
                        ? "blue"
                        : "neutral"
                    }
                    size="sm"
                  >
                    {meeting.status === "completed"
                      ? "Concluída"
                      : meeting.status === "scheduled"
                      ? "Agendada"
                      : meeting.status || "—"}
                  </Chip>
                  <div />
                </div>
              ))}
            </div>
          ) : (
            <LinearEmpty
              icon={<Calendar className="w-[18px] h-[18px]" strokeWidth={1.75} />}
              title="Sem 1:1s"
              description="As reuniões 1:1 realizadas com esta pessoa aparecem aqui."
            />
          )}
        </div>
      )}
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value?: string | null;
}) {
  const hasValue = !!value;
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="w-3.5 h-3.5 text-text-muted mt-0.5 shrink-0" strokeWidth={1.75} />
      <div className="min-w-0 flex-1">
        <div className="text-[10.5px] uppercase tracking-[0.06em] text-text-subtle font-semibold">
          {label}
        </div>
        <div
          className={
            hasValue
              ? "mt-0.5 text-[13px] text-text truncate"
              : "mt-0.5 text-[12.5px] text-text-subtle italic"
          }
        >
          {value || "Não informado"}
        </div>
      </div>
    </div>
  );
}
