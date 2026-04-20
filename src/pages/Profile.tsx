import { useState, useEffect } from "react";
import { LoadingState } from "@/components/primitives/LoadingState";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { User, Mail, Phone, Calendar, Briefcase, Pencil, FileText, Target } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Btn,
  Row,
  Chip,
  SectionHeader,
  LinearAvatar,
  LinearEmpty,
} from "@/components/primitives/LinearKit";

const roleLabels: Record<string, string> = {
  admin: "Administrador",
  socio: "Sócio",
  rh: "Recursos Humanos",
  lider: "Líder",
  colaborador: "Colaborador",
};

type TabKey = "overview" | "career" | "evaluations" | "pdis" | "onones" | "docs";

const TAB_LABELS: Record<TabKey, string> = {
  overview: "Visão geral",
  career: "Carreira",
  evaluations: "Avaliações",
  pdis: "PDIs",
  onones: "1:1s",
  docs: "Documentos",
};

export default function Profile() {
  const queryClient = useQueryClient();
  const { user, userRole } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("overview");

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      return { ...data, email: user.email };
    },
  });

  // Team / leader / company context (optional, graceful fallback)
  const { data: teamContext } = useQuery({
    queryKey: ["profile-team-context", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data: member } = await supabase
        .from("team_members")
        .select("team_id, leader_id, position")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (!member) return null;
      const [team, leader] = await Promise.all([
        member.team_id
          ? supabase.from("teams").select("id, name, company:companies(id, name)").eq("id", member.team_id).maybeSingle()
          : Promise.resolve({ data: null }),
        member.leader_id
          ? supabase.from("profiles").select("id, full_name").eq("id", member.leader_id).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      return { member, team: team?.data, leader: leader?.data };
    },
  });

  // PDIs: counts + list
  const { data: plans = [] } = useQuery<any[]>({
    queryKey: ["profile-pdis", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("development_plans")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  // Last 1:1 + list
  const { data: oneOnOnes = [] } = useQuery<any[]>({
    queryKey: ["profile-11s", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("one_on_ones")
        .select("*, leader:profiles!one_on_ones_leader_id_fkey(id, full_name)")
        .eq("collaborator_id", user!.id)
        .order("scheduled_date", { ascending: false });
      return data || [];
    },
  });

  // Evaluations list
  const { data: evaluations = [] } = useQuery<any[]>({
    queryKey: ["profile-evaluations", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("evaluations")
        .select("*, evaluator_user:profiles!evaluations_evaluator_user_id_fkey(id, full_name)")
        .eq("evaluated_user_id", user!.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    department: "",
    bio: "",
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || "",
        phone: profile.phone || "",
        department: profile.department || "",
        bio: profile.bio || "",
      });
    }
  }, [profile]);

  const updateProfile = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("profiles")
        .update(data)
        .eq("id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Perfil atualizado.");
      setIsEditing(false);
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar perfil: ${error.message}`);
    },
  });

  if (isLoading) {
    return (
      <div className="p-5 lg:p-7">
        <LoadingState variant="spinner" message="Carregando perfil…" />
      </div>
    );
  }

  const roleLabel = roleLabels[userRole || "colaborador"] || "Colaborador";
  const displayName = profile?.full_name || profile?.email?.split("@")[0] || "—";

  // Computed summary values — graceful fallback for schema gaps.
  // TODO: schema does not currently persist senioridade / nivel_salarial on profiles.
  const pdisAtivos = plans.filter((p) => p.status === "in_progress" || p.status === "approved").length;
  const pdisConcluidos = plans.filter((p) => p.status === "completed").length;
  const last11 = oneOnOnes.find((o) => o.status === "completed");
  const last11Label = last11?.scheduled_date
    ? (() => {
        const days = Math.floor((Date.now() - new Date(last11.scheduled_date).getTime()) / 86_400_000);
        return days <= 0 ? "hoje" : days === 1 ? "há 1 dia" : `há ${days} dias`;
      })()
    : "—";
  const senioridade = "—"; // TODO: não há campo no schema
  const nivelSalarial = "—"; // TODO: não há campo no schema
  const gestorNome = teamContext?.leader?.full_name || "—";
  const empresaNome = teamContext?.team?.company?.name || "—";

  return (
    <div className="p-5 lg:p-7 font-sans text-text max-w-[1200px] mx-auto animate-fade-in">
      {/* Hero */}
      <div className="flex items-start gap-5 border-b border-border pb-5">
        <LinearAvatar name={profile?.full_name || "?"} size={72} />
        <div className="flex-1 min-w-0">
          <div className="text-[10.5px] uppercase tracking-[0.1em] font-semibold text-accent-text mb-1">
            Minha conta
          </div>
          <Row gap={8}>
            <h1 className="text-[22px] font-semibold tracking-[-0.025em] m-0">{displayName}</h1>
            <Chip color="green" size="sm">Ativo</Chip>
          </Row>
          <div className="text-[13px] text-text-muted mt-0.5">
            {roleLabel}
            {profile?.department && <> · {profile.department}</>}
            {teamContext?.leader?.full_name && <> · reporta a {teamContext.leader.full_name}</>}
            {profile?.hire_date && <> · desde {format(new Date(profile.hire_date), "MMM yyyy", { locale: ptBR })}</>}
          </div>
          <Row gap={16} className="mt-2.5 text-[12px] text-text-muted">
            <span>{profile?.email}</span>
            {profile?.phone && <span>· {profile.phone}</span>}
          </Row>
        </div>
        {!isEditing ? (
          <Btn
            variant="secondary"
            size="sm"
            icon={<Pencil className="w-3.5 h-3.5" strokeWidth={1.75} />}
            onClick={() => setIsEditing(true)}
          >
            Editar perfil
          </Btn>
        ) : (
          <Row gap={6}>
            <Btn variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
              Cancelar
            </Btn>
            <Btn variant="primary" size="sm" onClick={() => updateProfile.mutate(formData)}>
              Salvar
            </Btn>
          </Row>
        )}
      </div>

      {/* Tabs — underline manual (não shadcn) */}
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
              {isEditing ? (
                <div className="space-y-3">
                  <Field label="Nome completo">
                    <Input
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    />
                  </Field>
                  <Field label="Telefone">
                    <Input
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </Field>
                  <Field label="Departamento">
                    <Input
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    />
                  </Field>
                  <Field label="Bio">
                    <Textarea
                      value={formData.bio}
                      onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                      rows={4}
                      placeholder="Uma breve apresentação sobre você…"
                    />
                  </Field>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                  <InfoRow icon={User} label="Nome" value={profile?.full_name} />
                  <InfoRow icon={Mail} label="Email" value={profile?.email} />
                  <InfoRow icon={Phone} label="Telefone" value={profile?.phone} />
                  <InfoRow icon={Briefcase} label="Departamento" value={profile?.department} />
                  <InfoRow
                    icon={Calendar}
                    label="Admissão"
                    value={
                      profile?.hire_date
                        ? format(new Date(profile.hire_date), "dd 'de' MMMM, yyyy", { locale: ptBR })
                        : undefined
                    }
                  />
                </div>
              )}
            </div>

            {profile?.bio && !isEditing && (
              <>
                <SectionHeader title="Sobre" />
                <div className="surface-paper p-4">
                  <p className="text-[13.5px] text-text leading-relaxed whitespace-pre-wrap">{profile.bio}</p>
                </div>
              </>
            )}
          </div>

          <div>
            <SectionHeader title="Resumo" />
            <div className="surface-paper">
              {[
                ["PDIs ativos", String(pdisAtivos)],
                ["PDIs concluídos", String(pdisConcluidos)],
                ["Última 1:1", last11Label],
                ["Senioridade", senioridade],
                ["Nível salarial", nivelSalarial],
                ["Gestor", gestorNome],
                ["Empresa", empresaNome],
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

      {activeTab === "career" && (
        <div className="mt-5">
          <SectionHeader title="Trajetória" />
          <LinearEmpty
            icon={<Briefcase className="w-[18px] h-[18px]" strokeWidth={1.75} />}
            title="Sem histórico de cargos"
            description="A trajetória profissional aparece aqui conforme promoções e mudanças de cargo forem registradas."
          />
        </div>
      )}

      {activeTab === "evaluations" && (
        <div className="mt-5">
          <SectionHeader title="Avaliações" />
          {evaluations.length === 0 ? (
            <LinearEmpty
              icon={<FileText className="w-[18px] h-[18px]" strokeWidth={1.75} />}
              title="Sem avaliações"
              description="Suas avaliações de performance aparecem aqui quando forem criadas."
            />
          ) : (
            <div className="surface-paper overflow-hidden">
              {evaluations.map((ev, i) => (
                <div
                  key={ev.id}
                  className={`grid grid-cols-[1fr_auto_auto] gap-4 items-center px-3.5 py-2.5 text-[13px] ${
                    i < evaluations.length - 1 ? "border-b border-border" : ""
                  }`}
                >
                  <div>
                    <div className="font-medium">{ev.cycle || "Ciclo sem título"}</div>
                    <div className="text-[11.5px] text-text-subtle mt-0.5">
                      {ev.evaluator_user?.full_name ? `avaliado por ${ev.evaluator_user.full_name}` : "avaliador —"}
                      {ev.created_at && ` · ${format(new Date(ev.created_at), "dd MMM yyyy", { locale: ptBR })}`}
                    </div>
                  </div>
                  <div className="tabular text-[13px] font-medium">
                    {ev.overall_score != null ? Number(ev.overall_score).toFixed(1) : "—"}
                  </div>
                  <Chip
                    color={ev.status === "completed" ? "green" : ev.status === "reviewed" ? "accent" : "neutral"}
                    size="sm"
                  >
                    {ev.status === "completed" ? "Concluída" : ev.status === "reviewed" ? "Revisada" : "Rascunho"}
                  </Chip>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "pdis" && (
        <div className="mt-5">
          <SectionHeader title="Planos de desenvolvimento" />
          {plans.length === 0 ? (
            <LinearEmpty
              icon={<Target className="w-[18px] h-[18px]" strokeWidth={1.75} />}
              title="Sem PDIs"
              description="Os planos de desenvolvimento que você acordar com seu gestor aparecem aqui."
            />
          ) : (
            <div className="surface-paper overflow-hidden">
              {plans.map((p, i) => (
                <div
                  key={p.id}
                  className={`grid grid-cols-[1fr_auto_auto] gap-4 items-center px-3.5 py-2.5 text-[13px] ${
                    i < plans.length - 1 ? "border-b border-border" : ""
                  }`}
                >
                  <div>
                    <div className="font-medium">{p.title || "PDI sem título"}</div>
                    <div className="text-[11.5px] text-text-subtle mt-0.5">
                      {p.created_at && `criado em ${format(new Date(p.created_at), "dd MMM yyyy", { locale: ptBR })}`}
                    </div>
                  </div>
                  <div className="tabular text-[12px] text-text-muted">
                    {p.progress_percentage != null ? `${p.progress_percentage}%` : "—"}
                  </div>
                  <Chip
                    color={
                      p.status === "completed"
                        ? "green"
                        : p.status === "in_progress"
                        ? "accent"
                        : p.status === "approved"
                        ? "blue"
                        : "neutral"
                    }
                    size="sm"
                  >
                    {p.status === "completed"
                      ? "Concluído"
                      : p.status === "in_progress"
                      ? "Em progresso"
                      : p.status === "approved"
                      ? "Aprovado"
                      : "Rascunho"}
                  </Chip>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "onones" && (
        <div className="mt-5">
          <SectionHeader title="Reuniões 1:1" />
          {oneOnOnes.length === 0 ? (
            <LinearEmpty
              icon={<Calendar className="w-[18px] h-[18px]" strokeWidth={1.75} />}
              title="Sem 1:1s registradas"
              description="As reuniões que você fizer com seu gestor aparecem aqui."
            />
          ) : (
            <div className="surface-paper overflow-hidden">
              {oneOnOnes.map((o, i) => (
                <div
                  key={o.id}
                  className={`grid grid-cols-[1fr_auto_auto] gap-4 items-center px-3.5 py-2.5 text-[13px] ${
                    i < oneOnOnes.length - 1 ? "border-b border-border" : ""
                  }`}
                >
                  <div>
                    <div className="font-medium">
                      {o.scheduled_date
                        ? format(new Date(o.scheduled_date), "dd 'de' MMMM yyyy", { locale: ptBR })
                        : "Sem data"}
                    </div>
                    <div className="text-[11.5px] text-text-subtle mt-0.5">
                      {o.leader?.full_name ? `com ${o.leader.full_name}` : "líder —"}
                      {o.duration_minutes ? ` · ${o.duration_minutes} min` : ""}
                    </div>
                  </div>
                  <Chip
                    color={o.status === "completed" ? "green" : o.status === "scheduled" ? "blue" : "neutral"}
                    size="sm"
                  >
                    {o.status === "completed" ? "Concluída" : o.status === "scheduled" ? "Agendada" : o.status || "—"}
                  </Chip>
                  <div />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "docs" && (
        <div className="mt-5">
          <SectionHeader title="Documentos" />
          <LinearEmpty
            icon={<FileText className="w-[18px] h-[18px]" strokeWidth={1.75} />}
            title="Sem documentos"
            description="Contratos, certificados e documentos relacionados ao seu vínculo aparecem aqui."
            actions={
              <Btn variant="ghost" size="sm">
                Adicionar
              </Btn>
            }
          />
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[10.5px] uppercase tracking-[0.06em] text-text-subtle font-semibold">
        {label}
      </Label>
      {children}
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof User;
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
        <div className={hasValue ? "mt-0.5 text-[13px] text-text truncate" : "mt-0.5 text-[12.5px] text-text-subtle italic"}>
          {value || "Não informado"}
        </div>
      </div>
    </div>
  );
}
