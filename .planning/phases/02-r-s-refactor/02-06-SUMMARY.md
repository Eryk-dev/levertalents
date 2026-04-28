---
phase: 02-r-s-refactor
plan: 06
subsystem: hooks
tags: [react-query, hiring, lgpd, consent, talent-pool, cpf-dedup, edge-function, msw, candidate-tags, audit-log]

# Dependency graph
requires:
  - phase: 02-r-s-refactor
    plan: 04
    provides: "src/integrations/supabase/types.ts regenerado com candidate_consents/active_candidate_consents/data_access_log/read_candidate_with_log + hiring-types.ts com Consent/ActiveConsent/ConsentPurpose/ConsentLegalBasis/DataAccessLogEntry exports"
  - phase: 02-r-s-refactor
    plan: 03
    provides: "src/lib/hiring/cardCustomization.ts (loadCardPreferences/saveCardPreferences) + src/lib/hiring/cpf.ts (normalizeCpf/isValidCpfFormat) — utils consumidos por useCardPreferences e useCandidateByCpf"
  - phase: 01-tenancy-backbone
    provides: "useScopedQuery chokepoint (queryKey scope.id prefix)"
provides:
  - "useActiveConsents + useRevokeConsent + useGrantConsent (3 hooks LGPD em src/hooks/hiring/useCandidateConsents.ts)"
  - "useTalentPool filtra por active_candidate_consents.purpose='incluir_no_banco_de_talentos_global' (TAL-04/08) + surface campo derivado tags por empresa (TAL-02)"
  - "useCandidate via RPC read_candidate_with_log (TAL-06 audit) + useCandidateByCpf cross-empresa lookup (TAL-09)"
  - "useCardPreferences hook React (D-08 card customization)"
  - "useDataAccessLog hook (alimenta AuditLogPanel — Plan 02-09)"
  - "useCandidateTags standalone hook (TAL-02 — agrega tags por company_id do histórico cross-empresa)"
  - "supabase/functions/apply-to-job persistindo candidate_consents granulares (TAL-04 LGPD opt-in flow)"
  - "src/integrations/supabase/client.ts: fetch indirection — desbloqueia MSW interception em todos os hook tests Phase 2 (Rule 3 fix)"
affects: [02-07, 02-08, 02-09]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Hooks LGPD usam useScopedQuery (Phase 1 chokepoint) — queryKey final shape ['scope', scope.id, scope.kind, ...]"
    - "Mutations (useRevokeConsent / useGrantConsent) usam invalidateQueries com partial-key matching para invalidar talent-pool E candidate-consents simultaneamente"
    - "Toast convention: import { toast } from 'sonner' em hooks novos (UI-SPEC §Toast positions); useApplications.ts ainda usa @/hooks/use-toast (intencional — não tocar)"
    - "Auth credentials para mutations (revoked_by/granted_by) vem de useAuth() (user.id), não de scope (scope type não tem userId)"
    - "Edge Function apply-to-job: consent persist é non-blocking — falha não impede application (log [consent] sem PII para CLAUDE.md compliance)"
    - "Fetch indirection em supabase client.ts: ((input, init) => globalThis.fetch(...)) — supabase-js captura native fetch ref ao construir, MSW instala fetchProxy em globalThis.fetch depois (server.listen no beforeAll). Sem indirection, hook tests escapavam MSW. Em produção é no-op."

key-files:
  created:
    - src/hooks/hiring/useCandidateConsents.ts
    - src/hooks/hiring/useCardPreferences.ts
    - src/hooks/hiring/useDataAccessLog.ts
    - src/hooks/hiring/useCandidateTags.ts
    - tests/hiring/useCandidateTags.test.tsx
    - .planning/phases/02-r-s-refactor/02-06-SUMMARY.md
  modified:
    - src/hooks/hiring/useTalentPool.ts  # filtro active_candidate_consents + tags TAL-02
    - src/hooks/hiring/useCandidates.ts  # useCandidate via RPC + useCandidateByCpf
    - supabase/functions/apply-to-job/index.ts  # persiste candidate_consents granulares
    - src/integrations/supabase/client.ts  # fetch indirection (Rule 3 fix MSW)
    - tests/hiring/useCandidateConsents.test.tsx  # ativado: 6 tests cobrindo SELECT/UPDATE/invalidation
    - tests/hiring/useTalentPool.test.tsx  # ativado: 4 tests cobrindo URL pattern + tags aggregation

