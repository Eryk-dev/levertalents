import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Btn } from '@/components/primitives/LinearKit';
import { useScope } from '@/app/providers/ScopeProvider';

/**
 * Dirty-form confirmation dialog — D-05 / UI-SPEC.md § 4.
 * Reads pendingScope from ScopeProvider; opens when ScopeProvider.setScope
 * was blocked by a registered dirty form. Primary CTA "Trocar mesmo assim"
 * confirms the pending change; secondary "Continuar editando" cancels.
 *
 * NOT marked destructive (no red CTA) — losing form state is recoverable;
 * destructive copy is reserved for irreversible deletes (Phase 2-3).
 */
export function DirtyFormConfirmDialog() {
  const { pendingScope, confirmPendingScope, cancelPendingScope } = useScope();

  return (
    <Dialog
      open={pendingScope !== null}
      onOpenChange={(o) => {
        if (!o) cancelPendingScope();
      }}
    >
      <DialogContent className="max-w-[420px] p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="text-[20px] font-semibold text-text leading-[1.2] tracking-[-0.02em]">
            Descartar alterações?
          </DialogTitle>
        </DialogHeader>

        <DialogDescription asChild>
          <p className="px-6 pb-6 text-[13px] text-text-muted leading-[1.5]">
            Você tem alterações não salvas neste formulário. Trocar de escopo
            vai descartar essas alterações.
          </p>
        </DialogDescription>

        <DialogFooter className="px-6 pb-6 gap-2 sm:gap-2 sm:justify-end">
          <Btn
            variant="ghost"
            size="md"
            type="button"
            onClick={cancelPendingScope}
          >
            Continuar editando
          </Btn>
          <Btn
            variant="primary"
            size="md"
            type="button"
            onClick={confirmPendingScope}
            autoFocus
          >
            Trocar mesmo assim
          </Btn>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
