# Implementation Plan: Hiring Pipeline

**Branch**: `001-hiring-pipeline` | **Date**: 2026-04-16 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-hiring-pipeline/spec.md`

## Summary

Add an end-to-end recruiting/hiring module to the existing Lever Talents Hub
app so RH can manage the entire funnel (abertura de vaga → descritivo →
publicação → candidatos → Fit Cultural → antecedentes → entrevistas →
decisão final → pré-cadastro de colaborador) inside a single platform,
replacing today's Notion + Drive + WhatsApp sprawl. The technical approach
keeps the existing Supabase + React + shadcn stack intact, introduces a new
set of Postgres tables with RLS, adds a public unauthenticated Fit Cultural
form, implements optimistic locking across all mutable entities, enforces
LGPD retention (5-year automatic anonymization + on-demand), and integrates
approvals with the existing `profiles` / `team_members` trigger path so an
approved candidate becomes a colaborador pré-cadastrado without
re-digitation. No new third-party AI vendor is introduced in this phase.

## Technical Context

**Language/Version**: TypeScript 5.8 (strict) on the frontend; Deno (Supabase
Edge Functions runtime) on the backend; SQL for migrations (Postgres 15 /
Supabase flavour).
**Primary Dependencies**: React 18 + Vite 5 + react-router-dom 6 +
@tanstack/react-query 5 + @supabase/supabase-js 2 + shadcn/ui (Radix primitives)
+ Tailwind 3.4 (with brand tokens `navy`, `turquoise`, `status-*` and utility
classes `card-elevated`, `hero-surface`, `kpi-value`, `section-title`,
`page-title`, `caption-label`) + Space Grotesk font + date-fns 3 +
@dnd-kit/core+sortable (already in `package.json`, reused for the candidate
Kanban) + react-hook-form 7 + zod 3 (existing).

**Reuse (non-negotiable)**: the existing design-system primitives in
`src/components/primitives/` — `PageHeader`, `StatCard`, `SectionCard`,
`StatusBadge`, `LoadingState`, `EmptyState`, `ScoreDisplay`,
`PageTransition` — MUST be used by every hiring screen; no duplicate of
these in `src/components/hiring/`. The persistent authenticated `<Layout />`
(Sidebar + Header + Outlet) MUST wrap every hiring route **except** the
public Fit Cultural form. Hiring breadcrumbs/titles are registered in
`src/lib/routes.ts`; hiring sidebar entries are added via
`useSidebarGroups()` in `src/components/Sidebar.tsx`. **No new top-level
dependency** is introduced by this feature.
**Storage**: Supabase Postgres 15 (new tables under `public` with RLS);
Supabase Storage for CV files, descritivo PDFs, background-check files, and
interview transcriptions — 1 logical bucket (`hiring`) with per-company path
prefixes and RLS policies mirroring row-level visibility.
**Testing**: Acceptance test via running dev server (`npm run dev`) against
local Supabase (per constitution "Local verification"); the repo does not
ship a unit-test framework yet and this feature does not introduce one.
`tsc --noEmit` and `npm run lint` MUST pass (constitution Dev Workflow).
**Target Platform**: Web (modern evergreen browsers — Chrome/Edge/Safari/
Firefox current + 1 version back), served from Vite SPA; Fit Cultural public
form must work on mobile browsers (candidates submitting via phone).
**Project Type**: web-service (frontend SPA + Supabase backend, already the
shape of the existing repo — no new top-level directories).
**Performance Goals**:
- Dashboard data freshness ≤ 1 min (spec SC-007)
- Prontuário do candidato renderizado < 30 s a partir da notificação (SC-006)
- Kanban de uma vaga com até 200 candidatos: primeira render em ≤ 2 s,
  interação drag-and-drop com feedback visual ≤ 100 ms
- Postgres p95 ≤ 200 ms para consultas de dashboard e Kanban sob o volume
  alvo (ver Scale/Scope).
**Constraints**:
- Availability: 99,5% mensal (SC-009); RPO 24 h, RTO 4 h (SC-010) via
  Supabase backups diários + retenção 30 dias.
- Optimistic locking obrigatório em todas as escritas críticas (FR-032/033).
- LGPD: retenção de PII por 5 anos após encerramento; anonimização agendada
  + on-demand (FR-029).
- Role vocabulary restrito ao `app_role` enum existente (`admin`, `socio`,
  `rh`, `lider`, `colaborador`) — nenhum papel novo (constitution II).
- Todas as operações privilegiadas (anonimização, criação de pré-cadastro,
  emissão de token público do Fit Cultural, export CSV que cruza empresas)
  rodam em Edge Functions com `verify_jwt = true` ou, para a função pública
  do Fit Cultural, validação explícita de token de uso único
  (constitution IV).
- Sem mock data em qualquer tela de produção (constitution III).
**Scale/Scope**:
- Volume atual: 5-10 vagas/mês, ~200 candidatos/mês, 3 empresas-cliente
  ativas, ~10 gestores, ~3 RHs, ~3 sócios.
- Dimensionamento v1: 3x o atual (≈30 vagas/mês, ≈600 candidatos/mês, ≈10
  empresas-cliente) — spec Assumptions.
- Frontend: ~12 novas rotas/telas sob o app existente; reuso intenso de
  componentes shadcn já instalados.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The constitution defines 5 principles. Each is surfaced here as a concrete
gate for this feature; every gate is re-checked after Phase 1.

### I. Database is the Source of Truth — **PASS**

- Every new entity (ver `data-model.md`) lands as a migration under
  `supabase/migrations/`, with the corresponding RLS policies in the same
  migration.
- `src/integrations/supabase/types.ts` will be regenerated after each
  migration and committed alongside.
- Frontend queries reference only columns that exist in the migrations on
  disk; no ad-hoc schema tweaks in production.
- No `supabase.from('X').select('Y')` against tables/columns that are not
  in the shipped migrations.

### II. Roles and Row-Level Security Are Non-Negotiable — **PASS**

- Hiring uses the existing `app_role` values only (`admin`, `socio`, `rh`,
  `lider`, `colaborador`). No new role is introduced; "Recrutador" is
  explicitly folded into `rh`/`socio` (spec Assumptions).
- Every new public table ships with `ENABLE ROW LEVEL SECURITY` and at
  least one explicit policy covering read, insert, update, delete per role.
- Visibility rules (FR-027: confidenciais) are enforced as RLS policies,
  not client-side filters alone.
- The Supabase service-role key is NEVER used from the browser; the only
  places it appears are inside Edge Functions (see IV).
- The public Fit Cultural form uses a signed, single-use token validated by
  a dedicated Edge Function — the anon client key is NOT granted
  write-access to `cultural_fit_responses` directly.

### III. No Mock Data in Shipped UI — **PASS**

- All dashboard widgets (FR-030) source from real Postgres queries via
  React Query; no hardcoded numbers.
- Empty-state components are rendered explicitly when a vaga has zero
  candidatos, zero entrevistas, etc. (reuse `src/components/EmptyState.tsx`).
- No "preview" data is shipped to production screens; any fixture data
  lives next to future tests, not in pages.

### IV. Privileged Operations Live in Edge Functions — **PASS**

New / reused Edge Functions (ver `contracts/`):

1. `hiring-approve-application` — creates `profiles` pré-cadastro +
   `team_members` row when RH confirms admissão; needs service role to
   invoke `auth.admin.createUser` for invite flow. `verify_jwt = true`,
   re-checks role ∈ {`rh`, `socio`, `admin`}.
2. `hiring-anonymize-candidate` — anonymizes one candidate on demand
   (FR-029). Called by RH/Sócio UI; also invoked by cron (item 5).
   `verify_jwt = true`, role-gated.
3. `hiring-export-pipeline-csv` — generates pipeline/candidates CSV
   (FR-031). Uses service role only because it must cross-company aggregate
   under RH/Sócio scope; role-gated inside handler.
4. `hiring-issue-fit-cultural-link` — mints a single-use, time-bound
   (3 dias, FR-015) signed token for a given application, and emails/logs
   the URL. `verify_jwt = true`, role ∈ {`rh`, `socio`, `admin`}.
5. `hiring-submit-fit-cultural-public` — public endpoint that validates the
   token and writes the response; **no JWT** (`verify_jwt = false`), but
   the function itself validates the token cryptographically and enforces
   rate-limit + honeypot per FR-015. This is the only public function this
   feature introduces.
6. `hiring-cron-anonymize-expired` — scheduled nightly; anonymizes any
   candidato whose processo seletivo foi encerrado há >5 anos (FR-029).
   `verify_jwt = false` but guarded by Supabase cron auth and IP allow-list
   of the scheduler.
7. `hiring-cron-expire-fit-links` — scheduled hourly; invalidates Fit
   Cultural tokens > 3 dias and flips candidato status para "Sem retorno"
   (FR-015). Same guarding as (6).

No `auth.admin.*` call from the browser. All functions read Supabase
credentials from environment variables in the Deno runtime.

### V. The 1:1 → PDI Loop Is the Backbone — **PASS**

- The hiring module is strictly orthogonal to the 1:1/PDI loop and does
  not replace any part of it.
- On approval, `hiring-approve-application` creates a `profiles` row +
  `team_members` row (with `leader_id`) — the exact same entry point the
  existing 1:1 and PDI flows rely on. Foreign keys from `one_on_ones`,
  `development_plans`, and `team_members` are not touched.
- No new "parallel" leader-collaborator linkage is introduced; the hiring
  pre-cadastro plugs into the existing structure.

### Overall — **PASS (no justified exceptions)**

No items land in Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/001-hiring-pipeline/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (Edge Function + RPC contracts)
│   ├── hiring-approve-application.md
│   ├── hiring-anonymize-candidate.md
│   ├── hiring-export-pipeline-csv.md
│   ├── hiring-issue-fit-cultural-link.md
│   ├── hiring-submit-fit-cultural-public.md
│   ├── hiring-cron-anonymize-expired.md
│   └── hiring-cron-expire-fit-links.md
├── checklists/          # Quality checklists (if any)
└── tasks.md             # Phase 2 output (/speckit.tasks — not created here)
```

