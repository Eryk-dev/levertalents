-- T2: handle_new_user também atribui role default
--
-- Antes: o trigger só criava profile; quem se cadastrava por /auth ficava
-- sem row em user_roles e não conseguia passar em RLS nenhum.
--
-- Agora: insere também em user_roles. O role vem de raw_user_meta_data.role
-- quando presente (fluxo admin → create-user edge function passa o role via
-- user_metadata), senão cai em 'colaborador' como default (Princípio II da
-- constituição: self-signup sempre precisa de role).
--
-- Isso evita o bug onde trigger + edge function ambos inseriam, deixando o
-- usuário admin-criado com 2 roles em user_roles.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url'
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE(
      (NEW.raw_user_meta_data->>'role')::public.app_role,
      'colaborador'::public.app_role
    )
  )
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;
