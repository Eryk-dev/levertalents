# Phase 2: R&S Refactor — Pattern Map

**Mapped:** 2026-04-27
**Files analyzed:** 31 (CREATE: 17 — MODIFY: 14)
**Analogs found:** 30 / 31 (1 sem analog direto — `useApplicationsRealtime`)

> **Como o planner lê este documento.**
> Cada arquivo a ser criado ou modificado tem um analog primário no codebase real. Os trechos abaixo são código real (com `path:lineno`), não pseudocódigo. Onde não há analog perfeito, listamos o "matiz" (role-match / data-flow-match / pure-rewrite) e linkamos para `02-RESEARCH.md`.

---

## File Classification

### Hooks (`src/hooks/hiring/`)

| New/Modified | Role | Data Flow | Closest Analog | Match Quality |
|--------------|------|-----------|----------------|---------------|
| `src/hooks/hiring/useApplicationsRealtime.ts` (CREATE) | hook | event-driven (postgres_changes → cache merge) | `src/shared/data/useScopedRealtime.ts` (chokepoint, sem consumer ainda) + `src/hooks/hiring/useCandidateConversations.ts` (queryKey shape) | **role-match** (no other realtime consumer in codebase) |
| `src/hooks/hiring/useRevokeConsent.ts` (CREATE) | hook | request-response mutation | `src/hooks/hiring/useApplications.ts:177-200` (`useReuseCandidateForJob`) — INSERT mutation + invalidate + toast | **exact** |
| `src/hooks/hiring/useCardPreferences.ts` (CREATE) | hook | localStorage R/W with Zod schema | (no existing localStorage hook in `src/hooks/`) → use `src/features/tenancy/lib/store.ts` `zustand persist` pattern as reference, or pure useState + useEffect | **partial** (write from scratch following `localStorage.leverup:rs:*` namespace convention from D-08) |
| `src/hooks/hiring/useApplications.ts` (MODIFY: rewrite `useMoveApplicationStage`) | hook | request-response mutation + optimistic | self (current shape lines 73-114) → swap pattern to TanStack v5 onMutate/onError/onSettled | **rewrite** (RESEARCH §1 canonical) |
| `src/hooks/hiring/useApplications.ts` (MODIFY: port `useApplicationsByJob` to `useScopedQuery`) | hook | CRUD scoped read | `src/shared/data/useScopedQuery.ts:26-48` chokepoint + Phase 1 `tests/scope/useScopedQuery.test.tsx:43-58` | **exact** |
| `src/hooks/hiring/useTalentPool.ts` (MODIFY: filter active consents) | hook | CRUD scoped read with embed | self lines 50-70 (current `.select` with embed) — extend with `consents:active_candidate_consents!inner(purpose)` | **exact** (extend self) |
| `src/hooks/hiring/useApplicationCountsByJob.ts` (MODIFY: already by stage_group, just port to scoped) | hook | CRUD aggregate read | self lines 33-83 (already returns `byGroup`) — just wrap in `useScopedQuery` for queryKey shape | **exact** (extend self) |

### Lib (`src/lib/hiring/`)

| New/Modified | Role | Data Flow | Closest Analog | Match Quality |
|--------------|------|-----------|----------------|---------------|
| `src/lib/hiring/sla.ts` (CREATE) | utility (pure functions) | transform (Date → "ok"\|"warning"\|"critical") | `src/lib/hiring/retention.ts:5-23` (pure date function with TZ-aware compute) + `src/components/hiring/BottleneckAlert.tsx:24-25` (precedent of "dias na etapa") | **exact** |
| `src/lib/hiring/stageGroups.ts` (MODIFY: verify legacy mapping) | utility | static config | self lines 38-104 — already maps `aguardando_fit_cultural`, `sem_retorno`, `fit_recebido` → `triagem` group | **exact** (audit only) |
| `src/lib/hiring/statusMachine.ts` (MODIFY: tighten `canTransition`, add Wave 0 vitest) | utility | static config + pure check | self lines 9-30 (transitions table) + lines 34-43 (`canTransition`) | **exact** (extend self) |
| `src/lib/supabaseError.ts` (MODIFY: add 4 detect helpers) | utility | type-narrowing predicates | self lines 1-46 (current `formatSupabaseError`, `handleSupabaseError`) | **exact** (RESEARCH §4) |

### Components (`src/components/hiring/`)

| New/Modified | Role | Data Flow | Closest Analog | Match Quality |
|--------------|------|-----------|----------------|---------------|
| `src/components/hiring/CandidateDrawerHeader.tsx` (CREATE) | component | presentational | `src/components/hiring/CandidateDrawer.tsx:172-284` (header block to extract) | **extract** |
| `src/components/hiring/CandidateDrawerTabs.tsx` (CREATE) | component | presentational + state | `src/components/hiring/CandidateDrawer.tsx:286-309` (tabs block to extract) | **extract** |
| `src/components/hiring/CandidateDrawerContent.tsx` (CREATE) | component | presentational + slot composition | `src/components/hiring/CandidateDrawer.tsx:311-...` (body block to extract) | **extract** |
| `src/components/hiring/ConsentForm.tsx` (CREATE) | component | form (react-hook-form + Zod) | `src/components/hiring/CandidateForm.tsx:23-89` (Zod + zodResolver + handleSubmit) + `src/components/hiring/PublicApplicationForm.tsx:262-350` (Form component pattern) | **exact** |
| `src/components/hiring/CandidatesTable.tsx` (CREATE) | component | presentational table with sort | `src/components/hiring/JobExternalPublicationsList.tsx:106-128` (HTML `<ul>` rows with sortable header) — table-shaped pattern for HTML tables | **partial** (HTML table per RESEARCH §11; no TanStack Table) |
| `src/components/hiring/SlaBadge.tsx` (CREATE) | component | presentational pure | `src/components/hiring/BottleneckAlert.tsx:17-34` ("Parada há N dia(s)" + StatusBadge tone) | **exact** |
| `src/components/hiring/SparkbarDistribution.tsx` (CREATE) | component | presentational SVG | `src/components/hiring/JobCard.tsx:114-130` (existing inline horizontal stacked bar — extract as component) | **exact** (extract self) |
| `src/components/hiring/CardFieldsCustomizer.tsx` (CREATE) | component | popover + checkbox state | (no existing popover-based settings UI) → use `src/components/ui/popover.tsx` + `src/components/ui/checkbox.tsx` per shadcn convention | **partial** (write from scratch per UI-SPEC) |
| `src/components/hiring/BoardTableToggle.tsx` (CREATE) | component | segmented control | (no existing toggle) → small wrapper over `src/components/ui/button.tsx` variants | **partial** |
| `src/components/hiring/ConsentList.tsx` (CREATE) | component | presentational list | `src/components/hiring/JobExternalPublicationsList.tsx:106-128` (UL/LI list pattern) | **role-match** |
| `src/components/hiring/RevokeConsentDialog.tsx` (CREATE) | component | AlertDialog wrap | `src/components/hiring/DiscardReasonDialog.tsx` (destructive dialog with form) + `src/components/ui/alert-dialog.tsx` | **role-match** |
| `src/components/hiring/OptInCheckboxes.tsx` (CREATE) | component | controlled checkbox group | `src/components/hiring/PublicApplicationForm.tsx` `consent` block + `src/components/hiring/CandidateForm.tsx` `Checkbox` field | **partial** (3 unchecked-by-default per TAL-04) |
| `src/components/hiring/AuditLogPanel.tsx` (CREATE) | component | presentational read-only list | `src/components/hiring/InterviewTimeline.tsx` (timeline pattern) + `useScopedQuery` for `data_access_log` reads | **role-match** |
| `src/components/hiring/LegacyStageWarning.tsx` (CREATE) | component | session-scoped banner | `src/components/hiring/OptimisticMutationToast.tsx` (transient banner pattern) | **role-match** |
| `src/components/hiring/CandidatesKanban.tsx` (MODIFY) | component | dnd + mutation orchestration | self lines 207-270 — strip `expectedUpdatedAt`, insert `canTransition` pre-check, add `useApplicationsRealtime` | **rewrite** (RESEARCH §1, §3) |
| `src/components/hiring/CandidateCard.tsx` (MODIFY) | component | presentational draggable | self lines 37-129 — D-07 mínimo fixo + D-08 customizável + D-10 SLA stripe | **extend self** |
| `src/components/hiring/CandidateDrawer.tsx` (MODIFY) | component | composition root | self all 867 lines → split into Header/Tabs/Content + reroute imports | **refactor split** |
| `src/components/hiring/JobsKanban.tsx` (MODIFY: confirm `useScopedQuery` wired) | component | dnd | self lines 125-202 (already uses `useApplicationCountsByJobs`) | **audit only** |
| `src/components/hiring/JobCard.tsx` (MODIFY: extract sparkbar) | component | presentational | self lines 114-130 — extract to `SparkbarDistribution`, fix legacy_marker color edge | **extract** |
| `src/components/hiring/PipelineFilters.tsx` (MODIFY: inline + URL state) | component | controlled filters with URL sync | self lines 26-125 (current modal-style) + `src/app/providers/ScopeProvider.tsx:64` (`useSearchParams` precedent) | **rewrite** |
| `src/components/hiring/DuplicateCandidateDialog.tsx` (MODIFY: CPF lookup) | component | dialog + query | self all 102 lines (current email-based dedup) — add CPF search via `useCandidateByCpf` | **extend self** |
| `src/components/hiring/PublicApplicationForm.tsx` (MODIFY: 3 unchecked checkboxes) | component | form | self lines 56-133 (Zod schema) — add `consents` object, swap `consent` literal | **extend self** |

