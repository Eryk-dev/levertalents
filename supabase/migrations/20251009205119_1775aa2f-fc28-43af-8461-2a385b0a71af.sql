-- Adicionar role 'admin' ao enum app_role se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE app_role AS ENUM ('admin', 'socio', 'rh', 'gestor', 'lider', 'colaborador');
  ELSE
    BEGIN
      ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'admin';
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

-- Atualizar políticas para companies (Admin e RH também podem gerenciar)
DROP POLICY IF EXISTS "Socio can manage companies" ON companies;
DROP POLICY IF EXISTS "Socio and RH can view all companies" ON companies;

CREATE POLICY "Admin, Socio and RH can view all companies" 
ON companies FOR SELECT 
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'socio') OR 
  has_role(auth.uid(), 'rh')
);

CREATE POLICY "Admin, Socio and RH can manage companies" 
ON companies FOR ALL 
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'socio') OR 
  has_role(auth.uid(), 'rh')
)
WITH CHECK (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'socio') OR 
  has_role(auth.uid(), 'rh')
);

-- Atualizar políticas para user_roles (Admin e RH também podem gerenciar)
DROP POLICY IF EXISTS "Socio can manage all roles" ON user_roles;
DROP POLICY IF EXISTS "Socio can view all roles" ON user_roles;

CREATE POLICY "Admin, Socio and RH can view all roles" 
ON user_roles FOR SELECT 
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'socio') OR 
  has_role(auth.uid(), 'rh')
);

CREATE POLICY "Admin, Socio and RH can manage all roles" 
ON user_roles FOR ALL 
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'socio') OR 
  has_role(auth.uid(), 'rh')
)
WITH CHECK (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'socio') OR 
  has_role(auth.uid(), 'rh')
);

-- Atualizar políticas para teams (Admin também pode gerenciar)
DROP POLICY IF EXISTS "RH can manage teams" ON teams;
DROP POLICY IF EXISTS "Socio can manage teams" ON teams;
DROP POLICY IF EXISTS "Socio and RH can view all teams" ON teams;

CREATE POLICY "Admin, Socio and RH can view all teams" 
ON teams FOR SELECT 
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'socio') OR 
  has_role(auth.uid(), 'rh') OR
  (has_role(auth.uid(), 'lider') AND EXISTS (
    SELECT 1 FROM team_members 
    WHERE team_members.team_id = teams.id 
    AND team_members.leader_id = auth.uid()
  ))
);

CREATE POLICY "Admin, Socio and RH can manage teams" 
ON teams FOR ALL 
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'socio') OR 
  has_role(auth.uid(), 'rh')
)
WITH CHECK (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'socio') OR 
  has_role(auth.uid(), 'rh')
);

-- Atualizar políticas para team_members (Admin também pode gerenciar)
DROP POLICY IF EXISTS "RH can manage team members" ON team_members;
DROP POLICY IF EXISTS "Socio can manage team members" ON team_members;
DROP POLICY IF EXISTS "RH can view all team members" ON team_members;
DROP POLICY IF EXISTS "Socio can view all team members with cost" ON team_members;
DROP POLICY IF EXISTS "RH can view team members without cost" ON team_members;

CREATE POLICY "Admin, Socio and RH can view all team members" 
ON team_members FOR SELECT 
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'socio') OR 
  has_role(auth.uid(), 'rh') OR
  (has_role(auth.uid(), 'lider') AND leader_id = auth.uid()) OR
  (user_id = auth.uid())
);

CREATE POLICY "Admin, Socio and RH can manage team members" 
ON team_members FOR ALL 
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'socio') OR 
  has_role(auth.uid(), 'rh')
)
WITH CHECK (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'socio') OR 
  has_role(auth.uid(), 'rh')
);