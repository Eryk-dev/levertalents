import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * Primitives compartilhados pelas sub-sections da JobOpeningForm.
 * Mantidos privados ao feature folder (prefixo `_`).
 */

export function FieldGroup({
  kicker,
  icon,
  children,
}: {
  kicker: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-text-subtle">
        {icon}
        {kicker}
      </div>
      <div className="grid grid-cols-1 gap-x-4 gap-y-3.5 md:grid-cols-2">
        {children}
      </div>
    </section>
  );
}

export function Divider() {
  return <div className="my-5 h-px bg-border" />;
}

export function Field({
  label,
  required,
  hint,
  error,
  icon,
  span = 1,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  icon?: React.ReactNode;
  span?: 1 | 2;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("space-y-1", span === 2 && "md:col-span-2")}>
      <Label className="flex items-center gap-1 text-[11.5px] font-medium text-text">
        {icon && <span className="text-text-subtle">{icon}</span>}
        {label}
        {required && <span className="text-status-red">*</span>}
      </Label>
      {children}
      {error ? (
        <p className="text-[11px] text-status-red">{error}</p>
      ) : hint ? (
        <p className="text-[11px] text-text-subtle">{hint}</p>
      ) : null}
    </div>
  );
}

export const CurrencyInput = ({
  id,
  placeholder,
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & { id: string }) => {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[12px] font-medium text-text-subtle">
        R$
      </span>
      <Input
        id={id}
        type="number"
        min={0}
        step="0.01"
        inputMode="decimal"
        className="h-[34px] pl-8 tabular-nums"
        placeholder={placeholder}
        {...rest}
      />
    </div>
  );
};
