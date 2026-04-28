---
phase: 02-r-s-refactor
plan: 02
subsystem: database
tags: [supabase, postgres, migration, rls, lgpd, audit-log, hiring, pg-cron, candidate-consents, cpf-dedup]

# Dependency graph
requires:
  - phase: 01-tenancy-backbone
    provides: "is_people_manager(uid) helper (admin/socio/rh) — Phase 1; visible_companies(uid) helper — Phase 1; tg_set_updated_at base trigger function — Phase 0"
  - phase: 02-r-s-refactor
    plan: 01
    provides: "5 pgTAP skeletons (006-010) com SELECT skip(N) — Plan 02-02 ativa removendo skip e implementando test bodies"
provides:
  - "4 migration SQLs Phase 2 Migration F (F.1 stages normalize / F.2 data_access_log+RPC+cron / F.3 candidate_consents+view+RLS / F.4 CPF unique+normalize trigger) prontas para `supabase db push` por Plan 02-04"
  - "5 pgTAP test files ativos (006-010) com 19 tests (5+4+4+4+2) prontos para validar a aplicacao da Migration F"
  - "Schema base para hooks Wave 2-4: tabela data_access_log, RPC read_candidate_with_log, view active_candidate_consents, partial UNIQUE em candidates.cpf"
affects: [02-03, 02-04, 02-05, 02-06, 02-07, 02-08, 02-09]

# Tech tracking
tech-stack:
  added:
    - "btree_gist Postgres extension (necessario para EXCLUDE constraint com WITH = em uuid/enum types — F.3)"
  patterns:
    - "DDL idempotente: CREATE TABLE IF NOT EXISTS + DROP POLICY IF EXISTS + CREATE OR REPLACE FUNCTION + DO $$ EXCEPTION WHEN duplicate_object THEN NULL para CREATE TYPE"
    - "Backfill batch UPDATE FOR UPDATE SKIP LOCKED + pg_sleep(0.05) por iteracao (mitiga lock contention em prod)"
    - "RPC SECURITY DEFINER + SET search_path = public + re-aplica RLS logica como caller (defense-in-depth contra RLS bypass)"
    - "Append-only audit log via tabela com RLS habilitado MAS sem policy INSERT — escrita apenas via RPC SECURITY DEFINER"
    - "EXCLUDE USING gist (col WITH =, col WITH =) WHERE (predicate) — substitui UNIQUE constraint condicional (Postgres pattern para 1-active-per-key)"
    - "Normalize-then-constrain: UPDATE batch normaliza dados + DO $$ valida zero duplicatas + RAISE EXCEPTION se houver, ENTAO CREATE UNIQUE INDEX"
    - "pg_cron unschedule via DO $$ IF EXISTS THEN PERFORM unschedule + EXCEPTION WHEN OTHERS antes de re-schedule (idempotente)"

key-files:
  created:
    - supabase/migrations/20260428120000_f1_normalize_legacy_application_stages.sql
    - supabase/migrations/20260428120100_f2_data_access_log_table.sql
    - supabase/migrations/20260428120200_f3_candidate_consents.sql
    - supabase/migrations/20260428120300_f4_cpf_canonical_dedup.sql
    - .planning/phases/02-r-s-refactor/02-02-SUMMARY.md
  modified:
    - supabase/tests/006-migration-f-stages.sql
    - supabase/tests/007-data-access-log.sql
    - supabase/tests/008-candidate-consents.sql
    - supabase/tests/009-cpf-unique.sql
    - supabase/tests/010-pg-cron-retention.sql

