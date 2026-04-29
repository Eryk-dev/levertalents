# Phase 3: Performance Refactor — Pattern Map

**Mapped:** 2026-04-28
**Files analyzed:** 9 migrations + 1 Edge Function + 17 hooks + 14 components + 5 pages + 4 utilities + 18 test stubs = ~68 files
**Analogs found:** 64 / 68 (4 files have no exact analog and inherit from RESEARCH.md patterns)

> Consumer: `gsd-planner`. This map provides the literal `<read_first>` files and code excerpts each plan action will copy/adapt. Concreteness is the goal — no abstract guidance.

---

## File Classification

### DB Migrations (Wave 1 + Wave 2 — 9 files)

| New File | Role | Data Flow | Closest Analog | Match Quality |
|----------|------|-----------|----------------|---------------|
| `supabase/migrations/20260429120000_e1_company_groups_seed.sql` | migration (data seed) | batch | `supabase/migrations/20260427120200_c_socio_memberships_rls_rewrite_and_backfill.sql` §5.1-5.2 | exact (same precedent) |
| `supabase/migrations/20260429120100_e2_teams_to_org_units_backfill.sql` | migration (backfill) | batch | `supabase/migrations/20260427120200_c_socio_memberships_rls_rewrite_and_backfill.sql` §5.4-5.6 | exact |
| `supabase/migrations/20260429120200_e3_socios_to_memberships.sql` | migration (backfill) | batch | `supabase/migrations/20260427120200_c_socio_memberships_rls_rewrite_and_backfill.sql` §1 (table create) + §5.7 (deferred backfill) | exact |
| `supabase/migrations/20260429130000_perf1_evaluation_cycles_and_templates.sql` | migration (DDL + RLS + trigger) | request-response | `supabase/migrations/20260428120300_f4_cpf_canonical_dedup.sql` (trigger pattern) + `supabase/migrations/20260428120200_f3_candidate_consents.sql` (table+RLS) | exact (split across two analogs) |
| `supabase/migrations/20260429130100_perf2_drop_evaluations_history.sql` | migration (destructive contract) | batch | `supabase/migrations/20260428120300_f4_cpf_canonical_dedup.sql` §3 (validation gate before destructive) | role-match |
| `supabase/migrations/20260429140000_clim1_drop_user_id_from_responses.sql` | migration (column drop + backfill) | batch | `supabase/migrations/20260428120300_f4_cpf_canonical_dedup.sql` (normalize-then-constrain) | role-match |
| `supabase/migrations/20260429140100_clim2_aggregate_rpc.sql` | migration (RPC SECURITY DEFINER) | request-response | `supabase/migrations/20260428120100_f2_data_access_log_table.sql` §3 (RPC pattern) | exact |
| `supabase/migrations/20260429150000_one1_one_on_ones_extensions.sql` | migration (DDL + RLS + add column + new table) | request-response | `supabase/migrations/20260428120200_f3_candidate_consents.sql` (table + RLS por role) | exact |
| `supabase/migrations/20260429160000_auth1_must_change_password.sql` | migration (column add) | request-response | `supabase/migrations/20260428120300_f4_cpf_canonical_dedup.sql` §1 (simple ALTER TABLE) | role-match |
| `supabase/migrations/20260429160100_cron1_evaluation_cycles_auto_close.sql` | migration (pg_cron job) | scheduled | `supabase/migrations/20260428120100_f2_data_access_log_table.sql` §5 (cron.schedule idempotent) | exact |

### Edge Function (1 file)

| New File | Role | Data Flow | Closest Analog | Match Quality |
|----------|------|-----------|----------------|---------------|
| `supabase/functions/create-user-with-temp-password/index.ts` | edge function | request-response | `supabase/functions/create-user/index.ts` (auth.admin.createUser) + `supabase/functions/apply-to-job/index.ts` (CORS + service role pattern) | exact (precedent both) |

### Hooks (17 files — 15 rewrites + 2 new + 4 unchanged)

| File | Status | Role | Data Flow | Closest Analog | Match Quality |
|------|--------|------|-----------|----------------|---------------|
| `src/hooks/useEvaluations.ts` | REWRITE | hook (CRUD scoped) | request-response | `src/hooks/hiring/useApplications.ts` (useApplicationsByJob + useMoveApplicationStage) | exact |
| `src/hooks/useEvaluationCycles.ts` | NEW | hook (CRUD scoped) | request-response | `src/hooks/hiring/useApplications.ts` | exact |
| `src/hooks/useEvaluationTemplates.ts` | NEW | hook (CRUD scoped) | request-response | `src/hooks/hiring/useApplications.ts` | exact |
| `src/hooks/useClimateSurveys.ts` | REWRITE | hook (CRUD + RPC submit) | request-response | `src/hooks/hiring/useCandidateConsents.ts` (insert + revoke pattern; queryKey scoped) | exact |
| `src/hooks/useClimateAggregate.ts` | NEW | hook (RPC read) | request-response | `src/hooks/hiring/useApplications.ts` (useApplication single-row pattern, but via `supabase.rpc()` instead of `from()`) | role-match |
| `src/hooks/useClimateOverview.ts` | REWRITE | hook (composite read) | request-response | `src/hooks/useClimateOverview.ts` (current — refactor in place adding `useScopedQuery`) | exact (self-rewrite) |
| `src/hooks/useOneOnOnes.ts` | REWRITE | hook (CRUD + filters) | request-response | `src/hooks/hiring/useApplications.ts` (filters + optimistic mutation) | exact |
| `src/hooks/useDevelopmentPlans.ts` | REWRITE | hook (read scoped) | request-response | `src/hooks/hiring/useApplications.ts` | role-match |
| `src/hooks/useNineBoxDistribution.ts` | REWRITE | hook (read scoped) | request-response | `src/hooks/hiring/useApplications.ts` | role-match |
| `src/hooks/useCollaboratorEvolution.ts` | REWRITE | hook (read scoped) | request-response | `src/hooks/hiring/useApplications.ts` | role-match |
| `src/hooks/useTeamIndicators.ts` | REWRITE | hook (read scoped) | request-response | `src/hooks/hiring/useApplications.ts` | role-match |
| `src/hooks/useOrgIndicators.ts` | REWRITE | hook (read scoped) | request-response | `src/hooks/hiring/useApplications.ts` | role-match |
| `src/hooks/useLeaderAlerts.ts` | REWRITE | hook (read scoped) | request-response | `src/hooks/hiring/useApplications.ts` | role-match |
| `src/hooks/usePendingTasks.ts` | REWRITE | hook (read scoped) | request-response | `src/hooks/hiring/useApplications.ts` | role-match |
| `src/hooks/useActionItems.ts` | REWRITE | hook (CRUD scoped) | request-response | `src/hooks/hiring/useApplications.ts` | role-match |
| `src/hooks/usePDIIntegrated.ts` | REWRITE (light) | hook (CRUD scoped) | request-response | `src/hooks/hiring/useApplications.ts` | role-match |
| `src/hooks/usePDIUpdates.ts` | REWRITE (light) | hook (read scoped) | request-response | `src/hooks/hiring/useApplications.ts` | role-match |
| `src/hooks/useCostBreakdown.ts` | REWRITE | hook (read scoped) | request-response | `src/hooks/hiring/useApplications.ts` | role-match |
| `src/hooks/useCreateUserWithTempPassword.ts` | NEW | hook (Edge Function invoke) | request-response | `src/pages/CreateUser.tsx` lines 84-95 (current `supabase.functions.invoke('create-user', ...)`) — extract to hook | role-match |
| `src/hooks/useChangePassword.ts` | NEW | hook (auth update + profile flag flip) | request-response | `src/hooks/hiring/useCandidateConsents.ts` `useRevokeConsent` (mutation + multi-invalidate) | role-match |
| `src/hooks/useMeetingTimer.ts` | NEW | custom hook (extracted state) | event-driven | `src/components/OneOnOneMeetingForm.tsx` lines 100-103 + 89-91 (current refs + state) | exact (extraction, not new logic) |
| `src/hooks/useAgendaState.ts` | NEW | custom hook (extracted state) | event-driven | `src/components/OneOnOneMeetingForm.tsx` line 95 (`agendaItems` state) | exact (extraction) |
| `src/hooks/useActionItemsState.ts` | NEW | custom hook (extracted state) | event-driven | `src/components/OneOnOneMeetingForm.tsx` line 96 (`actionItems` state) | exact (extraction) |
| `src/hooks/usePlaudInput.ts` | NEW | custom hook (paste validation) | event-driven | `src/lib/supabaseError.ts` (validation helper pattern) | role-match (no exact analog — small new logic) |

### Components (14 files — 6 refactor + 8 new)

