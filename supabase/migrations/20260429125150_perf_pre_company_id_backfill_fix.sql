-- =========================================================================
-- Migration PRE.2-FIX: Corrective re-backfill with deterministic ROW_NUMBER
--
-- Reason: PRE.2 (20260429125100) omitted ROW_NUMBER/LIMIT 1. For users with
--         memberships in multiple org_units, PostgreSQL picked an arbitrary row,
--         potentially assigning the wrong company_id (CR-02 code review finding).
--
-- Safe to re-run: UPDATE ... WHERE company_id IS NOT NULL only touches rows that
--                 already have a value — replaces with the deterministic winner.
--                 evaluations were TRUNCATED in perf2, so only one_on_ones and
--                 climate_surveys need re-correction.
-- Reversibility: PITR; or re-run PRE.2 original (NULL out + re-backfill).
-- DEPENDENCIES: PRE.2 already applied (company_id column exists + first pass done)
-- =========================================================================

-- Re-backfill one_on_ones.company_id via leader_id with deterministic ROW_NUMBER
UPDATE public.one_on_ones o
   SET company_id = sub.company_id
  FROM (
    SELECT oum.user_id,
           ou.company_id,
           ROW_NUMBER() OVER (PARTITION BY oum.user_id ORDER BY oum.created_at) AS rn
      FROM public.org_unit_members oum
      JOIN public.org_units ou ON ou.id = oum.org_unit_id
  ) sub
 WHERE o.leader_id = sub.user_id
   AND sub.rn = 1;

-- Fallback: collaborator_id where leader_id still has no membership
UPDATE public.one_on_ones o
   SET company_id = sub.company_id
  FROM (
    SELECT oum.user_id,
           ou.company_id,
           ROW_NUMBER() OVER (PARTITION BY oum.user_id ORDER BY oum.created_at) AS rn
      FROM public.org_unit_members oum
      JOIN public.org_units ou ON ou.id = oum.org_unit_id
  ) sub
 WHERE o.company_id IS NULL
   AND o.collaborator_id = sub.user_id
   AND sub.rn = 1;

-- Re-backfill climate_surveys.company_id via created_by with deterministic ROW_NUMBER
UPDATE public.climate_surveys cs
   SET company_id = sub.company_id
  FROM (
    SELECT oum.user_id,
           ou.company_id,
           ROW_NUMBER() OVER (PARTITION BY oum.user_id ORDER BY oum.created_at) AS rn
      FROM public.org_unit_members oum
      JOIN public.org_units ou ON ou.id = oum.org_unit_id
  ) sub
 WHERE cs.created_by = sub.user_id
   AND sub.rn = 1;