key-decisions:
  - "F.1 mapeia legacy stages para 'em_interesse' (defaultStage da Triagem em STAGE_GROUPS.ts), nao para 'fit_cultural'/'triagem' como o plan original sugeria — esses ultimos NAO existem no enum public.application_stage_enum (definido em 20260416193000_hiring_core_entities.sql:37-55)"
  - "F.2 backfill de candidate_access_log -> data_access_log usa cal.at (coluna real) em vez de cal.created_at (referencia incorreta no plan); filtra cal.action='optimistic_conflict' que nao mapeia para o CHECK do data_access_log"
  - "F.2 data_access_log e RLS-enabled mas SEM policy INSERT — INSERT direto retorna SQLSTATE 42501; apenas RPC SECURITY DEFINER (read_candidate_with_log) escreve, garantindo audit log inviolável"
  - "F.3 EXCLUDE USING gist necessita CREATE EXTENSION btree_gist (uuid e enum nao tem default operator class para gist). Sem isso a migration falha com clear error"
  - "F.3 RPC re-aplica is_people_manager OR EXISTS(visible_companies) antes de retornar candidate — mitiga T-02-02-04 (SECURITY DEFINER RLS bypass)"
  - "F.4 normalize_cpf marcado IMMUTABLE (necessario para uso em indexes futuros); aborta migration se houver duplicatas pos-normalizacao com mensagem explicita forcando merge manual"
  - "Plan 02-02 NAO aplica db push — Plan 02-04 (Wave 2 BLOCKING) faz isso. Aqui apenas escrevemos os SQLs e ativamos os pgTAP tests"

patterns-established:
  - "DDL header block: motivacao + pattern + threats + REQs + DEVIATION notes (segue convencao Phase 1 B2)"
  - "Audit log generalizado: 1 tabela append-only com entity_type discriminator escala melhor que N tabelas especificas; pg_cron retention por interval declarativo"
  - "Activate-on-implementation: pgTAP skeleton de Wave 0 (com select skip(N)) e ativado por Wave 1 plan que implementa o codigo testado — rastreabilidade direta TODO Plan 02-XX"

requirements-completed:  # SQL escrito; reqs serao 'DONE' apos Plan 02-04 push + green tests
  - RS-05  # stages legados normalizados (F.1)
  - RS-06  # trigger anti-regressao stages legados (F.1)
  - TAL-03  # candidate_consents granular por purpose (F.3)
  - TAL-05  # data_access_log append-only (F.2)
  - TAL-06  # read_candidate_with_log RPC + RLS (F.2)
  - TAL-07  # pg_cron retention 36 meses (F.2)
  - TAL-09  # CPF canonical dedup unique partial (F.4)

# Metrics
duration: 7min
completed: 2026-04-28
---

# Phase 2 Plan 2: Migration F Sub-migrations (F.1-F.4) Summary

**4 migration SQLs (F.1 normalize stages / F.2 data_access_log + RPC + cron / F.3 candidate_consents + view + RLS / F.4 CPF dedup + normalize trigger) escritos com 19 pgTAP tests ativados — schema base de Phase 2 pronto para Plan 02-04 push.**

## Performance

- **Duration:** ~7 min
- **Started:** 2026-04-28T02:03:53Z
- **Completed:** 2026-04-28T02:10:28Z
- **Tasks:** 4 (todos auto-completed)
- **Files created:** 5 (4 migrations SQL + 1 SUMMARY)
- **Files modified:** 5 (pgTAP tests 006-010)

## Accomplishments

- 4 migrations idempotentes (CREATE * IF NOT EXISTS / CREATE OR REPLACE / DROP * IF EXISTS / DO $$ EXCEPTION) escritas seguindo o template Phase 1 B2 (header block + threat references + REQ-IDs)
- 5 pgTAP suites ativadas (sem `select skip(`); 19 tests prontos para rodar pos Plan 02-04 push
- Confirmacao validada: `is_people_manager(uid)` (definida em 20260422130000_align_admin_role_policies.sql:16-29) inclui `admin`, `socio` E `rh` — policy `data_access_log:select:admin_rh_only` e demais policies de F.3 funcionam corretamente para RH
- 3 deviations (Rule 1 + Rule 2) auto-aplicadas com documentacao explicita nos commits e neste SUMMARY
- Migration NAO aplicada na DB (per objective: Plan 02-04 owns db push em Wave 2 BLOCKING)

