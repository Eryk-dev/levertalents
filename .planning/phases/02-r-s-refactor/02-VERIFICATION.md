---
phase: 02-r-s-refactor
verified: 2026-04-28T12:30:00Z
status: human_needed
score: 5/5 must-haves verified
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 3/5 (SC-3 partial, SC-1 wave-4 orphaned)
  gaps_closed:
    - "SC-1 (RS-09 + RS-13/V2-01) — PipelineFilters, BoardTableToggle, CandidatesTable, CardFieldsCustomizer, LegacyStageWarning all wired into src/pages/hiring/CandidatesKanban.tsx (Plan 02-10, commit 9e679e1)"
    - "SC-3 (RS-10) — CollapsibleContent placeholder replaced by real TerminalApplicationsList using useTerminalApplications hook (Plan 02-10, commit 9e679e1 + 29c95d9)"
  gaps_remaining: []
  regressions: []
deferred:
  - truth: "Vaga com confidencial=true é invisível para roles fora da curadoria (RS-11)"
    addressed_in: "v2 futuro (V2-08 ou decisão futura)"
    evidence: "CONTEXT.md decisão explícita: 'RS-11 (vaga confidencial) — usuário decidiu remover do escopo na sessão de discuss (vide Scope Changes). Volta como decisão futura.'"
human_verification:
  - test: "Arrastar card entre colunas no kanban"
    expected: "Card se move otimisticamente, permanece na coluna destino, não some nem pisca nem aparece duplicado"
    why_human: "Comportamento de drag-and-drop com dnd-kit não é testável com confiabilidade em jsdom; helpers de E2E do dnd-kit 6.x foram removidos"

  - test: "Abrir CandidateDrawer; verificar que página não navega para fora"
    expected: "Drawer abre na lateral/overlay; URL só muda para adicionar ?tab= mas pathname permanece /hiring/jobs/:id"
    why_human: "Comportamento de overlay Notion-style requer inspeção visual e navegação real no browser"

  - test: "Preencher PublicApplicationForm sem marcar consent_aplicacao_vaga e tentar submeter"
    expected: "Formulário bloqueia submit com erro Zod em PT-BR; os 3 checkboxes de opt-in NÃO estão pré-marcados ao abrir"
    why_human: "Comportamento de formulário público requer renderização real; o teste unitário cobre mas validação de UX exige olhar humano"

  - test: "Verificar sparkbar no JobCard: cores por grupo (azul triagem, amarelo entrevistas, verde decisão, vermelho descartados)"
    expected: "Segmentos de cor correspondem a STAGE_GROUP_BAR_COLORS — azul para triagem/fit/checagem, amarelo para entrevistas, verde para decisão/admissão, vermelho para descartados"
    why_human: "Verificação visual de cores em componente gráfico; lógica está testada em unit mas rendering exato requer inspeção"

  - test: "Card de candidato com stage_entered_at > 2 dias: verificar SLA stripe laranja; > 5 dias: vermelho"
    expected: "Borda esquerda do card muda de border-border para status-amber (2d) ou status-red (5d)"
    why_human: "Requer dados reais com timestamps específicos; não há seed de teste com datas relativas adequadas"

  - test: "AuditLogPanel visível para RH/admin; invisível para liderado"
    expected: "Tab 'Auditoria' aparece no drawer quando logado como admin.teste@levertalents.com; não aparece como mariana.costa@levertalents.com (lider)"
    why_human: "Requer autenticação real com dois usuários diferentes no browser"

  - test: "Banco de Talentos lista apenas candidatos com consent ativo (incluir_no_banco_de_talentos_global)"
    expected: "Candidato que revogou consent desaparece da listagem /hiring/talent-pool após revogação via RevokeConsentDialog"
    why_human: "Requer fluxo completo: inserir candidato com consent, revogar via UI, verificar desaparecimento — requer ambiente com dados reais"

  - test: "pgTAP suites 006–010 executam sem falha no projeto Supabase remote"
    expected: "supabase test db retorna 0 failures em todos os 5 suites de Migration F"
    why_human: "Requer credenciais do projeto Supabase ehbxpbeijofxtsbezwxd; não executável offline"
