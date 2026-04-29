import {
  Dialog,
  DialogContent,
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
import { Btn, Row } from "@/components/primitives/LinearKit";
import { APPLICATION_STAGE_LABELS } from "@/lib/hiring/statusMachine";
import type {
  ApplicationRow,
  ApplicationStage,
} from "@/integrations/supabase/hiring-types";

export interface CandidateMoveStageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  active: ApplicationRow | null;
  nextStages: ApplicationStage[];
  moveChoice: ApplicationStage | null;
  onMoveChoiceChange: (choice: ApplicationStage) => void;
  onConfirm: () => Promise<void> | void;
}

/**
 * Dialog "Avançar etapa". Estado vive no shell.
 */
export function CandidateMoveStageDialog({
  open,
  onOpenChange,
  active,
  nextStages,
  moveChoice,
  onMoveChoiceChange,
  onConfirm,
}: CandidateMoveStageDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Avançar etapa</DialogTitle>
        </DialogHeader>
        {active ? (
          <div className="space-y-3">
            <p className="text-sm text-text-muted">
              De{" "}
              <strong className="text-text">
                {APPLICATION_STAGE_LABELS[active.stage]}
              </strong>{" "}
              para:
            </p>
            <Select
              value={moveChoice ?? undefined}
              onValueChange={(v) => onMoveChoiceChange(v as ApplicationStage)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Escolha a próxima etapa" />
              </SelectTrigger>
              <SelectContent>
                {nextStages.map((s) => (
                  <SelectItem key={s} value={s}>
                    {APPLICATION_STAGE_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Row justify="end" gap={8} className="pt-2">
              <Btn
                variant="secondary"
                size="sm"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Btn>
              <Btn
                variant="primary"
                size="sm"
                disabled={!moveChoice}
                onClick={onConfirm}
              >
                Mover
              </Btn>
            </Row>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
