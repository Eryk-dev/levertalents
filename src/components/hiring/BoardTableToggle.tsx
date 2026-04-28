import { useEffect, useState } from "react";
import { LayoutGrid, LayoutList } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * BoardTableToggle — Phase 2 D-09 (Plan 02-08).
 *
 * Segmented control "Quadro · Tabela" com persistência em localStorage
 * namespaced por jobId: `leverup:rs:view:{jobId}` (CONTEXT.md mini-decisão).
 * Isolado por vaga — usuário pode preferir Quadro em uma vaga e Tabela em
 * outra.
 *
 * Reuso do hook `useKanbanView` em qualquer parent que precise da view
 * persistida; o componente em si é dumb (recebe value + onChange).
 *
 * NOTA brand: ícones LayoutGrid / LayoutList são neutros (não logo, não
 * brand identity). LeverArrow primitive não se aplica — esse toggle é
 * controle de UI puro. Nenhum Lucide ArrowX usado.
 */

export type KanbanView = "board" | "table";

const STORAGE_KEY = (jobId: string) => `leverup:rs:view:${jobId}`;

function readStoredView(jobId: string): KanbanView {
  try {
    const stored = localStorage.getItem(STORAGE_KEY(jobId));
    return stored === "table" ? "table" : "board";
  } catch {
    // localStorage indisponível (privado/incognito) — fallback para board.
    return "board";
  }
}

/**
 * Hook que lê/escreve a view escolhida em localStorage. Retorna tuple
 * [view, setView] estilo useState.
 */
export function useKanbanView(
  jobId: string,
): [KanbanView, (next: KanbanView) => void] {
  const [view, setView] = useState<KanbanView>(() => readStoredView(jobId));

  // Re-read quando jobId muda (usuário troca de vaga).
  useEffect(() => {
    setView(readStoredView(jobId));
  }, [jobId]);

  const updateView = (next: KanbanView) => {
    setView(next);
    try {
      localStorage.setItem(STORAGE_KEY(jobId), next);
    } catch {
      // Silent fail — UI continua funcional, apenas não persiste.
    }
  };

  return [view, updateView];
}

interface BoardTableToggleProps {
  jobId: string;
  value: KanbanView;
  onChange: (next: KanbanView) => void;
}

export function BoardTableToggle({ value, onChange }: BoardTableToggleProps) {
  return (
    <div
      className="inline-flex rounded-md border border-default bg-surface p-0.5"
      role="tablist"
      aria-label="Visualização"
    >
      <button
        type="button"
        role="tab"
        aria-selected={value === "board"}
        onClick={() => onChange("board")}
        className={cn(
          "inline-flex items-center gap-1.5 rounded h-6 px-2 text-[11px] font-medium transition-colors",
          value === "board"
            ? "bg-accent-soft text-accent-text"
            : "text-text-muted hover:text-text",
        )}
      >
        <LayoutGrid className="w-3 h-3" aria-hidden />
        Quadro
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={value === "table"}
        onClick={() => onChange("table")}
        className={cn(
          "inline-flex items-center gap-1.5 rounded h-6 px-2 text-[11px] font-medium transition-colors",
          value === "table"
            ? "bg-accent-soft text-accent-text"
            : "text-text-muted hover:text-text",
        )}
      >
        <LayoutList className="w-3 h-3" aria-hidden />
        Tabela
      </button>
    </div>
  );
}
