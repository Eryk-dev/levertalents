-- Allow RH to manage teams
CREATE POLICY "RH can manage teams"
ON public.teams
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'rh'::app_role))
WITH CHECK (has_role(auth.uid(), 'rh'::app_role));

-- Allow RH to manage team members
CREATE POLICY "RH can manage team members"
ON public.team_members
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'rh'::app_role))
WITH CHECK (has_role(auth.uid(), 'rh'::app_role));

-- Allow RH to view all team members (including cost for RH)
CREATE POLICY "RH can view all team members"
ON public.team_members
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'rh'::app_role));