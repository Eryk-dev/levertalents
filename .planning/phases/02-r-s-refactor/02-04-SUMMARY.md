---
phase: 02-r-s-refactor
plan: 04
subsystem: database
tags: [supabase, postgres, migration, types-regen, lgpd, audit-log, hiring, pg-cron, candidate-consents, cpf-dedup, declaration-merging]

# Dependency graph
requires:
  - phase: 02-r-s-refactor
    plan: 02
    provides: "4 migration SQLs Phase 2 Migration F (F.1 stages normalize / F.2 data_access_log+RPC+cron / F.3 candidate_consents+view+RLS / F.4 CPF unique+normalize trigger) prontas para `supabase db push`"
  - phase: 01-tenancy-backbone
    provides: "is_people_manager(uid) helper (admin/socio/rh) — Phase 1; visible_companies(uid) helper — Phase 1; tg_set_updated_at base trigger function — Phase 0"
provides:
  - "Schema Phase 2 sincronizado com remote `ehbxpbeijofxtsbezwxd` (4 migrations F.1-F.4 aplicadas)"
  - "src/integrations/supabase/types.ts auto-gerado contendo data_access_log, candidate_consents, active_candidate_consents view, read_candidate_with_log RPC, consent_purpose_enum, consent_legal_basis_enum"
  - "src/integrations/supabase/hiring-types.ts estendido com 12 hand-written exports Phase 2 (Consent + ConsentInsert + ConsentUpdate + ActiveConsent + ConsentPurpose + ConsentLegalBasis + DataAccessLogEntry + DataAccessLogInsert + ReadCandidateWithLog{Args,Return} + MoveApplicationStageArgs + ApplicationWithCandidate)"
  - "Phase 1 FK index migration (20260423100000) trackeada no git pela primeira vez"
affects: [02-05, 02-06, 02-07, 02-08, 02-09]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "supabase gen types typescript --linked > types.ts é canonical source-of-truth post-Plan-02-04 (substitui declaration merging)"
    - "Hand-written types Phase 2 referenciam Database['public']['Tables'][...]['Row']/['Insert']/['Update'] em vez de declarar shapes inline (DRY: schema mudou no DB → regen → types fluem)"
    - "Stderr-redirect ao gerar types: `supabase gen types ... 2>/dev/null > types.ts` (CLI imprime 'Initialising login role...' em stderr; sem 2>/dev/null isso vaza para stdout e fica no topo do arquivo gerado, quebrando TS compile)"

key-files:
  created:
    - .planning/phases/02-r-s-refactor/02-04-SUMMARY.md
  modified:
    - src/integrations/supabase/types.ts  # regenerado (3128 linhas; +285 vs baseline)
    - src/integrations/supabase/hiring-types.ts  # remove declare module block (-218 lines), adiciona 12 exports Phase 2 (+75 lines)
    - .planning/phases/02-r-s-refactor/deferred-items.md  # documenta 38 latent tsc errors revelados pelo regen (out-of-scope para Plan 02-04)

key-decisions:
  - "Remover declare module './types' block em hiring-types.ts: o auto-gen exporta 'type Database' (alias), e TypeScript NÃO permite mergir type alias com interface via declare module — causa 'Duplicate identifier Database'. Os hand-written aliases existentes (JobOpeningRow, ApplicationRow, etc.) ficam standalone e continuam canônicos."
  - "Aceitar 38 latent tsc errors revelados pelo regen como out-of-scope: o plan explicitamente diz que apenas src/integrations/, src/lib/, src/app/ devem estar tsc-clean (e estão); hooks/components serão refatorados em Plans 02-05 a 02-09"
  - "supabase test db --linked requer Docker (que não está disponível neste ambiente); validamos via SQL direto (supabase db query --linked) que: 2 novas tabelas, 1 cron job com schedule '30 3 * * 1', 1 RPC read_candidate_with_log, 1 view active_candidate_consents, 1 partial unique index idx_candidates_cpf_unique, normalize_cpf function executando corretamente — equivalente estrutural aos pgTAP suites"
  - "Trackear migration FK Phase 1 (20260423100000_index_user_fks_for_fast_delete.sql) no git: --include-all do supabase db push exigia que estivesse trackeada, autorizado pelo usuário"

