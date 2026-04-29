import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { Briefcase, Plus } from "lucide-react";
import { Btn } from "@/components/primitives/LinearKit";
import { supabase } from "@/integrations/supabase/client";
import { useVisibleCompanies } from "@/lib/hiring/rlsScope";
import { useCreateJobOpening } from "@/hooks/hiring/useJobOpenings";
import { useSaveDescriptionDraft } from "@/hooks/hiring/useJobDescription";
import type {
  ContractType,
  WorkMode,
  JobOpeningInsert,
} from "@/integrations/supabase/hiring-types";
import {
  type JobFormValues,
  type Shift,
  schema,
} from "./JobOpeningForm.schema";
import { JobBasicsSection } from "@/features/hiring-job-form/components/JobBasicsSection";
import { JobContractSection } from "@/features/hiring-job-form/components/JobContractSection";
import { JobAddressSection } from "@/features/hiring-job-form/components/JobAddressSection";
import { JobCompensationSection } from "@/features/hiring-job-form/components/JobCompensationSection";
import { Divider } from "@/features/hiring-job-form/components/_primitives";

interface JobOpeningFormProps {
  onSuccess: (id: string) => void;
  onCancel: () => void;
}

function composeSchedule(
  hours?: number | null,
  shift?: string | null,
): string | null {
  const parts = [hours ? `${hours}h/sem` : null, shift ? shift : null].filter(
    Boolean,
  );
  return parts.length ? parts.join(" · ") : null;
}

/**
 * JobOpeningForm — shell.
 *
 * Mantém Zod schema (extraído para JobOpeningForm.schema.ts), useForm + zodResolver,
 * onSubmit + mutation, e composição de 3 sub-seções via feature folder
 * src/features/hiring-job-form/components/.
 *
 * Plan 04-06 (split QUAL-04). Sem mudança funcional — refator estrutural.
 */
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

  const { register, handleSubmit, formState, watch, setValue, reset } =
    useForm<JobFormValues>({
      resolver: zodResolver(schema),
      defaultValues: { num_openings: 1 },
    });

  const { data: companies = [] } = useQuery({
    queryKey: ["form-companies", canSeeAll, companyIds.join(",")],
    queryFn: async () => {
      let q = supabase.from("companies").select("id,name").order("name");
      if (!canSeeAll)
        q = q.in(
          "id",
          companyIds.length
            ? companyIds
            : ["00000000-0000-0000-0000-000000000000"],
        );
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

  const onSubmit = async (values: JobFormValues) => {
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
      status: "aguardando_publicacao",
      override_address: overrideAddress,
      address_street: overrideAddress ? values.address_street || null : null,
      address_number: overrideAddress ? values.address_number || null : null,
      address_complement: overrideAddress
        ? values.address_complement || null
        : null,
      address_neighborhood: overrideAddress
        ? values.address_neighborhood || null
        : null,
      address_city: overrideAddress ? values.address_city || null : null,
      address_state: overrideAddress ? values.address_state || null : null,
      address_zip: overrideAddress ? values.address_zip || null : null,
      cultural_fit_survey_id: values.cultural_fit_survey_id || null,
    };
    createVaga.mutate(insert, {
      onSuccess: (row) => {
        const requirements = skills;
        const benefits_list = benefits;
        const work_schedule = composeSchedule(
          values.hours_per_week,
          values.shift,
        );

        const hasSeed =
          requirements.length > 0 || benefits_list.length > 0 || !!work_schedule;

        const resetForm = () => {
          reset({ num_openings: 1 });
          setSkills([]);
          setSkillInput("");
          setBenefits([]);
          setBenefitInput("");
          setConfidential(false);
          setOverrideAddress(false);
          setParticipants([]);
        };

        if (!hasSeed) {
          resetForm();
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
            onSettled: () => {
              resetForm();
              onSuccess(row.id);
            },
          },
        );
      },
    });
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-1 min-h-0 flex-col"
    >
      <header className="shrink-0 border-b border-border bg-surface px-5 py-4 pr-12">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-bg-subtle">
            <Briefcase
              className="h-4 w-4 text-text-muted"
              strokeWidth={1.75}
            />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-[16px] font-semibold tracking-[-0.01em] text-text">
              Nova vaga
            </h2>
            <p className="mt-0.5 text-[12.5px] text-text-muted">
              Preencha o essencial — o descritivo detalhado vem na próxima
              etapa.
            </p>
          </div>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-linear px-5 py-5">
        <JobBasicsSection
          register={register}
          errors={formState.errors}
          watch={watch}
          setValue={setValue}
          companies={companies}
        />

        <Divider />

        <JobContractSection
          register={register}
          watch={watch}
          setValue={setValue}
          skills={skills}
          setSkills={setSkills}
          skillInput={skillInput}
          setSkillInput={setSkillInput}
        />

        <Divider />

        <JobAddressSection
          register={register}
          overrideAddress={overrideAddress}
          setOverrideAddress={setOverrideAddress}
        />

        <Divider />

        <JobCompensationSection
          register={register}
          errors={formState.errors}
          watch={watch}
          setValue={setValue}
          benefits={benefits}
          setBenefits={setBenefits}
          benefitInput={benefitInput}
          setBenefitInput={setBenefitInput}
          confidential={confidential}
          setConfidential={setConfidential}
          participants={participants}
          setParticipants={setParticipants}
          peoplePickerOpen={peoplePickerOpen}
          setPeoplePickerOpen={setPeoplePickerOpen}
          people={people}
          peopleById={peopleById}
          surveys={surveys}
        />
      </div>

      <footer className="shrink-0 flex items-center justify-between gap-3 border-t border-border bg-surface px-5 py-3">
        <div className="text-[11.5px] text-text-subtle">
          {skills.length > 0 && (
            <span>
              {skills.length}{" "}
              {skills.length === 1 ? "competência" : "competências"}
            </span>
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
