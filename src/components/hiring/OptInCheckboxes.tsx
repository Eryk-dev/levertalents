import { Checkbox } from "@/components/ui/checkbox";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import type { Control, FieldValues, Path } from "react-hook-form";

/**
 * Plan 02-09 Task 3 — TAL-04 LGPD opt-in não pré-marcado.
 *
 * 3 checkboxes:
 *   1. consent_aplicacao_vaga (OBRIGATÓRIO; literal true; bloqueia submit)
 *      - base legal: LGPD art. 7º V (procedimento pré-contratual)
 *   2. consents.incluir_no_banco_de_talentos_global (opcional; 24 meses)
 *      - base legal: LGPD art. 7º I (consentimento)
 *   3. consents.compartilhar_com_cliente_externo (opcional)
 *      - base legal: LGPD art. 7º I
 *
 * Microcopy locked em UI-SPEC §"LGPD opt-in copy". `defaultChecked={false}`
 * via field.value === true / undefined em Zod schema.
 */
interface OptInCheckboxesProps<T extends FieldValues> {
  control: Control<T>;
}

export function OptInCheckboxes<T extends FieldValues>({
  control,
}: OptInCheckboxesProps<T>) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-text-subtle">
        Como podemos usar seus dados?
      </h3>

      {/* OBRIGATÓRIO — bloqueia submit se não marcado */}
      <FormField
        control={control}
        name={"consent_aplicacao_vaga" as Path<T>}
        render={({ field }) => (
          <FormItem className="flex flex-col gap-1 space-y-0">
            <div className="flex items-start gap-2">
              <FormControl>
                <Checkbox
                  checked={field.value === true}
                  onCheckedChange={(v) => field.onChange(v === true)}
                  id="opt-in-aplicacao-vaga"
                  className="mt-0.5"
                />
              </FormControl>
              <div className="flex-1">
                <FormLabel
                  htmlFor="opt-in-aplicacao-vaga"
                  className="text-[13px] font-medium cursor-pointer"
                >
                  Quero me candidatar a esta vaga.{" "}
                  <span className="text-status-red">*</span>
                </FormLabel>
                <p className="mt-0.5 text-[11px] text-text-muted">
                  Base legal: execução de procedimento pré-contratual a meu
                  pedido (LGPD art. 7º V). Necessário pra esta candidatura.
                </p>
              </div>
            </div>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* OPCIONAL — Banco de Talentos */}
      <FormField
        control={control}
        name={"consents.incluir_no_banco_de_talentos_global" as Path<T>}
        render={({ field }) => (
          <FormItem className="flex items-start gap-2 space-y-0">
            <FormControl>
              <Checkbox
                checked={field.value === true}
                onCheckedChange={(v) => field.onChange(v === true)}
                id="opt-in-banco-talentos"
                className="mt-0.5"
              />
            </FormControl>
            <div className="flex-1">
              <FormLabel
                htmlFor="opt-in-banco-talentos"
                className="text-[13px] cursor-pointer"
              >
                Posso ficar no Banco de Talentos global da Lever Talents.
              </FormLabel>
              <p className="mt-0.5 text-[11px] text-text-muted">
                Base legal: consentimento (LGPD art. 7º I). Você pode ser
                convidado pra outras vagas. Pode revogar a qualquer momento.
                Validade: 24 meses, renovável.
              </p>
            </div>
          </FormItem>
        )}
      />

      {/* OPCIONAL — Compartilhar com cliente externo */}
      <FormField
        control={control}
        name={"consents.compartilhar_com_cliente_externo" as Path<T>}
        render={({ field }) => (
          <FormItem className="flex items-start gap-2 space-y-0">
            <FormControl>
              <Checkbox
                checked={field.value === true}
                onCheckedChange={(v) => field.onChange(v === true)}
                id="opt-in-cliente-externo"
                className="mt-0.5"
              />
            </FormControl>
            <div className="flex-1">
              <FormLabel
                htmlFor="opt-in-cliente-externo"
                className="text-[13px] cursor-pointer"
              >
                Aceito compartilhar meu CV com empresas-clientes da Lever
                Talents quando houver fit.
              </FormLabel>
              <p className="mt-0.5 text-[11px] text-text-muted">
                Base legal: consentimento (LGPD art. 7º I). Cada
                compartilhamento fica registrado e visível pra você. Pode
                revogar a qualquer momento.
              </p>
            </div>
          </FormItem>
        )}
      />
    </div>
  );
}
