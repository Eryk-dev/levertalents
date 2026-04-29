import {
  Check,
  Copy,
  Link as LinkIcon,
  Mail,
  MessageCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Btn } from "@/components/primitives/LinearKit";
import type { CulturalFitSurveyRow } from "@/integrations/supabase/hiring-types";

export interface CandidateFitLinkDialogProps {
  open: boolean;
  onClose: () => void;
  surveys: CulturalFitSurveyRow[];
  surveyId: string | null;
  onSurveyIdChange: (id: string) => void;
  issuedLink: { url: string; expiresAt: string } | null;
  isGenerating: boolean;
  onGenerate: () => void;
  onResetIssued: () => void;
  linkCopied: boolean;
  onCopyLink: () => void;
  onSendWhatsapp: () => void;
  onSendEmail: () => void;
  candidateEmail: string | null;
}

/**
 * Dialog de geração + envio de link de Fit Cultural.
 * Estado vive no shell (CandidateProfile); este componente é puramente visual.
 */
export function CandidateFitLinkDialog({
  open,
  onClose,
  surveys,
  surveyId,
  onSurveyIdChange,
  issuedLink,
  isGenerating,
  onGenerate,
  onResetIssued,
  linkCopied,
  onCopyLink,
  onSendWhatsapp,
  onSendEmail,
  candidateEmail,
}: CandidateFitLinkDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => (o ? null : onClose())}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {issuedLink ? "Link gerado" : "Enviar Fit Cultural"}
          </DialogTitle>
        </DialogHeader>
        {issuedLink ? (
          <div className="space-y-4">
            <p className="text-[13px] text-text-muted">
              Compartilhe o link abaixo com o candidato.{" "}
              <span className="text-text">
                Expira em{" "}
                {new Date(issuedLink.expiresAt).toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                .
              </span>
            </p>
            <div className="flex items-center gap-1.5 rounded-md border border-border bg-bg-subtle pl-2.5 pr-1 py-1">
              <LinkIcon className="h-3.5 w-3.5 text-text-subtle shrink-0" />
              <input
                readOnly
                value={issuedLink.url}
                onFocus={(e) => e.currentTarget.select()}
                className="flex-1 min-w-0 bg-transparent text-[12.5px] text-text outline-none truncate"
              />
              <Btn
                variant={linkCopied ? "secondary" : "primary"}
                size="xs"
                icon={
                  linkCopied ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )
                }
                onClick={onCopyLink}
              >
                {linkCopied ? "Copiado" : "Copiar"}
              </Btn>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Btn
                variant="secondary"
                size="sm"
                icon={<MessageCircle className="h-3.5 w-3.5" />}
                onClick={onSendWhatsapp}
              >
                WhatsApp
              </Btn>
              <Btn
                variant="secondary"
                size="sm"
                icon={<Mail className="h-3.5 w-3.5" />}
                onClick={onSendEmail}
                disabled={!candidateEmail}
              >
                Email
              </Btn>
            </div>
            <DialogFooter className="pt-1">
              <Btn variant="ghost" size="sm" onClick={onResetIssued}>
                Gerar novo
              </Btn>
              <Btn variant="primary" size="sm" onClick={onClose}>
                Fechar
              </Btn>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-[13px] text-text-muted">
              Escolha o questionário e gere um link único. Validade: 3 dias.
            </p>
            {surveys.length ? (
              <Select
                value={surveyId ?? undefined}
                onValueChange={onSurveyIdChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o questionário" />
                </SelectTrigger>
                <SelectContent>
                  {surveys.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-[13px] text-text-muted">
                Nenhum questionário ativo. Crie um em Fit Cultural.
              </p>
            )}
            <DialogFooter>
              <Btn variant="secondary" size="sm" onClick={onClose}>
                Cancelar
              </Btn>
              <Btn
                variant="primary"
                size="sm"
                disabled={!surveyId || isGenerating}
                onClick={onGenerate}
              >
                {isGenerating ? "Gerando…" : "Gerar link"}
              </Btn>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
