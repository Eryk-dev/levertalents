import { useState, useEffect, useRef, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { OneOnOne } from "@/hooks/useOneOnOnes";
import { PDIFormIntegrated } from "./PDIFormIntegrated";
import { PDIReviewCard } from "./PDIReviewCard";
import {
  usePDIIntegrated,
  usePDIForOneOnOne,
  useLatestPDIForCollaborator,
  PDIFormData,
} from "@/hooks/usePDIIntegrated";
import { useAudioTranscription } from "@/hooks/useAudioTranscription";
import {
  Btn,
  Chip,
  Col,
  Kbd,
  LinearAvatar,
  MiniStat,
  Row,
  SectionHeader,
} from "@/components/primitives/LinearKit";
import { Icon } from "@/components/primitives/Icon";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface OneOnOneMeetingFormProps {
  oneOnOne: OneOnOne;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface MeetingData {
  pdi_review?: string;
  roteiro?: string;
  pdi_mensal?: PDIFormData;
  transcricao?: string;
  resumo?: string;
  audio_duration?: number;
  agenda_items?: AgendaItem[];
  action_items?: ActionItemEntry[];
}

type AgendaItem = {
  id: string;
  title: string;
  owner: string;
  done: boolean;
  active?: boolean;
  timeSpentSec?: number;
  notes?: string;
};

type ActionItemEntry = {
  id: string;
  title: string;
  owner: string;
  due: string;
  done: boolean;
};

const uid = () => Math.random().toString(36).slice(2, 9);

const DEFAULT_AGENDA = (): AgendaItem[] => [
  { id: uid(), title: "Como você está?", owner: "Ambos", done: false, active: true },
  { id: uid(), title: "Progresso do PDI atual", owner: "Colaborador", done: false },
  { id: uid(), title: "Bloqueios e desafios", owner: "Colaborador", done: false },
  { id: uid(), title: "Próximos passos e alinhamento", owner: "Líder", done: false },
];

/**
 * 1:1 Modo Reunião Ao Vivo — Linear denso sans.
 * Main column: cronômetro + pauta + anotações + action items.
 * Right rail: contexto (avatar, stats, últimas reuniões, atalhos).
 * Mantém a lógica de gravação de áudio e de transcrição existentes.
 */
export const OneOnOneMeetingForm = ({ open, onOpenChange, oneOnOne }: OneOnOneMeetingFormProps) => {
  const queryClient = useQueryClient();
  const { createPDIFromOneOnOne, isCreating } = usePDIIntegrated();
  const { saveAudioToStorage, transcribeAudio } = useAudioTranscription();

  const { data: existingPDI } = usePDIForOneOnOne(oneOnOne.id);
  const { data: latestPDI } = useLatestPDIForCollaborator(oneOnOne.collaborator_id);

  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [shouldFinalize, setShouldFinalize] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

  const [agendaItems, setAgendaItems] = useState<AgendaItem[]>(DEFAULT_AGENDA);
  const [actionItems, setActionItems] = useState<ActionItemEntry[]>([]);
  const [showPDIDialog, setShowPDIDialog] = useState(false);
  const [showPrevPDIPanel, setShowPrevPDIPanel] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const activeStartRef = useRef<number>(0);

  const [meetingData, setMeetingData] = useState<MeetingData>({
    pdi_review: "",
    roteiro: "",
  });

  useEffect(() => {
    if (open && oneOnOne?.meeting_structure) {
      const structure = oneOnOne.meeting_structure as MeetingData;
      setMeetingData(structure);
      if (structure.agenda_items?.length) setAgendaItems(structure.agenda_items);
      if (structure.action_items?.length) setActionItems(structure.action_items);
    } else if (open) {
      setMeetingData({ pdi_review: "", roteiro: "" });
      setAgendaItems(DEFAULT_AGENDA());
      setActionItems([]);
      setIsRecording(false);
      setElapsed(0);
      setAudioBlob(null);
    }
  }, [open, oneOnOne]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const activeItem = useMemo(
    () => agendaItems.find((i) => i.active) || null,
    [agendaItems],
  );

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      });

      audioChunksRef.current = [];
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(1000);
      startTimeRef.current = Date.now();
      activeStartRef.current = Date.now();
      setIsRecording(true);
      setElapsed(0);

      timerRef.current = window.setInterval(() => {
        setElapsed((prev) => prev + 1);
      }, 1000);

      toast.success("Reunião iniciada");
    } catch (error) {
      console.error("Error starting recording:", error);
      toast.error("Erro ao acessar microfone. Verifique as permissões.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setIsRecording(false);
    }
  };

  const toggleAgendaDone = (id: string) => {
    setAgendaItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, done: !it.done } : it)),
    );
  };

  const setAgendaActive = (id: string) => {
    const now = Date.now();
    setAgendaItems((prev) =>
      prev.map((it) => {
        if (it.active && it.id !== id) {
          const spent = Math.max(0, Math.floor((now - activeStartRef.current) / 1000));
          return {
            ...it,
            active: false,
            timeSpentSec: (it.timeSpentSec || 0) + spent,
          };
        }
        if (it.id === id) {
          activeStartRef.current = now;
          return { ...it, active: true };
        }
        return { ...it, active: false };
      }),
    );
  };

  const addAgendaItem = () => {
    setAgendaItems((prev) => [
      ...prev,
      { id: uid(), title: "Novo tópico", owner: "Ambos", done: false },
    ]);
  };

  const removeAgendaItem = (id: string) => {
    setAgendaItems((prev) => prev.filter((it) => it.id !== id));
  };

  const addActionItem = () => {
    setActionItems((prev) => [
      ...prev,
      { id: uid(), title: "", owner: "", due: "", done: false },
    ]);
  };

  const updateActionItem = (id: string, patch: Partial<ActionItemEntry>) => {
    setActionItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  };

  const removeActionItem = (id: string) => {
    setActionItems((prev) => prev.filter((it) => it.id !== id));
  };

  const handlePDISubmit = (data: PDIFormData) => {
    setMeetingData({ ...meetingData, pdi_mensal: data });
    setShowPDIDialog(false);
    toast.success("PDI incluído nesta 1:1");
  };

  useEffect(() => {
    if (shouldFinalize && audioBlob) {
      // Reset immediately so a late-arriving blob doesn't retrigger this effect,
      // and so a retry can set it true again cleanly.
      setShouldFinalize(false);
      processFinalization();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioBlob, shouldFinalize]);

  const processFinalization = async () => {
    if (!audioBlob) {
      toast.error("Áudio não encontrado");
      return;
    }
    setIsProcessing(true);

    try {
      await supabase
        .from("one_on_ones")
        .update({ status: "processing" })
        .eq("id", oneOnOne.id);

      queryClient.invalidateQueries({ queryKey: ["one_on_ones"] });
      onOpenChange(false);

      toast.info("Processando 1:1…");
      const reader = new FileReader();
      const audioBase64 = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(",")[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(audioBlob);
      });

      const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const audioUrl = await saveAudioToStorage(audioBase64, oneOnOne.id, duration);
      if (!audioUrl) throw new Error("Erro ao salvar áudio");

      const transcription = await transcribeAudio(audioBase64);

      const meetingDataForSummary = {
        transcricao: transcription || "",
        leader: {
          id: oneOnOne.leader_id,
          name: oneOnOne.leader?.full_name || "Líder",
        },
        collaborator: {
          id: oneOnOne.collaborator_id,
          name: oneOnOne.collaborator?.full_name || "Colaborador",
        },
        pdi_review: meetingData.pdi_review,
        roteiro: meetingData.roteiro,
        pdi_mensal: meetingData.pdi_mensal,
        agenda_items: agendaItems,
        action_items: actionItems,
      };

      let summary = "";
      try {
        const { data: summaryData, error: summaryError } = await supabase.functions.invoke(
          "summarize-meeting",
          {
            body: { meetingData: meetingDataForSummary },
          },
        );
        if (!summaryError && summaryData?.summary) summary = summaryData.summary;
      } catch (summaryError) {
        console.error("Summary generation error:", summaryError);
      }

      const finalData: MeetingData = {
        pdi_review: meetingData.pdi_review,
        roteiro: meetingData.roteiro,
        pdi_mensal: meetingData.pdi_mensal,
        transcricao: transcription || "",
        resumo: summary,
        audio_duration: duration,
        agenda_items: agendaItems,
        action_items: actionItems,
      };

      if (meetingData.pdi_mensal) {
        await createPDIFromOneOnOne({
          oneOnOneId: oneOnOne.id,
          collaboratorId: oneOnOne.collaborator_id,
          data: meetingData.pdi_mensal,
        });
      }

      const transcriptionSucceeded =
        typeof transcription === "string" && transcription.trim().length > 0;
      const nextStatus: OneOnOne["status"] = transcriptionSucceeded
        ? "completed"
        : "scheduled";

      const { error: finalUpdateError } = await supabase
        .from("one_on_ones")
        .update({
          status: nextStatus,
          meeting_structure: finalData as any,
          updated_at: new Date().toISOString(),
        })
        .eq("id", oneOnOne.id);

      if (finalUpdateError) throw finalUpdateError;

      queryClient.invalidateQueries({ queryKey: ["one_on_ones"] });

      if (transcriptionSucceeded) {
        toast.success("1:1 finalizada!");
      } else {
        toast.error(
          "Transcrição falhou. O áudio foi salvo — tente transcrever novamente na 1:1.",
        );
      }
    } catch (error: any) {
      console.error("Error finalizing meeting:", error);
      const message = error?.message || "erro desconhecido";
      toast.error(`Erro ao finalizar 1:1: ${message}. Status revertido para agendada.`);

      await supabase
        .from("one_on_ones")
        .update({ status: "scheduled" })
        .eq("id", oneOnOne.id);

      queryClient.invalidateQueries({ queryKey: ["one_on_ones"] });
    } finally {
      setIsProcessing(false);
      setShouldFinalize(false);
    }
  };

  const handleFinalizeClick = () => {
    if (!isRecording) {
      toast.error("Nenhuma reunião ativa");
      return;
    }
    stopRecording();
    setShouldFinalize(true);
    toast.info("Encerrando gravação…");
  };

  const formatElapsed = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const formatSmall = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  const scheduledDateLabel = oneOnOne?.scheduled_date
    ? format(new Date(oneOnOne.scheduled_date), "d 'de' MMM", { locale: ptBR })
    : "—";

  const collaboratorName = oneOnOne?.collaborator?.full_name || "Colaborador";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[1240px] w-[98vw] max-h-[96vh] p-0 overflow-hidden gap-0">
        <DialogHeader className="sr-only">
          <DialogTitle>1:1 com {collaboratorName}</DialogTitle>
        </DialogHeader>

        {!isRecording ? (
          <PreMeetingPanel
            oneOnOne={oneOnOne}
            onStart={startRecording}
            onCancel={() => onOpenChange(false)}
          />
        ) : (
          <div className="grid grid-cols-[1fr_300px] h-[calc(96vh-4px)] overflow-hidden">
            {/* ── Main column ────────────────────────────────── */}
            <div className="overflow-y-auto px-6 py-5">
              {/* Timer + title */}
              <Row gap={10} align="center" className="mb-1">
                <Chip color="green" size="sm" icon={<span className="w-[6px] h-[6px] rounded-full bg-status-green animate-pulse" />}>
                  Em reunião
                </Chip>
                <span className="text-[12px] text-text-muted tabular">
                  {formatElapsed(elapsed)}
                </span>
              </Row>
              <h1 className="text-[22px] font-semibold tracking-[-0.02em] mt-1">
                1:1 com {collaboratorName}
              </h1>
              <div className="text-[12.5px] text-text-muted">
                Programada: {scheduledDateLabel} · {oneOnOne.duration_minutes || 60} min
              </div>

              {/* PDI Review (previous) */}
              {latestPDI && latestPDI.id !== existingPDI?.id && (
                <>
                  <SectionHeader
                    title="Revisar PDI anterior"
                    right={
                      <Btn
                        variant="ghost"
                        size="xs"
                        onClick={() => setShowPrevPDIPanel((v) => !v)}
                      >
                        {showPrevPDIPanel ? "Ocultar" : "Mostrar"}
                      </Btn>
                    }
                  />
                  {showPrevPDIPanel && (
                    <div className="bg-surface border border-border rounded-md p-3">
                      <PDIReviewCard pdi={latestPDI} onViewDetails={() => {}} />
                      <textarea
                        value={meetingData.pdi_review ?? ""}
                        onChange={(e) =>
                          setMeetingData({ ...meetingData, pdi_review: e.target.value })
                        }
                        placeholder="Anotações sobre o PDI anterior…"
                        className="w-full min-h-[70px] mt-2 p-2.5 text-[13px] text-text bg-bg-subtle border border-border rounded-md resize-y outline-none focus:border-border-focus transition-colors font-sans leading-[1.55]"
                      />
                    </div>
                  )}
                </>
              )}

              {/* Pauta */}
              <SectionHeader
                title="Pauta de hoje"
                right={
                  <Btn variant="ghost" size="xs" icon={<Icon name="plus" size={12} />} onClick={addAgendaItem}>
                    Adicionar tópico
                  </Btn>
                }
              />
              <div className="bg-surface border border-border rounded-md overflow-hidden">
                {agendaItems.length === 0 ? (
                  <div className="p-4 text-[12.5px] text-text-subtle text-center">
                    Sem tópicos — adicione algo para começar.
                  </div>
                ) : (
                  agendaItems.map((it, i) => (
                    <AgendaRow
                      key={it.id}
                      item={it}
                      last={i === agendaItems.length - 1}
                      onToggle={() => toggleAgendaDone(it.id)}
                      onFocus={() => setAgendaActive(it.id)}
                      onRemove={() => removeAgendaItem(it.id)}
                      timeLabel={it.timeSpentSec ? formatSmall(it.timeSpentSec) : "—"}
                    />
                  ))
                )}
              </div>

              {/* Anotações */}
              <SectionHeader
                title="Anotações"
                right={
                  <Row gap={6}>
                    <Btn variant="ghost" size="xs" icon={<Icon name="send" size={12} />}>
                      Privadas
                    </Btn>
                    <Btn variant="ghost" size="xs" icon={<Icon name="users" size={12} />}>
                      Compartilhadas
                    </Btn>
                  </Row>
                }
              />
              <div className="bg-surface border border-border rounded-md p-3.5 min-h-[140px]">
                {/* TODO: highlighter on text selection — deixado como iteração futura */}
                <textarea
                  value={meetingData.roteiro || ""}
                  onChange={(e) =>
                    setMeetingData({ ...meetingData, roteiro: e.target.value })
                  }
                  placeholder="Capture livremente os pontos discutidos. Texto livre — as AI helpers ajudam a estruturar depois."
                  className="w-full min-h-[120px] text-[13.5px] text-text bg-transparent outline-none resize-y font-sans leading-[1.55]"
                />
                <div className="mt-2.5 p-2.5 bg-bg-subtle border border-dashed border-border rounded-md flex items-center gap-2">
                  <Icon name="sparkles" size={13} className="text-accent-text shrink-0" />
                  <div className="text-[12px] text-text-muted flex-1">
                    {(meetingData.roteiro?.length || 0) > 120
                      ? `Detectei ${Math.min(3, Math.max(1, Math.floor((meetingData.roteiro?.length || 0) / 200)))} possíveis action items neste texto. Converter?`
                      : "Quando houver texto suficiente, sugerimos action items automaticamente."}
                  </div>
                  <Btn
                    variant="secondary"
                    size="xs"
                    disabled={(meetingData.roteiro?.length || 0) < 120}
                    onClick={() => addActionItem()}
                  >
                    Converter
                  </Btn>
                </div>
              </div>

              {/* Action items */}
              <SectionHeader
                title="Action items"
                right={
                  <Row gap={8}>
                    <span className="text-[11.5px] text-text-subtle">
                      {actionItems.length} item{actionItems.length === 1 ? "" : "s"}
                    </span>
                    <Btn
                      variant="ghost"
                      size="xs"
                      icon={<Icon name="plus" size={12} />}
                      onClick={addActionItem}
                    >
                      Novo
                    </Btn>
                  </Row>
                }
              />
              <div className="bg-surface border border-border rounded-md overflow-hidden">
                {actionItems.length === 0 ? (
                  <div className="p-4 text-[12.5px] text-text-subtle text-center">
                    Sem action items. Adicione tarefas acordadas na reunião.
                  </div>
                ) : (
                  actionItems.map((it, i) => (
                    <ActionRow
                      key={it.id}
                      item={it}
                      last={i === actionItems.length - 1}
                      onUpdate={(patch) => updateActionItem(it.id, patch)}
                      onRemove={() => removeActionItem(it.id)}
                    />
                  ))
                )}
              </div>

              {/* PDI Mensal toggle */}
              <SectionHeader
                title="PDI mensal"
                right={
                  existingPDI || meetingData.pdi_mensal ? (
                    <Chip color="green" size="sm" icon={<Icon name="check" size={11} />}>
                      Definido
                    </Chip>
                  ) : (
                    <Btn
                      variant="secondary"
                      size="xs"
                      icon={<Icon name="plus" size={12} />}
                      onClick={() => setShowPDIDialog(true)}
                    >
                      Criar PDI
                    </Btn>
                  )
                }
              />
              {(meetingData.pdi_mensal || existingPDI) && (
                <div className="bg-bg-subtle border border-border rounded-md p-3">
                  <div className="text-[10.5px] font-semibold uppercase tracking-[0.05em] text-text-subtle">
                    Objetivo
                  </div>
                  <div className="text-[13px] text-text mt-0.5">
                    {meetingData.pdi_mensal?.main_objective ||
                      existingPDI?.main_objective ||
                      "—"}
                  </div>
                </div>
              )}

              {/* Footer bar */}
              <div className="mt-6 pt-4 border-t border-border flex items-center justify-between">
                <Btn
                  variant="ghost"
                  size="sm"
                  onClick={() => onOpenChange(false)}
                  disabled={isProcessing}
                >
                  Cancelar
                </Btn>
                <Btn
                  variant="primary"
                  size="sm"
                  onClick={handleFinalizeClick}
                  disabled={isProcessing}
                  icon={<Icon name="check" size={13} />}
                >
                  {isProcessing ? "Processando…" : "Encerrar 1:1"}
                </Btn>
              </div>
            </div>

            {/* ── Right rail ───────────────────────────────── */}
            <aside className="border-l border-border bg-bg-subtle overflow-y-auto p-4">
              <div className="flex gap-2.5 items-center">
                <LinearAvatar name={collaboratorName} size={38} />
                <div>
                  <div className="text-[14px] font-semibold">{collaboratorName}</div>
                  <div className="text-[11.5px] text-text-muted">
                    {oneOnOne.collaborator ? "Liderado(a) direto(a)" : "—"}
                  </div>
                </div>
              </div>
              <div className="h-px bg-border my-3.5" />

              <MiniStat
                label="PDI ativo"
                value={latestPDI ? "1" : "0"}
                sub={latestPDI?.main_objective || latestPDI?.title || "Sem PDI"}
              />
              <MiniStat label="Última avaliação" value="—" sub="Sem dados" />
              <MiniStat label="Clima pessoal" value="—" sub="—" />

              <div className="text-[10.5px] font-semibold uppercase tracking-[0.05em] text-text-subtle mt-4 mb-2">
                Tópico ativo
              </div>
              <div className="bg-surface border border-border rounded-md p-2.5">
                <div className="text-[12.5px] font-medium text-text">
                  {activeItem?.title || "Nenhum selecionado"}
                </div>
                <div className="text-[11px] text-text-subtle mt-0.5">
                  Quem trouxe: {activeItem?.owner || "—"}
                </div>
              </div>

              <div className="text-[10.5px] font-semibold uppercase tracking-[0.05em] text-text-subtle mt-4 mb-2">
                Atalhos
              </div>
              <Col gap={4}>
                <Row justify="between" className="text-[12px] text-text-muted">
                  <span>Novo action item</span>
                  <Kbd>A</Kbd>
                </Row>
                <Row justify="between" className="text-[12px] text-text-muted">
                  <span>Marcar concluído</span>
                  <Kbd>⌘↵</Kbd>
                </Row>
                <Row justify="between" className="text-[12px] text-text-muted">
                  <span>Próximo tópico</span>
                  <Kbd>→</Kbd>
                </Row>
              </Col>
              {/* TODO: conectar stats reais (avaliação/clima/últimas 3 reuniões). */}
            </aside>
          </div>
        )}

        {/* PDI Dialog (wizard) */}
        <Dialog open={showPDIDialog} onOpenChange={setShowPDIDialog}>
          <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto p-0">
            <DialogHeader className="sr-only">
              <DialogTitle>Criar PDI</DialogTitle>
            </DialogHeader>
            <PDIFormIntegrated onSubmit={handlePDISubmit} isSubmitting={isCreating} />
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
};

