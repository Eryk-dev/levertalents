---
phase: 02-r-s-refactor
reviewed: 2026-04-28T00:00:00Z
depth: standard
files_reviewed: 56
files_reviewed_list:
  - src/components/hiring/AuditLogPanel.tsx
  - src/components/hiring/BoardTableToggle.tsx
  - src/components/hiring/CandidateForm.tsx
  - src/components/hiring/CandidatesTable.tsx
  - src/components/hiring/CardFieldsCustomizer.tsx
  - src/components/hiring/ConsentList.tsx
  - src/components/hiring/DuplicateCandidateDialog.tsx
  - src/components/hiring/OptInCheckboxes.tsx
  - src/components/hiring/PipelineFilters.tsx
  - src/components/hiring/RevokeConsentDialog.tsx
  - src/components/hiring/drawer/AntecedentesTabContent.tsx
  - src/components/hiring/drawer/CandidateDrawer.tsx
  - src/components/hiring/drawer/CandidateDrawerContent.tsx
  - src/components/hiring/drawer/CandidateDrawerHeader.tsx
  - src/components/hiring/drawer/CandidateDrawerTabs.tsx
  - src/components/hiring/drawer/EntrevistasTabContent.tsx
  - src/components/hiring/drawer/FitTabContent.tsx
  - src/components/hiring/drawer/HistoricoTabContent.tsx
  - src/components/hiring/drawer/PerfilTabContent.tsx
  - src/hooks/hiring/useCandidateConsents.ts
  - src/hooks/hiring/useCandidateTags.ts
  - src/hooks/hiring/useCardPreferences.ts
  - src/hooks/hiring/useDataAccessLog.ts
  - src/hooks/hiring/useTerminalApplications.ts
  - src/lib/hiring/cardCustomization.ts
  - src/lib/hiring/cpf.ts
  - src/lib/hiring/sla.ts
  - src/lib/hiring/stageGroups.ts
  - src/lib/supabaseError.ts
  - src/pages/hiring/CandidatesKanban.tsx
  - src/pages/hiring/HiringDashboard.tsx
  - supabase/migrations/20260428120000_f1_normalize_legacy_application_stages.sql
  - supabase/migrations/20260428120100_f2_data_access_log_table.sql
  - supabase/migrations/20260428120200_f3_candidate_consents.sql
  - supabase/migrations/20260428120300_f4_cpf_canonical_dedup.sql
  - supabase/tests/006-migration-f-stages.sql
  - supabase/tests/007-data-access-log.sql
  - supabase/tests/008-candidate-consents.sql
  - supabase/tests/009-cpf-unique.sql
  - supabase/tests/010-pg-cron-retention.sql
  - tests/hiring/BoardTableToggle.test.tsx
  - tests/hiring/CandidateCard.test.tsx
  - tests/hiring/CandidateDrawer.test.tsx
  - tests/hiring/CandidatesKanban.integration.test.tsx
  - tests/hiring/CandidatesKanbanPage.test.tsx
  - tests/hiring/PipelineFilters.test.tsx
  - tests/hiring/PublicApplicationForm.test.tsx
  - tests/hiring/canTransition.test.ts
  - tests/hiring/cpf.test.ts
  - tests/hiring/sla.test.ts
  - tests/hiring/stageGroups.test.ts
  - tests/hiring/useApplicationCountsByJob.test.tsx
  - tests/hiring/useApplicationsRealtime.test.tsx
  - tests/hiring/useCandidateConsents.test.tsx
  - tests/hiring/useCandidateTags.test.tsx
  - tests/hiring/useCardPreferences.test.tsx
  - tests/hiring/useMoveApplicationStage.test.tsx
  - tests/hiring/useTalentPool.test.tsx
  - tests/hiring/useTerminalApplications.test.ts
  - tests/lib/supabaseError.test.ts
  - tests/msw/hiring-handlers.ts
  - tests/msw/realtime-mock.ts
findings:
  critical: 0
  warning: 6
  info: 9
  total: 15
status: issues_found
---

# Phase 2: Code Review Report

**Reviewed:** 2026-04-28T00:00:00Z
**Depth:** standard
**Files Reviewed:** 56 (TS/TSX components, hooks, libs, pages + SQL migrations + pgTAP tests + Vitest tests)
**Status:** issues_found

## Summary

