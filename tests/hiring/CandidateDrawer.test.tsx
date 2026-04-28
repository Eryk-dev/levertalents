import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { MemoryRouter } from "react-router-dom";

import { server } from "../msw/server";
import * as scopeModule from "@/app/providers/ScopeProvider";
import * as authModule from "@/hooks/useAuth";
import { CandidateDrawer } from "@/components/hiring/drawer/CandidateDrawer";

// Plan 02-09 Task 2 — testes para o shell do CandidateDrawer pós-split.
// Cobre comportamento preservado: ESC fecha; ?tab= sincroniza; Audit log
// gating por role.

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL ?? "https://ehbxpbeijofxtsbezwxd.supabase.co";

function mockScope() {
  vi.spyOn(scopeModule, "useScope").mockReturnValue({
    scope: {
      kind: "company",
      id: "company:abc",
      companyIds: ["c1"],
      name: "Test Co",
    },
    setScope: vi.fn(),
    pendingScope: null,
    confirmPendingScope: vi.fn(),
    cancelPendingScope: vi.fn(),
    isFixed: false,
    visibleCompanies: [],
    visibleGroups: [],
    isResolving: false,
  } as unknown as ReturnType<typeof scopeModule.useScope>);
}

function mockAuth(role: "admin" | "rh" | "lider" | "liderado" = "rh") {
  vi.spyOn(authModule, "useAuth").mockReturnValue({
    user: { id: "u1" },
    loading: false,
    userRole: role,
    realRole: role,
    viewAsRole: null,
    setViewAsRole: vi.fn(),
    isViewingAs: false,
  } as unknown as ReturnType<typeof authModule.useAuth>);
}

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false },
    },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(
      QueryClientProvider,
      { client },
      React.createElement(MemoryRouter, null, children),
    );
  return { client, Wrapper };
}

const drawerCandidate = {
  id: "c-1",
  full_name: "Foo Bar",
  email: "foo@x.com",
  phone: null,
  cpf: null,
  document_type: "cpf",
  document_number: null,
  source: null,
  cv_storage_path: null,
  anonymized_at: null,
  anonymization_reason: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

function defaultHandlers() {
  // RPC read_candidate_with_log → returns the drawer candidate
  server.use(
    http.post(`${SUPABASE_URL}/rest/v1/rpc/read_candidate_with_log`, () =>
      HttpResponse.json(drawerCandidate),
    ),
    // applications by candidate (returns empty list — drawer renders mesmo assim)
    http.get(`${SUPABASE_URL}/rest/v1/applications`, () => HttpResponse.json([])),
    // catch-all para tabelas auxiliares (cultural_fit_responses, interviews, etc.)
    http.get(`${SUPABASE_URL}/rest/v1/cultural_fit_responses`, () =>
      HttpResponse.json([]),
    ),
    http.get(`${SUPABASE_URL}/rest/v1/cultural_fit_surveys`, () =>
      HttpResponse.json([]),
    ),
    http.get(`${SUPABASE_URL}/rest/v1/interviews`, () => HttpResponse.json([])),
    http.get(`${SUPABASE_URL}/rest/v1/job_openings`, () => HttpResponse.json([])),
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
  mockScope();
  mockAuth("rh");
  defaultHandlers();
});

afterEach(() => {
  server.resetHandlers();
});

describe("CandidateDrawer (split shell)", () => {
  it("renderiza Header + Tabs após carregar candidate via RPC read_candidate_with_log", async () => {
    const { Wrapper } = createWrapper();
    render(
      <Wrapper>
        <CandidateDrawer candidateId="c-1" onClose={vi.fn()} />
      </Wrapper>,
    );
    // Header renderiza nome
    await waitFor(() =>
      expect(screen.getByText("Foo Bar")).toBeInTheDocument(),
    );
    // Tab strip presente
    expect(screen.getByRole("tab", { name: /perfil/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /entrevistas/i })).toBeInTheDocument();
  });

  it("ESC fecha drawer (chama onClose)", async () => {
    const onClose = vi.fn();
    const { Wrapper } = createWrapper();
    render(
      <Wrapper>
        <CandidateDrawer candidateId="c-1" onClose={onClose} />
      </Wrapper>,
    );
    await waitFor(() =>
      expect(screen.getByText("Foo Bar")).toBeInTheDocument(),
    );
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("Audit log tab visível quando userRole=admin", async () => {
    mockAuth("admin");
    const { Wrapper } = createWrapper();
    render(
      <Wrapper>
        <CandidateDrawer candidateId="c-1" onClose={vi.fn()} />
      </Wrapper>,
    );
    await waitFor(() =>
      expect(screen.getByText("Foo Bar")).toBeInTheDocument(),
    );
    expect(
      screen.getByRole("tab", { name: /audit log/i }),
    ).toBeInTheDocument();
  });

  it("Audit log tab oculto quando userRole=liderado", async () => {
    mockAuth("liderado");
    const { Wrapper } = createWrapper();
    render(
      <Wrapper>
        <CandidateDrawer candidateId="c-1" onClose={vi.fn()} />
      </Wrapper>,
    );
    await waitFor(() =>
      expect(screen.getByText("Foo Bar")).toBeInTheDocument(),
    );
    // Audit tab MUST NOT render in DOM when role denies it
    expect(
      screen.queryByRole("tab", { name: /audit log/i }),
    ).not.toBeInTheDocument();
    // Sanity: outras tabs renderizam normalmente
    expect(screen.getByRole("tab", { name: /perfil/i })).toBeInTheDocument();
  });
});
