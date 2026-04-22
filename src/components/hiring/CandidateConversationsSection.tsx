import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Download,
  FileText,
  MessageCircle,
  Plus,
  Trash2,
} from "lucide-react";
import { Btn, Chip, LinearEmpty, Row } from "@/components/primitives/LinearKit";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import {
  CANDIDATE_CONVERSATION_KIND_LABELS,
  useCandidateConversations,
  useCreateCandidateConversation,
  useDeleteCandidateConversation,
  useUpdateCandidateConversation,
  useUploadConversationTranscript,
} from "@/hooks/hiring/useCandidateConversations";
import type {
  CandidateConversationKind,
  CandidateConversationRow,
} from "@/integrations/supabase/hiring-types";
import { cn } from "@/lib/utils";

interface CandidateConversationsSectionProps {
  candidateId: string;
}

const KIND_OPTIONS: CandidateConversationKind[] = [
  "discovery",
  "followup",
  "referencia",
  "alinhamento",
  "outro",
];

const KIND_CHIP_COLOR: Record<CandidateConversationKind, "accent" | "blue" | "purple" | "amber" | "neutral"> = {
  discovery: "accent",
  followup: "blue",
  referencia: "purple",
  alinhamento: "amber",
  outro: "neutral",
};

export function CandidateConversationsSection({
  candidateId,
}: CandidateConversationsSectionProps) {
  const { data: conversations = [], isLoading } = useCandidateConversations(candidateId);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);

  return (
    <div className="space-y-3">
      <Row justify="between" align="center">
        <div className="text-[12.5px] text-text-muted">
          Registre discovery calls, follow-ups e referências. Consultado no Banco de Talentos.
        </div>
        <Btn
          variant="secondary"
          size="xs"
          icon={<Plus className="h-3 w-3" />}
          onClick={() => setNewOpen(true)}
        >
          Nova conversa
        </Btn>
      </Row>

      {isLoading ? (
        <p className="text-[12.5px] text-text-muted">Carregando…</p>
      ) : conversations.length === 0 ? (
        <LinearEmpty
          icon={<MessageCircle className="w-[18px] h-[18px]" />}
          title="Sem conversas registradas"
          description="Clique em 'Nova conversa' para adicionar uma transcrição ou resumo."
        />
      ) : (
        <div className="space-y-2">
          {conversations.map((c) => (
            <ConversationCard
              key={c.id}
              conversation={c}
              expanded={expandedId === c.id}
              onToggle={() => setExpandedId(expandedId === c.id ? null : c.id)}
            />
          ))}
        </div>
      )}

      <NewConversationDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        candidateId={candidateId}
        onCreated={(id) => {
          setExpandedId(id);
          setNewOpen(false);
        }}
      />
    </div>
  );
}

/* ─── Conversation card (collapsible) ────────────────────────── */

interface ConversationCardProps {
  conversation: CandidateConversationRow;
  expanded: boolean;
  onToggle: () => void;
}

