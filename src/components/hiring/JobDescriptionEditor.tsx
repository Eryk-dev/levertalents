import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useSaveDescriptionDraft } from "@/hooks/hiring/useJobDescription";
import { Chip } from "@/components/primitives/LinearKit";
import { cn } from "@/lib/utils";
import type {
  JobDescriptionRow,
  JobOpeningRow,
} from "@/integrations/supabase/hiring-types";

interface JobDescriptionEditorProps {
  job: JobOpeningRow;
  descriptions: JobDescriptionRow[];
  autoFocus?: boolean;
}

/* ─── auto-resize helper ──────────────────────────────── */

function useAutoResize(value: string) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const ta = ref.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${ta.scrollHeight}px`;
  }, [value]);
  return ref;
}

/* ─── Section kicker label ────────────────────────────── */

function SectionKicker({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] font-semibold uppercase tracking-[0.05em] text-text-subtle mb-1.5">
      {children}
    </div>
  );
}

/* ─── Auto-resize textarea ────────────────────────────── */

interface SectionTextareaProps {
  value: string;
  onChange: (v: string) => void;
  onBlur: () => void;
  placeholder: string;
  readOnly: boolean;
  autoFocus?: boolean;
}

function SectionTextarea({
  value,
  onChange,
  onBlur,
  placeholder,
  readOnly,
  autoFocus,
}: SectionTextareaProps) {
  const ref = useAutoResize(value);
  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      autoFocus={autoFocus}
      readOnly={readOnly}
      placeholder={readOnly ? "" : placeholder}
      rows={1}
      className={cn(
        "w-full resize-none border-0 bg-transparent p-0 text-[13px] leading-[1.55] text-text",
        "placeholder:text-text-subtle focus:outline-none focus:ring-0 shadow-none",
        !readOnly && "cursor-text",
        readOnly && "cursor-default",
      )}
    />
  );
}

/* ─── Chip list input (requirements / benefits_list) ──── */

interface ChipInputProps {
  items: string[];
  onChange: (items: string[]) => void;
  onBlur: () => void;
  placeholder: string;
  readOnly: boolean;
}

function ChipInput({ items, onChange, onBlur, placeholder, readOnly }: ChipInputProps) {
  const [inputVal, setInputVal] = useState("");

  const add = useCallback(() => {
    const s = inputVal.trim().replace(/,$/, "");
    if (!s) return;
    if (!items.includes(s)) onChange([...items, s]);
    setInputVal("");
  }, [inputVal, items, onChange]);

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add();
    } else if (e.key === "Backspace" && !inputVal && items.length) {
      onChange(items.slice(0, -1));
    }
  };

  const handleBlur = () => {
    add();
    onBlur();
  };

  if (readOnly) {
    if (!items.length) return null;
    return (
      <div className="flex flex-wrap gap-1.5">
        {items.map((s) => (
          <Chip key={s} color="neutral" size="sm">
            {s}
          </Chip>
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex min-h-[34px] flex-wrap items-center gap-1.5 rounded-md border border-border bg-surface px-2 py-1.5",
        "focus-within:ring-2 focus-within:ring-accent/30 focus-within:border-accent",
      )}
    >
      {items.map((s) => (
        <Chip key={s} color="neutral" size="sm" className="pl-2 pr-1">
          {s}
          <button
            type="button"
            onClick={() => onChange(items.filter((x) => x !== s))}
            className="ml-1 inline-flex h-3.5 w-3.5 items-center justify-center rounded-sm text-text-subtle hover:bg-bg-muted hover:text-text"
            aria-label={`Remover ${s}`}
          >
            <X className="h-2.5 w-2.5" />
          </button>
        </Chip>
      ))}
      <input
        value={inputVal}
        onChange={(e) => setInputVal(e.target.value)}
        onKeyDown={onKey}
        onBlur={handleBlur}
        placeholder={items.length ? "" : placeholder}
        className="flex-1 min-w-[120px] bg-transparent text-[13px] text-text placeholder:text-text-subtle outline-none"
      />
    </div>
  );
}

/* ─── Main editor ─────────────────────────────────────── */

export function JobDescriptionEditor({ job, descriptions, autoFocus }: JobDescriptionEditorProps) {
  const { userRole } = useAuth();
  const latest = descriptions[0];

  const isRH = userRole === "rh" || userRole === "socio" || userRole === "admin";
  const canEdit = isRH && job.status !== "encerrada";

  const [dailyRoutine, setDailyRoutine] = useState(latest?.daily_routine ?? "");
  const [requirements, setRequirements] = useState<string[]>(latest?.requirements ?? []);
  const [expectations, setExpectations] = useState(latest?.expectations ?? "");
  const [workSchedule, setWorkSchedule] = useState(latest?.work_schedule ?? "");
  const [benefitsList, setBenefitsList] = useState<string[]>(latest?.benefits_list ?? []);
  const [contentMd, setContentMd] = useState(latest?.content_md ?? "");
  const [savedHint, setSavedHint] = useState(false);

  const saveDraft = useSaveDescriptionDraft();

  useEffect(() => {
    setDailyRoutine(latest?.daily_routine ?? "");
    setRequirements(latest?.requirements ?? []);
    setExpectations(latest?.expectations ?? "");
    setWorkSchedule(latest?.work_schedule ?? "");
    setBenefitsList(latest?.benefits_list ?? []);
    setContentMd(latest?.content_md ?? "");
  }, [
    latest?.id,
    latest?.daily_routine,
    latest?.requirements,
    latest?.expectations,
    latest?.work_schedule,
    latest?.benefits_list,
    latest?.content_md,
  ]);

  const persist = useCallback(
    (fields: {
      daily_routine?: string;
      requirements?: string[];
      expectations?: string;
      work_schedule?: string;
      benefits_list?: string[];
      content_md?: string;
    }) => {
      if (!canEdit) return;
      saveDraft.mutate(
        {
          jobOpeningId: job.id,
          existingVersions: descriptions,
          fields: {
            daily_routine: (fields.daily_routine ?? dailyRoutine) || null,
            requirements: fields.requirements ?? requirements,
            expectations: (fields.expectations ?? expectations) || null,
            work_schedule: (fields.work_schedule ?? workSchedule) || null,
            benefits_list: fields.benefits_list ?? benefitsList,
            content_md: (fields.content_md ?? contentMd) || null,
          },
        },
        {
          onSuccess: () => {
            setSavedHint(true);
            window.setTimeout(() => setSavedHint(false), 1500);
          },
        },
      );
    },
    [canEdit, job.id, descriptions, dailyRoutine, requirements, expectations, workSchedule, benefitsList, contentMd, saveDraft],
  );

  const hasStructured =
    !!(latest?.daily_routine) ||
    !!(latest?.requirements?.length) ||
    !!(latest?.expectations) ||
    !!(latest?.work_schedule) ||
    !!(latest?.benefits_list?.length);

  const hasLegacyOnly = !hasStructured && !!latest?.content_md;
  const isEmpty = !latest;

  if (!canEdit && isEmpty) {
    return (
      <div className="text-[13px] text-text-subtle">Nenhuma descrição cadastrada.</div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Rotina do dia a dia */}
      <div>
        <SectionKicker>Rotina do dia a dia</SectionKicker>
        <SectionTextarea
          value={dailyRoutine}
          onChange={setDailyRoutine}
          onBlur={() => persist({ daily_routine: dailyRoutine })}
          placeholder={`Como é o dia a dia de um ${job.title}?`}
          readOnly={!canEdit}
          autoFocus={autoFocus}
        />
      </div>

      {/* Requisitos */}
      <div>
        <SectionKicker>Requisitos</SectionKicker>
        <ChipInput
          items={requirements}
          onChange={(v) => setRequirements(v)}
          onBlur={() => persist({ requirements })}
          placeholder="Adicione um requisito e tecle Enter..."
          readOnly={!canEdit}
        />
      </div>

      {/* O que esperamos */}
      <div>
        <SectionKicker>O que esperamos de você</SectionKicker>
        <SectionTextarea
          value={expectations}
          onChange={setExpectations}
          onBlur={() => persist({ expectations })}
          placeholder="Descreva o perfil e comportamentos esperados..."
          readOnly={!canEdit}
        />
      </div>

      {/* Jornada */}
      <div>
        <SectionKicker>Jornada de trabalho</SectionKicker>
        <SectionTextarea
          value={workSchedule}
          onChange={setWorkSchedule}
          onBlur={() => persist({ work_schedule: workSchedule })}
          placeholder="Horários, carga semanal, escalas..."
          readOnly={!canEdit}
        />
      </div>

      {/* Benefícios */}
      <div>
        <SectionKicker>Benefícios</SectionKicker>
        <ChipInput
          items={benefitsList}
          onChange={(v) => setBenefitsList(v)}
          onBlur={() => persist({ benefits_list: benefitsList })}
          placeholder="VR, plano de saúde, PLR..."
          readOnly={!canEdit}
        />
      </div>

      {/* Fallback legado */}
      {hasLegacyOnly && (
        <div>
          <SectionKicker>Descrição geral</SectionKicker>
          <SectionTextarea
            value={contentMd}
            onChange={setContentMd}
            onBlur={() => persist({ content_md: contentMd })}
            placeholder="Descrição em texto livre..."
            readOnly={!canEdit}
          />
        </div>
      )}

      <div className="h-[14px] text-[11px] text-text-subtle">
        {saveDraft.isPending ? "Salvando…" : savedHint ? "Salvo" : ""}
      </div>
    </div>
  );
}
