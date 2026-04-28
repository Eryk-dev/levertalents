---
phase: 3
slug: performance-refactor
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-28
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Source: 03-RESEARCH.md `## Validation Architecture` (line 1126).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.2 + RTL 16 + MSW 2.10 (frontend) · pgTAP + supabase-test-helpers (DB) |
| **Config file** | `vitest.config.ts` (Phase 1 Wave 0) · `supabase/tests/*.sql` (Phase 1) |
| **Quick run command** | `npm test -- --run --reporter=basic` |
| **Full suite command** | `npm test && supabase test db` |
| **Estimated runtime** | ~45s frontend · ~30s pgTAP |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- --run --reporter=basic` (subset matching changed files)
- **After every plan wave:** Run `npm test && supabase test db` (full suite)
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds (frontend), 90 seconds (full)

---

## Per-Task Verification Map

> Filled by gsd-planner during plan generation. Each plan task with `<automated>` block contributes a row here.
> Below is the **Nyquist invariant inventory** the planner must turn into tasks.

### Invariants the planner must cover

| Invariant ID | Decision Ref | Layer | Type | Description |
|--------------|--------------|-------|------|-------------|
| INV-3-01 | D-01, D-04 | DB+UI | pgTAP+RTL | Trocar empresa no header refiltra `evaluation_cycles` para a empresa atual; nenhuma linha de outra empresa aparece |
| INV-3-02 | D-02 | DB | pgTAP | `evaluations.direction` aceita só `'leader_to_member'` ou `'member_to_leader'`; CHECK constraint rejeita outros |
| INV-3-03 | D-03 | DB (RLS) | pgTAP | Liderado SELECT em `evaluations` retorna SOMENTE rows onde `evaluated_user_id = auth.uid()` ou `evaluator_user_id = auth.uid()` |
| INV-3-04 | D-03 | DB (RLS) | pgTAP | Líder SELECT retorna rows dos liderados em `org_unit_descendants` da unit que ele lidera |
| INV-3-05 | D-06 | DB | pgTAP | UPDATE em `evaluation_templates.schema_json` NÃO altera `evaluation_cycles.template_snapshot` de ciclos já criados |
| INV-3-06 | D-07 | Frontend | Vitest | `buildZodFromTemplate(snapshot)` produz schema válido para todos os tipos (`scale_1_5`, `text`, `choice`); falha sem `as any` cast |
| INV-3-07 | D-08 | DB | pgTAP | Pós-migration `perf2`, `evaluations` tem 0 rows; colunas legadas (`overall_score`, `period`, etc.) não existem mais |
| INV-3-08 | D-09 | DB | pgTAP | Pós-migration `clim1`, `climate_responses` NÃO tem coluna `user_id`; `idx_climate_responses_user_id` não existe |
| INV-3-09 | D-10 | DB | pgTAP | RPC `get_climate_aggregate(survey_id, org_unit_id)` retorna `{insufficient_data: true}` quando count < 3; retorna `{count, avg, distribution}` quando count >= 3 |
| INV-3-10 | D-11 | Frontend | RTL | UI de questionário de clima exibe label "100% anônima"; payload de submit NÃO contém `user_id`/`actor_id` |
| INV-3-11 | D-14 | Frontend | RTL | Form de 1:1 paste de texto longo (10k+ chars) em "Transcrição (Plaud)" persiste em `meeting_structure.transcricao_plaud` sem lag perceptível |
| INV-3-12 | D-15 | Frontend | RTL | Badge "RH visível" presente no header do form de 1:1 sempre (independe de role do usuário) |
| INV-3-13 | D-16 | Frontend | RTL | Toggle "Lista geral / Por par" em /1-on-1s persiste preferência em localStorage; refresh mantém escolha |
| INV-3-14 | D-17 | DB (RLS) | pgTAP | Liderado SELECT em `one_on_one_rh_notes` retorna 0 rows; admin/RH retornam linha; UPDATE só admin/RH |
| INV-3-15 | D-18 | Frontend | Vitest | `OneOnOneMeetingForm.tsx` < 300 linhas; `OneOnOneAgenda`, `OneOnOneNotes`, `OneOnOneActionItems`, `OneOnOnePDIPanel` existem como arquivos separados |
| INV-3-16 | D-20, D-21 | Frontend+Edge | RTL+integration | Pós-cadastro de pessoa, modal mostra mensagem com link + login + senha; senha tem 8 chars do alfabeto restrito (sem 0/O/o/1/l/I) |
| INV-3-17 | D-22, D-23 | Frontend | RTL | User com `must_change_password=true` tentando navegar pra `/jobs` é redirecionado pra `/first-login-change-password`; sem loop infinito |
| INV-3-18 | D-24 | Frontend | RTL | Login com senha temp expirada (>24h) NÃO bloqueia entrada — força troca; após troca, `must_change_password=false` e `temp_password_expires_at=NULL` |
| INV-3-19 | D-25 | Frontend | Vitest | Hooks de Performance — toda queryKey contém `scope.id`; ESLint custom rule de Phase 1 não dispara em nenhum hook após migração |
| INV-3-20 | D-25 | Frontend | RTL | Trocar empresa no scope selector invalida queries de Performance; nova fetch vê dados da empresa nova |
| INV-3-21 | D-27, D-28 | DB | pgTAP | Pós-Backfill E, existem 7 empresas + 1 grupo "Lever"; cada `team` legado tem 1 row em `org_units` + leader em `unit_leaders` + members em `org_unit_members` |
| INV-3-22 | D-29 | DB | pgTAP | Cada user com `user_roles.role='socio'` tem 1+ rows em `socio_company_memberships` |
| INV-3-23 | D-01 | DB | pgTAP | pg_cron job fecha `evaluation_cycles` onde `ends_at <= now() AND status='active'`; rodada manual flippa status para `closed` |
| INV-3-24 | D-19 | Frontend | Vitest | `useMeetingTimer`, `useAgendaState`, `useActionItemsState`, `usePlaudInput` existem como hooks isolados; cada um < 100 linhas |

*Total: 24 invariants. Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Wave 0 reusa infra de Phase 1 (Vitest + RTL + MSW + pgTAP já configurados). Tarefas Wave 0 nesta fase:

- [ ] `src/test/perf-mocks/` — MSW handlers para Edge Function `create-user-with-temp-password` + RPC `get_climate_aggregate`
- [ ] `src/test/perf-fixtures/` — fixtures de `evaluation_cycle` + `template_snapshot` + `one_on_one` com Plaud fields + `climate_response` (sem user_id)
- [ ] `supabase/tests/03_*.sql` — pgTAP stubs para INV-3-01 até INV-3-23 (DB invariants)
- [ ] `src/lib/__tests__/` — stubs Vitest para `buildZodFromTemplate`, `passwordGenerator`, `useScopedQuery` migration smoke tests
- [ ] Regenerar `src/integrations/supabase/types.ts` é gate Wave 1 (post Backfill E + post schema novo) — NÃO Wave 0

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| RH cola mensagem WhatsApp em conversa real | AUTH-01, AUTH-02, AUTH-03 | Não dá pra automatizar copy → WhatsApp externo | RH cria pessoa fake → clica "Copiar mensagem" → cola no WhatsApp pessoal → confirma formato |
| Pessoa recebe link, abre, troca senha pelo celular | AUTH-02 | Fluxo cross-device (WhatsApp → browser mobile) | Pessoa abre link em iPhone Safari + Android Chrome → confirma `/first-login-change-password` carrega → troca senha → entra no app |
| Plaud paste em mobile (iOS/Android) preserva formatting | ONE-04 | Paste behavior varia por OS | Em iPhone + Android, copiar transcrição do app Plaud → colar em "Transcrição" textarea → confirmar texto longo persiste sem truncar |
| Snapshot imutável visual: muda template, abre ciclo antigo | PERF-02 | Confirmar UX da feature | RH cria template T1 → cria ciclo C1 com T1 → edita T1 (adiciona pergunta) → abre C1 → confirma C1 mostra schema antigo, não T1 atualizado |
| Clima feedback de "dados insuficientes" é claro | PERF-05 | UX de bordas exige validação humana | Survey com 2 respostas → RH abre relatório → mensagem "Dados insuficientes para garantir anonimato (mínimo 3 respostas)" presente e compreensível |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (Edge Function MSW + RPC MSW + pgTAP stubs)
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s frontend / 90s full
- [ ] `nyquist_compliant: true` set in frontmatter (after planner maps each task)

**Approval:** pending — gsd-planner fills `Per-Task Verification Map` linking each task to one invariant
