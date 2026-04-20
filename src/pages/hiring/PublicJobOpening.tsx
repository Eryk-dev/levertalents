import { useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { MapPin, Users, Briefcase, Clock, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type {
  JobPublicRow,
  CompanyPublicRow,
  JobDescriptionPublicRow,
  ContractType,
  WorkMode,
} from "@/integrations/supabase/hiring-types";
import type { FitQuestion } from "@/components/hiring/PublicApplicationForm";
import wordmarkDark from "@/assets/lever-wordmark-dark.svg";
import { Button } from "@/components/ui/button";
import PublicApplicationForm from "@/components/hiring/PublicApplicationForm";
import { useQuery } from "@tanstack/react-query";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isUUID(str: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

function fmtContractType(ct: ContractType | null): string {
  if (!ct) return "";
  const map: Record<ContractType, string> = {
    clt: "CLT",
    pj: "PJ",
    estagio: "Estágio",
    pj_equity: "PJ + Equity",
  };
  return map[ct] ?? ct;
}

function fmtWorkMode(wm: WorkMode | null): string {
  if (!wm) return "";
  const map: Record<WorkMode, string> = {
    presencial: "Presencial",
    remoto: "Remoto",
    hibrido: "Híbrido",
  };
  return map[wm] ?? wm;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function buildAddress(
  fields: {
    street?: string | null;
    number?: string | null;
    complement?: string | null;
    neighborhood?: string | null;
    city?: string | null;
    state?: string | null;
    zip?: string | null;
    country?: string | null;
  },
): string {
  const parts: string[] = [];
  if (fields.street) {
    parts.push(
      [fields.street, fields.number, fields.complement]
        .filter(Boolean)
        .join(", "),
    );
  }
  if (fields.neighborhood) parts.push(fields.neighborhood);
  const cityState = [fields.city, fields.state].filter(Boolean).join(" — ");
  if (cityState) parts.push(cityState);
  if (fields.zip) parts.push(fields.zip);
  return parts.join(", ");
}

// ---------------------------------------------------------------------------
// Data hook
// ---------------------------------------------------------------------------

async function fetchPublicJob(idOrSlug: string): Promise<{
  job: JobPublicRow;
  company: CompanyPublicRow | null;
  desc: JobDescriptionPublicRow | null;
  fitSurvey: { id: string; name: string } | null;
  fitQuestions: FitQuestion[];
}> {
  let job: JobPublicRow | null = null;

  if (isUUID(idOrSlug)) {
    const { data } = await supabase
      .from("jobs_public")
      .select("*")
      .eq("id", idOrSlug)
      .maybeSingle();
    job = data ?? null;
  }

  if (!job) {
    const { data } = await supabase
      .from("jobs_public")
      .select("*")
      .eq("public_slug", idOrSlug)
      .maybeSingle();
    job = data ?? null;
  }

  if (!job) throw new Error("NOT_FOUND");

  const baseRequests = [
    supabase
      .from("companies_public")
      .select("*")
      .eq("id", job.company_id)
      .maybeSingle(),
    supabase
      .from("job_descriptions_public")
      .select("*")
      .eq("job_opening_id", job.id)
      .maybeSingle(),
  ] as const;

  const [companyRes, descRes] = await Promise.all(baseRequests);

  let fitSurvey: { id: string; name: string } | null = null;
  let fitQuestions: FitQuestion[] = [];

  if (job.cultural_fit_survey_id) {
    const [surveyRes, questionsRes] = await Promise.all([
      supabase
        .from("cultural_fit_surveys_public")
        .select("*")
        .eq("id", job.cultural_fit_survey_id)
        .maybeSingle(),
      supabase
        .from("cultural_fit_questions_public")
        .select("*")
        .eq("survey_id", job.cultural_fit_survey_id)
        .order("order_index", { ascending: true }),
    ]);
    if (surveyRes.data) {
      fitSurvey = { id: surveyRes.data.id, name: surveyRes.data.name };
    }
    fitQuestions = (questionsRes.data ?? []) as FitQuestion[];
  }

  return {
    job,
    company: companyRes.data ?? null,
    desc: descRes.data ?? null,
    fitSurvey,
    fitQuestions,
  };
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[20px] font-semibold tracking-tight text-text">
      {children}
    </h2>
  );
}

function MetaChip({
  icon: Icon,
  label,
}: {
  icon?: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  label: string;
}) {
  return (
    <span className="inline-flex h-[24px] items-center gap-1 rounded border border-border px-2 text-[11.5px] text-text-muted">
      {Icon ? <Icon size={11} strokeWidth={1.75} /> : null}
      {label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// 404 state
// ---------------------------------------------------------------------------

function JobNotFound() {
  useEffect(() => {
    document.title = "Vaga não encontrada — Lever Talents";
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <header className="sticky top-0 z-40 border-b border-border bg-bg px-5 py-3">
        <img src={wordmarkDark} alt="Lever Talents" className="h-7 w-auto" />
      </header>
      <main className="mx-auto flex max-w-[860px] flex-1 flex-col items-center justify-center gap-4 px-5 py-20 text-center">
        <p className="text-[13px] font-semibold uppercase tracking-widest text-text-subtle">
          404
        </p>
        <h1 className="text-[28px] font-semibold tracking-tight text-text">
          Esta vaga não está mais disponível.
        </h1>
        <p className="max-w-sm text-[14px] leading-relaxed text-text-muted">
          A vaga pode ter sido fechada ou o link está incorreto. Confira o
          endereço ou procure outras oportunidades.
        </p>
        <Link
          to="/"
          className="mt-2 inline-flex h-[34px] items-center rounded-md border border-border bg-surface px-4 text-[13px] font-medium text-text transition-colors hover:bg-bg-subtle"
        >
          Voltar para o início
        </Link>
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function PublicJobOpening() {
  const { id } = useParams<{ id: string }>();
  const formRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["public-job", id],
    queryFn: () => fetchPublicJob(id!),
    enabled: !!id,
    retry: false,
  });

  const notFound = error instanceof Error && error.message === "NOT_FOUND";
  const job = data?.job;
  const company = data?.company;
  const desc = data?.desc;
  const fitSurvey = data?.fitSurvey ?? null;
  const fitQuestions = data?.fitQuestions ?? [];

  // SEO title
  useEffect(() => {
    if (job && company) {
      document.title = `${job.title} — ${company.name} | Lever Talents`;
    } else if (notFound) {
      document.title = "Vaga não encontrada — Lever Talents";
    } else {
      document.title = "Vaga — Lever Talents";
    }
  }, [job, company, notFound]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-bg">
        <header className="sticky top-0 z-40 border-b border-border bg-bg px-5 py-3">
          <img src={wordmarkDark} alt="Lever Talents" className="h-7 w-auto" />
        </header>
        <main className="mx-auto max-w-[860px] px-5 py-16">
          <div className="space-y-4 animate-pulse">
            <div className="h-4 w-1/4 rounded bg-bg-muted" />
            <div className="h-8 w-3/4 rounded bg-bg-muted" />
            <div className="flex gap-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-6 w-20 rounded bg-bg-muted" />
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (notFound || !job) {
    return <JobNotFound />;
  }

  // Address resolution
  const useJobAddress = job.override_address;
  const jobAddress = useJobAddress
    ? buildAddress({
        street: job.address_street,
        number: job.address_number,
        complement: job.address_complement,
        neighborhood: job.address_neighborhood,
        city: job.address_city,
        state: job.address_state,
        zip: job.address_zip,
      })
    : buildAddress({
        street: company?.address_street,
        number: company?.address_number,
        complement: company?.address_complement,
        neighborhood: company?.address_neighborhood,
        city: company?.address_city,
        state: company?.address_state,
        zip: company?.address_zip,
        country: company?.address_country,
      });

  const cityState = useJobAddress
    ? [job.address_city, job.address_state].filter(Boolean).join(", ")
    : [company?.address_city, company?.address_state].filter(Boolean).join(", ");

  const mapsUrl = jobAddress
    ? `https://maps.google.com/?q=${encodeURIComponent(jobAddress)}`
    : null;

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen bg-bg text-text">
      {/* ── Fixed header ───────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-border bg-bg">
        <div className="mx-auto flex max-w-[860px] items-center justify-between gap-4 px-5 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <img
              src={wordmarkDark}
              alt="Lever Talents"
              className="h-[22px] w-auto shrink-0"
            />
            {company && (
              <>
                <span className="h-4 w-px shrink-0 bg-border" aria-hidden />
                <div className="flex min-w-0 items-center gap-2">
                  {company.logo_url ? (
                    <img
                      src={company.logo_url}
                      alt=""
                      className="h-6 w-6 shrink-0 rounded object-contain"
                    />
                  ) : null}
                  <span className="truncate text-[13px] text-text-muted">
                    {company.name}
                  </span>
                </div>
              </>
            )}
          </div>

          <Button
            variant="accent"
            size="sm"
            onClick={scrollToForm}
            className="shrink-0"
          >
            Quero me candidatar
          </Button>
        </div>
      </header>

      {/* ── Main content ───────────────────────────────────────────────── */}
      <main className="mx-auto max-w-[860px] px-5">
        {/* ── Hero ───────────────────────────────────────────────────── */}
        <section className="pt-12 pb-8">
          {company?.tagline ? (
            <p className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-text-subtle">
              {company.tagline}
            </p>
          ) : null}

          <h1 className="text-[32px] font-semibold leading-tight tracking-tight text-text">
            {job.title}
          </h1>

          {/* Meta chips */}
          <div className="mt-4 flex flex-wrap gap-2">
            {cityState ? (
              <MetaChip icon={MapPin} label={cityState} />
            ) : null}
            {job.num_openings > 1 ? (
              <MetaChip
                icon={Users}
                label={`${job.num_openings} vagas`}
              />
            ) : null}
            {job.contract_type ? (
              <MetaChip
                icon={Briefcase}
                label={fmtContractType(job.contract_type)}
              />
            ) : null}
            {job.work_mode ? (
              <MetaChip label={fmtWorkMode(job.work_mode)} />
            ) : null}
            {job.shift ? (
              <MetaChip icon={Clock} label={job.shift} />
            ) : null}
            {job.sector ? (
              <MetaChip label={job.sector} />
            ) : null}
          </div>
        </section>

        {/* ── Body ───────────────────────────────────────────────────── */}
        <div className="space-y-10 pb-6">
          {/* Sobre nós */}
          {company?.overview ? (
            <section>
              <SectionHeading>Sobre nós</SectionHeading>
              <p className="mt-3 text-[15px] leading-relaxed text-text">
                {company.overview}
              </p>
            </section>
          ) : null}

          {/* Nossos valores */}
          {company?.values_list && company.values_list.length > 0 ? (
            <section>
              <SectionHeading>Nossos valores</SectionHeading>
              <ul className="mt-3 space-y-1.5">
                {company.values_list.map((v, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-[15px] text-text"
                  >
                    <span
                      className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent"
                      aria-hidden
                    />
                    {v}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {/* Resumo da vaga */}
          {job.summary ? (
            <section>
              <SectionHeading>Resumo da vaga</SectionHeading>
              <p className="mt-3 text-[15px] leading-relaxed text-text">
                {job.summary}
              </p>
            </section>
          ) : null}

          {/* Rotina do dia a dia */}
          {desc?.daily_routine ? (
            <section>
              <SectionHeading>Rotina do dia a dia</SectionHeading>
              <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed text-text">
                {desc.daily_routine}
              </p>
            </section>
          ) : null}

          {/* O que esperamos de você */}
          {desc?.expectations ? (
            <section>
              <SectionHeading>O que esperamos de você</SectionHeading>
              <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed text-text">
                {desc.expectations}
              </p>
            </section>
          ) : null}

          {/* Requisitos */}
          {desc?.requirements && desc.requirements.length > 0 ? (
            <section>
              <SectionHeading>Requisitos</SectionHeading>
              <ul className="mt-3 space-y-1.5">
                {desc.requirements.map((r, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-[15px] text-text"
                  >
                    <span
                      className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-border-strong"
                      aria-hidden
                    />
                    {r}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {/* Jornada de trabalho */}
          {desc?.work_schedule || job.hours_per_week ? (
            <section>
              <SectionHeading>Jornada de trabalho</SectionHeading>
              {desc?.work_schedule ? (
                <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed text-text">
                  {desc.work_schedule}
                </p>
              ) : null}
              {job.hours_per_week ? (
                <p className="mt-2 text-[14px] text-text-muted">
                  {job.hours_per_week}h por semana
                </p>
              ) : null}
            </section>
          ) : null}

          {/* Benefícios */}
          {(desc?.benefits_list && desc.benefits_list.length > 0) ||
          job.benefits ? (
            <section>
              <SectionHeading>Benefícios</SectionHeading>
              {desc?.benefits_list && desc.benefits_list.length > 0 ? (
                <ul className="mt-3 space-y-1.5">
                  {desc.benefits_list.map((b, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-[15px] text-text"
                    >
                      <span
                        className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent"
                        aria-hidden
                      />
                      {b}
                    </li>
                  ))}
                </ul>
              ) : job.benefits ? (
                <p className="mt-3 text-[15px] leading-relaxed text-text">
                  {job.benefits}
                </p>
              ) : null}
            </section>
          ) : null}

          {/* Diferenciais */}
          {company?.differentials ? (
            <section>
              <SectionHeading>Por que trabalhar conosco?</SectionHeading>
              <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed text-text">
                {company.differentials}
              </p>
            </section>
          ) : null}

          {/* Localização */}
          {jobAddress ? (
            <section>
              <SectionHeading>Localização</SectionHeading>
              <p className="mt-3 text-[15px] text-text">{jobAddress}</p>
              {mapsUrl ? (
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1.5 text-[13px] text-accent-text hover:underline"
                >
                  Ver no Google Maps
                  <ExternalLink size={12} strokeWidth={1.75} />
                </a>
              ) : null}
            </section>
          ) : null}
        </div>

        {/* ── CTA + form ─────────────────────────────────────────────── */}
        <section
          ref={formRef}
          className="scroll-mt-20 border-t border-border py-10"
        >
          <h2 className="mb-1 text-[24px] font-semibold tracking-tight text-text">
            Quer fazer parte?
          </h2>
          <p className="mb-2 text-[14px] text-text-muted">
            Preencha o formulário e envie sua candidatura. Simples assim.
          </p>

          {fitSurvey && fitQuestions.length > 0 ? (
            <p className="mb-6 text-[11px] uppercase tracking-wider font-semibold text-text-subtle">
              Inclui avaliação de fit cultural — ~{fitQuestions.length} perguntas.
            </p>
          ) : (
            <div className="mb-7" />
          )}

          <PublicApplicationForm
            jobId={job.id}
            companyName={company?.name ?? "esta empresa"}
            fitSurvey={fitSurvey}
            fitQuestions={fitQuestions}
          />
        </section>
      </main>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer className="mt-8 border-t border-border py-6">
        <div className="mx-auto flex max-w-[860px] flex-col items-start justify-between gap-3 px-5 sm:flex-row sm:items-center">
          <p className="text-[12px] text-text-subtle">
            Vaga publicada em{" "}
            <time dateTime={job.opened_at}>{fmtDate(job.opened_at)}</time>
          </p>
          <div className="flex items-center gap-2 text-[12px] text-text-subtle">
            <span>Divulgação por</span>
            <img
              src={wordmarkDark}
              alt="Lever Talents"
              className="h-[14px] w-auto opacity-60"
            />
          </div>
        </div>
      </footer>
    </div>
  );
}