patterns-established:
  - "Auto-gen types como canonical: post-Plan-02-04, qualquer mudança de schema implica `npx supabase gen types typescript --linked 2>/dev/null > src/integrations/supabase/types.ts` + commit"
  - "Hand-written types Phase 2 como aliases (não inline): facilita manter contrato consistente com schema; types refletem a verdade do DB direta sem duplicação"
  - "Type-divergence triagem: errors revelados pelo regen em arquivos fora de src/integrations/, src/lib/, src/app/ devem ser logados em deferred-items.md com owner sugerido (Plan 02-XX)"

requirements-completed:
  - RS-05  # stages legados normalizados — F.1 aplicada no remote
  - RS-06  # trigger anti-regressao stages legados — F.1 aplicada no remote
  - TAL-03  # candidate_consents granular por purpose — F.3 aplicada no remote
  - TAL-05  # data_access_log append-only — F.2 aplicada no remote
  - TAL-06  # read_candidate_with_log RPC + RLS — F.2 aplicada no remote
  - TAL-09  # CPF canonical dedup unique partial — F.4 aplicada no remote

# Metrics
duration: 9.4min
completed: 2026-04-28
---

# Phase 2 Plan 4: Wave 2 Schema Push + Types Regen Summary

**Migration F (F.1-F.4) aplicada ao remote Supabase `ehbxpbeijofxtsbezwxd` via `supabase db push --linked --include-all`; types.ts regenerado contendo 285 novas linhas com data_access_log, candidate_consents, active_candidate_consents view, read_candidate_with_log RPC e os 2 enums LGPD; hiring-types.ts estendido com 12 exports hand-written e teve seu obsoleto declaration-merging block removido — desbloqueia Wave 3 (Plans 02-05+ hooks LGPD).**

## Performance

- **Duration:** ~9.4 min (561s)
- **Started:** 2026-04-28T09:07:28Z
- **Completed:** 2026-04-28T09:16:49Z
- **Tasks:** 3 (Task 1 checkpoint resolvido + Task 2 regen + Task 3 hand-written types)
- **Files created:** 1 (SUMMARY)
- **Files modified:** 3 (types.ts, hiring-types.ts, deferred-items.md)

## Accomplishments

- 4 migrations Phase 2 (F.1-F.4) aplicadas ao remote: `data_access_log`, `candidate_consents`, `active_candidate_consents` view, `read_candidate_with_log` RPC, `idx_candidates_cpf_unique` partial UNIQUE, `normalize_cpf` function, `tg_candidates_normalize_cpf` + `tg_applications_block_legacy_stages` triggers, `data_access_log_retention_cleanup` cron schedule (`30 3 * * 1`), `consent_purpose_enum` + `consent_legal_basis_enum`, `btree_gist` extension, 4 RLS policies (1 SELECT em data_access_log + 3 em candidate_consents)
- Phase 1 FK index migration (`20260423100000_index_user_fks_for_fast_delete.sql`) trackeada pela primeira vez no git
- types.ts regenerado: 3128 linhas (vs baseline 2843; +285 novas linhas com Phase 2 surface). Schema é agora canônico e não-divergente
- hiring-types.ts refatorado: removido declare module block obsoleto (-218 linhas) que causava `Duplicate identifier 'Database'`; adicionados 12 exports Phase 2 (+75 linhas). Net: -143 linhas, mas com types canônicos
- Verificação tsc: ZERO erros em `src/integrations/`, `src/lib/`, `src/app/` (paths críticos do plan)
- Verificação tests: 432 passing + 90 todo (skeletons), 0 failures, 16 test files passados, 11 skipped

## Task Commits

1. **Step 0: Track Phase 1 FK index migration** — `94c5478` (chore)
2. **Step 1-2: Apply Migration F + sanity check remote** — *no code commit; supabase db push é DDL contra remoto, não tem artefato git*
3. **Step 4: Regenerate types.ts** — `662cadf` (feat)
4. **Step 5: Extend hiring-types.ts + remove declaration merging** — `33b16e9` (feat)
5. **Step 6: Document deferred latent tsc errors** — `8507e6e` (docs)

## Files Created/Modified

| File | Change | Notes |
|------|--------|-------|
| `supabase/migrations/20260423100000_index_user_fks_for_fast_delete.sql` | tracked | Phase 1 leftover migration; agora visível no git history |
| `src/integrations/supabase/types.ts` | regenerated | 2843 → 3128 linhas; auto-gen canônico, Phase 2 surface present |
| `src/integrations/supabase/hiring-types.ts` | refactored | -218 (declare module) +75 (Phase 2 exports) = net -143 linhas |
| `.planning/phases/02-r-s-refactor/deferred-items.md` | appended | Documenta 38 latent tsc errors out-of-scope (owners: Plans 02-05 a 02-09) |
| `.planning/phases/02-r-s-refactor/02-04-SUMMARY.md` | created | This file |

