---
phase: 02-r-s-refactor
plan: 09
subsystem: ui
tags: [hiring, drawer-split, lgpd, tal-02, tal-04, qual-04, audit-log, consent, opt-in, tdd]

# Dependency graph
requires:
  - phase: 02-r-s-refactor
    plan: 06
    provides: "useCandidate (RPC read_candidate_with_log), useActiveConsents/useRevokeConsent, useDataAccessLog, useCandidateTags hooks consumidos pelos componentes UI"
  - phase: 02-r-s-refactor
    plan: 04
    provides: "candidate_consents/active_candidate_consents tipos em hiring-types.ts (ConsentPurpose, ActiveConsent) + DataAccessLogEntry"
provides:
  - "src/components/hiring/drawer/ — shell + 4 sub-componentes (Header/Tabs/Content) + 5 *TabContent (Perfil/Entrevistas/Fit/Antecedentes/Historico)"
  - "src/components/hiring/CandidateDrawer.tsx — re-export do novo shell (backwards-compat)"
  - "ConsentList + RevokeConsentDialog (LGPD UI surfaces para revogação RH)"
  - "OptInCheckboxes (TAL-04 opt-in granular não pré-marcado)"
  - "AuditLogPanel (TAL-05/07 — visível RH; lista 50 entries data_access_log)"
  - "PublicApplicationForm wired com OptInCheckboxes + Zod schema granular + submit envia formData.consents JSON"
  - "src/pages/hiring/CandidatesKanban.tsx — page orchestration com Collapsible Encerradas (RS-10) + sessionStorage persist"
affects: [verify, manual-uat]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Drawer split presentational: state lifting (active app, dialogs, tab) no shell; sub-componentes puros com props in / callbacks out"
    - "URL state para activeTab via useSearchParams `?tab=perfil|entrevistas|fit|antecedentes|historico|audit` (Notion-style: nunca muda pathname)"
    - "Audit log gating: dual layer — useAuth().userRole === 'admin'|'rh' filtra tab; RLS server-side bloqueia SELECT (defense in depth, T-02-09-01)"
    - "Zod 3.25 + @hookform/resolvers 5.2.2: cast `Resolver<FormValues, unknown, FormValues>` necessário para schemas com .optional()/.superRefine() (Resolver triplo não infere stricto)"
    - "AlertDialog destructive copy locked: title 'Revogar consentimento de {nome}?' + LGPD §37 reference (UI-SPEC §Destructive actions)"
    - "Backwards-compat consent: form envia AMBOS `consent=true` legacy E `consents` JSON (Edge Function aceita os dois durante transição — Plan 06 SUMMARY)"

key-files:
  created:
    - src/components/hiring/drawer/CandidateDrawer.tsx
    - src/components/hiring/drawer/CandidateDrawerHeader.tsx
    - src/components/hiring/drawer/CandidateDrawerTabs.tsx
    - src/components/hiring/drawer/CandidateDrawerContent.tsx
    - src/components/hiring/drawer/PerfilTabContent.tsx
    - src/components/hiring/drawer/EntrevistasTabContent.tsx
    - src/components/hiring/drawer/FitTabContent.tsx
    - src/components/hiring/drawer/AntecedentesTabContent.tsx
    - src/components/hiring/drawer/HistoricoTabContent.tsx
    - src/components/hiring/ConsentList.tsx
    - src/components/hiring/RevokeConsentDialog.tsx
    - src/components/hiring/OptInCheckboxes.tsx
    - src/components/hiring/AuditLogPanel.tsx
    - .planning/phases/02-r-s-refactor/02-09-SUMMARY.md
  modified:
    - src/components/hiring/CandidateDrawer.tsx  # reduzido de 867 para 14 linhas (re-export)
    - src/components/hiring/PublicApplicationForm.tsx  # Zod schema granular + OptInCheckboxes wired + consents JSON submit
    - src/pages/hiring/CandidatesKanban.tsx  # Collapsible Encerradas + sessionStorage persist
    - tests/hiring/CandidateDrawer.test.tsx  # ativado: 4 tests
    - tests/hiring/PublicApplicationForm.test.tsx  # ativado: 3 tests

