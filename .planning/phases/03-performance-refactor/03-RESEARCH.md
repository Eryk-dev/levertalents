# Phase 3: Performance Refactor — Research

**Researched:** 2026-04-28
**Domain:** Postgres schema design (cycles + templates + JSONB snapshots), RLS column-level visibility, k-anonymity aggregates, dynamic Zod resolvers, Edge Functions com auth.admin, React Router gates, migration sequencing (Backfill E + 9 sub-migrations).
**Confidence:** HIGH (campos densos com precedente em Phase 1+2; gaps marcados explicitamente).

---

## Summary

A pesquisa confirma que **os 29 decisões locked do CONTEXT são implementáveis dentro do stack atual sem features novas**, mas surfou **três descobertas críticas** que o planner precisa absorver antes de quebrar a fase em waves:

1. **`evaluations`, `one_on_ones`, e `climate_surveys` HOJE não têm `company_id`** (verificado em `src/integrations/supabase/types.ts` linhas 1253-1318, 1841-1892, 573-616). O legado vincula performance a *usuários* (`evaluator_user_id`, `leader_id`, `created_by`), não a empresas. Isso significa que a migration `perf1` precisa **adicionar `company_id NOT NULL` em 3 tabelas existentes** + backfill via lookup `evaluator → org_unit_members → org_units.company_id` antes de qualquer RLS scoped funcionar. Sem isso, `useScopedQuery` retorna 0 linhas em todo lugar.

2. **A tabela `evaluations` legada tem schema fixo** (`overall_score`, `technical_score`, `behavioral_score`, `leadership_score`, `comments`, `strengths`, `areas_for_improvement`, `period: TEXT`) — **NÃO é JSONB**. Migrar pra schema dinâmico (D-07) implica DROP das 7 colunas + ADD `cycle_id UUID` + `direction TEXT` + `responses JSONB`. Owner já decidiu TRUNCATE (D-08), então o destruir+recriar é mais limpo que ALTER incremental.

3. **`teams` LEGACY tem `leader_id` (single)** (verificado em `types.ts` linha 5400+ — `teams.leader_id text NULL`). O conceito Phase 1 tem `unit_leaders` table (1+ líderes por unit). Conversão `teams → org_units` requer dois passos: 1 row em `org_units` + 1+ rows em `unit_leaders` (do `teams.leader_id`) + N rows em `org_unit_members` (de `team_members.user_id`). Já existe precedente parcial em Migration C linhas 200-230 (mirror teams.id → org_unit.id). Phase 3 precisa **completar o backfill** que Phase 1 deixou idempotente mas vazio.

A fase fica organizada como **5 waves**: Wave 0 (test scaffolding pgTAP+RTL+Vitest), Wave 1 (3 migrations Backfill E — sequencial bloqueante), Wave 2 (4 migrations schema novo Performance — pode parcialmente paralelizar), Wave 3 (Edge Function + hooks scoped — paralelo com Wave 2 atrás de schema push), Wave 4 (UI: forms quebrados + onboarding + first-login + telas refeitas).

**Primary recommendation:** Tratar Backfill E e adição de `company_id` às 3 tabelas legacy como **wave bloqueante separada** (Wave 1). Sem ela, todas as 15 hooks que Phase 3 vai migrar pra `useScopedQuery` retornariam vazio. A wave de schema novo (cycles + templates + rh_notes + k-anon RPC) só roda DEPOIS que `evaluations.company_id`, `one_on_ones.company_id`, e `climate_surveys.company_id` já existirem populados.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Avaliações: ciclos por empresa (PERF-01, PERF-03, PERF-04)**
- **D-01:** Ciclo por empresa, com janela fixa start/end. Tabela `evaluation_cycles(id, company_id, name, template_snapshot JSONB, starts_at, ends_at, status)`. Status `active` ↔ `closed` automaticamente em `ends_at`.
- **D-02:** Avaliações líder→liderado e liderado→líder são entidades separadas referenciando o mesmo `cycle_id`. Schema: `evaluations(id, cycle_id, evaluator_user_id, evaluated_user_id, direction, ...)` onde `direction ∈ ('leader_to_member', 'member_to_leader')`.
- **D-03:** Visibilidade — RH vê todas; líder vê via `org_unit_descendants`; liderado vê só próprias.
- **D-04:** Trocar empresa no header refiltra ciclos (sem lista cross-empresa no v1).

**Templates por empresa (PERF-02, antecipa V2-05)**
- **D-05:** `evaluation_templates(id, company_id, name, schema_json, is_default, created_at)`.
- **D-06:** Snapshot imutável em `evaluation_cycles.template_snapshot` JSONB freezed na criação.
- **D-07:** Schema do template: `{ version: 1, sections: [{ id, title, weight, questions: [{ id, label, type: 'scale_1_5'|'text'|'choice', required, options? }] }] }`.

**Migração legada**
- **D-08:** Drop histórico — `TRUNCATE evaluations`; sem backfill de `period: string`. Sem CSV export.

**Clima anônimo (PERF-05/06)**
- **D-09:** Drop coluna `climate_responses.user_id` + `DROP INDEX idx_climate_responses_user_id`.
- **D-10:** K-anonymity ≥3. RPC `get_climate_aggregate(survey_id, org_unit_id)`. Se count<3, retorna `{insufficient_data: true}`.
- **D-11:** UI label "100% anônima" + form sem campo de identificação. Submit RPC `submit_climate_response` recebe só `(survey_id, question_id, score, comment_optional)`.

**1:1 com Plaud (ONE-04)**
- **D-12:** Duas textareas: "Transcrição (Plaud)" + "Resumo (Plaud)" — paste manual.
- **D-13:** `useAudioTranscription` permanece (legacy).
- **D-14:** Persistência em `one_on_ones.meeting_structure` JSONB (sem coluna nova).

**1:1 RH visível (ONE-02/03)**
- **D-15:** Badge "RH visível" persistente.
- **D-16:** Toggle "Lista geral / Por par" (RH/Admin), preferência localStorage.
- **D-17:** Coluna nova `one_on_ones.rh_notes` TEXT NULL. RLS: SELECT/UPDATE só `admin`+`rh`. Sem trilha de export.

**Quebra de monolito (D-18, D-19)**
- 4 sub-componentes + orchestrator + 4 custom hooks.

**Onboarding WhatsApp (AUTH-01/02/03)**
- **D-20:** Modal pós-cadastro com mensagem pronta + botão "Copiar" (sem campo telefone).
- **D-21:** Senha = 8 chars `[a-z A-Z 2-9]` excluindo `0/O/o/1/l/I`.
- **D-22:** Colunas `profiles.must_change_password` BOOLEAN + `profiles.temp_password_expires_at` TIMESTAMPTZ.
- **D-23:** ProtectedRoute redirect FORCE pra `/first-login-change-password`.
- **D-24:** Senha expirada >24h ainda permite login + força troca imediata.

**Hooks → useScopedQuery (D-25, D-26)**
- 15 hooks migram (Migrate `useEvaluations`, `useClimateSurveys`, etc.); 4 NÃO migram (`useUserProfile`, `useAuth`, `useDeleteUser`, `useTeams`).

**Backfill E (D-27, D-28, D-29)**
- Owner provê 7 nomes/UUIDs + lista sócio↔empresa antes do execute.
- `teams → org_units` 1:1 preservando membros + leader.
- `user_roles role='socio' → socio_company_memberships`.

### Claude's Discretion

- Toast positions/durations: top-right, 4s default, 8s erros.
- Loading skeletons (3 linhas placeholder por item real).
- Animações: reusar tokens CSS existentes (sem framer-motion).
- localStorage `leverup:perf:one-on-ones-view`.
- Cron auto-fechar ciclos: `0 3 * * *` BRT.
- Notificação ao liderado quando RH adiciona nota: NÃO existe.
- CSV export pré-drop: NÃO criar.

### Deferred Ideas (OUT OF SCOPE)

- AI generativa para resumo Plaud (resumo já vem do app Plaud).
- Trilha formal LGPD para export de notas RH ao colaborador.
- Backup formal das `evaluations` antes do drop.
- Reativação manual de conta após senha expirada.
- UI completa de gestão de templates por empresa (split possível pra Phase 4).
- Integração com WhatsApp Business API.
- Cmd+K palette (Phase 4).
- Dashboard de sócio (Phase 4).

</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AUTH-01 | RH cria pessoa via formulário; sistema gera senha temporária | Edge Function `create-user-with-temp-password` (seção §4 abaixo); `auth.admin.createUser` precedente em `create-user/index.ts` |
| AUTH-02 | Mensagem WhatsApp pré-formatada, RH copia | UI-SPEC.md §"WhatsApp onboarding message" template locked; `OnboardingMessageBlock` novo componente |
| AUTH-03 | Senha temporária expira 24h; força troca no primeiro login | Colunas `profiles.must_change_password` + `temp_password_expires_at` + ProtectedRoute gate (seção §5) |
| PERF-01 | Ciclos por empresa | Schema `evaluation_cycles` + `cycles.company_id` (seção §1) |
| PERF-02 | Cada ciclo define template | Snapshot pattern (seção §2) |
| PERF-03 | Líder→liderado e liderado→líder separadas no mesmo ciclo | `evaluations.direction` enum |
| PERF-04 | Visibilidade RH/líder/liderado | RLS via `visible_companies` + `org_unit_descendants` |
| PERF-05 | Clima 100% anônima | DROP `user_id` (seção §3 D-09) |
| PERF-06 | RH dispara pesquisa por scope | RPC `submit_climate_response` |
| PERF-07 | RHF + Zod, sem `as any`, otimista com rollback | Dynamic Zod resolver (seção §3) |
| ONE-01 | Par tem feed contínuo de 1:1 | Já existe em `one_on_ones`; refactor preserva |
| ONE-02 | 1:1 privado entre par | RLS atual `auth.uid() = leader_id OR collaborator_id` mantida |
| ONE-03 | RH lê tudo + badge "RH visível" | Estender RLS com `is_people_manager` (já em Phase 1) |
| ONE-04 | Transcrição + resumo Plaud | Estender JSONB `meeting_structure` (sem migration de schema) |
| ONE-05 | Action items checklist | Já existe em `meeting_structure.action_items`; refactor preserva |
| ONE-06 | Histórico navegável + busca | UI scoped lista cronológica + search input (Wave 4) |

</phase_requirements>

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Geração de senha temporária | API/Backend (Edge Function) | — | CSPRNG só confiável server-side; `auth.admin.createUser` requer service role |
| Snapshot imutável de template | Database (trigger) | API (RPC) | Garantia atômica na criação do ciclo; planner pode escolher trigger BEFORE INSERT vs RPC |
| K-anonymity aggregate | Database (RPC SECURITY DEFINER) | — | Filtro precisa rodar ANTES de retornar dados; client-side seria leak |
| Auto-close ciclos expirados | Database (pg_cron) | — | Scheduled job é responsabilidade de infra |
| Validação dinâmica do form de avaliação | Browser/Client | — | Zod resolver gerado em runtime do snapshot |
| Forced password change gate | Browser/Client (ProtectedRoute) | API (RLS via `must_change_password`) | Frontend bloqueia navegação; backend é fronteira de segurança |
| Visibilidade RH/líder/liderado de avaliação | Database (RLS) | Browser (CASL) | RLS é fronteira; CASL esconde botões |
| `rh_notes` column-level isolation | Database (RLS row-filter or column GRANT) | Browser (DOM omission) | Defesa-em-profundidade — RLS impede SELECT, frontend nem renderiza |
| Realtime updates de avaliações pendentes | Browser (Realtime channel) | Database (RLS) | Channel filtered by `company_id`; cliente recebe só o que pode ver |
| Persistência de transcrição Plaud | Browser → API (PATCH JSONB) | Database (no schema change) | JSONB extension; sem migration |

