---
status: partial
phase: 02-r-s-refactor
source: ["02-VERIFICATION.md"]
started: 2026-04-28T12:35:00Z
updated: 2026-04-28T12:35:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Arrastar card entre colunas no kanban
expected: Card se move otimisticamente, permanece na coluna destino, não some nem pisca nem aparece duplicado
result: [pending]

### 2. Abrir CandidateDrawer; verificar que página não navega para fora
expected: Drawer abre na lateral/overlay; URL só muda para adicionar ?tab= mas pathname permanece /hiring/jobs/:id
result: [pending]

### 3. Preencher PublicApplicationForm sem marcar consent_aplicacao_vaga e tentar submeter
expected: Formulário bloqueia submit com erro Zod em PT-BR; os 3 checkboxes de opt-in NÃO estão pré-marcados ao abrir
result: [pending]

### 4. Verificar sparkbar no JobCard: cores por grupo (azul triagem, amarelo entrevistas, verde decisão, vermelho descartados)
expected: Segmentos de cor correspondem a STAGE_GROUP_BAR_COLORS — azul para triagem/fit/checagem, amarelo para entrevistas, verde para decisão/admissão, vermelho para descartados
result: [pending]

### 5. Card de candidato com stage_entered_at > 2 dias: verificar SLA stripe laranja; > 5 dias: vermelho
expected: Borda esquerda do card muda de border-border para status-amber (2d) ou status-red (5d)
result: [pending]

### 6. AuditLogPanel visível para RH/admin; invisível para liderado
expected: Tab 'Auditoria' aparece no drawer quando logado como admin.teste@levertalents.com; não aparece como mariana.costa@levertalents.com (lider)
result: [pending]

### 7. Banco de Talentos lista apenas candidatos com consent ativo (incluir_no_banco_de_talentos_global)
expected: Candidato que revogou consent desaparece da listagem /hiring/talent-pool após revogação via RevokeConsentDialog
result: [pending]

### 8. pgTAP suites 006–010 executam sem falha no projeto Supabase remote
expected: supabase test db retorna 0 failures em todos os 5 suites de Migration F
result: [pending]

## Summary

total: 8
passed: 0
issues: 0
pending: 8
skipped: 0
blocked: 0

## Gaps
