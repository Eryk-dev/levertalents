---
phase: 04-dashboards-quality-polish
plan: 08
subsystem: migration-g-contract
tags: [migration-g, contract, irreversible, blocking, phase-4]
status: complete
dependency_graph:
  requires:
    - 04-07 (critical-flow-tests, pgTAP 011 verde)
    - Phases 1-3 estáveis em produção
  provides:
    - allowed_companies* helpers REMOVIDOS do remoto
    - storage.objects hiring_bucket policies usando visible_companies
    - pg_cron retention job validado (data_access_log_retention_cleanup)
    - types.ts regenerado sem allowed_companies
  affects:
    - storage.objects (rewrite hiring_bucket:select e :insert policies)
    - public.allowed_companies (DROPPED)
    - public.allowed_companies_for_user (no-op DROP — never existed)
    - .planning/codebase/{ARCHITECTURE,CONCERNS,CONVENTIONS}.md
tech-stack:
  added: []
  patterns:
    - "Storage policy rewrite (recovery do gap deixado pelo Migration C)"
    - "Sanity-guard RAISE EXCEPTION no padrão Migration PRE.3"
    - "DROP TABLE teams comentado (Option A)"
    - "Step 2 NOT NULL removido em runtime (Rule 1 deviation — schema mismatch)"
key-files:
  created:
    - supabase/migrations/20260507120000_g_contract_drop_legacy.sql
    - supabase/tests/012-data-access-log-cron.sql
  modified:
    - src/integrations/supabase/types.ts (regen — 1 line removed)
    - .planning/codebase/ARCHITECTURE.md (Migration Ledger section)
    - .planning/codebase/CONCERNS.md (Resolved + Outstanding sections)
    - .planning/codebase/CONVENTIONS.md (DB scope helpers section)
decisions:
  - "Recovery do gap do Migration C: as 2 storage policies hiring_bucket:select/:insert ainda referenciavam allowed_companies. A migração G as reescreveu para visible_companies ANTES do DROP FUNCTION (Step 0)."
  - "OPTION A em vigor: DROP TABLE teams permanece COMENTADO. Auditoria revelou ~10 consumidores ativos em src/."
  - "Step 2 (NOT NULL em applications/candidates) REMOVIDO inline durante o push: as colunas company_id NÃO existem nessas tabelas (PRE.1 só adicionou em evaluations/one_on_ones/climate_surveys). REQ QUAL-09 não exige NOT NULL específico. Rule 1 deviation aplicada."
metrics:
  started: 2026-04-28T20:00:00Z
  completed: 2026-04-29T10:00:00Z
  duration: ~14h (mostly Task 1 audit + write; Tasks 2-3 ~30min)
---

# Phase 04 Plan 08: Migration G — Contract Drop Legacy

Migration G é a **última migração irreversível** do roadmap. Aplicada com sucesso em `ehbxpbeijofxtsbezwxd` em 2026-04-29.

**One-liner:** Dropou `allowed_companies` legacy helpers do remoto (após reescrever 2 storage policies que ainda os referenciavam), validou pg_cron de retenção, regenerou types.ts. DROP TABLE teams ficou comentado (Option A — 10 leitores ativos). Step de NOT NULL em hiring tables foi removido inline porque as colunas nunca existiram (Rule 1 deviation).

## Pre-Migration Audit (Task 1)

### Audit #1 — `allowed_companies` em src/ tests/

```
src/integrations/supabase/types.ts:2944:      allowed_companies: { Args: { _profile_id: string }; Returns: string[] }
src/lib/hiring/rlsScope.ts:5:// Mirrors the DB `allowed_companies(profile_id)` helper — the list of company
```

**Análise:** `types.ts` é auto-gen (sumiu após `gen types`). `rlsScope.ts` linha 5 é apenas COMENTÁRIO stale; o código ATIVO chama `companies` + `team_members` direto, não o helper DB. Não bloqueia o drop.

### Audit #2 — `teams` / `team_members` em src/ tests/ (UNFILTERED — P4-V11 verbatim)

Comando exato: `grep -rn '"teams"\|public\.teams\|from(.teams.\|team_members' src/ tests/ 2>&1 | grep -v "supabase/types.ts"`