---

## Standard Stack

### Core (já no projeto)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vite | 5.x | Build tool | Locked stack |
| React | 18.x | UI runtime | Locked stack |
| TypeScript | 5.8 (strict) | Type safety | Locked stack |
| Supabase JS | 2.x | DB + Auth + Realtime + Storage | Project `ehbxpbeijofxtsbezwxd` |
| react-hook-form | 7.73 | Form state | Locked + RHF.dev official pattern para forms grandes |
| @hookform/resolvers | 5.2.2 | Zod resolver bridge | Locked — DO NOT upgrade Zod 3→4 (AF-13) |
| zod | 3.25 | Schema validation | Locked — incompat com 4 |
| @tanstack/react-query | 5.x | Cache + mutation | Phase 1 chokepoint `useScopedQuery` |
| @casl/ability | 6.8 | RBAC client-side | Phase 1 lock |
| zustand | 5.0 | Scope persist | Phase 1 lock |
| sonner | (vendored shadcn) | Toast | Phase 2 pattern |

### Supporting (já no projeto)
| Library | Purpose | When to Use |
|---------|---------|-------------|
| pg_cron | Scheduled jobs | Auto-close ciclos (D-01) + reuse retention job de Phase 2 |
| pgTAP | DB tests | Snapshot freeze, k-anonymity, RLS rh_notes |
| Vitest 3.2 + RTL 16 + MSW 2.10 | Unit/integration | Form gen, password gen, hook migration |
| date-fns-tz | TZ Brasília format | Cycle ends_at display, temp password expiry |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| pg_cron auto-close ciclos | Lazy check on read (dynamically derived `status`) | Lazy avoids cron complexity but misses "ciclo encerrado" notification window. **Recomendação: pg_cron** — owner já tem precedente Phase 2 (`data_access_log_retention_cleanup`). |
| Trigger snapshot freeze | Application-side copy in RPC | Trigger é DB-level garantia; RPC depende de chamada correta. **Recomendação: BEFORE INSERT trigger** — defesa-em-profundidade contra bug em RPC. |
| Column-level GRANT para `rh_notes` | Row-level filter (always SELECT, mask in app) | GRANT é mais simples; row-level filter requer view auxiliar. **Recomendação: row-level via separate SELECT policy** — Postgres column-level RLS é menos suportado e quebra com `SELECT *`. |
| K-anonymity em RPC | Client-side filter | RPC é única opção (filtro precisa rodar com privilégios elevados pra ver todos os dados antes de agregar). **Lock: RPC SECURITY DEFINER**. |
| Edge Function CSPRNG (Deno `crypto.getRandomValues`) | UUID-based | UUID tem 128 bits mas alphabet [0-9a-f] só (não atende D-21 alphabet legível). **Lock: `crypto.getRandomValues` + custom alphabet sampler**. |

**Installation (no new packages needed for Phase 3):**

Tudo já está no projeto. Nenhum novo `npm install`. **Verificado em `package.json` via codebase research em Phases 1+2.**

**Version verification (current as of 2026-04-28):**
- `@supabase/supabase-js@2.x` — current API surface confirmed via `auth.admin.createUser` usage in existing `supabase/functions/create-user/index.ts` linha 33.
- `pg_cron` — already enabled in project (Phase 2 retention job ativo).

---

## Architecture Patterns

### System Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                                  BROWSER                                     │
│                                                                              │
│  Login → ProtectedRoute checks profiles.must_change_password ───┐            │
│              │                                                  │            │
│              │ false                                            │ true       │
│              ▼                                                  ▼            │
│         App Routes                                /first-login-change-password│
│              │                                    (LeverArrow + form)        │
│              │                                                  │            │
│              ▼                                                  ▼            │
│      ┌──────────────┐                                  POST trocar senha    │
│      │ ScopeProvider│                                  Flip flag → /        │
│      │ (Phase 1)    │                                                       │
│      └──────────────┘                                                       │
│              │                                                              │
│  ┌───────────┼──────────────┬──────────────┬───────────────┐                │
│  ▼           ▼              ▼              ▼               ▼                │
│ /avaliacoes /clima      /1-on-1s      /cadastrar-     /pessoas etc          │
│  cycles    surveys      meetings       pessoa                               │
│  CycleCard ClimateAggr  OneOnOneForm   CreateUserForm                       │
│            (k-anon)     (split D-18)   + OnboardingMsgBlock                 │
│  │           │              │              │                                │
│  ▼           ▼              ▼              ▼                                │
│ useScopedQuery (Wave 3 — 15 hooks migrados, queryKey = [scope.id, ...])     │
│  │           │              │              │                                │
└──┼───────────┼──────────────┼──────────────┼────────────────────────────────┘
   │           │              │              │
   ▼           ▼              ▼              ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                       SUPABASE (ehbxpbeijofxtsbezwxd)                        │
│                                                                              │
│  Postgres                                                                    │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ evaluation_cycles (NEW)                                                │  │
│  │   ├ template_snapshot JSONB (frozen via BEFORE INSERT trigger D-06)    │  │
│  │   └ company_id → RLS via visible_companies (Phase 1 helper)            │  │
│  ├────────────────────────────────────────────────────────────────────────┤  │
│  │ evaluation_templates (NEW) per company_id                              │  │
│  ├────────────────────────────────────────────────────────────────────────┤  │
│  │ evaluations (REWRITE — drop 7 score cols, add cycle_id+direction+      │  │
│  │              responses JSONB; D-08 TRUNCATE)                           │  │
│  ├────────────────────────────────────────────────────────────────────────┤  │
│  │ climate_surveys + climate_responses (DROP user_id D-09 + add company_id│  │
│  │   on surveys; submit RPC strips actor)                                 │  │
│  │   RPC get_climate_aggregate(survey_id, org_unit_id) → k-anon ≥3        │  │
│  ├────────────────────────────────────────────────────────────────────────┤  │
│  │ one_on_ones (ADD company_id + rh_notes TEXT; meeting_structure JSONB   │  │
│  │              extended with transcricao_plaud + resumo_plaud)           │  │
│  ├────────────────────────────────────────────────────────────────────────┤  │
│  │ profiles (ADD must_change_password + temp_password_expires_at)         │  │
│  ├────────────────────────────────────────────────────────────────────────┤  │
│  │ org_units (Backfill E: teams 1:1)                                      │  │
│  │ socio_company_memberships (Backfill E: user_roles socio → memberships) │  │
│  │ companies + company_groups (Backfill E: Grupo Lever + 7 internas)      │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  pg_cron jobs                                                                │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ data_access_log_retention_cleanup (Phase 2, weekly)                    │  │
│  │ evaluation_cycles_auto_close (NEW, daily 03:00 BRT)                    │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  Edge Functions                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ create-user-with-temp-password (NEW) — supersedes legacy create-user   │  │
│  │   1. Generate 8-char password                                          │  │
│  │   2. auth.admin.createUser({ password, email_confirm:true })           │  │
│  │   3. UPDATE profiles SET must_change_password=true,                    │  │
│  │      temp_password_expires_at=now()+24h                                │  │
│  │   4. Return { userId, tempPassword } to client (RH copies to WhatsApp) │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure

```
src/
├── pages/
│   ├── Evaluations.tsx               # refactor — list cycles
│   ├── Climate.tsx                   # refactor — k-anon aware
│   ├── OneOnOnes.tsx                 # refactor — toggle Lista geral / Por par
│   ├── CreateUser.tsx                # rewrite — WhatsApp onboarding (rename to /cadastrar-pessoa per UI-SPEC)
│   └── FirstLoginChangePassword.tsx  # NEW — bloqueante
├── components/
│   ├── EvaluationForm.tsx            # refactor — orchestrator <300 lines
│   ├── EvaluationFormSection.tsx     # NEW
│   ├── EvaluationFormQuestion.tsx    # NEW (scale_1_5 / text / choice)
│   ├── CycleCard.tsx                 # NEW
│   ├── CreateCycleDialog.tsx         # NEW
│   ├── ClimateAggregateCard.tsx      # NEW (k-anon aware)
│   ├── OneOnOneMeetingForm.tsx       # refactor — orchestrator <300 lines
│   ├── OneOnOneAgenda.tsx            # NEW
│   ├── OneOnOneNotes.tsx             # NEW (Plaud textareas)
│   ├── OneOnOneActionItems.tsx       # NEW
│   ├── OneOnOnePDIPanel.tsx          # NEW (extracted)
│   ├── OneOnOneRHNote.tsx            # NEW (RH-only)
│   ├── OneOnOneRHVisibleBadge.tsx    # NEW
│   ├── OneOnOnesViewToggle.tsx       # NEW (RH toggle)
│   ├── OnboardingMessageBlock.tsx    # NEW
│   └── FirstLoginChangePasswordCard.tsx  # NEW
├── hooks/
│   ├── useEvaluations.ts             # rewrite — useScopedQuery, cycleId param
│   ├── useEvaluationCycles.ts        # NEW
│   ├── useEvaluationTemplates.ts     # NEW
│   ├── useClimateSurveys.ts          # rewrite — drop user_id from submit
│   ├── useClimateAggregate.ts        # NEW (calls k-anon RPC)
│   ├── useClimateOverview.ts         # rewrite scoped
│   ├── useOneOnOnes.ts               # rewrite scoped + filtros
│   ├── useMeetingTimer.ts            # NEW (extract)
│   ├── useAgendaState.ts             # NEW (extract)
│   ├── useActionItemsState.ts        # NEW (extract)
│   ├── usePlaudInput.ts              # NEW (paste validation)
│   ├── useDevelopmentPlans.ts        # rewrite scoped (light)
│   ├── useNineBoxDistribution.ts     # rewrite scoped
│   ├── useCollaboratorEvolution.ts   # rewrite scoped
│   ├── useTeamIndicators.ts          # rewrite scoped
│   ├── useOrgIndicators.ts           # rewrite scoped
│   ├── useLeaderAlerts.ts            # rewrite scoped
│   ├── usePendingTasks.ts            # rewrite scoped
│   ├── useActionItems.ts             # rewrite scoped
│   ├── usePDIIntegrated.ts           # rewrite scoped
│   ├── usePDIUpdates.ts              # rewrite scoped
│   ├── useCostBreakdown.ts           # rewrite scoped
│   ├── useCreateUserWithTempPassword.ts  # NEW (calls Edge Function)
│   └── useChangePassword.ts          # NEW (first-login flow)
├── lib/
│   ├── evaluationTemplate.ts         # NEW — buildZodFromTemplate(snapshot)
│   ├── passwordGenerator.ts          # NEW (server uses Deno crypto; lib for tests too)
│   └── climateAggregation.ts         # NEW — k-anon helper for tests
└── shared/
    └── data/useScopedQuery.ts        # Phase 1 chokepoint (no change)

supabase/
├── migrations/                        # 9 new files (sequence in §6 below)
└── functions/
    └── create-user-with-temp-password/  # NEW Edge Function

supabase/tests/
├── 003_evaluation_cycles_snapshot.sql   # NEW pgTAP
├── 004_climate_kanon.sql                # NEW pgTAP
├── 005_rh_notes_rls.sql                 # NEW pgTAP
└── 006_backfill_e.sql                   # NEW pgTAP
```

