---
phase: 04-dashboards-quality-polish
plan: 08
subsystem: migration-g-contract
tags: [migration-g, contract, irreversible, blocking, phase-4]
status: in-progress
dependency_graph:
  requires:
    - 04-07 (critical-flow-tests, pgTAP 011 verde)
    - Phases 1-3 estáveis em produção
  provides:
    - allowed_companies* helpers REMOVIDOS
    - applications.company_id NOT NULL
    - candidates.company_id NOT NULL
    - storage.objects hiring_bucket policies usando visible_companies
    - pg_cron retention job validado
  affects:
    - storage.objects (rewrite hiring_bucket:select e :insert policies)
    - public.applications (NOT NULL constraint)
    - public.candidates (NOT NULL constraint)
    - public.allowed_companies (DROPPED)
    - public.allowed_companies_for_user (DROPPED se existir)
tech-stack:
  added: []
  patterns:
    - "Storage policy rewrite (recovery do gap deixado pelo Migration C)"
    - "Sanity-guard RAISE EXCEPTION no padrão Migration PRE.3"
    - "DROP TABLE teams comentado (Option A)"
key-files:
  created:
    - supabase/migrations/20260507120000_g_contract_drop_legacy.sql
    - supabase/tests/012-data-access-log-cron.sql
  modified: []
decisions:
  - "Recovery do gap do Migration C: as 2 storage policies hiring_bucket:select/:insert ainda referenciavam allowed_companies. A migração G as reescreve para visible_companies ANTES do DROP FUNCTION (Step 0)."
  - "OPTION A em vigor: DROP TABLE teams permanece COMENTADO. Auditoria revelou ~10 consumidores ativos em src/ — não só useCostBreakdown como o plano antecipava."
metrics:
  started: 2026-04-28T20:00:00Z
  completed: TBD
  duration: TBD
---

# Phase 04 Plan 08: Migration G — Contract Drop Legacy

[Status: IN PROGRESS — Task 1 done, awaiting checkpoint Task 2 + push Task 3]

Plan 04-08 is the final irreversible migration of the project. After 1+ week of Phases 1-3 stability in produção and the owner's explicit approval, drops `allowed_companies` legacy helpers, sets NOT NULL on `applications.company_id` + `candidates.company_id`, defers `DROP TABLE teams` (Option A — many readers still active), and verifies pg_cron retention job is scheduled.

## Pre-Migration Audit (Task 1)

### Audit #1 — `allowed_companies` em src/ tests/

```
src/integrations/supabase/types.ts:2944:      allowed_companies: { Args: { _profile_id: string }; Returns: string[] }
src/lib/hiring/rlsScope.ts:5:// Mirrors the DB `allowed_companies(profile_id)` helper — the list of company
```

**Análise:** `types.ts` é auto-gen (somerá após `gen types`). `rlsScope.ts` linha 5 contém apenas COMENTÁRIO stale; o código ATIVO em `rlsScope.ts` chama `supabase.from("companies")` e `supabase.from("team_members")` — não chama o helper DB. Não bloqueia o drop.

### Audit #2 — `teams` / `team_members` em src/ tests/ (UNFILTERED — P4-V11)

Output verbatim do comando: `grep -rn '"teams"\|public\.teams\|from(.teams.\|team_members' src/ tests/ 2>&1 | grep -v "supabase/types.ts"`

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

**Confirmado: OPTION A em vigor.** O plano original imaginava que apenas `useCostBreakdown.ts` fosse o consumidor — a auditoria revelou ~10 arquivos. Todos esses leitores precisam ser migrados a `org_units` + nova fonte de custo ANTES que `DROP TABLE teams` possa ser executado em uma futura migration. **`DROP TABLE` permanece COMENTADO** na migração G.

### Audit #3 — `allowed_companies` em supabase/migrations/

Histórico (presente em 5 migrações anteriores ao Migration G — esperado):
- `20260416193100_hiring_rls_policies.sql` (origem do helper + 8 policies — todas reescritas pelo C)
- `20260416193300_hiring_storage_bucket.sql` (2 storage policies — **NÃO reescritas pelo C; recovery feito agora**)
- `20260422150000_candidate_conversations.sql` (1 policy — reescrita pelo C)
- `20260427120200_c_socio_memberships_rls_rewrite_and_backfill.sql` (rewrite migration)