key-decisions:
  - "Usar useAuth().user?.id em vez de scope?.userId em useRevokeConsent/useGrantConsent: o type Scope (Phase 1 lock) não tem campo userId; useApplications.ts já usa esse padrão. Plan/RESEARCH inline code referenciava scope.userId — desviei para useAuth (canonical pattern do codebase)."
  - "useCandidateTags como standalone hook + tags field em useTalentPool: dois entry points para a mesma surface (TAL-02). useTalentPool tem tags pré-agregadas no embed (mais eficiente para listar Banco de Talentos); useCandidateTags faz query dedicada quando precisamos das tags de um candidato fora desse contexto (e.g. CandidateDrawer header)."
  - "Edge Function apply-to-job: preservar campo `consent` legacy (single boolean) por backwards compat; adicionar `consents` (JSON object granular) em paralelo. Plan 02-08 (PublicApplicationForm rewrite) vai migrar para o novo shape; durante a transição ambos coexistem."
  - "src/integrations/supabase/client.ts edit (Rule 3): fetch indirection via globalThis.fetch lookup. Comment header dizia 'do not edit', mas BLOQUEAVA todos os tests de hooks que usam supabase + MSW. Em produção é no-op (globalThis.fetch === fetch). Documentado inline com motivação completa."

patterns-established:
  - "Hook test scaffolding: import { server } from '../msw/server' (não criar setupServer próprio — global é compartilhado), vi.spyOn(scopeModule, 'useScope') + vi.spyOn(authModule, 'useAuth') no beforeEach, server.use(handler) por test, server.resetHandlers() no afterEach"
  - "MSW handler precisa do fetch indirection no supabase client; sem isso, supabase-js captura ref native antes do MSW server.listen() rodar e tests escapam interception"
  - "queryKey shape para mutations LGPD: ['scope', scope?.id, scope?.kind, 'hiring', 'candidate-consents', candidateId] — precisa do prefix scope mesmo para mutations cross-cache invalidate"

requirements-completed:
  - RS-08    # card preferences via useCardPreferences (D-08 hook habilitado)
  - TAL-01   # banco de talentos cross-empresa (useTalentPool surface tags TAL-02)
  - TAL-02   # tags por empresa/vaga histórico (useCandidateTags + useTalentPool.tags)
  - TAL-03   # consent flow granular (useGrantConsent / Edge Function persist)
  - TAL-04   # opt-in não pré-marcado (Edge Function persist + filtro talent pool)
  - TAL-06   # read_candidate_with_log integrado em useCandidate
  - TAL-08   # talent pool filtra por consent ativo
  - TAL-09   # CPF dedup canonical (useCandidateByCpf cross-empresa lookup)

# Metrics
duration: 19min
completed: 2026-04-28
---

# Phase 2 Plan 6: Wave 3 — Hooks LGPD + Edge Function + UI Prefs Summary

**6 hooks novos/refatorados em src/hooks/hiring/ habilitam toda a camada LGPD do R&S (TAL-01..09 cobertos), 1 Edge Function persiste consents granulares vindos do form público, e 14 tests vitest+MSW cobrem invalidation + filtro embed + agregação cross-empresa — desbloqueia Wave 4 (UI Plans 02-07/08/09 podem consumir os hooks prontos).**

## Performance

- **Duration:** ~19 min (1165s)
- **Started:** 2026-04-28T09:25:17Z
- **Completed:** 2026-04-28T09:44:42Z
- **Tasks:** 6 (todos completados sem checkpoint)
- **Files created:** 4 hooks + 1 test + 1 SUMMARY = 6
- **Files modified:** 6 (3 hooks + 1 Edge Function + 1 client.ts + 2 tests)

