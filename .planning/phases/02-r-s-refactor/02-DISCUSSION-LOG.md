# Phase 2: R&S Refactor - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-27
**Phase:** 02-r-s-refactor
**Areas discussed:** Bug do kanban + tempo real, Card mais rico + prazo do candidato

---

## Gray Area Selection

| Option | Description | Selected |
|--------|-------------|----------|
| Bug do kanban + tempo real | Como o app se comporta quando dois RHs mexem no mesmo candidato; o que aparece quando dá erro; comportamento do card | ✓ |
| Consentimento LGPD do candidato | Em que momento pedir autorização, quais autorizações granulares, revogação | |
| Card mais rico + prazo do candidato | Quanta informação no card, prazos do SLA, mini-barra de distribuição | ✓ |
| Vaga confidencial + etapas antigas | Quem enxerga vaga confidencial, migração de etapas legadas | |

**User notes:** "nem precisa ter vaga confidencial, remova isso do escopo" — RS-11 movido pra Deferred Ideas.

---

## Bug do kanban + tempo real

### Erro ao mover candidato

| Option | Description | Selected |
|--------|-------------|----------|
| Volta sozinho com aviso | Card desliza de volta + toast explicando o erro (otimista com rollback) | ✓ |
| Pergunta antes de voltar | Card fica na nova coluna + janela "voltar ou tentar de novo?" | |
| Fica onde a pessoa soltou | Card permanece na coluna nova com indicador de "não salvou" | |

**Notes:** Modelo Linear-style. Sem deadlock, sem candidato no limbo.

### Conflito entre dois RHs no mesmo candidato

| Option | Description | Selected |
|--------|-------------|----------|
| Quem clicou por último | Last-writer-wins. Primeiro recebe aviso de update remoto | ✓ |
| Quem chegou primeiro no servidor | Optimistic concurrency. Segundo recebe "atualize a tela" | |
| Ninguém, bloqueia | Lock visual enquanto alguém está mexendo | |

**Notes:** Conflito raro na prática; aviso suficiente. Sem over-engineering.

### Update remoto enquanto você está olhando

| Option | Description | Selected |
|--------|-------------|----------|
| Card desliza suave, sem aviso | Silent re-render via Realtime | ✓ |
| Card desliza + aviso no canto | Animação + toast discreto | |
| Card pisca + aviso | Flash colorido + toast | |

**Notes:** Menos ruído visual. Quem move ativamente já tem feedback local.

### Tipos de erro: mensagem própria ou genérica?

| Option | Description | Selected |
|--------|-------------|----------|
| Mensagem própria pra cada | RLS denial / network / conflict / canTransition reject — cada um com texto e ação distintos | ✓ |
| Uma mensagem genérica | "Não foi possível mover, tente de novo" sempre | |
| Só separa rede vs resto | Mensagem específica pra rede; resto vira genérico | |

**Notes:** Cada erro tem causa e solução diferente — usuário precisa saber qual é.

---

## Card mais rico + prazo do candidato

### Densidade do card de candidato

| Option | Description | Selected |
|--------|-------------|----------|
| Denso e útil | Avatar + nome + cargo + dias na etapa + próxima entrevista + ícones CV/Fit | |
| Mínimo | Apenas avatar + nome + cargo + dias na etapa | |
| Denso completo | Tudo do "denso útil" + bg-check dot + tags origem + badge urgente | |
| **Other (free text)** | "o minimo é nome, cargo, dias e vaga que está concorrendo, mas quero que seja possivel editar a view, tanto das infos do card quanto de kanban para tabela, com sort também" | ✓ |

**Notes:** Decisão híbrida: mínimo fixo (nome + cargo + dias + vaga) + customização por usuário + toggle Board↔Tabela com sort. **Pulls V2-01 from backlog into Phase 2.**

### Thresholds de SLA (parado na etapa)

| Option | Description | Selected |
|--------|-------------|----------|
| 3 dias laranja, 7 dias vermelho | Sugestão UX-AUDIT-VAGAS | |
| 5 dias laranja, 10 dias vermelho | Mais permissivo | |
| 2 dias laranja, 5 dias vermelho | Mais agressivo (SLA contratual rígido) | ✓ |

**Notes:** Alinhado com SLA contratual de R&S externo.

### Escopo do SLA: global vs customizável

| Option | Description | Selected |
|--------|-------------|----------|
| Iguais pra todo o app agora, customizar depois (v2) | Phase 2 entrega global; customização vai pra v2 | ✓ |
| Customizáveis por empresa | Cada cliente externo tem SLA próprio | |
| Customizáveis por vaga | RH define na criação da vaga | |

**Notes:** Reduz complexidade de imediato. v2 abre customização quando houver demanda.

### Lógica de cor da sparkbar de distribuição (vagas)

| Option | Description | Selected |
|--------|-------------|----------|
| Por intencionalidade | Verde aprovados, Amarelo entrevista, Azul triagem/fit, Vermelho descartados | ✓ |
| Só ativos vs descartados | Duas cores apenas (Verde ativos / Cinza descartados) | |
| Cores por grupo de etapa | 6 grupos = 6 cores diferentes | |

**Notes:** Quem olha de longe entende onde está a ação. Padrão UX-AUDIT.

---

## Claude's Discretion

Áreas em-escopo de Phase 2 que NÃO foram discutidas explicitamente, ficando como direção do planner com base em REQUIREMENTS.md já locked + research + codebase patterns:

- **LGPD consent flow (TAL-03/04/06/08):** estrutura `candidate_consents` + opt-in não pré-marcado + revogação por candidato OU RH + anonimização vs revogação são fluxos separados
- **Data access log (TAL-05/06/07):** RPC `read_candidate_with_log` é o único caminho de leitura PII; pg_cron weekly pra retenção 36mo
- **CPF dedup (TAL-09):** UNIQUE constraint nullable; merge UI via `DuplicateCandidateDialog.tsx`
- **Migração F (RS-05/06):** expand → backfill → contract; `applications.stage_v2` column intermediária
- **Filtros inline (RS-09):** `PipelineFilters.tsx` refinar pra inline + URL como source of truth
- **Encerradas colapsadas (RS-10):** `Collapsible` com persistência por sessão
- **Drawer aninhado (RS-07):** quebrar `CandidateDrawer.tsx` (867 linhas) em sub-componentes

## Deferred Ideas

### Removed from Phase 2 scope (this session)
- **RS-11 (vaga confidencial)** — owner removeu: "nem precisa ter vaga confidencial, remova isso do escopo"

### Postponed to v2
- SLA customizável por empresa/vaga (D-10 entrega global)
- Cross-job realtime (V2-07 stays deferred — Phase 2 entrega per-jobId apenas)
- Virtualização do kanban (V2-06 — só pull-in se volume confirmar >100/vaga)

### Pulled from backlog into Phase 2
- **V2-01 → RS-13 (toggle Board ↔ Tabela com sort)** — owner pediu na sessão. REQUIREMENTS.md precisa update.
