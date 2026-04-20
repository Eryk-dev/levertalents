import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Building2,
  Globe,
  Instagram,
  Linkedin,
  MapPin,
  Sparkles,
  Upload,
  X,
  Tag,
  AlignLeft,
  Star,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Btn, Chip, Row } from "@/components/primitives/LinearKit";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import type { CompanyRow } from "@/integrations/supabase/hiring-types";

const BR_STATES = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS",
  "MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC",
  "SP","SE","TO",
];

const optionalUrl = z
  .string()
  .url("URL inválida")
  .optional()
  .or(z.literal(""));

const schema = z.object({
  name: z.string().min(1, "Nome obrigatório"),
  tagline: z.string().optional(),
  website: optionalUrl,
  overview: z.string().optional(),
  differentials: z.string().optional(),
  address_street: z.string().optional(),
  address_number: z.string().optional(),
  address_complement: z.string().optional(),
  address_neighborhood: z.string().optional(),
  address_city: z.string().optional(),
  address_state: z.string().optional(),
  address_zip: z
    .string()
    .regex(/^\d{5}-?\d{3}$/, "CEP inválido")
    .optional()
    .or(z.literal("")),
  address_country: z.string().optional(),
  linkedin_url: optionalUrl,
  instagram_url: optionalUrl,
});

type FormValues = z.infer<typeof schema>;

interface CompanyDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company: CompanyRow | null;
  onSaved: () => void;
}

