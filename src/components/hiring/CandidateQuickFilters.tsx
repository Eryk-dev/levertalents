import { useMemo, useRef, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/primitives";
import { Row } from "@/components/primitives/LinearKit";
import { STAGE_GROUPS } from "@/lib/hiring/stageGroups";
import { APPLICATION_STAGE_LABELS } from "@/lib/hiring/statusMachine";
import type { ApplicationStage } from "@/integrations/supabase/hiring-types";

export interface QuickFiltersState {
  search: string;
  stages: string[];
  jobIds: string[];
  ownerIds: string[];
}

interface CandidateQuickFiltersProps {
  value: QuickFiltersState;
  onChange: (next: QuickFiltersState) => void;
}

interface JobOption {
  id: string;
  title: string;
  requested_by: string | null;
}

interface OwnerOption {
  id: string;
  full_name: string | null;
}

/**
 * Barra de filtros rápidos estilo Linear.
 * - Busca à esquerda (controla `value.search`).
 * - Chips por stage (multi-select) — um chip por grupo, expande em sub-stages.
 * - Dropdowns compactos para Vaga e Owner (multi-select).
 * - "N filtros ativos · Limpar" aparece à direita quando há qualquer filtro.
 */
export function CandidateQuickFilters({ value, onChange }: CandidateQuickFiltersProps) {
  const [stageMenuOpen, setStageMenuOpen] = useState(false);
  const [jobMenuOpen, setJobMenuOpen] = useState(false);
  const [ownerMenuOpen, setOwnerMenuOpen] = useState(false);

  const jobs = useQuery<JobOption[]>({
    queryKey: ["hiring", "job-openings", "filter-options"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_openings")
        .select("id, title, requested_by, status")
        .neq("status", "encerrada")
        .order("opened_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return ((data ?? []) as Array<{ id: string; title: string; requested_by: string | null }>).map((j) => ({
        id: j.id,
        title: j.title,
        requested_by: j.requested_by,
      }));
    },
  });

  const owners = useQuery<OwnerOption[]>({
    queryKey: ["hiring", "candidates-owners"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name")
        .order("full_name")
        .limit(200);
      if (error) throw error;
      return (data ?? []) as OwnerOption[];
    },
  });

  const activeCount =
    (value.search.trim().length > 0 ? 1 : 0) +
    value.stages.length +
    value.jobIds.length +
    value.ownerIds.length;

  const clearAll = () =>
    onChange({ search: "", stages: [], jobIds: [], ownerIds: [] });

  const toggleStage = (stage: ApplicationStage) => {
    const has = value.stages.includes(stage);
    onChange({
      ...value,
      stages: has ? value.stages.filter((s) => s !== stage) : [...value.stages, stage],
    });
  };

  const toggleStageGroup = (groupStages: ApplicationStage[]) => {
    const allActive = groupStages.every((s) => value.stages.includes(s));
    const set = new Set(value.stages);
    if (allActive) {
      groupStages.forEach((s) => set.delete(s));
    } else {
      groupStages.forEach((s) => set.add(s));
    }
    onChange({ ...value, stages: Array.from(set) });
  };

  const toggleJob = (id: string) => {
    const has = value.jobIds.includes(id);
    onChange({
      ...value,
      jobIds: has ? value.jobIds.filter((j) => j !== id) : [...value.jobIds, id],
    });
  };

  const toggleOwner = (id: string) => {
    const has = value.ownerIds.includes(id);
    onChange({
      ...value,
      ownerIds: has ? value.ownerIds.filter((o) => o !== id) : [...value.ownerIds, id],
    });
  };

  const ownerMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const o of owners.data ?? []) m.set(o.id, o.full_name || "Sem nome");
    return m;
  }, [owners.data]);

  const jobMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const j of jobs.data ?? []) m.set(j.id, j.title);
    return m;
  }, [jobs.data]);

  return (
    <div className="pt-3 pb-2.5 border-b border-border">
      <Row gap={6} wrap align="center" justify="between">
        <Row gap={6} wrap align="center">
          {/* Search */}
          <div className="inline-flex items-center gap-1.5 px-2 h-[26px] border border-border rounded-md bg-surface text-[12px] w-[220px]">
            <Icon name="search" size={12} className="text-text-subtle shrink-0" />
            <input
              type="text"
              value={value.search}
              onChange={(e) => onChange({ ...value, search: e.target.value })}
              placeholder="Buscar candidato"
              className="flex-1 bg-transparent outline-none text-[12px] text-text placeholder:text-text-subtle"
            />
            {value.search.length > 0 ? (
              <button
                type="button"
                onClick={() => onChange({ ...value, search: "" })}
                className="text-text-subtle hover:text-text shrink-0"
                aria-label="Limpar busca"
              >
                <Icon name="x" size={12} />
              </button>
            ) : null}
          </div>

          {/* Stage chips (Linear-style multi — toggla todos os sub-stages do grupo) */}
          {STAGE_GROUPS.map((group) => {
            const groupActive = group.stages.some((s) => value.stages.includes(s));
            return (
              <QuickChip
                key={group.key}
                active={groupActive}
                onClick={() => toggleStageGroup(group.stages)}
                label={<span className="truncate">{group.label}</span>}
              />
            );
          })}
        </Row>

        <Row gap={6} align="center">
          {/* Dropdown: Vaga */}
          <PopoverChip
            icon={<Icon name="briefcase" size={12} />}
            label={
              value.jobIds.length === 0
                ? "Vaga"
                : value.jobIds.length === 1
                  ? jobMap.get(value.jobIds[0]) ?? "Vaga"
                  : `Vaga · ${value.jobIds.length}`
            }
            active={value.jobIds.length > 0}
            open={jobMenuOpen}
            onOpenChange={setJobMenuOpen}
          >
            <MenuList
              empty={!jobs.data || jobs.data.length === 0}
              emptyLabel={jobs.isLoading ? "Carregando..." : "Sem vagas abertas"}
            >
              {(jobs.data ?? []).map((job) => (
                <MenuItem
                  key={job.id}
                  checked={value.jobIds.includes(job.id)}
                  onClick={() => toggleJob(job.id)}
                  label={job.title}
                />
              ))}
            </MenuList>
          </PopoverChip>

          {/* Dropdown: Owner */}
          <PopoverChip
            icon={<Icon name="users" size={12} />}
            label={
              value.ownerIds.length === 0
                ? "Recrutador"
                : value.ownerIds.length === 1
                  ? (ownerMap.get(value.ownerIds[0]) ?? "").split(" ")[0] || "Recrutador"
                  : `Recrutador · ${value.ownerIds.length}`
            }
            active={value.ownerIds.length > 0}
            open={ownerMenuOpen}
            onOpenChange={setOwnerMenuOpen}
          >
            <MenuList
              empty={!owners.data || owners.data.length === 0}
              emptyLabel={owners.isLoading ? "Carregando..." : "Sem perfis"}
            >
              {(owners.data ?? []).map((o) => (
                <MenuItem
                  key={o.id}
                  checked={value.ownerIds.includes(o.id)}
                  onClick={() => toggleOwner(o.id)}
                  label={o.full_name || "Sem nome"}
                />
              ))}
            </MenuList>
          </PopoverChip>

          {/* Sub-stage dropdown (opcional: abre todos os sub-stages ativos por grupo) */}
          <PopoverChip
            icon={<Icon name="filter" size={12} />}
            label={
              value.stages.length === 0
                ? "Mais"
                : `Etapas · ${value.stages.length}`
            }
            active={value.stages.length > 0}
            open={stageMenuOpen}
            onOpenChange={setStageMenuOpen}
          >
            <MenuList empty={false} emptyLabel="">
              {STAGE_GROUPS.flatMap((g) =>
                g.stages.map((s) => (
                  <MenuItem
                    key={s}
                    checked={value.stages.includes(s)}
                    onClick={() => toggleStage(s)}
                    label={APPLICATION_STAGE_LABELS[s]}
                    hint={g.label}
                  />
                )),
              )}
            </MenuList>
          </PopoverChip>

          {activeCount > 0 ? (
            <button
              type="button"
              onClick={clearAll}
              className="h-[26px] px-2 text-[11.5px] text-text-muted hover:text-text inline-flex items-center gap-1"
            >
              <span className="tabular-nums">{activeCount}</span>
              <span>{activeCount === 1 ? "filtro ativo" : "filtros ativos"}</span>
              <span className="opacity-60">·</span>
              <span className="font-medium">Limpar</span>
            </button>
          ) : null}
        </Row>
      </Row>
    </div>
  );
}