```
src/components/ManualOneOnOneForm.tsx:27:        .from("team_members")
src/components/ManualOneOnOneForm.tsx:28:        .select("*, user:profiles!team_members_user_id_fkey(id, full_name)")
src/components/ManualPDIForm.tsx:48:        .from("team_members")
src/components/ManualPDIForm.tsx:52:          user:profiles!team_members_user_id_fkey(id, full_name)
src/components/hiring/AdmissionForm.tsx:42:        .from("teams")
src/components/hiring/AdmissionForm.tsx:57:        .from("team_members")
src/components/hiring/AdmissionForm.tsx:58:        .select("leader:profiles!team_members_leader_id_fkey(id, full_name)")
src/hooks/useTeams.ts:6:const TEAM_QUERY_KEYS = [["my-team-members"], ["teams"], ["team_members"]] as const;
src/hooks/useTeams.ts:90:      .from("teams")
src/hooks/useTeams.ts:107:      .from("team_members")
src/hooks/useTeams.ts:144:    const { error } = await supabase.from("teams").insert({
src/hooks/useTeams.ts:161:      .from("teams")
src/hooks/useTeams.ts:176:    const { error } = await supabase.from("teams").delete().eq("id", id);
src/hooks/useTeams.ts:192:        .from("teams")
src/hooks/useTeams.ts:198:      // Espelha em team_members para manter a RLS de team_members funcionando
src/hooks/useTeams.ts:201:        .from("team_members")
src/hooks/useTeams.ts:226:        .from("teams")
src/hooks/useTeams.ts:233:      const { error } = await supabase.from("team_members").insert({
src/hooks/useTeams.ts:257:      .from("team_members")
src/hooks/useTeams.ts:273:      .from("team_members")
src/hooks/useTeams.ts:289:      .from("team_members")
src/hooks/useCostBreakdown.ts:93:        .from('teams')
src/hooks/useCostBreakdown.ts:100:        supabase.from('team_members').select('user_id, team_id, cost'),
src/lib/hiring/rlsScope.ts:33:        // team_members has leader_id; teams has company_id. Join via teams.
src/lib/hiring/rlsScope.ts:35:          .from("team_members")
src/pages/GestorDashboard.tsx:95:        .from("team_members")
src/pages/OneOnOnes.tsx:100:          .from("team_members")
src/pages/CollaboratorProfile.tsx:51:        .from("team_members")
src/pages/CollaboratorProfile.tsx:84:        .from("team_members")
src/pages/Profile.tsx:70:        .from("team_members")
src/pages/Profile.tsx:77:          ? supabase.from("teams").select("id, name, company:companies(id, name)").eq("id", member.team_id).maybeSingle()
src/pages/MyTeam.tsx:29:        .from("team_members")
src/pages/MyTeam.tsx:59:      const { data } = await supabase.from("teams").select("id, name").in("id", teamIds);
src/pages/DevelopmentKanban.tsx:85:          await supabase.from("team_members").select("user_id").eq("leader_id", user.id)
```

**Confirmado: OPTION A em vigor.** O plano original imaginava que apenas `useCostBreakdown.ts` fosse o consumidor — a auditoria revelou ~10 arquivos. **`DROP TABLE` permanece COMENTADO** na migração G. Esses leitores serão migrados em um plano post-Phase-4.

### Audit #3 — `allowed_companies` em supabase/migrations/

Histórico (presente em 4 migrações anteriores, todas pré-G):
- `20260416193100_hiring_rls_policies.sql` (origem do helper + 8 hiring policies — todas reescritas pelo C)
- `20260416193300_hiring_storage_bucket.sql` (2 storage policies — **NÃO reescritas pelo C; recovery feito agora**)
- `20260422150000_candidate_conversations.sql` (1 policy — reescrita pelo C)
- `20260427120200_c_socio_memberships_rls_rewrite_and_backfill.sql` (rewrite migration C)

### Achado crítico identificado pela auditoria

**As policies `hiring_bucket:select` e `hiring_bucket:insert` em `storage.objects` ainda referenciavam `public.allowed_companies(auth.uid())`.** Migration C reescreveu somente as policies em `public.*`. Sem fechar esse gap, o `DROP FUNCTION public.allowed_companies` falharia com `cannot drop function ... because other objects depend on it` (ou — com CASCADE — apagaria as policies, perdendo a RLS do bucket).

**Resolução (Rule 1 — bug fix dentro da migration G):** Migration G começa com **Step 0** que reescreve as 2 storage policies para `visible_companies` (mesmo padrão do Migration C section 4.x).

## Migration SQL Structure (final)

`supabase/migrations/20260507120000_g_contract_drop_legacy.sql`:

