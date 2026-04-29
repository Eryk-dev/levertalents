import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Btn } from "@/components/primitives/LinearKit";

export interface CandidateAnonymizeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loading: boolean;
  onConfirm: () => void;
}

/**
 * Dialog de confirmação de anonimização. Operação LGPD definitiva.
 */
export function CandidateAnonymizeDialog({
  open,
  onOpenChange,
  loading,
  onConfirm,
}: CandidateAnonymizeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Anonimizar candidato?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-text-muted">
          Essa ação é definitiva: apaga PII, CV, respostas do Fit e transcrições
          de entrevistas.
        </p>
        <DialogFooter>
          <Btn
            variant="secondary"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Btn>
          <Btn
            variant="danger"
            size="sm"
            disabled={loading}
            onClick={onConfirm}
          >
            Anonimizar
          </Btn>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
