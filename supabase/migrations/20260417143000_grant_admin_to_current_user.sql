-- Seed de validação do novo Vagas Kanban (17/04/2026).
--
-- Promove o usuário da sessão de validação visual para role admin e
-- cria uma empresa + vagas de exemplo em status diversos para que o
-- Kanban de vagas tenha dados reais em cada coluna.
--
-- Aplicar via Supabase Studio > SQL Editor (cola e roda) ou via CLI
-- (`npx supabase link --project-ref neewgjxntjyfvwbwdwgf && npx supabase db push`).

-- 1. Promove o user UX Admin Test a admin. Atualize este uid se for
--    repetir o bootstrap com outro email. O signup em /auth com
--    raw_user_meta_data.role = 'admin' já passa o role corretamente
--    quando a migration 20260416192100 está aplicada.
INSERT INTO public.user_roles (user_id, role)
VALUES ('d0055558-fb11-4efe-8fdb-e4a96838f595', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- 2. Cria empresa de exemplo (apenas se ainda não houver).
INSERT INTO public.companies (name)
SELECT 'Netair Tecnologia'
WHERE NOT EXISTS (SELECT 1 FROM public.companies LIMIT 1);

-- 3. Cria 6 vagas sample em status variados para testar o Kanban.
--    Usa a primeira empresa cadastrada como company_id.
WITH c AS (SELECT id FROM public.companies ORDER BY created_at LIMIT 1)
INSERT INTO public.job_openings
  (company_id, requested_by, title, sector, work_mode, contract_type, status)
SELECT c.id, 'd0055558-fb11-4efe-8fdb-e4a96838f595', v.title, v.sector, v.work_mode, v.contract_type, v.status
FROM c,
     (VALUES
       ('Senior Backend Engineer', 'Tech', 'remoto'::public.work_mode, 'clt'::public.contract_type, 'em_triagem'::public.job_status),
       ('Product Designer', 'Product', 'hibrido'::public.work_mode, 'clt'::public.contract_type, 'publicada'::public.job_status),
       ('SDR Outbound', 'Vendas', 'presencial'::public.work_mode, 'clt'::public.contract_type, 'aguardando_aprovacao_do_gestor'::public.job_status),
       ('Financial Analyst', 'Financeiro', 'hibrido'::public.work_mode, 'clt'::public.contract_type, 'em_ajuste_pelo_rh'::public.job_status),
       ('Tech Lead Mobile', 'Tech', 'remoto'::public.work_mode, 'pj'::public.contract_type, 'pronta_para_publicar'::public.job_status),
       ('Customer Success Junior', 'CX', 'remoto'::public.work_mode, 'clt'::public.contract_type, 'aguardando_descritivo'::public.job_status)
     ) AS v(title, sector, work_mode, contract_type, status)
WHERE NOT EXISTS (SELECT 1 FROM public.job_openings);
