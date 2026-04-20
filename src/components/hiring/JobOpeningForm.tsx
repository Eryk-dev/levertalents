import { useMemo, useState, type KeyboardEvent } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import {
  Briefcase,
  Building2,
  Calendar,
  Check,
  ChevronDown,
  Clock,
  Lock,
  MapPin,
  Plus,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Btn, Chip, LinearAvatar } from "@/components/primitives/LinearKit";
import { supabase } from "@/integrations/supabase/client";
import { useVisibleCompanies } from "@/lib/hiring/rlsScope";
import { useCreateJobOpening } from "@/hooks/hiring/useJobOpenings";
import { useSaveDescriptionDraft } from "@/hooks/hiring/useJobDescription";
import { cn } from "@/lib/utils";
import type {
  ContractType,
  WorkMode,
  JobOpeningInsert,
} from "@/integrations/supabase/hiring-types";

const SHIFTS = ["Manhã", "Tarde", "Noite", "Integral", "Horário comercial", "Livre"] as const;
type Shift = (typeof SHIFTS)[number];

const schema = z
  .object({
    company_id: z.string().uuid("Selecione uma empresa"),
    title: z.string().min(2, "Cargo obrigatório"),
    summary: z.string().optional(),
    sector: z.string().optional(),
    work_mode: z.enum(["presencial", "remoto", "hibrido"]).optional(),
    contract_type: z.enum(["clt", "pj", "estagio", "pj_equity"]).optional(),
    hours_per_week: z.coerce.number().int().min(1).max(80).optional(),
    num_openings: z.coerce.number().int().min(1).default(1),
    shift: z.enum(SHIFTS).optional(),
    salary_min_reais: z.coerce.number().nonnegative().optional(),
    salary_max_reais: z.coerce.number().nonnegative().optional(),
    target_deadline: z.string().optional(),
    address_street: z.string().optional(),
    address_number: z.string().optional(),
    address_complement: z.string().optional(),
    address_neighborhood: z.string().optional(),
    address_city: z.string().optional(),
    address_state: z.string().optional(),
    address_zip: z.string().optional(),
    cultural_fit_survey_id: z.string().uuid().optional().or(z.literal("")),
  })
  .refine(
    (v) =>
      !v.salary_min_reais ||
      !v.salary_max_reais ||
      v.salary_max_reais >= v.salary_min_reais,
    { message: "Máximo deve ser ≥ mínimo", path: ["salary_max_reais"] },
  );

type FormValues = z.infer<typeof schema>;

interface JobOpeningFormProps {
  onSuccess: (id: string) => void;
  onCancel: () => void;
}

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

