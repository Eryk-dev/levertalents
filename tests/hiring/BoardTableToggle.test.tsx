import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, renderHook, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  BoardTableToggle,
  useKanbanView,
} from "@/components/hiring/BoardTableToggle";
import { CandidatesTable } from "@/components/hiring/CandidatesTable";
import type { KanbanApplication } from "@/components/hiring/CandidateCard";

describe("useKanbanView — localStorage persist (D-09)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("retorna 'board' default quando localStorage vazio", () => {
    const { result } = renderHook(() => useKanbanView("j1"));
    expect(result.current[0]).toBe("board");
  });

  it("persiste alteração em localStorage namespace por jobId", () => {
    const { result } = renderHook(() => useKanbanView("j1"));
    act(() => result.current[1]("table"));
    expect(localStorage.getItem("leverup:rs:view:j1")).toBe("table");
    expect(result.current[0]).toBe("table");
  });

  it("isola por jobId — j2 não é afetado por j1", () => {
    const { result: r1 } = renderHook(() => useKanbanView("j1"));
    act(() => r1.current[1]("table"));
    const { result: r2 } = renderHook(() => useKanbanView("j2"));
    expect(r2.current[0]).toBe("board");
  });

  it("lê view inicial de localStorage no mount", () => {
    localStorage.setItem("leverup:rs:view:j1", "table");
    const { result } = renderHook(() => useKanbanView("j1"));
    expect(result.current[0]).toBe("table");
  });

  it("valor inválido em localStorage → fallback para board", () => {
    localStorage.setItem("leverup:rs:view:j1", "invalido");
    const { result } = renderHook(() => useKanbanView("j1"));
    expect(result.current[0]).toBe("board");
  });
});

describe("BoardTableToggle — UI controlado", () => {
  it("renderiza 2 tabs Quadro / Tabela", () => {
    render(<BoardTableToggle jobId="j1" value="board" onChange={() => {}} />);
    expect(screen.getByRole("tab", { name: /Quadro/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Tabela/i })).toBeInTheDocument();
  });

  it("aria-selected reflete a value prop", () => {
    const { rerender } = render(
      <BoardTableToggle jobId="j1" value="board" onChange={() => {}} />,
    );
    expect(screen.getByRole("tab", { name: /Quadro/i })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tab", { name: /Tabela/i })).toHaveAttribute(
      "aria-selected",
      "false",
    );

    rerender(
      <BoardTableToggle jobId="j1" value="table" onChange={() => {}} />,
    );
    expect(screen.getByRole("tab", { name: /Tabela/i })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("chama onChange ao clicar Tabela", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <BoardTableToggle jobId="j1" value="board" onChange={onChange} />,
    );
    await user.click(screen.getByRole("tab", { name: /Tabela/i }));
    expect(onChange).toHaveBeenCalledWith("table");
  });
});

describe("CandidatesTable — sort manual + render (RS-13)", () => {
  const baseDate = "2026-04-10T12:00:00Z";
  const olderDate = "2026-04-01T12:00:00Z";

  const mkApp = (over: Partial<KanbanApplication>): KanbanApplication => ({
    id: over.id ?? "a1",
    candidate_id: "c1",
    candidate_name: over.candidate_name ?? "Alpha",
    stage: over.stage ?? "em_interesse",
    stage_entered_at: over.stage_entered_at ?? baseDate,
    desired_role: over.desired_role ?? null,
    job_title: over.job_title ?? null,
    nextInterviewAt: over.nextInterviewAt ?? null,
    ...over,
  });

  it("renderiza colunas: Nome, Cargo, Dias, Etapa, Próxima entrevista", () => {
    render(
      <CandidatesTable applications={[mkApp({})]} onOpen={() => {}} />,
    );
    expect(
      screen.getByRole("columnheader", { name: /Nome/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: /Cargo pretendido/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: /Dias na etapa/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: /^Etapa$/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: /Próxima entrevista/i }),
    ).toBeInTheDocument();
  });

  it("sort por dias-na-etapa default desc (mais antigos primeiro)", () => {
    const apps = [
      mkApp({ id: "newer", candidate_name: "Newer", stage_entered_at: baseDate }),
      mkApp({ id: "older", candidate_name: "Older", stage_entered_at: olderDate }),
    ];
    render(<CandidatesTable applications={apps} onOpen={() => {}} />);
    const rows = screen.getAllByRole("row");
    // rows[0] is header; rows[1] should be older (more days), rows[2] newer
    expect(rows[1]).toHaveTextContent("Older");
    expect(rows[2]).toHaveTextContent("Newer");
  });

  it("sort por nome (asc) ao clicar header Nome", async () => {
    const user = userEvent.setup();
    const apps = [
      mkApp({ id: "z", candidate_name: "Zeta" }),
      mkApp({ id: "a", candidate_name: "Alpha" }),
    ];
    render(<CandidatesTable applications={apps} onOpen={() => {}} />);

    await user.click(screen.getByRole("columnheader", { name: /Nome/i }));
    let rows = screen.getAllByRole("row");
    expect(rows[1]).toHaveTextContent("Alpha");
    expect(rows[2]).toHaveTextContent("Zeta");

    // Segundo clique inverte para desc.
    await user.click(screen.getByRole("columnheader", { name: /Nome/i }));
    rows = screen.getAllByRole("row");
    expect(rows[1]).toHaveTextContent("Zeta");
    expect(rows[2]).toHaveTextContent("Alpha");
  });

  it("clique na row chama onOpen com a application", async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    const app = mkApp({ id: "x1", candidate_name: "Test" });
    render(<CandidatesTable applications={[app]} onOpen={onOpen} />);
    await user.click(screen.getByText("Test"));
    expect(onOpen).toHaveBeenCalledWith(app);
  });

  it("estado vazio quando applications=[]", () => {
    render(<CandidatesTable applications={[]} onOpen={() => {}} />);
    expect(
      screen.getByText(/Nenhum candidato com esses filtros/i),
    ).toBeInTheDocument();
  });

  it("selectedId aplica bg-accent-soft + data-selected na row", () => {
    const app = mkApp({ id: "selected-1", candidate_name: "Sel" });
    render(
      <CandidatesTable
        applications={[app]}
        onOpen={() => {}}
        selectedId="selected-1"
      />,
    );
    const row = screen.getByText("Sel").closest("tr");
    expect(row).toHaveAttribute("data-selected", "true");
    expect(row?.className).toContain("bg-accent-soft");
  });
});
