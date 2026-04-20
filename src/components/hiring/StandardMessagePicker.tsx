import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
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
import { useStandardMessages } from "@/hooks/hiring/useStandardMessages";
import type { StandardMessageKind } from "@/integrations/supabase/hiring-types";

interface StandardMessagePickerProps {
  open: boolean;
  kind: StandardMessageKind;
  confirmLabel?: string;
  onPick: (messageId: string | null) => void;
  onCancel: () => void;
}

export function StandardMessagePicker({
  open,
  kind,
  confirmLabel = "Usar mensagem",
  onPick,
  onCancel,
}: StandardMessagePickerProps) {
  const { data: messages = [] } = useStandardMessages(kind);
  const [selected, setSelected] = useState<string | null>(null);
  const preview = useMemo(() => messages.find((m) => m.id === selected), [messages, selected]);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => (!isOpen ? onCancel() : undefined)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Escolher mensagem padrão</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <Select value={selected ?? undefined} onValueChange={(v) => setSelected(v)}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione a mensagem" />
            </SelectTrigger>
            <SelectContent>
              {messages.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {preview ? (
            <div className="rounded-md border border-border bg-muted/40 p-3 whitespace-pre-wrap text-xs">
              {preview.body_md}
            </div>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button onClick={() => onPick(selected)} disabled={!selected}>
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
