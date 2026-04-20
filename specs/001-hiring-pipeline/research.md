# Phase 0 Research: Hiring Pipeline

All items in Technical Context were already grounded (no open `NEEDS
CLARIFICATION` tags). The research below documents the **how** decisions
that the spec did not pin down but the plan requires before Phase 1 can
define contracts and schema.

---

## R1. Optimistic locking scheme (FR-032/033)

**Decision**: Every mutable hiring table gets a `updated_at timestamptz
NOT NULL DEFAULT now()` column maintained by a `BEFORE UPDATE` trigger
(`tg_set_updated_at`). Clients read `updated_at` with the row; on write,
they pass the loaded value as part of the `UPDATE … WHERE id = $1 AND
updated_at = $2` predicate. If the returned row count is 0, the client
refetches and surfaces a toast (`OptimisticMutationToast.tsx`).

**Rationale**: Native Postgres pattern, zero dependency added, plays nicely
with Supabase RLS (the `WHERE` filter is evaluated after RLS), and
covered by existing audit trigger infrastructure. Keeps contract with
FR-032: no silent last-write-wins. Cheap to instrument in
`useOptimisticVersion.ts`.

**Alternatives considered**:

- *`xmin` system column*: more accurate (per-row transaction id) but
  requires casting to text for the client and not part of the
  auto-generated Supabase types → fragile typing.
- *Dedicated `version BIGINT` column incremented explicitly*: more work
  for no real gain; `updated_at` already has to be maintained for audit
  and for the "parada há X dias" dashboard query.
- *Pessimistic locking via advisory locks*: overkill for the volume
  (≤30 vagas/mês, ≤600 candidatos/mês); would require WebSocket + lock
  broker (explicitly rejected in clarification Q4).

**Consequences**:

- Every UPDATE path in the Edge Functions and in React Query mutations
  MUST pass the `updated_at` clock it read. Any function that bypasses
  this is a review-blocking violation.
- `updated_at` precision is microsecond; a single user doing two writes
  inside the same microsecond is practically impossible, so collisions
  are real conflicts.

---

## R2. Public Fit Cultural form authentication (FR-015)

**Decision**: The RH-facing UI triggers `hiring-issue-fit-cultural-link`
(JWT-authenticated). The Edge Function mints a 32-byte random token (base64url)
stored in a new table `cultural_fit_tokens` with:

- `application_id uuid` (FK)
- `token_hash text` (SHA-256 of the raw token; raw token is **never** stored)
- `expires_at timestamptz` (issued_at + 3 days)
- `consumed_at timestamptz NULL`
- `revoked_at timestamptz NULL`

Only the hash lives in the DB; the raw token is only returned once in the
email/WhatsApp link shown to the RH. The public Edge Function
`hiring-submit-fit-cultural-public` takes the raw token + responses,
hashes it, looks up the unexpired, unconsumed, unrevoked row, writes the
responses with the application id derived from the token, marks the
token `consumed_at = now()`, and updates the application status.

**Rationale**:

- Unauthenticated public URL per FR-015.
- Token hashing protects against leaked DB dumps (a stolen DB still does
  not grant entry to an open link).
- `cultural_fit_tokens` never gets `SELECT` RLS for `anon` — only the
  Edge Function (service role) reads it.
- 32 bytes ≈ 256 bits of entropy; collisions and guessing are
  cryptographically negligible.

**Alternatives considered**:

- *JWT with HS256 + `application_id` in claim*: shorter but any leak of
  the JWT signing secret leaks every previous link. Random + DB lookup
  fails closed on revocation.
- *Supabase magic link*: forces a user account to exist, violating FR-015
  ("sem necessidade de login do candidato").

**Consequences**:

- New table `cultural_fit_tokens` with RLS blocking `anon` entirely;
  only service role reads/writes.
- `hiring-cron-expire-fit-links` marks `revoked_at` for tokens > 3 d and
  flips application status.
- Rate-limit and honeypot field in the form itself (FR-015) handled in
  the Edge Function body (per-IP per-token limit; reject if honeypot
  filled).

---

## R3. LGPD auto-anonymization (FR-029)

