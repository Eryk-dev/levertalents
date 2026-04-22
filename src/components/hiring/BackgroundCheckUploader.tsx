import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  FileText,
  Paperclip,
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion,
  Trash2,
  Upload,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Btn, Chip, Row } from "@/components/primitives/LinearKit";
import { supabase } from "@/integrations/supabase/client";
import {
  useBackgroundCheck,
  useUploadBackgroundCheck,
} from "@/hooks/hiring/useBackgroundCheck";
import type { BackgroundStatus } from "@/integrations/supabase/hiring-types";
import { cn } from "@/lib/utils";

interface BackgroundCheckUploaderProps {
  applicationId: string;
  candidateId: string;
  companyId: string;
  jobOpeningId: string;
}

const MAX_BG_BYTES = 20 * 1024 * 1024;
const ALLOWED_BG_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const STATUS_META: Record<
  BackgroundStatus,
  {
    label: string;
    chipColor: "green" | "amber" | "red" | "neutral";
    icon: typeof ShieldCheck;
    description: string;
  }
> = {
  limpo: {
    label: "Limpo",
    chipColor: "green",
    icon: ShieldCheck,
    description: "Sem apontamentos.",
  },
  pendencia_leve: {
    label: "Pendência leve",
    chipColor: "amber",
    icon: ShieldAlert,
    description: "Ocorrências que pedem análise.",
  },
  pendencia_grave: {
    label: "Pendência grave",
    chipColor: "red",
    icon: ShieldAlert,
    description: "Impedimento ou risco alto.",
  },
  nao_aplicavel: {
    label: "Não aplicável",
    chipColor: "neutral",
    icon: ShieldQuestion,
    description: "Não realizada.",
  },
};

