import { Sliders } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { useCardPreferences } from "@/hooks/hiring/useCardPreferences";
import {
  OPTIONAL_FIELDS,
  isFieldEnabled,
  type OptionalField,
} from "@/lib/hiring/cardCustomization";

/**
 * CardFieldsCustomizer — Phase 2 D-08 (Plan 02-08).
 *
 * Popover com checkboxes para habilitar/desabilitar os 6 OPTIONAL_FIELDS
 * que decoram o `CandidateCard` no kanban. Mínimo fixo (D-07: nome + cargo
 * + dias-na-etapa + vaga) NÃO mora aqui — sempre rendered.
 *
 * Persiste via `useCardPreferences` hook (Plan 02-06) que faz
 * load/save em `localStorage.leverup:rs:card-fields:{userId}` com
 * Zod safeParse contra tampering (T-02-08-03 mitigation).
 *
 * Trigger: ícone Sliders neutro (sem brand). Anchor "end" alinha o popover
 * à direita do botão para evitar clipping em column header overflow.
 */

const FIELD_LABELS: Record<OptionalField, string> = {
  avatar: "Avatar",
  next_interview: "Próxima entrevista",
  cv_icon: "Ícone CV",
  fit_score: "Score Fit Cultural",
  bg_check_dot: "Status background check",
  source_tag: "Origem (LinkedIn, Site...)",
};

export function CardFieldsCustomizer() {
  const [prefs, update] = useCardPreferences();

  const toggle = (field: OptionalField) => {
    const isOn = isFieldEnabled(prefs, field);
    const nextEnabled: OptionalField[] = isOn
      ? prefs.enabledFields.filter((f) => f !== field)
      : [...prefs.enabledFields, field];
    update({ ...prefs, enabledFields: nextEnabled });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2"
          aria-label="Customizar campos do card"
        >
          <Sliders className="w-3.5 h-3.5" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="end">
        <div className="text-[11px] uppercase tracking-wider text-text-muted mb-2">
          Campos do card
        </div>
        <div className="flex flex-col gap-2">
          {OPTIONAL_FIELDS.map((field) => {
            const checked = isFieldEnabled(prefs, field);
            return (
              <label
                key={field}
                className="flex items-center gap-2 cursor-pointer text-[13px]"
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={() => toggle(field)}
                  aria-label={FIELD_LABELS[field]}
                />
                <span>{FIELD_LABELS[field]}</span>
              </label>
            );
          })}
        </div>
        <div className="mt-3 text-[10.5px] text-text-muted leading-snug">
          Suas preferências são salvas localmente. Outros usuários têm
          configuração própria.
        </div>
      </PopoverContent>
    </Popover>
  );
}