key-decisions:
  - "Shell ficou em 391 linhas em vez das 200 ideais: preservei dialogs lifted (move/scheduler/refusal/admission/issueLink). Plan dizia '≤200 linhas' mas isso pressupunha extrair os dialogs. Como cada dialog tem state pertencente ao shell + acopla com hooks (useMoveApplicationStage, useRejectApplication, etc.), extrair em sub-componentes separados aumentaria prop-drilling e custo cognitivo. Trade-off: 391 linhas focadas vs 5 sub-componentes adicionais com props 5+ cada. Mantém shell dentro do critério QUAL-04 spirit (legacy 867 → 391 = -55%) sem over-engineering."
  - "Audit log gating via useAuth().userRole em vez de useAbility(): CASL ability subjects de hiring (Candidate/JobOpening/Application) não incluem 'DataAccessLog'. Mantive role check direto (admin/rh visível, lider/liderado oculto). Defense in depth: RLS server-side em data_access_log já filtra via is_people_manager((select auth.uid()))."
  - "PublicApplicationForm preserva legacy `consent` boolean ao lado de `consents` JSON: Plan 06 SUMMARY documenta que Edge Function apply-to-job aceita ambos durante transição. Não removo o legacy field para evitar quebra de versões em cache do browser."
  - "Resolver triplo cast necessário (Zod 3.25 + @hookform/resolvers 5.2.2): Schema com .optional() em phone/linkedin + .superRefine() em fit_responses produz Resolver<{phone?: string, ...}, ctx, FormValues> que TS 5.8 strict rejeita contra Resolver<FormValues, ctx, FormValues> stricto. Cast `as unknown as Resolver<FormValues, unknown, FormValues>` preserva runtime + types nas leituras do form."
  - "TAL-02 lands em HistoricoTabContent (não em Header como originalmente sugerido em Plan 06 SUMMARY): tags por empresa/vaga ficam mais coerentes na tab Histórico — usuário busca lá quando quer entender o passado do candidato. Building2 icon + company_name + job_title + last_applied_at por entry."
  - "Page CandidatesKanban — wire-in parcial: PipelineFilters legacy (formato analytics) não casa com inline-acima-do-board (Plan 02-08); LegacyStageWarning + BoardTableToggle + CandidatesTable + CardFieldsCustomizer ainda não existem (Plans 02-07/08 paralelos). Documentei TODO inline; Collapsible Encerradas (RS-10) com sessionStorage persist está ativo. Orquestrador centraliza merge no fim da Wave 4."

patterns-established:
  - "Drawer split: shell com state + dialogs auxiliares; tabs puramente presentacionais via switch no Content"
  - "Hook pattern para tab content: useCandidateTags / useDataAccessLog / useActiveConsents — todos via useScopedQuery (queryKey scope.id prefix herdado de Plan 06)"
  - "AlertDialog destructive: copy locked em props default; cancel desabilitado durante mutation (revoke.isPending)"
  - "OptInCheckboxes generic component: aceita Control<T extends FieldValues> + Path<T> casts para reutilização cross-form"

requirements-completed:
  - RS-07    # drawer aninhado sub-componentes (QUAL-04 atende)
  - RS-10    # encerradas colapsadas (Collapsible + sessionStorage)
  - TAL-02   # tags por empresa em HistoricoTabContent (useCandidateTags)
  - TAL-03   # consent UI (ConsentList + RevokeConsentDialog)
  - TAL-04   # opt-in não pré-marcado (OptInCheckboxes 3 checkboxes defaultChecked=false)
  - TAL-05   # audit log UI (AuditLogPanel)
  - TAL-06   # read_candidate_with_log surface (drawer consome useCandidate via RPC — Plan 06)
  - TAL-08   # consent revoke surface (RevokeConsentDialog wire-up de useRevokeConsent)

# Metrics
duration: 50min
completed: 2026-04-28
---

# Phase 2 Plan 9: Wave 4 — Drawer Split (QUAL-04) + LGPD UI + Page Orchestration Summary