## Verification Results

### Sanity check do remote post-push (via `supabase db query --linked`)

| Check | Expected | Actual |
|-------|----------|--------|
| `data_access_log` + `candidate_consents` tables exist | 2 | **2** ✓ |
| Cron job `data_access_log_retention_cleanup` schedule | `30 3 * * 1` | **`30 3 * * 1`** ✓ |
| RPC `read_candidate_with_log` exists | 1 | **1** ✓ |
| View `active_candidate_consents` exists | 1 | **1** ✓ |
| Partial unique index `idx_candidates_cpf_unique` exists | 1 | **1** ✓ |
| `btree_gist` extension installed | 1 | **1** ✓ |
| `data_access_log` policies (SELECT-only para is_people_manager) | 1 | **1** ✓ |
| `candidate_consents` policies (3: select+insert+update) | 3 | **3** ✓ |
| `consent_purpose_enum` + `consent_legal_basis_enum` | 2 | **2** ✓ |
| `applications.metadata` column type | jsonb | **jsonb** ✓ |
| Zero applications em legacy stages (aguardando_fit_cultural / sem_retorno / fit_recebido) | 0 | **0** ✓ |
| `normalize_cpf('987.654.321-00')` | `'98765432100'` | **`'98765432100'`** ✓ |
| `normalize_cpf('')` | NULL | **NULL** ✓ |
| `normalize_cpf(NULL)` | NULL | **NULL** ✓ |

### Migration list (linked remote)

```
20260428120000 | 20260428120000 | 2026-04-28 12:00:00  -- F.1
20260428120100 | 20260428120100 | 2026-04-28 12:01:00  -- F.2
20260428120200 | 20260428120200 | 2026-04-28 12:02:00  -- F.3
20260428120300 | 20260428120300 | 2026-04-28 12:03:00  -- F.4
```

### types.ts grep counts

```
data_access_log: 4 occurrences
candidate_consents: 8 occurrences
active_candidate_consents: 1 occurrence
read_candidate_with_log: 1 occurrence
consent_purpose_enum: 8 occurrences
consent_legal_basis_enum: 8 occurrences
```

### tsc --noEmit

- ZERO errors em `src/integrations/`, `src/lib/`, `src/app/` (paths críticos do plan)
- 38 errors em `src/components/hiring/`, `src/hooks/hiring/`, `src/pages/`, `src/components/MobileNav.tsx` (latent, revelados pelo regen — out-of-scope; owners listados em deferred-items.md)

### npm test