### Pages (`src/pages/hiring/`)

| New/Modified | Role | Data Flow | Closest Analog | Match Quality |
|--------------|------|-----------|----------------|---------------|
| `src/pages/hiring/CandidatesKanban.tsx` (MODIFY) | page | composition | self lines 1-100 (current orchestrator) | **audit only** |
| `src/pages/hiring/CandidateProfile.tsx` (MODIFY: split 1169 lines) | page | composition (monolith) | self all → break per QUAL-04 | **refactor split** |

### Migrations (`supabase/migrations/`)

| New | Role | Data Flow | Closest Analog | Match Quality |
|-----|------|-----------|----------------|---------------|
| `supabase/migrations/20260428120000_f1_normalize_legacy_application_stages.sql` (CREATE) | migration | DDL + DML batch backfill | `supabase/migrations/20260427120100_b2_org_units_and_helpers.sql` (DO $$ + trigger pattern) + RESEARCH §5 SQL | **exact** |
| `supabase/migrations/20260428120100_f2_data_access_log_table.sql` (CREATE) | migration | DDL + RPC + cron | `supabase/migrations/20260416193400_hiring_audit_and_locking.sql` (current `tg_log_candidate_access` + `candidate_access_log`) + RESEARCH §6 SQL | **exact** (generalize self) |
| `supabase/migrations/20260428120200_f3_candidate_consents.sql` (CREATE) | migration | DDL + RLS + view | `supabase/migrations/20260422150000_candidate_conversations.sql` (table + 3 RLS policies + comments) + RESEARCH §7 SQL | **exact** |
| `supabase/migrations/20260428120300_f4_cpf_unique_constraint.sql` (CREATE) | migration | DDL constraint | `supabase/migrations/20260420190000_add_discard_reason_and_talent_pool.sql` (DDL extend) + RESEARCH §8 | **role-match** |

### Edge Functions

| Modified | Role | Data Flow | Closest Analog | Match Quality |
|----------|------|-----------|----------------|---------------|
| `supabase/functions/apply-to-job/index.ts` (MODIFY) | edge fn | POST handler | self lines 43-117 (current candidate+application creation) — add consent persist after candidate insert | **extend self** |

### Types (`src/integrations/supabase/`)

| Modified | Role | Data Flow | Closest Analog | Match Quality |
|----------|------|-----------|----------------|---------------|
| `src/integrations/supabase/types.ts` (regen) | types | static | (auto-generated; CLAUDE.md convention) | **regen** |
| `src/integrations/supabase/hiring-types.ts` (extend) | types | static | self lines 1-120 (handwritten extension; add `Consent`, `DataAccessLogEntry`, `ConsentPurpose`, `ConsentLegalBasis`) | **extend self** |

### pgTAP Tests (`supabase/tests/`)

| New | Role | Data Flow | Closest Analog | Match Quality |
|-----|------|-----------|----------------|---------------|
| `supabase/tests/006-migration-f-stages.sql` (CREATE) | test | pgTAP | `supabase/tests/004-anti-cycle-trigger.sql` (full template) | **exact** |
| `supabase/tests/007-data-access-log.sql` (CREATE) | test | pgTAP | `supabase/tests/004-anti-cycle-trigger.sql` + RESEARCH §6 test SQL | **exact** |
| `supabase/tests/008-candidate-consents.sql` (CREATE) | test | pgTAP | `supabase/tests/004-anti-cycle-trigger.sql` + RESEARCH §7 test SQL | **exact** |
| `supabase/tests/009-cpf-unique.sql` (CREATE) | test | pgTAP | `supabase/tests/004-anti-cycle-trigger.sql` (CHECK constraint test pattern) | **exact** |
| `supabase/tests/010-pg-cron-retention.sql` (CREATE) | test | pgTAP | `supabase/tests/004-anti-cycle-trigger.sql` + RESEARCH §6 retention test | **exact** |

### Vitest Tests (`tests/`)

| New | Role | Data Flow | Closest Analog | Match Quality |
|-----|------|-----------|----------------|---------------|
| `tests/hiring/useMoveApplicationStage.test.tsx` (CREATE) | test | RTL + MSW | `tests/scope/useScopedQuery.test.tsx` (renderHook + QueryClient wrapper) | **exact** |
| `tests/hiring/canTransition.test.ts` (CREATE) | test | unit | `tests/lib/formatBR.test.ts` / `tests/lib/logger.test.ts` (pure unit) | **exact** |
| `tests/hiring/sla.test.ts` (CREATE) | test | unit | `tests/lib/formatBR.test.ts` (pure date utility) | **exact** |
| `tests/hiring/CandidatesKanban.integration.test.tsx` (CREATE) | test | RTL drag+drop | `tests/scope/ScopeDropdown.test.tsx` (RTL + provider wrapper) | **role-match** |

---

## Pattern Assignments

