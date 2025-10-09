-- Permitir exclusão de 1:1s para líderes, RH e Sócios
CREATE POLICY "Leaders, RH and Socio can delete 1:1s"
ON public.one_on_ones
FOR DELETE
TO authenticated
USING (
  (has_role(auth.uid(), 'lider'::app_role) AND leader_id = auth.uid())
  OR has_role(auth.uid(), 'rh'::app_role)
  OR has_role(auth.uid(), 'socio'::app_role)
);

-- Permitir exclusão de PDIs para líderes, RH e Sócios
CREATE POLICY "Leaders, RH and Socio can delete PDIs"
ON public.development_plans
FOR DELETE
TO authenticated
USING (
  (has_role(auth.uid(), 'lider'::app_role) AND EXISTS (
    SELECT 1 FROM team_members tm
    WHERE tm.user_id = development_plans.user_id
    AND tm.leader_id = auth.uid()
  ))
  OR has_role(auth.uid(), 'rh'::app_role)
  OR has_role(auth.uid(), 'socio'::app_role)
);

-- Permitir exclusão de avaliações para líderes, RH e Sócios
CREATE POLICY "Leaders, RH and Socio can delete evaluations"
ON public.evaluations
FOR DELETE
TO authenticated
USING (
  auth.uid() = evaluator_user_id
  OR has_role(auth.uid(), 'rh'::app_role)
  OR has_role(auth.uid(), 'socio'::app_role)
);

-- Permitir exclusão de action items para líderes, RH e Sócios
CREATE POLICY "Leaders, RH and Socio can delete action items"
ON public.one_on_one_action_items
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM one_on_ones o
    WHERE o.id = one_on_one_action_items.one_on_one_id
    AND o.leader_id = auth.uid()
  )
  OR has_role(auth.uid(), 'rh'::app_role)
  OR has_role(auth.uid(), 'socio'::app_role)
);