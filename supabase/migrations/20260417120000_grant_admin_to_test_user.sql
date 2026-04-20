-- Grant admin role to test user admin.teste@levertalents.com
-- Run this via: supabase db push (or psql directly)

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'
FROM auth.users
WHERE email = 'admin.teste@levertalents.com'
ON CONFLICT (user_id) DO UPDATE SET role = 'admin';
