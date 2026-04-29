import { Building2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  FieldErrors,
  UseFormRegister,
  UseFormSetValue,
  UseFormWatch,
} from "react-hook-form";
import type { JobFormValues } from "@/components/hiring/JobOpeningForm.schema";
import { Field, FieldGroup } from "./_primitives";

export interface JobBasicsSectionProps {
  register: UseFormRegister<JobFormValues>;
  errors: FieldErrors<JobFormValues>;
  watch: UseFormWatch<JobFormValues>;
  setValue: UseFormSetValue<JobFormValues>;
  companies: { id: string; name: string }[];
}

/**
 * Identidade da vaga: empresa, setor, cargo, função resumida.
 * Recebe o react-hook-form plumbing via props (sem useForm interno).
 */
export function JobBasicsSection({
  register,
  errors,
  watch,
  setValue,
  companies,
}: JobBasicsSectionProps) {
  const companyField = watch("company_id");

  return (
    <FieldGroup kicker="Identidade" icon={<Building2 className="h-3 w-3" />}>
      <Field label="Empresa-cliente" required error={errors.company_id?.message}>
        <Select
          value={companyField}
          onValueChange={(v) =>
            setValue("company_id", v, { shouldValidate: true })
          }
        >
          <SelectTrigger id="company_id" className="h-[34px]">
            <SelectValue placeholder="Selecione a empresa" />
          </SelectTrigger>
          <SelectContent>
            {companies.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field label="Setor" hint="Ex.: Tech, Comercial, Financeiro">
        <Input
          id="sector"
          className="h-[34px]"
          placeholder="Opcional"
          {...register("sector")}
        />
      </Field>

      <Field
        label="Cargo"
        required
        span={2}
        error={errors.title?.message}
      >
        <Input
          id="title"
          className="h-[34px]"
          placeholder="Ex.: Backend Sênior, Closer C2, Head of Growth"
          {...register("title")}
        />
      </Field>

      <Field
        label="Função resumida"
        span={2}
        hint="1–2 frases sobre a missão da posição. O descritivo completo é editado depois."
      >
        <Textarea
          id="summary"
          rows={3}
          placeholder="Responsável por..."
          {...register("summary")}
        />
      </Field>
    </FieldGroup>
  );
}