| File | Status | Role | Data Flow | Closest Analog | Match Quality |
|------|--------|------|-----------|----------------|---------------|
| `src/components/EvaluationForm.tsx` | REFACTOR (orchestrator <300) | component (form orchestrator) | request-response | `src/components/EvaluationForm.tsx` (self) + Pattern 3 from RESEARCH §"Dynamic Zod Resolver" | exact (self-rewrite) |
| `src/components/EvaluationFormSection.tsx` | NEW | component (presenter) | event-driven | extraction from `EvaluationForm.tsx` lines 39-83 (COMPETENCIES iteration) | exact (extraction) |
| `src/components/EvaluationFormQuestion.tsx` | NEW | component (presenter) | event-driven | extraction from `EvaluationForm.tsx` lines 77-83 (LEVELS rendering) | exact (extraction) |
| `src/components/CycleCard.tsx` | NEW | component (card display) | request-response | LinearKit `Card` primitive + `StatCard` pattern (RESEARCH §UI-SPEC mentions `p-3.5` shipping baseline) | role-match |
| `src/components/CreateCycleDialog.tsx` | NEW | component (dialog form) | request-response | shadcn Dialog vendored — pattern from any RHF+Zod dialog (e.g. `CreateUser.tsx` form pattern, lines 47-126 — adapted to Dialog wrapper) | role-match |
| `src/components/ClimateAggregateCard.tsx` | NEW | component (k-anon aware card) | request-response | `useClimateAggregate` hook output + LinearKit `Card` empty-state pattern | no analog (new pattern — UI-SPEC.md §"k-anonymity rendering" is the contract) |
| `src/components/OneOnOneMeetingForm.tsx` | REFACTOR (orchestrator <300) | component (form orchestrator) | request-response | `src/components/OneOnOneMeetingForm.tsx` (self) — split into 4 sub-components | exact (self-rewrite) |
| `src/components/OneOnOneAgenda.tsx` | NEW | component (presenter + state) | event-driven | extraction from `OneOnOneMeetingForm.tsx` lines 68-73 (DEFAULT_AGENDA) + agenda render block | exact (extraction) |
| `src/components/OneOnOneNotes.tsx` | NEW | component (presenter + textareas) | event-driven | extraction from `OneOnOneMeetingForm.tsx` (transcricao + resumo render) — extends with two Plaud textareas | exact (extraction + 2 new fields) |
| `src/components/OneOnOneActionItems.tsx` | NEW | component (presenter + state) | event-driven | extraction from `OneOnOneMeetingForm.tsx` (action items render block) | exact (extraction) |
| `src/components/OneOnOnePDIPanel.tsx` | NEW | component (presenter, isolated) | event-driven | extraction from `OneOnOneMeetingForm.tsx` lines 86-87 + 97 (PDI hooks/state) | exact (extraction; PDI already partially isolated) |
| `src/components/OneOnOneRHNote.tsx` | NEW | component (RH-only section) | request-response | `src/components/OneOnOneMeetingForm.tsx` (no analog for role-conditional render) — UI-SPEC §"1:1 form layout" specifies role check via CASL | role-match |
| `src/components/OneOnOneRHVisibleBadge.tsx` | NEW | component (presenter — badge) | static | LinearKit `Chip` color="amber" pattern — UI-SPEC §"Standing labels (locked literal copy)" for "RH visível" string | role-match |
| `src/components/OneOnOnesViewToggle.tsx` | NEW | component (toggle + persistence) | event-driven | shadcn ToggleGroup + Phase 2 toggle persistence pattern (`leverup:rs:card-fields:{userId}` referenced in UI-SPEC §"Toggle Lista geral / Por par") | role-match |
| `src/components/OnboardingMessageBlock.tsx` | NEW | component (display + copy-to-clipboard) | event-driven | UI-SPEC §"WhatsApp onboarding message (D-20 — exact template)" — locked template; no analog in codebase for clipboard pattern | no analog (new pattern; UI-SPEC §Step 2 is contract) |
| `src/components/FirstLoginChangePasswordCard.tsx` | NEW | component (auth form) | request-response | `src/pages/CreateUser.tsx` form pattern (lines 47-126 — RHF + Zod + Btn) | role-match |
| `src/components/TempPasswordExpiredBanner.tsx` | NEW | component (presenter — banner) | static | LinearKit `Chip` amber + UI-SPEC §"Standing labels" amber banner copy | role-match |
| `src/components/ProtectedRoute.tsx` | EXTEND | route guard component | request-response | `src/components/ProtectedRoute.tsx` (self — adds must_change_password check from RESEARCH §Pattern 5) | exact (self-extend) |

### Pages (5 files — 3 refactor + 1 rewrite + 1 new)

| File | Status | Role | Data Flow | Closest Analog | Match Quality |
|------|--------|------|-----------|----------------|---------------|
| `src/pages/Evaluations.tsx` | REFACTOR | page (list + drill-down) | request-response | `src/pages/Evaluations.tsx` (self — restructure to cycle-cards) | exact (self-rewrite) |
| `src/pages/Climate.tsx` | REFACTOR | page (k-anon aware list) | request-response | `src/pages/Climate.tsx` (self) | exact (self-rewrite) |
| `src/pages/OneOnOnes.tsx` | REFACTOR | page (list with toggle) | request-response | `src/pages/OneOnOnes.tsx` (self) | exact (self-rewrite) |
| `src/pages/CreateUser.tsx` (rename to /cadastrar-pessoa per UI-SPEC) | REWRITE | page (form + post-success modal) | request-response | `src/pages/CreateUser.tsx` (self — base form structure preserved; password field removed; post-success modal added) | exact (self-rewrite) |
| `src/pages/FirstLoginChangePassword.tsx` | NEW | page (blocking auth gate) | request-response | `src/pages/CreateUser.tsx` (form pattern) + RESEARCH §Pattern 5 (ProtectedRoute logic) | role-match |

### Utilities (4 files — all NEW)

| File | Status | Role | Data Flow | Closest Analog | Match Quality |
|------|--------|------|-----------|----------------|---------------|
| `src/lib/evaluationTemplate.ts` | NEW | utility (Zod builder) | transform | RESEARCH §Pattern 3 (literal code in `Code Examples` section) | exact (literal code provided) |
| `src/lib/passwordGenerator.ts` | NEW | utility (CSPRNG sampler) | transform | Edge Function `generateTempPassword` lines from RESEARCH §Pattern 4 + Web Crypto standard | exact (literal code provided in RESEARCH) |
| `src/lib/climateAggregation.ts` | NEW | utility (k-anon helper for tests) | transform | RPC `get_climate_aggregate` from RESEARCH §Pattern 2 — TS mirror for unit tests | role-match (logic mirror only) |
| `src/lib/scopeKey.ts` | NEW (optional) | utility (queryKey helper) | transform | `useScopedQuery.ts` (line 40 prefix shape) | role-match (codifies prefix shape) |

### Tests (Wave 0 stubs — 18 files)

| File | Status | Role | Data Flow | Closest Analog | Match Quality |
|------|--------|------|-----------|----------------|---------------|
| `supabase/tests/003_evaluation_cycles_snapshot.sql` | NEW | pgTAP test | batch | `supabase/tests/` Phase 1 setup + RESEARCH Wave 0 Gaps section | role-match (no Phase 3-specific analog) |
| `supabase/tests/004_evaluations_rls.sql` | NEW | pgTAP test | batch | same | role-match |
| `supabase/tests/005_climate_anonymity.sql` | NEW | pgTAP test | batch | same | role-match |
| `supabase/tests/006_one_on_ones_rls.sql` | NEW | pgTAP test | batch | same | role-match |
| `supabase/tests/007_backfill_e.sql` | NEW | pgTAP test | batch | same | role-match |
| `src/lib/__tests__/passwordGenerator.test.ts` | NEW | vitest unit | transform | RESEARCH §Pattern 4 alphabet + 8-char rule | role-match |
| `src/lib/__tests__/evaluationTemplate.test.ts` | NEW | vitest unit | transform | RESEARCH §Pattern 3 (literal Zod build) | role-match |
| `src/lib/__tests__/climateAggregation.test.ts` | NEW | vitest unit | transform | RESEARCH §Pattern 2 (k-anon ≥3 logic) | role-match |
| `src/components/__tests__/OnboardingMessageBlock.test.tsx` | NEW | RTL component test | event-driven | (none in repo) — UI-SPEC §"WhatsApp onboarding message" template | no analog (new test) |
| `src/components/__tests__/EvaluationForm.test.tsx` | NEW | RTL component test | event-driven | (none in repo for Performance) — RHF + zodResolver test pattern | no analog |
| `src/components/__tests__/OneOnOneMeetingForm.test.tsx` | NEW | RTL component test | event-driven | (none in repo) | no analog |
| `src/components/__tests__/OneOnOneNotes.test.tsx` | NEW | RTL component test | event-driven | (none in repo) | no analog |
| `src/components/__tests__/OneOnOneActionItems.test.tsx` | NEW | RTL component test | event-driven | (none in repo) | no analog |
| `src/components/__tests__/ProtectedRoute.test.tsx` | NEW | RTL component test | event-driven | RESEARCH §Pattern 5 (ProtectedRoute redirect logic) | role-match |
| `src/pages/__tests__/CreateUser.test.tsx` | NEW | RTL page test | event-driven | (none in repo) — MSW handler for `create-user-with-temp-password` Edge Function | no analog |
| `src/pages/__tests__/FirstLoginChangePassword.test.tsx` | NEW | RTL page test | event-driven | RESEARCH §Pattern 5 + UI-SPEC §"First-login screen" | role-match |
| `src/pages/__tests__/OneOnOnes.test.tsx` | NEW | RTL page test | event-driven | (none in repo) | no analog |
| MSW handlers update | EXTEND | test infrastructure | request-response | existing MSW setup from Phase 1 (Wave 0 setup file) — extend with `create-user-with-temp-password` + `get_climate_aggregate` + `submit_climate_response` | role-match |

---

## Pattern Assignments

### DB MIGRATIONS

#### `e1_company_groups_seed.sql` (data seed, batch)

**Analog:** `supabase/migrations/20260427120200_c_socio_memberships_rls_rewrite_and_backfill.sql` lines 487-515

**Header pattern** (lines 1-29 of analog):
```sql
-- =========================================================================
-- Migration E1: Grupo Lever + 7 internal companies seed
--
-- Threats: T-3-01 (mismatched names — owner inputs file MUST be loaded first)
-- REQs: TEN-04 (precedente), Phase 3 D-27/D-28
-- Reversibility: idempotent — DELETE rows by slug if needed; no destructive ops.
-- DEPENDENCIES: Phase 1 Migrations A + B + C must be applied first.
-- =========================================================================
```

**Idempotent upsert pattern** (lines 489-492 of analog — copy verbatim, adapt slug list):
```sql
INSERT INTO public.company_groups (slug, name)
VALUES ('grupo-lever', 'Grupo Lever')
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name;
```

**Update assignment pattern** (lines 504-515 — adapt company names from owner-inputs JSON):
```sql
DO $$
DECLARE
  grupo_lever_id uuid;
BEGIN
  SELECT id INTO grupo_lever_id FROM public.company_groups WHERE slug = 'grupo-lever';
  UPDATE public.companies
     SET group_id            = grupo_lever_id,
         performance_enabled = true,
         rs_enabled          = true
   WHERE name IN (
     -- Replaced from .planning/phases/03-performance-refactor/owner-inputs/companies.json
     'Lever Consult', 'Lever Outsourcing', 'Lever Gestão',
     'Lever People',  'Lever Tech',        'Lever Talents',
     'Lever Operations'
   );
END $$;
```

