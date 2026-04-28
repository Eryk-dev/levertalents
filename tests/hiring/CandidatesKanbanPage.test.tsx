import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Plan 02-10 gap closure — testes de integração para a page CandidatesKanban
// (Wave 4 wire-in: PipelineFilters + BoardTableToggle + CandidatesTable +
// CardFieldsCustomizer + LegacyStageWarning) e RS-10 Encerradas com lista
// real de terminais (useTerminalApplications).

// Mocks ANTES de importar a page.
vi.mock("@/hooks/hiring/useJobOpening", () => ({
  useJobOpening: vi.fn(),
}));

vi.mock("@/hooks/hiring/useApplications", async () => {
  const actual = await vi.importActual<
    typeof import("@/hooks/hiring/useApplications")
  >("@/hooks/hiring/useApplications");
  return {
    ...actual,
    useApplicationsByJob: vi.fn(),
    useReuseCandidateForJob: vi.fn(() => ({
      mutate: vi.fn(),
      mutateAsync: vi.fn(),
      isPending: false,
    })),
  };
});

vi.mock("@/hooks/hiring/useLegacyStageCount", () => ({
  useLegacyStageCount: vi.fn(() => ({ data: 0 })),
}));

// Stubs para filhos profundos — testamos a page, não os filhos.
vi.mock("@/components/hiring/CandidatesKanban", () => ({
  CandidatesKanban: () => <div data-testid="board-stub" />,
}));

vi.mock("@/components/hiring/CandidateDrawer", () => ({
  CandidateDrawer: () => <div data-testid="drawer-stub" />,
}));

vi.mock("@/components/hiring/CandidateForm", () => ({
  CandidateForm: () => <div data-testid="candidate-form-stub" />,
}));

import CandidatesKanbanPage from "@/pages/hiring/CandidatesKanban";
import { useJobOpening } from "@/hooks/hiring/useJobOpening";
import { useApplicationsByJob } from "@/hooks/hiring/useApplications";

const mockedJob = {
  id: "j1",
  title: "Vaga Teste",
  company_id: "c1",
};

function renderPage() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={["/hiring/jobs/j1/candidates"]}>
        <Routes>
          <Route
            path="/hiring/jobs/:id/candidates"
            element={<CandidatesKanbanPage />}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useJobOpening).mockReturnValue({
    data: mockedJob,
    isLoading: false,
  } as unknown as ReturnType<typeof useJobOpening>);
  vi.mocked(useApplicationsByJob).mockReturnValue({
    data: [],
    isLoading: false,
  } as unknown as ReturnType<typeof useApplicationsByJob>);
});

describe("CandidatesKanbanPage — Wave 4 wire-in (Plan 02-10 gap closure)", () => {
  it("smoke: renderiza com job carregado", () => {
    renderPage();
    expect(screen.getByText("Vaga Teste")).toBeInTheDocument();
  });

  it("renderiza PipelineFilters + BoardTableToggle + CardFieldsCustomizer no toolbar", () => {
    renderPage();
    expect(
      screen.getByRole("search", { name: /filtros/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("tablist", { name: /visualização/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /customizar campos/i }),
    ).toBeInTheDocument();
  });

  it("alterna entre views Quadro e Tabela", async () => {
    renderPage();
    // Default view = board → board-stub presente, sem table.
    expect(screen.getByTestId("board-stub")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: /tabela/i }));
    await waitFor(() => {
      expect(screen.getByRole("table")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("tab", { name: /quadro/i }));
    await waitFor(() => {
      expect(screen.queryByRole("table")).not.toBeInTheDocument();
      expect(screen.getByTestId("board-stub")).toBeInTheDocument();
    });
  });

  it("Encerradas Collapsible lista candidatos terminais reais (RS-10 fechado)", async () => {
    vi.mocked(useApplicationsByJob).mockReturnValue({
      data: [
        {
          id: "a1",
          candidate_id: "cd1",
          candidate: { id: "cd1", full_name: "Maria Silva" },
          stage: "admitido",
          stage_entered_at: "2026-04-20T10:00:00Z",
          job_opening_id: "j1",
        },
        {
          id: "a2",
          candidate_id: "cd2",
          candidate: { id: "cd2", full_name: "João Pereira" },
          stage: "recusado",
          stage_entered_at: "2026-04-15T10:00:00Z",
          job_opening_id: "j1",
        },
        {
          id: "a3",
          candidate_id: "cd3",
          candidate: { id: "cd3", full_name: "Ana Souza" },
          stage: "apto_entrevista_rh",
          stage_entered_at: "2026-04-22T10:00:00Z",
          job_opening_id: "j1",
        },
      ],
      isLoading: false,
    } as unknown as ReturnType<typeof useApplicationsByJob>);

    renderPage();
    fireEvent.click(
      screen.getByRole("button", { name: /histórico desta vaga/i }),
    );

    expect(await screen.findByText("Maria Silva")).toBeInTheDocument();
    expect(await screen.findByText("João Pereira")).toBeInTheDocument();
    expect(screen.queryByText("Ana Souza")).not.toBeInTheDocument();
    expect(await screen.findByText("Admitido")).toBeInTheDocument();
    expect(await screen.findByText("Recusado")).toBeInTheDocument();
    expect(
      screen.queryByText(
        /Etapas terminais \(admitido\/recusado\/reprovado\)/i,
      ),
    ).not.toBeInTheDocument();
  });

  it("Encerradas mostra empty state PT-BR quando não há terminais", async () => {
    renderPage();
    fireEvent.click(
      screen.getByRole("button", { name: /histórico desta vaga/i }),
    );
    expect(
      await screen.findByText(/Nenhum candidato em etapa final/i),
    ).toBeInTheDocument();
  });
});