function ConversationCard({ conversation, expanded, onToggle }: ConversationCardProps) {
  const update = useUpdateCandidateConversation();
  const remove = useDeleteCandidateConversation();
  const upload = useUploadConversationTranscript();

  const [title, setTitle] = useState(conversation.title ?? "");
  const [kind, setKind] = useState<CandidateConversationKind>(conversation.kind);
  const [occurredAt, setOccurredAt] = useState<string>(
    toLocalInput(conversation.occurred_at),
  );
  const [transcript, setTranscript] = useState(conversation.transcript_text ?? "");
  const [summary, setSummary] = useState(conversation.summary ?? "");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleSave = () => {
    update.mutate({
      id: conversation.id,
      candidateId: conversation.candidate_id,
      patch: {
        title: title.trim() || null,
        kind,
        occurred_at: new Date(occurredAt).toISOString(),
        transcript_text: transcript.trim() || null,
        summary: summary.trim() || null,
      },
    });
  };

  const handleDownload = async () => {
    if (!conversation.transcript_path) return;
    const { data } = await supabase.storage
      .from("hiring")
      .createSignedUrl(conversation.transcript_path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  const handleUpload = (file: File | null) => {
    if (!file) return;
    upload.mutate({
      id: conversation.id,
      candidateId: conversation.candidate_id,
      file,
    });
  };

  const displayDate = new Date(conversation.occurred_at).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="rounded-md border border-border bg-surface overflow-hidden">
      {/* Collapsed header — always visible */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-start gap-2.5 px-3.5 py-2.5 text-left hover:bg-bg-subtle transition-colors"
      >
        <span className="mt-0.5 shrink-0 text-text-subtle">
          {expanded ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Chip color={KIND_CHIP_COLOR[conversation.kind]} size="sm">
              {CANDIDATE_CONVERSATION_KIND_LABELS[conversation.kind]}
            </Chip>
            <span className="text-[12px] text-text-subtle tabular-nums">{displayDate}</span>
            {conversation.title ? (
              <span className="text-[13px] font-medium text-text truncate">
                {conversation.title}
              </span>
            ) : null}
          </div>
          {conversation.summary ? (
            <p
              className={cn(
                "mt-1 text-[12.5px] text-text-muted leading-[1.5]",
                !expanded && "line-clamp-2",
              )}
            >
              {conversation.summary}
            </p>
          ) : (
            <p className="mt-1 text-[12px] text-text-subtle italic">Sem resumo</p>
          )}
        </div>
      </button>

      {/* Expanded body */}
      {expanded ? (
        <div className="px-3.5 pb-3.5 pt-1 border-t border-border space-y-3">
          <div className="grid gap-3 md:grid-cols-[1fr_180px_180px]">
            <div className="space-y-1">
              <Label htmlFor={`title-${conversation.id}`} className="text-[11px]">
                Título (opcional)
              </Label>
              <Input
                id={`title-${conversation.id}`}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex.: Discovery call com Ana"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Tipo</Label>
              <Select
                value={kind}
                onValueChange={(v) => setKind(v as CandidateConversationKind)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {KIND_OPTIONS.map((k) => (
                    <SelectItem key={k} value={k}>
                      {CANDIDATE_CONVERSATION_KIND_LABELS[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor={`date-${conversation.id}`} className="text-[11px]">
                Data
              </Label>
              <Input
                id={`date-${conversation.id}`}
                type="datetime-local"
                value={occurredAt}
                onChange={(e) => setOccurredAt(e.target.value)}
              />
            </div>
          </div>

          <Tabs defaultValue="summary" className="space-y-3">
            <TabsList>
              <TabsTrigger value="summary">Resumo</TabsTrigger>
              <TabsTrigger value="transcript">Transcrição</TabsTrigger>
            </TabsList>
            <TabsContent value="summary">
              <Textarea
                rows={4}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Resumo da forma de conversar do candidato, pontos marcantes, impressões…"
              />
              <p className="mt-1 text-[11px] text-text-subtle">
                Esse é o texto que você vê ao consultar o Banco de Talentos.
              </p>
            </TabsContent>
            <TabsContent value="transcript" className="space-y-2">
              <Textarea
                rows={10}
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="Cole a transcrição do Meet aqui…"
              />
              <div className="space-y-1">
                <Label htmlFor={`file-${conversation.id}`} className="text-[11px]">
                  Ou anexe um arquivo (.txt, .vtt, .pdf, .docx)
                </Label>
                <div className="flex items-center gap-2 flex-wrap">
                  <Input
                    id={`file-${conversation.id}`}
                    type="file"
                    accept=".txt,.vtt,.pdf,.docx"
                    onChange={(e) => handleUpload(e.target.files?.[0] ?? null)}
                    disabled={upload.isPending}
                    className="max-w-xs"
                  />
                  {conversation.transcript_path ? (
                    <button
                      type="button"
                      onClick={handleDownload}
                      className="inline-flex items-center gap-1 text-[12px] text-accent-text hover:underline"
                    >
                      <Download className="h-3 w-3" />
                      <FileText className="h-3 w-3" />
                      Baixar anexo atual
                    </button>
                  ) : null}
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <Row justify="between" align="center" className="pt-2 border-t border-border">
            <Btn
              variant="ghost"
              size="sm"
              icon={<Trash2 className="h-3 w-3" />}
              onClick={() => setConfirmDelete(true)}
              className="text-status-red hover:!text-status-red"
            >
              Remover
            </Btn>
            <Btn
              variant="primary"
              size="sm"
              onClick={handleSave}
              disabled={update.isPending}
            >
              {update.isPending ? "Salvando…" : "Salvar alterações"}
            </Btn>
          </Row>
        </div>
      ) : null}

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover conversa?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-text-muted">
            Essa ação é irreversível. A transcrição e o resumo serão apagados.
          </p>
          <DialogFooter>
            <Btn variant="secondary" size="sm" onClick={() => setConfirmDelete(false)}>
              Cancelar
            </Btn>
            <Btn
              variant="danger"
              size="sm"
              disabled={remove.isPending}
              onClick={() => {
                remove.mutate(
                  { id: conversation.id, candidateId: conversation.candidate_id },
                  { onSuccess: () => setConfirmDelete(false) },
                );
              }}
            >
              Remover
            </Btn>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─── New conversation dialog ────────────────────────────────── */

interface NewConversationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidateId: string;
  onCreated: (id: string) => void;
}

function NewConversationDialog({
  open,
  onOpenChange,
  candidateId,
  onCreated,
}: NewConversationDialogProps) {
  const create = useCreateCandidateConversation();
  const [kind, setKind] = useState<CandidateConversationKind>("discovery");
  const [title, setTitle] = useState("");
  const [occurredAt, setOccurredAt] = useState<string>(toLocalInput(new Date().toISOString()));
  const [summary, setSummary] = useState("");

  const handleCreate = () => {
    create.mutate(
      {
        candidate_id: candidateId,
        kind,
        title: title.trim() || null,
        occurred_at: new Date(occurredAt).toISOString(),
        summary: summary.trim() || null,
      },
      {
        onSuccess: (row) => {
          setKind("discovery");
          setTitle("");
          setOccurredAt(toLocalInput(new Date().toISOString()));
          setSummary("");
          onCreated(row.id);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nova conversa</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-[11px]">Tipo</Label>
              <Select value={kind} onValueChange={(v) => setKind(v as CandidateConversationKind)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {KIND_OPTIONS.map((k) => (
                    <SelectItem key={k} value={k}>
                      {CANDIDATE_CONVERSATION_KIND_LABELS[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="new-date" className="text-[11px]">
                Data
              </Label>
              <Input
                id="new-date"
                type="datetime-local"
                value={occurredAt}
                onChange={(e) => setOccurredAt(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="new-title" className="text-[11px]">
              Título (opcional)
            </Label>
            <Input
              id="new-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex.: Discovery call"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="new-summary" className="text-[11px]">
              Resumo rápido (opcional)
            </Label>
            <Textarea
              id="new-summary"
              rows={4}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Primeira impressão, forma de conversar, pontos marcantes…"
            />
            <p className="text-[11px] text-text-subtle">
              A transcrição completa pode ser colada depois ao expandir a conversa.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Btn variant="secondary" size="sm" onClick={() => onOpenChange(false)}>
            Cancelar
          </Btn>
          <Btn
            variant="primary"
            size="sm"
            disabled={create.isPending}
            onClick={handleCreate}
          >
            {create.isPending ? "Criando…" : "Criar conversa"}
          </Btn>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Helpers ────────────────────────────────────────────────── */

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
