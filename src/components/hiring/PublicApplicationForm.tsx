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
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const MAX_CV_BYTES = 8 * 1024 * 1024; // 8 MB
const ALLOWED_CV_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const schema = z.object({
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
      "Arquivo maior que 8 MB.",
    )
    .refine(
      (fl) =>
        !fl || fl.length === 0 || ALLOWED_CV_TYPES.includes(fl[0].type),
      "Formato inválido. Use PDF ou DOC/DOCX.",
    ),
  consent: z.literal(true, {
    errorMap: () => ({ message: "Você precisa aceitar para continuar." }),
  }),
  // honeypot — never validated, just sent as empty string
  hp: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

// ---------------------------------------------------------------------------
// Response types from edge function
// ---------------------------------------------------------------------------

interface ApplySuccess {
  application_id: string;
  candidate_id: string;
  duplicated: boolean;
  message?: string;
}

interface ApplyError {
  error: string;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PublicApplicationFormProps {
  jobId: string;
  companyName: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PublicApplicationForm({
  jobId,
  companyName,
}: PublicApplicationFormProps) {
  const [submitted, setSubmitted] = useState(false);
  const [duplicated, setDuplicated] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: "",
      email: "",
      phone: "",
      linkedin: "",
      hp: "",
      consent: undefined,
    },
  });

  const cvFile = form.watch("cv");
  const selectedFileName =
    cvFile && cvFile.length > 0 ? cvFile[0].name : null;

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
      // Honeypot — always empty for real humans
      formData.append("hp", data.hp ?? "");
      formData.append("cv", data.cv[0]);

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

  // ── Success state ────────────────────────────────────────────────────────
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

  // ── Form ─────────────────────────────────────────────────────────────────
  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-5"
        noValidate
      >
        {/* Honeypot — hidden from real users */}
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
                  <Input
                    type="email"
                    placeholder="ana@email.com"
                    {...field}
                  />
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
                  <span className="text-text-subtle text-[11px]">
                    (recomendado)
                  </span>
                </FormLabel>
                <FormControl>
                  <Input
                    type="tel"
                    placeholder="(11) 99999-9999"
                    {...field}
                  />
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
                  <span className="text-text-subtle text-[11px]">
                    (opcional)
                  </span>
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
                    accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    className="sr-only"
                    tabIndex={-1}
                    aria-hidden
                    {...rest}
                    ref={(el) => {
                      ref(el);
                      fileInputRef.current = el;
                    }}
                    onChange={(e) => onChange(e.target.files)}
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
                      {selectedFileName ?? "Escolher arquivo (PDF, DOC ou DOCX — máx 8 MB)"}
                    </span>
                  </button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

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