**Key differences from analog:**
- Phase 1 was idempotent placeholder (Migration C ran with placeholder names; Migration E1 is the **owner-confirmed** version with locked UUIDs).
- E1 BLOCKS until `owner-inputs/companies.json` is provided (Pitfall §7 from RESEARCH).
- E1 may also create missing companies (Phase 1 Migration C only updates if name match).

---

#### `e2_teams_to_org_units_backfill.sql` (backfill, batch)

**Analog:** `supabase/migrations/20260427120200_c_socio_memberships_rls_rewrite_and_backfill.sql` lines 526-558

**Teams → org_units pattern** (lines 530-542 of analog — copy verbatim):
```sql
INSERT INTO public.org_units (id, company_id, parent_id, name, kind, position, created_at)
SELECT t.id,
       t.company_id,
       (SELECT ou.id FROM public.org_units ou
          WHERE ou.company_id = t.company_id AND ou.parent_id IS NULL
          LIMIT 1),
       t.name,
       'time',
       0,
       t.created_at
  FROM public.teams t
 WHERE NOT EXISTS (SELECT 1 FROM public.org_units WHERE id = t.id)
 ON CONFLICT (id) DO NOTHING;
```

**team_members → org_unit_members** (lines 545-549 — copy verbatim):
```sql
INSERT INTO public.org_unit_members (org_unit_id, user_id, is_primary)
SELECT tm.team_id, tm.user_id, true
  FROM public.team_members tm
 WHERE EXISTS (SELECT 1 FROM public.org_units WHERE id = tm.team_id)
 ON CONFLICT (org_unit_id, user_id) DO NOTHING;
```

**Leader mirror** (lines 552-557 — copy verbatim, but **WARNING**: Phase 1 used `team_members.leader_id` not `teams.leader_id`. RESEARCH §"Discovery 3" notes `teams.leader_id` is the canonical column. Verify):
```sql
INSERT INTO public.unit_leaders (org_unit_id, user_id)
SELECT DISTINCT t.id, t.leader_id
  FROM public.teams t
 WHERE t.leader_id IS NOT NULL
   AND EXISTS (SELECT 1 FROM public.org_units WHERE id = t.id)
 ON CONFLICT (org_unit_id, user_id) DO NOTHING;
```

**Key differences from analog:**
- Phase 1 already ran this idempotently. E2 confirms completion + adds **pgTAP validation** that every team WITH leader has a unit_leaders row (Open Question Q5 in RESEARCH).
- E2 source-of-leader is `teams.leader_id` (single TEXT) — Phase 1 used `team_members.leader_id`. Phase 3 reconciles.

---

#### `e3_socios_to_memberships.sql` (backfill, batch)

**Analog:** `supabase/migrations/20260427120200_c_socio_memberships_rls_rewrite_and_backfill.sql` §1 (table create — lines 33-44) + §5.7 (deferred backfill explanation, lines 559-562)

**Backfill pattern** (NEW — Phase 1 explicitly deferred this):
```sql
-- D-29: For each user with role='socio', insert membership rows from owner-inputs.json
-- Loaded from .planning/phases/03-performance-refactor/owner-inputs/socio-memberships.json
DO $$
DECLARE
  pair record;
BEGIN
  FOR pair IN
    SELECT * FROM (VALUES
      -- (socio_user_id, company_id) tuples from owner-inputs file
      ('uuid-from-owner-1'::uuid, 'company-uuid-1'::uuid),
      ('uuid-from-owner-2'::uuid, 'company-uuid-2'::uuid)
      -- ... etc
    ) AS t(user_id, company_id)
  LOOP
    INSERT INTO public.socio_company_memberships (user_id, company_id)
    VALUES (pair.user_id, pair.company_id)
    ON CONFLICT (user_id, company_id) DO NOTHING;
  END LOOP;
END $$;
```

**Key differences from analog:**
- Phase 1 created the table empty (line 559-562: "ZERO backfill"). E3 fills it.
- Owner provides `.planning/phases/03-performance-refactor/owner-inputs/socio-memberships.json` BEFORE migration runs.
- Block migration if owner inputs file missing (per Pitfall §7).

---

#### `perf1_evaluation_cycles_and_templates.sql` (DDL + RLS + trigger)

**Analog #1 (table+RLS):** `supabase/migrations/20260428120200_f3_candidate_consents.sql` lines 45-107

**CREATE TABLE pattern** (lines 45-64 of analog — copy structure):
```sql
CREATE TABLE IF NOT EXISTS public.evaluation_templates (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name         text NOT NULL,
  schema_json  jsonb NOT NULL,
  is_default   boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT NOW(),
  updated_at   timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT templates_schema_has_version
    CHECK (schema_json ? 'version' AND schema_json ? 'sections')
);

CREATE INDEX IF NOT EXISTS idx_evaluation_templates_company
  ON public.evaluation_templates (company_id);

ALTER TABLE public.evaluation_templates ENABLE ROW LEVEL SECURITY;
```

**RLS via visible_companies pattern** (analog uses is_people_manager — Phase 3 uses visible_companies for company-scoping):
```sql
DROP POLICY IF EXISTS "evaluation_templates:select" ON public.evaluation_templates;
CREATE POLICY "evaluation_templates:select"
  ON public.evaluation_templates FOR SELECT TO authenticated
  USING (company_id = ANY(public.visible_companies((SELECT auth.uid()))));

DROP POLICY IF EXISTS "evaluation_templates:mutate_managers" ON public.evaluation_templates;
CREATE POLICY "evaluation_templates:mutate_managers"
  ON public.evaluation_templates FOR ALL TO authenticated
  USING (
    public.is_people_manager((SELECT auth.uid()))
    AND company_id = ANY(public.visible_companies((SELECT auth.uid())))
  )
  WITH CHECK (
    public.is_people_manager((SELECT auth.uid()))
    AND company_id = ANY(public.visible_companies((SELECT auth.uid())))
  );
```

**Analog #2 (BEFORE trigger):** `supabase/migrations/20260428120300_f4_cpf_canonical_dedup.sql` lines 51-67

**Trigger pattern (snapshot freeze)** — copy from RESEARCH §Pattern 1 (lines 350-379):
```sql
CREATE OR REPLACE FUNCTION public.tg_freeze_template_snapshot()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_schema jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.template_id IS NULL THEN
      RAISE EXCEPTION 'evaluation_cycles.template_id is required';
    END IF;
    SELECT schema_json INTO v_schema
      FROM public.evaluation_templates
     WHERE id = NEW.template_id;
    IF v_schema IS NULL THEN
      RAISE EXCEPTION 'template % not found', NEW.template_id;
    END IF;
    NEW.template_snapshot := v_schema;
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.template_snapshot IS DISTINCT FROM OLD.template_snapshot THEN
    RAISE EXCEPTION 'template_snapshot is immutable after cycle creation';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS tg_evaluation_cycles_freeze ON public.evaluation_cycles;
CREATE TRIGGER tg_evaluation_cycles_freeze
  BEFORE INSERT OR UPDATE OF template_snapshot ON public.evaluation_cycles
  FOR EACH ROW EXECUTE FUNCTION public.tg_freeze_template_snapshot();
```

