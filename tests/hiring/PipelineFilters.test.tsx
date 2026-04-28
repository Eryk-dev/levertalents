import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";
import { PipelineFilters, usePipelineFilters } from "@/components/hiring/PipelineFilters";

/**
 * Helper que renderiza PipelineFilters dentro de um MemoryRouter e expõe o
 * `location.search` corrente via test probe — assim asserções podem inspecionar
 * a URL após o debounce / select changes.
 */
function LocationProbe({ onLocation }: { onLocation: (search: string) => void }) {
  const location = useLocation();
  onLocation(location.search);
  return null;
}

function renderInRouter(initialEntries: string[] = ["/"]) {
  let lastSearch = "";
  const utils = render(
    <MemoryRouter initialEntries={initialEntries}>
      <PipelineFilters />
      <LocationProbe onLocation={(s) => (lastSearch = s)} />
    </MemoryRouter>,
  );
  return { ...utils, getSearch: () => lastSearch };
}

describe("PipelineFilters — URL state + debounce (RS-09)", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("lê filtros iniciais de useSearchParams (q da URL pré-popula input)", () => {
    renderInRouter(["/?q=joao"]);
    const input = screen.getByPlaceholderText(/buscar candidato/i) as HTMLInputElement;
    expect(input.value).toBe("joao");
  });

  it("renderiza search input + 3 selects + Limpar filtros condicional", () => {
    // Sem filtro: sem botão Limpar.
    const { unmount } = renderInRouter(["/"]);
    expect(screen.getByPlaceholderText(/buscar candidato/i)).toBeInTheDocument();
    expect(screen.queryByText(/Limpar filtros/i)).not.toBeInTheDocument();
    unmount();

    // Com filtro vaga ativo: aparece Limpar filtros.
    renderInRouter(["/?vaga=eng-backend"]);
    expect(screen.getByText(/Limpar filtros/i)).toBeInTheDocument();
  });

  it("debounce 300ms — typing 'joao' atualiza URL apenas após 300ms", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { getSearch } = renderInRouter(["/"]);

    const input = screen.getByPlaceholderText(/buscar candidato/i);
    await user.type(input, "joao");

    // Antes do debounce: URL ainda vazia.
    expect(getSearch()).toBe("");

    // Após 300ms: URL inclui q=joao.
    await act(async () => {
      vi.advanceTimersByTime(350);
    });

    await waitFor(() => {
      expect(getSearch()).toContain("q=joao");
    });
  });

  it("Limpar filtros zera URL params e local search", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { getSearch } = renderInRouter(["/?vaga=eng-backend&q=joao"]);

    expect(getSearch()).toContain("vaga=eng-backend");
    const clearButton = screen.getByText(/Limpar filtros/i);

    await user.click(clearButton);

    await waitFor(() => {
      expect(getSearch()).toBe("");
    });

    const input = screen.getByPlaceholderText(/buscar candidato/i) as HTMLInputElement;
    expect(input.value).toBe("");
  });

  it("usePipelineFilters retorna shape correto com defaults 'all'", () => {
    let parsed: ReturnType<typeof usePipelineFilters> | null = null;
    function Probe() {
      parsed = usePipelineFilters();
      return null;
    }
    render(
      <MemoryRouter initialEntries={["/?vaga=x&fase=triagem"]}>
        <Probe />
      </MemoryRouter>,
    );
    expect(parsed).toEqual({
      vaga: "x",
      fase: "triagem",
      origem: "all",
      tag: "all",
      searchTerm: "",
    });
  });
});
