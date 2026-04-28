-- =========================================================================
-- Migration ONE.1: one_on_one_rh_notes (separate table) + RLS admin/rh-only
--                  + RLS rewrite for one_on_ones
--
-- Decision: Pitfall §5 / Open Question §3 / Assumption A3 — separate TABLE chosen
--           over column with policy. Reason: clean LGPD audit trail; defense-in-depth.
--           (D-17 refers to rh_notes; plan artifact resolves: separate table, not column)
--
-- Threats: T-3-01 (HIGH) liderado vê rh_notes via SELECT * — MITIGATED by separate table + RLS
-- REQs: ONE-03 (RH visível), D-17 (rh_notes admin/rh only)
-- Reversibility: DROP TABLE one_on_one_rh_notes (data loss for RH internal notes)
-- DEPENDENCIES: e1, pre3 (one_on_ones.company_id NOT NULL)
-- =========================================================================

-- Step 1 — Separate table for RH internal notes
CREATE TABLE IF NOT EXISTS public.one_on_one_rh_notes (
  meeting_id  UUID PRIMARY KEY REFERENCES public.one_on_ones(id) ON DELETE CASCADE,
  notes       TEXT NULL,
  updated_by  UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_one_on_one_rh_notes_updated_at ON public.one_on_one_rh_notes(updated_at);

-- Step 2 — RLS: only admin/rh can read/write (ONE-03 + D-17)
ALTER TABLE public.one_on_one_rh_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS one_on_one_rh_notes_admin_rh_all ON public.one_on_one_rh_notes;
CREATE POLICY one_on_one_rh_notes_admin_rh_all
  ON public.one_on_one_rh_notes FOR ALL
  USING (
    public.is_people_manager((SELECT auth.uid()))
    AND EXISTS (
      SELECT 1 FROM public.one_on_ones o
       WHERE o.id = meeting_id
         AND o.company_id = ANY(public.visible_companies((SELECT auth.uid())))
    )
  )
  WITH CHECK (
    public.is_people_manager((SELECT auth.uid()))
    AND EXISTS (
      SELECT 1 FROM public.one_on_ones o
       WHERE o.id = meeting_id
         AND o.company_id = ANY(public.visible_companies((SELECT auth.uid())))
    )
  );

-- Step 3 — RLS rewrite for one_on_ones (re-establish per D-17 + Phase 1 scope)
--           company_id is now NOT NULL (per PRE.3 migration)
ALTER TABLE public.one_on_ones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS one_on_ones_select_pair ON public.one_on_ones;
DROP POLICY IF EXISTS one_on_ones_select_visible ON public.one_on_ones;
DROP POLICY IF EXISTS one_on_ones_write_pair ON public.one_on_ones;
DROP POLICY IF EXISTS one_on_ones_write_self ON public.one_on_ones;
DROP POLICY IF EXISTS one_on_ones_select_legacy ON public.one_on_ones;

-- SELECT: RH (people_manager) sees all in company; leader and collaborator see their own pair
CREATE POLICY one_on_ones_select_visible
  ON public.one_on_ones FOR SELECT
  USING (
    company_id = ANY(public.visible_companies((SELECT auth.uid())))
    AND (
      public.is_people_manager((SELECT auth.uid()))
      OR leader_id = (SELECT auth.uid())
      OR collaborator_id = (SELECT auth.uid())
    )
  );

-- ALL (INSERT/UPDATE/DELETE): scoped to pair members + RH/admin
CREATE POLICY one_on_ones_write_pair
  ON public.one_on_ones FOR ALL
  USING (
    company_id = ANY(public.visible_companies((SELECT auth.uid())))
    AND (
      public.is_people_manager((SELECT auth.uid()))
      OR leader_id = (SELECT auth.uid())
      OR collaborator_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    company_id = ANY(public.visible_companies((SELECT auth.uid())))
    AND (
      public.is_people_manager((SELECT auth.uid()))
      OR leader_id = (SELECT auth.uid())
      OR collaborator_id = (SELECT auth.uid())
    )
  );

COMMENT ON TABLE public.one_on_one_rh_notes
  IS 'D-17: notas internas do RH; invisível para líder e liderado; visibilidade admin/rh apenas. Defense-in-depth via separate table (Pitfall §5 A3)';
COMMENT ON COLUMN public.one_on_ones.meeting_structure
  IS 'JSONB extended in Phase 3: keys agenda_items, action_items, transcricao_plaud (D-12/D-14), resumo_plaud (D-12/D-14)';