## Accomplishments

- **useCandidateConsents.ts** (novo) — 3 hooks: `useActiveConsents` (SELECT em active_candidate_consents view, scoped, staleTime 30s), `useRevokeConsent` (UPDATE revoked_at + revoked_by=auth.uid; invalida 2 caches), `useGrantConsent` (INSERT em nome do RH; default legal_basis=consent + 24mo expires_at)
- **useTalentPool.ts** (modify) — adicionou embed `consents:active_candidate_consents!inner(purpose,...)` + `.eq("consents.purpose", "incluir_no_banco_de_talentos_global")` (TAL-04). Surface campo derivado `tags: CandidateTag[]` por candidato (TAL-02 — agrega applications cross-empresa por company_id)
- **useCandidates.ts** (modify) — `useCandidate(id, context)` agora chama RPC `read_candidate_with_log` (TAL-06 — leitura com audit). `useCandidateByCpf` adicionado (TAL-09 — cross-empresa lookup, disabled quando CPF inválido)
- **useCardPreferences.ts** (novo) — hook React wrapping load/saveCardPreferences (Plan 02-03 lib). useState + useEffect storage event listener para cross-tab sync; reset on userId change. Returns tuple [prefs, setPrefs] (D-08)
- **useDataAccessLog.ts** (novo) — query data_access_log filtrada por entity_type+entity_id, sort at DESC, limit 50 (alimenta AuditLogPanel Plan 02-09)
- **useCandidateTags.ts** (novo) — standalone TAL-02 hook (entry point separado do tags field embarcado em useTalentPool); agrega cross-empresa, sort last_applied_at DESC, staleTime 60s
- **supabase/functions/apply-to-job/index.ts** (modify) — persiste candidate_consents granulares: lê form `consents` (JSON), filtra true, INSERT bulk com legal_basis='consent', granted_by=null (self-grant), expires_at=now+24mo. Falha silenciosa preserva fluxo da application (log [consent] sem PII)
- **src/integrations/supabase/client.ts** (Rule 3 fix) — fetch indirection desbloqueia MSW em hook tests Phase 2

## Task Commits

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | useCandidateConsents.ts (3 hooks) + test ativo + MSW fix | `690e1bf` | useCandidateConsents.ts (NEW), useCandidateConsents.test.tsx, client.ts |
| 2 | useTalentPool filter + TAL-02 tags + test ativo | `29d9b1d` | useTalentPool.ts, useTalentPool.test.tsx |
| 3 | useCandidate via RPC + useCandidateByCpf | `aa71dd5` | useCandidates.ts |
| 4 | useCardPreferences + useDataAccessLog | `fd0abf7` | useCardPreferences.ts (NEW), useDataAccessLog.ts (NEW) |
| 5 | useCandidateTags hook + test (TAL-02 standalone) | `41f7737` | useCandidateTags.ts (NEW), useCandidateTags.test.tsx (NEW) |
| 6 | apply-to-job Edge Function persiste consents | `3370773` | supabase/functions/apply-to-job/index.ts |

## Files Created/Modified

| File | Change | Notes |
|------|--------|-------|
| `src/hooks/hiring/useCandidateConsents.ts` | created | 3 hooks LGPD: useActiveConsents + useRevokeConsent + useGrantConsent |
| `src/hooks/hiring/useTalentPool.ts` | modified | active_candidate_consents!inner embed + tags TAL-02; preservou search/discardReasons/jobIds/onlyTalentPool filters |
| `src/hooks/hiring/useCandidates.ts` | modified | useCandidate via RPC; useCandidateByCpf adicionado; outros hooks preservados |
| `src/hooks/hiring/useCardPreferences.ts` | created | React hook wrapping cardCustomization.ts; storage event listener; userId reset |
| `src/hooks/hiring/useDataAccessLog.ts` | created | Scoped query data_access_log; alimenta AuditLogPanel |
| `src/hooks/hiring/useCandidateTags.ts` | created | TAL-02 standalone; agrega cross-empresa por company_id |
| `supabase/functions/apply-to-job/index.ts` | modified | Persiste candidate_consents granulares pós-application |
| `src/integrations/supabase/client.ts` | modified | Fetch indirection (Rule 3 — destrava MSW interception) |
| `tests/hiring/useCandidateConsents.test.tsx` | activated | 6 tests cobrindo SELECT/queryKey/UPDATE/invalidation |
| `tests/hiring/useTalentPool.test.tsx` | activated | 4 tests: URL pattern + anonymized + tags aggregation + vazio |
| `tests/hiring/useCandidateTags.test.tsx` | created | 4 tests: 2 empresas distintas + vazio + descarta orphan + disabled |

