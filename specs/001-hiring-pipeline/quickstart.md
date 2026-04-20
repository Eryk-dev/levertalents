# Quickstart: Hiring Pipeline — Manual Acceptance Validation

This quickstart is the definitive end-to-end happy-path walkthrough that
a reviewer runs against a local dev server (`npm run dev` + local
Supabase stack) before approving a PR that ships any part of this
feature. It maps 1:1 to the spec's Acceptance Scenarios so reviewers
can tick each one off.

## 0. Setup (once)

1. `npm install`
2. `cp .env.example .env` and fill the Supabase local keys.
3. `supabase start` (boots Postgres + Storage + Edge Functions).
4. `supabase db reset` — applies every migration including the new
   hiring ones.
5. `supabase functions serve` in a second terminal.
6. `npm run dev` in a third terminal.
7. Seed data (via SQL editor or a tiny seed script under
   `supabase/seed/hiring.sql`):
   - 2 empresas-cliente
   - 1 RH, 1 Sócio, 2 Gestores (1 per empresa), 1 Admin
   - 1 Fit Cultural survey template with 5 questions
   - 2 `standard_messages` (recusa, oferta)

## 1. Abrir vaga (User Story 1, P1)

- [ ] Login as Gestor da empresa A.
- [ ] Navigate to `/hiring/jobs` (pt-BR label: "Vagas").
- [ ] Click "Nova vaga"; fill all required fields (empresa, setor,
      cargo, modalidade, contratação, carga horária, competências,
      faixa salarial, benefícios).
- [ ] Submit. Vaga aparece com status "Aguardando descritivo".
- [ ] Abrir uma segunda janela logado como RH: o
      `PendingTasksDropdown` (ícone de sino no header) mostra badge e
      uma task "Nova vaga aguardando descritivo" linkando
      `/hiring/jobs`. Confirma que a task saiu de `pending_tasks` com
      `task_type='hiring_job_review'` (SQL editor).

## 2. Escrever e submeter descritivo (User Story 1 cont.)

- [ ] As RH, click the task in the bell dropdown — it navigates to
      `/hiring/jobs`. The page uses the shared `<Layout>` (sidebar +
      header + breadcrumb "Recrutamento › Vagas"), with
      `PageHeader`, `SectionCard`, `StatusBadge` primitives composing
      the UI (no custom cards).
- [ ] As RH, open the vaga. Status is "Aguardando descritivo".
- [ ] Fill the descritivo (rich text / markdown). Save as rascunho,
      then click "Enviar para aprovação do gestor".
- [ ] Status flips to "Aguardando aprovação do gestor". Gestor receives
      notification.
- [ ] As Gestor, click "Solicitar ajustes" and leave a comment. Status
      returns to "Em ajuste pelo RH". Version history shows v1.
- [ ] As RH, edit the descritivo and resend. Gestor receives new
      notification.
- [ ] As Gestor, click "Aprovar". Status flips to "Pronta para publicar".
- [ ] RH clicks "Baixar PDF do descritivo" — browser print dialog
      opens; save as PDF and upload it back via "Anexar PDF assinado"
      (v1 path described in research R10). `job_descriptions.pdf_path`
      is populated.

## 3. Publicar (User Story 1 cont.)

- [ ] As RH, add 3 external publication links (LinkedIn, Indeed,
      Instagram) with published dates. Vaga status flips to
      "Publicada". Links visible to Gestor.

## 4. Receber candidatos (User Story 2, P2)

- [ ] As RH, open the Kanban of the vaga (`/hiring/jobs/<id>/candidates`).
- [ ] Click "Novo candidato"; fill name, email, telefone, origem; upload
      CV PDF. Candidate appears in column "Recebido" with CV link.
- [ ] Add 4 more candidatos in different columns (drag or via action
      menu).
- [ ] Create one candidato using the SAME email as another; system warns
      "Candidato já existe" and offers to reuse. Choose reuse — a second
      `applications` row is created pointing to the existing candidate.

## 5. Fit Cultural público (User Story 2 cont., FR-015)

- [ ] Move candidato from "Em interesse" to trigger action "Enviar Fit
      Cultural".
- [ ] Copy the generated public URL (`/hiring/fit/<token>`).
- [ ] Open the URL in an incognito window (no auth). Form loads with
      the 5 questions from the survey template. The honeypot field
      (`website`) is hidden.
- [ ] Submit the form. Response page says "Respostas registradas,
      obrigado".
- [ ] Return to the RH window. Candidato status is "Fit recebido".
      Responses visible on the candidate profile.
- [ ] (Negative) Click the link again in another incognito window —
      error page says "Este link já foi utilizado".
- [ ] (Negative) Take a fresh token and wait (or bump clock via SQL
      `UPDATE cultural_fit_tokens SET expires_at = now() - interval '1
      minute' WHERE id = ...`). Trigger the cron
      (`supabase functions invoke hiring-cron-expire-fit-links
      --secret $CRON_SECRET`). Candidato status flips to "Sem retorno".

## 6. Antecedentes (FR-017/018)

- [ ] As RH, on the candidate profile, upload a PDF and set flag
      "Pendência leve" with a note.
- [ ] Kanban card now shows a red dot icon; dashboard widget "Candidatos
      com pendência" increments.

## 7. Entrevista RH (User Story 3, P3)