## Task Commits

Each task was committed atomically:

1. **Task 1: Migration F.1 — normalize legacy application stages** - `3a791f3` (feat)
2. **Task 2: Migration F.2 — data_access_log + read_candidate_with_log + pg_cron** - `6332623` (feat)
3. **Task 3: Migration F.3 — candidate_consents + view + RLS** - `ca02ff6` (feat)
4. **Task 4: Migration F.4 — CPF UNIQUE partial + normalize trigger** - `06ac70b` (feat)
5. **Fix-up: PERFORM WHERE syntax in F.2 cron guard** - `c38b60f` (fix)

## Files Created/Modified

### Migration SQLs (4 files, 496 lines total)

| File | Lines | Highlights |
|------|------:|------------|
| `supabase/migrations/20260428120000_f1_normalize_legacy_application_stages.sql` | 153 | ALTER TABLE applications ADD metadata jsonb + 3 batched UPDATEs (FOR UPDATE SKIP LOCKED + pg_sleep) + tg_block_legacy_stages BEFORE INSERT/UPDATE OF stage |
| `supabase/migrations/20260428120100_f2_data_access_log_table.sql` | 157 | CREATE TABLE data_access_log + RLS (SELECT-only para is_people_manager) + RPC read_candidate_with_log SECURITY DEFINER + INSERT-SELECT migration de candidate_access_log + cron.schedule weekly Mon 03:30 UTC |
| `supabase/migrations/20260428120200_f3_candidate_consents.sql` | 112 | CREATE EXTENSION btree_gist + 2 ENUMs + TABLE com EXCLUDE USING gist + 2 CHECK + view active_candidate_consents + 3 RLS policies |
| `supabase/migrations/20260428120300_f4_cpf_canonical_dedup.sql` | 74 | normalize_cpf IMMUTABLE function + UPDATE batch normalize + DO $$ abort-if-dupes guard + UNIQUE partial idx_candidates_cpf_unique + tg_normalize_candidate_cpf trigger |

### pgTAP tests activated (5 files, 19 tests)

| File | Tests | Validates |
|------|------:|-----------|
| `supabase/tests/006-migration-f-stages.sql` | 5 | Zero legacy stages remanescentes; trigger bloqueia INSERT legado (23514); metadata.legacy_marker='sem_retorno' preservado para rows backfilladas; row migrada de sem_retorno em stage='em_interesse' |
| `supabase/tests/007-data-access-log.sql` | 4 | RPC executa (lives_ok); RPC escreve >=1 log row; INSERT direto bloqueado por RLS (42501); RH consegue SELECT via policy |
| `supabase/tests/008-candidate-consents.sql` | 4 | CHECK consents_revoked_after_granted bloqueia revoked_at < granted_at (23514); EXCLUDE bloqueia 2 active per (candidate, purpose) (23P01); view active exclui revogados; re-grant pos revoke permitido |
| `supabase/tests/009-cpf-unique.sql` | 4 | UNIQUE rejeita CPF duplicado (23505); multiplos NULL permitidos; trigger normaliza '987.654.321-00' -> '98765432100'; CPF != 11 digitos rejeitado (23514) |
| `supabase/tests/010-pg-cron-retention.sql` | 2 | Cron job existe com schedule '30 3 * * 1'; DELETE manual remove rows >36 meses |

## Verification Results

- 4 SQL files presentes em `supabase/migrations/2026042812*.sql` (timestamps 20260428120000–20260428120300)
- 5 pgTAP files SEM `select skip(` (verificado via grep)
- Plan-required literals presentes:
  - F.1: `tg_block_legacy_stages` ✓ + `metadata jsonb` ✓ + 3x `'em_interesse'::public.application_stage_enum` ✓ + `'"sem_retorno"'::jsonb` ✓
  - F.2: `read_candidate_with_log` ✓ + `data_access_log_retention_cleanup` ✓ + `SET search_path = public` ✓
  - F.3: `active_candidate_consents` ✓ + `EXCLUDE USING gist (candidate_id WITH =, purpose WITH =)` ✓ + `consents_revoked_after_granted` ✓ + `consent_purpose_enum` ✓ + `btree_gist` ✓
  - F.4: `idx_candidates_cpf_unique` ✓ + `tg_normalize_candidate_cpf` ✓ + `Migration F.4 abortada` ✓ + `normalize_cpf` ✓ + `BEFORE INSERT OR UPDATE OF cpf` ✓