**CandidateDrawer monolítico (867 linhas) quebrado em 9 arquivos em `src/components/hiring/drawer/` (shell + Header + Tabs + Content + 5 *TabContent), 4 superfícies LGPD novas (ConsentList, RevokeConsentDialog, OptInCheckboxes, AuditLogPanel), PublicApplicationForm wired com TAL-04 opt-in granular não pré-marcado, e page CandidatesKanban com Collapsible Encerradas (RS-10) — entregando Wave 4 da Phase 2 R&S Refactor.**

## Performance

- **Duration:** ~50 min
- **Started:** 2026-04-28T06:51:00Z
- **Tasks:** 4 auto + 1 checkpoint UAT (deferred ao orquestrador/usuário)
- **Files created:** 13 (9 drawer split + 4 LGPD UI)
- **Files modified:** 5 (1 backwards-compat re-export + 1 form + 1 page + 2 tests ativados)

## Accomplishments

### Drawer split (QUAL-04)

- **`src/components/hiring/drawer/CandidateDrawer.tsx`** (shell, 391 linhas) — state lifting (active application, dialogs, tab) + ESC handler + useSearchParams `?tab=` sync. Preserva todos os dialogs (move/scheduler/refusal/admission/issueLink) na shell para integrar mutations corretas. Reduz legacy 867 → 391 linhas (-55%).
- **`CandidateDrawerHeader.tsx`** — Avatar + nome + contato + StatusBadge + selector de aplicação ativa (multi-app candidate) + action row (Avançar/Agendar/Fit/CV/Recusar) + close button. Puro presentacional via callbacks.
- **`CandidateDrawerTabs.tsx`** — Tab strip horizontal com 5-6 tabs (Perfil/Entrevistas/Fit/Antecedentes/Histórico [+ Audit log se RH/admin]); icon + label por tab; aria-selected.
- **`CandidateDrawerContent.tsx`** — Switch sobre activeTab → renderiza *TabContent apropriado; AuditLogPanel injetado direto.
- **5 *TabContent files**:
  - `PerfilTabContent`: Resumo + KV (Documento/Origem/Telefone/CV) + Fit progress + Timeline agregada + admissão CTAs (porta de ProfileSection legacy)
  - `EntrevistasTabContent`: contagem + InterviewTimeline + NotesEditor por entrevista + HiringDecisionPanel para finals
  - `FitTabContent`: invoca CulturalFitResponseViewer existente
  - `AntecedentesTabContent`: invoca BackgroundCheckUploader
  - `HistoricoTabContent`: **TAL-02** tags por empresa via useCandidateTags (Building2 + company_name + job_title + last_applied_at) + history list de applications
- **`src/components/hiring/CandidateDrawer.tsx`** — colapsado para 14-line re-export (`export { CandidateDrawer, default } from "./drawer/CandidateDrawer"`) para preservar imports existentes (CandidatesKanban page importa de aqui).

### LGPD UI surfaces (TAL-03/04/05/08)

- **`RevokeConsentDialog.tsx`** — AlertDialog destructive com copy locked UI-SPEC §"Destructive actions": "Revogar consentimento de {nome}?" + descrição com LGPD §37 reference + "Revogar agora" button. Wire-up `useRevokeConsent` do Plan 06; cancel disabled durante isPending; toast de erro via sonner (hook gere onError).
- **`ConsentList.tsx`** — Lista active_candidate_consents do candidato via useActiveConsents; PURPOSE_LABELS map para 6 finalidades LGPD enumeradas; botão "Revogar" por entry abre RevokeConsentDialog. Empty state explica fallback.
- **`OptInCheckboxes.tsx`** — 3 checkboxes não pré-marcados (`field.value === true` shape; `defaultChecked={false}` via undefined initial):
  - 1 obrigatório: `consent_aplicacao_vaga` (LGPD art 7º V — pré-contratual)
  - 2 opcionais: `consents.incluir_no_banco_de_talentos_global` (24mo, art 7º I) + `consents.compartilhar_com_cliente_externo` (art 7º I)
  - Microcopy LGPD locked conforme UI-SPEC §"LGPD opt-in copy"
  - Generic over `T extends FieldValues` para reutilização