**Decision**: Anonymization is implemented as a SQL function
`public.anonymize_candidate(candidate_id uuid)` that rewrites identifying
columns (`full_name`, `email`, `phone`, `cpf`, `document_number`) with
deterministic sentinels (e.g., `'[anonymized]'`, plus a synthetic email
`anon-<uuid>@anon.invalid`), nulls the CV storage reference, marks
`anonymized_at = now()` and `anonymization_reason`, and cascades to the
`cultural_fit_responses.payload` (free-text answers wiped), background
checks (file reference set NULL, flag preserved), and interview
transcripts (text wiped, metadata preserved). Aggregate rows
(`applications.*` status, `interviews.*` dates, counters) are preserved
unchanged — they're already anonymous.

Two invokers:

- `hiring-anonymize-candidate` (manual, on-demand) — called by RH/Sócio.
- `hiring-cron-anonymize-expired` (nightly pg_cron) — runs
  `SELECT anonymize_candidate(id) FROM candidates WHERE NOT anonymized
  AND all_applications_closed_before(now() - interval '5 years')`.

**Rationale**: Keeping the anonymization logic as a single SQL function
guarantees both paths behave identically, and it can be exercised from
tests without going through HTTP. The "closed process + 5 years" rule
is expressed at the candidate level so a candidate with one recent
process is never partially anonymized.

**Alternatives considered**:

- *DELETE instead of anonymize*: violates FR-029 explicit preservation
  of aggregate/statistical data.
- *TTL on rows via `pg_partman`*: overkill; data volume is tiny (<<
  10k candidate rows over 5 years).

**Consequences**:

- Every table that holds PII ships with an anonymization column
  participant documented in `data-model.md`.
- The cron runs nightly in UTC; grace window of ±24 h around the 5-year
  mark is acceptable (does not breach LGPD — the law requires deletion
  "as soon as the purpose is fulfilled"; 5 y + 1 day is well-justified).

---

## R4. Kanban persistence & drag-and-drop integrity (FR-010/011)

**Decision**: The Kanban ordering **within a column** is not persisted —
columns sort by `stage_entered_at DESC`, so newest card is on top. Only
the stage transition is persisted:

```
updateApplicationStage({ applicationId, fromStage, toStage, expectedUpdatedAt })
→ UPDATE applications SET stage = $toStage, stage_entered_at = now(),
  updated_at = now(), last_moved_by = auth.uid()
  WHERE id = $applicationId AND updated_at = $expectedUpdatedAt
  AND stage = $fromStage
```

If row count = 0 → reload + show conflict toast (R1). The
`application_stage_history` audit table receives one row per successful
transition (`from_stage`, `to_stage`, `moved_by`, `moved_at`, `note`).

**Rationale**:

- Avoids a "position" column that drifts under concurrent drag.
- `from_stage` check in `WHERE` prevents a lost update where user A
  moved to "Antecedentes OK" and user B was about to move from
  "Aguardando Fit" — B's drag should fail, not silently jump two
  stages.
- Using @dnd-kit already in the dependency list (no new packages).

**Alternatives considered**:

- *Fractional indexing (LexoRank / fractional-index)*: elegant for a
  sortable column, but we do not need manual within-column ordering
  (users reported chronological is fine).
- *Realtime subscription to stage changes*: nice to have; deferred to
  a follow-up because it's not load-bearing for the 1-min freshness
  target (React Query auto-refetch on focus + 60s staleTime suffices).

**Consequences**:

- `application_stage_history` is the audit source for the dashboard's
  "parada há X dias" metric (FR-030) — query the latest history row.
- Drag feedback in `@dnd-kit/core` must show optimistic state with a
  rollback path if the server rejects the transition.

---

## R5. CSV export architecture (FR-031)

**Decision**: A dedicated Edge Function `hiring-export-pipeline-csv`
receives filter params (empresa, período, status), queries Postgres
with a service role client that first validates the caller's
`app_role` and scopes the `WHERE` clause to that user's allowed
companies, and streams a CSV response (`Content-Type: text/csv;
charset=utf-8`, `Content-Disposition: attachment`).

**Rationale**:

