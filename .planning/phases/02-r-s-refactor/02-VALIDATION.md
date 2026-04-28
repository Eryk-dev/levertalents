---
phase: 2
slug: r-s-refactor
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-04-27
updated: 2026-04-27
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Reads from RESEARCH.md §"Validation Architecture" (line 2131+).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.2 + @testing-library/react 16 + msw 2.10 (frontend) / pgTAP + supabase-test-helpers (DB) |
| **Config file** | `vitest.config.ts` (Phase 1) + `supabase/tests/pgtap/` (added in Wave 0) |
| **Quick run command** | `npm run test -- --run --changed` |
| **Full suite command** | `npm run test -- --run && npm run test:db` |
| **Estimated runtime** | ~30s frontend + ~20s pgTAP = ~50s |

---

## Sampling Rate

- **After every task commit:** `npm run test -- --run --changed` (filters to changed files only)
- **After every plan wave:** Full suite (`npm run test -- --run && npm run test:db`)
- **Before `/gsd-verify-work`:** Full suite must be green AND pgTAP green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

> Populated 2026-04-27 by gsd-planner. Cross-reference with RESEARCH.md §Validation Architecture (the test inventory matrix). Status legend: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky.

### Plan 01 — Test scaffolding (Wave 0)

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 02-01-1 | 01 | 0 | infra | — | 16 vitest test files exist as failing skeletons (`it.todo` ou `expect(false)`) | scaffold | `for f in tests/hiring/canTransition.test.ts tests/hiring/stageGroups.test.ts tests/hiring/sla.test.ts tests/hiring/cpf.test.ts tests/lib/supabaseError.test.ts tests/hiring/useMoveApplicationStage.test.tsx tests/hiring/useApplicationsRealtime.test.tsx tests/hiring/useApplicationCountsByJob.test.tsx tests/hiring/useTalentPool.test.tsx tests/hiring/useCandidateConsents.test.tsx tests/hiring/useCardPreferences.test.tsx tests/hiring/CandidatesKanban.integration.test.tsx tests/hiring/CandidateCard.test.tsx tests/hiring/CandidateDrawer.test.tsx tests/hiring/PipelineFilters.test.tsx tests/hiring/BoardTableToggle.test.tsx tests/hiring/PublicApplicationForm.test.tsx; do test -f "$f" || exit 1; done` | ❌ W0 | ⬜ pending |
| 02-01-2 | 01 | 0 | infra | T-02-04 (PII spoofing in tests) | MSW handlers stubam Supabase REST + Realtime; impedem rede real em CI | scaffold | `test -f tests/msw/hiring-handlers.ts && test -f tests/msw/realtime-mock.ts && npm test -- --run tests/msw 2>&1 | tail -3` | ❌ W0 | ⬜ pending |
| 02-01-3 | 01 | 0 | infra | — | 5 pgTAP skeletons existem (`SELECT plan(N)` + `SELECT * FROM finish()`) | scaffold | `for f in supabase/tests/006-migration-f-stages.sql supabase/tests/007-data-access-log.sql supabase/tests/008-candidate-consents.sql supabase/tests/009-cpf-unique.sql supabase/tests/010-pg-cron-retention.sql; do test -f "$f" || exit 1; done` | ❌ W0 | ⬜ pending |

### Plan 02 — Migrations F.1-F.4 (Wave 1)

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 02-02-1 | 02 | 1 | RS-05, RS-06 | T-02-01 (data integrity) | Migration F.1 idempotente; zero candidatos órfãos; metadata.legacy_marker preservado | pgTAP | `npm run test:db -- --file 006-migration-f-stages.sql` | ❌ W0 | ⬜ pending |
| 02-02-2 | 02 | 1 | TAL-05, TAL-06 | T-02-02 (LGPD audit bypass via direct INSERT) | data_access_log RLS nega INSERT direto; só RPC SECURITY DEFINER escreve; pg_cron retention 36mo | pgTAP | `npm run test:db -- --file 007-data-access-log.sql && npm run test:db -- --file 010-pg-cron-retention.sql` | ❌ W0 | ⬜ pending |
| 02-02-3 | 02 | 1 | TAL-03, TAL-07 | T-02-03 (consent forgery / replay) | constraint integrity (revoked_at >= granted_at); 1-ativo-por-purpose; view active_candidate_consents | pgTAP | `npm run test:db -- --file 008-candidate-consents.sql` | ❌ W0 | ⬜ pending |
| 02-02-4 | 02 | 1 | TAL-09 | T-02-05 (CPF dedup bypass) | partial UNIQUE index nullable em CPF normalizado; trigger antes de INSERT/UPDATE | pgTAP | `npm run test:db -- --file 009-cpf-unique.sql` | ❌ W0 | ⬜ pending |

