import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface OptimisticMutationToastProps {
  visible: boolean;
  onReload: () => void;
  onDismiss?: () => void;
}

// FR-032/033 — inline fallback banner used by components that don't rely on
// the transient `use-toast` dispatch. The underlying mutation is in
// `useOptimisticVersion`; this is a visual surface for Kanban conflicts and
// long-running forms where the toast disappears before the user sees it.

export function OptimisticMutationToast({ visible, onReload, onDismiss }: OptimisticMutationToastProps) {
  if (!visible) return null;
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm"
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden />
      <div className="flex-1 space-y-1">
        <p className="font-medium text-destructive">Este registro mudou, recarregue e tente de novo</p>
        <p className="text-destructive/80">
          Outra pessoa atualizou este item entre a sua abertura e a sua ação. Recarregar vai buscar a versão mais recente.
        </p>
      </div>
      <Button size="sm" variant="destructive" onClick={onReload} className="shrink-0">
        <RefreshCw className="mr-1 h-3.5 w-3.5" aria-hidden />
        Recarregar
      </Button>
      {onDismiss ? (
        <Button size="sm" variant="ghost" onClick={onDismiss} className="shrink-0">
          Fechar
        </Button>
      ) : null}
    </div>
  );
}