Phase 2 entrega o refactor completo do R&S (CandidateDrawer split de 867 linhas em shell + sub-componentes, kanban estabilizado com canTransition + optimistic update, Migration F com 4 SQL migrations, LGPD via candidate_consents granular + data_access_log append-only via RPC SECURITY DEFINER, e CPF como chave canonical). Code quality é alto: TypeScript strict respeitado em 99% dos lugares (4 `as never` casts isolados em ports do legacy), mensagens de erro diferenciadas por tipo, queryKeys consistentemente prefixadas com `scope.id`, e pgTAP tests cobrindo cada migration. Vitest suite cobre exhaustivamente canTransition (truth-table) e SLA tones.

Sem issues Critical. As 6 Warnings são predominantemente sobre robustez (race conditions sutis em URL state, fallbacks UI quando dados parciais), e os 9 Info items são melhorias de tipagem / detalhes de UX. Nenhum bloqueia o fechamento da fase.

Pontos fortes:
- Migration F.1 anti-regressão trigger + `metadata.legacy_marker` preserva forensic context (excelente).
- Migration F.2 RPC re-aplica RLS dentro do SECURITY DEFINER (mitiga T-02-02-04 corretamente — pattern AP7 da ARCHITECTURE).
- Migration F.3 `EXCLUDE USING gist (...)  WHERE (revoked_at IS NULL)` resolve 1-active-per-(candidate,purpose) elegantemente.
- Migration F.4 normalize-then-constrain com abort se houver duplicatas residuais (RAISE EXCEPTION com mensagem actionable).
- `supabaseError.ts` discriminated union + 4 detect helpers casa exatamente com D-05.
- `useApplicationsRealtime` test suite cobre subscribe / cleanup / re-subscribe / silent merge.

## Warnings

### WR-01: PipelineFilters debounce effect — race com sync inicial pode reintroduzir search antigo

**File:** `src/components/hiring/PipelineFilters.tsx:68-87`
**Issue:** O segundo `useEffect` fecha sobre `q` (URL) e `localSearch` (estado interno). Se o usuário digita 'joao', faz back navigation enquanto o timer de 300ms está pendente, e a URL volta para `q=` (vazio), o efeito de "sync local from URL" (linhas 68-70) ajusta `localSearch` mas o timer pendente do efeito anterior NÃO é cancelado se ele já fez `setSearchParams` antes do unmount/effect rerun. Mais importante: o effect debounce dispara em qualquer mudança de `localSearch`, e `localSearch === q` early-return só vale para o tick atual; um second debounce pode commitar value stale. Cenário concreto: usuário digita 'a' (timer A pendente, 300ms), timer A dispara → URL fica `q=a`, useEffect sync (q='a') faz `setLocalSearch(prev => prev==='a' ? prev : 'a')` (no-op), tudo OK. Mas se `setSearchParams` external troca q antes do timer disparar, há janela onde local=user-typed ainda é commitado por cima. Os tests com `vi.useFakeTimers` não exercitam isso.
**Fix:**
```typescript
// Cancel pending debounce on URL external changes by including q in deps reset:
useEffect(() => {
  if (localSearch === q) return;
  const timer = setTimeout(() => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      // Re-read CURRENT URL value at dispatch time, not closure-time
      const currentQ = next.get("q") ?? "";
      // Only commit if local diverged from URL when timer started AND URL didn't change since
      if (localSearch) next.set("q", localSearch);
      else next.delete("q");
      return next;
    }, { replace: true });
  }, 300);
  return () => clearTimeout(timer);
}, [localSearch, q, setSearchParams]);
```
Adicionalmente: o test em `tests/hiring/PipelineFilters.test.tsx` deveria cobrir "URL muda externamente entre key-press e timer fire" (race window).

### WR-02: CandidateDrawer guard `if (!candidateId)` antes dos hooks viola Rules of Hooks no padrão real

**File:** `src/components/hiring/drawer/CandidateDrawer.tsx:88-100`
**Issue:** O componente `CandidateDrawer` faz early-return `<aside>...empty state...</aside>` antes de entrar no `CandidateDrawerBody`. Isso é seguro porque `CandidateDrawerBody` é um componente separado e os hooks (`useSearchParams`, `useState`, etc.) ficam todos dentro dele. PORÉM, o `CandidateDrawer` em si NÃO declara hooks — é um pure switch. Não há violação real, MAS o padrão é frágil: se alguém adicionar um `useEffect` no shell sem perceber a separação, vira bug. Considere mover a guarda para INTRODUZIR `CandidateDrawerBody` como o componente único exportado, ou marcar com comment explícito.
**Fix:**
```typescript
// Adicionar comment explícito no início de CandidateDrawer:
/**
 * IMPORTANT: este componente NÃO declara hooks. Toda lógica que precisa de
 * hooks (useState, useEffect, useSearchParams) mora em CandidateDrawerBody.
 * Não adicione hooks aqui — o early-return de !candidateId quebra Rules of
 * Hooks. Ao invés disso, condicione dentro de CandidateDrawerBody.
 */
export function CandidateDrawer(...) {
  if (!candidateId) return <EmptyState />;
  return <CandidateDrawerBody ... />;
}
```