export function CompanyDrawer({ open, onOpenChange, company, onSaved }: CompanyDrawerProps) {
  const isEdit = !!company;
  const [values, setValues] = useState<string[]>([]);
  const [valueInput, setValueInput] = useState("");
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { register, handleSubmit, formState, reset, control } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {},
  });

  useEffect(() => {
    if (open) {
      if (company) {
        reset({
          name: company.name,
          tagline: company.tagline ?? "",
          website: company.website ?? "",
          overview: company.overview ?? "",
          differentials: company.differentials ?? "",
          address_street: company.address_street ?? "",
          address_number: company.address_number ?? "",
          address_complement: company.address_complement ?? "",
          address_neighborhood: company.address_neighborhood ?? "",
          address_city: company.address_city ?? "",
          address_state: company.address_state ?? "",
          address_zip: company.address_zip ?? "",
          address_country: company.address_country ?? "Brasil",
          linkedin_url: company.linkedin_url ?? "",
          instagram_url: company.instagram_url ?? "",
        });
        setValues(company.values_list ?? []);
        setLogoPreview(company.logo_url ?? null);
      } else {
        reset({
          name: "",
          tagline: "",
          website: "",
          overview: "",
          differentials: "",
          address_street: "",
          address_number: "",
          address_complement: "",
          address_neighborhood: "",
          address_city: "",
          address_state: "",
          address_zip: "",
          address_country: "Brasil",
          linkedin_url: "",
          instagram_url: "",
        });
        setValues([]);
        setLogoPreview(null);
        setValueInput("");
      }
    }
  }, [open, company, reset]);

  const addValue = () => {
    const v = valueInput.trim();
    if (v && !values.includes(v)) setValues((prev) => [...prev, v]);
    setValueInput("");
  };

  const onValueKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addValue();
    } else if (e.key === "Backspace" && !valueInput) {
      setValues((prev) => prev.slice(0, -1));
    }
  };

  const handleLogoUpload = async (file: File) => {
    if (!company?.id) {
      toast.error("Salve a empresa antes de fazer upload do logo");
      return;
    }
    const ext = file.name.split(".").pop() ?? "png";
    const path = `${company.id}/logo-${Date.now()}.${ext}`;
    setUploading(true);
    try {
      const { error: upErr } = await supabase.storage
        .from("company-assets")
        .upload(path, file, { upsert: true });
      if (upErr) throw upErr;

      const { data: pubData } = supabase.storage
        .from("company-assets")
        .getPublicUrl(path);
      const publicUrl = pubData.publicUrl;

      const { error: updateErr } = await supabase
        .from("companies")
        .update({ logo_url: publicUrl })
        .eq("id", company.id);
      if (updateErr) throw updateErr;

      setLogoPreview(publicUrl);
      toast.success("Logo atualizado");
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao fazer upload do logo");
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (data: FormValues) => {
    const payload = {
      name: data.name,
      tagline: data.tagline || null,
      website: data.website || null,
      overview: data.overview || null,
      values_list: values,
      differentials: data.differentials || null,
      address_street: data.address_street || null,
      address_number: data.address_number || null,
      address_complement: data.address_complement || null,
      address_neighborhood: data.address_neighborhood || null,
      address_city: data.address_city || null,
      address_state: data.address_state || null,
      address_zip: data.address_zip || null,
      address_country: data.address_country || null,
      linkedin_url: data.linkedin_url || null,
      instagram_url: data.instagram_url || null,
    };

    try {
      if (isEdit && company) {
        const { error } = await supabase
          .from("companies")
          .update(payload)
          .eq("id", company.id);
        if (error) throw error;
        toast.success("Empresa atualizada");
      } else {
        const { error } = await supabase.from("companies").insert(payload);
        if (error) throw error;
        toast.success("Empresa criada");
      }
      onOpenChange(false);
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar empresa");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[720px] p-0 gap-0 overflow-hidden flex flex-col max-h-[min(92vh,820px)] bg-bg border border-border"
      >
        <DialogHeader className="shrink-0 px-5 py-4 border-b border-border bg-surface space-y-0 text-left">
          <div className="flex items-center gap-3 pr-6">
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-bg-subtle border border-border">
              <Building2 className="h-3.5 w-3.5 text-text-muted" strokeWidth={1.75} />
            </span>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-[15px] font-semibold tracking-[-0.01em] text-text">
                {isEdit ? company?.name || "Editar empresa" : "Nova empresa"}
              </DialogTitle>
              <DialogDescription className="text-[11.5px] text-text-muted mt-0.5">
                {isEdit ? "Edite o perfil público da empresa" : "Preencha os dados para criar a empresa"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col flex-1 min-h-0"
        >
          <div className="flex-1 min-h-0 overflow-y-auto px-5 py-5 space-y-6 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">

            <FieldGroup kicker="Identidade" icon={<Building2 className="h-3 w-3" />}>
              <Field label="Nome" required error={formState.errors.name?.message} span={2}>
                <Input
                  className="h-[34px] text-[13px]"
                  placeholder="Ex: Lever Talents"
                  {...register("name")}
                />
              </Field>
              <Field label="Tagline" error={formState.errors.tagline?.message} span={2}>
                <Input
                  className="h-[34px] text-[13px]"
                  placeholder="Uma frase que resume a empresa"
                  {...register("tagline")}
                />
              </Field>
              <Field label="Website" icon={<Globe className="h-3 w-3" />} error={formState.errors.website?.message} span={2}>
                <Input
                  className="h-[34px] text-[13px]"
                  placeholder="https://empresa.com.br"
                  type="url"
                  {...register("website")}
                />
              </Field>
            </FieldGroup>

            <Divider />

            <FieldGroup kicker="Sobre" icon={<AlignLeft className="h-3 w-3" />}>
              <Field label="Nosso negócio" hint="Texto que aparece na página pública de vagas" span={2}>
                <Textarea
                  rows={4}
                  placeholder="Descreva a empresa, o que faz, sua missão..."
                  className="text-[13px] resize-none"
                  {...register("overview")}
                />
              </Field>

              <Field
                label="Valores & cultura"
                icon={<Sparkles className="h-3 w-3" />}
                hint="Enter ou vírgula para adicionar. Backspace remove o último."
                span={2}
              >
                <div
                  className={cn(
                    "flex min-h-[38px] flex-wrap items-center gap-1.5 rounded-md border border-border bg-surface px-2 py-1.5",
                    "focus-within:ring-2 focus-within:ring-accent/30 focus-within:border-accent",
                  )}
                >
                  {values.map((v) => (
                    <Chip key={v} color="neutral" size="sm" className="pl-2 pr-1">
                      {v}
                      <button
                        type="button"
                        onClick={() => setValues(values.filter((x) => x !== v))}
                        className="ml-1 inline-flex h-3.5 w-3.5 items-center justify-center rounded-sm text-text-subtle hover:bg-bg-muted hover:text-text"
                        aria-label={`Remover ${v}`}
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </Chip>
                  ))}
                  <input
                    value={valueInput}
                    onChange={(e) => setValueInput(e.target.value)}
                    onKeyDown={onValueKey}
                    onBlur={addValue}
                    placeholder={values.length ? "" : "Inovação, Transparência, Pessoas..."}
                    className="flex-1 min-w-[120px] bg-transparent text-[13px] text-text placeholder:text-text-subtle outline-none"
                  />
                </div>
              </Field>

              <Field label="Diferenciais culturais" icon={<Star className="h-3 w-3" />} hint='Seção "VemSer..." na página pública' span={2}>
                <Textarea
                  rows={3}
                  placeholder="O que torna essa empresa especial para trabalhar..."
                  className="text-[13px] resize-none"
                  {...register("differentials")}
                />
              </Field>
            </FieldGroup>

            <Divider />

            <FieldGroup kicker="Endereço" icon={<MapPin className="h-3 w-3" />}>
              <Field label="Rua / Av." span={2} error={formState.errors.address_street?.message}>
                <Input className="h-[34px] text-[13px]" placeholder="Rua das Flores" {...register("address_street")} />
              </Field>
              <Field label="Número" error={formState.errors.address_number?.message}>
                <Input className="h-[34px] text-[13px]" placeholder="123" {...register("address_number")} />
              </Field>
              <Field label="Complemento" error={formState.errors.address_complement?.message}>
                <Input className="h-[34px] text-[13px]" placeholder="Sala 4" {...register("address_complement")} />
              </Field>
              <Field label="Bairro" error={formState.errors.address_neighborhood?.message}>
                <Input className="h-[34px] text-[13px]" placeholder="Centro" {...register("address_neighborhood")} />
              </Field>
              <Field label="Cidade" error={formState.errors.address_city?.message}>
                <Input className="h-[34px] text-[13px]" placeholder="São Paulo" {...register("address_city")} />
              </Field>
              <Field label="Estado" error={formState.errors.address_state?.message}>
                <Controller
                  name="address_state"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value ?? ""} onValueChange={field.onChange}>
                      <SelectTrigger className="h-[34px] text-[13px]">
                        <SelectValue placeholder="UF" />
                      </SelectTrigger>
                      <SelectContent>
                        {BR_STATES.map((s) => (
                          <SelectItem key={s} value={s} className="text-[13px]">{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>
              <Field label="CEP" error={formState.errors.address_zip?.message}>
                <Input className="h-[34px] text-[13px]" placeholder="00000-000" {...register("address_zip")} />
              </Field>
              <Field label="País" error={formState.errors.address_country?.message}>
                <Input className="h-[34px] text-[13px]" placeholder="Brasil" {...register("address_country")} />
              </Field>
            </FieldGroup>

            <Divider />

            <FieldGroup kicker="Marca" icon={<Tag className="h-3 w-3" />}>
              <div className="md:col-span-2">
                <Label className="flex items-center gap-1 text-[11.5px] font-medium text-text mb-1.5">
                  Logo da empresa
                </Label>
                <div className="flex items-center gap-3">
                  {logoPreview ? (
                    <img
                      src={logoPreview}
                      alt="Logo"
                      className="h-16 w-16 object-contain rounded-md border border-border bg-surface"
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-md border border-dashed border-border bg-bg-subtle flex items-center justify-center text-text-subtle">
                      <Building2 className="h-5 w-5" strokeWidth={1.5} />
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <Btn
                      type="button"
                      variant="secondary"
                      size="sm"
                      icon={<Upload className="h-3 w-3" />}
                      disabled={uploading || !isEdit}
                      onClick={() => fileRef.current?.click()}
                    >
                      {uploading ? "Enviando..." : "Escolher arquivo"}
                    </Btn>
                    {!isEdit && (
                      <p className="text-[11px] text-text-subtle">Salve a empresa primeiro para fazer upload do logo</p>
                    )}
                    <p className="text-[11px] text-text-subtle">PNG, JPG, SVG — máx 2 MB</p>
                  </div>
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleLogoUpload(file);
                    e.target.value = "";
                  }}
                />
              </div>
            </FieldGroup>

            <Divider />

            <FieldGroup kicker="Redes sociais">
              <Field label="LinkedIn" icon={<Linkedin className="h-3 w-3" />} error={formState.errors.linkedin_url?.message} span={2}>
                <Input
                  className="h-[34px] text-[13px]"
                  placeholder="https://linkedin.com/company/nome"
                  type="url"
                  {...register("linkedin_url")}
                />
              </Field>
              <Field label="Instagram" icon={<Instagram className="h-3 w-3" />} error={formState.errors.instagram_url?.message} span={2}>
                <Input
                  className="h-[34px] text-[13px]"
                  placeholder="https://instagram.com/nome"
                  type="url"
                  {...register("instagram_url")}
                />
              </Field>
            </FieldGroup>

          </div>

          <footer className="shrink-0 flex items-center justify-end gap-2 border-t border-border bg-surface px-5 py-3">
            <Btn type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              Cancelar
            </Btn>
            <Btn
              type="submit"
              variant="primary"
              size="sm"
              disabled={formState.isSubmitting}
            >
              {formState.isSubmitting ? "Salvando..." : isEdit ? "Salvar alterações" : "Criar empresa"}
            </Btn>
          </footer>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function FieldGroup({
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
      <div className="grid grid-cols-1 gap-x-4 gap-y-3.5 md:grid-cols-2">{children}</div>
    </section>
  );
}

function Divider() {
  return <div className="h-px bg-border" />;
}

function Field({
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