- Client-side CSV generation would force shipping raw candidate data
  into the browser even for users who might be scoped to a subset —
  harder to audit than a server-side function.
- Streaming lets a >10k-row export finish without memory spikes in
  Deno.
- `app_role` is re-validated inside the function body (constitution IV).

**Alternatives considered**:

- *Client-side `papaparse` on the React Query result set*: rejected —
  exposes the full dataset to the browser; double-fetch for "export
  all" vs "view filtered" would be wasteful.
- *Supabase `pg_dump`-style export*: too coarse; can't respect
  per-company RLS scoping.

**Consequences**:

- The function logs the requester, filter params, row count, and
  timestamp for auditability.
- The CSV header column set is committed in the contract doc so
  external consumers (clients receiving the file) have a stable format.

---

## R6. Storage bucket layout (Assumptions: storage reuses platform buckets)

**Decision**: Single bucket `hiring` with the following path convention:

```
hiring/
├── companies/<company_id>/jobs/<job_id>/descricao/<version>.pdf
├── companies/<company_id>/jobs/<job_id>/candidates/<candidate_id>/cv.<ext>
├── companies/<company_id>/jobs/<job_id>/candidates/<candidate_id>/background/<uuid>.<ext>
└── companies/<company_id>/jobs/<job_id>/candidates/<candidate_id>/interviews/<interview_id>/transcript.<ext>
```

Access policy: RLS on storage uses the `company_id` prefix match against
the caller's allowed companies (existing pattern already used for
`meeting-recordings` bucket per audit notes in migrations). Confidential
vagas add a second check against `job_openings.confidential_participant_ids`.

**Rationale**:

- Prefix-based path lets one RLS policy cover reads without per-object
  ACLs.
- Mirrors the existing `companies/<company_id>/…` convention so
  back-up tooling treats both buckets uniformly.
- `<candidate_id>` in the path keeps anonymization simple — delete the
  prefix when wiping.

**Alternatives considered**:

- *Separate bucket per artifact type (CV, PDF, transcript)*: triples
  the number of RLS policies and scripts; no storage quota advantage
  on Supabase Pro.
- *Flat bucket with metadata tags*: harder to enumerate/delete on
  anonymization.

**Consequences**:

- Migration `20260416193300_hiring_storage_bucket.sql` creates the
  bucket and RLS.
- Anonymization function deletes `companies/*/jobs/*/candidates/<id>/*`.

---

## R7. Notifications (FR-006, FR-021) — *revisado após refactor de 2026-04-16*

**Decision**: Reusar a tabela `pending_tasks` já existente (criada em
`20251009195041_…sql` e populada por triggers reais desde
`20260416192400_populate_pending_tasks.sql`), consumida pelo
`PendingTasksDropdown` no Header. O hiring insere tasks na mesma tabela
com `task_types` novos, via triggers nas tabelas de hiring.

Migration adicional: estender o `CHECK` de `pending_tasks.task_type`
para aceitar os tipos de hiring, mantendo compatibilidade com os
existentes (`evaluation`, `one_on_one`, `climate_survey`,
`pdi_approval`, `pdi_update`, `action_item`, `other`). Novos valores:

- `hiring_job_approval` — Gestor precisa aprovar descritivo (FR-006).
- `hiring_job_review` — RH precisa revisar rejeição do Gestor.
- `hiring_candidate_stage_change` — RH recebe quando candidato
  progride (opcional, baixa prioridade).
- `hiring_interview_reminder` — 24h antes da entrevista (FR-021).
- `hiring_final_decision` — Gestor precisa registrar decisão final.
- `hiring_admission_followup` — RH precisa concluir admissão após
  aprovação.
- `hiring_fit_cultural_received` — RH vê quando candidato submete
  formulário público.
- `hiring_fit_cultural_expired` — RH vê quando link expirou sem
  resposta (link para reenviar).

O `related_id` aponta para o `job_openings.id`, `applications.id` ou
`interviews.id` conforme o tipo; os ícones e rotas do dropdown
(`TASK_ICONS`, `TASK_ROUTES` em `PendingTasksDropdown.tsx`) precisam
ganhar mapeamento para esses novos tipos.

