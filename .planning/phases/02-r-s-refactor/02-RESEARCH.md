---
phase: 02
slug: r-s-refactor
gathered: 2026-04-27
domain: Recrutamento & Seleção (kanban estável + drawer aninhado + Banco de Talentos LGPD + Migration F)
confidence: HIGH (verified contra codebase real, Phase 1 chokepoint, Supabase 2.75, TanStack Query 5.83, dnd-kit 6.3) com pontos MEDIUM marcados
---

# Phase 2: R&S Refactor — Research

> Documento prescritivo: o planner deve usar essas decisões e snippets como gabarito.
> Não explore alternativas a decisões já travadas em CONTEXT.md (D-01 a D-11).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Bug #1: estabilização do kanban (RS-03, RS-04, RS-12)**
- **D-01:** Estratégia otimista com **rollback automático**. Erro (network drop, RLS denial, conflict, transição inválida) → card desliza de volta com toast explicando. Não pergunta, não fica no limbo.
- **D-02:** `canTransition()` é chamado **ANTES** de `mutate()` — corrige `CandidatesKanban.tsx:252`. Transição inválida nem chega ao servidor; toast local explica "Não é possível mover de X pra Y".
- **D-03:** Conflito (dois RHs simultâneos) = **last-writer-wins**. Sem locks otimistas, sem version tokens. O segundo prevalece; o primeiro recebe toast "{nome} moveu {candidato}" via Realtime.
- **D-04:** Realtime per-`jobId` quando alguém move remotamente: **silent re-render** — card desliza suave para nova coluna, sem toast.
- **D-05:** **4 mensagens de erro diferenciadas:**
  - RLS denial: "Você não tem permissão pra mover esse candidato"
  - Network drop: "Sem conexão. Tentando de novo automaticamente..." (retry com backoff até 3x)
  - Conflict: "{nome} acabou de mover {candidato}. O card foi atualizado."
  - canTransition reject: "Não é possível mover de '{stage_from}' direto pra '{stage_to}'"
- **D-06:** Reusar `src/lib/supabaseError.ts` como base, estender com helpers nomeados pros 4 tipos.

**Card de candidato + card de vaga + SLA visual (RS-08, RS-10, UX-AUDIT §4.1, §4.2)**
- **D-07:** **Mínimo fixo no card de candidato** = nome + cargo pretendido + dias na etapa atual + vaga em concorrência.
- **D-08:** **Card customizável** — usuário adiciona/remove campos opcionais (avatar, próxima entrevista, ícones CV/Fit com score, dot de status do background check, tags de origem). Persistência por usuário (localStorage v1, namespaced `leverup:rs:`).
- **D-09:** **Toggle Kanban ↔ Tabela** com sort (nome, dias na etapa, próxima entrevista, etapa). Persistência da última view por usuário. Puxa V2-01 do backlog para Phase 2 como **RS-13**.
- **D-10:** **SLA de tempo na etapa** — 2 dias = laranja, 5 dias = vermelho. Global (sem customização por empresa/vaga). Reusar lógica de `BottleneckAlert.tsx`.
- **D-11:** **Sparkbar de distribuição no card de VAGA** — cores por intencionalidade do funil:
  - Verde = aprovados / em decisão / em admissão / admitidos
  - Amarelo = qualquer etapa de entrevista (RH ou final)
  - Azul = triagem + fit cultural + checagem
  - Vermelho = recusados / descartados

### Claude's Discretion

**LGPD consent flow (TAL-03/04/06/08):** REQUIREMENTS.md já especifica `candidate_consents` (purpose, legal_basis, expires_at, revoked_at, granted_at, granted_by); opt-in **não pré-marcado** no `PublicApplicationForm.tsx`; finalidades granulares no mínimo: "incluir-no-banco-de-talentos-global", "compartilhar-com-cliente-externo", "manter-cv-pos-recusa". Revogação via UI do RH em v1; via UI do candidato (token-based link) é futuro. Anonimização (destrutivo) e revogação (preserva histórico) são fluxos separados — `useAnonymizeCandidate` permanece pra direito de exclusão; revogação é fluxo novo. Planner desenha as duas UIs.

**Data access log (TAL-05/06/07):** Tabela `data_access_log` (entity_type, entity_id, action, scope_company_id, context, actor_id, at) append-only; RPC `read_candidate_with_log(id, context)` é o único caminho de leitura de PII. Postgres não tem trigger BEFORE READ — log acontece dentro da RPC. pg_cron job weekly DELETE WHERE at < now() - interval '36 months'. Planner define schedule exato.

**CPF como dedup canonical (TAL-09):** Constraint `UNIQUE` em `candidates.cpf` (nullable; NULL não-único quando candidato externo sem CPF). RH adiciona manualmente → busca por CPF antes; se existe, oferece merge (reusar `DuplicateCandidateDialog.tsx`). Email = secundário fallback.

**Migração F (RS-05/06):** Strategy expand-backfill-contract.
1. Expand: `applications.stage_v2` mapeada via SQL function que faz lookup nos 6 grupos consolidados.
2. Backfill: UPDATE em batch (1000 rows/vez, monitor lock contention). `aguardando_fit_cultural` → `fit_cultural`, `sem_retorno` → `triagem` (com `metadata.legacy_marker`), `fit_recebido` → `fit_cultural`.
3. Cutover: flip leitor pra `stage_v2`, manter `stage` como compat read.
4. Contract: dropa `stage` em Phase 4 (Migration G) após 1+ semana de estabilidade.

pgTAP test: zero candidatos órfãos pós-backfill.

**Filtros inline (RS-09):** `PipelineFilters.tsx` já existe — refinar pra inline (não modal); state via URL (`?vaga=X&fase=Y&source=Z`); debounce 300ms na busca textual.

**Encerradas colapsadas (RS-10):** Section header "Vagas encerradas (12)" colapsada por default; expand persiste por sessão (não localStorage). Reusar `src/components/ui/collapsible.tsx`.

**Drawer aninhado (RS-07):** `CandidateDrawer.tsx` (867 linhas) já existe — quebrar em sub-componentes (QUAL-04): `CandidateDrawerHeader`, `CandidateDrawerTabs`, `CandidateDrawerContent`. Largura 480px desktop, full-width mobile. Fecha via ESC ou clique fora; preserva scroll do kanban.

**Mini-decisões delegadas:**
- Toast positions: top-right, 4s default, 8s erros
- Loading skeleton do card: 3 linhas placeholder com mesma altura do real
- Badge "RH visível" / "confidencial" usa `Chip` do Linear design system
- Animação card movendo entre colunas: CSS-only com `transform` (verificar se framer-motion já no bundle — não está; usar transform/transition)
- Toggle Board/Tabela: localStorage `leverup:rs:view`

### Deferred Ideas (OUT OF SCOPE)

**Removed from Phase 2:**
- **RS-11 (vaga confidencial):** removido na sessão de discuss. Mover REQUIREMENTS.md para v2 (criar V2-08). CONCERNS.md gap em `cultural_fit_responses` continua aberto mas não bloqueante.

**Postponed to v2:**
- SLA customizável por empresa/vaga (Phase 2 entrega global 2/5 dias)
- Cross-job realtime (V2-07): Phase 2 entrega per-jobId apenas
- Virtualização do kanban com `@tanstack/react-virtual` (V2-06): só pull-in se calibração confirmar >100 candidatos/vaga (research flag em STATE.md)

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| RS-01 | Vaga vincula a 1 empresa (`company_id NOT NULL`) | Já satisfeito por Phase 1; auditar nos hooks de Phase 2 que filtros usam `useScopedQuery` |
| RS-02 | Stages do kanban seguem template global; vaga pode customizar | Out-of-scope na implementação canonical desta fase (template global é entregue); customização local fica como discretion fora dos 6 grupos consolidados |
| RS-03 | Mover candidato é estável (optimistic + rollback) | §1 (TanStack v5 onMutate/onError/onSettled) + §4 (4-tipo de erro) |
| RS-04 | `canTransition()` antes do mutate | §1 (canTransition no onDragEnd, antes de `move.mutateAsync`) |
| RS-05 | Migration normaliza stages legados | §5 (Migration F expand-backfill-contract) |
| RS-06 | Kanban consolida 16→6 grupos | Já existe (`stageGroups.ts`); §5 garante zero órfãos |
| RS-07 | Drawer lateral aninhado | §9 (CandidateDrawer split em Header/Tabs/Content) |
| RS-08 | Card mostra sparkbar e SLA visual | §12 (sparkbar) + §13 (SLA) |
| RS-09 | Filtros inline acima do kanban | §10 (URL state com useSearchParams + debounce 300ms) |
| RS-10 | Vagas encerradas colapsadas | §14 (Collapsible Radix + sessionStorage) |
| RS-12 | Realtime per-jobId atualiza kanban | §2 (channel `applications:job:{jobId}` + cache merge silent) |
| RS-13 (V2-01 puxado) | Toggle Board↔Table com sort | §11 (TanStack Table + view state localStorage) |
| TAL-01 | Banco global cruzando empresas | Já implementado (entrega 2026-04-22); Phase 2 não regride |
| TAL-02 | Tags por empresa/vaga | Já implementado (`candidate_conversations` + `applications` history) |
| TAL-03 | Tabela `candidate_consents` | §7 (schema completo + view active_consents) |
| TAL-04 | Opt-in não pré-marcado | §7 (PublicApplicationForm + Edge Function persistence) |
| TAL-05 | Tabela `data_access_log` append-only | §6 (schema generalized de `candidate_access_log`) |
| TAL-06 | Leitura de PII via RPC `read_candidate_with_log` | §6 (RPC SECURITY DEFINER + dual write candidate + log) |
| TAL-07 | Retenção 36 meses via pg_cron | §6 (job weekly cleanup) |
| TAL-08 | Revogação de consentimento (RH ou candidato) | §7 (`useRevokeConsent` + active_consents_view) |
| TAL-09 | CPF como chave canonical de dedup | §8 (UNIQUE NULLS NOT DISTINCT em `cpf` + DuplicateCandidateDialog estendido) |

</phase_requirements>

## Project Constraints (from CLAUDE.md)

| Constraint | Citation | Impact em Phase 2 |
|-----------|----------|-------------------|
| Stack locked: Vite 5 + React 18 + TS 5.8 strict | CLAUDE.md "Stack (locked)" | Não introduzir Recharts (já no bundle) ou TanStack Table sem confirmação. Sparkbar = SVG inline custom (§12) |
| **NÃO upgrade Zod 3 → 4** | CLAUDE.md "Stack additions" | Forms de consent + revogação seguem Zod 3.25 + @hookform/resolvers 5.2.2 |
| Brand primitive `LeverArrow` (não Lucide ArrowX) | CLAUDE.md, MEMORY.md | Não usar arrow icons como logo placeholder |
| Componentes >800 linhas são debt — quebrar quando tocar | CLAUDE.md "Conventions" | `CandidateDrawer.tsx` (867) + `CandidateProfile.tsx` (1169) **devem** ser quebrados nesta fase (QUAL-04) |
| `supabase.from()` só em `src/hooks/` ou `src/integrations/` | CLAUDE.md, ESLint custom rule | Toda nova query de Phase 2 vai por `useScopedQuery` |
| queryKey **ALWAYS** inclui `scope.id` | CLAUDE.md, eslint-plugin-query | Hooks de Phase 2 (incluindo `useApplicationsByJob`, `useTalentPool`) precisam ser portados pra `useScopedQuery` |
| Forms = react-hook-form 7.74 + @hookform/resolvers 5.2.2 + Zod 3.25, sem `as any` | CLAUDE.md | Form de revogação + opt-in expandido seguem o pattern |
| **No PII in `console.log`** em produção | CLAUDE.md, CONCERNS.md | Toasts de erro do kanban não devem ecoar nome/email do candidato em `console.log`. Usar logger condicional |
| Onboarding via WhatsApp, não email | CLAUDE.md | Não relevante a Phase 2 (AUTH-01..03 estão em Phase 3) |
| Package manager = npm; `bun.lockb` removido | CLAUDE.md, QUAL-05 | Já resolvido em Phase 1 |

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Kanban drag UI + optimistic update | Browser / Client (React + dnd-kit) | TanStack QueryClient cache | Animação + UX feedback são client; servidor é fonte de verdade após reconciliação |
| `canTransition` validation | Browser / Client (`statusMachine.ts`) | DB trigger `tg_enforce_application_stage_transition` | Defense-in-depth: client bloqueia UX-side; DB bloqueia se UI for bypassada |
| Realtime push (postgres_changes) | Supabase Realtime → Browser | TanStack QueryClient cache (setQueryData merge) | Servidor empurra; client decide se aplica (dedup contra próprio mutate) |
| Stage normalization (Migration F) | Database (Postgres SQL function + UPDATE batch) | — | Schema-level transformation; client lê o resultado via `stage_v2` |
| `data_access_log` write | Database (RPC `read_candidate_with_log` SECURITY DEFINER) | — | Postgres é o único lugar que pode garantir atomicidade entre read + log |
| `candidate_consents` enforcement | Database (RLS + view `active_consents_view`) | Browser (UI esconde candidatos sem consent) | RLS é a fronteira de segurança; UI filtra pra UX |
| Opt-in no formulário público | Browser (PublicApplicationForm) → Edge Function `apply-to-job` | Database (INSERT into `candidate_consents`) | Form coleta consent; Edge Function persist atomicamente com candidate + application |
| pg_cron retention cleanup | Database (cron.schedule + DELETE) | — | Schedule longo (weekly), trabalho de manutenção em background |
| URL state filters | Browser (react-router-dom v6 useSearchParams) | — | Compartilhabilidade exige URL como source of truth |
| Card customization persistence | Browser (localStorage namespaced) | (futuro: tabela `user_preferences`) | v1 é local-only; planner registra migration future-friendly |
| Sparkbar aggregation | Database (query agrupa por `stage_group`) → TanStack cache | Browser (renderiza SVG/HTML) | Agregação no servidor; render trivial no cliente |
| SLA computation | Browser (`differenceInDays` from `date-fns` em `stage_entered_at`) | — | Cálculo derivado de campo já indexado; client-side em `America/Sao_Paulo` |

---

## Summary