## Verification Results

### Tests (vitest + MSW)

```
tests/hiring/useCandidateConsents.test.tsx (6 tests) ✓
tests/hiring/useTalentPool.test.tsx (4 tests) ✓
tests/hiring/useCandidateTags.test.tsx (4 tests) ✓
```

Total Phase 2 ativo: **446 tests passing | 74 todo (skeletons) | 0 failures** (28 test files; 19 active + 9 skipped).

### TypeScript (`tsc --noEmit -p tsconfig.app.json`)

- ZERO errors em arquivos do plan: `useCandidateConsents.ts`, `useTalentPool.ts`, `useCandidates.ts`, `useCardPreferences.ts`, `useDataAccessLog.ts`, `useCandidateTags.ts`, `supabase/functions/apply-to-job/index.ts`, `src/integrations/supabase/client.ts`
- 147 errors PRE-EXISTENTES em 11 arquivos de Plans 02-04 (`deferred-items.md`): MobileNav.tsx, CandidateForm.tsx, JobCard.tsx, JobOpeningForm.tsx, PublicApplicationForm.tsx, useCulturalFit.ts, useHiringMetrics.ts, useOptimisticVersion.ts, Index.tsx, JobOpeningDetail.tsx, PublicJobOpening.tsx — owners listados em deferred-items, fora do escopo Plan 02-06

### Grep checks

```
grep -c "active_candidate_consents" src/hooks/hiring/useTalentPool.ts → 1+
grep -c "read_candidate_with_log" src/hooks/hiring/useCandidates.ts → 2 (1 RPC call + 1 doc)
grep -c "useCandidateByCpf" src/hooks/hiring/useCandidates.ts → 2 (export + queryKey)
grep -c "candidate_consents" supabase/functions/apply-to-job/index.ts → 2 (1 .from() call + 1 doc)
grep -c "deriveTags\|tags:" src/hooks/hiring/useTalentPool.ts → 5+
grep -c "CandidateTag" src/hooks/hiring/useCandidateTags.ts → 5+
grep -c "loadCardPreferences" src/hooks/hiring/useCardPreferences.ts → 5
grep -c "data_access_log" src/hooks/hiring/useDataAccessLog.ts → 2 (1 .from() + 1 doc)
```

## Decisions Made

- **useAuth() em vez de scope.userId**: O Plan/RESEARCH inline code referenciava `scope?.userId` mas o type `Scope` (Phase 1 lock em `src/features/tenancy/types.ts`) não tem campo `userId`. O codebase já usa o padrão `const { user } = useAuth(); user?.id ?? null` (e.g. `useApplications.ts:75-89`). Adotei esse padrão. Os tests mockam ambos `useScope` e `useAuth` no beforeEach.

- **Standalone useCandidateTags + embedded tags em useTalentPool**: TAL-02 surface tem 2 entry points complementares. `useTalentPool` já busca applications no embed (PostgREST), então pode agregar tags pré-computadas — mais eficiente para listar Banco de Talentos. `useCandidateTags` faz query dedicada para casos onde precisamos das tags de um candidato fora do contexto do banco (CandidateDrawer header em Plan 02-09). Ambos usam o mesmo helper `deriveTags` (DRY) e o mesmo shape de `CandidateTag`.