### `src/hooks/hiring/useApplications.ts` — `useMoveApplicationStage` rewrite (D-01..D-06)

**Analog (current):** `src/hooks/hiring/useApplications.ts:73-114` (the broken version — has only `mutationFn` + `onSuccess`).

**Analog (target shape — TanStack v5 onMutate canonical):** RESEARCH §1 lines 168-309 + `tests/scope/useScopedQuery.test.tsx` for queryKey shape.

**Imports pattern to copy** (current useApplications.ts:1-11 → extend):
```typescript
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";                       // SWAP from "@/hooks/use-toast" → sonner (consistent with CandidatesKanban.tsx:20)
import { useScope } from "@/app/providers/ScopeProvider"; // ADD
import { useScopedQuery } from "@/shared/data/useScopedQuery"; // ADD
import { canTransition } from "@/lib/hiring/statusMachine";   // ADD
import {
  detectRlsDenial, detectNetworkDrop, detectConflict,
  type MoveApplicationError,
} from "@/lib/supabaseError";                          // ADD (after §4 extension)
import type { ApplicationRow, ApplicationStage, CandidateRow, DiscardReason } from "@/integrations/supabase/hiring-types";
```

**Current broken pattern to REMOVE** (`useApplications.ts:73-114`):
```typescript
// REMOVE: optimistic locking via .eq("updated_at", ...).eq("stage", fromStage)
// REMOVE: { ok: false, conflict: true } return shape (last-writer-wins per D-03)
// REMOVE: onSuccess invalidate-only — replace with onMutate + onError + onSettled
```

**queryKey shape** (must include `scope.id` and `scope.kind` per Phase 1 lock):
```typescript
const applicationsKey = [
  "scope", scope.id, scope.kind,
  "hiring", "applications", "by-job", jobId,
] as const;
```

**Mutation skeleton (paste verbatim from RESEARCH §1):**
```typescript
return useMutation<
  { ok: true; row: ApplicationRow },
  MoveApplicationError,
  MoveArgs,
  { previousApplications: ApplicationWithCandidate[] | undefined; applicationsKey: readonly unknown[] }
>({
  mutationFn: async (args) => {
    const { data, error } = await supabase
      .from("applications")
      .update({ stage: args.toStage, last_moved_by: scope?.userId ?? null })
      .eq("id", args.id)
      .select()
      .maybeSingle();
    if (error) {
      if (detectRlsDenial(error)) throw { kind: "rls", error } as MoveApplicationError;
      if (detectNetworkDrop(error)) throw { kind: "network", error } as MoveApplicationError;
      throw { kind: "unknown", error } as MoveApplicationError;
    }
    if (!data) throw { kind: "conflict" } as MoveApplicationError;
    return { ok: true, row: data as ApplicationRow };
  },
  onMutate: async (args) => {
    await queryClient.cancelQueries({ queryKey: applicationsKey });
    const previousApplications = queryClient.getQueryData<ApplicationWithCandidate[]>(applicationsKey);
    queryClient.setQueryData<ApplicationWithCandidate[]>(
      applicationsKey,
      (old) => old?.map((a) => a.id === args.id
        ? { ...a, stage: args.toStage, stage_entered_at: new Date().toISOString() }
        : a
      ) ?? [],
    );
    return { previousApplications, applicationsKey };
  },
  onError: (err, _args, ctx) => {
    if (ctx?.previousApplications) queryClient.setQueryData(ctx.applicationsKey, ctx.previousApplications);
    // toast switch by err.kind — see RESEARCH §4 getMoveErrorToastConfig
  },
  onSettled: async (_d, _e, _args, ctx) => {
    if (ctx?.applicationsKey) await queryClient.invalidateQueries({ queryKey: ctx.applicationsKey });
    await queryClient.invalidateQueries({
      queryKey: ["scope", scope?.id, scope?.kind, "hiring", "application-counts-by-jobs"],
    });
  },
  retry: (failureCount, err) => (err as MoveApplicationError).kind === "network" && failureCount < 3,
  retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
});
```

**Convention to replicate:**
- queryKey **always** prefixed `["scope", scope.id, scope.kind, ...]` (Phase 1 chokepoint)
- Mutation args object includes `jobId` and `companyId` so context.applicationsKey can be derived
- Toast import is **`sonner`** (matches `CandidatesKanban.tsx:20`), not `@/hooks/use-toast`
- Discriminated `MoveApplicationError` from `supabaseError.ts` (RESEARCH §4)

---

### `src/hooks/hiring/useApplicationsRealtime.ts` (NEW) — D-04 silent re-render

**Analog (chokepoint):** `src/shared/data/useScopedRealtime.ts:18-38` — pattern in place but no consumer yet.

**Why not reuse the chokepoint directly:** the chokepoint is generic over `topic`; D-04 wants a per-jobId channel that writes directly to a TanStack cache key (not the generic event-bus pattern). RESEARCH §2 line 489-491 explicitly recommends a dedicated hook.

**Imports pattern (from RESEARCH §2 lines 387-397):**
```typescript
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useScope } from "@/app/providers/ScopeProvider";
import type { ApplicationRow } from "@/integrations/supabase/hiring-types";
import type { ApplicationWithCandidate } from "./useApplications";
```

**Channel pattern (paste verbatim from RESEARCH §2 lines 408-472):**
```typescript
useEffect(() => {
  if (!jobId || !scope) return;
  const channelName = `applications:job:${jobId}`;
  const queryKey = ["scope", scope.id, scope.kind, "hiring", "applications", "by-job", jobId] as const;
  const channel = supabase
    .channel(channelName)
    .on("postgres_changes",
      { event: "UPDATE", schema: "public", table: "applications", filter: `job_opening_id=eq.${jobId}` },
      (payload) => {
        const updated = payload.new as ApplicationRow;
        queryClient.setQueryData<ApplicationWithCandidate[]>(queryKey, (old) => {
          if (!old) return old;
          return old.map((a) => a.id === updated.id
            ? { ...a, stage: updated.stage, stage_entered_at: updated.stage_entered_at, updated_at: updated.updated_at, last_moved_by: updated.last_moved_by }
            : a);
        });
      })
    .on("postgres_changes",
      { event: "INSERT", schema: "public", table: "applications", filter: `job_opening_id=eq.${jobId}` },
      () => { void queryClient.invalidateQueries({ queryKey }); })
    .subscribe();
  return () => { void supabase.removeChannel(channel); };
}, [jobId, scope?.id, scope?.kind, queryClient]);
```

**Convention to replicate:**
- Channel name = `applications:job:{jobId}` (unique, Supabase-broadcast-friendly)
- Cleanup via `supabase.removeChannel(channel)` (matches `useScopedRealtime.ts:33-35`)
- Effect deps include only `jobId` + `scope?.id` + `scope?.kind` (avoid re-subscribe per render)

---

### `src/hooks/hiring/useRevokeConsent.ts` (NEW)

**Analog:** `src/hooks/hiring/useApplications.ts:177-200` (`useReuseCandidateForJob` — same shape: insert/update + invalidate + toast).

**Imports pattern (line 1-11):**
```typescript
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";          // OR sonner — match neighborhood
import { useScope } from "@/app/providers/ScopeProvider";
```