**Key differences from analog:**
- F.3 used `EXCLUDE USING gist` constraint; perf1 does not (no overlapping cycles to prevent).
- F.4 trigger validated CPF format; perf1 trigger reads from sibling table to populate snapshot.
- Adds `evaluations.cycle_id` + `direction` + `responses JSONB` + `company_id` AS NULLABLE columns (per Pitfall §1: don't break legacy hooks immediately).

---

#### `perf2_drop_evaluations_history.sql` (destructive contract)

**Analog:** `supabase/migrations/20260428120300_f4_cpf_canonical_dedup.sql` §3 (lines 31-43 — pre-destructive validation gate)

**Validation-gate pattern** (lines 31-43 of analog — adapt for cycle requirement):
```sql
-- 1. Validation: must NOT proceed if perf1 hasn't created cycle_id column
DO $$
DECLARE v_has_cycle_id INT;
BEGIN
  SELECT count(*) INTO v_has_cycle_id
    FROM information_schema.columns
   WHERE table_schema = 'public'
     AND table_name = 'evaluations'
     AND column_name = 'cycle_id';
  IF v_has_cycle_id = 0 THEN
    RAISE EXCEPTION 'Migration perf2 abortada: perf1 deve ser aplicada primeiro (cycle_id ausente).';
  END IF;
END $$;

-- 2. DESTRUCTIVE: TRUNCATE evaluations (D-08 owner-locked)
-- Single transaction — failure auto-rollbacks; PITR is the recovery path.
TRUNCATE TABLE public.evaluations CASCADE;

-- 3. Drop legacy schema columns (now safe — table is empty)
ALTER TABLE public.evaluations
  DROP COLUMN IF EXISTS period,
  DROP COLUMN IF EXISTS overall_score,
  DROP COLUMN IF EXISTS technical_score,
  DROP COLUMN IF EXISTS behavioral_score,
  DROP COLUMN IF EXISTS leadership_score,
  DROP COLUMN IF EXISTS comments,
  DROP COLUMN IF EXISTS strengths,
  DROP COLUMN IF EXISTS areas_for_improvement;

-- 4. Tighten new columns
ALTER TABLE public.evaluations
  ALTER COLUMN cycle_id SET NOT NULL,
  ALTER COLUMN direction SET NOT NULL,
  ALTER COLUMN company_id SET NOT NULL;

-- 5. Add CHECK on direction enum
ALTER TABLE public.evaluations
  ADD CONSTRAINT evaluations_direction_check
    CHECK (direction IN ('leader_to_member', 'member_to_leader'));
```

**Key differences from analog:**
- F.4 normalized data before adding constraint; perf2 truncates first, then constrains (because owner explicitly chose drop).
- Single transaction — Postgres auto-rolls back if any step fails (Pitfall §6 from RESEARCH).
- Comment header MUST include `⚠️ DESTRUCTIVE` + reference to STATE.md announce.

---

#### `clim1_drop_user_id_from_responses.sql` (column drop + backfill)

**Analog:** `supabase/migrations/20260428120300_f4_cpf_canonical_dedup.sql` §2 (normalize-then-constrain pattern, lines 24-29)

**Add → backfill → drop pattern** (adapted):
```sql
-- 1. ADD column: org_unit_id (granularidade de agregação k-anon)
ALTER TABLE public.climate_responses
  ADD COLUMN IF NOT EXISTS org_unit_id uuid REFERENCES public.org_units(id) ON DELETE SET NULL;

-- 2. ADD column: company_id em climate_surveys (HOJE não existe — Discovery 1 RESEARCH)
ALTER TABLE public.climate_surveys
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);

-- 3. BACKFILL company_id de climate_surveys (deduz do creator)
UPDATE public.climate_surveys s
   SET company_id = (
     SELECT ou.company_id
       FROM public.org_unit_members oum
       JOIN public.org_units ou ON ou.id = oum.org_unit_id
      WHERE oum.user_id = s.created_by
      ORDER BY oum.is_primary DESC NULLS LAST, oum.created_at ASC
      LIMIT 1
   )
 WHERE s.company_id IS NULL;

-- 4. BACKFILL org_unit_id em climate_responses ANTES do drop user_id
UPDATE public.climate_responses cr
   SET org_unit_id = (
     SELECT oum.org_unit_id
       FROM public.org_unit_members oum
      WHERE oum.user_id = cr.user_id
        AND oum.is_primary = true
      LIMIT 1
   )
 WHERE cr.org_unit_id IS NULL AND cr.user_id IS NOT NULL;

-- 5. DESTRUCTIVE: drop user_id column (D-09)
DROP INDEX IF EXISTS idx_climate_responses_user_id;
ALTER TABLE public.climate_responses
  DROP COLUMN IF EXISTS user_id;

-- 6. Drop UNIQUE (survey, question, user) — substitui por (survey, question, org_unit) com CHECK count via trigger ou app-level
ALTER TABLE public.climate_responses
  DROP CONSTRAINT IF EXISTS climate_responses_survey_id_question_id_user_id_key;

-- 7. Tighten company_id (after backfill)
ALTER TABLE public.climate_surveys
  ALTER COLUMN company_id SET NOT NULL;
```

**Key differences from analog:**
- F.4 normalized in-place; clim1 deduces from join (more steps).
- Drop is WIPE-and-LOSE (no PII to preserve — D-09 explicit).
- Pattern Discovery 1 (RESEARCH) mandates adding `company_id` to climate_surveys (HOJE missing).

---

#### `clim2_aggregate_rpc.sql` (RPC SECURITY DEFINER)

**Analog:** `supabase/migrations/20260428120100_f2_data_access_log_table.sql` §3 (lines 51-103 — `read_candidate_with_log` RPC)

**RPC pattern** — copy from RESEARCH §Pattern 2 (lines 392-460) verbatim. Key structural elements from analog:

**SECURITY DEFINER + search_path** (lines 56-60 of analog):
```sql
CREATE OR REPLACE FUNCTION public.get_climate_aggregate(
  p_survey_id uuid,
  p_org_unit_id uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := (SELECT auth.uid());
  ...
```

**Re-apply RLS as the caller** (lines 73-89 of analog — pattern: SECURITY DEFINER bypasses RLS, so re-check):
```sql
v_visible_companies := public.visible_companies(v_actor);
SELECT company_id INTO v_survey_company FROM public.climate_surveys WHERE id = p_survey_id;
IF NOT (v_survey_company = ANY(v_visible_companies)) THEN
  RAISE EXCEPTION 'Sem permissao' USING ERRCODE = '42501';
END IF;
```

**GRANT pattern** (line 103 of analog):
```sql
REVOKE ALL ON FUNCTION public.get_climate_aggregate(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_climate_aggregate(uuid, uuid) TO authenticated;
```

**Second RPC for submit (no analog in legacy — new pattern):**
```sql
CREATE OR REPLACE FUNCTION public.submit_climate_response(
  p_survey_id uuid,
  p_question_id uuid,
  p_score smallint,
  p_comment text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := (SELECT auth.uid());
  v_org_unit_id uuid;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Nao autenticado' USING ERRCODE = '42501';
  END IF;
  -- Look up org_unit (server-side; never trusted from caller)
  SELECT org_unit_id INTO v_org_unit_id
    FROM public.org_unit_members
   WHERE user_id = v_actor AND is_primary = true
   LIMIT 1;
  -- Insert WITHOUT user_id (D-11 lock)
  INSERT INTO public.climate_responses (survey_id, question_id, score, comment, org_unit_id)
  VALUES (p_survey_id, p_question_id, p_score, p_comment, v_org_unit_id);
END $$;

GRANT EXECUTE ON FUNCTION public.submit_climate_response(uuid, uuid, smallint, text) TO authenticated;
```

**Key differences from analog:**
- f2's `read_candidate_with_log` writes audit log; clim2 does NOT log (D-11 anonymity > audit trail).
- Aggregate RPC returns sentinel `{insufficient_data: true}` (no count exposed — Pitfall §3).

---

#### `one1_one_on_ones_extensions.sql` (column add + new table)

**Analog:** `supabase/migrations/20260428120200_f3_candidate_consents.sql` (full file — same shape: new table + RLS by role)

**Add company_id to existing table** (RESEARCH Discovery 1 — `one_on_ones` HOJE não tem company_id):
```sql
-- 1. ADD company_id (NULL initial — backfill via leader's primary org_unit)
ALTER TABLE public.one_on_ones
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);

UPDATE public.one_on_ones oo
   SET company_id = (
     SELECT ou.company_id
       FROM public.org_unit_members oum
       JOIN public.org_units ou ON ou.id = oum.org_unit_id
      WHERE oum.user_id = oo.leader_id
      ORDER BY oum.is_primary DESC NULLS LAST, oum.created_at ASC
      LIMIT 1
   )
 WHERE oo.company_id IS NULL;

ALTER TABLE public.one_on_ones
  ALTER COLUMN company_id SET NOT NULL;
```

**Separate RH-notes table** (Pitfall §5 — A3 from Assumptions Log: tabela separada > coluna):
```sql
-- 2. RH-only sibling table (Pitfall §5: tabela separada para LGPD column-level isolation)
CREATE TABLE IF NOT EXISTS public.one_on_one_rh_notes (
  meeting_id   uuid PRIMARY KEY REFERENCES public.one_on_ones(id) ON DELETE CASCADE,
  notes        text NOT NULL DEFAULT '',
  updated_by   uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at   timestamptz NOT NULL DEFAULT NOW()
);

ALTER TABLE public.one_on_one_rh_notes ENABLE ROW LEVEL SECURITY;

-- RLS: SELECT/INSERT/UPDATE only admin OR rh (D-17 — sócio NÃO included)
DROP POLICY IF EXISTS "one_on_one_rh_notes:select_admin_rh_only" ON public.one_on_one_rh_notes;
CREATE POLICY "one_on_one_rh_notes:select_admin_rh_only"
  ON public.one_on_one_rh_notes FOR SELECT TO authenticated
  USING (
    public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
    OR public.has_role((SELECT auth.uid()), 'rh'::public.app_role)
  );

DROP POLICY IF EXISTS "one_on_one_rh_notes:mutate_admin_rh_only" ON public.one_on_one_rh_notes;
CREATE POLICY "one_on_one_rh_notes:mutate_admin_rh_only"
  ON public.one_on_one_rh_notes FOR ALL TO authenticated
  USING (
    public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
    OR public.has_role((SELECT auth.uid()), 'rh'::public.app_role)
  )
  WITH CHECK (
    public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
    OR public.has_role((SELECT auth.uid()), 'rh'::public.app_role)
  );
```

**Document JSONB extension (no DDL change — comment only):**
```sql
COMMENT ON COLUMN public.one_on_ones.meeting_structure IS
  'JSONB: { agenda_items[], action_items[], pdi_review, transcricao, resumo, transcricao_plaud, resumo_plaud }. Plaud fields added Phase 3 D-12/D-14.';
```

**Key differences from analog:**
- f3 uses ENUM types; one1 uses CHECK constraints (simpler — direction not granular like consent purpose).
- f3 has revoke pattern (UPDATE revoked_at); one1 is plain CRUD.
- one1 explicitly excludes `socio` from RH-notes (per CONTEXT D-17 + A11 in Assumptions Log).

---

#### `auth1_must_change_password.sql` (column add)

**Analog:** simple ALTER TABLE pattern — most similar to F.4 §1 (`CREATE OR REPLACE FUNCTION` is precedent for adding new behavior to existing tables)

**Pattern:**
```sql
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT false;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS temp_password_expires_at timestamptz;

COMMENT ON COLUMN public.profiles.must_change_password IS
  'Phase 3 D-22: TRUE quando senha temporária ativa; flipped to FALSE no first-login flow.';
COMMENT ON COLUMN public.profiles.temp_password_expires_at IS
  'Phase 3 D-22: timestamp UTC; após NOW() exibe banner amber (D-24) mas permite login.';
```

**RLS:** existing profile policies cover read/update by self — no policy changes needed. Both columns readable by self via existing `profiles:select_own` policy.

---

#### `cron1_evaluation_cycles_auto_close.sql` (pg_cron job)

**Analog:** `supabase/migrations/20260428120100_f2_data_access_log_table.sql` §5 (lines 137-152)

**Idempotent cron schedule pattern** (lines 138-152 of analog — copy verbatim, adapt query):
```sql
-- Idempotent: unschedule existente antes de re-schedule.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'evaluation_cycles_auto_close') THEN
    PERFORM cron.unschedule('evaluation_cycles_auto_close');
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'evaluation_cycles_auto_close',
  '0 6 * * *',  -- 03:00 BRT = 06:00 UTC (Claude's Discretion + A4 Assumptions Log)
  $cron$
    UPDATE public.evaluation_cycles
       SET status = 'closed', updated_at = NOW()
     WHERE status = 'active' AND ends_at <= NOW();
  $cron$
);
```

**Key differences from analog:**
- f2 retention runs weekly (`30 3 * * 1`); cron1 daily (`0 6 * * *`).
- Adapt query from DELETE to UPDATE.

---

### EDGE FUNCTION

#### `supabase/functions/create-user-with-temp-password/index.ts`

**Analog #1 (auth.admin pattern):** `supabase/functions/create-user/index.ts` lines 33-47

**Imports + CORS** (lines 1-8 of analog — copy verbatim):
```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
```

**Service-role client + auth.admin.createUser** (lines 14-47 of analog — adapt; see RESEARCH §Pattern 4 for full version):
```typescript
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
  email,
  password: tempPassword,
  email_confirm: true,
  user_metadata: { full_name: fullName, role }
});
if (createError) throw createError;
const userId = userData.user!.id;
```

**Analog #2 (rate limit + auth caller verification):** `supabase/functions/apply-to-job/index.ts` lines 21-53 (rate limit) + 96-101 (admin client setup)

**Caller authentication pattern (NEW for Phase 3 — based on RESEARCH §Pattern 4):**
```typescript
// 1. Authenticate caller (RH/Admin only — verify JWT)
const authHeader = req.headers.get('Authorization') ?? '';
const supabaseUser = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_ANON_KEY') ?? '',
  { global: { headers: { Authorization: authHeader } } }
);
const { data: { user: caller } } = await supabaseUser.auth.getUser();
if (!caller) throw new Error('Não autenticado');

// Check caller is admin or rh
const { data: roles } = await supabaseUser
  .from('user_roles')
  .select('role')
  .eq('user_id', caller.id);
const callerRoles = (roles ?? []).map(r => r.role);
if (!callerRoles.includes('admin') && !callerRoles.includes('rh')) {
  return new Response(JSON.stringify({ error: 'Sem permissão' }), {
    status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}
```

**Password generator (D-21 — NEW; full code in RESEARCH §Pattern 4):**
```typescript
const ALPHABET = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 56 chars, sem 0/O/o/1/l/I
function generateTempPassword(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  let out = '';
  for (let i = 0; i < 8; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return out;
}
```

**Profile flag flip + org_unit binding** (NEW pattern; informed by analog #1 lines 53-92 which used team_members — Phase 3 uses org_unit_members):
```typescript
const { error: profileError } = await supabaseAdmin
  .from('profiles')
  .update({
    full_name: fullName,
    must_change_password: true,
    temp_password_expires_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
  })
  .eq('id', userId);
if (profileError) throw profileError;

if (orgUnitId) {
  await supabaseAdmin
    .from('org_unit_members')
    .insert({ user_id: userId, org_unit_id: orgUnitId, is_primary: true });
}
```

**Idempotency on duplicate email** (NEW — Pitfall §1 from UI-SPEC error states):
```typescript
if (createError) {
  if (/already.*registered|exists/i.test(createError.message)) {
    return new Response(JSON.stringify({ error: 'duplicate_email' }), {
      status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  throw createError;
}
```

**Response with plaintext password** (D-20 lock):
```typescript
return new Response(JSON.stringify({
  success: true,
  userId,
  tempPassword,
  expiresAt
}), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
```

**Key differences from analogs:**
- create-user (Phase 1) used `team_members` insert; create-user-with-temp-password uses `org_unit_members` (Phase 1 model).
- create-user did NOT verify caller role; new function MUST (admin/rh only — D-20 implicit).
- New function returns `tempPassword` plaintext (current create-user expects caller-supplied).
- Apply-to-job's rate-limiting pattern (lines 21-53) is NOT copied — caller-authed flows don't rate-limit per IP.

---

### HOOKS

#### `useEvaluations.ts` (REWRITE)

**Analog:** `src/hooks/hiring/useApplications.ts` lines 40-57 (`useApplicationsByJob`) + lines 109-216 (`useMoveApplicationStage` for optimistic mutation)

**Imports pattern** (lines 1-23 of analog):
```typescript
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast as sonnerToast } from "sonner";
import { useScope } from "@/app/providers/ScopeProvider";
import { useScopedQuery } from "@/shared/data/useScopedQuery";
```

**Scoped query pattern** (lines 40-57 — copy verbatim, adapt):
```typescript
export function useEvaluationsByCycle(cycleId: string | undefined) {
  return useScopedQuery<EvaluationWithUsers[], Error>(
    ["evaluations", cycleId ?? "none"],
    async (companyIds): Promise<EvaluationWithUsers[]> => {
      if (!cycleId) return [];
      const { data, error } = await supabase
        .from("evaluations")
        .select(`
          id, cycle_id, evaluator_user_id, evaluated_user_id, direction, responses, status, created_at,
          evaluated_user:profiles!evaluations_evaluated_user_id_fkey(id, full_name, avatar_url),
          evaluator_user:profiles!evaluations_evaluator_user_id_fkey(id, full_name, avatar_url)
        `)
        .eq("cycle_id", cycleId)
        .in("company_id", companyIds)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as EvaluationWithUsers[];
    },
    { enabled: !!cycleId }
  );
}
```

**Optimistic mutation pattern** (lines 109-216 — adapt for `saveEvaluation` per PERF-07):
```typescript
export function useSaveEvaluation() {
  const queryClient = useQueryClient();
  const { scope } = useScope();
  const { user } = useAuth();

  return useMutation<{ ok: true; row: EvaluationRow }, Error, SaveEvaluationArgs, MutationContext>({
    mutationFn: async (args) => {
      const { data, error } = await supabase
        .from("evaluations")
        .upsert({
          cycle_id: args.cycleId,
          evaluator_user_id: user!.id,
          evaluated_user_id: args.evaluatedUserId,
          direction: args.direction,
          responses: args.responses,
          status: args.status,
        })
        .select()
        .maybeSingle();
      if (error) throw error;
      return { ok: true, row: data! };
    },
    onMutate: async (args) => {
      const queryKey = ["scope", scope?.id, scope?.kind, "evaluations", args.cycleId];
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData(queryKey);
      queryClient.setQueryData(queryKey, /* optimistic update */);
      return { previous, queryKey };
    },
    onError: (err, _args, context) => {
      if (context) queryClient.setQueryData(context.queryKey, context.previous);
      sonnerToast.error("Não foi possível salvar", { description: "Verifique a conexão e tente novamente." });
    },
    onSettled: async (_data, _err, _args, context) => {
      if (context) await queryClient.invalidateQueries({ queryKey: context.queryKey });
    }
  });
}
```

**Key differences from current `useEvaluations.ts`:**
- Current uses `useQuery` directly with no scope; rewrite uses `useScopedQuery`.
- Current has `period: string` interface (line 9); rewrite uses `cycle_id: string` + `direction`.
- Current scoreFields are 4 fixed columns (overall/technical/behavioral/leadership); rewrite uses `responses: Record<questionId, value>` JSONB.
- Adds optimistic mutation pattern (current has no optimism — RECOMMENDED for PERF-07).

---

#### `useClimateAggregate.ts` (NEW)

**Analog:** `src/hooks/hiring/useApplications.ts` `useApplication` pattern (lines 59-74) — adapted for RPC call

**Pattern (NEW — RPC via supabase.rpc):**
```typescript
import { useScopedQuery } from "@/shared/data/useScopedQuery";
import { supabase } from "@/integrations/supabase/client";

export interface ClimateAggregate {
  count: number;
  avg: number;
  distribution: Record<string, number>;
}
export interface InsufficientData {
  insufficient_data: true;
}
export type ClimateAggregateResult = ClimateAggregate | InsufficientData;

export function useClimateAggregate(surveyId: string | undefined, orgUnitId: string | null = null) {
  return useScopedQuery<ClimateAggregateResult, Error>(
    ["climate-aggregate", surveyId ?? "none", orgUnitId ?? "company"],
    async (): Promise<ClimateAggregateResult> => {
      if (!surveyId) return { insufficient_data: true } as InsufficientData;
      const { data, error } = await supabase.rpc("get_climate_aggregate", {
        p_survey_id: surveyId,
        p_org_unit_id: orgUnitId,
      });
      if (error) throw error;
      return data as ClimateAggregateResult;
    },
    { enabled: !!surveyId }
  );
}
```

**Key differences from analog:**
- Uses `supabase.rpc()` not `supabase.from()` — function call rather than table query.
- Returns sentinel object instead of throwing on insufficient data.

---

#### `useChangePassword.ts` (NEW)

**Analog:** `src/hooks/hiring/useCandidateConsents.ts` `useRevokeConsent` lines 76-117 (mutation + invalidate cascade)

**Pattern:**
```typescript
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useChangePassword() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation<void, Error, { newPassword: string }>({
    mutationFn: async ({ newPassword }) => {
      // 1. Update auth password
      const { error: authError } = await supabase.auth.updateUser({ password: newPassword });
      if (authError) throw authError;
      // 2. Flip flag (Pitfall §9 — both must succeed)
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ must_change_password: false, temp_password_expires_at: null })
        .eq("id", user!.id);
      if (profileError) throw profileError;
    },
    onSuccess: async () => {
      // Invalidate profile cache so ProtectedRoute reads fresh flag (Pitfall §9)
      await queryClient.invalidateQueries({ queryKey: ["profile", user!.id] });
      toast.success("Senha trocada com sucesso");
    },
    onError: (err) => toast.error("Erro ao trocar senha", { description: err.message }),
  });
}
```

**Key differences from analog:**
- Two-step (auth + profile) — analog was single-step (UPDATE).
- Pitfall §9 explicitly mitigated: invalidate after both succeed.

---

### COMPONENTS

#### `EvaluationForm.tsx` (REFACTOR — orchestrator <300 lines)

**Analog (self):** `src/components/EvaluationForm.tsx` lines 1-93 (preserve), drop competency-specific logic

**Current imports** (lines 1-14 — preserve):
```typescript
import { useMemo, useState } from "react";
import { useEvaluations, EvaluationInput } from "@/hooks/useEvaluations";
import { Btn, Chip, Col, Kbd, ProgressBar, Row } from "@/components/primitives/LinearKit";
import { Icon } from "@/components/primitives/Icon";
import { cn } from "@/lib/utils";
```

**New imports** (add):
```typescript
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { buildZodFromTemplate, type TemplateSnapshot } from "@/lib/evaluationTemplate";
import { EvaluationFormSection } from "./EvaluationFormSection";
import { useEvaluationCycle } from "@/hooks/useEvaluationCycles";
```

**Dynamic Zod resolver pattern** (RESEARCH §Pattern 3, lines 552-572):
```typescript
const cycle = useEvaluationCycle(cycleId);
const responsesSchema = useMemo(
  () => buildZodFromTemplate(cycle.data!.template_snapshot as TemplateSnapshot),
  [cycle.data?.template_snapshot]
);
const formSchema = z.object({
  cycle_id: z.string().uuid(),
  evaluated_user_id: z.string().uuid(),
  direction: z.enum(['leader_to_member', 'member_to_leader']),
  responses: responsesSchema,
});
type FormValues = z.infer<typeof formSchema>;

const form = useForm<FormValues>({
  resolver: zodResolver(formSchema),
  defaultValues: { cycle_id: cycleId, evaluated_user_id: '', direction: 'leader_to_member', responses: {} },
});
```

**Iterate sections, delegate to child** (replace lines 39-85 of current):
```typescript
{cycle.data?.template_snapshot.sections.map((section) => (
  <EvaluationFormSection
    key={section.id}
    section={section}
    form={form}
  />
))}
```

**Key differences from current:**
- Current hardcodes 5 competencies (lines 39-75); rewrite reads from `cycle.template_snapshot.sections`.
- Current maps to 4 fixed score columns (overall/technical/behavioral/leadership); rewrite stores in `responses` JSONB keyed by questionId.
- Adds `useForm` + `zodResolver` (current uses raw useState).

---

#### `OneOnOneMeetingForm.tsx` (REFACTOR — orchestrator <300 lines)

**Analog (self):** `src/components/OneOnOneMeetingForm.tsx` lines 1-110 (preserve imports + interface)

**Preserve imports** (lines 1-29 — keep):
```typescript
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQueryClient } from "@tanstack/react-query";
import { OneOnOne } from "@/hooks/useOneOnOnes";
import { PDIFormIntegrated } from "./PDIFormIntegrated";
import { Btn, Chip, Col, Kbd, LinearAvatar, MiniStat, Row, SectionHeader } from "@/components/primitives/LinearKit";
import { Icon } from "@/components/primitives/Icon";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
```

**New imports** (add for split):
```typescript
import { OneOnOneAgenda } from "./OneOnOneAgenda";
import { OneOnOneNotes } from "./OneOnOneNotes";
import { OneOnOneActionItems } from "./OneOnOneActionItems";
import { OneOnOnePDIPanel } from "./OneOnOnePDIPanel";
import { OneOnOneRHNote } from "./OneOnOneRHNote";
import { OneOnOneRHVisibleBadge } from "./OneOnOneRHVisibleBadge";
import { useMeetingTimer } from "@/hooks/useMeetingTimer";
import { useAgendaState } from "@/hooks/useAgendaState";
import { useActionItemsState } from "@/hooks/useActionItemsState";
import { useAbility } from "@casl/react";
```

**Section ordering per UI-SPEC** (replace inline render with sub-components — lines 100+ of current):
```typescript
return (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-6xl">
      <DialogHeader className="sticky top-0 bg-surface flex items-center justify-between">
        <DialogTitle>1:1 com {oneOnOne.collaborator?.full_name}</DialogTitle>
        <Row gap={8}>
          <OneOnOneRHVisibleBadge />
          <Chip color={statusColor}>{statusLabel}</Chip>
          <Btn variant="primary" onClick={handleSave}>Salvar 1:1</Btn>
        </Row>
      </DialogHeader>

      <div className="grid lg:grid-cols-2 gap-6 mt-8">
        <OneOnOneAgenda items={agenda.items} onUpdate={agenda.setItems} />
        <OneOnOneNotes value={notes} onChange={setNotes} />
        <OneOnOneActionItems items={actionItems.items} onUpdate={actionItems.setItems} />
        <OneOnOnePDIPanel oneOnOne={oneOnOne} />
        {(role === 'admin' || role === 'rh') && (
          <OneOnOneRHNote meetingId={oneOnOne.id} />
        )}
      </div>
    </DialogContent>
  </Dialog>
);
```

**Key differences from current:**
- Current is 909 lines monolith with inline agenda/notes/items rendering; rewrite delegates to 4 sub-components.
- Current uses local refs/states (lines 89-105); rewrite extracts to `useMeetingTimer`, `useAgendaState`, `useActionItemsState`, `usePlaudInput`.
- Adds `OneOnOneRHNote` conditional render (RH only — Pitfall §11 from RESEARCH about defense-in-depth via DOM omission).

---

#### `OnboardingMessageBlock.tsx` (NEW)

**Analog:** UI-SPEC §"WhatsApp onboarding message (D-20 — exact template)" + Step 2 spec

**Pattern (NEW — locked template + clipboard API):**
```typescript
import { useState } from "react";
import { Btn, Col } from "@/components/primitives/LinearKit";
import { toast } from "sonner";

interface Props {
  fullName: string;
  email: string;
  tempPassword: string; // local-only — NOT persisted (Pitfall §12)
  rhName: string;
  onClose: () => void;
}

export function OnboardingMessageBlock({ fullName, email, tempPassword, rhName, onClose }: Props) {
  const [copied, setCopied] = useState(false);
  const message =
`Oi ${fullName}! Bem-vindo à Lever.
Acesse: https://app.levertalents.com/login
Login: ${email}
Senha temporária: ${tempPassword}
Expira em 24h.

Qualquer dúvida, fala comigo!
— ${rhName}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message);
    setCopied(true);
    toast.success("Mensagem copiada");
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <Col gap={16} className="surface-paper p-3.5 max-w-md">
      <div>
        <div className="text-display-sm font-semibold">Pessoa cadastrada</div>
        <div className="text-[13px] text-text-muted mt-1">
          Copie a mensagem abaixo e envie pelo seu WhatsApp para {fullName}.
        </div>
      </div>
      <pre className="bg-bg-subtle border border-border p-3 font-mono text-[13px] whitespace-pre-wrap rounded-md">
        {message}
      </pre>
      <Row gap={12}>
        <Btn variant="primary" onClick={handleCopy} className="flex-1">
          {copied ? "Copiado ✓" : "Copiar mensagem"}
        </Btn>
        <Btn variant="ghost" onClick={onClose}>Concluir cadastro</Btn>
      </Row>
    </Col>
  );
}
```

**Key differences from any analog:**
- No analog in repo for clipboard pattern. Copy from UI-SPEC §Step 2 verbatim.
- Component receives `tempPassword` as prop (Pitfall §12: local state, never persisted; component lifetime = modal lifetime).

---

#### `FirstLoginChangePasswordCard.tsx` (NEW)

**Analog:** `src/pages/CreateUser.tsx` lines 47-126 (RHF + Zod + form pattern)

**Pattern:**
```typescript
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Btn, Col } from "@/components/primitives/LinearKit";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LeverArrow } from "@/components/primitives/LeverArrow";
import { useChangePassword } from "@/hooks/useChangePassword";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useNavigate } from "react-router-dom";