| Step | Conteúdo |
|------|----------|
| 0 | DROP/CREATE `hiring_bucket:select` + `hiring_bucket:insert` em `storage.objects` usando `visible_companies` |
| Sanity 0 | RAISE EXCEPTION se ainda houver pg_policies referenciando `allowed_companies` |
| 1 | `DROP FUNCTION IF EXISTS public.allowed_companies(uuid)` + `allowed_companies_for_user(uuid)` |
| Sanity 1 | RAISE EXCEPTION se as funções ainda existirem em `pg_proc` |
| 2 | **REMOVED** (Rule 1 deviation) — comentário documenta a remoção |
| 3 | RAISE EXCEPTION se `cron.job 'data_access_log_retention_cleanup'` não estiver agendada |
| 4 | DROP TABLE teams + team_members **COMENTADO** (Option A — deferred) |
| 5 | Smoke-test `PERFORM public.visible_companies(uid)` |
| Comentário final | `COMMENT ON FUNCTION visible_companies` documentando substituição |

Total de blocos `RAISE EXCEPTION`: 3 (sanity 0, sanity 1, cron). Originais 5 caíram para 3 com a remoção do Step 2 (que tinha 2 guards).

## pgTAP Test 012

`supabase/tests/012-data-access-log-cron.sql` — `plan(2)`:

1. `isnt_empty` — pg_cron job `data_access_log_retention_cleanup` está agendado
2. `ok` — job está `active = true`

Read-only; não exercita paths destrutivos.

## supabase db push output

Primeira tentativa (com Step 2 ainda presente) falhou:

```
NOTICE (00000): function public.allowed_companies_for_user(uuid) does not exist, skipping
ERROR: column "company_id" does not exist (SQLSTATE 42703)
At statement: 8
-- Step 2 — SET NOT NULL on company_id where still missing
```

**Rollback automático** (Postgres atomic transaction) — DDL não foi parcialmente aplicado. Step 2 foi removido inline (Rule 1 deviation). Segunda tentativa:

```
Initialising login role...
Connecting to remote database...
Applying migration 20260507120000_g_contract_drop_legacy.sql...
NOTICE (00000): function public.allowed_companies_for_user(uuid) does not exist, skipping
Finished supabase db push.
```

Sucesso. `allowed_companies(uuid)` dropado; storage policies reescritas; sanity guards passaram; cron job confirmado scheduled+active no remoto (sanity 3 não falhou).

## Types.ts regen

```
$ npx --yes supabase gen types typescript --linked > src/integrations/supabase/types.ts
$ grep -c "allowed_companies" src/integrations/supabase/types.ts
0
$ wc -l src/integrations/supabase/types.ts
3332
$ git diff --stat HEAD~1 src/integrations/supabase/types.ts
 src/integrations/supabase/types.ts | 1 -
 1 file changed, 1 deletion(-)
```

Diff é exatamente 1 linha (a entrada `allowed_companies` em Functions). Nenhum outro símbolo afetado.

## npm run build

**Status:** FAIL — pré-existente, NÃO regrediu com Migration G.

```
src/components/ClimateAnswerDialog.tsx (9:49): "useUserResponseIds" is not exported by "src/hooks/useClimateSurveys.ts"
```

Verificação de pré-existência: `git stash` (preservou regen + migration) → `git checkout HEAD -- src/integrations/supabase/types.ts` (restaurou types pré-regen) → `npm run build` → MESMO erro. Confirmado: erro existia antes do Migration G.

Documentado em `.planning/phases/04-dashboards-quality-polish/deferred-items.md` (já listado lá desde Plan 04-01; agora reforçado com a verificação adicional do Plan 04-08).

**Phase 4 contribution from Plan 04-08:** Zero TS errors novos. types.ts diff foi 1 linha (remoção de `allowed_companies`).

## Codebase docs diff

| Arquivo | Mudança |
|---------|---------|
| `.planning/codebase/ARCHITECTURE.md` | Adicionada seção "Scope Helpers (post-Migration G)" + "Migration Ledger" com entradas C e G |
| `.planning/codebase/CONCERNS.md` | Adicionada seção "Resolved Concerns (Phase 4 — Migration G)" + "Outstanding Concerns" com 2 itens (teams readers + rlsScope.ts comment stale) |
| `.planning/codebase/CONVENTIONS.md` | Adicionada seção "DB scope helpers (post-Migration G)" com pattern para policies/RPCs e lista de helpers que NÃO devem ser usados |

## Outstanding follow-up (próximas iterações)