**Mutation pattern (verbatim adapt from `useApplications.ts:177-200`):**
```typescript
export function useRevokeConsent() {
  const queryClient = useQueryClient();
  const { scope } = useScope();
  return useMutation({
    mutationFn: async (args: { consentId: string; candidateId: string }): Promise<void> => {
      const { error } = await supabase
        .from("candidate_consents")
        .update({ revoked_at: new Date().toISOString(), revoked_by: scope?.userId ?? null })
        .eq("id", args.consentId);
      if (error) throw error;
    },
    onSuccess: async (_, args) => {
      await queryClient.invalidateQueries({
        queryKey: ["scope", scope?.id, scope?.kind, "hiring", "candidate-consents", args.candidateId],
      });
      await queryClient.invalidateQueries({
        queryKey: ["scope", scope?.id, scope?.kind, "hiring", "talent-pool"],
      });
      toast({ title: "Consentimento revogado" });
    },
    onError: (err: Error) =>
      toast({ title: "Erro ao revogar", description: err.message, variant: "destructive" }),
  });
}
```

---

### `src/hooks/hiring/useCardPreferences.ts` (NEW) — D-08 localStorage persistence

**Analog:** none in `src/hooks/hiring/`. Closest pattern: `src/features/tenancy/lib/store.ts` (zustand `persist`) — too heavyweight for a per-user UI prefs object.

**Recommendation:** plain `useState` + `useEffect` syncing to `localStorage`, gated by Zod schema for resilience to stale shapes. Namespace per UI-SPEC: `leverup:rs:card-fields:{userId}`.

**Skeleton pattern (write from scratch):**
```typescript
import { useEffect, useState } from "react";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";

const CardPrefsSchema = z.object({
  showAvatar: z.boolean().default(false),
  showNextInterview: z.boolean().default(false),
  showCvIcon: z.boolean().default(false),
  showFitScore: z.boolean().default(false),
  showBackgroundDot: z.boolean().default(false),
  showSourceTag: z.boolean().default(false),
});
export type CardPrefs = z.infer<typeof CardPrefsSchema>;

const STORAGE_KEY = (uid: string) => `leverup:rs:card-fields:${uid}`;

export function useCardPreferences(): [CardPrefs, (next: Partial<CardPrefs>) => void] {
  const { user } = useAuth();
  const key = user?.id ? STORAGE_KEY(user.id) : null;
  const [prefs, setPrefs] = useState<CardPrefs>(() => CardPrefsSchema.parse({}));

  useEffect(() => {
    if (!key) return;
    try {
      const raw = localStorage.getItem(key);
      if (raw) setPrefs(CardPrefsSchema.parse(JSON.parse(raw)));
    } catch { /* swallow — Zod fail or invalid JSON resets to default */ }
  }, [key]);

  const update = (next: Partial<CardPrefs>) => {
    setPrefs((cur) => {
      const merged = { ...cur, ...next };
      if (key) localStorage.setItem(key, JSON.stringify(merged));
      return merged;
    });
  };
  return [prefs, update];
}
```

**Convention:** Zod-validated read so future schema changes don't crash render. Same pattern to be replicated for `BoardTableToggle` view persistence (`leverup:rs:view`).

---

### `src/lib/supabaseError.ts` (MODIFY — add 4 detect helpers per D-05/D-06)

**Analog (self):** `src/lib/supabaseError.ts:1-46` — current shape. **DO NOT REMOVE** existing exports (`formatSupabaseError`, `handleSupabaseError`, `throwOnError`); ADD the new helpers below them.

**Add (verbatim from RESEARCH §4 lines 547-656):**
```typescript
import { PostgrestError } from "@supabase/supabase-js";

export type MoveApplicationError =
  | { kind: "rls"; error: PostgrestError }
  | { kind: "network"; error: Error }
  | { kind: "conflict"; error?: PostgrestError }
  | { kind: "transition"; from: string; to: string }
  | { kind: "unknown"; error: unknown };

const RLS_CODE = "42501";
const CHECK_VIOLATION_CODE = "23514";

export function detectRlsDenial(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  return (err as PostgrestError).code === RLS_CODE;
}
export function detectNetworkDrop(err: unknown): boolean {
  if (err instanceof TypeError && /fetch/i.test(err.message)) return true;
  if (err instanceof Error && err.name === "AbortError") return true;
  if (err && typeof err === "object" && "code" in err && (err as { code: string }).code === "") return true;
  return false;
}
export function detectConflict(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as PostgrestError;
  return e.code === CHECK_VIOLATION_CODE && /transition/i.test(e.message ?? "");
}
export function detectTransitionReject(err: unknown): err is MoveApplicationError {
  return !!err && typeof err === "object" && "kind" in err
    && (err as { kind: unknown }).kind === "transition";
}

export function getMoveErrorToastConfig(err: MoveApplicationError): { title: string; description?: string; duration?: number } {
  switch (err.kind) {
    case "rls": return { title: "Sem permissão", description: "Você não tem permissão pra mover esse candidato.", duration: 8000 };
    case "network": return { title: "Sem conexão", description: "Tentando de novo automaticamente...", duration: 4000 };
    case "conflict": return { title: "Atualizado por outra pessoa", description: "O card já foi movido. Recarregando.", duration: 5000 };
    case "transition": return { title: "Transição inválida", description: `Não é possível mover de "${err.from}" direto para "${err.to}".`, duration: 6000 };
    default: return { title: "Erro ao mover candidato", description: "Tente de novo em alguns segundos.", duration: 6000 };
  }
}
```

**Convention to replicate:** `code === ""` is supabase-js fetch fail (RESEARCH §4 line 581-583); `TypeError` + `/fetch/i` is browser fetch fail.

---

### `src/lib/hiring/sla.ts` (NEW)

**Analog:** `src/lib/hiring/retention.ts:5-23` (pure date utility, TZ-agnostic) + `src/components/hiring/BottleneckAlert.tsx:24` ("Parada há N dia(s)" precedent).

**Imports pattern (matches `retention.ts`):**
```typescript
// Pure functions — no React, no toast, no supabase. SLA tone: 2d laranja, 5d vermelho (D-10).
```

**Skeleton (write from scratch following `retention.ts` shape):**
```typescript
export type SlaTone = "ok" | "warning" | "critical";

export function daysSince(at: Date | string): number {
  const ts = typeof at === "string" ? new Date(at).getTime() : at.getTime();
  return Math.max(0, Math.floor((Date.now() - ts) / 86_400_000));
}

export function computeSlaTone(stageEnteredAt: Date | string): SlaTone {
  const days = daysSince(stageEnteredAt);
  if (days >= 5) return "critical";
  if (days >= 2) return "warning";
  return "ok";
}

export const SLA_THRESHOLDS = { warning: 2, critical: 5 } as const;
```

**Convention:** thresholds in named export so vitest test (Wave 0) can drive the table; `daysSince` reused by `SlaBadge.tsx`.

---

### `src/components/hiring/CandidateDrawer.tsx` split (QUAL-04)

**Analog (self):** `src/components/hiring/CandidateDrawer.tsx` 867 lines.

**Extraction map (header / tabs / body):**