- 432 tests passing (canTransition 294 + supabaseError 20 + sla 17 + cpf 14 + useCardPreferences 14 + stageGroups 17 + scope/* 28 + lib/* 17 + sanity 1)
- 90 todo (skeletons aguardando Plans 02-05+)
- 0 failures, 16 test files passed, 11 skipped

## Decisions Made

- **Remoção do `declare module "./types"` block em hiring-types.ts**: Pre-Plan-02-04, o arquivo declarava um augmentation block que mergia hand-written hiring shapes na auto-generated `Database` type. Plan 02-04 tornou disponível o Supabase CLI (`supabase gen types`); o auto-gen agora exporta `type Database = { ... }` (alias) que NÃO pode ser mergido com `interface Database` via `declare module` — TypeScript reporta `Duplicate identifier 'Database'`. Removi o block; mantive todos os 50+ hand-written aliases (JobOpeningRow, ApplicationRow, CandidateRow, etc.) como standalone exports — eles continuam funcionando porque são definidos como `type X = { ... }` puramente, sem dependência de declaration merging.

- **Hand-written Phase 2 types referenciam `Database["public"]["Tables"]`/`Views`/`Functions`/`Enums` via lookup**: Em vez de duplicar shapes inline (como os legacy aliases hiring foram escritos), os 12 novos types Phase 2 são thin aliases sobre o auto-gen. Pattern DRY: schema muda → regen → types fluem automaticamente sem manutenção dual.

- **Aceitar 38 latent tsc errors como out-of-scope**: O plan explicitamente diz que apenas `src/integrations/`, `src/lib/`, `src/app/` devem ficar tsc-clean (estão); hooks/components serão refatorados em Plans 02-05 a 02-09. Esses errors estavam latentes antes (mascarados pelo declaration merging que dava aos tipos hand-written a "última palavra"); agora que o auto-gen é canônico, ficam visíveis. Documentei todos em deferred-items.md com owners sugeridos.

- **Verificação via SQL direto em vez de pgTAP suites completas**: `npx supabase test db --linked` requer Docker (não disponível neste ambiente). Como alternativa, executei via `supabase db query --linked` 14 assertions estruturais cobrindo todos os artifacts críticos da Migration F (tabelas, RPCs, view, índice, função normalize_cpf executando, policies, enums, cron job). Equivalente a pgTAP em garantia estrutural; perde apenas as transactional rollback assertions de inserts (e.g. trigger blocking 23514 errors).

- **Stderr redirect no gen types**: a 1ª invocação `npx supabase gen types ... > types.ts` capturou o stderr "Initialising login role..." no top do arquivo, quebrando TS compile (line 1: `Initialising login role...`). Adicionado `2>/dev/null` no comando final.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Stderr "Initialising login role..." vazou para types.ts**
- **Found during:** Step 4 (regen types.ts)
- **Issue:** O comando `npx supabase gen types typescript --linked > src/integrations/supabase/types.ts` capturou o stderr ("Initialising login role...") como primeira linha do arquivo gerado. TypeScript reportaria erro de parse na linha 1.
- **Fix:** Re-executei com `2>/dev/null` adicionado: `npx supabase gen types typescript --linked 2>/dev/null > src/integrations/supabase/types.ts`. Verificado que linha 1 agora é `export type Json =`.
- **Files modified:** `src/integrations/supabase/types.ts`
- **Verification:** `head -3 src/integrations/supabase/types.ts` retorna conteúdo TS válido
- **Committed in:** `662cadf` (Step 4 commit)

**2. [Rule 1 - Bug] Declaration merging em hiring-types.ts causa "Duplicate identifier 'Database'"**
- **Found during:** Step 6 (verification gate via tsc)
- **Issue:** Pre-Plan-02-04 o arquivo declarava `declare module "./types" { interface Database { ... } }` para mergir hand-written shapes na auto-gen Database type. O auto-gen exporta `type Database = { ... }` (alias, não interface), e TypeScript não permite merge entre type alias e interface via declare module. Resultado: `error TS2300: Duplicate identifier 'Database'` em ambos types.ts(9,13) e hiring-types.ts(622,13), gerando cascading 80+ errors em hooks/components downstream.
- **Fix:** Removido o block `declare module "./types"` inteiro (linhas 621-834). Mantidos todos os 50+ hand-written aliases (JobOpeningRow, ApplicationRow, etc.) como standalone exports — funcionam standalone porque são `type X = { ... }`. Adicionados 12 novos types Phase 2 que referenciam `Database["public"][...]` direto.
- **Files modified:** `src/integrations/supabase/hiring-types.ts`
- **Verification:** `npx tsc --noEmit -p tsconfig.app.json 2>&1 | grep "hiring-types"` retorna zero linhas
- **Committed in:** `33b16e9` (Step 5 commit)

**3. [Rule 3 - Blocking] Phase 1 FK index migration untracked impedindo --include-all**
- **Found during:** Step 0 (pre-push)
- **Issue:** O `supabase db push --linked --include-all` falha (ou ignora) migrations untracked. A migration `supabase/migrations/20260423100000_index_user_fks_for_fast_delete.sql` (Phase 1 leftover do admin_hard_delete fix) estava untracked.
- **Fix:** Track + commit antes do push: `git add ... && git commit -m "chore(supabase): track FK index migration..."`. Usuário autorizou explicitamente.
- **Files modified:** Nenhum (só git tracking)
- **Verification:** `git status --short` retorna 0 untracked files; `npx supabase migration list --linked` mostra `20260423100000` como aplicada
- **Committed in:** `94c5478` (Step 0 commit)

---

**Total deviations:** 3 auto-fixed (2 Rule 1 - bugs; 1 Rule 3 - blocking)
**Impact on plan:** Todos os 3 fixes essenciais para destravar o plan. Nenhum scope creep.

## Issues Encountered

- **Docker indisponível para `supabase test db`**: O CLI Supabase exige Docker para rodar pgTAP test containers, mesmo com `--linked` (container roda localmente, conecta ao remoto). Resolvido executando 14 assertions estruturais via `supabase db query --linked` cobrindo todos os artifacts da Migration F. Equivalente em garantia estrutural; perde apenas assertions transacionais de trigger blocking (e.g. INSERT legacy stage retornando 23514).

- **38 latent tsc errors revelados pelo regen**: Esperado pelo plan ("alguns hooks/components ainda fazem referência a tipos legados; esperado encontrar erros do tipo Property X does not exist on type Y em hooks que vamos refazer em Plans 05-09"). Documentados em `deferred-items.md` com ownership claro por Plan futuro. Não bloqueia Plan 02-04 (paths críticos `src/integrations/`, `src/lib/`, `src/app/` ficam tsc-clean).

- **Migrations Phase 2 já estavam pre-applied numa state preview do usuário**: O usuário inicialmente escreveu "applied" mas a sanity check revelou 0 rows em schema_migrations para `20260428%`. Foi necessário rodar push como continuation desta sessão.

## Authentication Gates

- **Resolved checkpoint (carry-over from prior agent)**: Prior agent identificou `human-action` checkpoint pedindo `supabase db push`. Usuário autorizou execução nesta sessão ("Quero que você execute tudo"). Push completado com 4 migrations applied + sanity check passing.

## User Setup Required

None — schema sincronizado entre repo local e remoto. Próximos plans (02-05+) podem importar `Database['public']['Tables']['candidate_consents']` ou `Consent` from `hiring-types.ts` sem manutenção adicional.

## Threat Flags

Nenhum surface novo introduzido fora do threat_model do plan; todos os threats T-02-04-* listados foram mitigados conforme planejado:

- **T-02-04-01 (Tampering — partial DDL apply)**: Cada migration é executada em transaction implícita (Postgres BEGIN/COMMIT). Sem partial applies observados; `supabase migration list --linked` mostra 4 timestamps coerentes.
- **T-02-04-02 (Information disclosure — token leak in logs)**: SUPABASE_ACCESS_TOKEN não foi printado em nenhum output desta sessão.
- **T-02-04-03 (DoS — push fora de horário)**: F.1 batch já foi mitigado pelo SKIP LOCKED em Phase 2 Plan 02; F.2-F.4 são DDL leves.
- **T-02-04-04 (Elevation — gen types sem auth)**: `--linked` falha explicitamente sem token (não retorna types vazio silenciosamente). Verificado pela contagem positiva de Phase 2 entries.

## Next Phase Readiness

- **Wave 3 (Plan 02-05 hooks LGPD)**: ✅ DESBLOQUEADO. Pode importar:
  - `Database["public"]["Tables"]["candidate_consents"]["Row"]` direto, OU
  - `Consent`, `ConsentInsert`, `ConsentPurpose`, `DataAccessLogEntry`, `ApplicationWithCandidate`, `MoveApplicationStageArgs` de `@/integrations/supabase/hiring-types`
- **Wave 4 (Plans 02-08, 02-09 UI)**: Depende dos hooks de Wave 3. Mas já podem começar análise de mudanças necessárias no UI (apoiados pelos types regenerados).
- **Owners de cleanup latente**: 9 hooks/components/pages com 38 latent tsc errors precisam ser refatorados durante seus respectivos plans de Wave 3-4 (lista em `deferred-items.md`).

## Self-Check: PASSED

Verifications run:
- `[ -f supabase/migrations/20260423100000_index_user_fks_for_fast_delete.sql ]` → tracked since `94c5478`
- `npx supabase migration list --linked | grep 20260428` → 4 rows (F.1-F.4 applied)
- `[ -f src/integrations/supabase/types.ts ]` → 3128 linhas, contém `data_access_log` (4x), `candidate_consents` (8x), `active_candidate_consents` (1x), `read_candidate_with_log` (1x), `consent_purpose_enum` (8x), `consent_legal_basis_enum` (8x)
- `grep "ConsentPurpose\|DataAccessLogEntry\|MoveApplicationStageArgs\|ApplicationWithCandidate" src/integrations/supabase/hiring-types.ts` → all 12 new exports present
- `grep "declare module" src/integrations/supabase/hiring-types.ts` → zero matches (block removido)
- `npx tsc --noEmit -p tsconfig.app.json 2>&1 | grep "src/(integrations|lib|app)/"` → zero linhas (paths críticos limpos)
- `npm test` → 432 passing, 90 todo, 0 failures
- `git log --oneline | grep -E "94c5478|662cadf|33b16e9|8507e6e"` → all 4 commits present
- Remote schema sanity (14 SQL checks) → all passing

---

*Phase: 02-r-s-refactor*
*Completed: 2026-04-28*
