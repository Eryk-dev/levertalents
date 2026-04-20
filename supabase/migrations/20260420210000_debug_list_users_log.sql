-- Tabela temporária de debug para diagnosticar falhas da edge function
-- list-users. A função escreve nela em cada passo (auth, load roles,
-- listUsers, etc.) quando detecta erro. Consultar via:
--   SELECT * FROM public.debug_list_users_log ORDER BY created_at DESC;
--
-- Pode ser removida depois que o bug for identificado.

CREATE TABLE IF NOT EXISTS public.debug_list_users_log (
  id BIGSERIAL PRIMARY KEY,
  step TEXT NOT NULL,
  error_name TEXT,
  error_message TEXT,
  caller_user_id UUID,
  extra JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.debug_list_users_log ENABLE ROW LEVEL SECURITY;