| Sub-component | Source lines (current) | Imports moved |
|---------------|------------------------|---------------|
| `CandidateDrawerHeader.tsx` | 173-284 (avatar, name, contact, action row) | `LinearAvatar`, `Btn`, `Row`, `Mail`, `Phone`, `Download`, `Calendar`, `Sparkles`, `MessageSquare`, `ArrowRight`, `X` |
| `CandidateDrawerTabs.tsx` | 286-309 (tab strip with border-b) | `cn`, `lucide-react` icons, `DrawerTab` type |
| `CandidateDrawerContent.tsx` | 311-... (body switch on `tab`) | `ProfileSection`, `InterviewsSection`, `CulturalFitResponseViewer`, `BackgroundCheckUploader`, `InterviewTimeline`, `HiringDecisionPanel` |

**Composition contract** (parent `CandidateDrawer.tsx` becomes thin):
```typescript
return (
  <aside className="flex h-full flex-col border-l border-border bg-surface overflow-hidden">
    <CandidateDrawerHeader candidate={candidate} active={active} onClose={onClose} ... />
    <CandidateDrawerTabs tab={tab} setTab={setTab} showAuditLog={isPeopleManager} />
    <CandidateDrawerContent tab={tab} candidate={candidate} active={active} ... />
  </aside>
);
```

**Convention:** state (`tab`, `moveOpen`, `schedulerOpen`, etc.) stays in parent `CandidateDrawer`; sub-components are presentational (props in, callbacks out). New tab "Audit log" added to `CandidateDrawerTabs` per UI-SPEC §"Drawer Tab labels" (visível apenas RH/admin).

---

### `src/components/hiring/CandidatesKanban.tsx` (MODIFY)

**Analog (self):** lines 207-270 — current `onDragEnd` + `performMove`.

**Changes per D-02 (canTransition pre-check):**
```typescript
// REPLACE lines 237-270 with the RESEARCH §1 caller pattern (315-341):
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

  // D-02: canTransition() ANTES do mutate
  if (!canTransition(app.stage, toStage, "application")) {
    toast.error(`Não é possível mover de "${APPLICATION_STAGE_LABELS[app.stage]}" direto para "${APPLICATION_STAGE_LABELS[toStage]}"`);
    return;
  }

  if (targetGroup.key === DESCARTADOS_KEY) setDescartadosOpen(true);

  // Sem expectedUpdatedAt; sem performMove async wrapper. Mutation cuida do resto (§1).
  move.mutate({ id: app.id, fromStage: app.stage, toStage, jobId, companyId: scope.companyIds[0] });
};
```

**Add (per D-04):**
```typescript
// Realtime silent re-render
import { useApplicationsRealtime } from "@/hooks/hiring/useApplicationsRealtime";
// inside component body:
useApplicationsRealtime(jobId);
```

**Sensors update (per RESEARCH §3 line 511-521):**
```typescript
// REPLACE line 207 with TouchSensor + KeyboardSensor:
const sensors = useSensors(
  useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  useSensor(KeyboardSensor),
);
```

**REMOVE state:** `const [conflict, setConflict] = useState(false);` and the `<OptimisticMutationToast>` block (lines 140, 278-285) — replaced by `sonner` toast in `onError`. The `performMove` helper goes away (mutation handles rollback).

---

### `src/components/hiring/CandidateCard.tsx` (MODIFY — D-07/D-08/D-10)

**Analog (self):** lines 37-129. The minimum (D-07: name + cargo + dias na etapa + vaga) is **already partially there** (name + initials + optional `showJob`); needs:
1. Always-on "dias na etapa" badge (currently absent)
2. SLA stripe via `SlaBadge` (D-10)
3. Optional fields toggled by `useCardPreferences` (D-08)

**Pattern to add (mirroring existing `showJob` block at lines 110-122):**
```typescript
import { useCardPreferences } from "@/hooks/hiring/useCardPreferences";
import { computeSlaTone, daysSince } from "@/lib/hiring/sla";

export function CandidateCard({ application, onOpen, asOverlay = false, selected = false, showJob = false }: CandidateCardProps) {
  const [prefs] = useCardPreferences();
  const days = daysSince(application.stage_entered_at);
  const slaTone = computeSlaTone(application.stage_entered_at);
  // ... existing useDraggable + initials + display name

  return (
    <button
      ...
      className={cn(
        "group flex w-full rounded-[4px] border-l-[3px] px-2 py-1.5 text-left",
        slaTone === "warning" && "border-l-status-amber",
        slaTone === "critical" && "border-l-status-red",
        slaTone === "ok" && "border-l-transparent",
        // ... existing classes
      )}
    >
      {prefs.showAvatar ? <Avatar /> : <Initials />}
      {/* always: name + cargo + days + vaga (D-07) */}
      {/* conditional: prefs.showNextInterview, prefs.showCvIcon, ... */}
    </button>
  );
}
```

**Convention:** SLA stripe via `border-l-3 border-l-status-{tone}` (per UI-SPEC §"Card SLA stripe"). Days rendered with `tabular-nums` utility.

---

### `src/components/hiring/JobCard.tsx` (MODIFY — extract sparkbar)

**Analog (self):** lines 114-130 — existing inline stacked bar (already mostly correct shape).

**Changes:**
1. Extract lines 114-130 into `SparkbarDistribution.tsx` (new component, props: `byGroup: Record<StageGroupKey, number>`, `total: number`).
2. Adjust `STAGE_GROUP_BAR_COLORS` (per RESEARCH §12) to match D-11 intencionalidade exactly:
   - `triagem` + `checagem` = blue tones (movimento inicial)
   - `entrevista_rh` + `entrevista_final` = amber tones (entrevista)
   - `decisao` = green (finalização positiva)
   - `descartados` = red

**Pattern (extract verbatim from current `JobCard.tsx:114-130`):**
```typescript
// In SparkbarDistribution.tsx
export function SparkbarDistribution({ byGroup, total, className }: { byGroup: Record<StageGroupKey, number>; total: number; className?: string }) {
  const visibleGroups = STAGE_GROUPS.filter((g) => g.key !== "descartados");
  const totalActive = visibleGroups.reduce((acc, g) => acc + (byGroup[g.key] ?? 0), 0);
  if (total === 0) return null;
  return (
    <div className={cn("flex h-1 w-full overflow-hidden rounded-full bg-bg-muted", className)} role="img" aria-label={/* "12 candidatos · 30% em Entrevistas" */}>
      {visibleGroups.map((g) => {
        const v = byGroup[g.key] ?? 0;
        if (v === 0 || totalActive === 0) return null;
        const pct = (v / totalActive) * 100;
        return <span key={g.key} style={{ width: `${pct}%` }} className={cn("h-full", STAGE_GROUP_BAR_COLORS[g.key])} title={`${g.label}: ${v}`} />;
      })}
    </div>
  );
}
```

---

### `src/components/hiring/PipelineFilters.tsx` (MODIFY — inline + URL state)

**Analog (self):** lines 26-125 (current Select/Dialog-style filters).

**Pattern to use (URL state):** `src/app/providers/ScopeProvider.tsx:64` (`useSearchParams` precedent).