- [ ] Move candidato to "Apto para entrevista RH".
- [ ] Click "Agendar entrevista RH"; pick a date/time + modo remoto +
      link. Candidato moves to "Entrevista RH agendada".
- [ ] Manually trigger the reminder cron
      (`supabase functions invoke hiring-interview-reminder
      --secret $CRON_SECRET`, or wait for the scheduled run). Check
      `SELECT * FROM pending_tasks WHERE task_type =
      'hiring_interview_reminder' AND user_id = <RH>` — there is a
      row; bell in the header shows badge + task linking to
      `/hiring/candidates`.
- [ ] Mark entrevista como "Realizada"; paste transcrição e resumo.

## 8. Entrevista final com múltiplos gestores (User Story 3, FR-023, Q1)

- [ ] Agendar entrevista final marcando dois gestores (Gestor A e
      Gestor B).
- [ ] Status: "Aguardando decisão dos gestores".
- [ ] As Gestor A, open the candidato, review prontuário (CV, fit,
      antecedentes, transcrição RH) — timer from clicking notification
      to prontuário open should be < 30 s (SC-006).
- [ ] As Gestor A, click "Aprovar" + comentário.
- [ ] Candidato status remains "Aguardando decisão dos gestores".
- [ ] As Gestor B, click "Reprovar" + comentário obrigatório.
- [ ] Candidato status flips to "Reprovado pelo gestor" (unanimidade —
      Clarifications Q1). Gestor A is notified that the process
      closed.

### Parallel run: unanimidade aprovação

- [ ] Repeat with a fresh candidato. Both gestores clicam "Aprovar" —
      status flips to "Aprovado". `hiring_decisions` row created.

## 9. Admissão (User Story 5, FR-025/026)

- [ ] As RH, click "Iniciar admissão" on the approved candidato.
- [ ] Fill team, leader, cargo final, data de início, contrato, custo.
      Click "Confirmar".
- [ ] Application stage = "Em admissão"; a new `profiles` row exists
      (verify: `SELECT * FROM profiles WHERE email = <candidate_email>`).
      `team_members` row points to `leader_id`.
- [ ] Click "Concluir admissão" — stage = "Admitido"; the new colaborador
      is visible in `/meu-time` for the líder.

## 10. Dashboard (User Story 4, FR-030)

- [ ] Open `/hiring/dashboard` as RH. Verify:
  - Total de vagas por status.
  - Candidatos por etapa.
  - Gargalos (vaga parada > 3 dias).
  - Tempo médio por vaga.
  - Taxa de conversão por etapa.
- [ ] As Gestor, open `/hiring/dashboard` — only vagas da empresa do
      Gestor aparecem (FR-027).
- [ ] Click "Exportar CSV" — file downloads; open in Excel and verify
      column set matches the contract in
      `contracts/hiring-export-pipeline-csv.md`.

## 11. Edge cases — smoke

- [ ] Vaga confidencial: only the Gestor explicitly added to
      `confidential_participant_ids` sees it.
- [ ] Two RH users move the same candidato concurrently: the second
      drag-and-drop gets an "este registro mudou, recarregue" toast
      (Q4 / FR-032). Refresh and retry works.
- [ ] Candidato sem CPF: Cadastrar com `document_type = 'passport'`;
      o cadastro funciona, duplicate detection trata passport+number
      juntos.
- [ ] Candidato pede remoção: RH clica "Anonimizar candidato" no
      perfil; campos PII viram `[anonymized]`, `anon-<uuid>@anon.invalid`,
      CV removido do bucket, métricas agregadas preservadas.

## 12. Type-check + lint (constitution gate)

- [ ] `npx tsc --noEmit` — clean.
- [ ] `npm run lint` — clean.
- [ ] `src/integrations/supabase/types.ts` regenerated and committed
      alongside migrations (constitution I).

## 13. Reporter's checklist to reviewer

- [ ] I exercised the golden path end-to-end on a running dev server.
- [ ] I validated at least one negative path per Edge Function
      (conflict, expired token, wrong role).
- [ ] I confirmed no mock data leaks into the dashboard (constitution
      III) — every widget fetches from React Query.
- [ ] I confirmed no browser code calls `auth.admin.*` (constitution
      IV) — every service-role action is a function invocation.
- [ ] I confirmed the 1:1 → PDI backbone still works: open an existing
      colaborador, schedule a 1:1, attach a PDI, record progress —
      nothing regressed (constitution V).
- [ ] Every hiring screen uses `<PageHeader>`, `<SectionCard>`,
      `<StatCard>`, `<StatusBadge>`, `<LoadingState>`, `<EmptyState>`
      from `src/components/primitives/` — no custom
      card/page-header/empty-state in `src/components/hiring/` (verify
      by `grep -r 'className="card-' src/components/hiring/` returns
      zero, i.e., everything delegates to primitives).
- [ ] New hiring routes are all declared inside the authenticated
      `<Layout />` block in `src/App.tsx` — except `/hiring/fit/:token`
      which is outside and renders its own minimal chrome.
- [ ] Breadcrumbs in the Header are correct on every hiring route
      (entries in `src/lib/routes.ts`).
- [ ] Sidebar shows a new "Recrutamento" group for
      `rh`/`socio`/`admin` users; hidden for `colaborador` and `lider`
      (líderes access vagas via deep-link / dashboard tile, not
      sidebar).