- **Edge Function: preservar `consent` (single boolean) + adicionar `consents` (JSON object)**: O form atual envia `consent=true` (literal boolean para o aceite mínimo). O novo shape `consents` é um JSON object com 3 keys booleanos granulares (TAL-04). Durante Plan 02-08 (PublicApplicationForm rewrite), o form vai migrar; até lá ambos coexistem. Edge Function agora persiste candidate_consents pra cada finalidade marcada `=true` no `consents` JSON, sem afetar o handling do `consent` legacy.

- **Fetch indirection em supabase/client.ts (Rule 3)**: O comentário "automatically generated. Do not edit" no topo do arquivo é convenção, mas o problema era bloqueante: `@supabase/postgrest-js` chama `resolveFetch` no constructor do client e captura a referência native de `fetch` por closure (`(...args) => _fetch(...args)`). MSW (server.listen no beforeAll) instala um proxy em `globalThis.fetch` DEPOIS que o supabase client foi criado (no module-load do test). Resultado: tests batem na real Supabase API com "Invalid API key". Fix: passar `global: { fetch: (input, init) => globalThis.fetch(input, init) }` ao createClient — re-resolve global fetch em cada chamada. Em produção é no-op (`globalThis.fetch === fetch`, ambos native). Sem essa fix, todos os hook tests Phase 2 ficariam bloqueados.

- **MSW global server vs setupServer per-test**: Plan inline code usava `setupServer()` por teste, mas o codebase já tem `tests/msw/server.ts` global registrado em `tests/setup.ts` com `onUnhandledRequest: 'error'`. Ter dois servers é conflict — adotei o padrão existente (`server.use(handler)` por test + `server.resetHandlers()` no afterEach já é centralizado em setup.ts).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Supabase client fetch capture bypass MSW interception**

- **Found during:** Task 1 (test ativo do useCandidateConsents)
- **Issue:** `@supabase/postgrest-js` PostgrestBuilder captura `globalThis.fetch` ao construir o client (no module-load via `createClient`). MSW instala fetchProxy em `globalThis.fetch` DEPOIS, no `server.listen()` do beforeAll. Resultado: hook tests escapavam interception e batiam na real Supabase API ("Invalid API key" como response).
- **Fix:** Modificado `src/integrations/supabase/client.ts` para passar `global: { fetch: (input, init) => globalThis.fetch(input, init) }` ao createClient. Re-resolve global fetch em cada chamada — pega o fetchProxy que MSW instalou. Em produção é no-op.
- **Files modified:** `src/integrations/supabase/client.ts`
- **Verification:** Debug test (cleanup pós-validação) confirma `INTERCEPTED:` log antes/depois do fix
- **Committed in:** `690e1bf` (Task 1 commit)

**2. [Rule 1 - Bug] scope.userId não existe no Scope type (Phase 1 lock)**

- **Found during:** Task 1 (write useCandidateConsents.ts)
- **Issue:** Plan/RESEARCH inline code referenciava `scope?.userId` para gravar `revoked_by` em `candidate_consents`. Mas o type `Scope` em `src/features/tenancy/types.ts` é `{ kind, id, companyIds, name }` — sem `userId`. TypeScript reportaria erro de propriedade.
- **Fix:** Importar `useAuth` e usar `user?.id ?? null` para `revoked_by` / `granted_by`. Padrão já estabelecido em `useApplications.ts:75,89` (`last_moved_by: user?.id ?? null`). Tests mockam `useAuth` no beforeEach.
- **Files modified:** `src/hooks/hiring/useCandidateConsents.ts`, `tests/hiring/useCandidateConsents.test.tsx` (mock useAuth também)
- **Verification:** Test "UPDATE com revoked_at + revoked_by=user.id" assert `body.revoked_by === 'u1'` ✓
- **Committed in:** `690e1bf` (Task 1 commit)

**3. [Rule 1 - Bug] Test inline code usa setupServer próprio conflitando com global**