### WR-03: Migration F.1 — re-aplicar UPDATE em batch sem WHERE de "no progress" pode loop em deadlock raro

**File:** `supabase/migrations/20260428120000_f1_normalize_legacy_application_stages.sql:47-73, 76-103, 106-132`
**Issue:** Os 3 blocos `DO $$ ... LOOP ... EXIT WHEN v_affected = 0` rodam até `v_affected = 0`. Se outro processo (Edge Function ou trigger competidor) re-introduzir rows com `stage = 'aguardando_fit_cultural'` (pré trigger anti-regressão sendo criada na step 3 do mesmo migration), o LOOP não para. O trigger anti-regressão é criado APÓS os 3 backfill loops. Se a migration roda em produção com tráfego ativo (Edge Function `apply-to-job` ou outro path), há janela onde inserts novos podem aparecer mid-backfill (apenas se há código de produção emitindo legacy stages — improvável mas possível).
**Fix:** Mover trigger anti-regressão para ANTES dos backfill loops; o backfill UPDATE não dispara o trigger porque o NEW.stage destino é `em_interesse` (não está no IN-list). Ordem correta:
```sql
-- 1. ALTER TABLE metadata column
-- 2. CREATE trigger tg_block_legacy_stages (BLOQUEIA novos inserts/updates)
-- 3. DO $$ batch backfill loops (cada UPDATE muda stage de legacy → em_interesse,
--    NÃO cai no IN-list do trigger)
-- 4. (deixa trigger ativo permanentemente)
```
Como bonus, a trigger criada antes dá error explícito se algum UPDATE não-batch tentar setar legacy stage durante a janela.

### WR-04: Migration F.2 — actor_id REFERENCES profiles ON DELETE RESTRICT pode bloquear delete de profile

**File:** `supabase/migrations/20260428120100_f2_data_access_log_table.sql:24-35`
**Issue:** `actor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT`. Append-only audit log com FK RESTRICT impede deletar profile que já fez algum acesso. Em produção, isso pode quebrar fluxo de off-boarding (ex-funcionário sai → tentativa de DELETE profile falha). Pattern padrão para audit logs é `ON DELETE SET NULL` (preserva log mesmo se actor não existe mais; LGPD permite preservar audit por 36 meses sem precisar do nome). O DELETE restrict trade fica porque RPC `read_candidate_with_log` não pode INSERT com NULL actor_id (aplicação assume actor sempre presente; mas se quiserem soft-delete de profiles, vão precisar mudar isso depois).
**Fix:** Trocar para `ON DELETE SET NULL` + remover `NOT NULL`:
```sql
actor_id  uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
```
ou (alternative) `ON DELETE NO ACTION DEFERRABLE INITIALLY DEFERRED` para permitir transação que limpe log + deleta profile. Atualmente a migration força workflow "anonimize profile (não delete)". Se isso é o comportamento desejado, documentar no COMMENT.

### WR-05: AuditLogPanel — `actor_id.slice(0, 8)` mostra UUID prefix (PII via correlação?)

**File:** `src/components/hiring/AuditLogPanel.tsx:64-66`
**Issue:** O comentário acima diz "actor_id (truncado — sem PII per CLAUDE.md; futura Phase 4 vai resolver pra nome via JOIN)", mas exibir os primeiros 8 dígitos do UUID É um identificador. Para o mesmo actor, todos os logs mostram o mesmo prefix → operador pode correlacionar quem fez o quê (mesmo se não souber o nome). Isso não é estritamente PII mas é "pseudo-anonymous identifier" sob LGPD §12. Como a tela é gated por `is_people_manager` (admin/rh apenas via RLS + UI gate), o risco é baixo, mas a copy "RH visível · auditoria LGPD" esconde a intenção. Considere: (1) substituir slice por hash determinístico mais curto OU (2) deixar UUID prefix mas adicionar fallback explícito ("Actor X" com index estável).
**Fix:**
```typescript
// Opção A: Hash truncado (4 chars hex from sha256 do uuid) — não revela ordering
function actorBadge(uuid: string | null): string {
  if (!uuid) return "—";
  // Use uuid.split('-')[0] que já é 8 hex chars random — preserve, mas accompany
  // com label "Actor #" pra deixar claro que é id, não nome:
  return `Actor ${uuid.slice(0, 6)}`;
}

<span className="font-medium tabular-nums">
  {actorBadge(e.actor_id)}
</span>
```
Adicionar um TODO comment apontando `data_access_log` -> `profiles` JOIN como Phase 4 work (já há comment, mas reforçar segurança da exibição).