/* ─── Chip Linear (bg-text quando ativo) ─────────────────── */

interface QuickChipProps {
  label: React.ReactNode;
  icon?: React.ReactNode;
  active: boolean;
  onClick?: () => void;
}

function QuickChip({ label, icon, active, onClick }: QuickChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 h-[26px] px-2.5 rounded-[6px] border text-[12px]",
        "transition-colors whitespace-nowrap",
        active
          ? "bg-text text-[hsl(var(--text-inverse))] border-text"
          : "bg-surface border-border text-text-muted hover:bg-bg-subtle hover:text-text",
      )}
    >
      {icon ? <span className="shrink-0">{icon}</span> : null}
      {label}
    </button>
  );
}

/* ─── Popover wrapper em chip ────────────────────────────── */

interface PopoverChipProps {
  icon?: React.ReactNode;
  label: React.ReactNode;
  active: boolean;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  children: React.ReactNode;
}

function PopoverChip({
  icon,
  label,
  active,
  open,
  onOpenChange,
  children,
}: PopoverChipProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (ev: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(ev.target as Node)) onOpenChange(false);
    };
    const kb = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", kb);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", kb);
    };
  }, [open, onOpenChange]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        className={cn(
          "inline-flex items-center gap-1 h-[26px] px-2.5 rounded-[6px] border text-[12px]",
          "transition-colors whitespace-nowrap",
          active
            ? "bg-text text-[hsl(var(--text-inverse))] border-text"
            : "bg-surface border-border text-text-muted hover:bg-bg-subtle hover:text-text",
        )}
      >
        {icon ? <span className="shrink-0">{icon}</span> : null}
        <span className="truncate max-w-[120px]">{label}</span>
        <Icon name="chevDown" size={12} className="shrink-0 opacity-70" />
      </button>
      {open ? (
        <div className="absolute right-0 top-[30px] z-40 min-w-[220px] max-w-[300px] rounded-md border border-border bg-surface shadow-ds-lg">
          {children}
        </div>
      ) : null}
    </div>
  );
}