- `is_people_manager(uid)` confirmado incluir `admin`, `socio`, `rh` (em `20260422130000_align_admin_role_policies.sql:16-29`)
- `supabase db push` NAO executado (per objective: Plan 02-04 owns)
- `npx supabase test db` NAO executado neste ambiente (Supabase CLI nao disponivel; testes serao verificados durante Plan 02-04)

## Decisions Made

- **Map legacy stages to `em_interesse` (not `fit_cultural`/`triagem`)**: O CONTEXT.md D-mapping referencia "fit_cultural" e "triagem" como destinos, mas esses NAO sao valores do enum `public.application_stage_enum` — sao keys de STAGE_GROUPS (UI grouping). Mapeamos para `em_interesse` (defaultStage da coluna Triagem em STAGE_GROUPS.ts), preservando o stage de origem em `metadata.legacy_marker` para auditoria. Decisao alinhada com codigo de UI atual.

- **`btree_gist` extension obrigatoria para F.3 EXCLUDE constraint**: Postgres requer operator class GiST para colunas no EXCLUDE constraint; uuid e enum types nao tem default. Adicionei `CREATE EXTENSION IF NOT EXISTS btree_gist` antes do CREATE TABLE — caso contrario migration falha em apply.

- **Append-only via RLS sem policy INSERT (data_access_log)**: Padrao escolhido para garantir que apenas funcoes SECURITY DEFINER consigam escrever no audit log. INSERT direto do client retorna 42501 ("permission denied for table"). RPC `read_candidate_with_log` e o unico caminho de escrita em produtivo.

- **`STABLE` removido de read_candidate_with_log**: A RPC faz INSERT em data_access_log dentro do mesmo statement, o que muta estado — STABLE seria mentira. Mudei para volatilidade default (VOLATILE), o que e mais correto semanticamente. (Plan original sugeria STABLE; isso e bug — auto-fix Rule 1.)

- **Idempotency padrao em pg_cron unschedule**: Use `DO $$ IF EXISTS THEN PERFORM cron.unschedule(...) END IF; EXCEPTION WHEN OTHERS THEN NULL; END $$` antes de re-schedule. Isso permite re-aplicar a migration sem erro de "job already exists".

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Plan referencia enum values inexistentes (`'fit_cultural'`, `'triagem'`)**
- **Found during:** Task 1
- **Issue:** O `must_haves.truths` e o action SQL do Task 1 usavam literais `'fit_cultural'::public.application_stage_enum` e `'triagem'::public.application_stage_enum`. Esses valores NAO existem no enum `public.application_stage_enum` (definido em 20260416193000_hiring_core_entities.sql:37-55, que tem apenas: recebido, em_interesse, aguardando_fit_cultural, sem_retorno, fit_recebido, antecedentes_ok, ...). O CONTEXT.md confundiu STAGE_GROUPS keys (UI) com enum values (DB).
- **Fix:** Mapeei para `'em_interesse'::public.application_stage_enum` (defaultStage da Triagem em `src/lib/hiring/stageGroups.ts:53`), preservando legacy_marker em metadata para auditoria forense.
- **Files modified:** `supabase/migrations/20260428120000_f1_normalize_legacy_application_stages.sql`
- **Commit:** `3a791f3`