### WR-06: useCandidateTags — `app.created_at > existing.last_applied_at` lexicographic comparison falha para non-ISO strings

**File:** `src/hooks/hiring/useCandidateTags.ts:74`
**Issue:** A comparação `app.created_at > existing.last_applied_at` funciona corretamente para timestamps ISO 8601 com mesmo timezone (`2026-04-28T...`). Como Supabase normaliza pra UTC ISO sempre, na prática isso nunca falha. Mas: o code não valida formato e o tipo é `string`. Se um futuro consumer setar `created_at` em formato local (`28/04/2026`), a comparação string vs string falha silenciosamente (e.g. `'05/2026' > '12/2025'` é false) sem erro. Pequeno risk, fácil mitigar.
**Fix:**
```typescript
// Substituir comparison string por Date timestamps:
const newer = new Date(app.created_at).getTime();
const olderTs = existing ? new Date(existing.last_applied_at).getTime() : -Infinity;
if (!existing || newer > olderTs) {
  byCompany.set(co.id, { ... });
}
// Mesmo aplicar no sort final em vez de localeCompare:
return Array.from(byCompany.values()).sort(
  (a, b) => new Date(b.last_applied_at).getTime() - new Date(a.last_applied_at).getTime()
);
```

## Info

### IN-01: `as never` casts em sub-componentes do drawer (TS strict downgrade)

**File:** `src/components/hiring/drawer/PerfilTabContent.tsx:168`, `src/components/hiring/drawer/EntrevistasTabContent.tsx:55,60,65`
**Issue:** 4 `as never` casts em componentes ports do legacy CandidateDrawer (`<AdmissionStatusPanel application={active as never} />`, `<InterviewTimeline interviews={interviews as never} />`). Isso é debt herdado, não nova regressão — os componentes consumidores aceitam tipos vagos. CLAUDE.md proíbe `as any` mas `as never` é igualmente um buraco em strict mode. Resolver requer atualizar tipos de `AdmissionStatusPanel`, `InterviewTimeline`, `InterviewNotesEditor`, `HiringDecisionPanel`.
**Fix:** Track no debt log e atacar em pequena MR depois (pode ser parte de QUAL-04 follow-up). Ou (mínimo) substituir `as never` por `as unknown as ApplicationRow` etc — pelo menos preserva intent. Alternativa preferida: ajustar o type signature dos componentes legacy para aceitar interface canonical.

### IN-02: useCandidateTags — `as unknown as ApplicationWithJobAndCompany[]` é dupla cast

**File:** `src/hooks/hiring/useCandidateTags.ts:66`
**Issue:** O cast `(data ?? []) as unknown as ApplicationWithJobAndCompany[]` indica que o tipo retornado pelo `supabase.from().select(...)` não casa com `ApplicationWithJobAndCompany`. Isso geralmente significa que o select string ou o type local divergiram. Não é bug, mas é um sinal de que `src/integrations/supabase/types.ts` precisa ser regenerado, ou o type local pode ser derivado do generated.
**Fix:** Avaliar se `Database["public"]["Tables"]["applications"]["Row"]` + embed parser (PostgREST embed type helper) cobre. Se sim, substituir interface local. Se a complexidade não vale, deixar comment explicando porquê o cast é necessário.

### IN-03: HistoricoTabContent mostra `Vaga {a.job_opening_id.slice(0, 8)}…` quando deveria fazer JOIN

**File:** `src/components/hiring/drawer/HistoricoTabContent.tsx:88-89`
**Issue:** A seção "Aplicações" lista `Vaga {a.job_opening_id.slice(0, 8)}...` em vez do título da vaga. Isso é UX ruim (UUID prefix não é human-readable). Se a application já vem do `useApplicationsByCandidate` com o embed `job_opening:job_openings(title)`, o título estaria disponível.
**Fix:** Verificar shape de `useApplicationsByCandidate`. Se não inclui job title, fazer extend do select; senão substituir slice por `{a.job_opening?.title ?? "Vaga sem título"}`.

### IN-04: PerfilTabContent — leitura defensiva de campos `summary`/`bio` via cast

**File:** `src/components/hiring/drawer/PerfilTabContent.tsx:51-54`
**Issue:** `(candidate as CandidateRow & { summary?: string | null; bio?: string | null }).summary` é workaround para tipos não terem o field. Se essas colunas existem no schema, regenerar `types.ts`. Se não existem, o código está checando um campo que nunca virá → dead path.
**Fix:** Verificar se `candidates.summary` ou `candidates.bio` existem no DB. Se sim, regen types. Se não, remover o KV "Resumo" + dead code.

