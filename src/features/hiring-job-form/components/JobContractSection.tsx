import {
  type Dispatch,
  type KeyboardEvent,
  type SetStateAction,
} from "react";
import { Calendar, Clock, Sparkles, X } from "lucide-react";
import { Input } from "@/components/ui/input";
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
  UseFormRegister,
  UseFormSetValue,
  UseFormWatch,
} from "react-hook-form";
import type {
  ContractType,
  WorkMode,
} from "@/integrations/supabase/hiring-types";
import {
  type JobFormValues,
  type Shift,
  SHIFTS,
} from "@/components/hiring/JobOpeningForm.schema";
import { Field, FieldGroup } from "./_primitives";

const WORK_MODES: { v: WorkMode; label: string }[] = [
  { v: "presencial", label: "Presencial" },
  { v: "remoto", label: "Remoto" },
  { v: "hibrido", label: "Híbrido" },
];

const CONTRACTS: { v: ContractType; label: string }[] = [
  { v: "clt", label: "CLT" },
  { v: "pj", label: "PJ" },
  { v: "estagio", label: "Estágio" },
  { v: "pj_equity", label: "PJ + equity" },
];

export interface JobContractSectionProps {
  register: UseFormRegister<JobFormValues>;
  watch: UseFormWatch<JobFormValues>;
  setValue: UseFormSetValue<JobFormValues>;
  // Skills state lives in shell (not in RHF schema; persisted as side-payload)
  skills: string[];
  setSkills: Dispatch<SetStateAction<string[]>>;
  skillInput: string;
  setSkillInput: Dispatch<SetStateAction<string>>;
}

/**
 * Sub-seção "Escopo" da JobOpeningForm — modalidade, contratação, carga horária,
 * vagas, turno, prazo, competências.
 *
 * Estado de skills vive no shell e é passado via props (não faz parte do schema
 * Zod do RHF — é side-payload persistido em job_descriptions.required_skills).
 */
export function JobContractSection({
  register,
  watch,
  setValue,
  skills,
  setSkills,
  skillInput,
  setSkillInput,
}: JobContractSectionProps) {
  const workMode = watch("work_mode");
  const contract = watch("contract_type");
  const shift = watch("shift");

  const addSkill = () => {
    const s = skillInput.trim().replace(/,$/, "");
    if (!s) return;
    if (!skills.includes(s)) setSkills([...skills, s]);
    setSkillInput("");
  };

  const onSkillKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addSkill();
    } else if (e.key === "Backspace" && !skillInput && skills.length) {
      setSkills(skills.slice(0, -1));
    }
  };

  return (
    <FieldGroup kicker="Escopo" icon={<Clock className="h-3 w-3" />}>
      <Field label="Modalidade">
        <Select
          value={workMode}
          onValueChange={(v) => setValue("work_mode", v as WorkMode)}
        >
          <SelectTrigger id="work_mode" className="h-[34px]">
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent>
            {WORK_MODES.map((m) => (
              <SelectItem key={m.v} value={m.v}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field label="Contratação">
        <Select
          value={contract}
          onValueChange={(v) => setValue("contract_type", v as ContractType)}
        >
          <SelectTrigger id="contract_type" className="h-[34px]">
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent>
            {CONTRACTS.map((c) => (
              <SelectItem key={c.v} value={c.v}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field label="Carga horária" hint="Horas por semana">
        <div className="relative">
          <Input
            id="hours_per_week"
            type="number"
            min={1}
            max={80}
            className="h-[34px] pr-[38px]"
            placeholder="40"
            {...register("hours_per_week")}
          />
          <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[11.5px] text-text-subtle">
            h/sem
          </span>
        </div>
      </Field>

      <Field label="Vagas" hint="Número de posições">
        <Input
          id="num_openings"
          type="number"
          min={1}
          className="h-[34px]"
          placeholder="1"
          {...register("num_openings")}
        />
      </Field>

      <Field label="Turno">
        <Select
          value={shift ?? ""}
          onValueChange={(v) => setValue("shift", v as Shift)}
        >
          <SelectTrigger id="shift" className="h-[34px]">
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent>
            {SHIFTS.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field
        label="Prazo desejado"
        hint="Para fechar a vaga"
        icon={<Calendar className="h-3 w-3" />}
      >
        <Input
          id="target_deadline"
          type="date"
          className="h-[34px]"
          {...register("target_deadline")}
        />
      </Field>

      <Field
        label="Competências"
        span={2}
        icon={<Sparkles className="h-3 w-3" />}
        hint="Digite e tecle Enter ou vírgula para adicionar. Backspace remove a última."
      >
        <div
          className={cn(
            "flex min-h-[38px] flex-wrap items-center gap-1.5 rounded-md border border-border bg-surface px-2 py-1.5",
            "focus-within:ring-2 focus-within:ring-accent/30 focus-within:border-accent",
          )}
        >
          {skills.map((s) => (
            <Chip key={s} color="neutral" size="sm" className="pl-2 pr-1">
              {s}
              <button
                type="button"
                onClick={() => setSkills(skills.filter((x) => x !== s))}
                className="ml-1 inline-flex h-3.5 w-3.5 items-center justify-center rounded-sm text-text-subtle hover:bg-bg-muted hover:text-text"
                aria-label={`Remover ${s}`}
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </Chip>
          ))}
          <input
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            onKeyDown={onSkillKey}
            onBlur={addSkill}
            placeholder={skills.length ? "" : "SQL, React, comunicação..."}
            className="flex-1 min-w-[120px] bg-transparent text-[13px] text-text placeholder:text-text-subtle outline-none"
          />
        </div>
      </Field>
    </FieldGroup>
  );
}