const schema = z.object({
  newPassword: z.string().min(8, "A senha precisa ter no mínimo 8 caracteres"),
  confirmPassword: z.string(),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: "As senhas digitadas são diferentes.",
  path: ["confirmPassword"],
});

type FormValues = z.infer<typeof schema>;

export function FirstLoginChangePasswordCard() {
  const { profile } = useUserProfile();
  const { mutate, isPending } = useChangePassword();
  const navigate = useNavigate();
  const isExpired = profile?.temp_password_expires_at
    ? new Date(profile.temp_password_expires_at) < new Date()
    : false;

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = (values: FormValues) => {
    mutate({ newPassword: values.newPassword }, {
      onSuccess: () => navigate("/", { replace: true }),
    });
  };

  return (
    <Col gap={16} className="max-w-md mx-auto mt-12 surface-raised p-6">
      <LeverArrow size={48} />
      <h1 className="text-display-md font-semibold">Crie sua nova senha</h1>
      <p className="text-[13px] text-text-muted">
        Esta é sua primeira entrada. Defina uma senha pessoal antes de continuar.
      </p>
      {isExpired && (
        <div className="bg-status-amber-soft text-status-amber p-3 rounded-md text-[13px]">
          Sua senha temporária venceu. Por segurança, troque agora antes de continuar.
        </div>
      )}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Label htmlFor="newPassword">Nova senha</Label>
          <Input id="newPassword" type="password" {...register("newPassword")} />
          {errors.newPassword && <p className="text-status-red text-[12px]">{errors.newPassword.message}</p>}
        </div>
        <div>
          <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
          <Input id="confirmPassword" type="password" {...register("confirmPassword")} />
          {errors.confirmPassword && <p className="text-status-red text-[12px]">{errors.confirmPassword.message}</p>}
        </div>
        <Btn variant="primary" type="submit" disabled={isPending} className="w-full">
          {isPending ? "Trocando…" : "Trocar senha"}
        </Btn>
      </form>
    </Col>
  );
}
```

**Key differences from analog:**
- CreateUser.tsx had Sidebar + page chrome; this is a centered card with NO chrome (UI-SPEC §"First-login screen heading").
- Uses `LeverArrow` brand primitive (NEVER lucide ArrowX — `feedback_brand_fidelity.md` lock).
- Adds expired-banner conditional (D-24).

---

### PAGES

#### `CreateUser.tsx` (REWRITE — rename to /cadastrar-pessoa per UI-SPEC)

**Analog (self):** `src/pages/CreateUser.tsx` lines 1-321

**Preserve form structure** (lines 22-72 — keep imports, schema base, useTeams):
```typescript
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Btn, Row } from "@/components/primitives/LinearKit";
```

**Schema changes — drop `password` field, drop legacy `teamId`/`leaderId`:**
```typescript
const createUserSchema = z.object({
  fullName: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  email: z.string().email("Email inválido"),
  // password REMOVED — generated server-side by Edge Function (D-20)
  role: z.enum(["admin", "socio", "lider", "rh", "colaborador", "liderado"]),
  companyId: z.string().uuid(),
  orgUnitId: z.string().uuid().optional(),
  // teamId/leaderId REMOVED — Phase 1 model uses org_units
});
```

**Replace `supabase.functions.invoke('create-user', ...)` with new function** (lines 84-95 of current):
```typescript
const { data: result, error } = await supabase.functions.invoke("create-user-with-temp-password", {
  body: {
    fullName: data.fullName,
    email: data.email,
    role: data.role,
    companyId: data.companyId,
    orgUnitId: data.orgUnitId ?? null,
  },
});
if (error) throw error;
// Open modal with OnboardingMessageBlock — pass tempPassword from result
setShowOnboardingModal({ ...result, fullName: data.fullName, rhName: currentUser.full_name });
```

**Post-success modal (NEW — UI-SPEC §"Step 2"):**
```typescript
{showOnboardingModal && (
  <Dialog open onOpenChange={() => setShowOnboardingModal(null)}>
    <DialogContent>
      <OnboardingMessageBlock {...showOnboardingModal} onClose={() => navigate("/pessoas")} />
    </DialogContent>
  </Dialog>
)}
```

**Key differences from current:**
- No `password` Input field.
- Uses Edge Function `create-user-with-temp-password` (not legacy `create-user`).
- Replaces `useTeams` (legacy) with company + org_unit selectors using `visible_companies`-scoped query.
- Post-success: shows OnboardingMessageBlock instead of `navigate('/admin')`.
- Title changes "Criar usuário" → "Cadastrar pessoa" (UI-SPEC).
- Btn label changes "Salvar" → "Cadastrar e gerar mensagem" (UI-SPEC).

---

#### `Evaluations.tsx` (REFACTOR)

**Analog (self):** `src/pages/Evaluations.tsx` (preserve page chrome; rewrite list rendering)

**Pattern shift:**
- Current renders flat list of evaluations.
- Rewrite renders **list of cycles** (CycleCard grid); click on cycle drills into evaluations.

**Read `useEvaluationCycles` (NEW hook) — replaces direct evaluations query.**

**UI-SPEC §"Avaliações" focal point:** "CycleCard grid + accent **Criar ciclo** button (top-right of page header). Selected card uses `--accent-soft` left-border."

**Key differences from current:**
- Two-level navigation: page = cycles list; click → drawer/page = evaluations within cycle.
- New "Criar ciclo" button (uses `CreateCycleDialog`).
- Empty state: "Nenhum ciclo de avaliação aberto" (UI-SPEC §Empty states).

---

#### `Climate.tsx` (REFACTOR)

**Analog (self):** `src/pages/Climate.tsx` — preserve dispatch + form dialogs; rewrite aggregation rendering

**Pattern shift:**
- Replace direct `climate_responses` query with `useClimateAggregate` (RPC k-anon-aware).
- ClimateAggregateCard renders empty-state when `insufficient_data: true`.

**UI-SPEC §"Climate" lock copy:**
- Banner: "Esta pesquisa é 100% anônima."
- Empty state: "Dados insuficientes para garantir anonimato" / "Aguarde no mínimo 3 respostas para esta unidade. Esta pesquisa é 100% anônima."

**Key differences from current:**
- Drops `user_id` references entirely (D-09 + D-11).
- Uses `submit_climate_response` RPC (no `user_id` in payload).
- Renders ClimateAggregateCard with k-anon empty state.

---

#### `OneOnOnes.tsx` (REFACTOR)

**Analog (self):** `src/pages/OneOnOnes.tsx`

**Add toggle "Lista geral / Por par" pattern** (UI-SPEC §"Toggle Lista geral / Por par"):
```typescript
import { OneOnOnesViewToggle } from "@/components/OneOnOnesViewToggle";

