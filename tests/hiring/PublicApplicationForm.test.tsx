import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { server } from "../msw/server";
import PublicApplicationForm from "@/components/hiring/PublicApplicationForm";

// Plan 02-09 Task 3 (TDD) — TAL-04 LGPD opt-in:
// 3 checkboxes não pré-marcados (1 obrigatório + 2 opcionais);
// microcopy LGPD locked; submit bloqueia sem consent_aplicacao_vaga.

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  server.resetHandlers();
});

function renderForm() {
  return render(
    <PublicApplicationForm
      jobId="job-1"
      companyName="Test Co"
      fitSurvey={null}
      fitQuestions={[]}
    />,
  );
}

describe("PublicApplicationForm — TAL-04 opt-in NÃO pré-marcado", () => {
  it("renderiza pelo menos 3 checkboxes (1 obrigatório + 2 opcionais) NÃO pré-marcados", () => {
    renderForm();
    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes.length).toBeGreaterThanOrEqual(3);
    for (const cb of checkboxes) {
      expect(cb).not.toBeChecked();
    }
  });

  it("microcopy LGPD aparece sob cada checkbox", () => {
    renderForm();
    // Checkbox 1 obrigatório — base legal art 7º V (procedimento pré-contratual)
    expect(screen.getByText(/LGPD art\.\s*7º\s*V/i)).toBeInTheDocument();
    // Checkbox 2 — Banco de Talentos: 24 meses
    expect(screen.getByText(/24 meses/i)).toBeInTheDocument();
    // Checkbox 3 — clientes externos
    expect(
      screen.getByText(/clientes externos|empresas-clientes/i),
    ).toBeInTheDocument();
  });

  it("submit bloqueia se consent_aplicacao_vaga não marcado (mostra erro Zod)", async () => {
    const user = userEvent.setup();
    renderForm();
    const submitBtn = screen.getByRole("button", {
      name: /enviar candidatura|enviando|enviar/i,
    });
    await user.click(submitBtn);
    expect(
      await screen.findByText(/Você precisa aceitar/i),
    ).toBeInTheDocument();
  });
});
