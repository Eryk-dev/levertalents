-- GoTrue (supabase auth) scanneia colunas de token como string nao-nulavel.
-- Users legados com essas colunas NULL quebram auth.admin.listUsers() com
-- "sql: Scan error on column confirmation_token: converting NULL to string".
-- Normaliza para '' para manter a listagem de usuarios funcionando.
UPDATE auth.users
SET
  confirmation_token = COALESCE(confirmation_token, ''),
  recovery_token = COALESCE(recovery_token, ''),
  email_change_token_new = COALESCE(email_change_token_new, ''),
  email_change_token_current = COALESCE(email_change_token_current, ''),
  reauthentication_token = COALESCE(reauthentication_token, ''),
  phone_change_token = COALESCE(phone_change_token, ''),
  email_change = COALESCE(email_change, ''),
  phone_change = COALESCE(phone_change, '')
WHERE
  confirmation_token IS NULL
  OR recovery_token IS NULL
  OR email_change_token_new IS NULL
  OR email_change_token_current IS NULL
  OR reauthentication_token IS NULL
  OR phone_change_token IS NULL
  OR email_change IS NULL
  OR phone_change IS NULL;