const [view, setView] = useState<'lista-geral' | 'por-par'>(() => {
  // Pattern Phase 2 cardCustomization.ts — Zod safeParse on load (Pitfall §10)
  const stored = localStorage.getItem('leverup:perf:one-on-ones-view');
  return stored === 'por-par' ? 'por-par' : 'lista-geral';
});

useEffect(() => {
  localStorage.setItem('leverup:perf:one-on-ones-view', view);
}, [view]);
```

**Conditional render based on role (CASL):**
```typescript
const ability = useAbility(AbilityContext);
const canSeeToggle = ability.can('manage', 'OneOnOne');
{canSeeToggle && <OneOnOnesViewToggle value={view} onChange={setView} />}
```

**Key differences from current:**
- Adds RH-only toggle (UI-SPEC §"Toggle visible only for roles admin and rh").
- Persists preference to localStorage.

---

### UTILITIES

#### `evaluationTemplate.ts` (NEW)

**Analog:** RESEARCH §Pattern 3 — copy entire code block (lines 478-549) verbatim.

Full code in RESEARCH.md is the literal contract. No analog needed — the TS code is **the pattern**.

#### `passwordGenerator.ts` (NEW)

**Analog:** RESEARCH §Pattern 4 lines 595-604 (Edge Function version) — mirror in TS for vitest unit testability:

```typescript
// src/lib/passwordGenerator.ts
const ALPHABET = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 56 chars