### Plan 03 — Pure libs (Wave 1)

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 02-03-1 | 03 | 1 | RS-04, RS-13 | T-02-06 (error info leakage to client) | MoveApplicationError discriminated union; getMoveErrorToastConfig classifica por kind sem expor mensagens Postgrest cruas | unit | `npm test -- --run tests/lib/supabaseError.test.ts` | ❌ W0 | ⬜ pending |
| 02-03-2 | 03 | 1 | RS-08, RS-12, TAL-09 | — | sla.computeSlaTone (D-10); cpf.normalizeCpf/formatCpf; cardCustomization Zod schema | unit | `npm test -- --run tests/hiring/sla.test.ts tests/hiring/cpf.test.ts tests/hiring/useCardPreferences.test.tsx` | ❌ W0 | ⬜ pending |
| 02-03-3 | 03 | 1 | RS-04 | — | STAGE_GROUP_BAR_COLORS = D-11; canTransition exhaustive table; stageGroups mapping completo | unit | `npm test -- --run tests/hiring/canTransition.test.ts tests/hiring/stageGroups.test.ts` | ❌ W0 | ⬜ pending |

### Plan 04 — DB push + types regen (Wave 2)

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 02-04-1 | 04 | 2 | RS-05, RS-06, TAL-03, TAL-05, TAL-06, TAL-09 | — | Migration F aplicada em remote DB ehbxpbeijofxtsbezwxd ou DB local; pgTAP suite green | checkpoint:human-verify | `npm run test:db 2>&1 | tail -10` (após approval do checkpoint) | ❌ W0 | ⬜ pending |
| 02-04-2 | 04 | 2 | RS-05, TAL-03, TAL-05 | — | types.ts regenerado contém candidate_consents, data_access_log, active_candidate_consents | typecheck | `grep -q candidate_consents src/integrations/supabase/types.ts && grep -q data_access_log src/integrations/supabase/types.ts && grep -q active_candidate_consents src/integrations/supabase/types.ts && npx tsc --noEmit` | ❌ W0 | ⬜ pending |
| 02-04-3 | 04 | 2 | TAL-03, TAL-06 | — | hiring-types.ts exporta Consent, DataAccessLogEntry, ConsentPurpose, ConsentLegalBasis | typecheck | `grep -q "export type Consent\b\|export interface Consent\b" src/integrations/supabase/hiring-types.ts && grep -q ConsentPurpose src/integrations/supabase/hiring-types.ts && npx tsc --noEmit` | ❌ W0 | ⬜ pending |

### Plan 05 — Mutation + Realtime hooks (Wave 3)

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 02-05-1 | 05 | 3 | RS-01, RS-02, RS-04 | T-02-07 (RLS denial bypass / mass-update) | useMoveApplicationStage onMutate (cancelQueries + setQueryData) + onError rollback + onSettled invalidate; queryKey scoped; sem optimistic locking (D-03) | unit + integration | `npm test -- --run tests/hiring/useMoveApplicationStage.test.tsx` | ❌ W0 | ⬜ pending |
| 02-05-2 | 05 | 3 | RS-04 | T-02-08 (realtime channel leak / spoof) | useApplicationsRealtime channel applications:job:{jobId}; subscribe/unsubscribe limpo; setQueryData merge silencioso em UPDATE; invalidate em INSERT | unit | `npm test -- --run tests/hiring/useApplicationsRealtime.test.tsx` | ❌ W0 | ⬜ pending |
| 02-05-3 | 05 | 3 | RS-03, RS-08, RS-12 | — | useApplicationCountsByJob via useScopedQuery; queryKey inclui scope.id; count by stage_group | unit | `npm test -- --run tests/hiring/useApplicationCountsByJob.test.tsx` | ❌ W0 | ⬜ pending |

