import { useState, useCallback } from 'react';
import * as Sentry from '@sentry/react';
import { Switch } from '@/components/ui/switch';

/**
 * QUAL-06: Session replay toggle. Default OFF.
 *
 * When ON, Sentry replay starts with maskAllText/maskAllInputs already
 * configured in main.tsx Sentry.init. UI-SPEC Surface 3 owns the visual
 * contract and copy.
 *
 * The toggle is local component state for this rev — Phase 4 D-04 deferred
 * server-side persistence; future iteration may persist to user_preferences.
 */
export function SessionReplayToggle() {
  const [enabled, setEnabled] = useState(false);

  const handleToggle = useCallback((next: boolean) => {
    setEnabled(next);
    const replay = Sentry.getReplay();
    if (next) {
      replay?.start();
    } else {
      replay?.stop();
    }
  }, []);

  return (
    <div className="rounded-md border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <label
            htmlFor="session-replay-toggle"
            className="text-[13px] font-normal text-text"
          >
            Replay de sessão (Sentry)
          </label>
          <p className="text-[11px] font-normal text-text-muted">
            Quando ativo, sessões de uso são gravadas para debugging. Todo texto e dados são mascarados automaticamente.
          </p>
        </div>
        <Switch
          id="session-replay-toggle"
          checked={enabled}
          onCheckedChange={handleToggle}
        />
      </div>
      {enabled ? (
        <div className="mt-2 rounded-md border border-status-amber/30 bg-status-amber/10 p-2">
          <p className="text-[11px] font-normal text-status-amber">
            Replay ativo — todo conteúdo da tela é mascarado. Desative quando não precisar mais.
          </p>
        </div>
      ) : null}
    </div>
  );
}