/* ─── Sub-componentes ──────────────────────────────────────── */

function PreMeetingPanel({
  oneOnOne,
  onStart,
  onCancel,
}: {
  oneOnOne: OneOnOne;
  onStart: () => void;
  onCancel: () => void;
}) {
  const name = oneOnOne.collaborator?.full_name || "Colaborador";
  return (
    <div className="p-7">
      <Row gap={10} align="center">
        <LinearAvatar name={name} size={44} />
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.05em] text-text-subtle">
            1:1 ao vivo
          </div>
          <h2 className="text-[20px] font-semibold tracking-[-0.02em]">1:1 com {name}</h2>
          <div className="text-[12.5px] text-text-muted mt-0.5">
            Duração sugerida: {oneOnOne.duration_minutes || 60} min · gravação começa ao iniciar
          </div>
        </div>
      </Row>

      <div className="mt-5 bg-bg-subtle border border-border rounded-md p-3.5">
        <div className="text-[12.5px] text-text-muted leading-[1.55]">
          Ao começar, a gravação inicia e um cronômetro aparece.
          A estrutura sugerida:{" "}
          <span className="text-text">Aquecimento · Desenvolvimento · Projeção</span>.
          As anotações e action items ficam visíveis no mesmo lugar.
        </div>
      </div>

      <Row justify="between" className="mt-6">
        <Btn variant="ghost" size="md" onClick={onCancel}>
          Cancelar
        </Btn>
        <Btn
          variant="primary"
          size="md"
          onClick={onStart}
          icon={<Icon name="pulse" size={14} />}
        >
          Começar 1:1 (gravar)
        </Btn>
      </Row>
    </div>
  );
}