**2. [Rule 1 - Bug] Plan F.2 INSERT-SELECT referencia coluna inexistente `cal.created_at`**
- **Found during:** Task 2
- **Issue:** O Plan tinha `cal.created_at` no INSERT-SELECT migrando candidate_access_log -> data_access_log. A coluna real em candidate_access_log (definida em 20260416193000_hiring_core_entities.sql:401) e `at`, nao `created_at`. O INSERT falharia com "column cal.created_at does not exist" durante apply.
- **Fix:** Substituido por `cal.at` no SELECT.
- **Files modified:** `supabase/migrations/20260428120100_f2_data_access_log_table.sql`
- **Commit:** `6332623`

**3. [Rule 1 - Bug] Plan F.2 INSERT-SELECT pode tentar inserir actions invalidas no novo CHECK**
- **Found during:** Task 2
- **Issue:** `candidate_access_log.action` e do tipo `log_action_enum` ('view' | 'update' | 'optimistic_conflict'). O CHECK do `data_access_log.action` so aceita ('view' | 'export' | 'update' | 'anonymize' | 'delete'). Tentar inserir 'optimistic_conflict' violaria o CHECK durante backfill.
- **Fix:** Adicionei `WHERE cal.action::text IN ('view', 'update')` no INSERT-SELECT — filtramos rows de optimistic_conflict (sao noise tecnico de retry, nao audit signal de PII access).
- **Files modified:** `supabase/migrations/20260428120100_f2_data_access_log_table.sql`
- **Commit:** `6332623`

**4. [Rule 1 - Bug] STABLE flag em read_candidate_with_log e mentira (RPC faz INSERT)**
- **Found during:** Task 2
- **Issue:** Plan especificava `LANGUAGE plpgsql STABLE SECURITY DEFINER` para a RPC. Mas a funcao faz INSERT em data_access_log — isso muta estado, viola STABLE (que garante "mesma input -> mesma output dentro de uma transacao"). Em prod isso poderia causar otimizacoes erradas (Postgres deduplicaria chamadas e pularia INSERTs do log!).
- **Fix:** Removi STABLE; a RPC fica com volatilidade default VOLATILE (correto para funcoes que fazem INSERT/UPDATE/DELETE).
- **Files modified:** `supabase/migrations/20260428120100_f2_data_access_log_table.sql`
- **Commit:** `6332623`

**5. [Rule 2 - Missing critical functionality] EXCLUDE constraint precisa de btree_gist**
- **Found during:** Task 3
- **Issue:** Plan SQL tinha `EXCLUDE (candidate_id WITH =, purpose WITH =) WHERE (revoked_at IS NULL)`. Postgres exige operator class GiST para colunas em EXCLUDE; `uuid` e enum types nao tem default. Sem `CREATE EXTENSION btree_gist`, a migration falha durante apply com "data type uuid has no default operator class for access method gist".
- **Fix:** Adicionei `CREATE EXTENSION IF NOT EXISTS btree_gist;` ANTES do CREATE TABLE; explicitei `EXCLUDE USING gist (...)`.
- **Files modified:** `supabase/migrations/20260428120200_f3_candidate_consents.sql`
- **Commit:** `ca02ff6`

**6. [Rule 1 - Bug] PERFORM WHERE syntax invalido em PL/pgSQL**
- **Found during:** Post-Task 4 review of Task 2
- **Issue:** `PERFORM cron.unschedule('...') WHERE EXISTS (...)` nao e syntax valida em PL/pgSQL — PERFORM espera uma single SELECT/expression sem clausula WHERE adjacente. Migration falharia com syntax error proximo a "WHERE" durante apply.
- **Fix:** Refactor para `IF EXISTS (...) THEN PERFORM cron.unschedule(...); END IF;` dentro do mesmo DO block.
- **Files modified:** `supabase/migrations/20260428120100_f2_data_access_log_table.sql`
- **Commit:** `c38b60f`

### Total: 6 deviations (5 Rule 1 - bugs; 1 Rule 2 - missing critical functionality)

Todos os deviations sao auto-fixes; nenhuma decisao arquitetural pediu pause.

## Authentication Gates

None — plan rodou sem necessidade de auth externa (apenas escrita de SQL).

