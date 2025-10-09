-- Update RLS policy to allow RH and Socio to create 1:1s with anyone
DROP POLICY IF EXISTS "Leaders can create 1:1s for their team" ON one_on_ones;

CREATE POLICY "Leaders can create 1:1s for their team" 
ON one_on_ones 
FOR INSERT 
WITH CHECK (
  (has_role(auth.uid(), 'lider'::app_role) AND auth.uid() = leader_id AND EXISTS (
    SELECT 1 FROM team_members tm 
    WHERE tm.user_id = one_on_ones.collaborator_id AND tm.leader_id = auth.uid()
  ))
  OR
  (has_role(auth.uid(), 'rh'::app_role) OR has_role(auth.uid(), 'socio'::app_role))
);