function AgendaRow({
  item,
  last,
  onToggle,
  onFocus,
  onRemove,
  timeLabel,
}: {
  item: AgendaItem;
  last: boolean;
  onToggle: () => void;
  onFocus: () => void;
  onRemove: () => void;
  timeLabel: string;
}) {
  return (
    <div
      className={cn(
        "flex gap-2.5 px-3.5 py-2.5",
        !last && "border-b border-border",
        item.active && "bg-accent-soft/60 border-l-[3px] border-l-accent",
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "w-4 h-4 rounded-[4px] shrink-0 mt-0.5 grid place-items-center border-[1.5px] transition-colors",
          item.done
            ? "bg-status-green border-status-green"
            : "bg-transparent border-border-strong hover:border-text-muted",
        )}
        aria-label="Marcar concluído"
      >
        {item.done && <Icon name="check" size={10} className="text-white" strokeWidth={2.5} />}
      </button>
      <button
        type="button"
        onClick={onFocus}
        className="flex-1 min-w-0 text-left"
      >
        <div
          className={cn(
            "text-[13px]",
            item.done ? "text-text-muted line-through" : "text-text",
            item.active && "font-medium",
          )}
        >
          {item.title}
        </div>
        <Row gap={8} className="mt-0.5 text-[11.5px] text-text-subtle">
          <span>Quem trouxe: {item.owner}</span>
          {timeLabel !== "—" && <span>· {timeLabel}</span>}
        </Row>
        {item.notes && !item.active && (
          <div className="text-[11.5px] text-text-muted mt-1 pl-2.5 border-l-2 border-border">
            {item.notes}
          </div>
        )}
      </button>
      {item.active ? (
        <Chip color="accent" size="sm">
          Agora
        </Chip>
      ) : (
        <button
          type="button"
          onClick={onRemove}
          className="text-text-subtle hover:text-text-muted transition-colors w-6 h-6 inline-grid place-items-center"
          aria-label="Remover tópico"
        >
          <Icon name="x" size={11} />
        </button>
      )}
    </div>
  );
}