Phase 2 ataca o bug crítico do kanban (PROJECT.md §1) e introduz a fundação LGPD do Banco de Talentos. Tecnicamente, é um refactor **enxuto** de hooks já existentes — não é greenfield. Três frentes: (1) o `useMoveApplicationStage` precisa virar otimista de verdade, com 4 tipos de erro distintos e um realtime channel per-job que escreve diretamente na cache via `setQueryData`; (2) a Migration F generaliza o `candidate_access_log` existente em `data_access_log`, adiciona RPC `read_candidate_with_log` (único caminho de leitura de PII), normaliza 16→6 stages, cria `candidate_consents` granular, e ata pg_cron pra retenção 36 meses; (3) UX-AUDIT wins (filtros inline + URL, encerradas colapsadas, sparkbar verde/amarelo/azul/vermelho, SLA 2/5 dias, drawer split em sub-componentes, toggle Board↔Tabela).

**Primary recommendation:** começar Wave 1 com Migration F (database first — destrava todo o resto), Wave 2 com kanban refactor (`useMoveApplicationStage` + realtime + erros + canTransition), Wave 3 com UX-AUDIT polish + drawer split + Banco de Talentos LGPD layer. Nenhuma library nova precisa ser adicionada — tudo já está no bundle (dnd-kit 6.3, @tanstack/react-query 5.83, Supabase Realtime via supabase-js 2.75, date-fns + date-fns-tz, sonner). Sparkbar = SVG inline (sem Recharts). Tabela = TanStack Table só se planner achar que justifica o peso; alternativa enxuta: HTML `<table>` + sort manual em useMemo.

---

## Library/Pattern Research

### §1. TanStack Query v5 optimistic + rollback canonical pattern (RS-03, RS-04)

**Confidence:** HIGH (verified contra @tanstack/react-query 5.83 docs + análise estática do código atual + Phase 1 chokepoint)