**Skeleton:**
```typescript
import { useSearchParams } from "react-router-dom";
import { useDebounce } from "...";  // or inline 300ms via setTimeout in onChange

const [searchParams, setSearchParams] = useSearchParams();
const vaga = searchParams.get("vaga") ?? "";
const fase = searchParams.get("fase") ?? "";
const q = searchParams.get("q") ?? "";

// Render Chip primitives (active = bg-accent-soft + border-accent/30, inactive = bg-bg-subtle)
// Search input: 300ms debounce → setSearchParams({ ..., q: nextQ })
```

**Convention to replicate:** URL is source of truth (shareable), debounce only on text search (300ms per UI-SPEC); chip activation via `Chip` primitive from `LinearKit.tsx`.

---

### `supabase/migrations/20260428120000_f1_normalize_legacy_application_stages.sql` (CREATE)

**Analog (template):** `supabase/migrations/20260427120100_b2_org_units_and_helpers.sql:79-118` (DO $$ + CREATE OR REPLACE FUNCTION + CREATE TRIGGER) — full migration shape with header comments + idempotent guards.

**SQL to use:** verbatim RESEARCH §5 lines 696-761.

**Convention to replicate:**
- Header comment block (8-15 lines) explaining motivation + linked REQ-IDs
- `CREATE OR REPLACE FUNCTION` with `LANGUAGE plpgsql AS $$ ... $$;`
- `BEFORE INSERT OR UPDATE OF stage` trigger (matches existing `tg_enforce_application_stage_transition` at `20260416193400_hiring_audit_and_locking.sql:125-127`)
- `FOR UPDATE SKIP LOCKED` + `pg_sleep(0.05)` for batch backfill (RESEARCH §5 line 723-739)

---

### `supabase/migrations/20260428120100_f2_data_access_log_table.sql` (CREATE)

**Analog (current `candidate_access_log`):** `supabase/migrations/20260416193400_hiring_audit_and_locking.sql:1-50` — current trigger pattern; will be **generalized** into `data_access_log` per RESEARCH §6.

**SQL to use:** verbatim RESEARCH §6 lines 819-936.

**Key shape excerpts:**
```sql
CREATE TABLE public.data_access_log (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id          uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  entity_type       text NOT NULL CHECK (entity_type IN ('candidate', 'application', 'cultural_fit_response', 'profile', 'salary')),
  entity_id         uuid NOT NULL,
  action            text NOT NULL CHECK (action IN ('view', 'export', 'update', 'anonymize', 'delete')),
  scope_company_id  uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  context           text,
  ip_address        inet, user_agent text,
  at                timestamptz NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.read_candidate_with_log(p_candidate_id uuid, p_context text DEFAULT 'view')
RETURNS public.candidates LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$ ... $$;

SELECT cron.schedule(
  'data_access_log_retention_cleanup',
  '30 3 * * 1',
  $$ DELETE FROM public.data_access_log WHERE at < NOW() - INTERVAL '36 months'; $$
);
```

**Convention to replicate:**
- `STABLE SECURITY DEFINER SET search_path = public` (matches `tg_log_candidate_access` and Phase 1 helpers — anti-injection per ARCHITECTURE.md AP7)
- `(SELECT auth.uid())` for initPlan caching (matches Phase 1 RLS helpers)
- Migrate existing rows from `candidate_access_log` (RESEARCH §6 lines 918-933) — keep old table as compat read

---

### `supabase/migrations/20260428120200_f3_candidate_consents.sql` (CREATE)

**Analog (template):** `supabase/migrations/20260422150000_candidate_conversations.sql` (full migration: enum + table + 3 RLS policies + comments).

**Pattern excerpts to copy:**

Policy shape from `candidate_conversations.sql:74-85`:
```sql
CREATE POLICY "candidate_consents:select:rh_admin"
  ON public.candidate_consents FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'socio'::public.app_role)
    OR public.has_role(auth.uid(), 'rh'::public.app_role)
  );
```

Trigger pattern from `candidate_conversations.sql:43-45`:
```sql
CREATE TRIGGER tg_candidate_consents_updated_at
  BEFORE UPDATE ON public.candidate_consents
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
```

**Full SQL:** RESEARCH §7 lines 1031-1113.

**Convention to replicate:**
- Enum + Table + RLS-enable + Trigger + 3 Policies + COMMENT, in that order
- `EXCLUDE` constraint for "1 active consent per (candidate, purpose)" (RESEARCH §7 lines 1071-1073)
- View `active_candidate_consents` materializing "not revoked + not expired"

---

### `supabase/functions/apply-to-job/index.ts` (MODIFY)

**Analog (self):** `supabase/functions/apply-to-job/index.ts:43-117` — current candidate + application creation flow.

**Where to insert consent persistence:** AFTER application insert (around current line ~150-180; need to verify with full read), per RESEARCH §7 lines 1167-1198:

```typescript
// AFTER application is created, parse consents from formData:
const consentsRaw = form.get("consents");
let consents: Record<string, boolean> = {};
try { consents = JSON.parse(typeof consentsRaw === "string" ? consentsRaw : "{}"); } catch {}

const consentRows = Object.entries(consents)
  .filter(([_, granted]) => granted === true)
  .map(([purpose]) => ({
    candidate_id: candidateId,
    purpose,
    legal_basis: "consent",
    granted_at: new Date().toISOString(),
    granted_by: null,                                   // self-granted
    expires_at: new Date(Date.now() + 24 * 30 * 24 * 60 * 60 * 1000).toISOString(),
  }));

if (consentRows.length > 0) {
  const { error: consentErr } = await admin.from("candidate_consents").insert(consentRows);
  if (consentErr) console.error("[consent] failed to persist", consentErr); // não falha a application
}
```

**Convention to replicate:**
- Use `admin` client (service role; matches lines 97-101)
- Failure to persist consent is **non-blocking** — application still succeeds, log `[consent]` prefix
- Honor existing `consent` checkbox shape (line 67) for backwards compat — phase out gradually

---

### `src/components/hiring/PublicApplicationForm.tsx` (MODIFY — opt-in não pré-marcado)

**Analog (self):** `PublicApplicationForm.tsx:56-133` (Zod schema with single `consent: z.literal(true)`).

**Pattern to replace** (RESEARCH §7 lines 1129-1164 + UI-SPEC §"LGPD opt-in copy"):
```typescript
const schema = z.object({
  // ... existing fields
  consents: z.object({
    incluir_no_banco_de_talentos_global: z.boolean().default(false),
    compartilhar_com_cliente_externo: z.boolean().default(false),
    manter_cv_pos_recusa: z.boolean().default(false),
  }).default({}),
  consent_aplicacao_vaga: z.literal(true, {
    errorMap: () => ({ message: "Você precisa aceitar para continuar." }),
  }),
});
```

**Form fields:** 3 `<FormField>` blocks identical shape to `CandidateForm.tsx` `Checkbox` (line 18 import), each with `checked={field.value}` + `onCheckedChange={field.onChange}` (NO `defaultChecked`). Microcopy per UI-SPEC §"LGPD opt-in copy".

**On submit:** add `formData.append("consents", JSON.stringify(data.consents))` before fetch (matches existing `formData.append("fit_responses", ...)` at line 311-313).

---

### `src/hooks/hiring/useTalentPool.ts` (MODIFY — filter by active_consents)

**Analog (self):** `useTalentPool.ts:50-70` (current `.select` with embed pattern).

