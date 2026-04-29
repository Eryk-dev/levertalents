import { type Dispatch, type SetStateAction } from "react";
import { Check, ChevronDown, Lock, Users, X } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Chip, LinearAvatar } from "@/components/primitives/LinearKit";

export interface JobConfidentialPickerProps {
  confidential: boolean;
  setConfidential: (v: boolean) => void;
  participants: string[];
  setParticipants: Dispatch<SetStateAction<string[]>>;
  peoplePickerOpen: boolean;
  setPeoplePickerOpen: Dispatch<SetStateAction<boolean>>;
  people: { id: string; full_name: string | null }[];
  peopleById: Map<string, string>;
}

/**
 * Sub-controle "Vaga confidencial" + seletor de pessoas autorizadas.
 * Extraído do JobContractSection para manter sub-sections ≤ 350 linhas.
 */
export function JobConfidentialPicker({
  confidential,
  setConfidential,
  participants,
  setParticipants,
  peoplePickerOpen,
  setPeoplePickerOpen,
  people,
  peopleById,
}: JobConfidentialPickerProps) {
  return (
    <div className="md:col-span-2 mt-1 rounded-md border border-border bg-bg-subtle/50 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0">
          <Lock
            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-text-muted"
            strokeWidth={1.75}
          />
          <div className="min-w-0">
            <div className="text-[13px] font-medium text-text">
              Vaga confidencial
            </div>
            <div className="text-[11.5px] text-text-muted">
              Limita a visibilidade às pessoas que você selecionar abaixo.
            </div>
          </div>
        </div>
        <Switch
          checked={confidential}
          onCheckedChange={(v) => {
            setConfidential(!!v);
            if (!v) setParticipants([]);
          }}
          aria-label="Alternar vaga confidencial"
        />
      </div>

      {confidential && (
        <div className="mt-3 space-y-1">
          <Label className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-[0.04em] text-text-subtle">
            <Users className="h-3 w-3" /> Pessoas autorizadas
          </Label>
          <Popover open={peoplePickerOpen} onOpenChange={setPeoplePickerOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="flex h-auto min-h-[34px] w-full items-center justify-between gap-2 rounded-md border border-border bg-surface px-2.5 py-1.5 text-left text-[13px] text-text hover:border-border-strong"
              >
                <div className="flex flex-wrap items-center gap-1.5">
                  {participants.length === 0 ? (
                    <span className="text-text-subtle">
                      Selecione pessoas...
                    </span>
                  ) : (
                    participants.map((id) => (
                      <Chip
                        key={id}
                        color="neutral"
                        size="sm"
                        className="gap-1.5"
                      >
                        <LinearAvatar
                          name={peopleById.get(id) ?? "?"}
                          size={14}
                        />
                        {peopleById.get(id) ?? "—"}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setParticipants(
                              participants.filter((p) => p !== id),
                            );
                          }}
                          className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-sm text-text-subtle hover:bg-bg-muted hover:text-text"
                          aria-label="Remover"
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </Chip>
                    ))
                  )}
                </div>
                <ChevronDown className="h-3.5 w-3.5 shrink-0 text-text-subtle" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-[320px] p-0" align="start">
              <Command>
                <CommandInput placeholder="Buscar pessoa..." className="h-9" />
                <CommandList>
                  <CommandEmpty>Nenhuma pessoa encontrada.</CommandEmpty>
                  <CommandGroup>
                    {people.map((p) => {
                      const selected = participants.includes(p.id);
                      return (
                        <CommandItem
                          key={p.id}
                          value={p.full_name ?? p.id}
                          onSelect={() =>
                            setParticipants(
                              selected
                                ? participants.filter((x) => x !== p.id)
                                : [...participants, p.id],
                            )
                          }
                          className="flex items-center gap-2"
                        >
                          <LinearAvatar name={p.full_name ?? "?"} size={20} />
                          <span className="flex-1 truncate text-[13px]">
                            {p.full_name ?? "—"}
                          </span>
                          {selected && (
                            <Check className="h-3.5 w-3.5 text-accent" />
                          )}
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      )}
    </div>
  );
}