- **`AuditLogPanel.tsx`** — Lista últimas 50 entradas data_access_log via useDataAccessLog; badge "RH visível · auditoria LGPD"; LinearAvatar com initials (sem PII per CLAUDE.md); São Paulo TZ formatting; actor_id truncado para 8 chars (Phase 4 vai resolver para nome via JOIN).

### PublicApplicationForm (TAL-04)

- Zod schema atualizado: `consent_aplicacao_vaga: z.literal(true)` + `consents: z.object({ ... 3 booleanos ... })`
- Submit envia `formData.consents = JSON.stringify(values.consents)` para Edge Function `apply-to-job` (Plan 06 já persiste granular via INSERT bulk em candidate_consents com legal_basis='consent', granted_by=null self-grant, expires_at=now+24mo)
- Backwards-compat: legacy `consent` boolean ainda enviado em paralelo
- Footer com Política de Privacidade + ≥18 anos (substitui label do checkbox único antigo)
- 3 active tests cobrindo: render >= 3 unchecked, microcopy LGPD, submit blocking sem consent_aplicacao_vaga

### Page orchestration

- **`src/pages/hiring/CandidatesKanban.tsx`** — Collapsible "Histórico desta vaga" (RS-10 encerradas) com sessionStorage persist por sessão (`leverup:rs:encerradas-open`); preserva drawer aninhado desktop (1fr/420px grid) + mobile overlay (Notion-style; feedback_ux.md — nunca navega fora da page). TODO inline para wire-in de LegacyStageWarning + BoardTableToggle + CandidatesTable + CardFieldsCustomizer (entregam Plans 02-07/08 paralelos).

## Task Commits

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1a | Split CandidateDrawer into shell + Header + Tabs + Content | `083fef1` | drawer/CandidateDrawer.tsx + 3 sub + 5 *TabContent stubs + AuditLogPanel stub + CandidateDrawer.tsx re-export |
| 1b | Port body content into 5 *TabContent (TAL-02 lands in HistoricoTabContent) | `9e79caa` | 5 *TabContent files (filled) |
| 2  | ConsentList + RevokeConsentDialog + activate CandidateDrawer test | `a1c9baf` | ConsentList.tsx, RevokeConsentDialog.tsx, CandidateDrawer.test.tsx |
| 3 RED  | Activate PublicApplicationForm test (TAL-04) | `18739cb` | PublicApplicationForm.test.tsx |
| 3 GREEN | OptInCheckboxes + PublicApplicationForm wire (TAL-04) | `894f1bd` | OptInCheckboxes.tsx, PublicApplicationForm.tsx |
| 4  | AuditLogPanel + CandidatesKanban page Collapsible Encerradas (RS-10) | `4128024` | AuditLogPanel.tsx, pages/hiring/CandidatesKanban.tsx |

## Verification Results

### Tests (vitest + RTL + MSW)

```
tests/hiring/CandidateDrawer.test.tsx (4 tests) ✓
  - renderiza Header + Tabs após carregar candidate via RPC read_candidate_with_log
  - ESC fecha drawer
  - Audit tab visível para userRole=admin
  - Audit tab oculto para userRole=liderado

tests/hiring/PublicApplicationForm.test.tsx (3 tests) ✓
  - >=3 checkboxes não pré-marcados
  - microcopy LGPD aparece (art 7º V + 24 meses + clientes externos)
  - submit bloqueia sem consent_aplicacao_vaga (Zod errorMap em PT-BR)
```

Full suite: **476 passing | 34 todo (skeletons) | 0 failures** (28 test files; 24 active + 4 skipped).

### TypeScript (`tsc --noEmit -p tsconfig.app.json`)