**Change pattern (RESEARCH §7 lines 1262-1275):**
```typescript
// In queryFn, change the .select() string:
.select(`*,
   consents:active_candidate_consents!inner(purpose, granted_at, expires_at),
   applications:applications( ... ),
   conversations:candidate_conversations( ... )
 `)
.eq("consents.purpose", "incluir_no_banco_de_talentos_global")
```

**Convention to replicate:** PostgREST embed with `!inner` to require an active consent row exists (failures filter the candidate out). Existing `.is("anonymized_at", null)` stays.

---

### `src/components/hiring/DuplicateCandidateDialog.tsx` (MODIFY — CPF dedup per TAL-09)

**Analog (self):** `DuplicateCandidateDialog.tsx:23-101`.

**Change:** dialog already accepts `candidate: CandidateRow` and lists prior applications. Extension is upstream in `CandidateForm.tsx`: search by CPF before email. Add to `useCandidates.ts` a new hook:

```typescript
// useCandidates.ts (mirror useCandidateByEmail at lines 118-128)
export function useCandidateByCpf(cpf: string) {
  return useQuery({
    queryKey: candidatesKeys.byCpf?.(cpf) ?? ["hiring", "candidates", "by-cpf", cpf],
    enabled: cpf.replace(/\D/g, "").length === 11,
    queryFn: async (): Promise<CandidateRow | null> => {
      const normalized = cpf.replace(/\D/g, "");
      const { data, error } = await supabase
        .from("candidates").select("*").eq("cpf", normalized).maybeSingle();
      if (error) throw error;
      return (data as CandidateRow) ?? null;
    },
  });
}
```

**Then `CandidateForm.tsx` (lines 41-54) already calls `useCandidateByEmail(email)` — add parallel `useCandidateByCpf(cpf)` and prefer CPF match if both exist** (TAL-09 says CPF is canonical, email secondary). DuplicateCandidateDialog itself is unchanged.

---

### pgTAP tests — `supabase/tests/006-migration-f-stages.sql`...

**Analog (template):** `supabase/tests/004-anti-cycle-trigger.sql` (lines 1-42) — full pgTAP shape: begin / plan / setup / N tests / finish / rollback.

**Pattern excerpt (verbatim from `004-anti-cycle-trigger.sql:1-22`):**
```sql
begin;
select plan(3);

select tests.authenticate_as_service_role();

-- Test setup: insert fixture rows
insert into public.companies (id, name) values ('22222222-...', 'Test');

-- TEST 1
select throws_ok(
  $$update public.... where id = '...'::uuid$$,
  'P0001',  -- expected SQLSTATE
  NULL,     -- expected message regex (NULL = any)
  'descriptive test name'
);

-- TEST 2
select lives_ok(
  $$update public.... where id = '...'::uuid$$,
  'descriptive test name'
);

select * from finish();
rollback;
```

**Specific test SQL bodies:** RESEARCH §5 lines 765-799 (migration F stages); §6 lines 968-1014 (data_access_log); §7 lines 1280-1309 (candidate_consents).

**Convention to replicate:**
- `begin; ... rollback;` wrapper (test isolation)
- `select plan(N); ... select * from finish();` (pgTAP harness)
- `tests.authenticate_as_service_role()` for setup; `SET LOCAL request.jwt.claims TO '{"sub":"..."}'` to switch role mid-test
- `throws_ok($$ <SQL> $$, '<SQLSTATE>', NULL, '<test_name>')` for negative tests
- `lives_ok` / `is(actual, expected, name)` for positive tests

---

### Vitest tests — `tests/hiring/canTransition.test.ts`...

**Analog (template):** `tests/lib/formatBR.test.ts` (pure unit) and `tests/scope/useScopedQuery.test.tsx` (renderHook + QueryClient).

**For `canTransition.test.ts` (Wave 0 exhaustive table — D-02 ESTÁ na PR):**
```typescript
import { describe, it, expect } from "vitest";
import { canTransition, APPLICATION_STAGE_TRANSITIONS } from "@/lib/hiring/statusMachine";
import type { ApplicationStage } from "@/integrations/supabase/hiring-types";

describe("canTransition (application)", () => {
  // Exhaustive: every (from, to) pair tested against the table
  const allStages = Object.keys(APPLICATION_STAGE_TRANSITIONS) as ApplicationStage[];
  for (const from of allStages) {
    for (const to of allStages) {
      const expected = from === to || APPLICATION_STAGE_TRANSITIONS[from].includes(to);
      it(`${from} → ${to} = ${expected}`, () => {
        expect(canTransition(from, to, "application")).toBe(expected);
      });
    }
  }
});
```

**For `useMoveApplicationStage.test.tsx`:** mirror `useScopedQuery.test.tsx:1-111` — `renderHook` + `QueryClientProvider` wrapper + `vi.spyOn(scopeModule, 'useScope')`. Mock supabase via MSW per RESEARCH §1 + per `tests/scope/` patterns.

**Convention to replicate:**
- One `describe` per public export
- `vi.restoreAllMocks()` in `beforeEach`
- `createWrapper()` factory returning `{ client, Wrapper }` for React + TanStack Query
- Mock `useScope` via `vi.spyOn(scopeModule, 'useScope').mockReturnValue(...)` (matches `tests/scope/useScopedQuery.test.tsx:24-36`)

---

## Shared Patterns

### TanStack Query v5 mutation with optimistic update

**Source:** RESEARCH §1 lines 196-309 + `tests/scope/useScopedQuery.test.tsx` (queryKey shape).

**Apply to:** `useMoveApplicationStage` (rewrite), and as reference for any future optimistic mutation in Phase 2 (`useRevokeConsent` does NOT need optimistic — simple invalidate is fine).

**Six-step canonical:**
1. `mutationFn` — only the network call + error mapping (no setQueryData here)
2. `onMutate` — `cancelQueries` + `getQueryData` (snapshot) + `setQueryData` (optimistic) + return `{ previousData, queryKey }` as context
3. `onError` — `setQueryData(ctx.queryKey, ctx.previousData)` (rollback) + `toast` differentiated by error kind
4. `onSettled` — `invalidateQueries({ queryKey: ctx.queryKey })` (partial-key) + invalidate dependents
5. `retry` — gate by `err.kind === "network"` only (RLS / canTransition never retry)
6. `retryDelay` — exponential `1000 * 2 ** attempt` capped at 8s

---

### useScopedQuery queryKey contract (Phase 1 lock — Phase 2 must follow)

**Source:** `src/shared/data/useScopedQuery.ts:26-48` + `tests/scope/useScopedQuery.test.tsx:43-58`.

**Apply to:** every read hook in Phase 2 (`useApplicationsByJob`, `useTalentPool`, `useApplicationCountsByJobs`, `useActiveConsents`, `useAuditLog`, `useCandidate`).

**Concrete shape:**
```typescript
return useScopedQuery(
  ["hiring", "applications", "by-job", jobId ?? "none"], // user key prefix; chokepoint adds ['scope', scope.id, scope.kind] before
  async (companyIds): Promise<ApplicationWithCandidate[]> => {
    // RLS does the security; companyIds is for UX/perf .in('company_id', ...) when needed
    const { data, error } = await supabase.from("applications").select("...").eq("job_opening_id", jobId);
    if (error) throw error;
    return (data ?? []) as ApplicationWithCandidate[];
  },
  { enabled: !!jobId },
);
```