1. **Migrar useCostBreakdown + outros 9 leitores de teams/team_members para org_units** (BLOQUEANTE para flip de DROP TABLE em Migration G follow-up). Requer também uma fonte de custo equivalente a `team_members.cost` (ex: `member_costs` table ou `profiles.salary_cents`).
2. **Atualizar comentário stale em `src/lib/hiring/rlsScope.ts:5`** (estética; não funcional).
3. **Confirmação:** Migration G é a ÚLTIMA irreversível do roadmap. Não há outras contract phases planejadas.

## Acceptance Criteria — All Tasks

### Task 1
- [x] Migration SQL existe
- [x] `DROP FUNCTION IF EXISTS public.allowed_companies` ≥ 1 (achado: 2)
- [x] DROP TABLE teams|team_members count == 0 (commented out)
- [x] BLOCKED by|DEFERRED ≥ 1 (achado: 2)
- [x] pgTAP 012 existe; `data_access_log_retention_cleanup` count ≥ 2 (achado: 2)
- [x] `select plan(2)` count == 1
- [x] **P4-V11**: audit grep #2 sem filtro de useCostBreakdown; output verbatim documentado acima

### Task 2 (checkpoint)
- [x] Owner autorizou explicitamente o gate temporal (mensagem do orchestrator)
- [x] Auditoria não surfaceou blocker técnico real ANTES do push (storage gap foi resolvido inline; teams readers cobertos por Option A)
- [x] Schema snapshot via `supabase db dump` falhou (Docker Desktop ausente); rollback path = PITR (documentado)

### Task 3
- [x] `npx supabase db push --linked --include-all` exits 0 na 2ª tentativa
- [x] `grep -c "allowed_companies" src/integrations/supabase/types.ts` returns 0
- [x] `wc -l < src/integrations/supabase/types.ts` > 3000 (3332)
- [x] `npm run build` errors são pré-existentes (verificado via stash diff); Phase 4 contribution = 0 novos
- [x] `grep -c "Migration G|allowed_companies dropped|2026-05-07" .planning/codebase/ARCHITECTURE.md` ≥ 1 (achado: 4)
- [x] `grep -c "Migration G|allowed_companies|teams.*deferred" .planning/codebase/CONCERNS.md` ≥ 1 (achado: 7)
- [x] `grep "allowed_companies" .planning/codebase/CONVENTIONS.md` aparece apenas em contexto histórico/dropado (3 ocorrências, todas em "DB scope helpers (post-Migration G)" section: 1 mencionando substituição, 2 em "Não usar")
- [x] **NÃO rodado:** `supabase test db --linked` para 002+011+012 (Docker Desktop ausente; tests rodam contra database local). pgTAP 012 será exercitado pela próxima execução de CI ou pelo owner em ambiente local. Sanity guard 3 da própria migração já validou cron job em produção via RAISE EXCEPTION-or-pass.

## Status

- [x] **Task 1**: COMPLETE (commit ea54f8e)
- [x] **Task 2**: COMPLETE — checkpoint gate honrado pela autorização explícita do owner; auditoria não surfaceou blocker irrecuperável (storage gap fixed inline; Step 2 schema mismatch fixed inline)
- [x] **Task 3**: COMPLETE (commit pendente)

## Threat Flags

Nenhum threat flag novo. Migration G mitigou os threats T-04-08-01 (irreversible drop com hidden caller — auditoria + sanity guards funcionaram), T-04-08-02 (DoS por NOT NULL em rows orphan — eliminado pela remoção do Step 2; o subset de tabelas que recebeu NOT NULL em PRE.3 já tinha rodado anteriormente sem incidentes), T-04-08-03 (retention silently disabled — sanity 3 verificou job ativo), T-04-08-04 (RLS coverage perdida — storage policies reescritas pré-DROP), T-04-08-05 (teams drop com active reader — drop COMENTADO).

## Self-Check

- [x] `supabase/migrations/20260507120000_g_contract_drop_legacy.sql` existe (FOUND)
- [x] `supabase/tests/012-data-access-log-cron.sql` existe (FOUND)
- [x] Commit ea54f8e existe (Task 1)
- [x] `grep allowed_companies` em types.ts retorna 0 (FOUND)
- [x] Migration G aplicada no remoto (FOUND — confirmado por "Finished supabase db push" + sanity guards passing)
- [x] Codebase docs (ARCHITECTURE/CONCERNS/CONVENTIONS) atualizados (FOUND — verificado via grep)

## Self-Check: PASSED
