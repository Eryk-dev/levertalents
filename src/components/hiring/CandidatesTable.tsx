import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { daysSince } from "@/lib/hiring/sla";
import { formatBRDate } from "@/lib/formatBR";
import { APPLICATION_STAGE_LABELS } from "@/lib/hiring/statusMachine";
import type { KanbanApplication } from "./CandidateCard";

/**
 * CandidatesTable — Phase 2 RS-13 / D-09 (Plan 02-08).
 *
 * HTML `<table>` baseado nas primitives shadcn (NÃO usa TanStack Table —
 * volume baixo, sort por 4 campos é trivial com Array.sort + useMemo, ver
 * 02-RESEARCH.md §11).
 *
 * Sortable: Nome, Dias na etapa, Etapa, Próxima entrevista. Sort default:
 * dias-na-etapa DESC (mais antigos primeiro — sinaliza candidatos parados).
 *
 * Selected row: `bg-accent-soft` + `data-selected="true"` para hooks de
 * estilização adicional (e.g. drawer aninhado).
 */

type SortField = "name" | "stage" | "days_in_stage" | "next_interview";
type SortDir = "asc" | "desc";

export interface CandidatesTableProps {
  applications: KanbanApplication[];
  onOpen: (app: KanbanApplication) => void;
  selectedId?: string | null;
}

export function CandidatesTable({
  applications,
  onOpen,
  selectedId,
}: CandidatesTableProps) {
  const [sortField, setSortField] = useState<SortField>("days_in_stage");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const sorted = useMemo(() => {
    const arr = [...applications];
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "name":
          cmp = (a.candidate_name ?? "").localeCompare(b.candidate_name ?? "");
          break;
        case "stage":
          cmp = (a.stage ?? "").localeCompare(b.stage ?? "");
          break;
        case "days_in_stage":
          cmp = daysSince(a.stage_entered_at) - daysSince(b.stage_entered_at);
          break;
        case "next_interview":
          // Empty next_interview ordena no fim sempre (asc/desc).
          if (!a.nextInterviewAt && !b.nextInterviewAt) cmp = 0;
          else if (!a.nextInterviewAt) cmp = 1;
          else if (!b.nextInterviewAt) cmp = -1;
          else cmp = a.nextInterviewAt.localeCompare(b.nextInterviewAt);
          // Para "next_interview" o sortDir não é invertido em empty values
          // — mantém os com valor primeiro.
          if (!a.nextInterviewAt || !b.nextInterviewAt) return cmp;
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [applications, sortField, sortDir]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const SortHead = ({
    field,
    label,
  }: {
    field: SortField;
    label: string;
  }) => (
    <TableHead
      onClick={() => toggleSort(field)}
      className="cursor-pointer select-none"
      aria-sort={
        sortField === field
          ? sortDir === "asc"
            ? "ascending"
            : "descending"
          : "none"
      }
    >
      <span className="flex items-center gap-1">
        {label}
        {sortField === field &&
          (sortDir === "asc" ? (
            <ArrowUp
              className="w-3 h-3"
              aria-label="Ordenado crescente"
            />
          ) : (
            <ArrowDown
              className="w-3 h-3"
              aria-label="Ordenado decrescente"
            />
          ))}
      </span>
    </TableHead>
  );

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <SortHead field="name" label="Nome" />
          <TableHead>Cargo pretendido</TableHead>
          <SortHead field="days_in_stage" label="Dias na etapa" />
          <SortHead field="stage" label="Etapa" />
          <SortHead field="next_interview" label="Próxima entrevista" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.length === 0 ? (
          <TableRow>
            <TableCell
              colSpan={5}
              className="text-center text-text-muted py-8"
            >
              Nenhum candidato com esses filtros
            </TableCell>
          </TableRow>
        ) : (
          sorted.map((app) => {
            const isSelected = selectedId === app.id;
            return (
              <TableRow
                key={app.id}
                onClick={() => onOpen(app)}
                className={cn(
                  "cursor-pointer hover:bg-bg-subtle",
                  isSelected && "bg-accent-soft",
                )}
                data-selected={isSelected ? "true" : "false"}
              >
                <TableCell className="font-medium">
                  {app.candidate_name ?? "—"}
                </TableCell>
                <TableCell className="text-text-muted">
                  {app.desired_role ?? app.job_title ?? "—"}
                </TableCell>
                <TableCell className="tabular-nums">
                  {daysSince(app.stage_entered_at)}d
                </TableCell>
                <TableCell>
                  {APPLICATION_STAGE_LABELS[app.stage] ?? app.stage}
                </TableCell>
                <TableCell className="text-text-muted">
                  {app.nextInterviewAt
                    ? formatBRDate(app.nextInterviewAt)
                    : "—"}
                </TableCell>
              </TableRow>
            );
          })
        )}
      </TableBody>
    </Table>
  );
}
