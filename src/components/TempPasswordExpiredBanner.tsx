import { AlertTriangle } from 'lucide-react';

export function TempPasswordExpiredBanner() {
  return (
    <div className="bg-status-amber-soft border border-status-amber/40 rounded p-3 flex items-start gap-2 mb-4">
      <AlertTriangle className="size-4 text-status-amber mt-0.5" aria-hidden="true" />
      <p className="text-sm">Sua senha temporária venceu. Por segurança, troque agora antes de continuar.</p>
    </div>
  );
}
