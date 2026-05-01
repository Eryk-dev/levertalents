import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useOneOnOnes, useCreateOneOnOne, useDeleteOneOnOne, type OneOnOne } from "@/hooks/useOneOnOnes";
import { useScope } from "@/app/providers/ScopeProvider";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar, Clock, Plus, FileText, AlertCircle, Trash2, Filter } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { OneOnOneMeetingForm } from "@/components/OneOnOneMeetingForm";
import { usePDIIntegrated } from "@/hooks/usePDIIntegrated";
import { LinkedPDIsSection } from "@/components/LinkedPDIsSection";
import { AudioPlayer } from "@/components/AudioPlayer";
import { RetryTranscriptionButton } from "@/components/RetryTranscriptionButton";
import { StatusBadge } from "@/components/primitives/StatusBadge";
import {
  Btn,
  Chip,
  Row,
  SectionHeader,
  LinearEmpty,
  LinearAvatar,
} from "@/components/primitives/LinearKit";
import { cn } from "@/lib/utils";

function hasMeetingStructureContent(meetingStructure: OneOnOne["meeting_structure"]) {
  if (!meetingStructure) return false;
  return Object.values(meetingStructure).some((value) => {
    if (value == null) return false;
    if (typeof value === "string") return value.trim().length > 0;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === "object") return Object.keys(value).length > 0;
    return true;
  });
}