## Issues Encountered

- **Plan vs enum mismatch**: Multiplas referencias do plan/contexto a `'fit_cultural'` e `'triagem'` como enum values quando sao apenas keys de STAGE_GROUPS — gerou risco de adoptar literais errados que quebrariam a migration. Resolved via Rule 1 deviation (mapeamento para `'em_interesse'`).
- **Schema mismatch entre RESEARCH §6 e codigo real**: RESEARCH usa `cal.created_at` em SQL exemplos, mas a coluna real e `cal.at`. Aproveitei para alinhar com schema verdadeiro durante implementacao.
- **`tests.authenticate_as_service_role()` nas pgTAP tests**: Pressupoe que helper existe; foi usado em Plan 02-01 (linha visible em CONCERNS file referenced by tests). Re-usado consistentemente nos 5 tests novos.

## User Setup Required

None.

## Threat Flags

Nenhum surface novo introduzido fora do threat_model do plan; todos os threats T-02-02-* e T-02-03-* listados foram mitigados conforme planejado:
- T-02-02-01 (PII leakage via direct SELECT) → RPC + RLS denies
- T-02-02-02 (log poisoning via INSERT direto) → RLS sem policy INSERT
- T-02-02-04 (RPC SECURITY DEFINER bypassa RLS) → RPC re-aplica is_people_manager OR EXISTS visible_companies
- T-02-02-05 (search_path injection) → SET search_path = public em todas as funcoes SECURITY DEFINER
- T-02-03-01 (consent tampering) → RLS WITH CHECK so is_people_manager UPDATE
- T-02-03-02 (2 consents ativos para mesma finalidade) → EXCLUDE constraint
- T-02-04-01 (UNIQUE breaking on existing duplicates) → normalize-then-validate-then-constrain pattern em F.4

## Next Phase Readiness

- **Wave 1 paralelo (Plan 02-04 hooks)**: pode iniciar imediatamente — schema novo (data_access_log, candidate_consents, normalize_cpf) ja escrito; types regen acontece em Plan 02-04 apos db push.
- **Wave 2 BLOCKING (Plan 02-04 db push + types regen)**: tudo esta pronto. Plan 02-04 deve:
  1. `supabase db push` (aplica F.1 + F.2 + F.3 + F.4 sequencialmente)
  2. `supabase gen types typescript --linked > src/integrations/supabase/types.ts`
  3. `npx supabase test db` para rodar os 19 pgTAP tests novos (esperado: green)
- **Wave 3 (Plan 02-05 hooks LGPD)**: depende dos types regenerados em Wave 2.

## Self-Check: PASSED

Verifications run:
- `[ -f supabase/migrations/20260428120000_f1_normalize_legacy_application_stages.sql ]` → FOUND
- `[ -f supabase/migrations/20260428120100_f2_data_access_log_table.sql ]` → FOUND
- `[ -f supabase/migrations/20260428120200_f3_candidate_consents.sql ]` → FOUND
- `[ -f supabase/migrations/20260428120300_f4_cpf_canonical_dedup.sql ]` → FOUND
- `grep -c "select skip(" supabase/tests/00{6,7,8,9}-*.sql supabase/tests/010-*.sql` → 0 (zero arquivos com skip)
- `git log --oneline | grep 3a791f3` → FOUND
- `git log --oneline | grep 6332623` → FOUND
- `git log --oneline | grep ca02ff6` → FOUND
- `git log --oneline | grep 06ac70b` → FOUND
- `git log --oneline | grep c38b60f` → FOUND
- `is_people_manager` includes 'rh' role: VERIFIED (line 27 de 20260422130000_align_admin_role_policies.sql)
- 4 migrations contem todas as keywords-chave do plan (`tg_block_legacy_stages`, `read_candidate_with_log`, `active_candidate_consents`, `idx_candidates_cpf_unique`): VERIFIED

---

*Phase: 02-r-s-refactor*
*Completed: 2026-04-28*
