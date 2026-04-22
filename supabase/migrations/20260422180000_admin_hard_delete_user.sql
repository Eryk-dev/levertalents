-- ----------------------------------------------------------------------------
-- Hard delete de usuário via SQL — bypass do GoTrue auth.admin.deleteUser
-- ----------------------------------------------------------------------------
-- Motivo: auth.admin.deleteUser (SDK) trava em usuários degenerados (sem
-- identities) ou em cenários onde GoTrue faz chamadas internas que pendurarem.
-- DELETE direto em auth.users funciona: cascateia profiles, user_roles,
-- team_members, analytics, sessions, identities — todas FKs são CASCADE.
--
-- Segurança: SECURITY DEFINER roda com permissões do owner (postgres) para
-- poder tocar auth.users. Autorização é feita pela Edge Function antes de
-- chamar a RPC (checa JWT e role admin). Ainda assim, gate interno pra evitar
-- auto-delete e último-admin, como segunda linha de defesa.
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_hard_delete_user(_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_target_is_admin BOOLEAN;
  v_admin_count INT;
BEGIN
  -- Usuário existe?
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = _user_id) THEN
    RAISE EXCEPTION 'Usuário não encontrado'
      USING ERRCODE = 'P0002';
  END IF;

  -- Segunda linha de defesa: não deletar último admin
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin'
  ) INTO v_target_is_admin;

  IF v_target_is_admin THEN
    SELECT COUNT(*) INTO v_admin_count FROM public.user_roles WHERE role = 'admin';
    IF v_admin_count <= 1 THEN
      RAISE EXCEPTION 'Não é possível excluir o último administrador'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  -- Delete direto — CASCADE limpa tudo
  DELETE FROM auth.users WHERE id = _user_id;
END;
$$;

-- Apenas service_role pode chamar (a Edge Function usa service_role)
REVOKE ALL ON FUNCTION public.admin_hard_delete_user(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_hard_delete_user(UUID) TO service_role;

COMMENT ON FUNCTION public.admin_hard_delete_user(UUID) IS
  'Deleta definitivamente um usuário auth.users via SQL direto (bypass do GoTrue). Chamado pela edge function delete-user. Service_role only.';