### Source Code (repository root)

The existing repo is a single Vite SPA + Supabase project. The hiring
feature extends it in-place; no new top-level project.

```text
src/
├── pages/
│   ├── hiring/
│   │   ├── JobOpenings.tsx            # FR-001/002 — lista + abertura
│   │   ├── JobOpeningDetail.tsx       # descritivo + aprovação + links
│   │   ├── CandidatesKanban.tsx       # FR-010/011 — kanban por vaga
│   │   ├── CandidateProfile.tsx       # FR-012 — timeline + artefatos
│   │   ├── HiringDashboard.tsx        # FR-030 — métricas + gargalos
│   │   ├── CulturalFitTemplates.tsx   # FR-013 — gestão de questionários
│   │   └── PublicCulturalFit.tsx      # FR-015 — form público (fora do Layout)
│   └── ... (existing pages untouched)
├── components/
│   ├── hiring/
│   │   ├── JobOpeningForm.tsx
│   │   ├── JobDescriptionEditor.tsx   # versionamento + PDF
│   │   ├── CandidateCard.tsx          # card do Kanban
│   │   ├── CandidateForm.tsx
│   │   ├── CulturalFitQuestionEditor.tsx
│   │   ├── CulturalFitResponseViewer.tsx
│   │   ├── BackgroundCheckUploader.tsx
│   │   ├── InterviewScheduler.tsx
│   │   ├── InterviewNotesEditor.tsx
│   │   ├── HiringDecisionPanel.tsx
│   │   ├── PipelineFilters.tsx
│   │   ├── BottleneckAlert.tsx
│   │   └── OptimisticMutationToast.tsx # reuso genérico para FR-032
│   └── ... (existing components untouched)
├── hooks/
│   ├── hiring/
│   │   ├── useJobOpenings.ts
│   │   ├── useJobOpening.ts
│   │   ├── useCandidates.ts
│   │   ├── useApplication.ts
│   │   ├── useCulturalFit.ts
│   │   ├── useInterviews.ts
│   │   ├── useHiringMetrics.ts
│   │   └── useOptimisticVersion.ts    # util central de versionamento
│   └── ... (existing hooks untouched)
├── lib/
│   ├── hiring/
│   │   ├── statusMachine.ts           # state transitions da vaga + app
│   │   ├── rlsScope.ts                # helpers que explicam o que o user vê
│   │   └── retention.ts               # util de cálculo de data de expurgo
│   └── ... (existing libs untouched)
└── integrations/supabase/
    └── types.ts                        # regenerado

supabase/
├── migrations/
│   ├── 20260416193000_hiring_core_entities.sql
│   ├── 20260416193100_hiring_rls_policies.sql
│   ├── 20260416193200_hiring_public_cultural_fit.sql
│   ├── 20260416193300_hiring_storage_bucket.sql
│   ├── 20260416193400_hiring_audit_and_locking.sql
│   └── 20260416193500_hiring_cron_jobs.sql  # pg_cron schedules
└── functions/
    ├── hiring-approve-application/
    ├── hiring-anonymize-candidate/
    ├── hiring-export-pipeline-csv/
    ├── hiring-issue-fit-cultural-link/
    ├── hiring-submit-fit-cultural-public/
    ├── hiring-cron-anonymize-expired/
    └── hiring-cron-expire-fit-links/
```

