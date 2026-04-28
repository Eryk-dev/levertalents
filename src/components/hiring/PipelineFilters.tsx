import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * PipelineFilters — Phase 2 RS-09 (Plan 02-08 rewrite).
 *
 * Inline horizontal filter bar para o kanban de candidatos. URL é a source
 * of truth (compartilhável: `?vaga=X&fase=Y&origem=Z&q=...`). Search input
 * usa 300ms debounce antes de atualizar a URL para evitar history pollution.
 *
 * Active chip styling: `bg-accent-soft text-accent-text border-accent/30`.
 * Inactive: padrão neutro do Select trigger. "Limpar filtros" só aparece
 * quando algum filtro está ativo.
 *
 * O shape antigo (modal-style com props value/onChange e Period preset
 * para o dashboard de analytics) foi inlined no único consumer
 * (HiringDashboard) — as filtros do dashboard de analytics são domínio
 * diferente (date-range + companyId + managerId) das filtros do pipeline
 * (vaga + fase + origem + q).
 */

export const FILTER_KEYS = ["vaga", "fase", "origem", "tag", "q"] as const;
export type FilterKey = (typeof FILTER_KEYS)[number];

const STAGE_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: "triagem", label: "Triagem" },
  { value: "checagem", label: "Checagem" },
  { value: "entrevista_rh", label: "Entrevista RH" },
  { value: "entrevista_final", label: "Entrevista Final" },
  { value: "decisao", label: "Decisão" },
];

const SOURCE_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: "linkedin", label: "LinkedIn" },
  { value: "site", label: "Site" },
  { value: "indicacao", label: "Indicação" },
  { value: "manual", label: "Manual" },
];

interface PipelineFiltersProps {
  /** Optional list de vagas para o select de Vaga. Default: vazio. */
  jobs?: ReadonlyArray<{ id: string; title: string }>;
}

export function PipelineFilters({ jobs = [] }: PipelineFiltersProps = {}) {
  const [searchParams, setSearchParams] = useSearchParams();

  const vaga = searchParams.get("vaga") ?? "all";
  const fase = searchParams.get("fase") ?? "all";
  const origem = searchParams.get("origem") ?? "all";
  const q = searchParams.get("q") ?? "";

  // Local state para search com debounce 300ms.
  const [localSearch, setLocalSearch] = useState(q);

  // Sync local input quando URL muda externamente (e.g. back button).
  useEffect(() => {
    setLocalSearch((prev) => (prev === q ? prev : q));
  }, [q]);

  // Debounce URL update do search.
  useEffect(() => {
    if (localSearch === q) return;
    const timer = setTimeout(() => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (localSearch) next.set("q", localSearch);
          else next.delete("q");
          return next;
        },
        { replace: true },
      );
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearch, q, setSearchParams]);

  const updateFilter = (key: FilterKey, value: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value === "all" || !value) next.delete(key);
      else next.set(key, value);
      return next;
    });
  };

  const hasActive = FILTER_KEYS.some((k) => {
    const v = searchParams.get(k);
    return v !== null && v !== "" && v !== "all";
  });

  const clearAll = () => {
    setSearchParams({}, { replace: true });
    setLocalSearch("");
  };

  const activeChipClass =
    "bg-accent-soft text-accent-text border-accent/30";

  return (
    <div
      className="flex items-center gap-2 flex-wrap py-2 px-3 border-b border-default bg-surface"
      role="search"
      aria-label="Filtros do pipeline"
    >
      <div className="relative">
        <Search
          className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted"
          aria-hidden
        />
        <Input
          type="search"
          placeholder="Buscar candidato..."
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          className="pl-7 w-64 h-7 text-[13px]"
          aria-label="Buscar candidato"
        />
      </div>

      <Select value={vaga} onValueChange={(v) => updateFilter("vaga", v)}>
        <SelectTrigger
          className={cn(
            "h-7 text-[13px] w-auto min-w-[140px]",
            vaga !== "all" && activeChipClass,
          )}
          aria-label="Filtrar por vaga"
        >
          <SelectValue placeholder="Vaga" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas as vagas</SelectItem>
          {jobs.map((job) => (
            <SelectItem key={job.id} value={job.id}>
              {job.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={fase} onValueChange={(v) => updateFilter("fase", v)}>
        <SelectTrigger
          className={cn(
            "h-7 text-[13px] w-auto min-w-[140px]",
            fase !== "all" && activeChipClass,
          )}
          aria-label="Filtrar por fase"
        >
          <SelectValue placeholder="Fase" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas as fases</SelectItem>
          {STAGE_OPTIONS.map((s) => (
            <SelectItem key={s.value} value={s.value}>
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={origem} onValueChange={(v) => updateFilter("origem", v)}>
        <SelectTrigger
          className={cn(
            "h-7 text-[13px] w-auto min-w-[140px]",
            origem !== "all" && activeChipClass,
          )}
          aria-label="Filtrar por origem"
        >
          <SelectValue placeholder="Origem" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas as origens</SelectItem>
          {SOURCE_OPTIONS.map((s) => (
            <SelectItem key={s.value} value={s.value}>
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasActive && (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-[11px] ml-auto"
          onClick={clearAll}
        >
          Limpar filtros
        </Button>
      )}
    </div>
  );
}

/**
 * Hook companion para query consumers parsearem os filtros direto da URL
 * sem prop drilling.
 */
export function usePipelineFilters() {
  const [searchParams] = useSearchParams();
  return {
    vaga: searchParams.get("vaga") ?? "all",
    fase: searchParams.get("fase") ?? "all",
    origem: searchParams.get("origem") ?? "all",
    tag: searchParams.get("tag") ?? "all",
    searchTerm: searchParams.get("q") ?? "",
  };
}