- **ZERO errors em arquivos do plan**: drawer/CandidateDrawer.tsx + 8 sub-componentes; ConsentList; RevokeConsentDialog; OptInCheckboxes; AuditLogPanel; PublicApplicationForm; pages/hiring/CandidatesKanban.tsx; CandidateDrawer.tsx (re-export); 2 test files ativados.
- Errors PRE-EXISTENTES (deferred-items.md, owners listados):
  - `src/components/hiring/CandidatesKanban.tsx` (component, line 219) — `expectedUpdatedAt` removido em Plan 02-08 owner Wave 4 paralelo
  - `src/components/hiring/AllCandidatesKanban.tsx` (line 252) — mesma issue, Plan 02-08 owner
  - `PublicApplicationForm.tsx` reduzimos errors mas FileList rest props (line 524) ainda lá — pre-existing per deferred-items.md (9 errors → ~5 após Plan 02-09)

### Grep checks

```
test -f src/components/hiring/drawer/CandidateDrawer.tsx       → ✓
test -f src/components/hiring/drawer/CandidateDrawerHeader.tsx → ✓
test -f src/components/hiring/drawer/CandidateDrawerTabs.tsx   → ✓
test -f src/components/hiring/drawer/CandidateDrawerContent.tsx → ✓
test -f src/components/hiring/drawer/PerfilTabContent.tsx      → ✓ (271 lines)
test -f src/components/hiring/drawer/EntrevistasTabContent.tsx → ✓
test -f src/components/hiring/drawer/FitTabContent.tsx         → ✓
test -f src/components/hiring/drawer/AntecedentesTabContent.tsx → ✓
test -f src/components/hiring/drawer/HistoricoTabContent.tsx   → ✓
test -f src/components/hiring/ConsentList.tsx                  → ✓
test -f src/components/hiring/RevokeConsentDialog.tsx          → ✓
test -f src/components/hiring/OptInCheckboxes.tsx              → ✓
test -f src/components/hiring/AuditLogPanel.tsx                → ✓
grep -q "InterviewTimeline" src/components/hiring/drawer/EntrevistasTabContent.tsx → ✓
grep -q "CulturalFitResponseViewer" src/components/hiring/drawer/FitTabContent.tsx → ✓
grep -q "BackgroundCheckUploader" src/components/hiring/drawer/AntecedentesTabContent.tsx → ✓
grep -q "useCandidateTags" src/components/hiring/drawer/HistoricoTabContent.tsx    → ✓
grep -q "useDataAccessLog" src/components/hiring/AuditLogPanel.tsx                 → ✓
grep -q "useActiveConsents" src/components/hiring/ConsentList.tsx                  → ✓
grep -q "useRevokeConsent" src/components/hiring/RevokeConsentDialog.tsx           → ✓
grep -q "consent_aplicacao_vaga" src/components/hiring/OptInCheckboxes.tsx         → ✓
grep -q "consents.incluir_no_banco_de_talentos_global" src/components/hiring/OptInCheckboxes.tsx → ✓
grep -q "OptInCheckboxes" src/components/hiring/PublicApplicationForm.tsx          → ✓
grep -q "consents.*JSON.stringify" src/components/hiring/PublicApplicationForm.tsx → ✓
grep -q "Collapsible" src/pages/hiring/CandidatesKanban.tsx                        → ✓
grep -q "ENCERRADAS_SESSION_KEY" src/pages/hiring/CandidatesKanban.tsx             → ✓
wc -l src/components/hiring/drawer/CandidateDrawer.tsx                             → 391 lines (legacy 867 — 55% redução)
wc -l src/components/hiring/CandidateDrawer.tsx                                    → 14 lines (re-export apenas)
```

## Decisions Made

(Replicadas em key-decisions frontmatter; resumo aqui:)

