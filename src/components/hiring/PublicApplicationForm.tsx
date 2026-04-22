import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Paperclip, CheckCircle2 } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_CV_BYTES = 10 * 1024 * 1024;
const ALLOWED_CV_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FitQuestion {
  id: string;
  order_index: number;
  kind: "scale" | "text" | "multi_choice";
  prompt: string;
  options: unknown | null;
  scale_min: number | null;
  scale_max: number | null;
}

interface PublicApplicationFormProps {
  jobId: string;
  companyName: string;
  fitSurvey: { id: string; name: string } | null;
  fitQuestions: FitQuestion[];
}

// ---------------------------------------------------------------------------
// Schema factory
// ---------------------------------------------------------------------------

function buildSchema(fitSurvey: { id: string; name: string } | null, fitQuestions: FitQuestion[]) {
  return z
    .object({
      full_name: z.string().min(2, "Nome completo é obrigatório."),
      email: z
        .string()
        .min(1, "E-mail é obrigatório.")
        .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "E-mail inválido."),
      phone: z.string().optional(),
      linkedin: z
        .string()
        .optional()
        .refine(
          (v) => !v || v.startsWith("http") || v.startsWith("linkedin"),
          "URL do LinkedIn inválida.",
        ),
      cv: z
        .custom<FileList>()
        .refine((fl) => fl && fl.length > 0, "Currículo é obrigatório.")
        .refine(
          (fl) => !fl || fl.length === 0 || fl[0].size <= MAX_CV_BYTES,
          "Arquivo maior que 10 MB.",
        )
        .refine(
          (fl) =>
            !fl || fl.length === 0 || ALLOWED_CV_TYPES.includes(fl[0].type),
          "Formato inválido. Use PDF, PNG ou JPEG.",
        ),
      fit_responses: z.record(z.any()).optional(),
      consent: z.literal(true, {
        errorMap: () => ({ message: "Você precisa aceitar para continuar." }),
      }),
      hp: z.string().optional(),
    })
    .superRefine((data, ctx) => {
      if (!fitSurvey || fitQuestions.length === 0) return;

      const responses = data.fit_responses ?? {};

      for (const q of fitQuestions) {
        const val = responses[q.id];

        if (q.kind === "scale") {
          const min = q.scale_min ?? 1;
          const max = q.scale_max ?? 5;
          if (typeof val !== "number" || val < min || val > max) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `Selecione uma opção de ${min} a ${max}.`,
              path: ["fit_responses", q.id],
            });
          }
        } else if (q.kind === "text") {
          if (typeof val !== "string" || val.trim().length < 1) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Resposta obrigatória.",
              path: ["fit_responses", q.id],
            });
          }
        } else if (q.kind === "multi_choice") {
          const isEmpty =
            val === undefined ||
            val === null ||
            (typeof val === "string" && val.trim().length === 0) ||
            (Array.isArray(val) && val.length === 0);
          if (isEmpty) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Selecione uma opção.",
              path: ["fit_responses", q.id],
            });
          }
        }
      }
    });
}

type FormValues = {
  full_name: string;
  email: string;
  phone?: string;
  linkedin?: string;
  cv: FileList;
  fit_responses?: Record<string, unknown>;
  consent: true;
  hp?: string;
};

// ---------------------------------------------------------------------------
// Response types from edge function
// ---------------------------------------------------------------------------

interface ApplySuccess {
  application_id: string;
  candidate_id: string;
  duplicated: boolean;
  fit_saved?: boolean;
  fit_error?: string;
  message?: string;
}

interface ApplyError {
  error: string;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function FitKicker({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] uppercase tracking-wider text-text-subtle font-semibold">
      {children}
    </p>
  );
}

interface ScaleQuestionProps {
  min: number;
  max: number;
  value: number | undefined;
  onChange: (v: number) => void;
  error?: string;
}

function ScaleQuestion({ min, max, value, onChange, error }: ScaleQuestionProps) {
  const steps = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  return (
    <div>
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[11px] text-text-subtle mr-1">Discordo</span>
        {steps.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={cn(
              "h-8 w-8 rounded-md border text-[13px] font-medium transition-colors shrink-0",
              value === n
                ? "bg-accent text-white border-accent"
                : "border-border bg-surface text-text hover:bg-bg-subtle",
            )}
            aria-pressed={value === n}
          >
            {n}
          </button>
        ))}
        <span className="text-[11px] text-text-subtle ml-1">Concordo</span>
      </div>
      {error ? (
        <p className="mt-1 text-[12px] text-status-red">{error}</p>
      ) : null}
    </div>
  );
}

interface MultiChoiceQuestionProps {
  options: string[];
  value: string | undefined;
  onChange: (v: string) => void;
  error?: string;
}