**Rationale**:

- Não duplica a infraestrutura que acabou de ser construída (triggers,
  RLS, UI do dropdown, hook `usePendingTasks`).
- Mantém coerência entre as cadeias 1:1 → PDI (constitution V) e
  hiring — o colaborador/gestor vê uma única lista "do que precisa
  fazer agora" no bell.
- 24h-ahead interview reminder é um job pg_cron que faz `INSERT INTO
  pending_tasks (…) VALUES (…)` para cada entrevista cuja
  `scheduled_at` cai dentro de 24h e ainda não tem reminder aberto —
  `related_id = interviews.id`, dedupe via `ON CONFLICT DO NOTHING`
  em um índice único `(related_id, task_type, status)` adequado.
- `PendingTasksDropdown` já ordena por `due_date` + `priority`; hiring
  tasks só precisam preencher esses campos.

**Alternatives considered**:

- *Tabela `notifications` nova separada*: foi a proposta original
  desta pesquisa (removida). Dobraria infra, quebraria o
  princípio de reaproveitamento e deixaria o header com dois sinos
  paralelos — péssima UX.
- *Supabase Realtime channel*: nice to have; deferido — freshness
  ≤ 60s via `staleTime: 60s` do React Query é suficiente (SC-007).
- *Push third-party (OneSignal)*: crescimento de dependência sem
  pedido do usuário.

**Consequences**:

- Migration `20260416193050_extend_pending_tasks_hiring_kinds.sql`
  estende o CHECK com `ALTER TABLE … DROP CONSTRAINT … ADD CONSTRAINT …`
  + atualiza `PendingTasksDropdown.tsx` (maps de ícones e rotas).
- Nenhuma tabela `notifications` nova é criada — remove-se o item #18
  do `data-model.md`.
- Triggers nas tabelas de hiring passam a ser responsáveis por
  inserir/fechar tasks, espelhando o padrão de
  `create_pending_tasks_for_one_on_one` /
  `close_pending_tasks_for_one_on_one`.

---

## R8. Candidate uniqueness rule for foreigners (Edge case)

**Decision**: `candidates` has `email CITEXT UNIQUE NOT NULL` and an
optional `cpf TEXT`, `document_type TEXT CHECK (document_type IN
('cpf','passport','rne','other'))`, `document_number TEXT`. Unique
constraint on `(document_type, document_number)` WHERE `document_number
IS NOT NULL`. Duplicate detection is email-first with a secondary check
on `(document_type, document_number)`.

**Rationale**:

- Email covers the universal case (spec duplicate rule FR-009 names
  e-mail as primary).
- `document_type` makes foreigners, PJ-only freelancers, and CPF-less
  cases representable without a free-text kludge.

**Alternatives considered**:

- *CPF-only*: fails on estrangeiros (edge case explicit in spec).
- *Single `national_id` free text*: impossible to index meaningfully;
  dupe detection becomes fuzzy.

**Consequences**:

- Data model documents this shape.
- Candidate form UI picks `document_type` with CPF as default.

---

## R9. pg_cron vs Edge Function Scheduled Triggers

**Decision**: Use Supabase's **pg_cron** extension directly from a
migration for both scheduled jobs (R3 nightly anonymization; R2 hourly
Fit Cultural expiry). Each cron entry invokes its Edge Function via
`net.http_post` with a shared secret in the request header, which the
Edge Function validates before acting (constitution IV).

**Rationale**:

- pg_cron is already available on Supabase; no extra scheduler needed.
- Migrating the cron definition keeps it in `supabase/migrations/` so
  it's reviewable and reproducible across environments.
- The shared-secret header is stored in Supabase Vault + injected via
  `supabase secrets set`; never committed.

**Alternatives considered**:

- *GitHub Actions scheduled workflows*: puts infra out of the repo's
  migration story; less discoverable; requires separate secret
  management.
- *Deno Deploy cron*: ties us to Deno Deploy infra that isn't otherwise
  used.

**Consequences**:

- Migration `20260416193500_hiring_cron_jobs.sql` defines the two cron
  schedules.