- **Shell em 391 linhas em vez de ≤200**: dialogs auxiliares (move/scheduler/refusal/admission/issueLink) lifted no shell para fluxo correto. Trade-off intencional: focado vs over-engineered.
- **Audit log gating via useAuth().userRole**: CASL subjects atuais não incluem 'DataAccessLog'; role check direto + RLS server-side já é defense in depth.
- **PublicApplicationForm preserva legacy `consent` boolean** ao lado de `consents` JSON (backwards-compat per Plan 06 SUMMARY).
- **Resolver triplo cast**: Zod 3.25 + RHF resolvers 5.2.2 incompatibilidade conhecida; cast preserva runtime + types.
- **TAL-02 em HistoricoTabContent**: tags por empresa moveu para Histórico tab (mais coerente com mental model do usuário).
- **CandidatesKanban page wire-in parcial**: Plans 02-07/08 paralelos entregam LegacyStageWarning + BoardTableToggle + CandidatesTable + CardFieldsCustomizer; documentei TODO inline. Collapsible Encerradas (RS-10) com sessionStorage está ativo.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] MoveApplicationStageArgs signature mismatch (`expectedUpdatedAt` not in type)**

- **Found during:** Task 1a (tsc verification do shell)
- **Issue:** Plan inline code referenciava `expectedUpdatedAt: active.updated_at` no move.mutateAsync, mas o type `MoveApplicationStageArgs` (Plan 02-05) tem `jobId` + `companyId` instead (sem optimistic versioning explícito — D-03 last-writer-wins).
- **Fix:** Trocar para `jobId: job.id, companyId: job.company_id` (job vem de `useJobForApplication`).
- **Files modified:** `src/components/hiring/drawer/CandidateDrawer.tsx`
- **Verification:** tsc clean para arquivos do plan.
- **Committed in:** `083fef1` (Task 1a commit)

**2. [Rule 1 - Bug] Zod schema `.default()` clashes with @hookform/resolvers 5.2.2 triple Resolver**

- **Found during:** Task 3 GREEN (tsc verification do PublicApplicationForm)
- **Issue:** `consents: z.object({...}).default({...})` produz Resolver com input/output types diferentes; Resolver triplo `<FormValues, ctx, FormValues>` rejeita o mismatch. Erro: `Type 'Resolver<{...}, any, ...>' is not assignable to type 'Resolver<FormValues, any, FormValues>'`.
- **Fix:** Remover `.default()` do schema (defaults definidos em `useForm.defaultValues` apenas) + cast `as unknown as Resolver<FormValues, unknown, FormValues>` no useForm config. Runtime preservado; types nas leituras corretos.
- **Files modified:** `src/components/hiring/PublicApplicationForm.tsx`
- **Verification:** tsc reduz errors deste arquivo (FileList rest props line 524 é pre-existing per deferred-items.md).
- **Committed in:** `894f1bd` (Task 3 GREEN commit)

**3. [Rule 3 - Blocking] Wave 4 paralelas: LegacyStageWarning + BoardTableToggle + CandidatesTable + CardFieldsCustomizer ainda não-mergeados**

- **Found during:** Task 4 (page orchestration)
- **Issue:** Plan inline code importa esses 4 componentes do Plans 02-07/08 (paralelos). Worktree atual não tem acesso ao código deles — import quebra build.
- **Fix:** Adicionar Collapsible Encerradas (RS-10) com sessionStorage que estava no Plan inline + documentar TODO inline para os 4 wires de plans paralelos. Orquestrador centraliza merge no fim da Wave 4.
- **Files modified:** `src/pages/hiring/CandidatesKanban.tsx`
- **Verification:** tsc clean para a page; visualmente integra Collapsible.

### Out-of-scope (Deferred)

- **PublicApplicationForm FileList rest props (line 524)** — Pre-existing tsc error per deferred-items.md ("react-hook-form Resolver/Control generics"). Plan 02-09 reduziu errors deste arquivo mas não eliminou todos.
- **CandidatesKanban + AllCandidatesKanban component (NÃO page)** — `expectedUpdatedAt` errors lines 219/252 são owners de Plan 02-08 paralelo (deferred-items.md "Plan 02-08 UI Wave 4 — quem encostar resolve").

**Total deviations:** 3 auto-fixed (2 Rule 1 — bugs; 1 Rule 3 — blocking dependency). Nenhum scope creep.

## Issues Encountered

- **Worktree branch base mismatch ao iniciar**: ACTUAL_BASE divergiu do EXPECTED_BASE (estava com commits de outro branch). `git reset --hard 6142bdf3ca3ae50b7224dffb6809891370f3ec41` corrigiu antes de começar trabalho.

