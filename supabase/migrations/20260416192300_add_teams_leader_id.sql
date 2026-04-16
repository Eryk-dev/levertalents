-- T10: leader como propriedade direta do time.
--
-- Antes: "líder do time" era derivado olhando team_members.leader_id do
-- primeiro membro. Se o time não tinha membros, não havia onde escrever —
-- assignLeaderToTeam fazia UPDATE ... WHERE team_id = X que afetava 0 rows
-- e o líder "atribuído" sumia no próximo refresh.
--
-- Agora teams.leader_id guarda o líder do time diretamente. team_members.leader_id
-- continua existindo (útil para a RLS do team_members e para quando o líder
-- individual de um membro for diferente do líder do time).

ALTER TABLE public.teams
ADD COLUMN IF NOT EXISTS leader_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Backfill: se um time já tinha um líder via team_members, copia para teams.leader_id.
-- Pega o primeiro leader_id não-nulo que aparecer (convenção atual).
UPDATE public.teams t
SET leader_id = (
  SELECT tm.leader_id
  FROM public.team_members tm
  WHERE tm.team_id = t.id
    AND tm.leader_id IS NOT NULL
  LIMIT 1
)
WHERE t.leader_id IS NULL;

-- Atualiza a RLS de SELECT para também reconhecer teams.leader_id — assim um
-- líder enxerga time vazio (sem team_members ainda) do qual já foi nomeado.
DROP POLICY IF EXISTS "Leaders can view their teams" ON public.teams;
DROP POLICY IF EXISTS "Admin, Socio and RH can view all teams" ON public.teams;

CREATE POLICY "Admin, Socio and RH can view all teams"
ON public.teams FOR SELECT
USING (
  has_role(auth.uid(), 'admin') OR
  has_role(auth.uid(), 'socio') OR
  has_role(auth.uid(), 'rh') OR
  (has_role(auth.uid(), 'lider') AND (
    teams.leader_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.team_id = teams.id
        AND team_members.leader_id = auth.uid()
    )
  ))
);