### Pattern 1: Snapshot Freeze via BEFORE INSERT Trigger

**What:** Database-level guarantee that `evaluation_cycles.template_snapshot` is set atomically from `evaluation_templates.schema_json` at cycle creation, never updated thereafter.

**When to use:** D-06 lock — owner explicit que mudanças no template NÃO afetam ciclos abertos.

**Example (recommended):**

```sql
-- Source: pattern from Phase 2 Migration F.1 (legacy stage normalization trigger)
CREATE OR REPLACE FUNCTION public.tg_freeze_template_snapshot()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_schema jsonb;
BEGIN
  -- Always re-fetch on INSERT; ignore caller-supplied snapshot to prevent tampering
  IF TG_OP = 'INSERT' THEN
    IF NEW.template_id IS NULL THEN
      RAISE EXCEPTION 'evaluation_cycles.template_id is required';
    END IF;
    SELECT schema_json INTO v_schema
      FROM public.evaluation_templates
     WHERE id = NEW.template_id;
    IF v_schema IS NULL THEN
      RAISE EXCEPTION 'template % not found', NEW.template_id;
    END IF;
    NEW.template_snapshot := v_schema;
    RETURN NEW;
  END IF;

  -- On UPDATE, never allow changing template_snapshot
  IF TG_OP = 'UPDATE' AND NEW.template_snapshot IS DISTINCT FROM OLD.template_snapshot THEN
    RAISE EXCEPTION 'template_snapshot is immutable after cycle creation';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER tg_evaluation_cycles_freeze
  BEFORE INSERT OR UPDATE OF template_snapshot ON public.evaluation_cycles
  FOR EACH ROW EXECUTE FUNCTION public.tg_freeze_template_snapshot();
```

