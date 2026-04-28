import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

// Mock useApplicationsByJob ANTES de importar o hook que o consome.
vi.mock("@/hooks/hiring/useApplications", () => ({
  useApplicationsByJob: vi.fn(),
}));

import { useApplicationsByJob } from "@/hooks/hiring/useApplications";
import {
  useTerminalApplications,
  TERMINAL_STAGES,
  isTerminalStage,
} from "@/hooks/hiring/useTerminalApplications";

type MockReturn = ReturnType<typeof useApplicationsByJob>;

function mockReturn(data: unknown[]): MockReturn {
  return {
    data,
    isLoading: false,
    isError: false,
    error: null,
    isPending: false,
    isSuccess: true,
    status: "success",
    fetchStatus: "idle",
  } as unknown as MockReturn;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useTerminalApplications (Plan 02-10 gap closure RS-10)", () => {
  it("TERMINAL_STAGES exporta exatamente os 3 stages terminais reais do enum (sem 'reprovado'/'descartado' fictícios)", () => {
    expect(TERMINAL_STAGES).toEqual([
      "admitido",
      "reprovado_pelo_gestor",
      "recusado",
    ]);
    expect(isTerminalStage("admitido")).toBe(true);
    expect(isTerminalStage("reprovado_pelo_gestor")).toBe(true);
    expect(isTerminalStage("recusado")).toBe(true);
    expect(isTerminalStage("apto_entrevista_rh")).toBe(false);
    expect(isTerminalStage("aprovado")).toBe(false);
  });

  it("filtra applications terminais e ordena por stage_entered_at DESC", () => {
    vi.mocked(useApplicationsByJob).mockReturnValue(
      mockReturn([
        {
          id: "a1",
          candidate_id: "c1",
          stage: "admitido",
          stage_entered_at: "2026-04-15T10:00:00Z",
          candidate: { id: "c1", full_name: "Antiga" },
        },
        {
          id: "a2",
          candidate_id: "c2",
          stage: "apto_entrevista_rh",
          stage_entered_at: "2026-04-22T10:00:00Z",
          candidate: { id: "c2", full_name: "Ativa Não-Terminal" },
        },
        {
          id: "a3",
          candidate_id: "c3",
          stage: "recusado",
          stage_entered_at: "2026-04-25T10:00:00Z",
          candidate: { id: "c3", full_name: "Recente" },
        },
        {
          id: "a4",
          candidate_id: "c4",
          stage: "reprovado_pelo_gestor",
          stage_entered_at: "2026-04-20T10:00:00Z",
          candidate: { id: "c4", full_name: "Meio" },
        },
        {
          id: "a5",
          candidate_id: "c5",
          stage: "entrevista_rh_agendada",
          stage_entered_at: "2026-04-26T10:00:00Z",
          candidate: { id: "c5", full_name: "Ativa Recente" },
        },
      ]),
    );

    const { result } = renderHook(() => useTerminalApplications("j1"));

    // 3 terminais (não 5).
    expect(result.current.data).toHaveLength(3);

    const ids = result.current.data.map((a) => a.id);
    // Ordem: a3 (25/04) → a4 (20/04) → a1 (15/04).
    expect(ids).toEqual(["a3", "a4", "a1"]);
  });

  it("propaga data: [] quando jobId é undefined (sem crash)", () => {
    vi.mocked(useApplicationsByJob).mockReturnValue(mockReturn([]));

    const { result } = renderHook(() => useTerminalApplications(undefined));

    expect(result.current.data).toEqual([]);
  });
});