- The shared secret constant lives only in the function config, never
  in the migration body (the migration reads it via
  `current_setting('app.cron_secret', true)`).

---

## R10. PDF generation for job descriptions (FR-004)

**Decision**: Use the browser's print-to-PDF path via a dedicated
"Descritivo aprovado" route styled with `@media print` CSS; RH clicks
"Baixar PDF" which opens the print dialog with landscape=off,
margins=narrow, and a "save as PDF" default. The rendered PDF is then
uploaded back to the `hiring` bucket via a small helper that reads the
File from the user's download step.

**Rationale**:

- Zero new dependency. shadcn/ui + Tailwind already gives us consistent
  print styling.
- The alternative requires bringing in a PDF library (`pdfmake`,
  `react-pdf`, `puppeteer`) — constitution says "adding a new top-level
  dependency MUST be justified", and for v1 this simpler path works.

**Alternatives considered**:

- *Server-side headless Chrome in Edge Function*: significant ops
  burden; Deno doesn't ship Chromium.
- *`@react-pdf/renderer`*: would give us pixel-consistent PDFs at the
  cost of a sizeable dependency. Worth revisiting in a later iteration
  if the browser-print path doesn't satisfy users.

**Consequences**:

- `JobDescriptionEditor.tsx` and a companion `JobDescriptionPrintView.tsx`
  are added; the latter carries all the print-only styling.
- The uploaded PDF is stored under
  `companies/<company_id>/jobs/<job_id>/descricao/v<version>.pdf` with the
  version number = `job_descriptions.version`.

---

---

## R11. UI/design-system reuse (post-refactor 2026-04-16)

**Decision**: Todo o frontend do hiring reusa o design system recém-
construído em `src/components/primitives/` + o shell de layout + o map
de rotas. Não é permitido recriar primitives equivalentes dentro de
`src/components/hiring/`.

Contratos de integração:

1. **Layout shell**:
   - Rotas autenticadas declaradas **dentro** de `<Route element={
     isAuthenticated ? <Layout /> : <Navigate to="/auth" /> }>` em
     `src/App.tsx`.
   - A única rota fora do Layout é `/hiring/fit/:token`
     (formulário público da Fit Cultural). Declarada antes do
     catch-all, **não** envolvida por `ProtectedRoute`.

2. **Rotas + breadcrumbs** (`src/lib/routes.ts`):
   - Adicionar em `LABELS`: `"/hiring/jobs"`, `"/hiring/candidates"`,
     `"/hiring/dashboard"`, `"/hiring/fit-templates"`.
   - Adicionar branches em `getPageTitle()` e `getBreadcrumbs()` para
     rotas dinâmicas: `/hiring/jobs/:id` →
     `[{label:"Vagas", to:"/hiring/jobs"}, {label:"Detalhe da vaga"}]`;
     `/hiring/jobs/:id/candidates` →
     `[{label:"Vagas", to:"/hiring/jobs"}, {label:"…", to:"/hiring/jobs/ID"},
     {label:"Candidatos"}]`; `/hiring/candidates/:id` →
     `[{label:"Candidatos", to:"/hiring/candidates"}, {label:"Perfil"}]`.

3. **Sidebar**: estender `useSidebarGroups()` com um novo bloco
   `"Recrutamento"` renderizado quando `canManage`:

   ```ts
   if (canManage) {
     groups.push({
       label: "Recrutamento",
       items: [
         { to: "/hiring/jobs", icon: Briefcase, label: "Vagas" },
         { to: "/hiring/candidates", icon: UserSearch, label: "Candidatos" },
         { to: "/hiring/dashboard", icon: LineChart, label: "Dashboard de Hiring" },
         { to: "/hiring/fit-templates", icon: Sparkles, label: "Fit Cultural" },
       ],
     });
   }
   ```

   Ícones tiramos do `lucide-react` (já está no bundle).