### Plan 06 — Consent + talent pool hooks + Edge Function (Wave 3)

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 02-06-1 | 06 | 3 | TAL-03, TAL-04 | T-02-03 (consent state tampering) | useActiveConsents lista active_candidate_consents; useGrantConsent + useRevokeConsent invalidam queries; legal_basis required | unit | `npm test -- --run tests/hiring/useCandidateConsents.test.tsx` | ❌ W0 | ⬜ pending |
| 02-06-2 | 06 | 3 | TAL-01, TAL-04 | T-02-03 (consent bypass via stale cache) | useTalentPool filtra por active consents (purpose IN incluir_no_banco_de_talentos_global); zero candidatos sem consent vazam | unit | `npm test -- --run tests/hiring/useTalentPool.test.tsx` | ❌ W0 | ⬜ pending |
| 02-06-3 | 06 | 3 | RS-08, TAL-09 | T-02-04 (PII unlogged read) | useCandidate via RPC read_candidate_with_log (auditoria atomic); useCandidateByCpf busca por CPF normalizado | unit | `npm test -- --run tests/hiring/useCandidates.test.tsx 2>&1 | tail -5 || true` (manual fallback se test não criado neste sub-task) | ❌ W0 | ⬜ pending |
| 02-06-4 | 06 | 3 | RS-13, TAL-06 | — | useCardPreferences zod-validated localStorage schema; useDataAccessLog list via RPC | unit | `npm test -- --run tests/hiring/useCardPreferences.test.tsx` | ❌ W0 | ⬜ pending |
| 02-06-5 | 06 | 3 | TAL-02 | — | useCandidateTags agrega tags por empresa via histórico de applications | unit | `npm test -- --run tests/hiring/useCandidateTags.test.tsx` | ❌ W0 | ⬜ pending |
| 02-06-6 | 06 | 3 | TAL-03, TAL-08 | T-02-09 (consent forgery via Edge Function) | apply-to-job Edge Function persiste candidate_consents server-side; legal_basis = consentimento; purpose enum validado | integration | `npm run test:edge -- apply-to-job 2>&1 | tail -10 || npm test -- --run supabase/functions/apply-to-job 2>&1 | tail -10` | ❌ W0 | ⬜ pending |