- **Found during:** Task 1 (escrita do test)
- **Issue:** Plan inline code usava `const server = setupServer(); beforeAll(() => server.listen())` mas o codebase já tem global server em `tests/setup.ts` com `onUnhandledRequest: 'error'`. Ter dois servers gera conflict de interception ordering.
- **Fix:** Importar `server` de `'../msw/server'` (global), usar `server.use(handler)` por test, `server.resetHandlers()` no afterEach. Padrão estabelecido por setup.ts.
- **Files modified:** Todos os 3 test files Phase 2 Wave 0 ativados
- **Verification:** 14 tests passing across 3 files ✓
- **Committed in:** `690e1bf` (Task 1), `29d9b1d` (Task 2), `41f7737` (Task 5)

**4. [Rule 1 - Bug] `as const` em defaultFilters tornou readonly arrays incompatível com TalentPoolFilters**

- **Found during:** Task 2 (tsc verification)
- **Issue:** `const defaultFilters = { ..., discardReasons: [], jobIds: [] } as const` produz `readonly never[]` / `readonly string[]` que TS rejeita ao passar para `useTalentPool({ search, discardReasons: DiscardReason[], jobIds: string[] })`.
- **Fix:** Remover `as const`, usar `discardReasons: [] as never[]` e `jobIds: [] as string[]` para tipos mutable.
- **Files modified:** `tests/hiring/useTalentPool.test.tsx`
- **Verification:** `npx tsc --noEmit` clean para o test file ✓

**5. [Rule 1 - Bug] fetchIndirect spread args inválido para typeof fetch**

- **Found during:** Task 1 (tsc verification)
- **Issue:** `(...args) => globalThis.fetch(...args)` falha tsc porque `args` infere como `unknown[]` e fetch tem signature `(input: RequestInfo, init?: RequestInit)`.
- **Fix:** Tipar como `const fetchIndirect: typeof fetch = (input, init) => globalThis.fetch(input, init);`
- **Files modified:** `src/integrations/supabase/client.ts`
- **Verification:** tsc clean

---

**Total deviations:** 5 auto-fixed (1 Rule 3 - blocking; 4 Rule 1 - bugs)
**Impact on plan:** Todos os 5 essenciais; 1 (MSW interception) era blocker hard de toda a cadeia de hook tests Phase 2. Nenhum scope creep.

## Issues Encountered

- **Worktree path confusion na primeira tentativa**: As primeiras chamadas Write usaram absolute paths via `/Users/eryk/Documents/APP LEVER TALETS/leverup-talent-hub/...` (master), mas o worktree está em `/Users/eryk/Documents/APP LEVER TALETS/leverup-talent-hub/.claude/worktrees/agent-a9ae814890d856a08/...`. Detectado quando `wc -l` mostrou que o arquivo do worktree ainda tinha 21 linhas (skeleton) enquanto o master tinha 215 linhas. Corrigido: revert no master (`git checkout` + `rm`), reescrever com path absoluto correto incluindo prefixo `.claude/worktrees/agent-a9ae814890d856a08/`.

## Authentication Gates

None — todos os tests rodam offline via MSW; Edge Function modificada não foi deployed (será via supabase functions deploy em Plan 02-08/UAT).

## User Setup Required

- **Future:** Edge Function `apply-to-job` precisa ser re-deployada para o remote (`supabase functions deploy apply-to-job`) — não automatizado nesta sessão. Plan 02-08 (PublicApplicationForm UI rewrite) ou UAT vai cobrir.
- **Production:** Sem mudança de runtime (fetch indirection é no-op em browser).

## Threat Flags

Nenhum surface novo introduzido fora do `<threat_model>` do plan; todos os threats T-02-06-* listados foram mitigados conforme planejado:

- **T-02-06-01 (Tampering — purpose inválido)**: Edge Function passa `purpose` direto para INSERT; DB rejeita com 22P02 invalid_text_representation se não bate com o ENUM `consent_purpose_enum`. Falha silenciosa preserva application.
- **T-02-06-02 (Tampering — RH revoga fora do scope)**: RLS UPDATE em `candidate_consents` requer `is_people_manager((select auth.uid()))` — apenas RH/admin/socio. Aceitável risk porque is_people_manager é global by design Phase 1.
- **T-02-06-03 (Information disclosure — RPC vaza PII em erro)**: RPC `read_candidate_with_log` é SECURITY DEFINER e valida acesso antes de retornar; erro é genérico ('Sem permissão' sem PII). Verificado em Plan 02-02 SQL.
- **T-02-06-04 (DoS — drawer dispara N RPCs em re-render loop)**: `staleTime: 60_000` em `useCandidate` evita re-fetch dentro de 1 min; data_access_log não cresce em loop.
- **T-02-06-05 (Tampering — localStorage prefs corrompido)**: `cardCustomization.ts` faz `safeParse` com Zod schema versioned; fallback para DEFAULT_CARD_PREFERENCES em qualquer caminho de erro. UI nunca crasha por prefs inválido.
- **T-02-06-06 (Information disclosure — Edge Function loga PII)**: `console.error("[consent] failed to persist", consentErr)` — sem candidate name/email; só o erro Postgrest. CLAUDE.md compliant.

## Next Phase Readiness

- **Wave 4 (Plans 02-07/08/09 UI)**: Todos os hooks LGPD prontos para consumo. UIs podem importar:
  - `useActiveConsents`, `useRevokeConsent`, `useGrantConsent` from `@/hooks/hiring/useCandidateConsents` (drawer + RevokeConsentDialog)
  - `useTalentPool` (já com tags) for TalentPoolList component
  - `useCandidate` (RPC com audit) for CandidateDrawer / CandidateProfile
  - `useCandidateByCpf` for DuplicateCandidateDialog (CPF lookup primary, email fallback)
  - `useCardPreferences` for CardFieldsCustomizer + CandidateCard render
  - `useDataAccessLog` for AuditLogPanel
  - `useCandidateTags` for CandidateDrawerHeader (TAL-02 surface)

- **Edge Function deploy**: Plan 02-08 ou UAT precisa rodar `supabase functions deploy apply-to-job --project-ref ehbxpbeijofxtsbezwxd` para que o consent persist entre em produção.

- **PublicApplicationForm migration**: Plan 02-08 vai trocar `consent: z.literal(true)` por `consents: z.object({ ... })` com 3 booleanos granulares não pré-marcados — a Edge Function já está pronta para receber esse novo shape.

## Self-Check: PASSED

Verifications run:
- `[ -f src/hooks/hiring/useCandidateConsents.ts ]` → 173 lines, 3 hooks exportados ✓
- `[ -f src/hooks/hiring/useCardPreferences.ts ]` → 56 lines, 1 hook ✓
- `[ -f src/hooks/hiring/useDataAccessLog.ts ]` → 30 lines, 1 hook ✓
- `[ -f src/hooks/hiring/useCandidateTags.ts ]` → 89 lines, 1 hook ✓
- `[ -f tests/hiring/useCandidateTags.test.tsx ]` → 162 lines, 4 tests ✓
- `grep -c "active_candidate_consents" src/hooks/hiring/useTalentPool.ts` → 1+ ✓
- `grep -c "read_candidate_with_log" src/hooks/hiring/useCandidates.ts` → 2 ✓
- `grep -c "useCandidateByCpf" src/hooks/hiring/useCandidates.ts` → 2 ✓
- `grep -c "candidate_consents" supabase/functions/apply-to-job/index.ts` → 2 ✓
- `npx vitest run tests/hiring/useCandidateConsents.test.tsx` → 6/6 passing ✓
- `npx vitest run tests/hiring/useTalentPool.test.tsx` → 4/4 passing ✓
- `npx vitest run tests/hiring/useCandidateTags.test.tsx` → 4/4 passing ✓
- `npx vitest run` (full suite) → 446 passing | 74 todo | 0 failures ✓
- `npx tsc --noEmit -p tsconfig.app.json` → zero errors em arquivos do plan (147 errors latentes pre-existentes em out-of-scope Plans 02-04, owners em deferred-items.md) ✓
- `git log --oneline 015d6d3..HEAD` → 6 commits (`690e1bf`, `29d9b1d`, `aa71dd5`, `fd0abf7`, `41f7737`, `3370773`) ✓

---

*Phase: 02-r-s-refactor*
*Completed: 2026-04-28*