---

# Phase 2: R&S Refactor — Verification Report (Re-verification)

**Phase Goal:** Kanban de candidatos estável (corrige bug #1) + drawer aninhado + Banco de Talentos LGPD-compliant + UX-AUDIT wins.
**Verified:** 2026-04-28T12:30:00Z
**Status:** human_needed
**Re-verification:** Yes — after Plan 02-10 gap closure (commits 741148c, 29c95d9, 6191816, 9e679e1, 69bdca7, f687029 merged to main)

---

## Goal Achievement

### Observable Truths (Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| SC-1 | RH arrasta candidato; card move otimisticamente; bug #1 fechado; filtros inline; toggle Quadro/Tabela | ✓ VERIFIED | `canTransition` pré-check em CandidatesKanban.tsx:264; onMutate+cancelQueries+setQueryData+onError rollback+onSettled em useApplications.ts; `<PipelineFilters />` line 160, `<BoardTableToggle>` line 168, `<CandidatesTable applications={tableApplications}>` line 174 em CandidatesKanban page (9e679e1) |
| SC-2 | canTransition() ANTES de mutate; migration normaliza stages legados | ✓ VERIFIED | CandidatesKanban.tsx component line 264: `if (!canTransition(app.stage, toStage, "application"))`; F1 migration 20260428120000_f1_normalize_legacy_application_stages.sql aplicada ao remote |
| SC-3 | Drawer aninhado; sparkbar + SLA no card; filtros inline; encerradas colapsadas com dados reais; confidencial deferred | ✓ VERIFIED | Drawer: CandidateDrawer renderizado em page (inline desktop + overlay mobile). Sparkbar: SparkbarDistribution em JobCard. SLA: SlaBadge/computeSlaTone em CandidateCard. Filtros inline: `<PipelineFilters />` renderizado diretamente na page (line 160). Encerradas: `<TerminalApplicationsList>` no CollapsibleContent com `useTerminalApplications` → filtra admitido/reprovado_pelo_gestor/recusado via useMemo de useApplicationsByJob — dados reais, sem placeholder. RS-11 DEFERRED por decisão do usuário. |
| SC-4 | Opt-in não pré-marcado; candidate_consents granular; talent pool filtra por consent ativo; revogação auditável | ✓ VERIFIED | OptInCheckboxes: `checked={field.value === true}` (null inicial = não marcado). F3 migration candidate_consents no remote. useTalentPool: `active_candidate_consents!inner` line 109. RevokeConsentDialog wired com useRevokeConsent. |
| SC-5 | Toda leitura PII via read_candidate_with_log; data_access_log append-only; pg_cron 36mo; CPF dedup; Realtime por jobId | ✓ VERIFIED | useCandidate usa `supabase.rpc("read_candidate_with_log", ...)` line 124. data_access_log e read_candidate_with_log em types.ts gerado do remote. F2 migration com pg_cron schedule. useCandidateByCpf + normalizeCpf. useApplicationsRealtime wired em CandidatesKanban component line 161. |

**Score:** 5/5 success criteria verificadas. Nenhum gap técnico restante.

---

### Deferred Items

Itens não atendidos por decisão explícita do usuário em CONTEXT.md.

| # | Item | Addressed In | Evidence |
|---|------|-------------|---------|
| 1 | Vaga `confidencial=true` invisível para roles fora da curadoria (RS-11) | v2 futuro (V2-08) | CONTEXT.md: "RS-11 (vaga confidencial) — usuário decidiu remover do escopo na sessão de discuss. Volta como decisão futura." |

**Nota sobre RS-13:** O ID "RS-13" é um alias de planejamento para V2-01 (toggle Board ↔ Tabela) puxado para Phase 2 no CONTEXT.md. Não existe formalmente em REQUIREMENTS.md (que lista RS-01..12 + TAL-01..09). O requisito está satisfeito via BoardTableToggle/CandidatesTable wired na page.

---

### Required Artifacts

#### Gap Closure — Plan 02-10 (re-verificados integralmente)

| Artifact | Linhas | Status | Evidência |
|----------|--------|--------|-----------|
| `src/pages/hiring/CandidatesKanban.tsx` | 329 | ✓ VERIFIED | Wave 4 wire-in completo: LegacyStageWarning (line 157), PipelineFilters (line 160), BoardTableToggle (line 168), CardFieldsCustomizer (line 169), CandidatesTable (line 174); Encerradas com TerminalApplicationsList real (line 205); drawer preservado; TODO block removido |
| `src/hooks/hiring/useTerminalApplications.ts` | 46 | ✓ VERIFIED | TERMINAL_STAGES = [admitido, reprovado_pelo_gestor, recusado] satisfies ApplicationStage[]; isTerminalStage type guard; useTerminalApplications deriva via useMemo de useApplicationsByJob — cache compartilhado, sem query DB extra |
| `tests/hiring/useTerminalApplications.test.ts` | ~107 | ✓ VERIFIED | 3 tests: TERMINAL_STAGES correto + filtra+ordena DESC + jobId undefined → data:[] |
| `tests/hiring/CandidatesKanbanPage.test.tsx` | ~193 | ✓ VERIFIED | 5 tests: smoke + toolbar + toggle Quadro/Tabela + Encerradas lista terminais reais + empty state PT-BR |

#### Previously-verified artifacts (regression checks — estáveis)

| Artifact | Status | Regression check |
|----------|--------|-----------------|
| `src/components/hiring/CandidatesKanban.tsx` (320L) | ✓ VERIFIED | canTransition line 264; useApplicationsRealtime line 161 intactos |
| `src/hooks/hiring/useApplications.ts` (317L) | ✓ VERIFIED | onMutate/cancelQueries/setQueryData/onError/onSettled ainda presentes |
| `src/hooks/hiring/useApplicationsRealtime.ts` | ✓ VERIFIED | Importado+usado em CandidatesKanban component |
| `src/hooks/hiring/useTalentPool.ts` | ✓ VERIFIED | `active_candidate_consents!inner` line 109 |
| `src/hooks/hiring/useCandidates.ts` | ✓ VERIFIED | `supabase.rpc("read_candidate_with_log")` line 124 |
| `src/components/hiring/OptInCheckboxes.tsx` | ✓ VERIFIED | `checked={field.value === true}` (3 ocorrências, linhas 47/80/111) |
| `src/components/hiring/drawer/CandidateDrawer.tsx` (391L) | ✓ VERIFIED | Dentro do limite QUAL-04 (<800L); wired na page via re-export |
| `supabase/migrations/20260428120000_f1_*.sql` | ✓ VERIFIED | Presente em supabase/migrations/ |
| `supabase/migrations/20260428120100_f2_*.sql` | ✓ VERIFIED | Presente |
| `supabase/migrations/20260428120200_f3_*.sql` | ✓ VERIFIED | Presente |
| `supabase/migrations/20260428120300_f4_*.sql` | ✓ VERIFIED | Presente |

---

### Key Link Verification

| From | To | Via | Status | Evidência |
|------|-----|-----|--------|-----------|
| `CandidatesKanban page` | `PipelineFilters` | import line 22 + JSX line 160 | ✓ WIRED | `<PipelineFilters />` renderizado inline sem wrapper |
| `CandidatesKanban page` | `BoardTableToggle` + `useKanbanView` | import lines 23–26 + JSX line 168 | ✓ WIRED | `<BoardTableToggle jobId={job.id} value={view} onChange={setView} />` |
| `CandidatesKanban page` | `CandidatesTable` | import line 27 + JSX lines 174–178 | ✓ WIRED | `<CandidatesTable applications={tableApplications} onOpen={handleOpenCandidate} selectedId={...}>` |
| `CandidatesKanban page` | `CardFieldsCustomizer` | import line 28 + JSX line 169 | ✓ WIRED | `<CardFieldsCustomizer />` no toolbar Row |
| `CandidatesKanban page` | `LegacyStageWarning` | import line 21 + JSX line 157 | ✓ WIRED | `<LegacyStageWarning jobId={job.id} />` acima do board |
| `CandidatesKanban page` | `TerminalApplicationsList` (local) | definição no mesmo arquivo lines 271–329 + JSX line 205 | ✓ WIRED | `<TerminalApplicationsList jobId={job.id} onOpen={handleOpenCandidate} />` no CollapsibleContent |
| `TerminalApplicationsList` | `useTerminalApplications` | import line 34 + uso line 278 | ✓ WIRED | `const { data: terminals, isLoading } = useTerminalApplications(jobId)` |
| `useTerminalApplications` | `useApplicationsByJob` | import line 3 + wrap line 36 | ✓ WIRED | `const query = useApplicationsByJob(jobId)` — cache compartilhado, zero query extra |
| `CandidatesTable` | `tableApplications` (prop) | useMemo lines 79–92 + prop line 175 | ✓ WIRED | `applications={tableApplications}` — não prop vazia |
| `CandidatesKanban component` | `canTransition` | import line 27 + pré-check line 264 | ✓ WIRED | `if (!canTransition(app.stage, toStage, "application"))` antes de `move.mutate` |
| `CandidatesKanban component` | `useApplicationsRealtime` | import line 19 + uso line 161 | ✓ WIRED | `useApplicationsRealtime(jobId)` |
| `useCandidate` | `read_candidate_with_log` RPC | supabase.rpc call line 124 | ✓ WIRED | PII de candidato passa pelo log automático |
| `useTalentPool` | `active_candidate_consents` view | PostgREST embed `!inner` line 109 | ✓ WIRED | Talent Pool só lista candidatos com consent ativo |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produz dados reais | Status |
|----------|---------------|--------|--------------------|--------|
| `CandidatesKanban page` — board view | `applications` | `useApplicationsByJob(job?.id)` → `useScopedQuery` → `supabase.from("applications")` | Sim — query DB com filtro por jobId e scope | ✓ FLOWING |
| `CandidatesTable` em page | `tableApplications` | `useMemo` sobre `applications` acima (mesmo cache, zero refetch) | Sim — derivado de query DB real | ✓ FLOWING |
| `TerminalApplicationsList` | `terminals` | `useTerminalApplications(jobId)` → `useMemo` filter+sort sobre `useApplicationsByJob` | Sim — derivado de query DB real; apenas stages admitido/reprovado_pelo_gestor/recusado | ✓ FLOWING |
| `PipelineFilters` | URL search params (`?vaga=&fase=&origem=&q=`) | `useSearchParams` (React Router) | N/A — filtros de URL state, sem query própria | ✓ FLOWING (client-side URL state é correto por design) |
| `CandidateDrawer` → `useCandidate` | PII do candidato | `supabase.rpc("read_candidate_with_log", {id, context})` | Sim — RPC auditada no remote | ✓ FLOWING |
| `ConsentList` | `consents` | `useActiveConsents(candidateId)` → `supabase.from("active_candidate_consents")` | Sim — view DB com RLS | ✓ FLOWING |
| `AuditLogPanel` | `entries` | `useDataAccessLog(candidateId, companyId)` → `supabase.from("data_access_log")` | Sim — tabela append-only DB | ✓ FLOWING |
| `SparkbarDistribution` em JobCard | `counts` | `useApplicationCountsByJobs` → `useScopedQuery` → query DB | Sim — byGroup 6 chaves | ✓ FLOWING |

---

### Requirements Coverage

| Requirement | Plan(s) | Descrição | Status | Evidência |
|-------------|---------|-----------|--------|-----------|
| RS-01 | 02-05 | Vaga vincula a 1 empresa (`company_id NOT NULL`) | ✓ SATISFIED | Schema + F migrations reforçam |
| RS-02 | 02-05 | Stages do kanban seguem template global; vaga pode adicionar/remover locais | ✓ SATISFIED | statusMachine.ts + APPLICATION_STAGE_TRANSITIONS |
| RS-03 | 02-05, 02-07 | Mover candidato estável: optimistic + rollback + toast diferenciado | ✓ SATISFIED | onMutate/onError/onSettled em useApplications.ts; getMoveErrorToastConfig |
| RS-04 | 02-05, 02-07 | canTransition() ANTES de mutate | ✓ SATISFIED | CandidatesKanban.tsx component line 264 pré-check |
| RS-05 | 02-02, 02-04 | Stages legados normalizados em DB | ✓ SATISFIED | F1 migration aplicada no remote |
| RS-06 | 02-02, 02-04 | 6 grupos visuais consolidados do template atual | ✓ SATISFIED | F1 migration + STAGE_GROUP_BAR_COLORS |
| RS-07 | 02-09 | Detalhe do candidato em drawer lateral (não página dedicada) | ✓ SATISFIED | drawer/ split + CandidateDrawer renderizado inline na page |
| RS-08 | 02-03, 02-07 | Sparkbar + SLA visual no card | ✓ SATISFIED | SparkbarDistribution em JobCard; SlaBadge/computeSlaTone em CandidateCard |
| RS-09 | 02-08, 02-10 | Filtros inline acima do kanban (não modal) | ✓ SATISFIED | `<PipelineFilters />` renderizado diretamente na page (line 160) — gap fechado em 02-10 |
| RS-10 | 02-09, 02-10 | Vagas encerradas em seção colapsada com dados reais | ✓ SATISFIED | Collapsible com sessionStorage persist + TerminalApplicationsList com useTerminalApplications → admitido/reprovado_pelo_gestor/recusado reais — gap fechado em 02-10 |
| RS-11 | — | Vaga confidencial invisível para roles fora da curadoria | DEFERRED | Decisão do usuário na sessão de discuss — removido do escopo v1 |
| RS-12 | 02-05, 02-07 | Realtime subscribe por jobId | ✓ SATISFIED | useApplicationsRealtime wired em CandidatesKanban component line 161 |
| RS-13 (V2-01 pull-in) | 02-08, 02-10 | Toggle Kanban ↔ Tabela com sort | ✓ SATISFIED | BoardTableToggle + CandidatesTable wired; view condicional `view === "table"` line 173 — gap fechado em 02-10 |
| TAL-01 | 02-06 | Banco de Talentos global (cross-empresa) | ✓ SATISFIED | useTalentPool com active_candidate_consents!inner |
| TAL-02 | 02-06, 02-09 | Tags por empresa/vaga no histórico | ✓ SATISFIED | HistoricoTabContent com useCandidateTags |
| TAL-03 | 02-02, 02-09 | Consent granular (ConsentList + RevokeConsentDialog) | ✓ SATISFIED | candidate_consents em DB; ConsentList + RevokeConsentDialog wired |
| TAL-04 | 02-09 | Opt-in não pré-marcado | ✓ SATISFIED | OptInCheckboxes: `checked={field.value === true}` sem defaultChecked=true |
| TAL-05 | 02-02, 02-09 | data_access_log + AuditLogPanel UI | ✓ SATISFIED | F2 migration no remote; AuditLogPanel wired no drawer |
| TAL-06 | 02-02, 02-06 | read_candidate_with_log RPC | ✓ SATISFIED | useCandidate usa RPC; F2 migration no remote |
| TAL-07 | 02-02, 02-04 | pg_cron retention 36 meses | ✓ SATISFIED | F2 migration com schedule pg_cron no remote |
| TAL-08 | 02-06, 02-09 | Revogação de consent (UI) | ✓ SATISFIED | RevokeConsentDialog wired com useRevokeConsent |
| TAL-09 | 02-02, 02-03, 02-08 | CPF canonical dedup | ✓ SATISFIED | F4 migration (UNIQUE partial index); useCandidateByCpf; CandidateForm CPF priority |

**Requirements not in REQUIREMENTS.md but claimed in phase:**
- RS-11: na lista do ROADMAP mas CONTEXT.md decidiu deferir — tratado como deferred.
- RS-13: ID atribuído no CONTEXT.md à V2-01 pull-in; não em REQUIREMENTS.md ainda — satisfeito e documentado.

---

### Behavioral Spot-Checks

| Comportamento | Verificação | Resultado | Status |
|---------------|-------------|-----------|--------|
| canTransition chamado antes de mutate | `grep -n "canTransition" src/components/hiring/CandidatesKanban.tsx` → line 264 antes de `move.mutate` | Confirmado | ✓ PASS |
| PipelineFilters renderizado na page | `grep -n "<PipelineFilters" src/pages/hiring/CandidatesKanban.tsx` → line 160 (JSX real) | Confirmado | ✓ PASS |
| BoardTableToggle renderizado na page | `grep -n "<BoardTableToggle" src/pages/hiring/CandidatesKanban.tsx` → line 168 (JSX real) | Confirmado | ✓ PASS |
| CandidatesTable recebe prop de dados reais | `grep -n "applications={tableApplications}" src/pages/hiring/CandidatesKanban.tsx` → line 175 | Confirmado | ✓ PASS |
| RS-10 CollapsibleContent com dados reais | `grep -n "<TerminalApplicationsList" src/pages/hiring/CandidatesKanban.tsx` → line 205; `terminals.map` line 298 | Confirmado — placeholder substituído | ✓ PASS |
| Placeholder antigo removido | `grep "Lista detalhada vive em\|apenas placeholder" src/pages/hiring/CandidatesKanban.tsx` | Não encontrado | ✓ PASS |
| TODO Wave 4 block removido | `grep "TODO Wave 4 wire-in" src/pages/hiring/CandidatesKanban.tsx` | Não encontrado | ✓ PASS |
| OptInCheckboxes não pré-marcados | `grep "checked=" src/components/hiring/OptInCheckboxes.tsx` → `checked={field.value === true}` (3x) | Confirmado | ✓ PASS |
| apply-to-job persiste candidate_consents | `grep "candidate_consents" supabase/functions/apply-to-job/index.ts` → `.insert(consentRows)` | Confirmado | ✓ PASS |
| Talent Pool filtra por consent ativo | `grep "active_candidate_consents!inner" src/hooks/hiring/useTalentPool.ts` → line 109 | Confirmado | ✓ PASS |
| useTerminalApplications não cria query DB nova | `grep "supabase.from" src/hooks/hiring/useTerminalApplications.ts` | Não encontrado — deriva via useMemo | ✓ PASS |
| Full test suite 515/515 | Documentado em 02-10-SUMMARY.md; 8 test files em tests/hiring/ (19 total no diretório) | 515 passing, 0 failures (pre-merge) | ✓ PASS |

---

### Anti-Patterns Encontrados

| Arquivo | Linha | Padrão | Severidade | Impacto |
|---------|-------|--------|------------|---------|
| `src/components/hiring/drawer/CandidateDrawer.tsx` | 256, 353 | `placeholder="..."` em SelectValue (Radix) | ℹ️ Info | Strings de UI válidas — Radix Select placeholder é comportamento esperado, não stub de código |

Nenhum blocker restante. Os dois blockers da verificação anterior (TODO Wave 4 block + RS-10 placeholder) foram removidos pelo Plan 02-10.

---

### Human Verification Required

#### 1. Drag-and-drop sem bug #1

**Teste:** Abrir uma vaga com candidatos em estágios diferentes; arrastar um card para uma coluna adjacente válida.
**Esperado:** Card move otimisticamente, mantém posição na coluna destino após reconciliação com servidor; NÃO some, pisca, nem duplica em duas colunas.
**Por que humano:** Comportamento de drag com dnd-kit não é testável com confiabilidade em jsdom (helpers de E2E foram removidos no 6.x).

#### 2. Drawer não navega fora da página

**Teste:** No kanban de candidatos, clicar em um card para abrir o CandidateDrawer; navegar entre tabs do drawer.
**Esperado:** Drawer abre inline na lateral (desktop) ou em overlay (mobile); pathname da URL NÃO muda — apenas `?tab=` é adicionado; scroll do board continua acessível atrás do drawer.
**Por que humano:** Comportamento visual Notion-style requer inspeção no browser real.

#### 3. OptInCheckboxes não pré-marcados no formulário público

**Teste:** Abrir /apply/:jobSlug (formulário público); verificar estado inicial dos checkboxes de consentimento.
**Esperado:** Os 3 checkboxes de consentimento granular NÃO estão marcados ao carregar; tentar submeter sem marcar `consent_aplicacao_vaga` deve bloquear com mensagem de erro em PT-BR.
**Por que humano:** Validação de UX em formulário público requer renderização real no browser.

#### 4. Sparkbar cores por grupo de funil

**Teste:** Abrir lista de vagas; inspecionar visualmente a sparkbar em cada JobCard.
**Esperado:** Segmentos correspondem a STAGE_GROUP_BAR_COLORS — azul (triagem/fit/checagem), amarelo (entrevistas), verde (decisão/admissão), vermelho (descartados).
**Por que humano:** Verificação visual de renderização de cores; lógica testada em unit mas renderização exata requer inspeção.

#### 5. SLA stripe no CandidateCard

**Teste:** Inserir aplicação com `stage_entered_at = now() - interval '2 days'`; verificar cor da borda do card; repetir com `interval '5 days'`.
**Esperado:** 2 dias → border-l laranja (status-amber); 5 dias → border-l vermelho (status-red).
**Por que humano:** Requer dados com timestamps específicos; não há seed de teste com datas relativas adequadas.

#### 6. AuditLogPanel visível apenas para RH/admin

**Teste:** Logar como admin.teste@levertalents.com → abrir CandidateDrawer → verificar tab "Auditoria". Repetir como mariana.costa@levertalents.com (lider).
**Esperado:** Tab "Auditoria" visível para admin; invisível para lider.
**Por que humano:** Requer autenticação real com dois usuários no browser.

#### 7. Talent Pool LGPD: candidato com consent revogado desaparece

**Teste:** Acessar /hiring/talent-pool com candidato listado → abrir drawer → aba Perfil → ConsentList → revogar "Banco de Talentos" → voltar para /hiring/talent-pool.
**Esperado:** Candidato não aparece mais na listagem após revogação.
**Por que humano:** Fluxo completo de revogação + refetch requer ambiente com dados reais e autenticação.

#### 8. pgTAP suites 006–010 no remote Supabase

**Teste:** `supabase test db --linked` no projeto ehbxpbeijofxtsbezwxd.
**Esperado:** 0 failures em todos os 5 suites de Migration F.
**Por que humano:** Requer credenciais do projeto Supabase remote; não executável offline.

---

## Gaps Summary

Nenhum gap técnico restante após Plan 02-10 (gap closure).

**Gaps fechados pelo Plan 02-10:**

Gap 1 (SC-1 FAILED — Wave 4 orphaned): Todos os 5 componentes (PipelineFilters, BoardTableToggle, CandidatesTable, CardFieldsCustomizer, LegacyStageWarning) estão importados e renderizados em `src/pages/hiring/CandidatesKanban.tsx`. O bloco TODO das linhas 117–123 foi removido. CandidatesTable recebe `tableApplications` derivado por useMemo de `useApplicationsByJob` — dados reais, sem prop vazia. Toggle view condicional `view === "table"` em line 173 funciona com `useKanbanView(jobId)` via localStorage por jobId.

Gap 2 (SC-3 PARTIAL — RS-10 placeholder): `CollapsibleContent` agora renderiza `<TerminalApplicationsList>`, que usa `useTerminalApplications(jobId)` — hook que filtra `admitido | reprovado_pelo_gestor | recusado` via useMemo sobre `useApplicationsByJob` (cache compartilhado, sem query DB extra). Lista real com nome do candidato, label de stage traduzido via `APPLICATION_STAGE_LABELS`, e data formatada via `formatBRDate`. Click abre o drawer inline. Texto placeholder e link para /hiring/jobs foram removidos.

O status `human_needed` reflete os 8 itens de UAT manual que não foram alterados pelo gap closure e permanecem válidos para verificação em browser/remote.

---

_Verificado: 2026-04-28T12:30:00Z_
_Verificador: Claude (gsd-verifier) — re-verificação após Plan 02-10 gap closure_