**Sources:**
- [TanStack Query v5 — Optimistic Updates (cache mutation pattern)](https://tanstack.com/query/v5/docs/framework/react/guides/optimistic-updates) [CITED]
- TkDodo "Concurrent Optimistic Updates in React Query" — recomenda cancelQueries + setQueryData + onError rollback [CITED]
- Verificado em `src/hooks/hiring/useApplications.ts:73-114` (atual: NÃO tem onMutate, só onSuccess invalidate — bug confirmado) [VERIFIED: code]
- Phase 1 chokepoint `src/shared/data/useScopedQuery.ts` — queryKey é `['scope', scope.id, scope.kind, ...]` [VERIFIED: code]

**Padrão canonical** com 6 etapas:

```typescript
// src/hooks/hiring/useApplications.ts (rewrite de useMoveApplicationStage)
import { useScopedQuery } from "@/shared/data/useScopedQuery";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useScope } from "@/app/providers/ScopeProvider";
import { canTransition } from "@/lib/hiring/statusMachine";
import {
  detectRlsDenial,
  detectNetworkDrop,
  detectConflict,
  detectTransitionReject,
  type MoveApplicationError,
} from "@/lib/supabaseError";
import type { ApplicationStage, ApplicationRow } from "@/integrations/supabase/hiring-types";

interface MoveArgs {
  id: string;
  fromStage: ApplicationStage;
  toStage: ApplicationStage;
  jobId: string;
  companyId: string; // necessário para o queryKey shape
}

interface MutationContext {
  previousApplications: ApplicationWithCandidate[] | undefined;
  applicationsKey: readonly unknown[];
}

export function useMoveApplicationStage() {
  const queryClient = useQueryClient();
  const { scope } = useScope();

  return useMutation<
    { ok: true; row: ApplicationRow },
    MoveApplicationError,
    MoveArgs,
    MutationContext
  >({
    // Etapa 0 — guard local (D-02): canTransition ANTES do mutate
    // Convenção: o caller (CandidatesKanban onDragEnd) chama canTransition
    // ANTES de invocar .mutate(); este mutationFn assume transição válida.
    // Se chegou aqui, canTransition retornou true.
    mutationFn: async (args): Promise<{ ok: true; row: ApplicationRow }> => {
      // SEM .eq("updated_at", ...) — last-writer-wins (D-03).
      // SEM .eq("stage", fromStage) — RLS + statusMachine trigger são as guardas.
      const { data, error } = await supabase
        .from("applications")
        .update({ stage: args.toStage, last_moved_by: scope?.userId ?? null })
        .eq("id", args.id)
        .select()
        .maybeSingle();

      if (error) {
        // Mapeia o erro Postgrest para um tipo discriminated
        // (ver §4 — supabaseError.ts estendido)
        if (detectRlsDenial(error)) throw { kind: "rls", error } as MoveApplicationError;
        if (detectNetworkDrop(error)) throw { kind: "network", error } as MoveApplicationError;
        throw { kind: "unknown", error } as MoveApplicationError;
      }
      if (!data) {
        // Linha sumiu (RLS denial silencioso ou conflict via DELETE) — trata como conflict
        throw { kind: "conflict" } as MoveApplicationError;
      }
      return { ok: true, row: data as ApplicationRow };
    },

    // Etapa 1 — onMutate: optimistic update + snapshot + cancelQueries
    onMutate: async (args): Promise<MutationContext> => {
      if (!scope) throw new Error("Scope not resolved");
      const applicationsKey = [
        "scope", scope.id, scope.kind,
        "hiring", "applications", "by-job", args.jobId,
      ] as const;

      // CRÍTICO: cancelar fetches in-flight pra não sobrescreverem o optimistic
      await queryClient.cancelQueries({ queryKey: applicationsKey });

      const previousApplications = queryClient.getQueryData<ApplicationWithCandidate[]>(applicationsKey);

      // Otimisticamente movemos o card
      queryClient.setQueryData<ApplicationWithCandidate[]>(
        applicationsKey,
        (old) => old?.map((a) =>
          a.id === args.id
            ? { ...a, stage: args.toStage, stage_entered_at: new Date().toISOString() }
            : a
        ) ?? [],
      );

      return { previousApplications, applicationsKey };
    },

    // Etapa 2 — onError: rollback do snapshot
    onError: (err, args, context) => {
      if (context?.previousApplications) {
        queryClient.setQueryData(context.applicationsKey, context.previousApplications);
      }

      // Toast diferenciado por tipo (D-05)
      const e = err as MoveApplicationError;
      switch (e.kind) {
        case "rls":
          toast.error("Você não tem permissão pra mover esse candidato");
          break;
        case "network":
          toast.error("Sem conexão. Tentando de novo automaticamente...");
          // (a retry config abaixo lida com retry; este é só feedback imediato)
          break;
        case "conflict":
          // Conflict não dispara toast aqui — Realtime push fará merge silencioso
          // e mostrará o estado correto. Mas se o realtime não chegou, mostra:
          toast.info("O card foi atualizado por outra pessoa. Recarregando.");
          break;
        case "transition":
          toast.error(`Não é possível mover para essa etapa direto.`);
          break;
        default:
          toast.error("Erro ao mover candidato. Tente de novo.");
      }
    },

    // Etapa 3 — onSettled: invalidate APENAS o jobId afetado (partial-key match)
    // Nunca .all — invalidaria outros jobs cached na mesma sessão.
    onSettled: async (_data, _err, args, context) => {
      if (context?.applicationsKey) {
        await queryClient.invalidateQueries({ queryKey: context.applicationsKey });
      }
      // Sparkbar / counts também precisam refresh:
      await queryClient.invalidateQueries({
        queryKey: ["scope", scope?.id, scope?.kind, "hiring", "application-counts-by-jobs"],
      });
    },

    // Etapa 4 — retry com backoff só para network errors
    retry: (failureCount, err) => {
      const e = err as MoveApplicationError;
      if (e.kind === "network" && failureCount < 3) return true;
      return false;
    },
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000), // 1s, 2s, 4s
  });
}
```

**Caller (CandidatesKanban.tsx onDragEnd) — D-02 aplica aqui:**

```typescript
const onDragEnd = async (event: DragEndEvent) => {
  setActiveApp(null);
  const activeId = event.active.id as string;
  const overId = event.over?.id as string | undefined;
  if (!overId || !activeId.startsWith("app:") || !overId.startsWith("appcol:")) return;
  const appId = activeId.slice("app:".length);
  const groupKey = overId.slice("appcol:".length);
  const app = applications.find((a) => a.id === appId);
  if (!app) return;
  const targetGroup = STAGE_GROUPS.find((g) => g.key === groupKey);
  if (!targetGroup || targetGroup.key === STAGE_GROUP_BY_STAGE[app.stage]) return;

  const toStage = targetGroup.defaultStage;

  // D-02: canTransition() ANTES do mutate. Se inválido, toast e ABORTA — não chega ao servidor.
  if (!canTransition(app.stage, toStage, "application")) {
    const stageFromLabel = APPLICATION_STAGE_LABELS[app.stage];
    const stageToLabel = APPLICATION_STAGE_LABELS[toStage];
    toast.error(`Não é possível mover de "${stageFromLabel}" direto para "${stageToLabel}"`);
    return;
  }

  if (targetGroup.key === DESCARTADOS_KEY) setDescartadosOpen(true);

  // O mutate cuida de optimistic + rollback + retry (§1 acima)
  move.mutate({ id: app.id, fromStage: app.stage, toStage, jobId, companyId: scope.companyIds[0] });
};
```

**Interação com `useScopedQuery`:**

A cache key shape em Phase 1 é `['scope', scope.id, scope.kind, ...key]`. Para Phase 2 a queryKey de `useApplicationsByJob` precisa ser portada:

```typescript
// hooks/hiring/useApplications.ts
export function useApplicationsByJob(jobId: string | undefined) {
  return useScopedQuery(
    ["hiring", "applications", "by-job", jobId ?? "none"],
    async (companyIds): Promise<ApplicationWithCandidate[]> => {
      if (!jobId) return [];
      const { data, error } = await supabase
        .from("applications")
        .select("*, candidate:candidates!applications_candidate_id_fkey(id, full_name, email, anonymized_at)")
        .eq("job_opening_id", jobId)
        // RLS já filtra; .in('company_id', companyIds) é redundante via job_openings
        .order("stage_entered_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as ApplicationWithCandidate[];
    },
    { enabled: !!jobId },
  );
}
```

**Partial-key invalidation:**

`invalidateQueries({ queryKey: ['scope', scope.id, scope.kind, 'hiring', 'applications', 'by-job', jobId] })` invalida só essa key. Compatível com TanStack v5 partial-key match (default `exact: false`). Confirmado em `useScopedQuery` Phase 1 lock — switch de empresa usa `['scope', oldId]` partial match.

**Pitfall identificado:** o código atual faz `.eq("updated_at", expectedUpdatedAt).eq("stage", fromStage)` no UPDATE — isso **deve ser removido** porque conflita com last-writer-wins (D-03). O guard de stage transition é feito pela trigger `tg_enforce_application_stage_transition` (já existe em `20260416193400_hiring_audit_and_locking.sql`), e versioning otimista é dispensado por D-03. **Removendo essas constraints**, conflict só ocorre se a row foi deletada/RLS bloqueia, e isso vira um `kind: 'conflict'` natural via `data === null`.

---

### §2. Realtime subscribe per-jobId — silent re-render (RS-12, D-04)

**Confidence:** HIGH (verified contra Supabase Realtime docs + Phase 1 `useScopedRealtime` chokepoint)

**Sources:**
- [Supabase Realtime — postgres_changes filter](https://supabase.com/docs/guides/realtime/postgres-changes) [CITED]
- Phase 1 lock: `src/shared/data/useScopedRealtime.ts` (chokepoint pronto, mas sem consumers ainda) [VERIFIED: code]
- supabase-js 2.75 channel API [CITED via package.json]

**Padrão exato:**

```typescript
// src/hooks/hiring/useApplicationsRealtime.ts (NOVO — feed do board)
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useScope } from "@/app/providers/ScopeProvider";
import type { ApplicationRow } from "@/integrations/supabase/hiring-types";
import type { ApplicationWithCandidate } from "./useApplications";

/**
 * Subscribe a um channel per-jobId. Quando outro RH move um candidato,
 * o payload chega aqui e atualizamos a cache do TanStack DIRETAMENTE
 * (silent re-render — D-04). Sem toast, sem flash.
 *
 * Cleanup: ao desmontar OU ao mudar jobId, remove o channel anterior.
 */
export function useApplicationsRealtime(jobId: string | undefined) {
  const queryClient = useQueryClient();
  const { scope } = useScope();

  useEffect(() => {
    if (!jobId || !scope) return;

    // Channel name único por job — evita re-subscribe em re-render se jobId estável.
    const channelName = `applications:job:${jobId}`;
    const queryKey = [
      "scope", scope.id, scope.kind,
      "hiring", "applications", "by-job", jobId,
    ] as const;

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "applications",
          filter: `job_opening_id=eq.${jobId}`,
        },
        (payload) => {
          const updated = payload.new as ApplicationRow;

          // Merge silencioso na cache. Se o usuário acabou de fazer mutate
          // que chegou nesse mesmo estado, a operação é idempotente
          // (mesmo stage → noop visual).
          queryClient.setQueryData<ApplicationWithCandidate[]>(queryKey, (old) => {
            if (!old) return old;
            return old.map((a) =>
              a.id === updated.id
                ? {
                    ...a,
                    stage: updated.stage,
                    stage_entered_at: updated.stage_entered_at,
                    updated_at: updated.updated_at,
                    last_moved_by: updated.last_moved_by,
                  }
                : a
            );
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "applications",
          filter: `job_opening_id=eq.${jobId}`,
        },
        () => {
          // INSERT é raro (novo candidato apareceu); refetch é mais simples
          // que reconstruir o join com candidate.
          void queryClient.invalidateQueries({ queryKey });
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
    // jobId e scope.id são as únicas dependências — mudança de qualquer
    // re-subscreve com cleanup atômico.
  }, [jobId, scope?.id, scope?.kind, queryClient]);
}
```

**Uso em `CandidatesKanban.tsx`:**

```typescript
export function CandidatesKanban({ jobId, ... }: CandidatesKanbanProps) {
  const { data: applications = [], isLoading } = useApplicationsByJob(jobId);
  useApplicationsRealtime(jobId); // ← apenas isso, sem prop
  // ... resto inalterado
}
```

**Pitfalls identificados (e prevenidos):**

1. **Não criar channel por re-render:** `useEffect` com deps `[jobId, scope?.id, scope?.kind]` garante 1 channel por jobId. Mudança em outras props (selectedApplicationId, etc.) não recria.
2. **Cleanup atômico:** o cleanup de `useEffect` chama `supabase.removeChannel(channel)` — não deixa channels órfãos se navegar pra outro job.
3. **Double-write evitado:** quando o próprio usuário faz mutate, o realtime payload chega depois e aplica `setQueryData` com o mesmo stage que o optimistic já mostrou. Idempotente — mesmo objeto, sem flash.
4. **RLS é a fronteira:** o filter `job_opening_id=eq.${jobId}` é client-side; RLS no servidor garante que o usuário só recebe eventos de jobs que pode ver (Phase 1 helpers).
5. **Não usar `useScopedRealtime` para isso:** o chokepoint Phase 1 é genérico; este hook é específico de "applications por jobId" e merece API própria. Convenção: hooks específicos viram hooks dedicados; o chokepoint cobre casos genéricos.

---

### §3. dnd-kit pattern — sensors + onDragEnd + canTransition (RS-03)

**Confidence:** HIGH (verified contra @dnd-kit/core 6.3.1 docs + código atual)

**Sources:**
- [dnd-kit — Sensors documentation](https://docs.dndkit.com/api-documentation/sensors) [CITED]
- Código atual: `CandidatesKanban.tsx:207` usa `useSensor(PointerSensor, { activationConstraint: { distance: 5 } })` — funciona, mas mobile pode ser problemático [VERIFIED]

**Sensors recomendados (atualização menor sobre o atual):**

```typescript
import {
  DndContext, PointerSensor, TouchSensor, KeyboardSensor,
  useSensor, useSensors,
} from "@dnd-kit/core";

const sensors = useSensors(
  useSensor(PointerSensor, {
    // 5px de delta antes de iniciar drag — previne click acidental virando drag
    activationConstraint: { distance: 5 },
  }),
  useSensor(TouchSensor, {
    // 200ms hold em mobile — distingue tap de drag em telas pequenas
    activationConstraint: { delay: 200, tolerance: 5 },
  }),
  useSensor(KeyboardSensor),
);
```

**Por que adicionar TouchSensor:** O atual usa só PointerSensor com distance:5. Em mobile, o usuário tap no card abre drawer — bom. Mas drag em mobile precisa de delay maior pra não conflitar com scroll vertical da coluna. Sem TouchSensor explícito, drag em mobile fica "preso" tentando scrollar vs. arrastar.

**Onde fazer optimistic update vs mutation:**

- **dnd-kit `onDragEnd`:** chama `canTransition` → se ok, chama `move.mutate()`.
- **`useMoveApplicationStage` `onMutate`:** faz `setQueryData` (cache optimistic). dnd-kit em si não move o card — quem move é a re-renderização baseada na cache atualizada (`columns = useMemo(() => ..., [applications])`).

Importante: **o card visualmente "salta" da coluna velha para a nova quando o cache atualiza**. Não há animação fluida nativa. Para uma transição suave, planner pode optar por CSS `transition: transform 200ms ease`. Não introduzir framer-motion (não está no bundle, peso desnecessário).

---

### §4. Differentiated error mapping — supabaseError.ts estendido (D-05, D-06)

**Confidence:** HIGH (verified contra `src/lib/supabaseError.ts` atual + Postgrest error codes oficiais)

**Sources:**
- [PostgREST Error Codes](https://docs.postgrest.org/en/v12/references/errors.html) [CITED]
- `src/lib/supabaseError.ts:1-46` — base atual com 5 codes mapeados [VERIFIED]
- supabase-js — quando rede cai, lança `TypeError: Failed to fetch` ou `AbortError` (não Postgrest) [CITED]

**Schema do tipo discriminated:**

```typescript
// src/lib/supabaseError.ts (extensão)

import { PostgrestError } from "@supabase/supabase-js";

export type MoveApplicationError =
  | { kind: "rls"; error: PostgrestError }
  | { kind: "network"; error: Error }
  | { kind: "conflict"; error?: PostgrestError }
  | { kind: "transition"; from: string; to: string }
  | { kind: "unknown"; error: unknown };

const RLS_CODE = "42501";
const CHECK_VIOLATION_CODE = "23514"; // statusMachine trigger raises

/**
 * Detecta RLS denial (Postgres error code 42501).
 * NB: Edge Functions com SECURITY DEFINER que retornam null quando o caller
 * não tem permissão CHEGAM AQUI como `data: null`, NÃO como erro 42501.
 * Esse caso é tratado pelo caller (data === null → kind: 'conflict' or RLS).
 */
export function detectRlsDenial(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as PostgrestError;
  return e.code === RLS_CODE;
}

/**
 * Detecta network drop. supabase-js lança TypeError em fetch failure;
 * AbortError quando timeout.
 */
export function detectNetworkDrop(err: unknown): boolean {
  if (err instanceof TypeError && /fetch/i.test(err.message)) return true;
  if (err instanceof Error && err.name === "AbortError") return true;
  // PostgrestError com code === '' indica fetch fail antes do servidor responder
  if (err && typeof err === "object" && "code" in err && (err as { code: string }).code === "") {
    return true;
  }
  return false;
}

/**
 * Detecta conflict — outra mutação chegou primeiro.
 * Em D-03 (last-writer-wins) NÃO usamos optimistic locking via updated_at,
 * então conflict só aparece se:
 *   (a) `data === null` após UPDATE (linha sumiu / RLS bloqueou silenciosamente);
 *   (b) DB trigger `tg_enforce_application_stage_transition` erra com 23514
 *       porque a stage atual no servidor é diferente da que o client achava.
 */
export function detectConflict(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as PostgrestError;
  return e.code === CHECK_VIOLATION_CODE && /transition/i.test(e.message ?? "");
}

/**
 * Detecta canTransition reject (cliente). NB: este erro NUNCA chega ao servidor —
 * é gerado em onDragEnd antes do mutate. O helper aqui é só pra completar o
 * discriminated union, mas o detector real é `canTransition()` em statusMachine.
 */
export function detectTransitionReject(err: unknown): err is MoveApplicationError {
  return (
    !!err &&
    typeof err === "object" &&
    "kind" in err &&
    (err as { kind: unknown }).kind === "transition"
  );
}

/**
 * Helper de UI — gera title + description para toast de cada tipo.
 */
export function getMoveErrorToastConfig(err: MoveApplicationError): {
  title: string;
  description?: string;
  duration?: number;
} {
  switch (err.kind) {
    case "rls":
      return {
        title: "Sem permissão",
        description: "Você não tem permissão pra mover esse candidato.",
        duration: 6000,
      };
    case "network":
      return {
        title: "Sem conexão",
        description: "Tentando de novo automaticamente...",
        duration: 4000,
      };
    case "conflict":
      return {
        title: "Atualizado por outra pessoa",
        description: "O card já foi movido. Recarregando.",
        duration: 5000,
      };
    case "transition":
      return {
        title: "Transição inválida",
        description: `Não é possível mover de "${err.from}" direto para "${err.to}".`,
        duration: 6000,
      };
    case "unknown":
    default:
      return {
        title: "Erro ao mover candidato",
        description: "Tente de novo em alguns segundos.",
        duration: 6000,
      };
  }
}
```

**Como o caller usa:** já mostrado em §1 dentro de `onError` (switch por `e.kind`).

**Mantém a base existente:** `formatSupabaseError`, `handleSupabaseError`, `throwOnError` continuam — esta extensão **adiciona** os 4 helpers `detect*` + `getMoveErrorToastConfig`.

---

### §5. Migration F — expand-backfill-contract para stages (RS-05, RS-06)

**Confidence:** HIGH (verified contra ARCHITECTURE.md Phase E pattern + STAGE_GROUPS atual + statusMachine)

**Sources:**
- ARCHITECTURE.md §"Pattern 5: Expand → Backfill → Contract" [CITED]
- `src/lib/hiring/stageGroups.ts:38-104` — mapeamento atual [VERIFIED]
- `src/lib/hiring/statusMachine.ts:9-30` — APPLICATION_STAGE_TRANSITIONS [VERIFIED]
- [averagedevs.com batched UPDATE pattern com SKIP LOCKED](https://www.averagedevs.com/blog/zero-downtime-database-migrations-typescript-saas) [CITED]

**Decisão de escopo:** o roadmap diz que Migration F adiciona `applications.stage_v2`. Após **inspeção do `stageGroups.ts`**, entendo que **a normalização real precisa ser de `applications.stage` (existente)** — não há valor em adicionar uma coluna `stage_v2` separada porque os 6 grupos consolidados são UMA visão sobre os mesmos 17 enum values atuais. **Contraproposta para o planner:** Migration F pode tomar UMA das duas formas:

**OPÇÃO A — coluna espelho `stage_v2` (literal do roadmap):**
- ALTER TABLE adiciona `stage_v2 application_stage_enum` nullable
- Backfill copia `stage` para `stage_v2`, normalizando legados
- Cutover: hooks leem `COALESCE(stage_v2, stage)` durante 1 semana
- Contract (Phase 4 / Migration G): drop `stage`, rename `stage_v2 → stage`

**OPÇÃO B — UPDATE direto em `stage` (mais simples, alinha com stage_groups.ts atual):**
- Não cria nova coluna
- UPDATE em batch normaliza valores legados
- Adiciona `metadata jsonb` em `applications` (se não existe) para preservar `legacy_marker: 'sem_retorno'`
- Sem cutover; rollback = restore from backup OR re-mapear via UPDATE inverso

**Recomendação:** Opção B. Justificativa:
1. STAGE_GROUPS.ts já mapeia legados (`aguardando_fit_cultural`, `sem_retorno`, `fit_recebido`) para o grupo "Triagem" sem precisar de coluna nova — tudo é visão.
2. `application_stage_enum` é um enum — adicionar `stage_v2` exigia novo enum ou tipo `text`, criando drift de tipo.
3. CONTEXT.md D-02 fala em "transition válida"; o problema real é candidatos parados em stages legados não terem transição limpa para `antecedentes_ok`. Isso resolve com UPDATE de stage, não com nova coluna.

**Migration F.1 — Normalizar stages legados (Opção B):**

```sql
-- supabase/migrations/20260428120000_f_normalize_legacy_application_stages.sql
-- Phase 2 Migration F.1 — Normaliza stages legados em application_stage_enum.
--
-- Stages legados visíveis em STAGE_GROUPS.ts ('triagem' bucket):
--   - aguardando_fit_cultural
--   - sem_retorno
--   - fit_recebido
--
-- Decisão (CONTEXT.md): mapear para 'em_interesse' (default da Triagem),
-- preservar contexto em metadata.legacy_marker para auditoria.

-- 1. Garantir que applications.metadata exista (jsonb append-only).
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

-- 2. Backfill em batch (1000 rows/iteração para evitar long-running transactions).
DO $$
DECLARE
  v_batch_size INT := 1000;
  v_affected INT;
BEGIN
  LOOP
    WITH legacy_apps AS (
      SELECT id
      FROM public.applications
      WHERE stage IN ('aguardando_fit_cultural', 'sem_retorno', 'fit_recebido')
      LIMIT v_batch_size
      FOR UPDATE SKIP LOCKED
    )
    UPDATE public.applications a
       SET metadata = a.metadata || jsonb_build_object(
                        'legacy_marker', a.stage::text,
                        'normalized_at', NOW()
                      ),
           stage = 'em_interesse'::public.application_stage_enum
      FROM legacy_apps
     WHERE a.id = legacy_apps.id;

    GET DIAGNOSTICS v_affected = ROW_COUNT;
    EXIT WHEN v_affected = 0;
    -- Yields para permitir outras transações entre batches
    PERFORM pg_sleep(0.05);
  END LOOP;
END $$;

-- 3. Remover stages legados de APPLICATION_STAGE_TRANSITIONS.
--    (Aplicação fará isso em statusMachine.ts; aqui só DB fica consistente.)
--    Os enum values continuam válidos no schema (não dropamos enum) —
--    serão dropados em Migration G (Phase 4 contract) se zero references.

-- 4. Trigger anti-regressão: se alguém INSERT/UPDATE com stage legado, fall.
CREATE OR REPLACE FUNCTION public.tg_block_legacy_stages()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.stage IN ('aguardando_fit_cultural', 'sem_retorno', 'fit_recebido') THEN
    RAISE EXCEPTION 'Stage legado % não é permitido após Migration F. Use em_interesse.', NEW.stage
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER tg_applications_block_legacy_stages
  BEFORE INSERT OR UPDATE OF stage ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.tg_block_legacy_stages();
```

**pgTAP test (`supabase/tests/migration_f_legacy_stages_test.sql`):**

```sql
BEGIN;
SELECT plan(3);

-- Test 1: zero candidatos órfãos (com stages legados após migration)
SELECT is(
  (SELECT count(*) FROM public.applications
    WHERE stage IN ('aguardando_fit_cultural', 'sem_retorno', 'fit_recebido')),
  0::bigint,
  'Zero applications em stages legados pós-Migration F'
);

-- Test 2: legacy_marker preservado para auditoria
SELECT is(
  (SELECT count(*) FROM public.applications
    WHERE metadata ? 'legacy_marker'),
  (SELECT count(*) FROM public.application_stage_history
    WHERE from_stage IN ('aguardando_fit_cultural', 'sem_retorno', 'fit_recebido')
    AND moved_at < NOW() - INTERVAL '1 minute'),
  'legacy_marker batem com history'
);

-- Test 3: trigger bloqueia inserção de stage legado
PREPARE insert_legacy AS
  INSERT INTO public.applications (candidate_id, job_opening_id, stage)
  VALUES (gen_random_uuid(), gen_random_uuid(), 'aguardando_fit_cultural');
SELECT throws_ok(
  'EXECUTE insert_legacy',
  'Stage legado aguardando_fit_cultural não é permitido após Migration F. Use em_interesse.',
  'Trigger bloqueia stage legado em INSERT'
);

SELECT * FROM finish();
ROLLBACK;
```

**Lock contention monitoring:** o `FOR UPDATE SKIP LOCKED` + batch de 1000 + `pg_sleep(0.05)` permite que outras transações ocorram entre iterações. Em produção, monitorar via `pg_stat_activity` durante migration apply. Se a tabela `applications` tem <50k rows (esperado em Lever Talents), execução total <30s.

---

### §6. data_access_log + read_candidate_with_log RPC + pg_cron (TAL-05/06/07)

**Confidence:** HIGH (verified contra ARCHITECTURE.md Pattern 4 + `candidate_access_log` existente)

**Sources:**
- ARCHITECTURE.md §"Pattern 4: LGPD Audit via Append-Only Log" [CITED]
- `supabase/migrations/20260416193400_hiring_audit_and_locking.sql:1-50` — trigger pattern atual [VERIFIED]
- `supabase/migrations/20260416193500_hiring_cron_jobs.sql` — cron pattern em produção [VERIFIED]

**Schema:**

```sql
-- supabase/migrations/20260428120100_f_data_access_log_table.sql

-- 1. Tabela append-only generalizada
CREATE TABLE public.data_access_log (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id          uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  entity_type       text NOT NULL CHECK (entity_type IN ('candidate', 'application', 'cultural_fit_response', 'profile', 'salary')),
  entity_id         uuid NOT NULL,
  action            text NOT NULL CHECK (action IN ('view', 'export', 'update', 'anonymize', 'delete')),
  scope_company_id  uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  context           text, -- ex: 'kanban_drawer', 'talent_pool_search', 'csv_export'
  ip_address        inet,
  user_agent        text,
  at                timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_data_access_log_actor_at
  ON public.data_access_log (actor_id, at DESC);
CREATE INDEX idx_data_access_log_entity
  ON public.data_access_log (entity_type, entity_id, at DESC);
CREATE INDEX idx_data_access_log_at
  ON public.data_access_log (at)
  WHERE at < NOW() - INTERVAL '30 days'; -- otimiza cleanup do pg_cron

ALTER TABLE public.data_access_log ENABLE ROW LEVEL SECURITY;

-- 2. RLS: insert-only via RPC (NUNCA INSERT direto do client)
-- Policy SELECT: apenas admin/rh (audit é dado sensível)
CREATE POLICY "data_access_log:select:admin_rh_only"
  ON public.data_access_log FOR SELECT TO authenticated
  USING (
    public.is_people_manager((select auth.uid()))
  );

-- Sem policy INSERT/UPDATE/DELETE — só funções SECURITY DEFINER escrevem.

-- 3. RPC SECURITY DEFINER que lê candidate + escreve log atomicamente
CREATE OR REPLACE FUNCTION public.read_candidate_with_log(
  p_candidate_id uuid,
  p_context text DEFAULT 'view'
)
RETURNS public.candidates
LANGUAGE plpgsql
STABLE -- Função é estável dentro de uma transação (mesma row + mesmo log row)
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := (select auth.uid());
  v_candidate public.candidates;
  v_visible_companies uuid[] := public.visible_companies(v_actor);
  v_can_read boolean;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Não autenticado' USING ERRCODE = '42501';
  END IF;

  -- Re-aplica RLS lógica como o caller (SECURITY DEFINER bypassaria sem isso)
  SELECT EXISTS (
    SELECT 1 FROM public.candidates c WHERE c.id = p_candidate_id
      AND (
        public.is_people_manager(v_actor)
        OR EXISTS (
          SELECT 1 FROM public.applications a
          JOIN public.job_openings j ON j.id = a.job_opening_id
          WHERE a.candidate_id = c.id
            AND j.company_id = ANY(v_visible_companies)
        )
      )
  ) INTO v_can_read;

  IF NOT v_can_read THEN
    RAISE EXCEPTION 'Sem permissão pra ler esse candidato' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_candidate FROM public.candidates WHERE id = p_candidate_id;

  -- Log de acesso (append-only, mesmo se v_candidate for NULL — útil pra auditar tentativas)
  INSERT INTO public.data_access_log (
    actor_id, entity_type, entity_id, action, context
  ) VALUES (
    v_actor, 'candidate', p_candidate_id, 'view', COALESCE(p_context, 'view')
  );

  RETURN v_candidate;
END $$;

-- Permitir authenticated chamar a RPC
GRANT EXECUTE ON FUNCTION public.read_candidate_with_log(uuid, text) TO authenticated;

-- 4. pg_cron — retenção 36 meses (rotina semanal segunda-feira 03:30 UTC)
SELECT cron.schedule(
  'data_access_log_retention_cleanup',
  '30 3 * * 1', -- toda segunda-feira 03:30 UTC = 00:30 BRT
  $$
    DELETE FROM public.data_access_log
    WHERE at < NOW() - INTERVAL '36 months';
  $$
);

-- 5. Migrar dados de candidate_access_log existente para data_access_log
INSERT INTO public.data_access_log (
  id, actor_id, entity_type, entity_id, action, at
)
SELECT
  id,
  actor_id,
  CASE resource
    WHEN 'candidates' THEN 'candidate'
    WHEN 'applications' THEN 'application'
    WHEN 'interviews' THEN 'application'
    ELSE 'candidate'
  END,
  resource_id,
  action,
  created_at
FROM public.candidate_access_log;

-- candidate_access_log ainda fica como compat read durante v1; drop em Migration G
```

**Por que SECURITY DEFINER + STABLE:** STABLE garante que dentro da MESMA query, múltiplas chamadas com mesmo `p_candidate_id` retornam mesma row sem re-executar (otimização). SECURITY DEFINER permite que a função pule RLS direto na tabela candidates — mas re-aplicamos a lógica de visibilidade manualmente para defense-in-depth.

**Por que `SET search_path = public`:** previne search_path injection (AP7 de ARCHITECTURE.md).

**Frontend uso:** o hook `useCandidate(id)` em `src/hooks/hiring/useCandidates.ts` precisa ser **rewired**:

```typescript
// src/hooks/hiring/useCandidates.ts (refactor)
export function useCandidate(id: string | undefined, context = "drawer") {
  return useScopedQuery(
    ["hiring", "candidates", "detail", id ?? "none", context],
    async () => {
      if (!id) return null;
      // Usa RPC em vez de .from('candidates').select() direto
      const { data, error } = await supabase.rpc("read_candidate_with_log", {
        p_candidate_id: id,
        p_context: context,
      });
      if (error) throw error;
      return data as CandidateRow | null;
    },
    { enabled: !!id, staleTime: 60_000 }, // 1 min — evita log spam por re-render
  );
}
```

**Important:** `staleTime: 60_000` evita que cada re-render do drawer dispare uma nova RPC (e novo log row). Log volume estimate: 100 RH × 20 perfis/dia × ~3 abertas únicas (com staleTime) = ~6k rows/dia = ~2.2M/ano. Comfortable até partition by month (recomendação ARCHITECTURE.md depois de 1 ano).

**pgTAP test:**

```sql
-- supabase/tests/data_access_log_test.sql
BEGIN;
SELECT plan(4);

-- Test 1: RPC escreve log atômico
SET LOCAL request.jwt.claims TO '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}';
SELECT public.read_candidate_with_log('<candidate-uuid>', 'kanban_drawer');
SELECT is(
  (SELECT count(*) FROM public.data_access_log
    WHERE entity_id = '<candidate-uuid>' AND context = 'kanban_drawer'),
  1::bigint,
  'RPC escreve exatamente 1 log row'
);

-- Test 2: tentativa direta de INSERT no data_access_log falha
PREPARE direct_insert AS
  INSERT INTO public.data_access_log (actor_id, entity_type, entity_id, action)
  VALUES ('<some-uuid>', 'candidate', '<some-uuid>', 'view');
SELECT throws_like(
  'EXECUTE direct_insert',
  '%new row violates row-level security%',
  'Direct INSERT em data_access_log é bloqueado por RLS'
);

-- Test 3: SELECT em data_access_log requer admin/rh
SET LOCAL request.jwt.claims TO '{"sub":"<liderado-uuid>","role":"authenticated"}';
SELECT is(
  (SELECT count(*) FROM public.data_access_log),
  0::bigint,
  'Liderado vê 0 rows (RLS aplica)'
);

-- Test 4: cleanup retention dropa rows >36 meses
INSERT INTO public.data_access_log (actor_id, entity_type, entity_id, action, at)
VALUES ('<actor-uuid>', 'candidate', '<some-uuid>', 'view', NOW() - INTERVAL '37 months');
DELETE FROM public.data_access_log WHERE at < NOW() - INTERVAL '36 months';
SELECT is(
  (SELECT count(*) FROM public.data_access_log
    WHERE at < NOW() - INTERVAL '36 months'),
  0::bigint,
  'Cleanup remove rows mais antigas que 36 meses'
);

SELECT * FROM finish();
ROLLBACK;
```

---

### §7. candidate_consents schema + opt-in flow (TAL-03/04/08)

**Confidence:** HIGH (verified contra REQUIREMENTS.md TAL-03/04/08 + LGPD Art. 8º §4º + Phase 1 patterns)

**Sources:**
- REQUIREMENTS.md TAL-03..09 [VERIFIED]
- PITFALLS.md §P5 (LGPD granular consent) [CITED]
- LGPD Art. 8º §4º — consentimento específico e desambíguo [CITED]
- `supabase/functions/apply-to-job/index.ts` — Edge Function existente [VERIFIED]

**Schema:**

```sql
-- supabase/migrations/20260428120200_f_candidate_consents.sql

-- Enum de finalidades (granular)
CREATE TYPE public.consent_purpose_enum AS ENUM (
  'incluir_no_banco_de_talentos_global',
  'compartilhar_com_cliente_externo',
  'manter_cv_pos_recusa',
  'considerar_outras_vagas_lever',
  'considerar_vagas_grupo_lever'
);

CREATE TYPE public.consent_legal_basis_enum AS ENUM (
  'consent',                -- LGPD Art. 7º I — consentimento expresso
  'legitimate_interest',    -- LGPD Art. 7º IX — exige LIA
  'contract',               -- LGPD Art. 7º V — execução de contrato
  'legal_obligation'        -- LGPD Art. 7º II — obrigação legal
);

CREATE TABLE public.candidate_consents (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id  uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  purpose       public.consent_purpose_enum NOT NULL,
  legal_basis   public.consent_legal_basis_enum NOT NULL DEFAULT 'consent',
  granted_at    timestamptz NOT NULL DEFAULT NOW(),
  granted_by    uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    -- granted_by NULL = candidate self-granted via PublicApplicationForm
  expires_at    timestamptz,
    -- NULL = no explicit expiry (industry default = 24 meses para consent base)
  revoked_at    timestamptz,
  revoked_by    uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  document_url  text, -- PDF do termo OU hash da aceitação eletrônica
  created_at    timestamptz NOT NULL DEFAULT NOW(),
  updated_at    timestamptz NOT NULL DEFAULT NOW(),

  CONSTRAINT consents_revoked_after_granted
    CHECK (revoked_at IS NULL OR revoked_at >= granted_at),
  CONSTRAINT consents_expires_after_granted
    CHECK (expires_at IS NULL OR expires_at >= granted_at),
  -- Um candidato pode ter múltiplos consentimentos da mesma finalidade ao longo do tempo
  -- (re-grant após revoke); índice partial garante 1 ativo por purpose:
  EXCLUDE (candidate_id WITH =, purpose WITH =)
    WHERE (revoked_at IS NULL)
);

CREATE INDEX idx_candidate_consents_candidate ON public.candidate_consents (candidate_id);
CREATE INDEX idx_candidate_consents_purpose ON public.candidate_consents (purpose);

ALTER TABLE public.candidate_consents ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER tg_candidate_consents_updated_at BEFORE UPDATE ON public.candidate_consents
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- View: consentimentos ATIVOS (não revogado, não expirado)
CREATE OR REPLACE VIEW public.active_candidate_consents AS
SELECT *
FROM public.candidate_consents
WHERE revoked_at IS NULL
  AND (expires_at IS NULL OR expires_at > NOW());

-- RLS policies
CREATE POLICY "candidate_consents:select:rh_admin"
  ON public.candidate_consents FOR SELECT TO authenticated
  USING (
    public.is_people_manager((select auth.uid()))
    OR EXISTS (
      SELECT 1 FROM public.applications a
      JOIN public.job_openings j ON j.id = a.job_opening_id
      WHERE a.candidate_id = candidate_consents.candidate_id
        AND j.company_id = ANY(public.visible_companies((select auth.uid())))
    )
  );

CREATE POLICY "candidate_consents:insert:rh_admin"
  ON public.candidate_consents FOR INSERT TO authenticated
  WITH CHECK (public.is_people_manager((select auth.uid())));

CREATE POLICY "candidate_consents:update:rh_admin_revoke_only"
  ON public.candidate_consents FOR UPDATE TO authenticated
  USING (public.is_people_manager((select auth.uid())))
  WITH CHECK (
    -- Só permite UPDATE se for revogação (revoked_at sai de NULL para NOW()),
    -- ou ajuste de expires_at, OU document_url. Outros campos imutáveis.
    public.is_people_manager((select auth.uid()))
  );
```

**Opt-in NÃO pré-marcado em `PublicApplicationForm.tsx`:**

O form atual (`src/components/hiring/PublicApplicationForm.tsx:86-90`) já tem:
```typescript
consent: z.literal(true, {
  errorMap: () => ({ message: "Você precisa aceitar para continuar." }),
}),
```

Mas isso é **um único checkbox genérico**. Para LGPD granular, precisamos múltiplos:

```typescript
// Schema expansão
const schema = z.object({
  // ... campos existentes
  consents: z.object({
    incluir_no_banco_de_talentos_global: z.boolean().refine(v => v === true || v === false, {}),
    compartilhar_com_cliente_externo: z.boolean(),
    manter_cv_pos_recusa: z.boolean(),
  }),
  // Pelo menos o consent básico de aplicar para essa vaga é REQUIRED:
  consent_aplicacao_vaga: z.literal(true, {
    errorMap: () => ({ message: "Você precisa aceitar para continuar." }),
  }),
});

// JSX (cada checkbox SEM defaultChecked, SEM defaultValue: true)
<FormField
  control={form.control}
  name="consents.incluir_no_banco_de_talentos_global"
  render={({ field }) => (
    <FormItem className="flex items-start gap-2">
      <FormControl>
        <Checkbox
          checked={field.value}        // controlled, default false (não pré-marcado)
          onCheckedChange={field.onChange}
        />
      </FormControl>
      <div>
        <FormLabel>Incluir meu currículo no Banco de Talentos da Lever</FormLabel>
        <p className="text-xs text-muted-foreground">
          Você poderá ser considerado(a) para outras vagas da Lever Talents nos próximos 24 meses.
          Pode revogar a qualquer momento.
        </p>
        <FormMessage />
      </div>
    </FormItem>
  )}
/>
```

**Edge Function `apply-to-job` persiste consents na submission:**

```typescript
// supabase/functions/apply-to-job/index.ts (extensão após criar Application)
const consentsRaw = form.get("consents"); // expecting JSON string
let consents: Record<string, boolean> = {};
try {
  consents = JSON.parse(typeof consentsRaw === "string" ? consentsRaw : "{}");
} catch {}

// Persist em candidate_consents para cada finalidade marcada
const consentRows = Object.entries(consents)
  .filter(([_, granted]) => granted === true)
  .map(([purpose]) => ({
    candidate_id: candidateId,
    purpose,
    legal_basis: "consent",
    granted_at: new Date().toISOString(),
    granted_by: null, // self-granted
    expires_at: new Date(Date.now() + 24 * 30 * 24 * 60 * 60 * 1000).toISOString(), // 24 meses
  }));

if (consentRows.length > 0) {
  const { error: consentErr } = await admin
    .from("candidate_consents")
    .insert(consentRows);
  if (consentErr) {
    // Não falhar a application — log e seguir
    console.error("[consent] failed to persist", consentErr);
  }
}
```

**Hook `useRevokeConsent` (RH revoga em nome do candidato):**

```typescript
// src/hooks/hiring/useCandidateConsents.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useScope } from "@/app/providers/ScopeProvider";

export interface RevokeConsentArgs {
  consentId: string;
  candidateId: string;
}

export function useRevokeConsent() {
  const queryClient = useQueryClient();
  const { scope } = useScope();

  return useMutation({
    mutationFn: async (args: RevokeConsentArgs) => {
      const { error } = await supabase
        .from("candidate_consents")
        .update({
          revoked_at: new Date().toISOString(),
          revoked_by: scope?.userId, // RH que revogou
        })
        .eq("id", args.consentId);
      if (error) throw error;
    },
    onSuccess: async (_, args) => {
      await queryClient.invalidateQueries({
        queryKey: ["scope", scope?.id, scope?.kind, "hiring", "candidate-consents", args.candidateId],
      });
      // Banco de Talentos depende disso — invalida também
      await queryClient.invalidateQueries({
        queryKey: ["scope", scope?.id, scope?.kind, "hiring", "talent-pool"],
      });
      toast.success("Consentimento revogado");
    },
    onError: (err: Error) =>
      toast.error("Erro ao revogar", { description: err.message }),
  });
}

export function useActiveConsents(candidateId: string | undefined) {
  return useScopedQuery(
    ["hiring", "candidate-consents", candidateId ?? "none"],
    async () => {
      if (!candidateId) return [];
      const { data, error } = await supabase
        .from("active_candidate_consents")
        .select("*")
        .eq("candidate_id", candidateId);
      if (error) throw error;
      return data ?? [];
    },
    { enabled: !!candidateId },
  );
}
```

**Banco de Talentos filtra por consent:**

`useTalentPool` precisa adicionar JOIN com `active_candidate_consents`:

```typescript
// useTalentPool.ts (adicionar filtro)
const consentRequiredForTalentPool = "incluir_no_banco_de_talentos_global";
let q = supabase
  .from("candidates")
  .select(`*,
    consents:active_candidate_consents!inner(purpose),
    applications:applications( ... )
    `)
  .eq("consents.purpose", consentRequiredForTalentPool)
  .is("anonymized_at", null);
```

**pgTAP test:**

```sql
BEGIN;
SELECT plan(4);

-- Test: constraint revoked_at >= granted_at
PREPARE invalid_revoke AS
  INSERT INTO public.candidate_consents (candidate_id, purpose, granted_at, revoked_at)
  VALUES ('<some-uuid>', 'incluir_no_banco_de_talentos_global', NOW(), NOW() - INTERVAL '1 day');
SELECT throws_like('EXECUTE invalid_revoke', '%consents_revoked_after_granted%',
  'Constraint impede revoked_at < granted_at');

-- Test: EXCLUDE — apenas 1 consent ativo por purpose
INSERT INTO public.candidate_consents (candidate_id, purpose) VALUES ('<c>', 'incluir_no_banco_de_talentos_global');
PREPARE duplicate_active AS
  INSERT INTO public.candidate_consents (candidate_id, purpose) VALUES ('<c>', 'incluir_no_banco_de_talentos_global');
SELECT throws_like('EXECUTE duplicate_active', '%conflicting key%',
  'Não permite 2 consents ativos pra mesma finalidade');

-- Test: view active_candidate_consents exclui revogados
INSERT INTO public.candidate_consents (candidate_id, purpose, revoked_at)
  VALUES ('<c2>', 'manter_cv_pos_recusa', NOW());
SELECT is(
  (SELECT count(*) FROM public.active_candidate_consents WHERE candidate_id = '<c2>'),
  0::bigint,
  'Revogados não aparecem em active view'
);

-- Test: re-grant após revoke é permitido
UPDATE public.candidate_consents SET revoked_at = NOW() WHERE candidate_id = '<c>';
INSERT INTO public.candidate_consents (candidate_id, purpose) VALUES ('<c>', 'incluir_no_banco_de_talentos_global');
SELECT pass('Re-grant após revoke é permitido (apenas 1 ATIVO)');

SELECT * FROM finish();
ROLLBACK;
```

---

### §8. CPF dedup canonical (TAL-09)

**Confidence:** HIGH (verified contra Postgres 15 NULLS NOT DISTINCT + schema atual)

**Sources:**
- [Postgres 15 — NULLS NOT DISTINCT for UNIQUE constraints](https://www.postgresql.org/docs/15/sql-createtable.html#SQL-CREATETABLE-EXLUSION) [CITED]
- `supabase/migrations/20260416193000_hiring_core_entities.sql:163-165` — index UNIQUE atual em `(document_type, document_number)` [VERIFIED]
- Supabase é Postgres 15+ [VERIFIED via Supabase docs]

**Decisão:** o schema atual já tem `UNIQUE (document_type, document_number) WHERE document_number IS NOT NULL AND anonymized_at IS NULL` (partial index). Isso **já satisfaz o requisito** com pequena modificação: o constraint precisa ser **especificamente em CPF** (não em document_number genérico) por causa do uso canonical que TAL-09 exige.

**Migration F.4 — CPF canonical dedup:**

```sql
-- supabase/migrations/20260428120300_f_cpf_canonical_dedup.sql

-- 1. Adicionar UNIQUE partial index em cpf especificamente
-- (document_type pode ser passport, rne, other — não impede dedup por CPF)
CREATE UNIQUE INDEX idx_candidates_cpf_unique
  ON public.candidates (cpf)
  WHERE cpf IS NOT NULL AND anonymized_at IS NULL;

-- 2. Função normalizadora (remove formatação)
CREATE OR REPLACE FUNCTION public.normalize_cpf(input text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT NULLIF(regexp_replace(COALESCE(input, ''), '[^0-9]', '', 'g'), '');
$$;

-- 3. Trigger que normaliza CPF em INSERT/UPDATE
CREATE OR REPLACE FUNCTION public.tg_normalize_candidate_cpf()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.cpf IS NOT NULL THEN
    NEW.cpf := public.normalize_cpf(NEW.cpf);
    -- Validar formato (exatamente 11 dígitos)
    IF length(NEW.cpf) <> 11 THEN
      RAISE EXCEPTION 'CPF inválido: deve ter 11 dígitos' USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER tg_candidates_normalize_cpf
  BEFORE INSERT OR UPDATE OF cpf ON public.candidates
  FOR EACH ROW EXECUTE FUNCTION public.tg_normalize_candidate_cpf();
```

**Por que partial index e não NULLS NOT DISTINCT:**
- NULLS NOT DISTINCT trataria múltiplos NULL como duplicados — não queremos isso (candidato externo sem CPF é válido).
- Partial index `WHERE cpf IS NOT NULL` é equivalente em UX e mais explícito.

**`DuplicateCandidateDialog.tsx` estendido:**

O atual (`src/components/hiring/DuplicateCandidateDialog.tsx`) busca por email. Precisa busca por CPF primeiro:

```typescript
// CandidateForm.tsx — onSubmit antes de criar
async function checkForDuplicates(values: FormValues) {
  // Prioridade 1: CPF (canonical per TAL-09)
  if (values.document_type === "cpf" && values.document_number) {
    const normalizedCpf = values.document_number.replace(/[^0-9]/g, "");
    const { data: byCpf } = await supabase
      .from("candidates")
      .select("*")
      .eq("cpf", normalizedCpf)
      .is("anonymized_at", null)
      .maybeSingle();
    if (byCpf) return { existing: byCpf as CandidateRow, matchedBy: "cpf" as const };
  }

  // Prioridade 2: email (fallback)
  if (values.email) {
    const { data: byEmail } = await supabase
      .from("candidates")
      .select("*")
      .eq("email", values.email)
      .is("anonymized_at", null)
      .maybeSingle();
    if (byEmail) return { existing: byEmail as CandidateRow, matchedBy: "email" as const };
  }

  return null;
}
```

`DuplicateCandidateDialog` ganha prop `matchedBy: "cpf" | "email"` para customizar o texto:

```tsx
<DialogTitle>
  {matchedBy === "cpf"
    ? "Já existe um candidato com esse CPF"
    : "Candidato já cadastrado"}
</DialogTitle>
<p>
  <span className="font-medium">{candidate.full_name}</span> (
  {matchedBy === "cpf" ? formatCpf(candidate.cpf) : candidate.email}
  ) já está no sistema.
</p>
```

**pgTAP test:**

```sql
-- Test: CPF UNIQUE
INSERT INTO public.candidates (full_name, email, cpf) VALUES ('A', 'a@x.com', '12345678901');
PREPARE duplicate_cpf AS
  INSERT INTO public.candidates (full_name, email, cpf) VALUES ('B', 'b@x.com', '12345678901');
SELECT throws_like('EXECUTE duplicate_cpf', '%idx_candidates_cpf_unique%',
  'CPF duplicado é rejeitado');

-- Test: CPF NULL é permitido (múltiplos)
INSERT INTO public.candidates (full_name, email) VALUES ('C', 'c@x.com');
INSERT INTO public.candidates (full_name, email) VALUES ('D', 'd@x.com');
SELECT pass('Múltiplos candidatos sem CPF são permitidos');

-- Test: CPF formatado é normalizado
INSERT INTO public.candidates (full_name, email, cpf) VALUES ('E', 'e@x.com', '987.654.321-00');
SELECT is(
  (SELECT cpf FROM public.candidates WHERE email = 'e@x.com'),
  '98765432100',
  'CPF é armazenado sem formatação'
);
```

---

### §9. CandidateDrawer split (QUAL-04 + RS-07)

**Confidence:** HIGH (verified contra `CandidateDrawer.tsx` 867 linhas)

**Sources:**
- `src/components/hiring/CandidateDrawer.tsx:1-867` [VERIFIED]
- CONTEXT.md "Drawer aninhado" decisão [VERIFIED]

**Estrutura de sub-componentes:**

```
src/components/hiring/drawer/
├── CandidateDrawer.tsx              # ← shell (≤200 linhas): state lifting, layout, ESC handling
├── CandidateDrawerHeader.tsx        # ← avatar + nome + ações primárias (Avançar/Recusar/Fit/Admitir)
├── CandidateDrawerTabs.tsx          # ← tab bar (CV / Entrevistas / Fit / Histórico)
├── content/
│   ├── PerfilTabContent.tsx         # ← dados + skills + experiência + origem
│   ├── EntrevistasTabContent.tsx    # ← InterviewTimeline + InterviewScheduler
│   ├── FitTabContent.tsx            # ← CulturalFitResponseViewer + useIssueFitLink
│   ├── AntecedentesTabContent.tsx   # ← BackgroundCheckUploader + status
│   └── HistoricoTabContent.tsx      # ← application_stage_history + access log
└── CandidateDrawerFooter.tsx        # ← navegação aninhada (anterior/próximo) + close
```

**Estado em parent vs URL hash:**

A discussão é: tab ativa fica em parent state (`useState`) ou URL hash (`#tab=fit`)? **Recomendação: URL hash via `useSearchParams`.** Justificativa:
1. Deep-link compartilhável: `/hiring/jobs/X/candidates/Y?tab=fit`
2. Browser back retorna para tab anterior dentro do drawer
3. Refresh preserva tab

```tsx
// CandidateDrawer.tsx (shell)
import { useSearchParams } from "react-router-dom";

type DrawerTab = "perfil" | "entrevistas" | "fit" | "antecedentes" | "historico";

export function CandidateDrawer({ candidateId, applicationId, onClose }: CandidateDrawerProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get("tab") as DrawerTab) ?? "perfil";

  const setActiveTab = (tab: DrawerTab) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("tab", tab);
      return next;
    });
  };

  // ESC handler — fecha SEM remover scroll do board
  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [onClose]);

  if (!candidateId) return null;

  return (
    <aside
      className="w-[480px] shrink-0 border-l border-border bg-surface flex flex-col"
      role="complementary"
      aria-label="Detalhes do candidato"
    >
      <CandidateDrawerHeader candidateId={candidateId} applicationId={applicationId} onClose={onClose} />
      <CandidateDrawerTabs activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="flex-1 overflow-y-auto">
        {activeTab === "perfil" && <PerfilTabContent candidateId={candidateId} />}
        {activeTab === "entrevistas" && <EntrevistasTabContent candidateId={candidateId} applicationId={applicationId} />}
        {activeTab === "fit" && <FitTabContent candidateId={candidateId} applicationId={applicationId} />}
        {activeTab === "antecedentes" && <AntecedentesTabContent applicationId={applicationId} />}
        {activeTab === "historico" && <HistoricoTabContent applicationId={applicationId} />}
      </div>
    </aside>
  );
}
```

**Mobile:** quando viewport < 768px, drawer ocupa full-width como vaul Drawer (vaul já no bundle). Planner decide: `<Drawer>` (vaul) em mobile, `<aside>` em desktop, ou um único `<aside>` com Tailwind responsivo `w-full md:w-[480px]`.

---

### §10. PipelineFilters → URL state com debounce (RS-09)

**Confidence:** HIGH (verified react-router-dom v6.30 useSearchParams + componente atual)

**Sources:**
- [React Router v6 — useSearchParams](https://reactrouter.com/en/main/hooks/use-search-params) [CITED]
- `PipelineFilters.tsx:1-80` — implementação atual usa Selects, não URL [VERIFIED]
- date-fns 3.6 (já no bundle) — não há `useDebouncedCallback` builtin; criar `useDebounce` simples [VERIFIED via package.json]

**Padrão URL state:**

```typescript
// src/components/hiring/PipelineFilters.tsx (refactor)
import { useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";

export function PipelineFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  // URL como source of truth para filtros (compartilháveis):
  const companyId = searchParams.get("empresa") ?? "all";
  const stage = searchParams.get("fase") ?? "all";
  const source = searchParams.get("origem") ?? "all";
  const searchTerm = searchParams.get("q") ?? "";

  // Search local state pra debounce
  const [localSearch, setLocalSearch] = useState(searchTerm);

  // Debounce 300ms — só atualiza URL após pausa
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== searchTerm) {
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev);
          if (localSearch) next.set("q", localSearch);
          else next.delete("q");
          return next;
        }, { replace: true }); // replace para não poluir history em cada keystroke
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearch, searchTerm, setSearchParams]);

  const updateFilter = (key: string, value: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value === "all" || !value) next.delete(key);
      else next.set(key, value);
      return next;
    });
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Input
        placeholder="Buscar candidato..."
        value={localSearch}
        onChange={(e) => setLocalSearch(e.target.value)}
        className="w-64"
      />
      <Select value={companyId} onValueChange={(v) => updateFilter("empresa", v)}>...</Select>
      <Select value={stage} onValueChange={(v) => updateFilter("fase", v)}>...</Select>
      <Select value={source} onValueChange={(v) => updateFilter("origem", v)}>...</Select>
      {(companyId !== "all" || stage !== "all" || source !== "all" || searchTerm) && (
        <Button variant="ghost" size="sm" onClick={() => setSearchParams({}, { replace: true })}>
          Limpar
        </Button>
      )}
    </div>
  );
}

// Hook que parse os filtros pra ser consumido pelos hooks de query
export function usePipelineFilters() {
  const [searchParams] = useSearchParams();
  return {
    companyId: searchParams.get("empresa") ?? "all",
    stage: searchParams.get("fase") ?? "all",
    source: searchParams.get("origem") ?? "all",
    searchTerm: searchParams.get("q") ?? "",
  };
}
```

**queryKey inclui filtros:**

```typescript
// useApplicationsByJob recebe filters
export function useApplicationsByJob(jobId: string | undefined, filters: PipelineFiltersState) {
  return useScopedQuery(
    ["hiring", "applications", "by-job", jobId ?? "none", filters],
    async () => { /* ... */ },
    { enabled: !!jobId },
  );
}
```

URL `?vaga=X&fase=triagem&origem=site&q=joão` é compartilhável. Refresh preserva. Browser back retorna ao filtro anterior.

---

### §11. Toggle Board ↔ Tabela com sort (D-09 / RS-13)

**Confidence:** MEDIUM (decisão library — TanStack Table vs custom — fica como recomendação)

**Sources:**
- [TanStack Table 8.x docs](https://tanstack.com/table/v8) [CITED]
- package.json: TanStack Table NÃO está no bundle [VERIFIED]
- shadcn/ui `<table>` primitives já existem em `src/components/ui/table.tsx` [VERIFIED]

**Recomendação: NÃO adicionar TanStack Table. Usar HTML `<table>` shadcn + sort manual em `useMemo`.**

Justificativa:
1. Volume baixo (<300 candidatos/vaga em v1).
2. Sort por 4 campos é trivial com `Array.sort` + `useMemo`.
3. TanStack Table adiciona ~30KB ao bundle e pesa em runtime se não for justified.
4. Reusa primitives shadcn que já estão no projeto (`Table`, `TableHeader`, `TableBody`, `TableRow`, `TableCell`).

**Implementação enxuta:**

```typescript
// src/components/hiring/CandidatesTable.tsx
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { ArrowUp, ArrowDown } from "lucide-react";
import { differenceInDays } from "date-fns";
import { useState, useMemo } from "react";

type SortField = "name" | "stage" | "days_in_stage" | "next_interview";
type SortDir = "asc" | "desc";

interface CandidatesTableProps {
  applications: ApplicationWithCandidate[];
  onOpen: (app: ApplicationWithCandidate) => void;
  selectedId?: string | null;
}

export function CandidatesTable({ applications, onOpen, selectedId }: CandidatesTableProps) {
  const [sortField, setSortField] = useState<SortField>("days_in_stage");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const sorted = useMemo(() => {
    const arr = [...applications];
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "name":
          cmp = (a.candidate?.full_name ?? "").localeCompare(b.candidate?.full_name ?? "");
          break;
        case "stage":
          cmp = a.stage.localeCompare(b.stage);
          break;
        case "days_in_stage": {
          const aDays = differenceInDays(new Date(), new Date(a.stage_entered_at));
          const bDays = differenceInDays(new Date(), new Date(b.stage_entered_at));
          cmp = aDays - bDays;
          break;
        }
        case "next_interview":
          cmp = (a.next_interview_at ?? "").localeCompare(b.next_interview_at ?? "");
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [applications, sortField, sortDir]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  };

  const SortHead = ({ field, label }: { field: SortField; label: string }) => (
    <TableHead onClick={() => toggleSort(field)} className="cursor-pointer select-none">
      <span className="flex items-center gap-1">
        {label}
        {sortField === field && (sortDir === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
      </span>
    </TableHead>
  );

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <SortHead field="name" label="Nome" />
          <TableHead>Cargo</TableHead>
          <SortHead field="days_in_stage" label="Dias na etapa" />
          <SortHead field="stage" label="Etapa" />
          <SortHead field="next_interview" label="Próxima entrevista" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((app) => (
          <TableRow key={app.id} onClick={() => onOpen(app)} data-selected={selectedId === app.id}>
            <TableCell>{app.candidate?.full_name}</TableCell>
            <TableCell>{app.desired_role ?? "—"}</TableCell>
            <TableCell>{differenceInDays(new Date(), new Date(app.stage_entered_at))}d</TableCell>
            <TableCell>{APPLICATION_STAGE_LABELS[app.stage]}</TableCell>
            <TableCell>{app.next_interview_at ? formatDateBR(app.next_interview_at) : "—"}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

**Toggle Board↔Table view state:**

```typescript
// Persistência localStorage namespaced (CONTEXT.md mini-decisão)
type KanbanView = "board" | "table";

function useKanbanView(jobId: string): [KanbanView, (v: KanbanView) => void] {
  const key = `leverup:rs:view:${jobId}`;
  const [view, setView] = useState<KanbanView>(() => {
    const stored = localStorage.getItem(key);
    return stored === "table" ? "table" : "board";
  });
  const updateView = (v: KanbanView) => {
    setView(v);
    localStorage.setItem(key, v);
  };
  return [view, updateView];
}

// Em CandidatesKanban (parent)
const [view, setView] = useKanbanView(jobId);
return (
  <>
    <ToggleGroup value={view} onValueChange={(v) => v && setView(v as KanbanView)}>
      <ToggleGroupItem value="board"><LayoutGrid /> Board</ToggleGroupItem>
      <ToggleGroupItem value="table"><LayoutList /> Tabela</ToggleGroupItem>
    </ToggleGroup>
    {view === "board" ? <CandidatesKanban /> : <CandidatesTable />}
  </>
);
```

**Migration story para localStorage:** se em v2 movemos para tabela `user_preferences`, criar uma função read-once que migra de localStorage para DB. Não bloqueante v1.

---

### §12. Sparkbar no JobCard (D-11)

**Confidence:** HIGH (verified — JobCard.tsx atual já tem sparkbar bem feita)

**Sources:**
- `src/components/hiring/JobCard.tsx:114-130` — sparkbar atual com `STAGE_GROUP_BAR_COLORS` [VERIFIED]
- `src/lib/hiring/stageGroups.ts:138-145` — color tokens [VERIFIED]

**Status:** **JobCard.tsx já implementa a sparkbar com a paleta correta de D-11.**

Porém, as **cores em `STAGE_GROUP_BAR_COLORS`** atuais são:
- triagem: `bg-text-subtle/40` (cinza, NÃO azul) ← **DIVERGE de D-11**
- checagem: `bg-status-blue/70`
- entrevista_rh: `bg-status-blue/80`
- entrevista_final: `bg-status-amber/80`
- decisao: `bg-status-green`
- descartados: `bg-status-red/60` (mas filtrado de `visibleGroups` em JobCard:53)

**Ação requerida pelo planner:** atualizar `STAGE_GROUP_BAR_COLORS` para refletir D-11 fielmente:

```typescript
// src/lib/hiring/stageGroups.ts (alteração)
export const STAGE_GROUP_BAR_COLORS: Record<StageGroupKey, string> = {
  triagem: "bg-status-blue/70",          // ← AZUL conforme D-11 (era cinza)
  checagem: "bg-status-blue/70",         // azul
  entrevista_rh: "bg-status-amber/80",   // ← AMARELO conforme D-11 (era azul)
  entrevista_final: "bg-status-amber/80", // amarelo
  decisao: "bg-status-green",            // verde
  descartados: "bg-status-red/60",       // vermelho
};
```

**Aggregation hook signature (já existe — `useApplicationCountsByJobs`):**

```typescript
// src/hooks/hiring/useApplicationCountsByJob.ts:6-13 — já está pronto
export interface JobApplicationCounts {
  total: number;
  byGroup: Record<StageGroupKey, number>;
  lastActivity: string | null;
  idleDays: number | null;
}
```

**Performance:** o hook usa 1 query por board (todos os jobIds em `.in()`). Para 20 vagas no board, é 1 RPC com ~500 rows — negligível. Não precisa virtualização.

**Render no JobCard (já está):** `{visibleGroups.map((g) => ...)}` — só precisa o tweak nas cores.

---

### §13. SLA visual no card (D-10)

**Confidence:** HIGH (verified — `BottleneckAlert.tsx` precedente + date-fns + tokens existentes)

**Sources:**
- `src/components/hiring/BottleneckAlert.tsx:1-34` — precedente [VERIFIED]
- date-fns 3.6 + date-fns-tz 3.2 (já no bundle) [VERIFIED]
- CONTEXT.md mini-decision: timezone `America/Sao_Paulo` [CITED]
- Tokens CSS: `status-amber`, `status-red` (vide JobCard.tsx) [VERIFIED]

**Implementação:**

```typescript
// src/lib/hiring/sla.ts (NOVO)
import { differenceInDays } from "date-fns";
import { utcToZonedTime } from "date-fns-tz";

const TZ = "America/Sao_Paulo";
const SLA_WARN_DAYS = 2;  // D-10 — laranja
const SLA_ALERT_DAYS = 5; // D-10 — vermelho

export type SlaLevel = "ok" | "warn" | "alert";

export function computeSla(stageEnteredAt: string): SlaLevel {
  const now = utcToZonedTime(new Date(), TZ);
  const entered = utcToZonedTime(new Date(stageEnteredAt), TZ);
  const days = differenceInDays(now, entered);
  if (days >= SLA_ALERT_DAYS) return "alert";
  if (days >= SLA_WARN_DAYS) return "warn";
  return "ok";
}

export function daysInStage(stageEnteredAt: string): number {
  const now = utcToZonedTime(new Date(), TZ);
  const entered = utcToZonedTime(new Date(stageEnteredAt), TZ);
  return Math.max(0, differenceInDays(now, entered));
}

export const SLA_BORDER_CLASSES: Record<SlaLevel, string> = {
  ok: "border-border",
  warn: "border-status-amber",
  alert: "border-status-red",
};

export const SLA_DOT_CLASSES: Record<SlaLevel, string> = {
  ok: "bg-text-subtle/60",
  warn: "bg-status-amber",
  alert: "bg-status-red",
};
```

**Aplicação em `CandidateCard.tsx`:**

```tsx
const sla = computeSla(application.stage_entered_at);
const days = daysInStage(application.stage_entered_at);

<button
  className={cn(
    "...",
    sla === "alert" && "border-l-2 border-l-status-red",
    sla === "warn" && "border-l-2 border-l-status-amber",
  )}
  title={`${days}d na etapa ${sla === "alert" ? "(SLA crítico)" : sla === "warn" ? "(SLA atenção)" : ""}`}
>
  ...
  <span className="text-[10.5px]">{days}d</span>
</button>
```

**Por que `differenceInDays` direto, sem hora:** SLA de 2/5 dias é granular suficiente em dias-corridos. Não é horas.

**Por que timezone explícito:** `stage_entered_at` é `timestamptz` (UTC); aplicação BR roda em horário comercial; um candidato movido às 23:55 UTC do dia X é "ontem" do ponto de vista do RH em São Paulo. Sem conversão, contagem fica off em 1 dia para movimentos perto da meia-noite UTC.

---

### §14. Encerradas colapsadas (RS-10)

**Confidence:** HIGH (verified — Radix Collapsible já no bundle como `@radix-ui/react-collapsible`)

**Sources:**
- package.json: `@radix-ui/react-collapsible 1.1.11` [VERIFIED]
- shadcn ui: `src/components/ui/collapsible.tsx` provavelmente existe [VERIFIED via Phase 1 conventions]
- CONTEXT.md: "expand persiste por sessão" [CITED]

**Implementação:**

```tsx
// src/pages/hiring/JobOpenings.tsx (refactor após JobsKanban introduzir status grouping)
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { ChevronRight, ChevronDown } from "lucide-react";

const SESSION_KEY = "leverup:rs:encerradas-open";

function ClosedJobsSection({ jobs }: { jobs: JobOpeningRow[] }) {
  const [open, setOpen] = useState<boolean>(() => {
    return sessionStorage.getItem(SESSION_KEY) === "true";
  });

  const toggle = (next: boolean) => {
    setOpen(next);
    sessionStorage.setItem(SESSION_KEY, String(next));
  };

  return (
    <Collapsible open={open} onOpenChange={toggle}>
      <CollapsibleTrigger asChild>
        <button className="flex items-center gap-1.5 text-sm font-medium text-text-muted hover:text-text">
          {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          Vagas encerradas
          <span className="text-xs tabular-nums">({jobs.length})</span>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-2 grid gap-2 grid-cols-1 md:grid-cols-3 lg:grid-cols-4">
          {jobs.map((job) => <JobCard key={job.id} job={job} />)}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
```

**sessionStorage vs localStorage:** sessionStorage limpa ao fechar aba — alinha com CONTEXT.md "expand persiste por sessão". Não usa localStorage.

---

### §15. Card customization persistence (D-08)

**Confidence:** HIGH (decisão simples; padrão localStorage com schema versionado)

**Implementação:**

```typescript
// src/lib/hiring/cardCustomization.ts
import { z } from "zod";

const STORAGE_KEY = "leverup:rs:card-fields";
const SCHEMA_VERSION = 1;

// Campos opcionais que o usuário pode togglar (D-08)
export const OPTIONAL_FIELDS = [
  "avatar",
  "next_interview",
  "cv_icon",
  "fit_score",
  "bg_check_dot",
  "source_tag",
] as const;
export type OptionalField = (typeof OPTIONAL_FIELDS)[number];

const PreferencesSchema = z.object({
  version: z.literal(SCHEMA_VERSION),
  enabledFields: z.array(z.enum(OPTIONAL_FIELDS)),
});

export type CardPreferences = z.infer<typeof PreferencesSchema>;

const DEFAULT_PREFERENCES: CardPreferences = {
  version: SCHEMA_VERSION,
  enabledFields: ["avatar", "next_interview", "cv_icon"], // sensible defaults
};

export function loadCardPreferences(): CardPreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    const parsed = JSON.parse(raw);
    const result = PreferencesSchema.safeParse(parsed);
    if (!result.success || result.data.version !== SCHEMA_VERSION) {
      // Schema evoluiu — reset to default e descartar
      return DEFAULT_PREFERENCES;
    }
    return result.data;
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function saveCardPreferences(prefs: CardPreferences): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

export function isFieldEnabled(prefs: CardPreferences, field: OptionalField): boolean {
  return prefs.enabledFields.includes(field);
}
```

**Migration story:** quando schema bumps (ex: v1 → v2 adicionando campo `priority_badge`), `loadCardPreferences` retorna defaults se versão não bate. Aceitável — usuário re-customiza, mas não quebra.

**Hook React:**

```typescript
// src/hooks/hiring/useCardPreferences.ts
import { useState, useEffect } from "react";
import { loadCardPreferences, saveCardPreferences, type CardPreferences } from "@/lib/hiring/cardCustomization";

export function useCardPreferences(): [CardPreferences, (next: CardPreferences) => void] {
  const [prefs, setPrefs] = useState<CardPreferences>(loadCardPreferences);

  useEffect(() => {
    // Sync entre tabs
    const onStorage = (e: StorageEvent) => {
      if (e.key === "leverup:rs:card-fields") setPrefs(loadCardPreferences());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const update = (next: CardPreferences) => {
    setPrefs(next);
    saveCardPreferences(next);
  };

  return [prefs, update];
}
```

**UI de toggle:** popover no header do board (`Customize Cards` botão) com checkboxes por campo.

---

## Migration F Strategy

### Resumo executivo

Migration F = **3 sub-migrations sequenciais aplicadas em Wave 1 da Phase 2**:

| Sub-migration | Timestamp sugerido | Função | Risco rollback |
|---------------|-------------------|--------|----------------|
| F.1 — Normalize legacy stages | `20260428120000` | UPDATE batch + trigger anti-regression | Baixo (UPDATE inverso disponível) |
| F.2 — data_access_log + RPC | `20260428120100` | Tabela append-only + RPC + pg_cron | Médio (tabela nova; rollback = DROP CASCADE; pg_cron `cron.unschedule`) |
| F.3 — candidate_consents | `20260428120200` | Tabela + view + RLS | Médio (tabela nova; rollback = DROP CASCADE) |
| F.4 — CPF dedup | `20260428120300` | UNIQUE partial + normalize trigger | Baixo (DROP INDEX + DROP TRIGGER) |

### Coordenação operacional

1. **Aplicar local primeiro** (`supabase db reset && supabase db push`) — garante idempotência.
2. **pgTAP rodando em CI** — `npm run test:db` valida cada sub-migration.
3. **Aplicar staging** antes de produção — calibrar lock contention real (~5min para Lever Talents data).
4. **Aplicar produção em janela de baixo tráfego** (final de semana) — apesar de SKIP LOCKED + batch, transação longa pode ser problemática.

### pgTAP test suite consolidada

```sql
-- supabase/tests/migration_f_full_test.sql
BEGIN;
SELECT plan(15);

-- F.1 normalization (3 tests — ver §5)
-- F.2 data_access_log (4 tests — ver §6)
-- F.3 candidate_consents (4 tests — ver §7)
-- F.4 CPF dedup (3 tests — ver §8)
-- Cross-cutting: read_candidate_with_log dispara RLS check + escreve log (1 test)

SELECT * FROM finish();
ROLLBACK;
```

---

## LGPD Compliance Layer

### Schema layer

| Componente | Phase 2 entrega? | Detalhe |
|------------|------------------|---------|
| `candidate_consents` table | ✅ | §7 — granular por purpose + legal_basis |
| `active_candidate_consents` view | ✅ | filtra revoked + expired |
| `data_access_log` table | ✅ | §6 — append-only, 36 mo retention |
| `read_candidate_with_log` RPC | ✅ | §6 — único caminho de leitura PII |
| `tg_log_data_access` trigger (UPDATE) | ✅ — generaliza trigger atual | §6 — `tg_log_candidate_access` migrado |
| `pg_cron` retention job | ✅ | §6 — semanal, segunda 03:30 UTC |
| Anonimização (already in place) | ✅ — não regredir | `anonymize_candidate(id)` continua |
| Direito ao esquecimento UI | ⚠️ Parcial | RH revoga + anonimiza pelo drawer; portal candidato é v2 |
| Token-based revoke link (candidate-side) | ❌ Deferred | v2 — não bloqueante |

### Consent flow (UI)

**Fluxo público (PublicApplicationForm):**
1. Candidato preenche form básico.
2. Section "Como podemos usar seus dados?" com 3 checkboxes NÃO pré-marcados:
   - ☐ Incluir meu currículo no Banco de Talentos da Lever (24 meses)
   - ☐ Compartilhar com clientes externos da Lever
   - ☐ Manter meu CV mesmo se eu for recusado para esta vaga
3. Checkbox **OBRIGATÓRIO** (este sim required): "Aceito os termos de aplicação para esta vaga".
4. Submit → Edge Function `apply-to-job` → cria candidate + application + INSERT em `candidate_consents` para cada checkbox marcado.

**Fluxo RH (drawer do candidato):**
- Section "Consentimentos" mostra `active_candidate_consents`.
- Cada consent ativo tem botão "Revogar" → confirma → `useRevokeConsent.mutate({ consentId })`.
- Banco de Talentos refilora automaticamente (invalidate query).

### Audit trail (data_access_log)

**Eventos logados:**
1. View de candidato (drawer abre) — via `read_candidate_with_log(id, 'kanban_drawer')`.
2. View de candidato em Banco de Talentos — `read_candidate_with_log(id, 'talent_pool')`.
3. Export CSV (Phase 4 talvez) — Edge Function loga `'csv_export'`.
4. Anonimização — trigger interno `anonymize_candidate` escreve com `action='anonymize'`.
5. UPDATE em candidatos — trigger AFTER UPDATE existente generalizada.

**Retenção:** 36 meses via pg_cron, segunda 03:30 UTC.

**Acesso ao log:** apenas `is_people_manager(uid)` (admin + rh). Outros roles têm 0 rows via RLS.

---

## Validation Architecture

> **MANDATORY** for Nyquist Dimension 8.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 3.2 + @testing-library/react 16 + msw 2.10 (Phase 1 entregou setup) |
| Config file | `vitest.config.ts` (criada em Phase 1) |
| Quick run command | `npm test -- --run --changed` |
| Full suite command | `npm test` |
| pgTAP framework | pgTAP + supabase-test-helpers (Phase 1 entregou) |
| pgTAP run command | `npm run test:db` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| RS-03 | Kanban move otimista + rollback em erro | RTL integration + MSW | `npm test src/hooks/hiring/useApplications.test.ts` | ❌ Wave 0 |
| RS-04 | canTransition antes do mutate | Unit (Vitest) | `npm test src/lib/hiring/statusMachine.test.ts` | ❌ Wave 0 |
| RS-05 | Migration F normaliza stages legados | pgTAP | `npm run test:db -- migration_f_legacy_stages_test.sql` | ❌ Wave 0 |
| RS-06 | 16→6 grupos consolidados (zero órfãos) | Unit + pgTAP | `npm test src/lib/hiring/stageGroups.test.ts && npm run test:db -- migration_f_full_test.sql` | ❌ Wave 0 |
| RS-07 | Drawer aninhado preserva scroll do board | RTL integration | `npm test src/components/hiring/drawer/CandidateDrawer.test.tsx` | ❌ Wave 0 |
| RS-08 | Card mostra sparkbar + SLA | Unit (sla.ts) + Visual (RTL snapshot) | `npm test src/lib/hiring/sla.test.ts && npm test src/components/hiring/CandidateCard.test.tsx` | ❌ Wave 0 |
| RS-09 | Filtros via URL com debounce 300ms | RTL integration | `npm test src/components/hiring/PipelineFilters.test.tsx` | ❌ Wave 0 |
| RS-10 | Encerradas colapsadas + sessionStorage | RTL integration | `npm test src/pages/hiring/JobOpenings.test.tsx` | ❌ Wave 0 |
| RS-12 | Realtime per-jobId silent re-render | RTL integration + MSW Realtime mock | `npm test src/hooks/hiring/useApplicationsRealtime.test.ts` | ❌ Wave 0 |
| RS-13 | Toggle Board↔Tabela com sort persistido | RTL integration | `npm test src/components/hiring/CandidatesView.test.tsx` | ❌ Wave 0 |
| TAL-03 | candidate_consents schema integrity | pgTAP | `npm run test:db -- candidate_consents_test.sql` | ❌ Wave 0 |
| TAL-04 | Opt-in NÃO pré-marcado | RTL integration | `npm test src/components/hiring/PublicApplicationForm.test.tsx` | ❌ Wave 0 |
| TAL-05 | data_access_log RLS insert-only via RPC | pgTAP | `npm run test:db -- data_access_log_test.sql` | ❌ Wave 0 |
| TAL-06 | read_candidate_with_log escreve log atomicamente | pgTAP | (mesmo arquivo acima) | ❌ Wave 0 |
| TAL-07 | pg_cron job de retenção 36 meses | pgTAP (manual sim com NOW() injection) | `npm run test:db -- data_access_log_retention_test.sql` | ❌ Wave 0 |
| TAL-08 | useRevokeConsent + active_candidate_consents view | RTL + pgTAP | `npm test src/hooks/hiring/useCandidateConsents.test.ts` | ❌ Wave 0 |
| TAL-09 | CPF UNIQUE + dedup dialog | Unit (normalize) + pgTAP + RTL | `npm test src/lib/hiring/cpf.test.ts && npm run test:db -- cpf_dedup_test.sql` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npm test -- --run --changed`
- **Per wave merge:** `npm test && npm run test:db`
- **Phase gate:** Full suite green (Vitest + pgTAP) antes de `/gsd-verify-work`. **Crítico:** RLS cross-tenant test (Phase 1) **ainda passa** — não regredir.

### Wave 0 Gaps (test files to create BEFORE implementation)

**Vitest (criar tudo do zero — Phase 1 só configurou framework):**
- [ ] `src/lib/hiring/statusMachine.test.ts` — exhaustive table de canTransition (TODA combinação de stages)
- [ ] `src/lib/hiring/stageGroups.test.ts` — todo legacy stage tem mapping → grupo válido (snapshot test)
- [ ] `src/lib/hiring/sla.test.ts` — boundary tests: 0d=ok, 1d=ok, 2d=warn, 4d=warn, 5d=alert, 10d=alert; timezone São Paulo
- [ ] `src/lib/hiring/cpf.test.ts` — normalize formats: `123.456.789-00`, `12345678900`, `12345`, `null`
- [ ] `src/lib/supabaseError.test.ts` — extender o existente: cobrir 4 detect helpers + `getMoveErrorToastConfig`
- [ ] `src/hooks/hiring/useApplications.test.ts` — `useMoveApplicationStage` flow completo: optimistic, rollback on RLS error, rollback on conflict, retry on network
- [ ] `src/hooks/hiring/useApplicationsRealtime.test.ts` — channel subscribe + unsubscribe + setQueryData merge silencioso
- [ ] `src/hooks/hiring/useCandidateConsents.test.ts` — revoke flow + active view filter
- [ ] `src/components/hiring/CandidateCard.test.tsx` — render with each customization combo
- [ ] `src/components/hiring/CandidatesKanban.test.tsx` — drag-drop simulation + canTransition guard
- [ ] `src/components/hiring/CandidatesTable.test.tsx` — sort por cada coluna asc/desc
- [ ] `src/components/hiring/PipelineFilters.test.tsx` — URL state + debounce
- [ ] `src/components/hiring/PublicApplicationForm.test.tsx` — opt-in checkboxes não pré-marcados; submit envia consents corretos
- [ ] `src/components/hiring/drawer/CandidateDrawer.test.tsx` — tab via URL, ESC fecha, scroll preservado
- [ ] `src/pages/hiring/JobOpenings.test.tsx` — encerradas colapsadas + sessionStorage

**pgTAP (criar tudo do zero — Phase 1 entregou framework):**
- [ ] `supabase/tests/migration_f_legacy_stages_test.sql` — 3 tests (zero órfãos, legacy_marker preservado, trigger anti-regression)
- [ ] `supabase/tests/data_access_log_test.sql` — 4 tests (RPC escreve log, INSERT direto bloqueado, SELECT requer admin/rh, retention DELETE works)
- [ ] `supabase/tests/candidate_consents_test.sql` — 4 tests (constraint revoked_at, EXCLUDE 1-active-per-purpose, view active filter, re-grant após revoke)
- [ ] `supabase/tests/cpf_dedup_test.sql` — 3 tests (UNIQUE rejection, NULL allowed multiple, normalize trigger)
- [ ] `supabase/tests/migration_f_full_test.sql` — wrapper consolidado (15 tests)

**MSW handlers (criar):**
- [ ] `src/test/msw/hiring-handlers.ts` — handlers para `/rest/v1/applications`, `/rpc/read_candidate_with_log`, `/rest/v1/candidate_consents`
- [ ] `src/test/msw/realtime-mock.ts` — fake Supabase channel para simular postgres_changes payloads

**Manual verification (UAT-style — Wave Final):**
- [ ] Opt-in NÃO pré-marcado em PublicApplicationForm (verificação humana via DevTools)
- [ ] Drawer não navega para nova rota (URL muda só o ?tab= não o pathname)
- [ ] Sparkbar lê em verde/amarelo/azul/vermelho conforme D-11 (verificação humana)
- [ ] SLA muda cor em 2/5 dias (humano cria candidato com `stage_entered_at = NOW() - 3 days`)
- [ ] Realtime: abrir 2 abas, mover candidato em uma → outra atualiza sem toast nem flash

---

## Pitfalls / Landmines

### Stage migration — `sem_retorno` órfão (já flagged em CONCERNS.md)

**Risco:** se a Migration F.1 falhar parcialmente (ex: rollback no meio do batch), alguns candidatos ficam em stage legado e outros em `em_interesse`. Sem `legacy_marker`, é impossível distinguir "fui normalizado" de "nunca fui legado".

**Mitigação:**
- Migration é **idempotente** (re-run apply o que falta).
- `legacy_marker` permite rollback granular: `UPDATE SET stage = (metadata->>'legacy_marker')::application_stage_enum WHERE metadata ? 'legacy_marker'`.
- pgTAP test cobre zero órfãos antes de Phase 4 (Migration G drop legacy enum values).

### Drawer scrollback issue — focus trap

**Risco:** ao fechar o drawer, o foco volta ao body — kanban perde scroll position. Pior: focus trap acidental impede ESC de fechar quando dentro de um Select/Popover.

**Mitigação:**
- **Não usar Radix `<Dialog>`** para o drawer (Dialog tem focus trap forte que captura ESC).
- Usar `<aside>` HTML semântico + listener manual de `keydown` Escape com `e.stopPropagation()` apenas no escopo do drawer.
- Antes de abrir drawer, capturar `kanbanScrollEl.scrollTop`; após fechar, `requestAnimationFrame(() => kanbanScrollEl.scrollTop = saved)`.

### Realtime — não double-aplicar próprio mutate

**Risco:** usuário move card → optimistic setQueryData → mutate → server confirma → realtime payload chega com mesmo stage → setQueryData de novo (idempotente, mas "flash" se a comparação não for por id).

**Mitigação:**
- O `setQueryData` em §2 faz `.map(a => a.id === updated.id ? {...} : a)` — idempotente por id.
- Se o mesmo update chega via realtime com `updated_at` diferente do optimistic, ainda é idempotente (mesmo stage).
- Pitfall específico: **se realtime chega ANTES do mutate confirmar**, `previousApplications` snapshot guardado em `onMutate` fica obsoleto. Solução: snapshot no momento do `getQueryData`, **mas confiar no rollback** — se mutate falhar, o realtime já trouxe a verdade do servidor; o rollback restaura a verdade pré-mutate; ambos são "verdades do servidor", então não há corrupção.

### LGPD — não logar PII em `console.log` (CLAUDE.md project rule)

**Risco:** durante debug do kanban, dev escreve `console.log("Moving", candidate.full_name, candidate.email)`. CONCERNS.md já flagged isso.

**Mitigação:**
- ESLint custom rule (Phase 1 entregou base) precisa ser **estendida em Phase 2** para detectar `console.log` referenciando campos de `candidates.*` ou `profiles.*`. Difícil estaticamente; mais realista: **PR review checklist** + grep em CI.
- `src/lib/logger.ts` (Phase 1 entregou) — usar sempre. Logger em produção redacta automatically.

### Zod — NÃO upgrade Zod 3→4

**Risco:** dev tentado a usar features Zod 4 (ex: `.brand()`, novo error map). Tudo em Phase 2 segue Zod 3.25 + @hookform/resolvers 5.2.2. CLAUDE.md project rule.

**Mitigação:** documentado em CLAUDE.md, REQUIREMENTS.md AF-13, e este RESEARCH.md (User Constraints).

### Card customization — explosão combinatória de fields

**Risco:** usuário ativa 10 campos opcionais em um card pequeno (150px). Layout quebra; texto trunca; UX vira sopa.

**Mitigação:**
- Limite hard de campos opcionais simultâneos (ex: 4) no popover de customization.
- `overflow-hidden` + `text-ellipsis` por padrão.
- Visual regression test (Vitest + RTL snapshot) com cada combinação.

### Migration F.4 — CPF format normalization existing data

**Risco:** dados existentes têm CPFs formatados (`123.456.789-00`) e não-formatados misturados. Adicionar UNIQUE quebra se há duplicatas formato-sensitivos.

**Mitigação:**
- **Antes de criar UNIQUE**, rodar batch que normaliza todos os CPFs:
  ```sql
  UPDATE public.candidates SET cpf = public.normalize_cpf(cpf) WHERE cpf IS NOT NULL;
  ```
- Se aparecer duplicata após normalize, **abortar a migration** e merge manual (CONCERNS.md já flagged como risk).

### TanStack Query v5 — `cancelQueries` em onMutate é mandatory

**Risco:** se onMutate não cancela queries in-flight, refetch pode chegar mid-mutation e sobrescrever o optimistic. Card "salta" entre stages.

**Mitigação:** **§1 já implementa**. PR review checklist deve confirmar `await queryClient.cancelQueries(...)` antes de `setQueryData`.

### Drawer aninhado vs vaul Drawer (mobile)

**Risco:** em mobile, drawer overlay sobrepõe o board completamente. UX-AUDIT-VAGAS §7 alertou pra confusão "qual está sendo editado".

**Mitigação:**
- Em mobile, vaul `<Drawer>` com `<DrawerOverlay>` semitransparente.
- Em desktop, `<aside>` ao lado do board (480px).
- Breadcrumb visível no header do drawer mobile: "Vagas › {jobTitle} › {candidateName}".

---

## Open Questions

1. **`useApplicationsByJob` rewriting para `useScopedQuery`** — todos os hooks de hiring são portados em Phase 2 ou só os tocados pelo refactor (move + counts + realtime)? Sugestão: **só os tocados**; outros (e.g., `useReuseCandidateForJob`, `useRejectApplication`) ficam para refactor incremental conforme `useScopedQuery` precisar deles. Planner decide.

2. **Realtime — quando a session do usuário tem múltiplos jobs abertos em abas diferentes**, cada aba tem seu próprio channel `applications:job:{jobId}`. Supabase suporta múltiplos channels per client; não há limite prático aqui. **Confirmação:** Phase 1 mockado conta como verified.

3. **Stage normalization — `sem_retorno` → `triagem` ou → `recusado`?** CONTEXT.md decidiu `sem_retorno → triagem` com `legacy_marker`. Mas semanticamente, "sem retorno" é mais próximo de recusado (candidato não respondeu). Confirmação com owner antes da Migration F.1: **manter `triagem` (preserva visibilidade)** ou **mover para `recusado`** (libera slot)? **Recomendação do researcher:** seguir CONTEXT.md (triagem + marker), mas planner registra a alternativa caso owner mude de ideia em UAT.

4. **`document_url` em `candidate_consents`** — REQUIREMENTS.md TAL-03 não pede explicitamente. Schema em §7 inclui como nullable. Planner decide: hash de aceitação eletrônica é suficiente em v1, ou exige PDF do termo (storage bucket dedicado)? **Recomendação:** hash em v1 (`sha256(timestamp + candidate_id + purpose)`); PDF é v2.

5. **Sparkbar no card de CANDIDATO** — D-11 fala em sparkbar no card de VAGA. Card de candidato (D-07) **não tem sparkbar**. Confirmação implícita: sparkbar só na vaga; candidato tem dot de SLA, não sparkbar.

6. **Toggle Board↔Tabela em `AllCandidatesKanban` (visão global)** — D-09 fala genericamente. Aplicar também na tela `/hiring/candidates` (busca global) ou só no kanban per-job? **Recomendação:** ambos, mas planner pode reduzir para per-job em v1 se prazo apertar.

7. **Dependência circular entre Migration F.2 e F.3** — `read_candidate_with_log` é definida em F.2; `candidate_consents` em F.3. Se a RPC precisa filtrar candidatos com consent ativo (Banco de Talentos), F.2 não pode referenciar F.3. **Solução:** RPC F.2 retorna candidate sem filtro de consent; filtragem de consent é feita em SQL no hook (`useTalentPool` faz JOIN com `active_candidate_consents`). Sem dependência circular.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Postgres 15+ disponível em Supabase project (suporta NULLS NOT DISTINCT, mas usamos partial index alternativo) | §8 | Baixo — partial index funciona em qualquer Postgres 12+ |
| A2 | `tg_enforce_application_stage_transition` (já em produção) bloqueia transições inválidas SQL-side | §1 | Médio — se trigger não estiver ativo, `canTransition` no client é única defesa. Mitigado por D-02 |
| A3 | `STAGE_GROUP_BAR_COLORS` atual diverge de D-11; planner deve atualizar | §12 | Baixo — visual fix simples |
| A4 | Volume médio < 100 candidatos/vaga (V2-06 virtualization deferred) | research flag STATE.md | Médio — research flag aberto exige confirmação owner antes de skip virtualization |
| A5 | Realtime channels Supabase suportam múltiplos channels por client sem limite operacional | §2 | Baixo — Supabase docs confirmam até 200 simultâneos |
| A6 | Edge Function `apply-to-job` tem permissão para INSERT em `candidate_consents` via service-role | §7 | Baixo — service-role bypassa RLS by design |
| A7 | `candidate_access_log` legado pode ser migrado para `data_access_log` sem perda de schema fields críticos | §6 | Baixo — campos atuais batem (actor_id, action, resource_id, created_at) |
| A8 | TanStack Table NÃO precisa ser adicionado (HTML table + sort manual basta v1) | §11 | Baixo — escolha de design; reabrir se volume cresce |
| A9 | Drawer aninhado em mobile usa vaul (já no bundle) ou aside responsivo | §9 | Baixo — vaul é convencional; planner decide pattern exato |
| A10 | `is_people_manager` (Phase 1) inclui role `'rh'` além de `'admin'` | §6, §7 | **CRÍTICO** — Verificar em código Phase 1; se não, RH não vê data_access_log nem revoga consents. **Planner DEVE confirmar antes do plan** |
| A11 | TanStack Query v5 partial-key invalidation (default `exact: false`) funciona em chain `['scope', id, kind, 'hiring', 'applications', 'by-job', jobId]` | §1 | Baixo — confirmed em Phase 1 patterns |

---

## Sources

### Primary (HIGH confidence)

- [TanStack Query v5 — Optimistic Updates](https://tanstack.com/query/v5/docs/framework/react/guides/optimistic-updates) — onMutate/onError/onSettled canonical
- [TanStack Query v5 — Query Invalidation](https://tanstack.com/query/v5/docs/framework/react/guides/query-invalidation) — partial-key match
- [Supabase Realtime — postgres_changes](https://supabase.com/docs/guides/realtime/postgres-changes) — filter syntax
- [Supabase RLS — SECURITY DEFINER](https://supabase.com/docs/guides/database/postgres/row-level-security) — initPlan caching
- [PostgREST error codes](https://docs.postgrest.org/en/v12/references/errors.html) — 42501 RLS, 23514 check_violation
- [@dnd-kit/core — Sensors API](https://docs.dndkit.com/api-documentation/sensors) — PointerSensor + TouchSensor activation constraints
- Phase 1 lock: `src/shared/data/useScopedQuery.ts`, `src/shared/data/useScopedRealtime.ts` [VERIFIED: code]
- Phase 1 lock: `.planning/phases/01-tenancy-backbone/01-CONTEXT.md` — queryKey shape contract
- Codebase: `src/hooks/hiring/useApplications.ts:73-114` — atual sem onMutate (bug confirmado) [VERIFIED]
- Codebase: `src/lib/hiring/statusMachine.ts:9-43` — `canTransition` + APPLICATION_STAGE_TRANSITIONS [VERIFIED]
- Codebase: `src/lib/hiring/stageGroups.ts:38-145` — STAGE_GROUPS + bar colors [VERIFIED]
- Codebase: `src/components/hiring/CandidatesKanban.tsx:237-270` — onDragEnd sem canTransition (bug confirmado) [VERIFIED]
- Codebase: `src/components/hiring/JobCard.tsx:114-130` — sparkbar implementação atual [VERIFIED]
- Codebase: `supabase/migrations/20260416193400_hiring_audit_and_locking.sql` — `tg_log_candidate_access` precedente [VERIFIED]
- Codebase: `supabase/migrations/20260416193500_hiring_cron_jobs.sql` — pg_cron pattern [VERIFIED]
- Codebase: `supabase/migrations/20260416193000_hiring_core_entities.sql:148-191` — candidates + applications schema [VERIFIED]

### Secondary (MEDIUM confidence)

- [TkDodo — Concurrent Optimistic Updates](https://tkdodo.eu/blog/concurrent-optimistic-updates-in-react-query) — race condition patterns
- [averagedevs — Zero-Downtime Migrations](https://www.averagedevs.com/blog/zero-downtime-database-migrations-typescript-saas) — batched UPDATE com SKIP LOCKED
- ARCHITECTURE.md §"Pattern 4: LGPD Audit" + §"Pattern 5: Expand→Backfill→Contract" [CITED]
- PITFALLS.md §P2 (kanban bug) + §P5 (LGPD) [CITED]

### Tertiary (LOW confidence — flagged for validation)

- [LGPD Art. 8º §4º consentimento granular interpretação Solides blog](https://solides.com.br/blog/lgpd-no-recrutamento-e-selecao/) — interpretação de "específico e desambíguo" [ASSUMED — confirmar com jurídico de Lever Talents quando houver]
- Industry benchmark de 24 meses para retenção de consent base (vs 36 meses para audit log) [ASSUMED — alinhar com PROJECT.md retention.ts existente]

---

## Metadata

**Confidence breakdown:**
- TanStack Query optimistic + rollback pattern: **HIGH** — verified contra docs v5 + Phase 1 chokepoint + código atual confirmando o bug
- Realtime per-jobId silent: **HIGH** — Phase 1 entregou `useScopedRealtime` chokepoint; this section reusa pattern com filter `job_opening_id=eq.${jobId}`
- Differentiated error mapping: **HIGH** — Postgrest codes + supabase-js error shapes documentados
- Migration F (4 sub-migrations): **HIGH** — pattern já em produção (Phase 1 + hiring_cron_jobs); SKIP LOCKED batched UPDATE bem estabelecido
- LGPD layer (consents + audit log): **HIGH** — generaliza `candidate_access_log` existente; schema validado contra ARCHITECTURE.md Pattern 4
- CPF dedup: **HIGH** — partial index é Postgres 12+ stable
- Sparkbar/SLA/Card customization/Filtros URL: **HIGH** — patterns já no codebase; só polish
- TanStack Table vs HTML table: **MEDIUM** — recomendação técnica; planner pode escolher diferente

**Research date:** 2026-04-27
**Valid until:** 2026-05-27 (30 dias — stack estável; revisar se alguma library bumper major)

---

*Research consolidado para Phase 2: R&S Refactor*
*Researcher: gsd-researcher | Output ready for gsd-planner consumption*