### Achado crítico identificado pela auditoria (recovery)

**As policies `hiring_bucket:select` e `hiring_bucket:insert` em `storage.objects` ainda referenciavam `public.allowed_companies(auth.uid())`.** Migration C reescreveu somente as policies em `public.*`. Sem fechar esse gap, o `DROP FUNCTION public.allowed_companies` falharia com `cannot drop function ... because other objects depend on it` (ou — se rodado com CASCADE — apagaria as policies, perdendo a RLS do bucket).

**Resolução (Rule 1 — bug fix dentro da migration G):** Migration G começa com **Step 0** que reescreve as 2 storage policies para `visible_companies` (mesmo padrão do Migration C section 4.x). Em seguida, Step 1 (`DROP FUNCTION`) tem caminho livre.

## Migration SQL Structure (Task 1)

`supabase/migrations/20260507120000_g_contract_drop_legacy.sql`:

| Step | Conteúdo |
|------|----------|
| 0 | DROP/CREATE `hiring_bucket:select` + `hiring_bucket:insert` em `storage.objects` usando `visible_companies` |
| Sanity 0 | RAISE EXCEPTION se ainda houver pg_policies referenciando `allowed_companies` |
| 1 | `DROP FUNCTION IF EXISTS public.allowed_companies(uuid)` + `allowed_companies_for_user(uuid)` |
| Sanity 1 | RAISE EXCEPTION se as funções ainda existirem em `pg_proc` |
| 2 | Pre-NOT-NULL guard (RAISE EXCEPTION se houver NULLs); ALTER `applications.company_id SET NOT NULL`; ALTER `candidates.company_id SET NOT NULL` |
| Sanity 2 | RAISE EXCEPTION post-NOT-NULL (defense-in-depth) |
| 3 | RAISE EXCEPTION se `cron.job 'data_access_log_retention_cleanup'` não estiver agendada |
| 4 | DROP TABLE teams + team_members **COMENTADO** (Option A — deferred) |
| 5 | Smoke-test `PERFORM public.visible_companies(uid)` para garantir helper sobrevive |
| Comentário final | `COMMENT ON FUNCTION visible_companies` documentando substituição |

Total de blocos `RAISE EXCEPTION`: 5 (sanity 0, sanity 1, pre-NOT-NULL, post-NOT-NULL, cron).

## pgTAP Test 012 (Task 1)

`supabase/tests/012-data-access-log-cron.sql` — `plan(2)`:

1. `isnt_empty` — pg_cron job `data_access_log_retention_cleanup` está agendado
2. `ok` — job está `active = true`

Read-only; não exercita paths destrutivos.

## Acceptance Criteria — Task 1

- [x] `supabase/migrations/20260507120000_g_contract_drop_legacy.sql` existe
- [x] `DROP FUNCTION IF EXISTS public.allowed_companies` ≥ 1 (achado: 2)
- [x] `ALTER COLUMN company_id SET NOT NULL` ≥ 2 (achado: 2)
- [x] `RAISE EXCEPTION` ≥ 3 (achado: 5)
- [x] Active `DROP TABLE teams|team_members` count == 0 (commented out)
- [x] `BLOCKED by|DEFERRED` ≥ 1 (achado: 2)
- [x] `supabase/tests/012-data-access-log-cron.sql` existe
- [x] `data_access_log_retention_cleanup` count em test ≥ 2 (achado: 2)
- [x] `select plan(2)` count == 1
- [x] **P4-V11 — audit grep #2 sem filtro de `useCostBreakdown`**, output verbatim acima incluindo a linha `useCostBreakdown.ts`

## Status

- [x] **Task 1 — Pre-migration audit + Migration G SQL + pgTAP 012**: COMPLETE
- [ ] **Task 2 — Operator go/no-go checkpoint + db push**: PENDING (next step)
- [ ] **Task 3 — Apply schema push + regen types + update codebase docs**: BLOCKED on Task 2

## Self-Check

Pendente — será atualizada após Task 3.
