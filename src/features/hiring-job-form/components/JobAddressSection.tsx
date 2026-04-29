import { MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import type { UseFormRegister } from "react-hook-form";
import type { JobFormValues } from "@/components/hiring/JobOpeningForm.schema";
import { Field, FieldGroup } from "./_primitives";

export interface JobAddressSectionProps {
  register: UseFormRegister<JobFormValues>;
  overrideAddress: boolean;
  setOverrideAddress: (v: boolean) => void;
}

/**
 * Sub-seção "Local de trabalho" — toggle de endereço próprio + campos de endereço.
 * O estado `overrideAddress` é não-Zod (controlado no shell).
 */
export function JobAddressSection({
  register,
  overrideAddress,
  setOverrideAddress,
}: JobAddressSectionProps) {
  return (
    <FieldGroup kicker="Local de trabalho" icon={<MapPin className="h-3 w-3" />}>
      <div className="md:col-span-2 rounded-md border border-border bg-bg-subtle/50 p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5 min-w-0">
            <MapPin
              className="mt-0.5 h-3.5 w-3.5 shrink-0 text-text-muted"
              strokeWidth={1.75}
            />
            <div className="min-w-0">
              <div className="text-[13px] font-medium text-text">
                Endereço diferente da empresa?
              </div>
              <div className="text-[11.5px] text-text-muted">
                Ative se esta vaga tiver um local de trabalho próprio.
              </div>
            </div>
          </div>
          <Switch
            checked={overrideAddress}
            onCheckedChange={(v) => setOverrideAddress(!!v)}
            aria-label="Alternar endereço próprio da vaga"
          />
        </div>
      </div>

      {overrideAddress ? (
        <>
          <Field label="Rua" span={2}>
            <Input
              id="address_street"
              className="h-[34px]"
              placeholder="Nome da rua ou avenida"
              {...register("address_street")}
            />
          </Field>
          <Field label="Número">
            <Input
              id="address_number"
              className="h-[34px]"
              placeholder="Ex.: 123"
              {...register("address_number")}
            />
          </Field>
          <Field label="Complemento">
            <Input
              id="address_complement"
              className="h-[34px]"
              placeholder="Apto, sala…"
              {...register("address_complement")}
            />
          </Field>
          <Field label="Bairro">
            <Input
              id="address_neighborhood"
              className="h-[34px]"
              placeholder="Bairro"
              {...register("address_neighborhood")}
            />
          </Field>
          <Field label="Cidade">
            <Input
              id="address_city"
              className="h-[34px]"
              placeholder="Cidade"
              {...register("address_city")}
            />
          </Field>
          <Field label="Estado">
            <Input
              id="address_state"
              className="h-[34px]"
              placeholder="UF"
              maxLength={2}
              {...register("address_state")}
            />
          </Field>
          <Field label="CEP">
            <Input
              id="address_zip"
              className="h-[34px]"
              placeholder="00000-000"
              {...register("address_zip")}
            />
          </Field>
        </>
      ) : (
        <div className="md:col-span-2 text-[12.5px] text-text-muted pl-1">
          O endereço da vaga será o mesmo cadastrado na empresa selecionada.
        </div>
      )}
    </FieldGroup>
  );
}
