import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, UserPlus, UserX } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  DISCARD_REASONS,
  findDiscardReason,
  type DiscardReason,
} from "@/lib/hiring/discardReasons";

interface DiscardReasonDialogProps {
  open: boolean;
  candidateName?: string;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: (args: {
    reason: DiscardReason;
    addToTalentPool: boolean;
    notes: string | null;
  }) => void;
}

export function DiscardReasonDialog({
  open,
  candidateName,
  loading,
  onCancel,
  onConfirm,
}: DiscardReasonDialogProps) {
  const [reason, setReason] = useState<DiscardReason | null>(null);
  const [talentPool, setTalentPool] = useState(false);
  const [talentPoolTouched, setTalentPoolTouched] = useState(false);
  const [notes, setNotes] = useState("");

  const selected = useMemo(() => findDiscardReason(reason), [reason]);

  // Reset ao fechar para não vazar estado entre candidatos.
  useEffect(() => {
    if (!open) {
      setReason(null);
      setTalentPool(false);
      setTalentPoolTouched(false);
      setNotes("");
    }
  }, [open]);

  // Quando o motivo muda, re-aplica a sugestão — a não ser que o usuário já
  // tenha mexido no switch (respeita a escolha manual).
  useEffect(() => {
    if (selected && !talentPoolTouched) {
      setTalentPool(selected.suggestTalentPool);
    }
  }, [selected, talentPoolTouched]);

  const canSubmit = reason !== null && !loading;

  const handleConfirm = () => {
    if (!reason) return;
    onConfirm({
      reason,
      addToTalentPool: talentPool,
      notes: notes.trim() ? notes.trim() : null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => (!isOpen ? onCancel() : undefined)}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-status-red" />
            Recusar candidato
          </DialogTitle>
          <DialogDescription>
            {candidateName
              ? `Registre o motivo do descarte de ${candidateName} e decida se o candidato volta ao Banco de Talentos.`
              : "Registre o motivo do descarte e decida se o candidato volta ao Banco de Talentos."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Motivo do descarte */}
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-[11px] font-semibold uppercase tracking-[0.06em] text-text-subtle">
                Motivo do descarte
              </Label>
              <span className="text-[11px] text-text-subtle">obrigatório</span>
            </div>
            <div
              role="radiogroup"
              aria-label="Motivo do descarte"
              className="grid gap-1.5 max-h-[280px] overflow-y-auto scrollbar-linear pr-1"
            >
              {DISCARD_REASONS.map((opt) => {
                const isSelected = reason === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => {
                      setReason(opt.value);
                      setTalentPoolTouched(false);
                    }}
                    className={cn(
                      "group flex w-full items-start gap-2.5 rounded-md border px-3 py-2.5 text-left transition-colors",
                      "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent",
                      isSelected
                        ? "border-accent bg-accent-soft"
                        : "border-border hover:border-text-subtle hover:bg-bg-subtle",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-[3px] grid h-3.5 w-3.5 shrink-0 place-items-center rounded-full border",
                        isSelected
                          ? "border-accent bg-accent"
                          : "border-border-strong bg-surface",
                      )}
                    >
                      {isSelected ? (
                        <span className="block h-1.5 w-1.5 rounded-full bg-surface" />
                      ) : null}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="text-[13px] font-medium text-text">{opt.label}</span>
                        {opt.suggestTalentPool ? (
                          <span className="inline-flex items-center gap-1 rounded bg-status-green-soft px-1.5 py-0.5 text-[10px] font-medium text-status-green">
                            <UserPlus className="h-2.5 w-2.5" aria-hidden />
                            sugere banco
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded bg-bg-subtle px-1.5 py-0.5 text-[10px] font-medium text-text-muted">
                            <UserX className="h-2.5 w-2.5" aria-hidden />
                            não sugere banco
                          </span>
                        )}
                      </span>
                      <span className="mt-0.5 block text-[11.5px] text-text-muted">
                        {opt.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Banco de Talentos */}
          <section className="rounded-md border border-border bg-bg-subtle p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Label
                  htmlFor="talent-pool-toggle"
                  className="flex items-center gap-2 text-[13px] font-medium text-text"
                >
                  <UserPlus className="h-3.5 w-3.5" aria-hidden />
                  Adicionar ao Banco de Talentos
                </Label>
                <p className="mt-1 text-[11.5px] text-text-muted">
                  Candidatos no banco podem ser reaproveitados em outras vagas.
                  {selected ? (
                    <span className="ml-1">
                      Sugestão para esse motivo:{" "}
                      <strong className="text-text">
                        {selected.suggestTalentPool ? "incluir" : "não incluir"}
                      </strong>
                      .
                    </span>
                  ) : null}
                </p>
              </div>
              <Switch
                id="talent-pool-toggle"
                checked={talentPool}
                onCheckedChange={(v) => {
                  setTalentPool(v);
                  setTalentPoolTouched(true);
                }}
                aria-label="Adicionar ao Banco de Talentos"
              />
            </div>
          </section>

          {/* Observações opcionais */}
          <section className="space-y-2">
            <Label
              htmlFor="discard-notes"
              className="text-[11px] font-semibold uppercase tracking-[0.06em] text-text-subtle"
            >
              Observações <span className="text-text-subtle normal-case">(opcional)</span>
            </Label>
            <Textarea
              id="discard-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Detalhes adicionais sobre o descarte…"
              rows={3}
              maxLength={500}
              className="text-[13px]"
            />
            <p className="text-[10.5px] text-text-subtle tabular-nums">
              {notes.length}/500
            </p>
          </section>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!canSubmit}
          >
            {loading ? "Registrando…" : "Recusar candidato"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