export function generateTempPassword(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  let out = '';
  for (let i = 0; i < 8; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return out;
}

export function isValidTempPassword(pw: string): boolean {
  if (pw.length !== 8) return false;
  const forbidden = /[0O1lI]/;
  return !forbidden.test(pw) && /^[a-zA-Z0-9]+$/.test(pw);
}
```

**Key insight:** Edge Function (Deno) and lib (browser/Vitest) share Web Crypto API — same code path.

#### `climateAggregation.ts` (NEW)

**Analog:** RPC `get_climate_aggregate` (RESEARCH §Pattern 2) — TS mirror for unit tests:

```typescript
// src/lib/climateAggregation.ts
export interface AggregateInput {
  scores: number[];
}
export type AggregateResult =
  | { count: number; avg: number; distribution: Record<string, number> }
  | { insufficient_data: true };

export function computeAggregate(input: AggregateInput): AggregateResult {
  const count = input.scores.length;
  if (count < 3) return { insufficient_data: true };
  const avg = input.scores.reduce((s, n) => s + n, 0) / count;
  const distribution: Record<string, number> = {};
  for (const s of input.scores) {
    distribution[String(s)] = (distribution[String(s)] ?? 0) + 1;
  }
  return { count, avg, distribution };
}
```

**Key insight:** Used ONLY in unit tests; RPC is the source of truth in production. Mirror exists to assert k-anon logic without DB.

---

## Shared Patterns

### Pattern S1: Scoped Query (apply to all 17 hooks)

**Source:** `src/shared/data/useScopedQuery.ts` (lines 26-48) + `src/hooks/hiring/useApplications.ts` lines 40-57

**Apply to:** Every hook that reads/writes Performance data (15 rewrites + 2 new + 1 RPC hook).

**Concrete excerpt:**
```typescript
import { useScopedQuery } from "@/shared/data/useScopedQuery";

return useScopedQuery<TData[], Error>(
  ["entity-name", filterArg ?? "none"],
  async (companyIds): Promise<TData[]> => {
    const { data, error } = await supabase
      .from("table_name")
      .select("...")
      .in("company_id", companyIds)
      .eq("filter_field", filterArg);
    if (error) throw error;
    return (data ?? []) as TData[];
  },
  { enabled: !!filterArg }
);
```

**queryKey shape lock:** `["scope", scope.id, scope.kind, "domain", "entity", ...filters]` (Pitfall §11 — never miss `cycleId` in evaluations).

---

### Pattern S2: Optimistic Mutation with Rollback (apply to PERF-07 + ONE-* mutations)

**Source:** `src/hooks/hiring/useApplications.ts` `useMoveApplicationStage` lines 109-216

**Apply to:** `useSaveEvaluation`, `useUpdateOneOnOne`, `useMoveActionItem`, any mutation tied to a list view.

**Concrete excerpt** (lines 146-208 — copy structure):
```typescript
return useMutation<TResult, MyError, MyArgs, MyContext>({
  mutationFn: async (args) => { /* ... */ },
  onMutate: async (args) => {
    const queryKey = ["scope", scope?.id, scope?.kind, "domain", args.id];
    await queryClient.cancelQueries({ queryKey });
    const previous = queryClient.getQueryData(queryKey);
    queryClient.setQueryData(queryKey, /* optimistic */);
    return { previous, queryKey };
  },
  onError: (err, _args, context) => {
    if (context?.previous && context.queryKey) {
      queryClient.setQueryData(context.queryKey, context.previous);
    }
    sonnerToast.error(/* differentiated by error.kind */);
  },
  onSettled: async (_data, _err, _args, context) => {
    if (context?.queryKey) {
      await queryClient.invalidateQueries({ queryKey: context.queryKey });
    }
  },
});
```

---

### Pattern S3: RLS via visible_companies + role helper

**Source:** `supabase/migrations/20260427120200_c_socio_memberships_rls_rewrite_and_backfill.sql` lines 281-294

**Apply to:** Every new/modified RLS policy in perf1, clim1, one1.

**Concrete excerpt** (line 287):
```sql
CREATE POLICY "table:select"
  ON public.table FOR SELECT TO authenticated
  USING (
    company_id = ANY(public.visible_companies((SELECT auth.uid())))
    AND (
      public.is_people_manager((SELECT auth.uid()))
      OR /* role-specific predicate, e.g. for líder use org_unit_descendants */
    )
  );
```

**`(SELECT auth.uid())` initPlan caching is mandatory** (RBAC-10 lock from Phase 1).

---

### Pattern S4: SECURITY DEFINER RPC

**Source:** `supabase/migrations/20260428120100_f2_data_access_log_table.sql` lines 51-103

**Apply to:** `get_climate_aggregate`, `submit_climate_response`, optional `create_evaluation_cycle`.

**Concrete excerpt** (lines 56-103):
```sql
CREATE OR REPLACE FUNCTION public.fn_name(...) RETURNS ...
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := (SELECT auth.uid());
  v_visible_companies uuid[];
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Nao autenticado' USING ERRCODE = '42501';
  END IF;
  v_visible_companies := public.visible_companies(v_actor);
  -- Re-apply RLS as the caller (SECURITY DEFINER bypasses without this)
  IF NOT (target_company_id = ANY(v_visible_companies)) THEN
    RAISE EXCEPTION 'Sem permissao' USING ERRCODE = '42501';
  END IF;
  -- ... business logic ...
END $$;

REVOKE ALL ON FUNCTION public.fn_name(...) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_name(...) TO authenticated;
```

---

### Pattern S5: Idempotent Migration (apply to ALL 9 migrations)

**Source:** Multiple — `c_socio_memberships` lines 34-44 (CREATE TABLE IF NOT EXISTS), `f2_data_access_log` lines 138-152 (cron idempotent), `f3_candidate_consents` lines 21-30 (enum DO/EXCEPTION).

**Concrete excerpts:**

```sql
-- Tables: IF NOT EXISTS guard
CREATE TABLE IF NOT EXISTS public.foo (...);
CREATE INDEX IF NOT EXISTS idx_foo_x ON public.foo (x);

-- Functions: OR REPLACE
CREATE OR REPLACE FUNCTION public.foo() RETURNS ...

-- Policies: DROP IF EXISTS + CREATE
DROP POLICY IF EXISTS "policy_name" ON public.foo;
CREATE POLICY "policy_name" ON public.foo ...

-- Triggers: DROP IF EXISTS + CREATE
DROP TRIGGER IF EXISTS tg_name ON public.foo;
CREATE TRIGGER tg_name BEFORE ... FOR EACH ROW EXECUTE FUNCTION ...

-- Cron: unschedule + reschedule guard
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'job_x') THEN
    PERFORM cron.unschedule('job_x');
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
SELECT cron.schedule('job_x', '...', $$ ... $$);