function composeSchedule(hours?: number | null, shift?: string | null): string | null {
  const parts = [
    hours ? `${hours}h/sem` : null,
    shift ? shift : null,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

export function JobOpeningForm({ onSuccess, onCancel }: JobOpeningFormProps) {
  const { companyIds, canSeeAll } = useVisibleCompanies();
  const createVaga = useCreateJobOpening();
  const saveDraft = useSaveDescriptionDraft();

  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [benefits, setBenefits] = useState<string[]>([]);
  const [benefitInput, setBenefitInput] = useState("");
  const [confidential, setConfidential] = useState(false);
  const [overrideAddress, setOverrideAddress] = useState(false);
  const [participants, setParticipants] = useState<string[]>([]);
  const [peoplePickerOpen, setPeoplePickerOpen] = useState(false);

  const { register, handleSubmit, formState, watch, setValue } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { num_openings: 1 },
  });

  const { data: companies = [] } = useQuery({
    queryKey: ["form-companies", canSeeAll, companyIds.join(",")],
    queryFn: async () => {
      let q = supabase.from("companies").select("id,name").order("name");
      if (!canSeeAll)
        q = q.in("id", companyIds.length ? companyIds : ["00000000-0000-0000-0000-000000000000"]);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: surveys = [] } = useQuery({
    queryKey: ["form-cultural-fit-surveys"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cultural_fit_surveys")
        .select("id, name, active")
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: people = [] } = useQuery({
    queryKey: ["form-people"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name")
        .order("full_name")
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
    enabled: confidential,
  });

  const peopleById = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of people) m.set(p.id, p.full_name ?? "—");
    return m;
  }, [people]);

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

  const onSubmit = async (values: FormValues) => {
    const insert: Omit<JobOpeningInsert, "requested_by"> = {
      company_id: values.company_id,
      title: values.title,
      summary: values.summary || null,
      sector: values.sector || null,
      work_mode: (values.work_mode as WorkMode | undefined) ?? null,
      contract_type: (values.contract_type as ContractType | undefined) ?? null,
      hours_per_week: values.hours_per_week ?? null,
      num_openings: values.num_openings ?? 1,
      shift: (values.shift as Shift | undefined) ?? null,
      required_skills: skills,
      salary_min_cents:
        values.salary_min_reais != null
          ? Math.round(values.salary_min_reais * 100)
          : null,
      salary_max_cents:
        values.salary_max_reais != null
          ? Math.round(values.salary_max_reais * 100)
          : null,
      benefits: benefits.length ? benefits.join(", ") : null,
      confidential,
      confidential_participant_ids: confidential ? participants : [],
      target_deadline: values.target_deadline || null,
      close_reason: null,
      status: "aguardando_descritivo",
      override_address: overrideAddress,
      address_street: overrideAddress ? (values.address_street || null) : null,
      address_number: overrideAddress ? (values.address_number || null) : null,
      address_complement: overrideAddress ? (values.address_complement || null) : null,
      address_neighborhood: overrideAddress ? (values.address_neighborhood || null) : null,
      address_city: overrideAddress ? (values.address_city || null) : null,
      address_state: overrideAddress ? (values.address_state || null) : null,
      address_zip: overrideAddress ? (values.address_zip || null) : null,
      cultural_fit_survey_id: values.cultural_fit_survey_id || null,
    };
    createVaga.mutate(insert, {
      onSuccess: (row) => {
        const requirements = skills;
        const benefits_list = benefits;
        const work_schedule = composeSchedule(values.hours_per_week, values.shift);

        const hasSeed =
          requirements.length > 0 || benefits_list.length > 0 || !!work_schedule;

        if (!hasSeed) {
          onSuccess(row.id);
          return;
        }

        saveDraft.mutate(
          {
            jobOpeningId: row.id,
            existingVersions: [],
            fields: { requirements, benefits_list, work_schedule },
          },
          {
            onSettled: () => onSuccess(row.id),
          },
        );
      },
    });
  };

  const companyField = watch("company_id");
  const workMode = watch("work_mode");
  const contract = watch("contract_type");
  const shift = watch("shift");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-1 min-h-0 flex-col">
      {/* Header */}
      <header className="shrink-0 border-b border-border bg-surface px-5 py-4 pr-12">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-bg-subtle">
            <Briefcase className="h-4 w-4 text-text-muted" strokeWidth={1.75} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-[16px] font-semibold tracking-[-0.01em] text-text">
              Nova vaga
            </h2>
            <p className="mt-0.5 text-[12.5px] text-text-muted">
              Preencha o essencial — o descritivo detalhado vem na próxima etapa.
            </p>
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-linear px-5 py-5">
        {/* — Identidade — */}
        <FieldGroup kicker="Identidade" icon={<Building2 className="h-3 w-3" />}>
          <Field label="Empresa-cliente" required error={formState.errors.company_id?.message}>
            <Select
              value={companyField}
              onValueChange={(v) => setValue("company_id", v, { shouldValidate: true })}
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
            <Input id="sector" className="h-[34px]" placeholder="Opcional" {...register("sector")} />
          </Field>

          <Field
            label="Cargo"
            required
            span={2}
            error={formState.errors.title?.message}
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

        <Divider />

        {/* — Escopo — */}
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

        <Divider />

        {/* — Local de trabalho — */}
        <FieldGroup kicker="Local de trabalho" icon={<MapPin className="h-3 w-3" />}>
          <div className="md:col-span-2 rounded-md border border-border bg-bg-subtle/50 p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5 min-w-0">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-text-muted" strokeWidth={1.75} />
                <div className="min-w-0">
                  <div className="text-[13px] font-medium text-text">Endereço diferente da empresa?</div>
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
                <Input id="address_street" className="h-[34px]" placeholder="Nome da rua ou avenida" {...register("address_street")} />
              </Field>
              <Field label="Número">
                <Input id="address_number" className="h-[34px]" placeholder="Ex.: 123" {...register("address_number")} />
              </Field>
              <Field label="Complemento">
                <Input id="address_complement" className="h-[34px]" placeholder="Apto, sala…" {...register("address_complement")} />
              </Field>
              <Field label="Bairro">
                <Input id="address_neighborhood" className="h-[34px]" placeholder="Bairro" {...register("address_neighborhood")} />
              </Field>
              <Field label="Cidade">
                <Input id="address_city" className="h-[34px]" placeholder="Cidade" {...register("address_city")} />
              </Field>
              <Field label="Estado">
                <Input id="address_state" className="h-[34px]" placeholder="UF" maxLength={2} {...register("address_state")} />
              </Field>
              <Field label="CEP">
                <Input id="address_zip" className="h-[34px]" placeholder="00000-000" {...register("address_zip")} />
              </Field>
            </>
          ) : (
            <div className="md:col-span-2 text-[12.5px] text-text-muted pl-1">
              O endereço da vaga será o mesmo cadastrado na empresa selecionada.
            </div>
          )}
        </FieldGroup>

        <Divider />

        {/* — Remuneração & acesso — */}
        <FieldGroup kicker="Remuneração & acesso">
          <Field
            label="Salário mínimo"
            error={formState.errors.salary_min_reais?.message}
          >
            <CurrencyInput
              id="salary_min_reais"
              placeholder="0,00"
              {...register("salary_min_reais")}
            />
          </Field>

          <Field
            label="Salário máximo"
            error={formState.errors.salary_max_reais?.message}
          >
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
                setValue("cultural_fit_survey_id", v === "none" ? "" : v, { shouldValidate: true })
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

          <div className="md:col-span-2 mt-1 rounded-md border border-border bg-bg-subtle/50 p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5 min-w-0">
                <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-text-muted" strokeWidth={1.75} />
                <div className="min-w-0">
                  <div className="text-[13px] font-medium text-text">Vaga confidencial</div>
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
                          <span className="text-text-subtle">Selecione pessoas...</span>
                        ) : (
                          participants.map((id) => (
                            <Chip key={id} color="neutral" size="sm" className="gap-1.5">
                              <LinearAvatar name={peopleById.get(id) ?? "?"} size={14} />
                              {peopleById.get(id) ?? "—"}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setParticipants(participants.filter((p) => p !== id));
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
                                {selected && <Check className="h-3.5 w-3.5 text-accent" />}
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
        </FieldGroup>
      </div>

      {/* Sticky footer */}
      <footer className="shrink-0 flex items-center justify-between gap-3 border-t border-border bg-surface px-5 py-3">
        <div className="text-[11.5px] text-text-subtle">
          {skills.length > 0 && (
            <span>{skills.length} {skills.length === 1 ? "competência" : "competências"}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Btn type="button" variant="ghost" size="sm" onClick={onCancel}>
            Cancelar
          </Btn>
          <Btn
            type="submit"
            variant="primary"
            size="sm"
            icon={<Plus className="h-3.5 w-3.5" strokeWidth={2} />}
            disabled={createVaga.isPending}
          >
            {createVaga.isPending ? "Criando…" : "Criar vaga"}
          </Btn>
        </div>
      </footer>
    </form>
  );
}

/* ─── Internal primitives ─────────────────────────────────────── */

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
  return <div className="my-5 h-px bg-border" />;
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

const CurrencyInput = ({
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