### IN-05: f1_normalize migration — ALTER TABLE ADD COLUMN `metadata` ... NOT NULL DEFAULT lock holding

**File:** `supabase/migrations/20260428120000_f1_normalize_legacy_application_stages.sql:40-41`
**Issue:** Em PG ≥11, `ALTER TABLE ADD COLUMN ... NOT NULL DEFAULT '{}'::jsonb` é fast (column metadata only, default lazy). No PG ≤10 isso reescreve a tabela. Lever está em Postgres 15+ (Supabase), então OK na prática. Mas a comment block não documenta isso — se alguém port isso para self-hosted antigo, surpresa.
**Fix:** Adicionar 1 linha de comment: `-- ALTER ADD COLUMN ... DEFAULT é fast em PG11+ (no rewrite). Lever roda PG15.`

### IN-06: useTerminalApplications — `localeCompare(a.stage_entered_at)` quando ambos podem ser null

**File:** `src/hooks/hiring/useTerminalApplications.ts:42`
**Issue:** `(b.stage_entered_at ?? "").localeCompare(a.stage_entered_at ?? "")` — se ambos são null, ambos viram `""`, e `"".localeCompare("") === 0`. OK. Se um é null e outro string, null fica primeiro/último dependendo da ordem (DESC desejado). Edge case improvável mas não documentado.
**Fix:** Adicionar comment ou usar `??` com sentinel claro:
```typescript
.sort((a, b) => {
  const ta = a.stage_entered_at ?? "0000-00-00";  // null = oldest
  const tb = b.stage_entered_at ?? "0000-00-00";
  return tb.localeCompare(ta);
})
```

### IN-07: pgTAP test 010 — chamada manual de DELETE não testa o cron job

**File:** `supabase/tests/010-pg-cron-retention.sql:40-47`
**Issue:** O test "Manual run da query DELETE remove rows >36 meses" executa o DELETE diretamente, não invoca o cron job real. Isso testa a query SQL, não o agendamento. Test 1 valida que o cron job existe com schedule correto, mas não que ele executa o cleanup body corretamente. Acceptable trade (pgTAP não consegue avançar relógio do cron), mas o test name induz a achar que cobre o cron.
**Fix:** Renomear test 2 para "DELETE query do retention job remove rows >36 meses" — fica claro que é o body que está sendo testado, não o agendamento.

### IN-08: data_access_log RPC — context default 'view' duplicado em INSERT

**File:** `supabase/migrations/20260428120100_f2_data_access_log_table.sql:97`
**Issue:** Linha 97: `v_actor, 'candidate', p_candidate_id, 'view', COALESCE(p_context, 'view')`. O 4º argumento `'view'` é o `action` (hardcoded para esta RPC, OK). O 5º é `context` que via `COALESCE(p_context, 'view')` defaulta para `'view'` quando `p_context IS NULL`. Mas a função signature já tem `p_context text DEFAULT 'view'` (linha 54), então `COALESCE` é redundante exceto para casos onde caller passa `NULL` explícito. Não é bug — só verbose. 
**Fix:** Simplificar para `v_actor, 'candidate', p_candidate_id, 'view', p_context` (signature default cobre o NULL case dentro do plpgsql). Manter COALESCE só se houver intent explícito de tratar NULL passado.

### IN-09: useApplicationsRealtime test — INSERT spy `callKeys.flat()` perde estrutura

**File:** `tests/hiring/useCandidateConsents.test.tsx:208-213`
**Issue:** O test faz `.flat()` em todas as queryKeys de invalidate calls e checa `flat.includes('candidate-consents')` + `flat.includes('talent-pool')`. Isso passa mesmo se as duas strings vierem do mesmo array (e.g. se o hook acidentalmente invalidasse `['candidate-consents', 'talent-pool']` numa única call). Não é bug do hook, mas é assertiveness fraca.
**Fix:**
```typescript
const calls = invalidateSpy.mock.calls.map(c => (c[0] as { queryKey: QueryKey } | undefined)?.queryKey);
const consentsCall = calls.find(k => Array.isArray(k) && k.includes('candidate-consents'));
const poolCall = calls.find(k => Array.isArray(k) && k.includes('talent-pool'));
expect(consentsCall).toBeDefined();
expect(poolCall).toBeDefined();
expect(consentsCall).not.toBe(poolCall); // 2 separate invalidate calls
```

---

_Reviewed: 2026-04-28T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