-- Enums: DO + EXCEPTION
DO $$ BEGIN
  CREATE TYPE public.my_enum AS ENUM ('a', 'b');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Backfill: ON CONFLICT DO NOTHING / ON CONFLICT DO UPDATE
INSERT INTO public.bar SELECT ... FROM public.baz
  WHERE NOT EXISTS (SELECT 1 FROM public.bar WHERE ...)
  ON CONFLICT (id) DO NOTHING;
```

---

### Pattern S6: Edge Function CORS + Service Role

**Source:** `supabase/functions/create-user/index.ts` lines 1-25 + `supabase/functions/apply-to-job/index.ts` lines 1-19

**Apply to:** `create-user-with-temp-password`.

**Concrete excerpt:**
```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
    // ...
    return new Response(JSON.stringify({ success: true, ... }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
```

---

### Pattern S7: Toast (Sonner) Conventions

**Source:** `src/hooks/hiring/useApplications.ts` lines 187-191 + `src/hooks/hiring/useCandidateConsents.ts` lines 112-116

**Apply to:** All Phase 3 mutations.

**Concrete excerpt:**
```typescript
import { toast as sonnerToast } from "sonner";

// success — 4s default
sonnerToast.success("Avaliação salva");

// error — 8s with description (UI-SPEC error states)
sonnerToast.error("Não foi possível salvar", {
  description: "Verifique a conexão e tente novamente. Suas respostas seguem aqui na tela.",
  duration: 8000,
});

// warning (Plaud paste short)
sonnerToast.warning("Texto curto demais", {
  description: "Confira se colou a transcrição inteira.",
});
```

UI-SPEC lock: top-right (Sonner default), 4s default, 8s for errors.

---

### Pattern S8: Form (RHF + Zod resolver, no `as any`)

**Source:** `src/pages/CreateUser.tsx` lines 47-126

**Apply to:** EvaluationForm, CreateCycleDialog, CreateUser rewrite, FirstLoginChangePasswordCard, OnboardingMessageBlock (no form), ClimateSurveyFormDialog, etc.

**Concrete excerpt** (lines 47-72 of analog):
```typescript
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const schema = z.object({
  field: z.string().min(3, "..."),
});
type FormValues = z.infer<typeof schema>;

const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormValues>({
  resolver: zodResolver(schema),
});
```

**Lock:** Zod 3.25 (DO NOT upgrade); zero `as any` casts (CLAUDE.md project lock).

---

### Pattern S9: localStorage Persist with Zod Validation

**Source:** RESEARCH §Pitfall 10 reference + Phase 2 `cardCustomization.ts` (Plan 02-03)

**Apply to:** `OneOnOnesViewToggle` (`leverup:perf:one-on-ones-view`).

**Concrete excerpt:**
```typescript
import { z } from "zod";

const ViewSchema = z.enum(['lista-geral', 'por-par']);
const STORAGE_KEY = 'leverup:perf:one-on-ones-view';

function readView(): 'lista-geral' | 'por-par' {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = ViewSchema.safeParse(raw);
    return parsed.success ? parsed.data : 'lista-geral';
  } catch {
    return 'lista-geral';
  }
}

function writeView(v: 'lista-geral' | 'por-par') {
  localStorage.setItem(STORAGE_KEY, v);
}
```

---

## No Analog Found

Files with no close codebase match. Planner uses RESEARCH.md patterns directly.

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `src/components/OnboardingMessageBlock.tsx` | display + clipboard | event-driven | No clipboard API usage in codebase. UI-SPEC §"WhatsApp onboarding" template is the contract. |
| `src/components/ClimateAggregateCard.tsx` | k-anon aware card | request-response | First k-anon UI in codebase. UI-SPEC §"k-anonymity rendering" is the contract. |
| `src/lib/evaluationTemplate.ts` | dynamic Zod builder | transform | First dynamic schema-from-JSON pattern. RESEARCH §Pattern 3 is the literal code. |
| `src/lib/climateAggregation.ts` | k-anon helper for tests | transform | TS mirror of the SQL RPC; no app analog. RESEARCH §Pattern 2 is the logic source. |
| `src/components/__tests__/OneOnOneNotes.test.tsx` (and 5 other RTL test files) | RTL test | event-driven | Repo has zero existing RTL tests for Performance. Wave 0 establishes the testing pattern. RESEARCH §Validation Architecture is the gate. |

**Total no-analog: 11 files.** Planner inherits from RESEARCH.md `Code Examples` + UI-SPEC.md sections cited above.

---

## Metadata

**Analog search scope:** `src/hooks/`, `src/hooks/hiring/`, `src/components/`, `src/pages/`, `src/lib/`, `src/shared/data/`, `supabase/migrations/`, `supabase/functions/`, `.planning/phases/03-performance-refactor/03-RESEARCH.md`, `.planning/phases/03-performance-refactor/03-UI-SPEC.md`.

**Files scanned:** 33 source files + 5 migrations + 2 Edge Functions + 3 planning docs = 43 reads.

**Pattern extraction date:** 2026-04-28.

**Critical file count breakdown:**
- 9 migrations (Wave 1: 3, Wave 2: 6, Wave 4: 1 cron)
- 1 Edge Function
- ~17 hooks (15 rewrites + 4 new — `useEvaluationCycles`, `useEvaluationTemplates`, `useClimateAggregate`, `useCreateUserWithTempPassword`, `useChangePassword`; +4 extracted custom hooks for OneOnOne split)
- 14 components (6 refactor + 8 new + 1 ProtectedRoute extension)
- 5 pages (3 refactor + 1 rewrite + 1 new)
- 4 utilities
- 18 test files (Wave 0)

**Total: ~68 files** (matches planner expectation).

---

## PATTERN MAPPING COMPLETE

**Phase:** 3 — Performance Refactor
**Files classified:** 68
**Analogs found:** 64 / 68 (94% coverage)

### Coverage
- Files with exact analog: 28 (migrations + hooks + Edge Function + form pages)
- Files with role-match analog: 36 (light refactors, sub-components, utility libs)
- Files with no analog: 11 (clipboard UI, k-anon UI, dynamic Zod builder, k-anon test helper, 6 RTL test stubs)

### Key Patterns Identified
- **Migration shape:** all 9 migrations follow expand→backfill→contract from Phase 1+2 (Migration C, F.2, F.3, F.4); idempotent guards mandatory (S5).
- **Hook shape:** 100% via `useScopedQuery` chokepoint (Phase 1); queryKey shape `["scope", id, kind, domain, entity, ...filters]` (Pitfall §11); optimistic mutations follow `useMoveApplicationStage` (S2).
- **RLS shape:** `visible_companies()` + `is_people_manager()` + `(SELECT auth.uid())` initPlan everywhere (S3); SECURITY DEFINER RPCs re-apply RLS as caller before returning (S4).
- **Edge Function shape:** CORS + service-role admin client + caller-auth verification (S6); `auth.admin.createUser` precedente em Phase 1 `create-user`.
- **Form shape:** RHF + Zod resolver + zero `as any` (S8); EvaluationForm uses dynamic resolver from `template_snapshot` (RESEARCH §Pattern 3).
- **Snapshot freeze:** BEFORE INSERT trigger pattern (Pattern 1) — defesa-em-profundidade vs RPC-only.
- **Toast:** Sonner top-right, 4s/8s (S7); copy locked in UI-SPEC §"Error states".
- **localStorage:** Zod safeParse on read (S9; Pitfall §10).
- **Component split:** orchestrator <300 + sub-components <250; ProtectedRoute extends with `must_change_password` redirect (RESEARCH §Pattern 5).

### Known Gaps for Planner
- **A1/A2 Open Questions** (k-anon granularity + transparency) — planner should escalate to owner inline OR commit Claude default and flag.
- **A3 Open Question** (rh_notes table vs column) — recommended **separate table** (Pitfall §5); planner needs explicit owner sign-off OR commit + announce.
- **A11** (sócio excluded from rh_notes RLS) — confirmed in CONTEXT D-17; planner enforces.
- **Owner inputs files** for E1+E3 are blocking pre-conditions; planner makes them explicit in Wave 1 plan.

### File Created
`/Users/eryk/Documents/APP LEVER TALETS/leverup-talent-hub/.planning/phases/03-performance-refactor/03-PATTERNS.md`

### Ready for Planning
Pattern mapping complete. Planner can now reference analog file paths and concrete code excerpts when writing `<read_first>` blocks (e.g. "read `src/hooks/hiring/useApplications.ts:40-216` for scoped+optimistic pattern") and `<action>` blocks (e.g. "follow Migration C lines 530-542 for teams→org_units backfill").