**Structure Decision**: Single Vite SPA + Supabase project (already the
repo shape — constitution Stack & Operational Constraints). New code is
grouped under `src/pages/hiring/`, `src/components/hiring/`,
`src/hooks/hiring/`, `src/lib/hiring/`, and new
`supabase/migrations/2026041619*` files plus new folders under
`supabase/functions/hiring-*`. No other top-level directories are
introduced.

**Integration with existing UI shell** (refactor de 2026-04-16):

- **Rotas autenticadas** (`/hiring/jobs`, `/hiring/jobs/:id`,
  `/hiring/jobs/:id/candidates`, `/hiring/candidates/:id`,
  `/hiring/dashboard`, `/hiring/fit-templates`) são declaradas em
  `src/App.tsx` **dentro** do bloco `<Route element={isAuthenticated ?
  <Layout /> : <Navigate to="/auth" />}>`, junto com as rotas existentes
  — herdam Sidebar, Header e PageTransition automaticamente.
- **Rota pública** `/hiring/fit/:token` é declarada **fora** do
  `<Layout />`, antes do catch-all, sem `ProtectedRoute`. Essa tela
  não tem sidebar nem breadcrumb.
- **Labels e breadcrumbs**: cada pathname novo recebe uma entrada em
  `src/lib/routes.ts` nos maps `LABELS` e no switch de
  `getBreadcrumbs()` (ex.: `/hiring/jobs/:id` → `[ {label:"Vagas",
  to:"/hiring/jobs"}, {label:"Detalhe da vaga"} ]`).