function MultiChoiceQuestion({ options, value, onChange, error }: MultiChoiceQuestionProps) {
  return (
    <div>
      <div className="flex flex-col gap-2">
        {options.map((opt) => (
          <label
            key={opt}
            className="flex items-center gap-2.5 cursor-pointer"
          >
            <span
              onClick={() => onChange(opt)}
              className={cn(
                "h-4 w-4 shrink-0 rounded-full border transition-colors flex items-center justify-center",
                value === opt ? "border-accent bg-accent" : "border-border bg-surface",
              )}
              role="radio"
              aria-checked={value === opt}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === " " || e.key === "Enter") onChange(opt);
              }}
            >
              {value === opt ? (
                <span className="h-1.5 w-1.5 rounded-full bg-white" />
              ) : null}
            </span>
            <span className="text-[13.5px] text-text leading-snug">{opt}</span>
          </label>
        ))}
      </div>
      {error ? (
        <p className="mt-1 text-[12px] text-status-red">{error}</p>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PublicApplicationForm({
  jobId,
  companyName,
  fitSurvey,
  fitQuestions,
}: PublicApplicationFormProps) {
  const [submitted, setSubmitted] = useState(false);
  const [duplicated, setDuplicated] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const schema = buildSchema(fitSurvey, fitQuestions);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: "",
      email: "",
      phone: "",
      linkedin: "",
      hp: "",
      fit_responses: {},
      consent: undefined as unknown as true,
    },
  });

  const cvFile = form.watch("cv");
  const selectedFileName =
    cvFile && cvFile.length > 0 ? cvFile[0].name : null;

  const fitResponses = form.watch("fit_responses") ?? {};

  const onSubmit = async (data: FormValues) => {
    setSubmitting(true);
    try {
      const supaUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const supaKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
      const url = `${supaUrl}/functions/v1/apply-to-job`;

      const formData = new FormData();
      formData.append("job_opening_id", jobId);
      formData.append("full_name", data.full_name.trim());
      formData.append("email", data.email.trim());
      if (data.phone?.trim()) formData.append("phone", data.phone.trim());
      if (data.linkedin?.trim()) formData.append("linkedin", data.linkedin.trim());
      formData.append("consent", "true");
      formData.append("hp", data.hp ?? "");
      formData.append("cv", data.cv[0]);

      if (fitSurvey && data.fit_responses) {
        formData.append("fit_responses", JSON.stringify(data.fit_responses));
      }

      const res = await fetch(url, {
        method: "POST",
        body: formData,
        headers: {
          apikey: supaKey,
          Authorization: `Bearer ${supaKey}`,
        },
      });

      const json = (await res.json()) as ApplySuccess | ApplyError;

      if (!res.ok) {
        const errMsg = (json as ApplyError).error ?? `Erro ${res.status}`;
        toast.error(errMsg);
        return;
      }

      const success = json as ApplySuccess;
      setDuplicated(success.duplicated);
      setSubmitted(true);

      if (success.fit_saved === true) {
        toast.success("Fit cultural registrado.");
      } else if (success.fit_saved === false && success.fit_error) {
        toast.warning(`Candidatura enviada mas fit falhou: ${success.fit_error}`);
      }
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Não foi possível enviar a candidatura. Tente novamente.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ── Success state ─────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="rounded-lg border border-status-green/30 bg-status-green-soft px-6 py-8 text-center animate-fade-in">
        <CheckCircle2
          className="mx-auto mb-3 text-status-green"
          size={28}
          strokeWidth={1.75}
        />
        {duplicated ? (
          <>
            <p className="text-[15px] font-semibold text-status-green">
              Candidatura já registrada
            </p>
            <p className="mt-1 text-[13px] text-text-muted">
              Você já se candidatou a essa vaga. O time de{" "}
              <span className="font-medium">{companyName}</span> vai analisar seu
              perfil em breve.
            </p>
          </>
        ) : (
          <>
            <p className="text-[15px] font-semibold text-status-green">
              Recebemos sua candidatura!
            </p>
            <p className="mt-1 text-[13px] text-text-muted">
              O time da{" "}
              <span className="font-medium">{companyName}</span> vai avaliar e
              retornar em breve. Boa sorte!
            </p>
          </>
        )}
      </div>
    );
  }

  // ── Form ──────────────────────────────────────────────────────────────────
  const hasFit = !!fitSurvey && fitQuestions.length > 0;

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-5"
        noValidate
      >
        {/* Honeypot */}
        <div aria-hidden className="absolute -left-[9999px]">
          <input
            {...form.register("hp")}
            tabIndex={-1}
            autoComplete="off"
            aria-label="Deixe este campo vazio"
          />
        </div>

        {/* Row: name + email */}
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="full_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[13px] text-text">
                  Nome completo <span className="text-status-red">*</span>
                </FormLabel>
                <FormControl>
                  <Input placeholder="Ana Souza" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[13px] text-text">
                  E-mail <span className="text-status-red">*</span>
                </FormLabel>
                <FormControl>
                  <Input type="email" placeholder="ana@email.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Row: phone + linkedin */}
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[13px] text-text">
                  Telefone{" "}
                  <span className="text-text-subtle text-[11px]">(recomendado)</span>
                </FormLabel>
                <FormControl>
                  <Input type="tel" placeholder="(11) 99999-9999" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="linkedin"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[13px] text-text">
                  LinkedIn{" "}
                  <span className="text-text-subtle text-[11px]">(opcional)</span>
                </FormLabel>
                <FormControl>
                  <Input
                    type="url"
                    placeholder="linkedin.com/in/ana-souza"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* CV upload */}
        <FormField
          control={form.control}
          name="cv"
          render={({ field: { onChange, ref, ...rest } }) => (
            <FormItem>
              <FormLabel className="text-[13px] text-text">
                Currículo (CV) <span className="text-status-red">*</span>
              </FormLabel>
              <FormControl>
                <div>
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
                    className="sr-only"
                    tabIndex={-1}
                    aria-hidden
                    {...rest}
                    ref={(el) => {
                      ref(el);
                      fileInputRef.current = el;
                    }}
                    onChange={(e) => {
                      const list = e.target.files;
                      const file = list && list.length > 0 ? list[0] : null;
                      if (file) {
                        if (file.size > MAX_CV_BYTES) {
                          toast.error("Arquivo maior que 10 MB.");
                          e.target.value = "";
                          return;
                        }
                        if (!ALLOWED_CV_TYPES.includes(file.type)) {
                          toast.error("Formato inválido. Use PDF, PNG ou JPEG.");
                          e.target.value = "";
                          return;
                        }
                      }
                      onChange(list);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                      "flex h-[38px] w-full items-center gap-2 rounded-md border px-3 text-[13px] transition-colors",
                      "bg-surface text-text-muted hover:bg-bg-subtle hover:text-text",
                      selectedFileName
                        ? "border-accent text-text"
                        : "border-border border-dashed",
                    )}
                  >
                    <Paperclip size={14} className="shrink-0 text-text-subtle" />
                    <span className="truncate">
                      {selectedFileName ?? "Escolher arquivo (PDF, PNG ou JPEG — máx 10 MB)"}
                    </span>
                  </button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Cultural fit section */}
        {hasFit ? (
          <div className="rounded-lg border border-border bg-bg-subtle px-4 py-5 space-y-5">
            <div>
              <FitKicker>Fit cultural</FitKicker>
              <p className="mt-0.5 text-[14px] font-medium text-text">
                {fitSurvey.name}
              </p>
              <p className="mt-1 text-[12.5px] text-text-muted">
                Responda todas as perguntas abaixo para concluir sua candidatura.
              </p>
            </div>

            {fitQuestions.map((q, idx) => {
              const fieldPath = `fit_responses.${q.id}` as const;
              const fieldError = (
                form.formState.errors as Record<string, unknown>
              )?.fit_responses as Record<string, { message?: string }> | undefined;
              const qError = fieldError?.[q.id]?.message;

              return (
                <div key={q.id} className="space-y-2">
                  <p className="text-[13.5px] text-text leading-snug">
                    <span className="text-text-subtle mr-1.5">{idx + 1}.</span>
                    {q.prompt}
                    <span className="text-status-red ml-0.5">*</span>
                  </p>

                  {q.kind === "scale" ? (
                    <ScaleQuestion
                      min={q.scale_min ?? 1}
                      max={q.scale_max ?? 5}
                      value={fitResponses[q.id] as number | undefined}
                      onChange={(v) => {
                        form.setValue(fieldPath, v, { shouldValidate: true });
                      }}
                      error={qError}
                    />
                  ) : q.kind === "text" ? (
                    <div>
                      <Textarea
                        rows={3}
                        placeholder="Sua resposta"
                        className="resize-none text-[13.5px]"
                        value={(fitResponses[q.id] as string | undefined) ?? ""}
                        onChange={(e) => {
                          form.setValue(fieldPath, e.target.value, {
                            shouldValidate: true,
                          });
                        }}
                      />
                      {qError ? (
                        <p className="mt-1 text-[12px] text-status-red">{qError}</p>
                      ) : null}
                    </div>
                  ) : q.kind === "multi_choice" ? (
                    <MultiChoiceQuestion
                      options={Array.isArray(q.options) ? (q.options as string[]) : []}
                      value={fitResponses[q.id] as string | undefined}
                      onChange={(v) => {
                        form.setValue(fieldPath, v, { shouldValidate: true });
                      }}
                      error={qError}
                    />
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : null}

        {/* Consent */}
        <FormField
          control={form.control}
          name="consent"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-start gap-3">
                <FormControl>
                  <Checkbox
                    checked={field.value === true}
                    onCheckedChange={(checked) =>
                      field.onChange(checked === true ? true : undefined)
                    }
                    id="consent-check"
                    className="mt-0.5"
                  />
                </FormControl>
                <label
                  htmlFor="consent-check"
                  className="cursor-pointer text-[12.5px] text-text-muted leading-snug"
                >
                  Autorizo o tratamento dos meus dados de acordo com a{" "}
                  <a
                    href="/politica-privacidade"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="link-accent underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    LGPD
                  </a>{" "}
                  para fins de processo seletivo.{" "}
                  <span className="text-status-red">*</span>
                </label>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          variant="accent"
          size="lg"
          disabled={submitting}
          className="w-full sm:w-auto"
        >
          {submitting ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Enviando…
            </>
          ) : (
            "Enviar candidatura"
          )}
        </Button>
      </form>
    </Form>
  );
}
