-- T083 — Seed data for the hiring module (for local dev and quickstart).
--
-- Idempotent via ON CONFLICT clauses. Run after all 20260416193* migrations
-- are applied. Adjust UUIDs for your local env; these are deterministic
-- placeholders so referencing works across re-runs.
--
-- 2 empresas-cliente, 1 RH, 1 Sócio, 2 Gestores, 1 Admin, 1 Fit Cultural
-- com 5 perguntas, 2 standard_messages (recusa, oferta).

-- Companies
INSERT INTO public.companies (id, name)
VALUES
  ('00000000-0000-0000-0000-0000000000a1', 'Empresa Alpha'),
  ('00000000-0000-0000-0000-0000000000b1', 'Empresa Bravo')
ON CONFLICT (id) DO NOTHING;

-- Seed-only placeholder profiles: in a real local env create users via
-- Supabase Auth first and then UPDATE these rows to match the real UUIDs.
-- The handle_new_user trigger will auto-create profiles.

DO $$
DECLARE
  rh_id UUID := '00000000-0000-0000-0000-00000000a001';
  socio_id UUID := '00000000-0000-0000-0000-00000000a002';
  admin_id UUID := '00000000-0000-0000-0000-00000000a003';
  gestor_a_id UUID := '00000000-0000-0000-0000-00000000a004';
  gestor_b_id UUID := '00000000-0000-0000-0000-00000000a005';
BEGIN
  INSERT INTO public.profiles (id, full_name, username)
  VALUES
    (rh_id, 'RH Demo', 'rh-demo'),
    (socio_id, 'Sócio Demo', 'socio-demo'),
    (admin_id, 'Admin Demo', 'admin-demo'),
    (gestor_a_id, 'Gestor Alpha', 'gestor-alpha'),
    (gestor_b_id, 'Gestor Bravo', 'gestor-bravo')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES
    (rh_id, 'rh'),
    (socio_id, 'socio'),
    (admin_id, 'admin'),
    (gestor_a_id, 'lider'),
    (gestor_b_id, 'lider')
  ON CONFLICT (user_id, role) DO NOTHING;

  INSERT INTO public.standard_messages (id, kind, title, body_md, created_by)
  VALUES
    ('00000000-0000-0000-0000-000000005001', 'recusa', 'Recusa padrão',
     E'Olá,\n\nObrigado por participar do processo. Seguiremos com outros candidatos mais aderentes neste momento. Desejamos sucesso!',
     rh_id),
    ('00000000-0000-0000-0000-000000005002', 'oferta', 'Oferta padrão',
     E'Olá,\n\nTemos o prazer de convidá-lo(a) para a próxima fase com nossa empresa-cliente.',
     rh_id)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.cultural_fit_surveys (id, name, company_id, created_by)
  VALUES
    ('00000000-0000-0000-0000-000000004001', 'Fit Cultural Base', NULL, rh_id)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.cultural_fit_questions (survey_id, order_index, kind, prompt, scale_min, scale_max)
  VALUES
    ('00000000-0000-0000-0000-000000004001', 1, 'scale', 'Em que nível você valoriza autonomia no trabalho?', 1, 5),
    ('00000000-0000-0000-0000-000000004001', 2, 'scale', 'Em que nível você prioriza feedback contínuo?', 1, 5),
    ('00000000-0000-0000-0000-000000004001', 3, 'scale', 'Em que nível colaboração em equipe é vital para você?', 1, 5),
    ('00000000-0000-0000-0000-000000004001', 4, 'text', 'Conte uma situação em que você liderou sem autoridade formal.', NULL, NULL),
    ('00000000-0000-0000-0000-000000004001', 5, 'multi_choice', 'Qual ambiente você prefere?', NULL, NULL)
  ON CONFLICT (survey_id, order_index) DO NOTHING;

  UPDATE public.cultural_fit_questions
    SET options = '["start-up","scale-up","corporate","indiferente"]'::jsonb
  WHERE survey_id = '00000000-0000-0000-0000-000000004001'
    AND order_index = 5;
END $$;