4. **Primitives — contratos por página**:

   | Primitive          | Uso em hiring                                                                       |
   |--------------------|-------------------------------------------------------------------------------------|
   | `PageHeader`       | topo de todas as páginas (`title`, `description`, `action` = botão "Nova vaga", etc.)|
   | `SectionCard`      | blocos (descritivo, timeline, respostas do fit, etc.); variant `hero` em abertura    |
   | `StatCard`         | KPIs do `HiringDashboard` (vagas ativas, média de dias por vaga, conversão etc.)     |
   | `StatusBadge`      | estados de vaga e de application (ver 5 abaixo)                                     |
   | `LoadingState`     | skeletons de Kanban e listas (`layout="cards"`, `layout="list"`)                    |
   | `EmptyState`       | estado vazio de Kanban, de dashboard sem dados, de lista de candidatos              |
   | `ScoreDisplay`     | exibir pontuação consolidada do Fit Cultural (quando fit = scala 1-5)               |
   | `PageTransition`   | herdado automaticamente do `<Layout />` — não precisa envolver nada manualmente     |

5. **StatusBadge — extensão**: o componente hoje aceita `kind ∈
   {evaluation, one-on-one, pdi, survey, task, role}`. Vamos adicionar
   `"job"` e `"application"` mapeando os enums de
   `job_status_enum` e `application_stage_enum` para o mesmo
   vocabulário de tones (`success | warning | danger | info | neutral
   | pending`). A edição mora em `src/components/primitives/StatusBadge.tsx`
   e as novas constantes `JOB_MAP` e `APPLICATION_MAP` ficam juntas das
   existentes. Essa é a única mudança tocando em código fora de
   `hiring/`.

6. **Design tokens**: usar as variáveis CSS existentes
   (`--navy`, `--turquoise`, `--turquoise-soft`, `--status-green`,
   `--status-yellow`, `--status-red`) + utility classes
   (`card-elevated`, `hero-surface`, `kpi-value`, `kpi-label`,
   `section-title`, `page-title`, `caption-label`, `animate-fade-in`,
   `animate-slide-up`). Não introduzir cores ou tamanhos novos.

7. **Hooks**: padrão das `useOrgIndicators`/`useTeamIndicators` —
   React Query com `staleTime: 60 * 1000` (freshness SC-007 já é 1 min)
   ou `5 * 60 * 1000` para dados frios. `useHiringMetrics(filters)`
   segue essa forma.

**Rationale**:

- Evita regressão visual ao resto do app.
- Reduz drasticamente o trabalho de `tasks.md` — em vez de "criar
  card-de-vaga" é "compor `SectionCard` com slots". A superfície nova
  vira majoritariamente páginas/hooks/migrations, quase nenhum
  componente visual novo de propósito geral.
- Alinhado com a constitution (sem mocks, sem duplicação desnecessária,
  shadcn/ui como primary UI toolkit).

**Alternatives considered**:

- *Criar pasta `src/components/hiring/primitives/`*: rejeitado — fere
  o princípio de UI consistency; dividiria o design-system em dois.
- *Envolver hiring num Layout próprio*: rejeitado — quebraria a
  navegação global (sidebar some, breadcrumbs somem).

**Consequences**:

- `StatusBadge.tsx` ganha dois novos `kind`s (`job`, `application`).
- `routes.ts`, `Sidebar.tsx` (`useSidebarGroups`) e
  `PendingTasksDropdown.tsx` (maps de ícones/rotas) ganham entradas
  de hiring.
- `src/components/hiring/` contém SOMENTE composições de negócio
  (ex.: `JobOpeningForm.tsx`, `CandidatesKanban.tsx`, `InterviewScheduler.tsx`)
  — nenhum `Card`/`Header`/`EmptyState` local.

---

## Summary of "ready for Phase 1" state

- All items in the spec's Clarifications section are converted into
  concrete design decisions (R1–R11).
- No remaining `NEEDS CLARIFICATION` markers.
- No new top-level `package.json` dependencies.
- No new Supabase role vocabulary.
- No new buckets beyond the single `hiring` bucket.
- No new top-level components outside `src/components/primitives/` —
  hiring reaproveita o design-system recém-criado (R11).
- No new `notifications` table — o hiring publica em `pending_tasks`
  via triggers, igual às cadeias existentes (R7 revisado).
- Each Edge Function proposed has a role-gating plan in line with
  constitution IV.