function MenuList({
  children,
  empty,
  emptyLabel,
}: {
  children: React.ReactNode;
  empty: boolean;
  emptyLabel: string;
}) {
  if (empty) {
    return (
      <div className="px-3 py-4 text-[12px] text-text-subtle text-center">
        {emptyLabel}
      </div>
    );
  }
  return <div className="max-h-[280px] overflow-auto py-1 scrollbar-linear">{children}</div>;
}

function MenuItem({
  checked,
  onClick,
  label,
  hint,
}: {
  checked: boolean;
  onClick: () => void;
  label: string;
  hint?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-[12px]",
        "hover:bg-bg-subtle transition-colors",
        checked ? "text-text" : "text-text-muted",
      )}
    >
      <span
        className={cn(
          "grid h-[14px] w-[14px] place-items-center rounded-[3px] border shrink-0",
          checked ? "bg-text border-text text-[hsl(var(--text-inverse))]" : "bg-surface border-border",
        )}
      >
        {checked ? <Icon name="check" size={10} strokeWidth={2.5} /> : null}
      </span>
      <span className="flex-1 truncate">{label}</span>
      {hint ? (
        <span className="text-[10.5px] text-text-subtle shrink-0 uppercase tracking-[0.04em]">
          {hint}
        </span>
      ) : null}
    </button>
  );
}