**Why trigger over RPC:** O CONTEXT delega à Claude (Claude's Discretion na sub-decisão). Trigger é defesa-em-profundidade — mesmo se um futuro RPC esquecer de copiar o snapshot, o trigger garante. RPC ainda pode existir como camada conveniente (`create_evaluation_cycle(template_id, name, starts_at, ends_at)`), mas a *garantia* mora no trigger. **[VERIFIED: precedent at `supabase/migrations/20260427120100_b2_org_units_and_helpers.sql:79-98` (`tg_org_units_same_company_as_parent`)].**

### Pattern 2: K-Anonymity Aggregate via SECURITY DEFINER RPC

**What:** RPC que conta respostas, retorna agregado SOMENTE se count ≥ 3, senão `{insufficient_data: true}`.

**When to use:** D-10 lock — único canal de leitura de agregado de clima.

**Example (recommended):**

```sql
-- Returns either {count, avg, distribution} OR {insufficient_data: true}
CREATE OR REPLACE FUNCTION public.get_climate_aggregate(
  p_survey_id uuid,
  p_org_unit_id uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := (SELECT auth.uid());
  v_count int;
  v_avg numeric(4,2);
  v_distribution jsonb;
  v_visible_companies uuid[];
  v_survey_company uuid;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Nao autenticado' USING ERRCODE = '42501';
  END IF;

  -- Re-apply RLS: actor must see this survey's company
  v_visible_companies := public.visible_companies(v_actor);
  SELECT company_id INTO v_survey_company
    FROM public.climate_surveys
   WHERE id = p_survey_id;
  IF NOT (v_survey_company = ANY(v_visible_companies)) THEN
    RAISE EXCEPTION 'Sem permissao' USING ERRCODE = '42501';
  END IF;

  -- Count first; then decide whether to compute aggregate
  SELECT COUNT(*) INTO v_count
    FROM public.climate_responses cr
   WHERE cr.survey_id = p_survey_id
     AND (
       p_org_unit_id IS NULL
       OR cr.org_unit_id = ANY(public.org_unit_descendants(p_org_unit_id))
     );

  IF v_count < 3 THEN
    RETURN jsonb_build_object('insufficient_data', true, 'count', v_count);
  END IF;

  SELECT
    AVG(cr.score)::numeric(4,2),
    jsonb_object_agg(score::text, cnt)
  INTO v_avg, v_distribution
  FROM (
    SELECT score, COUNT(*) AS cnt
      FROM public.climate_responses cr
     WHERE cr.survey_id = p_survey_id
       AND (
         p_org_unit_id IS NULL
         OR cr.org_unit_id = ANY(public.org_unit_descendants(p_org_unit_id))
       )
     GROUP BY score
  ) cr;

  RETURN jsonb_build_object(
    'count', v_count,
    'avg', v_avg,
    'distribution', v_distribution
  );
END $$;

REVOKE ALL ON FUNCTION public.get_climate_aggregate(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_climate_aggregate(uuid, uuid) TO authenticated;
```

**Important schema implication:** `climate_responses` precisa de `org_unit_id` column (NULL se respondente não tiver org_unit primário). O CONTEXT diz "agregação por org_unit" — owner não selecionou esta área, então **decisão Claude:** adicionar `climate_responses.org_unit_id UUID NULL` na migration `clim1` ANTES do drop do `user_id` (precisa ler `user_id → org_unit_members → org_unit_id` para popular). **[ASSUMED]** Owner pode preferir agregar só no nível empresa (sem org_unit) — abrir como Open Question.

**Auto-aggregation to parent (sub-decision Claude's Discretion):** Owner não especificou. **Recomendação default:** **NÃO auto-agrega.** Quando count<3, mostra empty state "Dados insuficientes para garantir anonimato (mínimo 3 respostas)" conforme UI-SPEC.md §"k-anonymity rendering". Auto-agregar pra unit pai pode mascarar surpresas (depto com 1 resposta crítica vira diluído na empresa toda). Owner pode pedir o opposite explicitamente — registrar como Open Question.

**[VERIFIED: PostgreSQL Anonymizer 1.0 confirms k-anonymity is canonical pattern](https://www.postgresql.org/about/news/postgresql-anonymizer-10-privacy-by-design-for-postgres-2452/).** **[CITED: same source].**

### Pattern 3: Dynamic Zod Resolver from JSON Template

**What:** Build Zod schema from `template_snapshot` em runtime; pass to `react-hook-form` via `zodResolver`. Zero `as any` casts.

**When to use:** D-07 lock — schema gerado dinamicamente para cada ciclo.

**Example (recommended):**

```typescript
// src/lib/evaluationTemplate.ts
import { z, type ZodTypeAny } from 'zod';

export type TemplateQuestion =
  | { id: string; label: string; type: 'scale_1_5'; required: boolean }
  | { id: string; label: string; type: 'text'; required: boolean }
  | { id: string; label: string; type: 'choice'; required: boolean; options: string[] };

export type TemplateSection = {
  id: string;
  title: string;
  weight: number;
  questions: TemplateQuestion[];
};

export type TemplateSnapshot = {
  version: 1;
  sections: TemplateSection[];
};

function buildQuestionSchema(q: TemplateQuestion): ZodTypeAny {
  switch (q.type) {
    case 'scale_1_5': {
      const base = z.number().int().min(1).max(5);
      return q.required ? base : base.optional();
    }
    case 'text': {
      const base = z.string().min(1, 'Resposta obrigatória');
      return q.required ? base : z.string().optional();
    }
    case 'choice': {
      // Zod 3 enum requires non-empty tuple of literals
      if (q.options.length === 0) {
        return q.required ? z.never() : z.string().optional();
      }
      const tuple = q.options as [string, ...string[]];
      const base = z.enum(tuple);
      return q.required ? base : base.optional();
    }
  }
}

/**
 * Builds a flat Zod object whose keys are question.id strings.
 * The resulting `responses` object is what react-hook-form manages.
 *
 * Returns z.ZodObject<ZodRawShape> — type-safe, no `as any`.
 */
export function buildZodFromTemplate(snapshot: TemplateSnapshot) {
  const shape: Record<string, ZodTypeAny> = {};
  for (const section of snapshot.sections) {
    for (const q of section.questions) {
      shape[q.id] = buildQuestionSchema(q);
    }
  }
  return z.object(shape);
}

// Validation: snapshot itself
export const templateSnapshotSchema = z.object({
  version: z.literal(1),
  sections: z.array(z.object({
    id: z.string().min(1),
    title: z.string().min(1),
    weight: z.number().min(0).max(1),
    questions: z.array(z.discriminatedUnion('type', [
      z.object({ id: z.string(), label: z.string(), type: z.literal('scale_1_5'), required: z.boolean() }),
      z.object({ id: z.string(), label: z.string(), type: z.literal('text'), required: z.boolean() }),
      z.object({ id: z.string(), label: z.string(), type: z.literal('choice'), required: z.boolean(), options: z.array(z.string()).min(1) }),
    ])),
  })),
});
```

**Form usage:**

```typescript
// In EvaluationForm.tsx — orchestrator
const responsesSchema = useMemo(
  () => buildZodFromTemplate(cycle.template_snapshot),
  [cycle.template_snapshot],
);
const formSchema = z.object({
  cycle_id: z.string().uuid(),
  evaluated_user_id: z.string().uuid(),
  direction: z.enum(['leader_to_member', 'member_to_leader']),
  responses: responsesSchema,
});
type FormValues = z.infer<typeof formSchema>;

const form = useForm<FormValues>({
  resolver: zodResolver(formSchema),
  defaultValues: { ... },
});
```

**Type safety implication:** `FormValues['responses']` é `z.infer<typeof responsesSchema>` — TypeScript não sabe os IDs estaticamente (são dados em runtime). Isso é OK — o form em si é genérico; só o componente `EvaluationFormQuestion` precisa do `id` para registrar (`form.register(questionId)`). **[CITED: react-hook-form/resolvers Zod resolver supports both Zod v3 and v4 with automatic detection](https://github.com/react-hook-form/resolvers).**

### Pattern 4: Edge Function `create-user-with-temp-password`

**What:** Server-side user creation com senha temporária + flag `must_change_password`. Idempotent against duplicate email; returns plaintext password ao cliente uma única vez (RH copia pra WhatsApp).

**When to use:** D-20 / D-21 / D-22 / D-23.

**Example (recommended):**

```typescript
// supabase/functions/create-user-with-temp-password/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// D-21: 8 chars from [a-z A-Z 2-9] excluding 0, O, o, 1, l, I
const ALPHABET = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 56 chars
function generateTempPassword(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  let out = '';
  for (let i = 0; i < 8; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return out;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    // 1. Authenticate caller (RH/Admin only — RLS-safe via JWT verify)
    const authHeader = req.headers.get('Authorization') ?? '';
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user: caller } } = await supabaseUser.auth.getUser();
    if (!caller) throw new Error('Não autenticado');

    // Check caller is admin or rh
    const { data: roles } = await supabaseUser
      .from('user_roles')
      .select('role')
      .eq('user_id', caller.id);
    const callerRoles = (roles ?? []).map(r => r.role);
    if (!callerRoles.includes('admin') && !callerRoles.includes('rh')) {
      return new Response(JSON.stringify({ error: 'Sem permissão' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Parse + validate body
    const { fullName, email, role, companyId, orgUnitId } = await req.json();
    if (!email || !fullName || !role) throw new Error('Campos obrigatórios faltando');

    // 3. Service-role client for admin ops
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    // 4. Generate password + create user
    const tempPassword = generateTempPassword();
    const expiresAt = new Date(Date.now() + 24 * 3600 * 1000).toISOString();

    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: fullName, role },
    });
    if (createError) {
      // Idempotency: detect duplicate email
      if (/already.*registered|exists/i.test(createError.message)) {
        return new Response(JSON.stringify({ error: 'duplicate_email' }), {
          status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw createError;
    }
    const userId = userData.user!.id;

    // 5. Update profiles with flags + binding
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        full_name: fullName,
        must_change_password: true,
        temp_password_expires_at: expiresAt,
      })
      .eq('id', userId);
    if (profileError) throw profileError;

    // 6. Bind to org_unit (Phase 1 model — replaces legacy team_members)
    if (orgUnitId) {
      const { error: memberError } = await supabaseAdmin
        .from('org_unit_members')
        .insert({ user_id: userId, org_unit_id: orgUnitId });
      if (memberError) console.warn('org_unit_members insert failed', memberError);
    }

    // 7. Return plaintext password — caller copies to WhatsApp message
    return new Response(JSON.stringify({
      success: true,
      userId,
      tempPassword,
      expiresAt,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro desconhecido';
    return new Response(JSON.stringify({ error: msg }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
```

**Notes:**
- **Idempotency:** Detected via `/already.*registered/i` from Supabase auth response. Client interprets 409 as "show inline error 'Já existe pessoa com este email'" (UI-SPEC.md error states section).
- **CSPRNG:** Deno's `crypto.getRandomValues` is the Web Crypto standard, equivalent to Node's `crypto.randomBytes`. Modulo bias on 56-char alphabet is negligible (256 mod 56 = 0 for byte values 0-223; bytes 224-255 have slight bias but indistinguishable in 8-char output).
- **Plaintext return:** **only** through this single endpoint, only to RH caller, never logged. Phase 4 may add stricter audit. **[VERIFIED: precedent — `supabase/functions/create-user/index.ts:33` already uses `auth.admin.createUser` with same pattern].**

### Pattern 5: Forced Password Change Gate (ProtectedRoute)

**What:** ProtectedRoute reads `profiles.must_change_password`; redirects ALL navigation to `/first-login-change-password` until flag flipped.

**When to use:** D-23 lock.

**Example (recommended):**

```typescript
// src/components/ProtectedRoute.tsx — extension
import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserProfile } from '@/hooks/useUserProfile'; // already exists

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { profile, isLoading: profileLoading } = useUserProfile();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (loading || profileLoading || !user) return;
    if (profile?.must_change_password && location.pathname !== '/first-login-change-password') {
      navigate('/first-login-change-password', { replace: true });
    }
  }, [profile?.must_change_password, location.pathname, user, loading, profileLoading, navigate]);

  if (loading || profileLoading) return <FullPageSkeleton />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
```

**The `/first-login-change-password` route itself** must be wrapped in ProtectedRoute too (caller must be authenticated), but the redirect logic above intentionally skips redirecting when already on that path — preventing infinite loop.

**Performance:** `useUserProfile` already exists. The flag check piggybacks on existing query — no extra fetch. **[VERIFIED: hook listed at D-26 as "stays as-is"].**

**Risk: race condition on initial paint.** Between auth resolution and profile load, the user might briefly see another route. Mitigate by gating render on `profileLoading` (above shows `<FullPageSkeleton />`). Owner accepts ~200ms skeleton over flash of restricted content.

### Anti-Patterns to Avoid

- **Snapshot copy in application code only.** If RPC `create_evaluation_cycle` forgets to copy, drift happens silently. **Always pair with BEFORE INSERT trigger.**
- **K-anonymity check em client.** Cliente teria que receber raw responses para contar — quebra anonimato. **Sempre RPC.**
- **Senha temporária em log/console.** A Edge Function nunca pode logar `tempPassword`. **Lint/grep para `console.log.*password` no PR review.**
- **`SELECT *` em código que toca `one_on_ones` for non-RH callers.** Pega `rh_notes` mesmo com RLS bloqueando — Postgres retorna NULL na coluna mas o tipo TS não sabe disso. **Sempre listar colunas explicitamente** OR aplicar RLS column-level GRANT (ver Pitfall §5 abaixo).
- **`useScopedQuery` faltando `cycleId` no queryKey.** Ciclos diferentes da mesma empresa colidiriam. **queryKey: `["evaluations", scope.id, cycleId]`** é obrigatório.
- **TRUNCATE em PR sem flag visível.** D-08 owner aceitou drop, mas o PR deve ter banner inline `⚠️ DESTRUCTIVE: drops all evaluations`. Trato em §"Operational Risk Communication" abaixo.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CSPRNG password | `Math.random()` | `crypto.getRandomValues` (Web Crypto, Deno-native) | `Math.random` is predictable; Web Crypto is standard CSPRNG |
| K-anonymity threshold check | Client filtering | RPC SECURITY DEFINER returning agg-or-null | Client filter requires raw data → leak |
| Template snapshot freeze | Manual copy in app code | BEFORE INSERT trigger | Trigger is DB-level guarantee |
| Recursive org_unit lookup | New CTE in every hook | `org_unit_descendants(unit_id)` from Phase 1 | Helper já existe, indexed |
| Visible companies filter | New CTE | `visible_companies(uid)` from Phase 1 | Helper já existe |
| Auth admin user creation | Manual auth API | `supabase.auth.admin.createUser` | Already used in `create-user/index.ts` |
| Cron scheduling | App-level setInterval | `pg_cron` job | Já habilitado, retention job ativo |
| ProtectedRoute condition | New route wrapper | Extend existing `ProtectedRoute.tsx` | Already in codebase |
| WhatsApp formatting | `<a href="whatsapp://">` deeplink | Plaintext copy + clipboard API | Owner explicitly chose plaintext (D-20); deeplink fragmentation |
| Optimistic mutation | DIY rollback | TanStack Query `onMutate`+`onError`+`onSettled` | Phase 2 pattern (`useMoveApplicationStage`) |
| Toast notifications | Custom | Sonner (`src/components/ui/sonner.tsx`) | Already wired |
| Form state | useState chains | react-hook-form 7.73 | Locked stack |
| Schema validation | Manual checks | Zod 3.25 (DO NOT 3→4) | Locked |

**Key insight:** Phase 3 quase não introduz tecnologia nova. Tudo é composição dos chokepoints estabelecidos em Phase 1 (`useScopedQuery`, helpers RLS) e padrões Phase 2 (RPC `read_X_with_log`, expand→backfill→contract, Edge Functions com `auth.admin`). A originalidade da fase está em **schema + UX**, não em stack.

---

## Runtime State Inventory

> Phase 3 não é rename/refactor de string; mas envolve **migração destrutiva de schema** (drop coluna, drop dados, add coluna) — checklist análoga aplicável.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | (a) `evaluations` (todas as linhas) — drop por D-08; (b) `climate_responses.user_id` column (legacy PII) — drop por D-09; (c) `teams` table (legacy estrutura) — read-only mantido, não dropa em Phase 3 (só Phase 4 Migration G) | (a) `TRUNCATE evaluations` precedido de schema migration; (b) `ALTER TABLE DROP COLUMN user_id` + `DROP INDEX`; (c) Deixar como está — `teams` permanece read-only até Phase 4 |
| Live service config | Supabase project `ehbxpbeijofxtsbezwxd` — Storage bucket `meeting-audios` permanece (D-13). Edge Functions: legacy `create-user` permanece **mas** novo `create-user-with-temp-password` substitui chamadas em CreateUser.tsx | Code edit: substituir `supabase.functions.invoke('create-user', ...)` por `supabase.functions.invoke('create-user-with-temp-password', ...)`. Legacy fica desativado (não removido — pode ser usado por outra rota) |
| OS-registered state | pg_cron job `data_access_log_retention_cleanup` (Phase 2) já existe; novo job `evaluation_cycles_auto_close` será adicionado | Re-register via `cron.schedule` (idempotent — mesma pattern de Phase 2 F.2 lines 138-152) |
| Secrets/env vars | `SUPABASE_SERVICE_ROLE_KEY` (já existe, usado em legacy `create-user`); novo Edge Function reusa | None — chave já presente no Supabase environment |
| Build artifacts / installed packages | `src/integrations/supabase/types.ts` precisa **regerar** após cada migration aplicada (auto-gen via `npx supabase gen types typescript --linked > src/integrations/supabase/types.ts`) | Wave 2 inclui task explícita: "Regenerate types after schema push" — mesma pattern de Plan 02-04 |

**Specifics critical for planner:**

1. **Hooks que ainda passam `user_id` para `climate_responses`** (verificado `src/hooks/useClimateSurveys.ts:140` — `upsert([{ ..., user_id: user.id }])`) precisam ser **completamente reescritos** ANTES da migration drop user_id; OR a migration roda primeiro e quebra os hooks até serem reescritos. **Recomendação:** dois steps coordenados — (a) rewrite hook (não envia user_id; usa nova RPC `submit_climate_response`); (b) migration drop column. Ambos no mesmo wave.

2. **`teams.leader_id` é single TEXT** — Migration C.6 já mira `teams.id → org_units.id` mas a parte do `leader_id` ficou pendente. Confirmar em pgTAP que **toda team com leader_id NOT NULL gerou row em `unit_leaders`** após Backfill E.

3. **`profiles` table existing rows:** novos columns `must_change_password` e `temp_password_expires_at` recebem default `false` / `NULL`. Pessoas pré-Phase 3 NÃO são forçadas a trocar senha. Apenas novos cadastros pós-Edge Function.

---

## Common Pitfalls

### Pitfall 1: Adicionar `company_id` a `evaluations`/`one_on_ones` quebra hooks legacy antes do rewrite
**What goes wrong:** Migration `perf1` adiciona `company_id NOT NULL` em `evaluations` — INSERT atual de `useEvaluations.ts` não envia `company_id`, falha com `NOT NULL constraint violation`.
**Why it happens:** Hooks Phase-3-pre não conhecem o conceito de scope.
**How to avoid:** Add `company_id` como **NULLABLE primeiro** (expand step), backfill via RPC que deduz de `evaluator_user_id → org_unit_members → org_unit → company`, depois `ALTER COLUMN SET NOT NULL` (contract step). Mesma pattern Phase 2 Migration F.
**Warning signs:** CI vermelho em `pgTAP test_evaluation_insert_default_company` ou hook integration test failing.

### Pitfall 2: Snapshot freeze trigger não roda em INSERT via RPC com SECURITY DEFINER
**What goes wrong:** RPC `create_evaluation_cycle` com SECURITY DEFINER pode bypassar trigger se trigger tiver `SECURITY INVOKER` mismatch.
**Why it happens:** Postgres triggers run as table owner by default; SECURITY DEFINER no RPC não bypassa trigger, MAS se trigger function consultar outra tabela RLS-protected, pode falhar.
**How to avoid:** Trigger function deve usar `SET search_path = public` + access apenas a `evaluation_templates` (read schema_json) — não atravessar RLS. **Test gate:** pgTAP que invoque RPC + verifique snapshot é igual a template.schema_json no momento do INSERT.
**Warning signs:** snapshot vazio ou `null` em ciclos criados via RPC.

### Pitfall 3: K-anonymity RPC pode revelar count exato (vazamento)
**What goes wrong:** Se RPC retorna `{insufficient_data: true, count: 2}` (exposing count), atacante refina queries pra inferir individuals.
**Why it happens:** Por conveniência UI (mostrar "Aguarde mais 1 resposta"), RPC vaza count.
**How to avoid:** RPC retorna **apenas `{insufficient_data: true}`** (sem count). UI mostra "Mínimo 3 respostas" sem quantificar quantas faltam.
**Decisão sugerida:** Owner pode preferir transparência ("Faltam X respostas"). **Open Question:** confirmar antes do Wave 2.
**Warning signs:** UI test que faz assertion sobre count exposto.

### Pitfall 4: ProtectedRoute redirect loop em `/first-login-change-password`
**What goes wrong:** ProtectedRoute redireciona pra `/first-login-change-password`; página em si está dentro de ProtectedRoute → infinite redirect.
**Why it happens:** Falta de guard `if (location.pathname === '/first-login-change-password') return`.
**How to avoid:** Verificar `location.pathname` no `useEffect` antes de chamar `navigate`. Mostrado em código exemplo §Pattern 5.
**Warning signs:** "Maximum update depth exceeded" no console.

### Pitfall 5: `rh_notes` vaza via `SELECT *`
**What goes wrong:** Hook `useOneOnOnes` faz `select('*')` — Postgres retorna `rh_notes` se RLS row-policy passar (líder/liderado também leem a row para ver outras colunas). Frontend recebe a column.
**Why it happens:** Postgres RLS é row-level por default. Column-level proteção requer policy explícita ou view.
**How to avoid:** Três opções:
  - **(a) Selecione colunas explicitamente** sem `rh_notes` em hooks não-RH; backend ainda retorna `null` se chamado, mas é defesa-em-profundidade.
  - **(b) View `one_on_ones_public`** que omite `rh_notes`; non-RH usa view, RH usa table.
  - **(c) Tabela separada `one_on_one_rh_notes(meeting_id PRIMARY KEY, notes TEXT)`** com policy admin/rh apenas (cleanest LGPD).
**Recomendação:** **(c) tabela separada.** Razão: query auditoria em `data_access_log` fica precisa ("acesso a `one_on_one_rh_notes:UUID`" vs "acesso a `one_on_ones:UUID` com context unknown"). Custo: 1 migration extra + 1 join no form. Vale.
**Warning signs:** pgTAP test "liderado SELECT one_on_one returns row sem rh_notes" falha porque hook usa `select('*')`.

### Pitfall 6: TRUNCATE evaluations executado antes de adicionar `company_id` à nova schema
**What goes wrong:** Migration order errado — TRUNCATE com schema legado, depois ALTER, depois INSERT. Mas se ALTER falha mid-way, dados foram perdidos sem schema novo.
**Why it happens:** Sequencing migration como single transaction não-atômica.
**How to avoid:** Migration `perf2_drop_evaluations_history.sql` faz **(1) `ALTER TABLE evaluations` add new columns (cycle_id, direction, responses, company_id) NULLABLE; (2) `TRUNCATE`; (3) drop legacy columns; (4) ALTER set new columns NOT NULL where required**. Tudo em uma transaction. Se falha em (4), rollback automático restaura tabela vazia + schema legado — recuperável via PITR.
**Warning signs:** Migration script com TRUNCATE FIRST + ALTER LATER.

### Pitfall 7: Backfill E rodando em produção sem owner inputs
**What goes wrong:** Migration `e1_company_groups_seed.sql` referencia 7 UUIDs que owner deve fornecer; planner default usa placeholders, deploy quebra ou popula com nomes errados.
**Why it happens:** D-27 lock — owner provê inputs ANTES do execute. Plan deve bloquear se inputs ausentes.
**How to avoid:** Pré-condição explícita no PLAN.md de Wave 1: "Aguardar arquivo `.planning/phases/03-performance-refactor/owner-inputs/companies.json` antes de implementar e1". Sem o arquivo, plan fica draft.
**Warning signs:** Migration commit com `name: 'Empresa A'` placeholder.

### Pitfall 8: Realtime channel scope leak em troca de empresa
**What goes wrong:** Hook subscreve `supabase.channel('public:evaluations:company_id=eq.X')` — usuário troca empresa, channel não unsubscribe, recebe events da empresa antiga.
**Why it happens:** `useEffect` cleanup faltante ou `companyId` no deps array errado.
**How to avoid:** Reusar `useScopedRealtime` (Phase 1 — verificado em `src/shared/data/useScopedRealtime.ts`). Channel name inclui `scope.id`; cleanup automático.
**Warning signs:** RTL test "switch scope emits events from old scope".

### Pitfall 9: `useChangePassword` não invalida cache do profile após flip
**What goes wrong:** Após PATCH `must_change_password = false`, navegação cai de novo na ProtectedRoute, lê stale profile cache, redireciona de novo.
**Why it happens:** `queryClient.invalidateQueries(['profile', userId])` esquecido.
**How to avoid:** No `onSuccess` do mutate, **(1) invalidate profile query; (2) await refetch; (3) navigate('/')**.
**Warning signs:** Pessoa troca senha, vê tela de troca again. RTL test assertable.

### Pitfall 10: Toggle "Lista geral / Por par" persiste valor inválido em localStorage
**What goes wrong:** localStorage corrupted (browser crash, multi-tab race), toggle lê `'banana'` em vez de `'lista-geral'|'por-par'`, defaults pra crash.
**Why it happens:** Sem schema validation no read.
**How to avoid:** Pattern Phase 2 `cardCustomization.ts` linha 32-45 (Plan 02-03): Zod `safeParse` no read; default em qualquer falha. **[VERIFIED: precedente em STATE.md "(Plan 02-03) cardCustomization.ts Zod schema versionado"].**
**Warning signs:** Vitest "load corrupt JSON returns default".

### Pitfall 11: Hooks com queryKey faltando `cycleId` colidem
**What goes wrong:** Dois ciclos abertos simultâneos da mesma empresa → `useScopedQuery(["evaluations", scope.id], fn)` cacheado com 1º ciclo; usuário muda pra 2º ciclo, vê data errada.
**Why it happens:** queryKey shape definição.
**How to avoid:** Lock queryKey shape: `["evaluations", scope.id, cycleId]`. ESLint `@tanstack/eslint-plugin-query` (já ativo Phase 1) checa shape via `queryKey-prefix` rule (custom).
**Warning signs:** Manual test mostra avaliações erradas; CI lint fail.

### Pitfall 12: Senha temporária plaintext em React DevTools
**What goes wrong:** Componente `OnboardingMessageBlock` recebe `tempPassword` como prop. Em production build, React DevTools (browser extension) mostra props com senha visível.
**Why it happens:** Props always visible em dev tools.
**How to avoid:** Usar local state que limpa após "Copiado ✓" feedback. Component nunca recebe prop persistida — recebe via mutation result, limpa em unmount. **Acceptable risk:** browser do RH em local seguro, alternativa (envio direto pra WhatsApp via API) está fora de escopo.
**Warning signs:** Code review flag.

---

## Code Examples

### File-by-File Refactor Map

| File | Lines | Action | Notes |
|------|-------|--------|-------|
| `src/hooks/useEvaluations.ts` | 137 | Rewrite | Remove `period: string`; add `cycle_id` + `direction`; queryKey = `['evaluations', scope.id, cycleId]` via `useScopedQuery`; mutation accepts `{ cycle_id, evaluated_user_id, direction, responses: Record<questionId, value> }` |
| `src/hooks/useEvaluationCycles.ts` | NEW | Create | Lists cycles for current scope; `useScopedQuery(['cycles', scope.id], fn)` with `.in('company_id', scope.companyIds)` |
| `src/hooks/useEvaluationTemplates.ts` | NEW | Create | Per-company; default + custom |
| `src/hooks/useClimateSurveys.ts` | 213 | Rewrite | submit RPC `submit_climate_response` (no user_id); aggregation hook separated; queryKey scoped |
| `src/hooks/useClimateAggregate.ts` | NEW | Create | Calls `get_climate_aggregate(survey_id, org_unit_id)` RPC; returns `{count, avg, distribution} | {insufficient_data: true}` |
| `src/hooks/useClimateOverview.ts` | TBD | Rewrite scoped | Aggregation respects k-anon |
| `src/hooks/useOneOnOnes.ts` | 117 | Rewrite | + filtros (lider, liderado, periodo, status); `meeting_structure` JSONB extended with `transcricao_plaud`, `resumo_plaud`; `rh_notes` lives in separate table (Pitfall §5) |
| `src/hooks/useDevelopmentPlans.ts` | TBD | Rewrite scoped | queryKey + scope.id |
| `src/hooks/useNineBoxDistribution.ts` | TBD | Rewrite scoped | Same |
| `src/hooks/useCollaboratorEvolution.ts` | TBD | Rewrite scoped | Same |
| `src/hooks/useTeamIndicators.ts` | TBD | Rewrite scoped | Same |
| `src/hooks/useOrgIndicators.ts` | TBD | Rewrite scoped | Same |
| `src/hooks/useLeaderAlerts.ts` | TBD | Rewrite scoped | Same |
| `src/hooks/usePendingTasks.ts` | TBD | Rewrite scoped | Same |
| `src/hooks/useActionItems.ts` | TBD | Rewrite scoped | Same |
| `src/hooks/usePDIIntegrated.ts` | TBD | Rewrite scoped | Light touch |
| `src/hooks/usePDIUpdates.ts` | TBD | Rewrite scoped | Same |
| `src/hooks/useCostBreakdown.ts` | TBD | Rewrite scoped | Same |
| `src/hooks/useUserProfile.ts` | — | NO CHANGE | Per D-26 |
| `src/hooks/useAuth.ts` | — | NO CHANGE | Per D-26 |
| `src/hooks/useDeleteUser.ts` | — | NO CHANGE | Per D-26 |
| `src/hooks/useTeams.ts` | — | NO CHANGE (legacy) | Per D-26 |
| `src/components/EvaluationForm.tsx` | 773 | Refactor | Orchestrator <300 lines; spawn `EvaluationFormSection` + `EvaluationFormQuestion`; resolver via `buildZodFromTemplate` |
| `src/components/OneOnOneMeetingForm.tsx` | 909 | Refactor | Per D-18 split: orchestrator <300 + 4 subcomponents + 4 custom hooks |
| `src/components/ProtectedRoute.tsx` | TBD | Extend | Add `must_change_password` redirect (Pattern 5) |
| `src/pages/Evaluations.tsx` | 380 | Refactor | List of cycles cards; Create cycle dialog; click drills into cycle |
| `src/pages/Climate.tsx` | 343 | Refactor | k-anon aware; ClimateAggregateCard with empty state for <3 |
| `src/pages/OneOnOnes.tsx` | 621 | Refactor | Toggle "Lista geral / Por par" (RH); list/grouping below |
| `src/pages/CreateUser.tsx` | 346 | Rewrite | Rename to /cadastrar-pessoa; remove password field; call new Edge Function; show OnboardingMessageBlock post-success |
| `src/pages/FirstLoginChangePassword.tsx` | NEW | Create | LeverArrow + 2 password fields + amber banner if expired (D-24) |
| `src/lib/evaluationTemplate.ts` | NEW | Create | `buildZodFromTemplate` (Pattern 3) |
| `src/lib/passwordGenerator.ts` | NEW | Create | (mirror of Edge Function for Vitest unit tests; Edge Function uses Deno crypto) |
| `src/lib/climateAggregation.ts` | NEW | Create | k-anon helper for unit tests |
| `supabase/functions/create-user-with-temp-password/index.ts` | NEW | Create | Pattern 4 |
| `supabase/migrations/20260429*` | NEW | Create | 9 migrations §6 |

---

## Migration Sequence (Wave 1 + Wave 2)

The 9 migrations from CONTEXT D-27/28/29 expand to this sequence. **Order matters — dependencies marked.**

```
Wave 1 — Backfill E (BLOCKING; needs owner inputs)
─────────────────────────────────────────────────
e1_company_groups_seed.sql                           ← needs owner JSON: 7 companies + Grupo Lever
  ├ INSERT companies (7 internal, IDs from owner)
  ├ INSERT company_groups (Grupo Lever)
  └ UPDATE companies SET group_id = '<grupo-lever-uuid>' WHERE id IN (...)

e2_teams_to_org_units_backfill.sql                   ← depends on e1
  ├ For each team: INSERT INTO org_units (id=team.id, company_id, name, parent_id=root_for_company)
  ├ For each team_members row: INSERT INTO org_unit_members
  └ For each team WITH leader_id IS NOT NULL: INSERT INTO unit_leaders

e3_socios_to_memberships.sql                          ← depends on e1 + needs owner JSON: socio→companies
  ├ For each user_role role='socio': INSERT INTO socio_company_memberships(user_id, company_id) per owner list
  └ COMMENT: user_roles row stays (drops in Phase 4 Migration G)

Wave 2 — Performance schema (mostly parallel after E)
─────────────────────────────────────────────────────
perf1_evaluation_cycles_and_templates.sql             ← depends on e1
  ├ CREATE TABLE evaluation_templates (id, company_id NOT NULL FK, name, schema_json JSONB, is_default BOOL)
  ├ CREATE TABLE evaluation_cycles (id, company_id NOT NULL FK, template_id FK, name, template_snapshot JSONB, starts_at, ends_at, status TEXT)
  ├ CREATE TRIGGER tg_evaluation_cycles_freeze BEFORE INSERT OR UPDATE ON evaluation_cycles
  ├ ALTER TABLE evaluations ADD COLUMN cycle_id UUID FK, direction TEXT CHECK, responses JSONB, company_id UUID FK
  ├ RLS: evaluation_cycles + evaluation_templates use visible_companies(uid)
  ├ RLS: evaluations uses visible_companies + role-based row filter (D-03)
  └ RPC create_evaluation_cycle(template_id, name, starts_at, ends_at) (optional convenience)

perf2_drop_evaluations_history.sql                    ← depends on perf1
  ├ TRUNCATE evaluations CASCADE  -- (D-08; cascade applies to no FK currently — verify)
  ├ ALTER TABLE evaluations DROP COLUMN period, overall_score, technical_score, behavioral_score, leadership_score, comments, strengths, areas_for_improvement
  ├ ALTER TABLE evaluations ALTER COLUMN cycle_id SET NOT NULL
  ├ ALTER TABLE evaluations ALTER COLUMN direction SET NOT NULL
  ├ ALTER TABLE evaluations ALTER COLUMN company_id SET NOT NULL  -- safe: TRUNCATE'd
  ├ DROP POLICY old; CREATE POLICY new with visible_companies + role check
  └ COMMENT: registers reasoning on commit + STATE.md announce

clim1_drop_user_id_from_responses.sql                 ← depends on e1
  ├ ALTER TABLE climate_surveys ADD COLUMN company_id UUID NOT NULL FK (default first eligible — owner script if multi-survey)
  ├ ALTER TABLE climate_responses ADD COLUMN org_unit_id UUID NULL  (populated from user_id LOOKUP first)
  ├ UPDATE climate_responses SET org_unit_id = (SELECT org_unit_id FROM org_unit_members WHERE user_id = climate_responses.user_id LIMIT 1)
  ├ ALTER TABLE climate_responses DROP COLUMN user_id
  ├ DROP INDEX IF EXISTS idx_climate_responses_user_id
  ├ DROP CONSTRAINT IF EXISTS unique_survey_question_user
  └ RLS: climate_responses no longer SELECT/INSERT/UPDATE for owner; only via RPC

clim2_aggregate_rpc.sql                               ← depends on clim1
  ├ CREATE FUNCTION get_climate_aggregate(p_survey_id, p_org_unit_id) → jsonb
  ├ CREATE FUNCTION submit_climate_response(p_survey_id, p_question_id, p_score, p_comment) → void
  └ GRANT EXECUTE TO authenticated

one1_one_on_ones_extensions.sql                       ← depends on e1
  ├ ALTER TABLE one_on_ones ADD COLUMN company_id UUID FK (NULL initial)
  ├ UPDATE one_on_ones SET company_id = (SELECT first company from leader's org_units)
  ├ ALTER TABLE one_on_ones ALTER COLUMN company_id SET NOT NULL
  ├ CREATE TABLE one_on_one_rh_notes (meeting_id UUID PK FK one_on_ones, notes TEXT, updated_by UUID FK profiles, updated_at TIMESTAMPTZ)
  ├ RLS one_on_one_rh_notes: SELECT/INSERT/UPDATE only is_people_manager(uid)  -- admin OR rh; sócio NOT included unless explicit
  └ COMMENT meeting_structure JSONB schema documenting transcricao_plaud + resumo_plaud (no DDL change)

auth1_must_change_password.sql                        ← independent of e/perf/clim/one
  ├ ALTER TABLE profiles ADD COLUMN must_change_password BOOLEAN NOT NULL DEFAULT false
  ├ ALTER TABLE profiles ADD COLUMN temp_password_expires_at TIMESTAMPTZ NULL
  └ RLS: existing profile policies cover; both columns readable by self (already)

cron1_evaluation_cycles_auto_close.sql                ← depends on perf1
  └ SELECT cron.schedule('evaluation_cycles_auto_close', '0 6 * * *', $$
      UPDATE public.evaluation_cycles
         SET status = 'closed'
       WHERE status = 'active' AND ends_at <= NOW();
    $$);  -- note: 03:00 BRT = 06:00 UTC
```

**Total: 9 migrations.** Wave 1 (E1+E2+E3) is sequential and BLOCKING. Wave 2 (perf1, perf2, clim1, clim2, one1, auth1, cron1) can be 4 sub-waves: (a) perf1 + clim1 + one1 + auth1 in parallel; (b) perf2 after perf1; (c) clim2 after clim1; (d) cron1 after perf1.

**Idempotency:** Every migration uses `CREATE TABLE IF NOT EXISTS`, `CREATE OR REPLACE FUNCTION`, `DROP POLICY IF EXISTS` followed by `CREATE POLICY`. Re-running should be no-op.

**Rollback strategy if mid-batch failure:** Each migration is a transaction (Supabase default). Failure = automatic rollback to pre-migration state. **For destructive ones (perf2 TRUNCATE):** PITR window (7 days) is the only restore path. Document in commit message.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `evaluations.period: TEXT` | `evaluation_cycles.id` + `evaluation_cycles.template_snapshot` JSONB | Phase 3 | Histórico não comparável diretamente (period strings podiam ser livres "Q1/2024"); novo modelo é estruturado |
| Climate stores `user_id` | Drop column; only `score, question_id, survey_id, [org_unit_id]` | Phase 3 D-09 | True 100% anônimo; impossível re-identificar respondentes |
| Email-based onboarding | WhatsApp pre-formatted message + temp password | Phase 3 AUTH-01..03 | Aceitação prática melhor para liderado BR |
| Plain `auth.signUp` (CreateUser.tsx legacy) | Edge Function with `auth.admin.createUser` + flags | Phase 3 D-22 | Forced password change; expiry tracking; idempotent duplicate detection |
| Components 700-900 lines | Orchestrator <300 + sub-components <250 each | QUAL-04 + Phase 3 D-18 | Maintainability + memo possible per sub-component |
| `period` filter in Evaluations.tsx | Cycle drill-down with cycle status chip | Phase 3 PERF-01 | Operational reality (sem janela global; cada empresa no seu ritmo) |

**Deprecated/outdated:**

- **Existing `create-user` Edge Function** — não removido (pode ser usado por algum import legacy), mas substituído em `CreateUser.tsx` por `create-user-with-temp-password`. Em Phase 4 Migration G pode ser removido se grep confirmar zero imports.
- **`team_members` table inserts via Edge Function legacy** — substituído por `org_unit_members` em new flow. Legacy ainda escreve para `team_members` (compat); Phase 4 dropa.
- **`teams.leader_id`** — replaced by `unit_leaders` (1+ líderes); `teams` permanece read-only ORG-09 até Phase 4 Migration G.

---

## Project Constraints (from CLAUDE.md)

- Vite 5 + React 18 + TS 5.8 strict (locked).
- Supabase project `ehbxpbeijofxtsbezwxd`.
- shadcn/ui + Radix + Tailwind + LinearKit primitives (`Btn`, `Chip`, `LinearAvatar`, `LeverArrow`).
- **NEVER** Lucide ArrowX as logo stand-in. Always SVG oficial ou `LeverArrow`.
- **DO NOT upgrade Zod 3 → 4** (incompat com `@hookform/resolvers` 5.2.2).
- All `supabase.from()` calls in `src/hooks/` ou `src/integrations/` (ESLint enforced).
- queryKey ALWAYS includes `scope.id` (`@tanstack/eslint-plugin-query` enforced).
- Forms: `react-hook-form` 7.73 + `@hookform/resolvers` 5.2.2 + Zod 3.25, **no `as any`**.
- Components > 800 lines = debt, break when touched.
- No PII in `console.log` in production (`logger.ts` wrapper).
- Onboarding via WhatsApp, NOT email.
- Package manager: **npm** (`package-lock.json` canonical).

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `climate_responses.org_unit_id` é a granularidade de agregação correta (não só `company_id`) | §"K-anonymity" Pattern 2 | Owner pode preferir agregar só por empresa (mais simples; menos buckets pequenos). **OPEN QUESTION.** |
| A2 | RPC `get_climate_aggregate` retorna `{insufficient_data: true}` SEM count exato | Pitfall §3 | Owner pode preferir transparência ("Aguarde mais X respostas"). **OPEN QUESTION.** |
| A3 | `rh_notes` em **tabela separada** `one_on_one_rh_notes` | Pitfall §5 + Migration sequence one1 | Mais robusto LGPD-wise; mais simples seria coluna em `one_on_ones` com policy explícita. Owner não selecionou. **Decisão Claude — registrar para validation no plan-checker.** |
| A4 | Auto-close ciclos = `pg_cron` daily 06:00 UTC (= 03:00 BRT) | Migration `cron1` | CONTEXT lock confirma BRT 03:00. Se Supabase usa UTC, planner verifica timezone do cron job. |
| A5 | Senha temporária válida indefinidamente sem expiry hard cap (D-24) | Pitfall §12 | Owner aceitou tradeoff. Phase 4 pode introduzir hard cap pós-incidente. |
| A6 | `evaluation_templates.schema_json` populado via seed/admin (não UI completa nesta fase) | Migration `perf1` + Deferred Ideas | Confirmado em CONTEXT Deferred ("UI completa de gestão de templates por empresa fica para Phase 4 polish"). |
| A7 | Edge Function retorna `tempPassword` plaintext ao cliente; cliente nunca persiste | Pattern 4 + Pitfall §12 | Owner aceitou (D-20 explicit "RH copia"). React DevTools risk acceptable. |
| A8 | `evaluations.responses` é JSONB `{ [questionId]: value }` — **flat**, não aninhado por section | Pattern 3 | Section structure já em template_snapshot; responses só guardam answers. Confirma com planner ao desenhar form. |
| A9 | Migrations rodam contra Supabase remote via `supabase db push --linked` (Phase 2 Plan 02-04 precedente) | Migration sequence | Mesma operação Phase 2; risco baixo. |
| A10 | `useChangePassword` faz `supabase.auth.updateUser({ password })` + `UPDATE profiles SET must_change_password=false` em sequência (não atomic) | Pitfall §9 | Race se primeiro suceeds e segundo falha → user pode logar mas RPC ainda redireciona pra trocar senha. Mitigation: hook retry segundo step. |
| A11 | Visibilidade de `rh_notes` é `admin` + `rh` apenas (sem `socio`) | Pattern §5 + Migration one1 | CONTEXT D-17 explicit "RLS: SELECT/UPDATE só para roles `admin` e `rh`". `socio` excluído. Confirma. |
| A12 | Phase 3 não toca `cultural_fit_*` tables (são Phase 2 R&S, não Performance) | File-by-File map | Confirmado escopo. |

---

## Open Questions

1. **K-anonymity granularity (A1):** RPC `get_climate_aggregate` agrega por `company_id` apenas, OU também por `org_unit_id` opcional?
   - What we know: CONTEXT D-10 fala "agregação por org_unit"; survey scope (D-11) menciona "subset de org_units".
   - What's unclear: Para uma empresa com 5 org_units e survey company-wide, a UI mostra 1 número (toda empresa) ou 5 (cada org_unit + filtro de "menos de 3")?
   - **Recommendation:** Default both. RPC accepts `org_unit_id NULL` (= toda empresa) ou UUID (= subtree). UI mostra empresa como default; drill-down opcional.

2. **K-anonymity transparency (A2):** Mostra count parcial ("Faltam X respostas") OU oculta completamente?
   - What we know: Tradeoff anonymity vs UX transparency.
   - What's unclear: owner não selecionou.
   - **Recommendation:** Oculta. Threat model: count parcial pode ser combinado com side-info ("eu sei que dept X tem 4 pessoas, count=3 → uma específica não respondeu"). Risk > UX value.
   - **Action:** Confirmar com owner em discuss-phase ou inline review do PR de Wave 2.

3. **`rh_notes` table vs column (A3):** Tabela separada `one_on_one_rh_notes` (recomendado) OU coluna `one_on_ones.rh_notes` com policy explícita?
   - What we know: CONTEXT só fala "coluna nova"; planner discretion.
   - What's unclear: tradeoff complexity vs RLS robustness.
   - **Recommendation:** Tabela separada (Pitfall §5).

4. **Auto-aggregate to parent org_unit when count < 3?**
   - What we know: CONTEXT diz "planner decide implementação default".
   - What's unclear: comportamento UX.
   - **Recommendation:** **NÃO auto-agrega.** Empty state explícito. Owner pode pedir opposite após uso real.

5. **`teams` legacy backfill — preserva `team.id` como `org_unit.id`?**
   - What we know: Migration C linhas 200-230 já tem precedente `INSERT INTO org_units (id) SELECT id FROM teams ...`.
   - What's unclear: completeness — Phase 1 deixou idempotente; Phase 3 e2 confirma fim do backfill ou repete?
   - **Recommendation:** e2 valida + completa. pgTAP test: "every team.id has matching org_unit.id".

6. **Hooks NOT migrating list completa** — verificar nada além de `useUserProfile`, `useAuth`, `useDeleteUser`, `useTeams` precisa stay legacy?
   - What we know: D-26 lock 4 hooks.
   - What's unclear: `useAudioTranscription` (D-13) também stays legacy?
   - **Recommendation:** Sim — `useAudioTranscription` stays. CONTEXT D-13 confirma "Plaud é o caminho oficial; gravação no app é alternativa secundária". Hook não é scoped por empresa.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Supabase project ehbxpbeijofxtsbezwxd | All schema/RLS work | ✓ | linked | — |
| `pg_cron` | Auto-close ciclos | ✓ | enabled (Phase 2 retention job ativo) | — |
| `auth.admin` API | Edge Function user creation | ✓ | precedente em `create-user/index.ts` | — |
| Deno runtime (Edge Function) | `crypto.getRandomValues` for password | ✓ | standard | — |
| `npx supabase gen types typescript --linked` | Regen `types.ts` after migrations | ✓ | Phase 2 precedente | — |
| pgTAP | DB tests | ✓ | Phase 1 setup; tests in `supabase/tests/` | — |
| Vitest 3.2 + RTL 16 + MSW 2.10 | Frontend tests | ✓ | Phase 1 setup | — |
| `useScopedQuery` chokepoint | All Performance hooks | ✓ | `src/shared/data/useScopedQuery.ts` (verified) | — |
| `useScopedRealtime` | Realtime evaluations updates (optional) | ✓ | `src/shared/data/useScopedRealtime.ts` (verified) | — |
| `visible_companies(uid)` helper | RLS in cycles/templates/one_on_ones | ✓ | Phase 1 Migration C | — |
| `org_unit_descendants(uuid)` helper | Líder visibility on evaluations | ✓ | Phase 1 Migration B2 | — |
| `is_people_manager(uid)` | RH check on `rh_notes` | ✓ | Phase 1 helper | — |
| `LeverArrow` brand primitive | First-login page | ✓ | `src/components/primitives/LeverArrow.tsx` | — |
| `LinearKit` (Btn, Chip, etc.) | All new UI | ✓ | `src/components/primitives/LinearKit.tsx` | — |
| `framer-motion` | Animations | ✗ (intentional) | — | CSS transforms + tokens (UI-SPEC.md "DO NOT add framer-motion") |
| WhatsApp Business API | Direct send | ✗ | — | Plaintext copy + manual paste (D-20 lock) |
| OpenAI API for summary | AI Plaud resumo | ✗ | — | Manual paste from Plaud app (D-12 lock) |

**Missing dependencies with no fallback:** None blocking.

**Missing dependencies with fallback:** WhatsApp API → manual paste. OpenAI → manual paste. Both are owner-locked decisions, NOT environment gaps.

---

## Validation Architecture

> Nyquist enabled (`workflow.nyquist_validation: true` in `.planning/config.json`). Section required.

### Test Framework
| Property | Value |
|----------|-------|
| Frontend framework | Vitest 3.2 + React Testing Library 16 + MSW 2.10 |
| DB framework | pgTAP + supabase-test-helpers |
| Config files | `vitest.config.ts` (Phase 1 ✓), `supabase/tests/` (Phase 2 ✓) |
| Quick run command | `npx vitest run --reporter=basic` |
| Full suite command | `npm test && supabase db test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTH-01 | RH cria pessoa via Edge Function; `must_change_password=true` | integration (RTL+MSW) | `npx vitest run src/pages/__tests__/CreateUser.test.tsx` | ❌ Wave 0 |
| AUTH-01 | Edge Function rejects non-admin/rh callers | unit (Deno test) | `deno test supabase/functions/create-user-with-temp-password/index_test.ts` | ❌ Wave 0 |
| AUTH-01 | Edge Function returns 409 on duplicate email | integration | same file | ❌ Wave 0 |
| AUTH-02 | OnboardingMessageBlock renders template + Copy button copies to clipboard | RTL | `npx vitest run src/components/__tests__/OnboardingMessageBlock.test.tsx` | ❌ Wave 0 |
| AUTH-03 | Senha < 8 chars rejeita; sem `0/O/o/1/l/I` | unit | `npx vitest run src/lib/__tests__/passwordGenerator.test.ts` | ❌ Wave 0 |
| AUTH-03 | Senha temp expirada > 24h ainda permite login + força troca | integration | RTL `FirstLoginChangePassword.test.tsx` (D-24 banner) | ❌ Wave 0 |
| AUTH-03 | Navegação para `/qualquer` com `must_change_password=true` redireciona | integration | RTL `ProtectedRoute.test.tsx` | ❌ Wave 0 |
| PERF-01 | Criar ciclo cria row em `evaluation_cycles` com snapshot frozen | pgTAP | `supabase/tests/003_evaluation_cycles_snapshot.sql` | ❌ Wave 0 |
| PERF-01 | Auto-close cron flips `status='active' → 'closed'` quando `ends_at <= now()` | pgTAP | same file | ❌ Wave 0 |
| PERF-02 | UPDATE em `evaluation_templates.schema_json` NÃO afeta `evaluation_cycles.template_snapshot` (immutability) | pgTAP | `003_evaluation_cycles_snapshot.sql` | ❌ Wave 0 |
| PERF-03 | Avaliação `direction='leader_to_member'` distinguishable from `member_to_leader` no mesmo ciclo | pgTAP + RTL | unit + integration | ❌ Wave 0 |
| PERF-04 | Líder vê avaliações do liderado via org_unit_descendants; liderado não vê de outros | pgTAP | `004_evaluations_rls.sql` | ❌ Wave 0 |
| PERF-04 | RH vê todas evaluations da empresa; sócio vê via membership | pgTAP | same file | ❌ Wave 0 |
| PERF-05 | `climate_responses` schema NÃO tem coluna `user_id` após Wave 2 | pgTAP | `005_climate_anonymity.sql` | ❌ Wave 0 |
| PERF-05 | RPC `submit_climate_response` rejeita parâmetro user_id | pgTAP | same file | ❌ Wave 0 |
| PERF-06 | RPC `get_climate_aggregate` retorna `{insufficient_data: true}` quando count<3 | pgTAP | `005_climate_anonymity.sql` | ❌ Wave 0 |
| PERF-06 | RPC retorna `{count, avg, distribution}` quando count>=3 | pgTAP | same file | ❌ Wave 0 |
| PERF-07 | Form de avaliação valida via Zod resolver gerado dinamicamente | RTL+vitest | `EvaluationForm.test.tsx` (test scale_1_5/text/choice required) | ❌ Wave 0 |
| PERF-07 | Salvar avaliação faz optimistic update; rollback em error | RTL+MSW | same file | ❌ Wave 0 |
| ONE-01 | Criar 1:1 + popular agenda + action items + Plaud transcription | RTL | `OneOnOneMeetingForm.test.tsx` | ❌ Wave 0 |
| ONE-02 | Liderado X tenta SELECT 1:1 do par (Y, Z) → empty | pgTAP | `006_one_on_ones_rls.sql` | ❌ Wave 0 |
| ONE-03 | RH SELECT 1:1 da empresa retorna todas; badge "RH visível" presente em form | RTL | `OneOnOneMeetingForm.test.tsx` | ❌ Wave 0 |
| ONE-03 | RH adiciona nota em `one_on_one_rh_notes`; liderado SELECT joinado retorna sem rh_notes | pgTAP | `006_one_on_ones_rls.sql` | ❌ Wave 0 |
| ONE-04 | Form persiste `meeting_structure.transcricao_plaud` e `.resumo_plaud` no JSONB | RTL+MSW | `OneOnOneNotes.test.tsx` | ❌ Wave 0 |
| ONE-04 | Paste de 10k+ chars não causa lag (debounce ou virtualization not needed; just smoke) | RTL benchmark | same file (skipped on CI; manual smoke) | ❌ Wave 0 |
| ONE-05 | Action items checklist persiste em `meeting_structure.action_items[]` | RTL | `OneOnOneActionItems.test.tsx` | ❌ Wave 0 |
| ONE-06 | Histórico de 1:1 do par renderiza em ordem cronológica + busca por keyword filtra | RTL | `OneOnOnes.test.tsx` | ❌ Wave 0 |
| Backfill E | 7 companies + Grupo Lever existem; cada teams → org_unit + members + leader preserved | pgTAP | `007_backfill_e.sql` | ❌ Wave 0 |
| Backfill E | user_roles role='socio' → linhas em socio_company_memberships per owner JSON | pgTAP | same file | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npx vitest run --reporter=basic` (focused on touched module)
- **Per wave merge:** `npm test && supabase db test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `supabase/tests/003_evaluation_cycles_snapshot.sql` — covers PERF-01, PERF-02
- [ ] `supabase/tests/004_evaluations_rls.sql` — covers PERF-03, PERF-04
- [ ] `supabase/tests/005_climate_anonymity.sql` — covers PERF-05, PERF-06
- [ ] `supabase/tests/006_one_on_ones_rls.sql` — covers ONE-02, ONE-03
- [ ] `supabase/tests/007_backfill_e.sql` — covers Migration E1+E2+E3
- [ ] `src/lib/__tests__/passwordGenerator.test.ts` — covers AUTH-03
- [ ] `src/lib/__tests__/evaluationTemplate.test.ts` — covers PERF-07 (Zod build)
- [ ] `src/lib/__tests__/climateAggregation.test.ts` — covers PERF-06 (k-anon helper)
- [ ] `src/components/__tests__/OnboardingMessageBlock.test.tsx` — covers AUTH-02
- [ ] `src/components/__tests__/EvaluationForm.test.tsx` — covers PERF-07
- [ ] `src/components/__tests__/OneOnOneMeetingForm.test.tsx` — covers ONE-*
- [ ] `src/components/__tests__/OneOnOneNotes.test.tsx` — covers ONE-04
- [ ] `src/components/__tests__/OneOnOneActionItems.test.tsx` — covers ONE-05
- [ ] `src/components/__tests__/ProtectedRoute.test.tsx` — covers AUTH-03 redirect
- [ ] `src/pages/__tests__/CreateUser.test.tsx` — covers AUTH-01
- [ ] `src/pages/__tests__/FirstLoginChangePassword.test.tsx` — covers AUTH-03
- [ ] `src/pages/__tests__/OneOnOnes.test.tsx` — covers ONE-06 + D-16 toggle
- [ ] MSW handlers for `create-user-with-temp-password` Edge Function + `get_climate_aggregate` RPC + `submit_climate_response` RPC

---

## Security Domain

Phase 3 implícita modela várias capacidades sensíveis. ASVS coverage:

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Supabase Auth (locked); 24h temp password expiry; forced first-login change |
| V3 Session Management | yes | Supabase JWT auto-refresh; ProtectedRoute gating; cross-tab sync via `useScopeBroadcast` (Phase 1) |
| V4 Access Control | yes | RLS via `visible_companies` + `org_unit_descendants` + role-based row filters; CASL client-side defense-in-depth |
| V5 Input Validation | yes | Zod schemas on all forms (RHF resolver); Edge Function validates body shape before `auth.admin` call |
| V6 Cryptography | yes | `crypto.getRandomValues` (Web Crypto) for temp password CSPRNG; never `Math.random` |
| V8 Data Protection | yes | Climate `user_id` column dropped (LGPD); `rh_notes` in separate table with role-restricted RLS |
| V11 Error Handling | yes | Edge Function returns specific 409 for duplicate email; never leaks SQL/internal error details |
| V13 Configuration | yes | `pg_cron` jobs idempotent; secrets in Supabase env (never committed) |

### Known Threat Patterns for Phase 3 stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Cross-tenant data leak via stale React Query cache | I (Information disclosure) | `useScopedQuery` chokepoint with `scope.id` in queryKey (Phase 1 lock) |
| RLS policy bypass via SECURITY DEFINER RPC missing re-auth | E (Elevation of privilege) | Every RPC re-applies `is_people_manager(uid)` OR `visible_companies` check (precedent: F.2 RPC) |
| Plaintext temp password in logs | I | Edge Function never `console.log(tempPassword)`; PR review + grep guard |
| Climate respondent re-identification via timing/IP | I | Don't store IP/timestamps fine-grained; aggregation k-anon ≥3 enforced via RPC |
| Snapshot drift (template mutated mid-cycle) | T (Tampering) | BEFORE INSERT trigger + UPDATE prevention; pgTAP gate |
| Forced password change bypass (URL manipulation) | E | ProtectedRoute server-side check + redirect; flag in DB (`profiles.must_change_password`) |
| Brute-force temp password (8 chars only) | S/E | 56^8 = ~9.6T combinations; Supabase rate limit (default 30/hour). Owner accepted tradeoff (D-21). Phase 4 may add stricter cap. |
| `rh_notes` exfiltration via `SELECT *` | I | Separate table `one_on_one_rh_notes` with admin/rh-only RLS; any leak surfaces in pgTAP |
| Snapshot replay attack (resubmit avaliação after cycle closed) | T | RLS check `cycle.status='active'` on INSERT/UPDATE evaluations; cron auto-close enforced |
| Edge Function authn bypass (call without JWT) | E | `auth.getUser()` from anon client first; reject if `caller=null`; service role only after caller validated |

---

## Sources

### Primary (HIGH confidence)
- `.planning/phases/03-performance-refactor/03-CONTEXT.md` — All 29 D-* decisions verbatim
- `.planning/phases/03-performance-refactor/03-UI-SPEC.md` — Locked copy + flow + pages
- `.planning/REQUIREMENTS.md` §AUTH §PERF §ONE — 16 REQ-IDs
- `.planning/PROJECT.md` — locked stack + decisions
- `.planning/ROADMAP.md` Phase 3 section — success criteria
- `.planning/phases/01-tenancy-backbone/01-CONTEXT.md` — `useScopedQuery`, `visible_companies`, `org_unit_descendants` chokepoints (D-04, D-11)
- `.planning/phases/02-r-s-refactor/02-CONTEXT.md` — RPC `read_X_with_log` pattern + expand→backfill→contract
- `supabase/migrations/20260427120100_b2_org_units_and_helpers.sql` — `tg_org_units_same_company_as_parent` trigger pattern (precedent for snapshot freeze)
- `supabase/migrations/20260427120200_c_socio_memberships_rls_rewrite_and_backfill.sql` — `visible_companies(uid)` helper, `socio_company_memberships` table
- `supabase/migrations/20260428120100_f2_data_access_log_table.sql` — RPC SECURITY DEFINER pattern + `pg_cron` retention job
- `supabase/migrations/20251009195041_*.sql` lines 200-212 — confirmed `climate_responses.user_id` exists today (verified)
- `supabase/migrations/20251010134452_*.sql` lines 43-49 — confirmed `one_on_ones.audio_url` + `meeting_structure` JSONB
- `supabase/functions/create-user/index.ts` — `auth.admin.createUser` precedent
- `src/integrations/supabase/types.ts` — Verified `evaluations`, `one_on_ones`, `climate_surveys` MISSING `company_id`
- `src/shared/data/useScopedQuery.ts` — Phase 1 chokepoint signature
- `src/app/providers/ScopeProvider.tsx` — scope resolution flow
- `leverup-talent-hub/CLAUDE.md` — locked stack + conventions

### Secondary (MEDIUM confidence — verified with primary)
- [PostgreSQL Anonymizer 1.0 announcement](https://www.postgresql.org/about/news/postgresql-anonymizer-10-privacy-by-design-for-postgres-2452/) — k-anonymity is canonical pattern
- [react-hook-form/resolvers GitHub](https://github.com/react-hook-form/resolvers) — Zod resolver supports v3 + v4

### Tertiary (LOW confidence — single source, flagged)
- None used for load-bearing claims.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — 100% reuses Phase 1+2 chokepoints; no new packages.
- Migration sequence: HIGH — derived directly from CONTEXT D-27/28/29 + Phase 2 expand→backfill→contract precedent.
- Schema design (cycles + templates + snapshot): HIGH — patterns verified in existing codebase + Postgres docs.
- K-anonymity RPC: HIGH for pattern, MEDIUM for `org_unit_id` granularity (Open Question 1).
- Snapshot freeze (trigger): HIGH — direct precedent in Migration B2.
- Edge Function: HIGH — direct precedent in `create-user/index.ts`.
- ProtectedRoute gate: HIGH — `useUserProfile` already exists; pattern is well-known.
- `rh_notes` separation: MEDIUM — Claude's discretion, table-vs-column tradeoff (Open Question 3).
- Backfill E completeness: MEDIUM — depends on owner inputs (D-27); plan should block until provided.

**Research date:** 2026-04-28
**Valid until:** 2026-05-28 (30 days — Phase 3 dependencies are stable; Supabase project locked; stack locked)

---

## RESEARCH COMPLETE