export function BackgroundCheckUploader({
  applicationId,
  candidateId,
  companyId,
  jobOpeningId,
}: BackgroundCheckUploaderProps) {
  const { data: existing } = useBackgroundCheck(applicationId);
  const [editorOpen, setEditorOpen] = useState(false);

  const handleOpenFile = async () => {
    if (!existing?.file_path) return;
    const { data } = await supabase.storage
      .from("hiring")
      .createSignedUrl(existing.file_path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  if (!existing) {
    return (
      <>
        <div className="rounded-md border border-dashed border-border bg-bg-subtle/40 px-4 py-3.5">
          <Row justify="between" align="center" gap={10}>
            <Row gap={10} align="center">
              <div className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-bg border border-border text-text-muted">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[12.5px] font-medium text-text">
                  Sem antecedentes registrados
                </p>
                <p className="text-[11.5px] text-text-muted mt-0.5">
                  Faça upload do resultado e marque o status.
                </p>
              </div>
            </Row>
            <Btn
              variant="primary"
              size="sm"
              icon={<Upload className="h-3.5 w-3.5" />}
              onClick={() => setEditorOpen(true)}
            >
              Enviar
            </Btn>
          </Row>
        </div>
        <BackgroundCheckDialog
          open={editorOpen}
          onOpenChange={setEditorOpen}
          applicationId={applicationId}
          candidateId={candidateId}
          companyId={companyId}
          jobOpeningId={jobOpeningId}
          initial={null}
        />
      </>
    );
  }

  const meta = STATUS_META[existing.status_flag];
  const fileName = existing.file_path
    ? existing.file_path.split("/").pop() ?? "arquivo"
    : null;
  const uploadedAt = existing.uploaded_at
    ? new Date(existing.uploaded_at).toLocaleDateString("pt-BR")
    : null;

  return (
    <>
      <div className="rounded-md border border-border bg-bg px-4 py-3.5 space-y-3">
        <Row justify="between" align="start" gap={10}>
          <Row gap={10} align="start">
            <div
              className={cn(
                "inline-flex h-8 w-8 items-center justify-center rounded-md border",
                meta.chipColor === "green"
                  ? "bg-status-green-soft border-status-green/20 text-status-green"
                  : meta.chipColor === "amber"
                  ? "bg-status-amber-soft border-status-amber/20 text-status-amber"
                  : meta.chipColor === "red"
                  ? "bg-status-red-soft border-status-red/20 text-status-red"
                  : "bg-bg-subtle border-border text-text-muted",
              )}
            >
              <meta.icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <Row gap={6} align="center">
                <Chip color={meta.chipColor} size="sm">
                  {meta.label}
                </Chip>
                {uploadedAt ? (
                  <span className="text-[11.5px] text-text-subtle tabular-nums">
                    {uploadedAt}
                  </span>
                ) : null}
              </Row>
              {existing.note ? (
                <p className="mt-1.5 text-[12.5px] text-text leading-[1.5] whitespace-pre-wrap">
                  {existing.note}
                </p>
              ) : (
                <p className="mt-1 text-[11.5px] text-text-subtle">
                  {meta.description}
                </p>
              )}
            </div>
          </Row>
          <Btn
            variant="secondary"
            size="xs"
            onClick={() => setEditorOpen(true)}
          >
            Atualizar
          </Btn>
        </Row>
        {fileName ? (
          <button
            type="button"
            onClick={handleOpenFile}
            className="inline-flex items-center gap-1.5 h-[24px] px-2 rounded border border-border bg-surface text-[11.5px] text-text hover:bg-bg-subtle transition-colors max-w-full"
          >
            <FileText className="h-3 w-3 text-text-subtle shrink-0" />
            <span className="truncate">{fileName}</span>
          </button>
        ) : null}
      </div>
      <BackgroundCheckDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        applicationId={applicationId}
        candidateId={candidateId}
        companyId={companyId}
        jobOpeningId={jobOpeningId}
        initial={{
          statusFlag: existing.status_flag,
          note: existing.note ?? "",
          fileName,
        }}
      />
    </>
  );
}

function BackgroundCheckDialog({
  open,
  onOpenChange,
  applicationId,
  candidateId,
  companyId,
  jobOpeningId,
  initial,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applicationId: string;
  candidateId: string;
  companyId: string;
  jobOpeningId: string;
  initial: { statusFlag: BackgroundStatus; note: string; fileName: string | null } | null;
}) {
  const upload = useUploadBackgroundCheck();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [statusFlag, setStatusFlag] = useState<BackgroundStatus>(
    initial?.statusFlag ?? "limpo",
  );
  const [note, setNote] = useState(initial?.note ?? "");
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    if (open) {
      setStatusFlag(initial?.statusFlag ?? "limpo");
      setNote(initial?.note ?? "");
      setFile(null);
    }
  }, [open, initial]);

  const handleSave = () => {
    if (file) {
      if (file.size > MAX_BG_BYTES) {
        toast.error("Arquivo maior que 20 MB.");
        return;
      }
      if (!ALLOWED_BG_TYPES.includes(file.type)) {
        toast.error("Formato inválido. Use PDF, PNG, JPEG, DOC ou DOCX.");
        return;
      }
    }
    upload.mutate(
      {
        applicationId,
        candidateId,
        companyId,
        jobOpeningId,
        statusFlag,
        note,
        file: file ?? undefined,
      },
      {
        onSuccess: () => onOpenChange(false),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {initial ? "Atualizar antecedentes" : "Enviar antecedentes"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <div className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-text-subtle">
              Status
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {(Object.keys(STATUS_META) as BackgroundStatus[]).map((key) => {
                const meta = STATUS_META[key];
                const selected = statusFlag === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setStatusFlag(key)}
                    className={cn(
                      "inline-flex items-center gap-2 h-[32px] px-2.5 rounded-md border text-[12.5px] font-medium transition-colors text-left",
                      selected
                        ? "border-text bg-bg-subtle text-text"
                        : "border-border bg-surface text-text-muted hover:bg-bg-subtle",
                    )}
                  >
                    <meta.icon
                      className={cn(
                        "h-3.5 w-3.5 shrink-0",
                        selected
                          ? meta.chipColor === "green"
                            ? "text-status-green"
                            : meta.chipColor === "amber"
                            ? "text-status-amber"
                            : meta.chipColor === "red"
                            ? "text-status-red"
                            : "text-text-subtle"
                          : "text-text-subtle",
                      )}
                    />
                    <span className="truncate">{meta.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-text-subtle">
              Nota
            </div>
            <Textarea
              rows={3}
              value={note}
              placeholder="Observações sobre o resultado (opcional)"
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <div className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-text-subtle">
              Arquivo
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,application/pdf,image/png,image/jpeg,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
              onChange={(e) => {
                const picked = e.target.files?.[0] ?? null;
                if (picked) {
                  if (picked.size > MAX_BG_BYTES) {
                    toast.error("Arquivo maior que 20 MB.");
                    e.target.value = "";
                    return;
                  }
                  if (!ALLOWED_BG_TYPES.includes(picked.type)) {
                    toast.error("Formato inválido. Use PDF, PNG, JPEG, DOC ou DOCX.");
                    e.target.value = "";
                    return;
                  }
                }
                setFile(picked);
              }}
            />
            {file ? (
              <Row gap={8} align="center" className="rounded-md border border-border bg-bg-subtle px-2.5 py-1.5">
                <FileText className="h-3.5 w-3.5 text-text-subtle shrink-0" />
                <span className="flex-1 min-w-0 text-[12.5px] text-text truncate">
                  {file.name}
                </span>
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  className="inline-flex h-5 w-5 items-center justify-center rounded hover:bg-bg text-text-subtle hover:text-status-red transition-colors"
                  aria-label="Remover arquivo"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </Row>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full rounded-md border border-dashed border-border bg-bg-subtle/40 px-3 py-3 text-center hover:bg-bg-subtle transition-colors"
              >
                <Paperclip className="mx-auto h-4 w-4 text-text-subtle" />
                <p className="mt-1 text-[12px] text-text">Clique para anexar</p>
                <p className="text-[11px] text-text-subtle">
                  {initial?.fileName
                    ? `Atual: ${initial.fileName}`
                    : "PDF, PNG ou JPG"}
                </p>
              </button>
            )}
          </div>
        </div>

        <DialogFooter>
          <Btn variant="secondary" size="sm" onClick={() => onOpenChange(false)}>
            Cancelar
          </Btn>
          <Btn
            variant="primary"
            size="sm"
            disabled={upload.isPending}
            onClick={handleSave}
          >
            {upload.isPending ? "Salvando…" : "Salvar"}
          </Btn>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