export default function OneOnOnes() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showForm, setShowForm] = useState(false);
  const [selectedOneOnOne, setSelectedOneOnOne] = useState<OneOnOne | null>(null);
  const [showMeetingForm, setShowMeetingForm] = useState(false);
  const [meetingFormOneOnOne, setMeetingFormOneOnOne] = useState<OneOnOne | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<string | null>(null);
  const { data: oneOnOnes = [], isLoading } = useOneOnOnes();
  const createOneOnOne = useCreateOneOnOne();
  const deleteOneOnOne = useDeleteOneOnOne();
  const { scope } = useScope();
  const { hasPDIForOneOnOne } = usePDIIntegrated();

  useEffect(() => {
    const state = location.state as { openOneOnOneId?: string };
    if (state?.openOneOnOneId && oneOnOnes) {
      const oneOnOne = oneOnOnes.find((o) => o.id === state.openOneOnOneId);
      if (oneOnOne) {
        setSelectedOneOnOne(oneOnOne);
        navigate(location.pathname, { replace: true, state: {} });
      }
    }
  }, [location, oneOnOnes, navigate]);

  const [formData, setFormData] = useState({
    collaborator_id: "",
    scheduled_date: "",
    duration_minutes: 60,
    agenda: "",
  });

  const { data: currentUser } = useQuery({
    queryKey: ["current-user-role"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();
      return { id: user.id, role: roleData?.role };
    },
  });

  const canDelete =
    currentUser?.role === "lider" || currentUser?.role === "rh" || currentUser?.role === "socio";

  const { data: teamMembers } = useQuery({
    queryKey: ["team-members-for-oneonone"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      let userIds: string[] = [];
      if (roleData?.role === "rh" || roleData?.role === "socio") {
        const { data: allProfiles } = await supabase
          .from("profiles")
          .select("id")
          .neq("id", user.id);
        userIds = allProfiles?.map((p) => p.id) || [];
      } else if (roleData?.role === "lider") {
        const { data } = await supabase
          .from("team_members")
          .select("user_id")
          .eq("leader_id", user.id);
        userIds = data?.map((m) => m.user_id) || [];
      }

      if (userIds.length === 0) return [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);
      return (
        profiles?.map((p) => ({
          user_id: p.id,
          profiles: p,
        })) || []
      );
    },
  });

  const handleSubmit = () => {
    if (!formData.collaborator_id || !formData.scheduled_date) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    const companyId = scope?.companyIds[0];
    if (!companyId) {
      toast.error("Selecione uma empresa no topo da página antes de agendar.");
      return;
    }
    const scheduledDate = new Date(formData.scheduled_date).toISOString();
    createOneOnOne.mutate(
      { ...formData, company_id: companyId, scheduled_date: scheduledDate },
      {
        onSuccess: () => {
          toast.success("1:1 agendada");
          setShowForm(false);
          setFormData({ collaborator_id: "", scheduled_date: "", duration_minutes: 60, agenda: "" });
        },
        onError: (err) => toast.error("Erro ao agendar: " + (err as Error).message),
      },
    );
  };

  const handleDelete = (id: string) => {
    deleteOneOnOne.mutate(id, {
      onSuccess: () => toast.success("1:1 excluída"),
      onError: (err) => toast.error("Erro ao excluir: " + (err as Error).message),
    });
    setDeleteDialog(null);
  };

  const [bucketFilter, setBucketFilter] = useState<string[]>([]);
  const [collaboratorFilter, setCollaboratorFilter] = useState<string[]>([]);

  const collaboratorOptions = useMemo(() => {
    const map = new Map<string, string>();
    oneOnOnes.forEach((o) => {
      if (o.collaborator?.id && o.collaborator?.full_name) {
        map.set(o.collaborator.id, o.collaborator.full_name);
      }
    });
    return Array.from(map, ([id, name]) => ({ id, name })).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [oneOnOnes]);

  const filteredOneOnOnes = oneOnOnes.filter((o) => {
    if (collaboratorFilter.length && (!o.collaborator?.id || !collaboratorFilter.includes(o.collaborator.id))) {
      return false;
    }
    return true;
  });

  const upcoming = filteredOneOnOnes.filter(
    (o) => o.status === "scheduled" && new Date(o.scheduled_date) >= new Date(),
  );
  const completed = filteredOneOnOnes.filter((o) => o.status === "completed");
  const pending = filteredOneOnOnes.filter(
    (o) =>
      o.status === "scheduled" &&
      new Date(o.scheduled_date) < new Date() &&
      !hasMeetingStructureContent(o.meeting_structure),
  );

  const showPending = !bucketFilter.length || bucketFilter.includes("pending");
  const showUpcoming = !bucketFilter.length || bucketFilter.includes("upcoming");
  const showCompleted = !bucketFilter.length || bucketFilter.includes("completed");
  const activeFilterCount = bucketFilter.length + collaboratorFilter.length;
  const toggleIn = (arr: string[], v: string) =>
    arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];

  return (
    <div className="p-5 lg:p-7 font-sans text-text max-w-[1400px] mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="text-[20px] font-semibold tracking-[-0.02em] m-0">1:1s</h1>
          <div className="text-[13px] text-text-muted mt-0.5">
            {upcoming.length} próximas · {pending.length} a preencher · {completed.length} concluídas
          </div>
        </div>
        <Row gap={6}>
          <Popover>
            <PopoverTrigger asChild>
              <Btn variant="ghost" size="sm" icon={<Filter className="w-3.5 h-3.5" />}>
                Filtros{activeFilterCount > 0 && ` · ${activeFilterCount}`}
              </Btn>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64 p-3">
              <div className="space-y-3">
                <div>
                  <div className="text-[10.5px] uppercase tracking-[0.05em] text-text-subtle font-semibold mb-1.5">
                    Situação
                  </div>
                  <div className="space-y-1.5">
                    {[
                      { value: "pending", label: "A preencher" },
                      { value: "upcoming", label: "Próximas" },
                      { value: "completed", label: "Concluídas" },
                    ].map((b) => (
                      <label key={b.value} className="flex items-center gap-2 text-[12.5px] cursor-pointer">
                        <Checkbox
                          checked={bucketFilter.includes(b.value)}
                          onCheckedChange={() => setBucketFilter((cur) => toggleIn(cur, b.value))}
                        />
                        {b.label}
                      </label>
                    ))}
                  </div>
                </div>
                {collaboratorOptions.length > 0 && (
                  <div className="border-t border-border pt-3">
                    <div className="text-[10.5px] uppercase tracking-[0.05em] text-text-subtle font-semibold mb-1.5">
                      Colaborador
                    </div>
                    <div className="space-y-1.5 max-h-44 overflow-y-auto">
                      {collaboratorOptions.map((c) => (
                        <label key={c.id} className="flex items-center gap-2 text-[12.5px] cursor-pointer">
                          <Checkbox
                            checked={collaboratorFilter.includes(c.id)}
                            onCheckedChange={() => setCollaboratorFilter((cur) => toggleIn(cur, c.id))}
                          />
                          <span className="truncate">{c.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                {activeFilterCount > 0 && (
                  <button
                    type="button"
                    className="text-[11.5px] text-text-muted hover:text-text underline"
                    onClick={() => {
                      setBucketFilter([]);
                      setCollaboratorFilter([]);
                    }}
                  >
                    Limpar filtros
                  </button>
                )}
              </div>
            </PopoverContent>
          </Popover>
          <Btn
            variant="primary"
            size="sm"
            icon={<Plus className="w-3.5 h-3.5" strokeWidth={2} />}
            onClick={() => setShowForm(true)}
          >
            Agendar 1:1
          </Btn>
        </Row>
      </div>

      {isLoading ? null : oneOnOnes.length === 0 ? (
        <div className="mt-5">
          <LinearEmpty
            icon={<Calendar className="w-[18px] h-[18px]" strokeWidth={1.75} />}
            title="Nenhuma 1:1 agendada"
            description="Quando houver reuniões marcadas, elas aparecem aqui com o status e a pauta."
            actions={
              <Btn
                variant="primary"
                size="sm"
                icon={<Plus className="w-3.5 h-3.5" strokeWidth={2} />}
                onClick={() => setShowForm(true)}
              >
                Agendar 1:1
              </Btn>
            }
          />
        </div>
      ) : (
        <>
          {showPending && pending.length > 0 && (
            <>
              <SectionHeader
                title="Para preencher"
                right={<span className="text-[11.5px] text-text-subtle tabular">{pending.length} itens</span>}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {pending.map((o) => (
                  <OneOnOneCard
                    key={o.id}
                    oneOnOne={o}
                    hasPDI={hasPDIForOneOnOne(o.id)}
                    needsCompletion
                    canDelete={canDelete}
                    onOpen={() => {
                      setMeetingFormOneOnOne(o);
                      setShowMeetingForm(true);
                    }}
                    onDelete={() => setDeleteDialog(o.id)}
                  />
                ))}
              </div>
            </>
          )}

          {showUpcoming && upcoming.length > 0 && (
            <>
              <SectionHeader title="Próximas" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {upcoming.map((o) => (
                  <OneOnOneCard
                    key={o.id}
                    oneOnOne={o}
                    hasPDI={hasPDIForOneOnOne(o.id)}
                    canDelete={canDelete}
                    onOpen={() => {
                      setMeetingFormOneOnOne(o);
                      setShowMeetingForm(true);
                    }}
                    onDelete={() => setDeleteDialog(o.id)}
                  />
                ))}
              </div>
            </>
          )}

          {showCompleted && completed.length > 0 && (
            <>
              <SectionHeader title="Histórico" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {completed.map((o) => (
                  <OneOnOneCard
                    key={o.id}
                    oneOnOne={o}
                    hasPDI={hasPDIForOneOnOne(o.id)}
                    canDelete={canDelete}
                    onOpen={() => setSelectedOneOnOne(o)}
                    onDelete={() => setDeleteDialog(o.id)}
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* Schedule dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agendar nova 1:1</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-[11px] uppercase tracking-[0.05em] text-text-subtle font-semibold">
                Colaborador
              </Label>
              <Select
                value={formData.collaborator_id}
                onValueChange={(v) => setFormData({ ...formData, collaborator_id: v })}
              >
                <SelectTrigger className="h-[30px] text-[13px]">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {teamMembers?.map((m: any) => (
                    <SelectItem key={m.user_id} value={m.user_id}>
                      {m.profiles.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] uppercase tracking-[0.05em] text-text-subtle font-semibold">
                Data e hora
              </Label>
              <Input
                type="datetime-local"
                value={formData.scheduled_date}
                onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] uppercase tracking-[0.05em] text-text-subtle font-semibold">
                Duração (minutos)
              </Label>
              <Input
                type="number"
                value={formData.duration_minutes}
                onChange={(e) => setFormData({ ...formData, duration_minutes: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] uppercase tracking-[0.05em] text-text-subtle font-semibold">
                Pauta
              </Label>
              <Textarea
                value={formData.agenda}
                onChange={(e) => setFormData({ ...formData, agenda: e.target.value })}
                placeholder="Tópicos a serem discutidos…"
              />
            </div>
            <Btn variant="primary" size="md" onClick={handleSubmit} className="w-full justify-center mt-2">
              Agendar
            </Btn>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showMeetingForm && !!meetingFormOneOnOne}
        onOpenChange={(open) => {
          setShowMeetingForm(open);
          if (!open) setMeetingFormOneOnOne(null);
        }}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0">
          {meetingFormOneOnOne && <OneOnOneMeetingForm meeting={meetingFormOneOnOne} />}
        </DialogContent>
      </Dialog>

      {/* Read-only details */}
      <Dialog open={!!selectedOneOnOne} onOpenChange={() => setSelectedOneOnOne(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes da 1:1</DialogTitle>
          </DialogHeader>
          {selectedOneOnOne && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 p-3.5 bg-bg-subtle rounded-md border border-border">
                <div>
                  <div className="text-[10.5px] text-text-subtle uppercase tracking-[0.05em] font-semibold">
                    Colaborador
                  </div>
                  <div className="text-[13px] font-medium mt-1">
                    {selectedOneOnOne.collaborator?.full_name}
                  </div>
                </div>
                <div>
                  <div className="text-[10.5px] text-text-subtle uppercase tracking-[0.05em] font-semibold">
                    Líder
                  </div>
                  <div className="text-[13px] font-medium mt-1">
                    {selectedOneOnOne.leader?.full_name}
                  </div>
                </div>
                <div>
                  <div className="text-[10.5px] text-text-subtle uppercase tracking-[0.05em] font-semibold">
                    Data
                  </div>
                  <div className="text-[13px] font-medium mt-1">
                    {format(new Date(selectedOneOnOne.scheduled_date), "dd/MM/yyyy 'às' HH:mm")}
                  </div>
                </div>
                <div>
                  <div className="text-[10.5px] text-text-subtle uppercase tracking-[0.05em] font-semibold">
                    Duração
                  </div>
                  <div className="text-[13px] font-medium mt-1">
                    {selectedOneOnOne.duration_minutes} min
                  </div>
                </div>
              </div>

              <LinkedPDIsSection oneOnOneId={selectedOneOnOne.id} />

              {selectedOneOnOne.agenda && (
                <div>
                  <h3 className="text-[13px] font-semibold mb-1.5">Pauta</h3>
                  <p className="text-[13px] text-text-muted whitespace-pre-wrap leading-relaxed">
                    {selectedOneOnOne.agenda}
                  </p>
                </div>
              )}
              {selectedOneOnOne.notes && (
                <div>
                  <h3 className="text-[13px] font-semibold mb-1.5">Notas</h3>
                  <p className="text-[13px] text-text-muted whitespace-pre-wrap leading-relaxed">
                    {selectedOneOnOne.notes}
                  </p>
                </div>
              )}
              {selectedOneOnOne.meeting_structure && (
                <>
                  {selectedOneOnOne.audio_url && (
                    <div>
                      <h3 className="text-[13px] font-semibold mb-1.5">Gravação</h3>
                      <AudioPlayer
                        audioUrl={selectedOneOnOne.audio_url}
                        audioDuration={selectedOneOnOne.audio_duration || undefined}
                      />
                    </div>
                  )}
                  {selectedOneOnOne.meeting_structure.transcricao && (
                    <div>
                      <h3 className="text-[13px] font-semibold mb-1.5">Transcrição</h3>
                      <div className="bg-bg-subtle rounded-md p-3 border border-border">
                        <p className="text-[13px] whitespace-pre-wrap leading-relaxed">
                          {selectedOneOnOne.meeting_structure.transcricao}
                        </p>
                      </div>
                    </div>
                  )}
                  {selectedOneOnOne.meeting_structure.resumo && (
                    <div>
                      <h3 className="text-[13px] font-semibold mb-1.5">Resumo</h3>
                      <div className="bg-bg-subtle rounded-md p-3 border border-border">
                        <p className="text-[13px] whitespace-pre-wrap leading-relaxed">
                          {selectedOneOnOne.meeting_structure.resumo}
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este 1:1? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteDialog && handleDelete(deleteDialog)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function OneOnOneCard({
  oneOnOne,
  hasPDI,
  needsCompletion,
  canDelete,
  onOpen,
  onDelete,
}: {
  oneOnOne: OneOnOne;
  hasPDI: boolean;
  needsCompletion?: boolean;
  canDelete: boolean;
  onOpen: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={cn(
        "surface-paper p-3.5 cursor-pointer hover:border-border-strong transition-colors relative",
        needsCompletion && "border-l-[3px] border-l-status-amber",
      )}
      onClick={onOpen}
    >
      <Row gap={10} align="start">
        <LinearAvatar name={oneOnOne.collaborator?.full_name || "?"} size={32} />
        <div className="flex-1 min-w-0">
          <div className="text-[13.5px] font-semibold tracking-[-0.005em] truncate">
            {oneOnOne.collaborator?.full_name}
          </div>
          <div className="text-[11.5px] text-text-muted mt-0.5 truncate">
            {format(new Date(oneOnOne.scheduled_date), "dd 'de' MMM, HH:mm", { locale: ptBR })} ·{" "}
            {oneOnOne.duration_minutes} min
          </div>
        </div>
        <StatusBadge kind="one-on-one" status={oneOnOne.status} size="sm" />
      </Row>

      {oneOnOne.agenda && (
        <div className="text-[12px] text-text-muted mt-2.5 line-clamp-2 leading-relaxed">
          {oneOnOne.agenda}
        </div>
      )}

      <Row gap={6} className="mt-2.5" align="center">
        {needsCompletion && (
          <Chip color="amber" size="sm" icon={<AlertCircle className="w-3 h-3" strokeWidth={2} />}>
            Preencher
          </Chip>
        )}
        {oneOnOne.status === "completed" && !hasPDI && (
          <Chip color="neutral" size="sm" icon={<FileText className="w-3 h-3" strokeWidth={1.75} />}>
            Sem PDI
          </Chip>
        )}
        {oneOnOne.audio_url && !oneOnOne.meeting_structure?.transcricao && (
          <div onClick={(e) => e.stopPropagation()}>
            <RetryTranscriptionButton
              meetingId={oneOnOne.id}
              audioUrl={oneOnOne.audio_url}
              hasTranscription={!!oneOnOne.meeting_structure?.transcricao}
            />
          </div>
        )}
        <div className="flex-1" />
        {canDelete && (
          <button
            className="text-text-subtle hover:text-status-red"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            aria-label="Excluir 1:1"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </Row>
    </div>
  );
}
