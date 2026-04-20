-- Dedupe user_roles legado.
--
-- Contexto: a tabela user_roles tem UNIQUE(user_id, role) mas não
-- UNIQUE(user_id). Em fluxos antigos (antes da migration
-- 20260416192100_add_default_role_on_signup.sql), o trigger inseria
-- 'colaborador' por default e depois o admin adicionava outra role via
-- migration seed (ex.: 20260417120000/20260417143000) — resultando em
-- dois rows por user.
--
-- Consequência: edge functions que usam .maybeSingle()/.single() em
-- user_roles falhavam com PGRST116 ("Cannot coerce the result to a
-- single JSON object"), devolvendo 403/500 ao carregar lista de
-- usuários em AdminDashboard e TeamManagement.
--
-- Fix: mantém apenas a role de maior prioridade por usuário.

WITH ranked AS (
  SELECT
    id,
    user_id,
    role,
    ROW_NUMBER() OVER (
      PARTITION BY user_id
      ORDER BY CASE role
        WHEN 'admin'::public.app_role THEN 1
        WHEN 'socio'::public.app_role THEN 2
        WHEN 'rh'::public.app_role THEN 3
        WHEN 'lider'::public.app_role THEN 4
        WHEN 'colaborador'::public.app_role THEN 5
      END
    ) AS rn
  FROM public.user_roles
)
DELETE FROM public.user_roles
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);