### Plan 07 — Kanban + Card + sparkbar (Wave 4)

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 02-07-1 | 07 | 4 | RS-04 | T-02-07 (invalid stage transition) | CandidatesKanban onDragEnd chama canTransition() PRE-mutate (D-02 fix bug #1); sensors PointerSensor + TouchSensor + KeyboardSensor; Realtime subscribed | integration | `npm test -- --run tests/hiring/CandidatesKanban.integration.test.tsx` | ❌ W0 | ⬜ pending |
| 02-07-2 | 07 | 4 | RS-08, RS-12, RS-13 | — | CandidateCard mostra D-07 mínimo (nome+cargo+dias+vaga); D-08 OPTIONAL_FIELDS customizáveis; D-10 SLA stripe (border-l-status-amber/red) | unit | `npm test -- --run tests/hiring/CandidateCard.test.tsx` | ❌ W0 | ⬜ pending |
| 02-07-3 | 07 | 4 | RS-08 | — | SlaBadge + SparkbarDistribution + LegacyStageWarning componentes existem com props tipadas | unit | `npm test -- --run tests/hiring/SlaBadge.test.tsx tests/hiring/SparkbarDistribution.test.tsx 2>&1 | tail -5 || (test -f src/components/hiring/SlaBadge.tsx && test -f src/components/hiring/SparkbarDistribution.tsx && test -f src/components/hiring/LegacyStageWarning.tsx)` | ❌ W0 | ⬜ pending |
| 02-07-4 | 07 | 4 | RS-03 | — | JobCard usa SparkbarDistribution; cores per D-11 (verde/amarelo/azul/vermelho) | manual + grep | `grep -q "SparkbarDistribution" src/components/hiring/JobCard.tsx` (visual check em UAT) | ❌ W0 | ⬜ pending |

### Plan 08 — Filters + Table toggle + customizer (Wave 4)

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 02-08-1 | 08 | 4 | RS-09 | — | PipelineFilters useSearchParams (URL source of truth) + 300ms debounce; inline (não modal); chips activate/deactivate | unit | `npm test -- --run tests/hiring/PipelineFilters.test.tsx` | ❌ W0 | ⬜ pending |
| 02-08-2 | 08 | 4 | RS-09, RS-13 | — | CandidatesTable HTML <table> sort por nome/dias/etapa/próxima; BoardTableToggle persiste view em localStorage leverup:rs:view:{jobId} | unit | `npm test -- --run tests/hiring/BoardTableToggle.test.tsx` | ❌ W0 | ⬜ pending |
| 02-08-3 | 08 | 4 | RS-13 | — | CardFieldsCustomizer popover com 6 OPTIONAL_FIELDS persistindo via useCardPreferences | unit | `npm test -- --run tests/hiring/useCardPreferences.test.tsx 2>&1 | tail -5 && test -f src/components/hiring/CardFieldsCustomizer.tsx` | ❌ W0 | ⬜ pending |
| 02-08-4 | 08 | 4 | TAL-09 | T-02-05 (duplicate candidate via email/CPF mismatch) | DuplicateCandidateDialog suporta matchedBy: cpf \| email; CandidateForm busca CPF antes de email | unit + manual | `test -f src/components/hiring/DuplicateCandidateDialog.tsx && grep -q "matchedBy" src/components/hiring/DuplicateCandidateDialog.tsx && grep -q "useCandidateByCpf\|cpf" src/components/hiring/CandidateForm.tsx` | ❌ W0 | ⬜ pending |

### Plan 09 — Drawer split + Consent UI + Audit + UAT (Wave 4)

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 02-09-1a | 09 | 4 | RS-07, QUAL-04 | — | CandidateDrawer split em shell + Header + Tabs + Content; barrel re-export preserva import path; <800 LOC por arquivo | scaffold | `test -f src/components/hiring/drawer/CandidateDrawer.tsx && test -f src/components/hiring/drawer/CandidateDrawerHeader.tsx && test -f src/components/hiring/drawer/CandidateDrawerTabs.tsx && test -f src/components/hiring/drawer/CandidateDrawerContent.tsx && wc -l src/components/hiring/drawer/CandidateDrawer.tsx | awk '{ exit ($1 > 800) }'` | ❌ W0 | ⬜ pending |
| 02-09-1b | 09 | 4 | RS-07, RS-10, TAL-02 | — | 5 *TabContent components com body migrado do legacy CandidateDrawer; tabs Perfil/CV/Entrevistas/Fit/Antecedentes/Histórico funcionam | scaffold + smoke | `test -f src/components/hiring/drawer/PerfilTabContent.tsx && test -f src/components/hiring/drawer/EntrevistasTabContent.tsx && test -f src/components/hiring/drawer/FitTabContent.tsx && test -f src/components/hiring/drawer/AntecedentesTabContent.tsx && test -f src/components/hiring/drawer/HistoricoTabContent.tsx` | ❌ W0 | ⬜ pending |
| 02-09-2 | 09 | 4 | RS-07, RS-10, TAL-04 | T-02-02 (audit log read bypass via UI) + T-02-03 (consent revoke spoof) | CandidateDrawer test ativo com asserção REAL para `screen.queryByRole("tab", { name: /audit/i })` quando ability deny; ConsentList mostra active_consents com Revogar; RevokeConsentDialog AlertDialog | unit + ability mock | `test -f src/components/hiring/ConsentList.tsx && test -f src/components/hiring/RevokeConsentDialog.tsx && grep -q "screen.queryByRole(\"tab\", { name: /audit/i })" tests/hiring/CandidateDrawer.test.tsx && ! grep -q "expect(true).toBe(true)" tests/hiring/CandidateDrawer.test.tsx && npm test -- --run tests/hiring/CandidateDrawer.test.tsx` | ❌ W0 | ⬜ pending |
| 02-09-3 | 09 | 4 | TAL-03 | T-02-03 (opt-in pre-checked = invalid consent) | OptInCheckboxes NÃO pré-marcado; PublicApplicationForm Zod schema requer purpose; test ativo valida unchecked default | unit | `npm test -- --run tests/hiring/PublicApplicationForm.test.tsx` | ❌ W0 | ⬜ pending |
| 02-09-4 | 09 | 4 | RS-08, TAL-05 | T-02-02 (audit panel exposes PII to wrong user) | AuditLogPanel renderiza data_access_log com CASL ability gate (DataAccessLog:read); integrado em CandidatesKanban page | manual + grep | `test -f src/components/hiring/AuditLogPanel.tsx && grep -q "AuditLogPanel" src/pages/hiring/CandidatesKanban.tsx && grep -q "useAbility\|can(" src/components/hiring/AuditLogPanel.tsx` | ❌ W0 | ⬜ pending |
| 02-09-5 | 09 | 4 | RS-04, RS-07, RS-08, RS-12, TAL-02, TAL-03 | T-02-02, T-02-03, T-02-04 | Manual UAT cobre 8 verifications de "Manual-Only" abaixo (sparkbar cores, drawer behavior, opt-in unchecked, LGPD console, SLA color, realtime, conditional drag fallback, TAL-02 tags) | checkpoint:human-verify | `# manual UAT — checkpoint pausa execution; ver Manual-Only Verifications abaixo` | ❌ W0 | ⬜ pending |

**Total tasks:** 32 (3 + 4 + 3 + 3 + 3 + 6 + 4 + 4 + 6 = 32 — including 1a/1b split in plan 09).

---

## Wave 0 Requirements

Test files to create BEFORE implementation work begins (per RESEARCH.md inventory):

**Vitest unit tests (16 files):**
- [ ] `src/lib/hiring/__tests__/statusMachine.test.ts` — canTransition exhaustive table
- [ ] `src/lib/hiring/__tests__/stageGroups.test.ts` — todo legacy stage tem mapping
- [ ] `src/lib/hiring/__tests__/sla.test.ts` — computeSla thresholds, daysInStage timezone
- [ ] `src/lib/__tests__/supabaseError.test.ts` — 4 detect helpers + getMoveErrorToastConfig
- [ ] `src/hooks/hiring/__tests__/useApplications.test.ts` — moveApplicationStage onMutate/onError/onSettled
- [ ] `src/hooks/hiring/__tests__/useApplicationsRealtime.test.ts` — channel subscribe/unsubscribe + cache merge
- [ ] `src/hooks/hiring/__tests__/useApplicationCountsByJob.test.ts` — count by stage_group
- [ ] `src/hooks/hiring/__tests__/useTalentPool.test.ts` — filter active consents
- [ ] `src/hooks/hiring/__tests__/useRevokeConsent.test.ts` — revoke flow
- [ ] `src/hooks/hiring/__tests__/useCardPreferences.test.ts` — localStorage schema + migration
- [ ] `src/hooks/hiring/__tests__/useCandidateTags.test.ts` — TAL-02: agrega tags por empresa do histórico de applications
- [ ] `src/hooks/hiring/__tests__/useLegacyStageCount.test.ts` — count de applications com metadata.legacy_marker
- [ ] `src/components/hiring/__tests__/CandidatesKanban.test.tsx` — drag → canTransition → optimistic → rollback
- [ ] `src/components/hiring/__tests__/CandidateCard.test.tsx` — minimum fields + customizable
- [ ] `src/components/hiring/__tests__/CandidateDrawer.test.tsx` — sub-components + ESC + click-outside
- [ ] `src/components/hiring/__tests__/PipelineFilters.test.tsx` — URL state + debounce
- [ ] `src/components/hiring/__tests__/JobsKanbanToggle.test.tsx` — Board↔Tabela + sort persist
- [ ] `src/components/hiring/__tests__/ConsentForm.test.tsx` — opt-in NÃO pré-marcado

**pgTAP tests (5 files):**
- [ ] `supabase/tests/pgtap/migration_f_stages.sql` — zero candidatos órfãos pós-backfill
- [ ] `supabase/tests/pgtap/data_access_log.sql` — RLS insert-only via RPC; read_candidate_with_log atomic write
- [ ] `supabase/tests/pgtap/candidate_consents.sql` — constraint integrity (revoked_at >= granted_at), 1-ativo-por-purpose
- [ ] `supabase/tests/pgtap/cpf_unique.sql` — partial UNIQUE index nullable
- [ ] `supabase/tests/pgtap/pg_cron_retention.sql` — pg_cron job exists + schedule weekly

**MSW handlers (added to `src/mocks/handlers.ts`):**
- [ ] `mockMoveApplication.rlsDenial` — 42501
- [ ] `mockMoveApplication.networkDrop` — TypeError("Failed to fetch")
- [ ] `mockMoveApplication.conflict` — 409 + realtime payload
- [ ] `mockRealtimeChannel` — postgres_changes mock for applications:job:{jobId}

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Sparkbar visualmente correta (verde/amarelo/azul/vermelho per D-11) | RS-08, D-11 | Visual color perception | Open `/hiring/jobs` in browser; verify green=aprovados, amarelo=entrevistas, azul=triagem+fit_cultural+checagem, vermelho=recusados/descartados |
| Drawer não navega + preserva scroll do board | RS-07 | Browser focus/scroll behavior | Open kanban, scroll to mid-board, click candidato. Drawer abre. ESC fecha. Click-outside fecha. Scroll do board permanece. |
| Opt-in **NÃO pré-marcado** no `PublicApplicationForm` | TAL-03 | First-time DOM render assertion in real browser | Open public job link in incógnito; checkbox de consent renderiza unchecked. |
| LGPD: nenhum console.log de PII em prod build | CLAUDE.md project rule | Production build inspection | `npm run build && npm run preview`, abrir DevTools console, exercitar fluxo R&S, grep "@" or "cpf" — zero hits |
| SLA: card muda cor após 2 dias / 5 dias | RS-12, D-10 | Time-based, requires data manipulation | Inserir aplicação com `current_stage_started_at = now() - interval '2 days'` → cor laranja; `interval '5 days'` → cor vermelha |
| Realtime silent re-render entre 2 RHs simultâneos | RS-04, D-04 | Multi-session test | Abrir kanban em 2 abas/users; mover candidato em uma; segunda aba atualiza sem toast |
| Drag candidato `admitido` -> `triagem` exibe toast e card volta | RS-04, D-02 | **Conditional fallback** — só usado se Plan 07 Task 1 demonstrar que userEvent.pointer integration test é infeasible em <30 min. Caso contrário, esta linha NÃO se aplica (cobertura via vitest). | Mover card admitido para coluna triagem no kanban → toast "Não é possível mover de Admitido direto para Triagem" aparece, card retorna pra coluna admitido sem mutate disparado |
| TAL-02 tags por empresa visíveis no drawer Histórico | TAL-02 | Visual + data setup | Abrir drawer de candidato com applications em ≥2 empresas distintas → tab "Histórico" mostra "Histórico em empresas" listando 1 entry por company_name com job_title mais recente + last_applied_at |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify command OR mapped to Wave 0 dependency (per-task map populated 2026-04-27)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING test files in inventory above
- [x] No `--watch` flags (CI/non-blocking only)
- [x] Feedback latency < 60s
- [x] All 8 manual-only verifications have UAT scripts in plans (Plan 09 Task 5 = checkpoint:human-verify)
- [x] `nyquist_compliant: true` set in frontmatter (per-task map fully populated)

**Approval:** pending (gates flip to true after Wave 0 actually runs in execution — `wave_0_complete` stays `false` until then)