function ActionRow({
  item,
  last,
  onUpdate,
  onRemove,
}: {
  item: ActionItemEntry;
  last: boolean;
  onUpdate: (patch: Partial<ActionItemEntry>) => void;
  onRemove: () => void;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3.5 py-2",
        !last && "border-b border-border",
      )}
    >
      <button
        type="button"
        onClick={() => onUpdate({ done: !item.done })}
        className={cn(
          "w-[14px] h-[14px] rounded-[3px] shrink-0 grid place-items-center border-[1.5px] transition-colors",
          item.done
            ? "bg-status-green border-status-green"
            : "bg-transparent border-border-strong hover:border-text-muted",
        )}
        aria-label="Marcar concluído"
      >
        {item.done && <Icon name="check" size={9} className="text-white" strokeWidth={2.5} />}
      </button>
      <input
        value={item.title}
        onChange={(e) => onUpdate({ title: e.target.value })}
        placeholder="O que precisa ser feito?"
        className={cn(
          "flex-1 text-[13px] outline-none bg-transparent font-sans",
          item.done && "line-through text-text-muted",
        )}
      />
      <input
        value={item.owner}
        onChange={(e) => onUpdate({ owner: e.target.value })}
        placeholder="Responsável"
        className="w-[110px] text-[11.5px] outline-none bg-transparent text-text-muted font-sans border-l border-border pl-2"
      />
      <input
        value={item.due}
        onChange={(e) => onUpdate({ due: e.target.value })}
        placeholder="Prazo"
        className="w-[100px] text-[11.5px] outline-none bg-transparent text-text-muted font-sans border-l border-border pl-2"
      />
      <button
        type="button"
        onClick={onRemove}
        className="text-text-subtle hover:text-text-muted transition-colors w-6 h-6 inline-grid place-items-center"
        aria-label="Remover"
      >
        <Icon name="x" size={11} />
      </button>
    </div>
  );
}
