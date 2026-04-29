import { type Dispatch, type KeyboardEvent, type SetStateAction } from "react";
import { X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Chip } from "@/components/primitives/LinearKit";
import { cn } from "@/lib/utils";
import type {
  FieldErrors,
  UseFormRegister,
  UseFormSetValue,
  UseFormWatch,
} from "react-hook-form";
import type { JobFormValues } from "@/components/hiring/JobOpeningForm.schema";
import { CurrencyInput, Field, FieldGroup } from "./_primitives";
import { JobConfidentialPicker } from "./JobConfidentialPicker";

export interface JobCompensationSectionProps {
  register: UseFormRegister<JobFormValues>;
  errors: FieldErrors<JobFormValues>;
  watch: UseFormWatch<JobFormValues>;
  setValue: UseFormSetValue<JobFormValues>;
  benefits: string[];
  setBenefits: Dispatch<SetStateAction<string[]>>;
  benefitInput: string;
  setBenefitInput: Dispatch<SetStateAction<string>>;
  confidential: boolean;
  setConfidential: (v: boolean) => void;
  participants: string[];
  setParticipants: Dispatch<SetStateAction<string[]>>;
  peoplePickerOpen: boolean;
  setPeoplePickerOpen: Dispatch<SetStateAction<boolean>>;
  people: { id: string; full_name: string | null }[];
  peopleById: Map<string, string>;
  surveys: { id: string; name: string }[];
}

/**
 * Sub-seção "Remuneração & acesso" — salário, benefícios, fit cultural, vaga
 * confidencial. Extraída do JobContractSection para manter ≤ 350 linhas.
 */
export function JobCompensationSection({
  register,
  errors,
  watch,
  setValue,
  benefits,
  setBenefits,
  benefitInput,
  setBenefitInput,
  confidential,
  setConfidential,
  participants,
  setParticipants,
  peoplePickerOpen,
  setPeoplePickerOpen,
  people,
  peopleById,
  surveys,
}: JobCompensationSectionProps) {
  const addBenefit = () => {
    const raw = benefitInput.trim().replace(/,$/, "");
    if (!raw) return;
    const s = raw.toLocaleUpperCase("pt-BR");
    if (!benefits.includes(s)) setBenefits([...benefits, s]);
    setBenefitInput("");
  };

  const onBenefitKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addBenefit();
    } else if (e.key === "Backspace" && !benefitInput && benefits.length) {
      setBenefits(benefits.slice(0, -1));
    }
  };

  return (
    <FieldGroup kicker="Remuneração & acesso">
      <Field label="Salário mínimo" error={errors.salary_min_reais?.message}>
        <CurrencyInput
          id="salary_min_reais"
          placeholder="0,00"
          {...register("salary_min_reais")}
        />
      </Field>

      <Field label="Salário máximo" error={errors.salary_max_reais?.message}>
        <CurrencyInput
          id="salary_max_reais"
          placeholder="0,00"
          {...register("salary_max_reais")}
        />
      </Field>

      <Field
        label="Benefícios"
        span={2}
        hint="Digite e tecle Enter ou vírgula para adicionar. Convertido para MAIÚSCULAS automaticamente."
      >
        <div
          className={cn(
            "flex min-h-[38px] flex-wrap items-center gap-1.5 rounded-md border border-border bg-surface px-2 py-1.5",
            "focus-within:ring-2 focus-within:ring-accent/30 focus-within:border-accent",
          )}
        >
          {benefits.map((b) => (
            <Chip key={b} color="neutral" size="sm" className="pl-2 pr-1">
              {b}
              <button
                type="button"
                onClick={() => setBenefits(benefits.filter((x) => x !== b))}
                className="ml-1 inline-flex h-3.5 w-3.5 items-center justify-center rounded-sm text-text-subtle hover:bg-bg-muted hover:text-text"
                aria-label={`Remover ${b}`}
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </Chip>
          ))}
          <input
            value={benefitInput}
            onChange={(e) => setBenefitInput(e.target.value)}
            onKeyDown={onBenefitKey}
            onBlur={addBenefit}
            placeholder={benefits.length ? "" : "VR, plano de saúde, PLR..."}
            className="flex-1 min-w-[120px] bg-transparent text-[13px] text-text placeholder:text-text-subtle outline-none"
          />
        </div>
      </Field>

      <Field
        label="Fit cultural aplicado"
        span={2}
        hint="Candidato preenche junto com a candidatura. Deixe em branco para pedir depois."
      >
        <Select
          value={watch("cultural_fit_survey_id") || "none"}
          onValueChange={(v) =>
            setValue(
              "cultural_fit_survey_id",
              v === "none" ? "" : v,
              { shouldValidate: true },
            )
          }
        >
          <SelectTrigger id="cultural_fit_survey_id" className="h-[34px]">
            <SelectValue placeholder="Nenhum" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Nenhum (coletar depois)</SelectItem>
            {surveys.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <JobConfidentialPicker
        confidential={confidential}
        setConfidential={setConfidential}
        participants={participants}
        setParticipants={setParticipants}
        peoplePickerOpen={peoplePickerOpen}
        setPeoplePickerOpen={setPeoplePickerOpen}
        people={people}
        peopleById={peopleById}
      />
    </FieldGroup>
  );
}
