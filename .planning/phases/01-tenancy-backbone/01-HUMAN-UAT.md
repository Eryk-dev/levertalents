---
status: partial
phase: 01-tenancy-backbone
source: [01-VERIFICATION.md]
started: 2026-04-27T21:35:00Z
updated: 2026-04-27T21:35:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Trocar empresa no seletor refiltra todas as telas
expected: Vagas, candidatos, performance, dashboards mostram apenas dados da empresa selecionada. Sem flash de dados anteriores. Sem query órfã na cache.
why_human: Comportamento de cache do TanStack Query no browser não é verificável estaticamente.
result: [pending]

### 2. Trocar para "Grupo Lever" mostra visão consolidada das empresas-membro
expected: Mesmas telas, escopo expandido para as empresas-membro (sem tela diferente). Sócio sem membership em determinada empresa não a vê no seletor.
blocker: depende do gap OWNER-01 (7 empresas-membro ainda não associadas — produção tem só `141Air`).
why_human: Requer dados de membership real e interação com o seletor no browser.
result: [blocked-on-owner]

### 3. Roundtrip de URL scope + persistência cross-session
expected: Após trocar escopo, URL mostra `?scope=company:UUID` ou `?scope=group:UUID`. Reabrir aba cai no mesmo escopo (Zustand persist). Link compartilhado abre no escopo correto. URL inacessível faz fallback silencioso com toast.
why_human: Requer browser real com `localStorage` entre sessões; impossível verificar via análise estática.
result: [pending]

### 4. CASL: ações invisíveis para roles sem permissão (defesa em profundidade)
expected: `<Can />` / `useAbility()` retornam false para o role correto. Botões de gestão de empresas invisíveis para `liderado`. Badge "Você está vendo: X" presente no header (via `aria-label` do `ScopeTrigger`).
why_human: AbilityProvider entrega abilities corretas (verificável no código), mas o hiding visual depende de cada componente consumir `<Can>`. Phase 1 entregou o mecanismo; componentes legados ainda não consomem — validação visual necessária à medida que Phases 2-3 migrarem componentes.
result: [pending]

## Summary

total: 4
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 1

## Gaps

### CI-01 — Suite pgTAP completo no CI (basejump helpers)
context: O suíte `supabase test db` requer `basejump-supabase_test_helpers` (`tests.create_supabase_user`, etc.) que não está instalado em `ehbxpbeijofxtsbezwxd`. Verificação equivalente via SQL direto rodou GREEN, mas o gate fixture-based de cross-tenant leakage não foi executado.
addressed_in: Phase 4 (QUAL-02 mapeia "pgTAP + supabase-test-helpers configurados; teste cross-tenant roda no CI").
status: deferred

### B2-01 — Forward-reference fix em Migration B2 (cleanup cosmético)
context: `visible_org_units` usa `LANGUAGE sql` que faz early-binding de tabelas; referencia `socio_company_memberships` (criada em Migration C). Workaround: placeholder `CREATE TABLE IF NOT EXISTS socio_company_memberships` no topo de B2; Migration C é idempotente e cria a tabela real. Funciona, mas é cosmeticamente feio.
suggested_fix: Mudar `visible_org_units` para `LANGUAGE plpgsql` (late-binding) OU mover o helper para Migration C.
addressed_in: Phase 2 (R&S Refactor inclui "migration de normalização" que pode incluir esse cleanup).
status: deferred

### OWNER-01 — Backfill das 7 empresas do Grupo Lever
context: O backfill de Plan 01-04 fez `UPDATE companies SET group_id = (SELECT id FROM company_groups WHERE slug = 'grupo-lever') WHERE name IN ('Lever Consult', 'Lever Outsourcing', 'Lever Gestão', 'Lever People', 'Lever Tech', 'Lever Talents', 'Lever Operations')`. Foi no-op idempotente — produção atualmente só tem a empresa `141Air`. Owner deve rodar manualmente um `UPDATE` com os UUIDs reais das 7 empresas-membro do Grupo Lever, OU renomeá-las para os nomes esperados.
suggested_action: ```sql
UPDATE public.companies
SET group_id = (SELECT id FROM public.company_groups WHERE slug = 'grupo-lever')
WHERE id IN ('<uuid-1>', '<uuid-2>', '<uuid-3>', '<uuid-4>', '<uuid-5>', '<uuid-6>', '<uuid-7>');
```
status: open
owner_action_required: yes