**Final cached queryKey:** `['scope', scope.id, scope.kind, 'hiring', 'applications', 'by-job', jobId]` — partial-key invalidation works at any prefix depth.

---

### Realtime channel cleanup pattern

**Source:** `src/shared/data/useScopedRealtime.ts:27-37` (chokepoint).

**Apply to:** `useApplicationsRealtime` (Phase 2 only realtime consumer).

**Excerpt:**
```typescript
useEffect(() => {
  if (!scope) return;                                    // gate on scope
  const channel = supabase.channel(channelName);
  channel.on("postgres_changes", { ... }, handler);
  channel.subscribe();
  return () => { void supabase.removeChannel(channel); };  // cleanup
}, [scope?.id, scope?.kind, /* topic-specific deps */]);
```

---

### Form pattern: react-hook-form + Zod 3 + zodResolver

**Source:** `src/components/hiring/CandidateForm.tsx:23-89` + `src/components/hiring/PublicApplicationForm.tsx:56-200`.

**Apply to:** `ConsentForm`, `OptInCheckboxes`, modified `PublicApplicationForm`.

**Excerpt (verbatim from `CandidateForm.tsx:23-54`):**
```typescript
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const schema = z.object({
  full_name: z.string().min(2, "Nome obrigatório"),
  email: z.string().email("E-mail inválido"),
  // ... use Zod 3 syntax (errorMap, refine, superRefine) — DO NOT upgrade to Zod 4 (CLAUDE.md lock)
});
type FormValues = z.infer<typeof schema>;

const { register, handleSubmit, formState, setValue, watch, reset } = useForm<FormValues>({
  resolver: zodResolver(schema),
  defaultValues: { /* explicit — never let Zod default fire `defaultChecked` (TAL-04) */ },
});
```

**Convention:** no `as any` casts (CLAUDE.md); Zod 3.25 + `@hookform/resolvers` 5.2.2 (CLAUDE.md lock).

---

### Migration header + idempotency convention

**Source:** `supabase/migrations/20260427120100_b2_org_units_and_helpers.sql:1-30` (full header block) + `20260422150000_candidate_conversations.sql:1-13` (rationale block).

**Apply to:** all 4 Phase 2 migrations (`20260428120000_f1_*`, `_f2_*`, `_f3_*`, `_f4_*`).

**Pattern:**
```sql
-- =========================================================================
-- Migration F.X: <descriptive name>
--
-- Motivação: <2-3 lines, why this exists, link to REQ-IDs>
-- Pattern: <expand-backfill-contract | DDL-only | RPC + cron | etc>
-- Threats: <T-X-XX from PITFALLS / RESEARCH §>
-- REQs: <comma-separated>
-- =========================================================================

CREATE TABLE IF NOT EXISTS ... ;
CREATE INDEX IF NOT EXISTS ... ;
CREATE OR REPLACE FUNCTION ... LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$ ... $$;
DROP POLICY IF EXISTS "..." ON ... ;
CREATE POLICY "..." ON ... ;
COMMENT ON TABLE ... IS '...';
```

**Convention:** all DDL is `IF NOT EXISTS` / `CREATE OR REPLACE` / `DROP IF EXISTS` for idempotency (matches Phase 1 Rule 1 fix in `20260427120100_b2_*.sql:21-29`).

---

### Toast posicionamento + duração (UI-SPEC LOCK)

**Source:** UI-SPEC §"Toast positions and durations" + `src/components/ui/sonner.tsx`.

**Apply to:** all `toast.error`, `toast.info`, `toast.success` calls in Phase 2.

**Convention:**
- `import { toast } from "sonner"` (NOT `@/hooks/use-toast` — sonner is the Phase 2 standard per UI-SPEC)
- Default duration: 4s
- Destructive duration: 8s (RLS denial, "could not save after 3 retries", LGPD missing consent)
- Position: top-right (configured globally in `src/components/ui/sonner.tsx`)
- Border-only color (no solid background) — Linear style

**Existing precedent:** `CandidatesKanban.tsx:20` uses `import { toast } from "sonner"`. Other hooks (`useApplications.ts:3`, `useCandidates.ts:3`) use `@/hooks/use-toast` — Phase 2 will normalize to sonner where modified, leave alone where untouched.

---

### Anti-PII logger pattern (CLAUDE.md QUAL gate)

**Source:** CLAUDE.md "No PII in console.log" + `tests/lib/logger.test.ts`.

**Apply to:** error logging in `useMoveApplicationStage` `onError`, `apply-to-job` Edge Function consent failure, AuditLogPanel debug.

**Convention:**
- Never `console.log(application.candidate_email)` or similar PII
- Use prefixes for grep: `[RLS]`, `[supabase]`, `[consent]` (matches existing `supabaseError.ts:33-37` and `apply-to-job/index.ts` conventions)
- `console.error` only with redacted error objects (no nested PII)

---

## No Analog Found

| File | Role | Data Flow | Reason | Mitigation |
|------|------|-----------|--------|------------|
| `src/hooks/hiring/useApplicationsRealtime.ts` | hook | event-driven | No existing realtime consumer in `src/hooks/` | Use `useScopedRealtime.ts:18-38` chokepoint as shape, but write dedicated hook (RESEARCH §2 line 489-491). Key differences: per-jobId channel name, direct `setQueryData` write (not generic event bus). |
| `src/hooks/hiring/useCardPreferences.ts` | hook | localStorage | No localStorage hook in `src/hooks/`; closest is `zustand persist` in `src/features/tenancy/lib/store.ts` | Write from scratch with Zod schema validation (see Pattern Assignments above). Future: migrate to `user_preferences` table. |
| `src/components/hiring/CardFieldsCustomizer.tsx` | component | popover settings | No existing popover-based UI prefs panel | Use shadcn `Popover` + `Checkbox` primitives directly (UI-SPEC declares these as shadcn-vetted) |
| `src/components/hiring/BoardTableToggle.tsx` | component | segmented control | No existing toggle in codebase | Tiny wrapper over shadcn `Button` variants — write from scratch (UI-SPEC §"Toggle Board → Table" copy) |

---

## Metadata

**Analog search scope:**
- `src/components/hiring/` (33 files)
- `src/hooks/hiring/` (18 files)
- `src/lib/hiring/` (5 files)
- `src/lib/supabaseError.ts`
- `src/shared/data/` (chokepoints)
- `src/app/providers/ScopeProvider.tsx`
- `src/integrations/supabase/hiring-types.ts`
- `supabase/migrations/` (54 files; matched against §"Migration F" needs)
- `supabase/tests/` (5 pgTAP files)
- `supabase/functions/apply-to-job/index.ts`
- `tests/scope/`, `tests/lib/`, `tests/hiring/` (existing Vitest tests)

**Files scanned:** 31 read in full; ~12 grep'd by pattern (`zodResolver`, `supabase.channel`, `useSearchParams`, `localStorage`, `postgres_changes`).

**Pattern extraction date:** 2026-04-27

**Confidence:** HIGH — every Pattern Assignment cites a real file:line range or a verbatim RESEARCH.md SQL/TS block (which itself was verified against codebase per RESEARCH metadata).

---

## PATTERN MAPPING COMPLETE
