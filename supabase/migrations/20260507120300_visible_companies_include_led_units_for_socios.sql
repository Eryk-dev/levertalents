-- Sócios can also be operational leaders. If a socio is assigned as the
-- leader of an org unit, include that company in their visible scope so
-- leader-directed workflows such as 9box can reach them.

CREATE OR REPLACE FUNCTION public.visible_companies(_uid uuid)
RETURNS uuid[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN public.has_role(_uid, 'admin'::public.app_role)
      OR public.has_role(_uid, 'rh'::public.app_role)
    THEN
      (SELECT COALESCE(array_agg(id), '{}'::uuid[]) FROM public.companies)

    WHEN public.has_role(_uid, 'socio'::public.app_role)
    THEN
      (
        SELECT COALESCE(array_agg(DISTINCT company_id), '{}'::uuid[])
        FROM (
          SELECT scm.company_id
          FROM public.socio_company_memberships scm
          WHERE scm.user_id = _uid

          UNION

          SELECT ou.company_id
          FROM public.unit_leaders ul
          JOIN public.org_units ou ON ou.id = ul.org_unit_id
          WHERE ul.user_id = _uid
        ) visible
      )

    WHEN public.has_role(_uid, 'lider'::public.app_role)
    THEN
      (SELECT COALESCE(array_agg(DISTINCT ou.company_id), '{}'::uuid[])
         FROM public.unit_leaders ul
         JOIN public.org_units ou ON ou.id = ul.org_unit_id
        WHERE ul.user_id = _uid)

    WHEN public.has_role(_uid, 'liderado'::public.app_role)
      OR public.has_role(_uid, 'colaborador'::public.app_role)
    THEN
      (SELECT COALESCE(array_agg(DISTINCT ou.company_id), '{}'::uuid[])
         FROM public.org_unit_members oum
         JOIN public.org_units ou ON ou.id = oum.org_unit_id
        WHERE oum.user_id = _uid)

    ELSE '{}'::uuid[]
  END;
$$;
