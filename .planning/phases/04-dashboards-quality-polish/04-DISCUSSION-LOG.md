# Phase 4: Dashboards + Quality Polish - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-28
**Phase:** 04-dashboards-quality-polish
**Areas discussed:** Dashboard de sócio, Cmd+K palette

---

## Dashboard de sócio (DASH-01, DASH-02, DASH-03)

### Q1 — KPIs suficientes?

| Option | Description | Selected |
|--------|-------------|----------|
| Só os 3 KPIs base | Folha total + custo médio + headcount | |
| 3 KPIs + breakdown por departamento | Além do total, top 6 times por custo | ✓ |
| Comparativo de período | Histórico mensal — exige armazenar snapshots | |

**User's choice:** 3 KPIs + breakdown por departamento
**Notes:** Breakdown por departamento já existe hoje (top 6) — manter e escopar corretamente.

---

### Q2 — Quantos times no breakdown?

| Option | Description | Selected |
|--------|-------------|----------|
| Top 6 (como hoje) | Mostra os 6 times com maior custo | ✓ |
| Todos os departamentos | Lista completa com scroll | |
| Top 6 + botão 'ver todos' | Expansível | |

**User's choice:** Top 6 (como hoje)
**Notes:** Preservar padrão atual — simples e suficiente.

---

### Q3 — Visão do Grupo Lever (DASH-03)

| Option | Description | Selected |
|--------|-------------|----------|
| Total consolidado + breakdown por empresa | KPIs agregados + cada empresa como linha do breakdown | ✓ |
| Só o total consolidado | KPIs do grupo sem abertura por empresa | |

**User's choice:** Total consolidado + breakdown por empresa
**Notes:** Quando scope = Grupo Lever, o breakdown muda de "departamentos" para "empresas". Mesma tela, comportamento condicional.

---

### Q4 — Foco do dashboard (limpar vs manter)

| Option | Description | Selected |
|--------|-------------|----------|
| Focar só nos financeiros | Remover clima e org indicators | ✓ |
| Manter o que está hoje + ajustar | Preservar indicadores mistos, só conectar escopo | |

**User's choice:** Focar só nos financeiros
**Notes:** Alinha com PROJECT.md — "Performance e R&S ficam em telas dedicadas." Seções de clima e org indicators removidas do SocioDashboard.

---

### Q5 — Mais perguntas sobre dashboard?

**User's choice:** Não (avançar para Cmd+K)

---

## Cmd+K (DASH-04)

### Q6 — Navegação vs ações rápidas

| Option | Description | Selected |
|--------|-------------|----------|
| Só navegação | Buscar e navegar | |
| Navegação + ações rápidas | Busca + criar vaga, convidar pessoa | ✓ |

**User's choice:** Navegação + ações rápidas

---

### Q7 — Quais ações rápidas?

| Option | Description | Selected |
|--------|-------------|----------|
| Criar nova vaga | Abre form de nova vaga | ✓ |
| Convidar/criar pessoa | Atalho para CreateUser | ✓ |
| Trocar de empresa/escopo | Switch no Cmd+K | |
| Outras ações de navegação | Atalhos para páginas principais | ✓ |

**User's choice:** Criar nova vaga + Convidar/criar pessoa + Outras ações de navegação
**Notes:** Trocar escopo deliberadamente excluído — scope selector no header é suficiente.

---

### Q8 — Default state (sem texto)

| Option | Description | Selected |
|--------|-------------|----------|
| Atalhos de página + ações rápidas | Lista útil sem digitar | ✓ |
| Vazio com placeholder | Nada até digitar | |
| Recentes | Últimas páginas acessadas | |

**User's choice:** Atalhos de página + ações rápidas
**Notes:** Sem histórico de recentes nesta fase. Simplicidade.

---

## Claude's Discretion

Áreas não discutidas — delegadas ao planner:
- Sentry: profundidade do monitoramento (beforeSend PII + session replay default-off + tags de scope)
- Migration G: timing, checklist de go/no-go, verificação de zero leitores em `teams`
- Testes (QUAL-01..03): cobrir 5 fluxos críticos do QUAL-03; não recriar scaffolding existente de Phases 2+3
- CSV export do dashboard: manter (já existe)
- SocioDashboard.tsx: refactor incremental vs reescrita — planner decide

## Deferred Ideas

- Histórico comparativo de folha entre períodos — sem armazenamento histórico nesta fase
- Histórico de recentes no Cmd+K — sem localStorage nesta fase
- Trocar escopo via Cmd+K — excluído pelo owner; scope selector no header é suficiente
- UI completa de gestão de templates de avaliação — planner verifica status de Phase 3