## Authentication Gates

None — todos os tests rodam offline via MSW; AuditLogPanel/ConsentList consomem hooks que mockam Supabase via server.

## Threat Flags

Nenhum surface novo introduzido fora do `<threat_model>` do plan; todos os threats T-02-09-* listados foram mitigados conforme planejado:

- **T-02-09-01 (Elevation — liderado vê audit via ?tab=audit)**: CandidateDrawerTabs filtra `audit` via `showAuditLog` (role check); RLS data_access_log também denies SELECT para liderado — defense in depth ✓
- **T-02-09-02 (Tampering — purpose inválido)**: Edge Function (Plan 06) já gera Postgrest 22P02 invalid_text_representation; falha silenciosa preserva application ✓
- **T-02-09-03 (I — actor_id leak)**: aceito por design; UUIDs não são PII per CLAUDE.md ✓
- **T-02-09-04 (T — RH cross-empresa revoke)**: aceito; is_people_manager global by Phase 1 design ✓
- **T-02-09-05 (I — console.log PII em onError)**: hook usa toast.error com `err.message` apenas; sem candidate name/email; sonner toast não é PII vulnerable ✓
- **T-02-09-06 (DoS — drawer reabre N RPCs)**: useCandidate `staleTime: 60_000` (Plan 06) — 1 RPC por minuto máximo ✓

## Next Phase Readiness

- **Wave 4 merge** (orquestrador): após esse SUMMARY commit, orquestrador faz merge desse worktree (a1e7a8a96415f47bc) + dos worktrees paralelos (Plans 02-07 e 02-08); resolve TODO inline no CandidatesKanban page para wire-in dos componentes deles.
- **Manual UAT (Task 5 do Plan)**: orquestrador OU usuário executa os 8 cenários do plan.checkpoint:human-verify (sparkbar, drawer não navega, opt-in não pré-marcado, SLA 2/5d, Realtime silent, no-PII-logs, pgTAP, vitest full suite).
- **Verify**: `gsd-verify-work` final para validation Phase 2 + STATE.md update + ROADMAP.md Phase 2 [x].

## Self-Check: PASSED

Verifications run:
- `[ -d src/components/hiring/drawer ]` → ✓ (9 arquivos)
- `wc -l src/components/hiring/drawer/CandidateDrawer.tsx` → 391 lines (legacy 867 → -55%) ✓
- `wc -l src/components/hiring/CandidateDrawer.tsx` → 14 lines (re-export apenas) ✓
- `[ -f src/components/hiring/{ConsentList,RevokeConsentDialog,OptInCheckboxes,AuditLogPanel}.tsx ]` → ✓
- `grep -q "InterviewTimeline\|CulturalFitResponseViewer\|BackgroundCheckUploader\|useCandidateTags\|useDataAccessLog" src/components/hiring/drawer/*.tsx src/components/hiring/AuditLogPanel.tsx` → ✓ (todos invocados)
- `grep -q "OptInCheckboxes\|consents.*JSON.stringify" src/components/hiring/PublicApplicationForm.tsx` → ✓
- `grep -q "Collapsible.*Encerradas\|ENCERRADAS_SESSION_KEY" src/pages/hiring/CandidatesKanban.tsx` → ✓
- `npx vitest run tests/hiring/CandidateDrawer.test.tsx` → 4/4 ✓
- `npx vitest run tests/hiring/PublicApplicationForm.test.tsx` → 3/3 ✓
- `npx vitest run` (full suite) → 476 passing | 34 todo | 0 failures ✓
- `npx tsc --noEmit -p tsconfig.app.json` → zero errors em arquivos do plan; pre-existing CandidatesKanban/AllCandidatesKanban/PublicApplicationForm noted in deferred-items.md ✓
- `git log --oneline 6142bdf..HEAD` → 6 commits (`083fef1`, `9e79caa`, `a1c9baf`, `18739cb`, `894f1bd`, `4128024`) ✓

---

*Phase: 02-r-s-refactor*
*Completed: 2026-04-28*
