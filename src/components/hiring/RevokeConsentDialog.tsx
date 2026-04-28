import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useRevokeConsent } from "@/hooks/hiring/useCandidateConsents";

interface RevokeConsentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  consentId: string;
  candidateId: string;
  candidateName: string;
}

/**
 * Plan 02-09 Task 2 — AlertDialog confirmação revoke (UI-SPEC §"Destructive
 * actions" copy locked).
 *
 * Title: "Revogar consentimento de {nome}?"
 * Description: "Esse candidato deixa de aparecer no Banco de Talentos a partir
 *   de agora. O histórico de auditoria continua preservado (LGPD §37). Não dá
 *   pra desfazer — só registrando novo consent."
 * Confirm: "Revogar agora" (destructive variant)
 *
 * useRevokeConsent (Plan 06) gravou revoked_at + revoked_by; SQL invariante
 * garante que active_candidate_consents view exclui rows revogados.
 */
export function RevokeConsentDialog({
  open,
  onOpenChange,
  consentId,
  candidateId,
  candidateName,
}: RevokeConsentDialogProps) {
  const revoke = useRevokeConsent();

  const onConfirm = async () => {
    try {
      await revoke.mutateAsync({ consentId, candidateId });
      onOpenChange(false);
    } catch {
      // toast.error já disparado pelo hook (sonner via onError)
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Revogar consentimento de {candidateName}?</AlertDialogTitle>
          <AlertDialogDescription>
            Esse candidato deixa de aparecer no Banco de Talentos a partir de agora.
            O histórico de auditoria continua preservado (LGPD §37).
            Não dá pra desfazer — só registrando novo consent.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={revoke.isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={revoke.isPending}
            className="bg-destructive hover:bg-destructive/90"
          >
            {revoke.isPending ? "Revogando..." : "Revogar agora"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