- **Navegação lateral**: adicionar um grupo `"Recrutamento"` em
  `useSidebarGroups()` com itens
  `Vagas`, `Candidatos`, `Dashboard de Hiring`, `Templates Fit Cultural`,
  visível quando `canManage = isAdmin || isRH || isSocio` (líderes
  acessam via "Vagas" que já filtra por RLS nas suas empresas, sem item
  dedicado na sidebar para não poluir o menu deles).
- **Tasks pendentes**: `pending_tasks` já é consumido pelo
  `PendingTasksDropdown` no Header. Inserções nas tabelas de hiring
  criarão rows lá via trigger (ver R7 revisado em `research.md`), então
  o bell atualiza automaticamente sem código adicional no shell.
- **Primitives reuse**: toda `src/pages/hiring/*.tsx` começa por
  `<PageHeader>`, usa `<SectionCard>` para blocos, `<StatCard>` para
  KPIs do dashboard, `<StatusBadge kind="…">` para status (vamos
  estender `kind` para aceitar `"job"` e `"application"` — ver
  research R11), `<EmptyState>` para estados vazios e `<LoadingState>`
  para skeletons. Zero `div` custom imitando card/page header/etc.

## Complexity Tracking

> No constitutional violations. Table intentionally empty.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| (none)    | (n/a)      | (n/a)                                |
