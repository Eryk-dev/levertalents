# Phase 3: Performance Refactor - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-28
**Phase:** 03-performance-refactor
**Areas discussed:** Ciclos + Templates de Avaliação, 1:1 Plaud + RH visível + monólito 909 linhas, Onboarding WhatsApp + force-change-password
**Areas skipped (Claude's Discretion):** Pesquisa de Clima 100% anônimo + k-anonymity, Backfill E

---

## Selection Round

| Option | Description | Selected |
|--------|-------------|----------|
| Ciclos + Templates de Avaliação | Schema novo evaluation_cycles, template global vs per-empresa, migração de evaluations legadas | ✓ |
| Clima 100% anônimo + k-anonymity | climate_responses.user_id wipe + k-anonymity ≥3 | (skipped — Claude's Discretion) |
| 1:1 Plaud + RH visível + monólito 909 linhas | Anexo Plaud, badge RH visível, navegação RH, quebra do componente | ✓ |
| Onboarding WhatsApp + force-change-password | CreateUser flow novo, mensagem WhatsApp, senha temp 24h, force change | ✓ |

---

## Ciclos + Templates de Avaliação

### Como modelar evaluation_cycles?

| Option | Description | Selected |
|--------|-------------|----------|
| Cycle por empresa, com janela start/end | Tabela `evaluation_cycles(id, company_id, name, template_id, starts_at, ends_at, status)`; status auto-expira em ends_at | ✓ |
| Cycle aberto até RH fechar manualmente | Mesmo schema, sem ends_at obrigatório | |
| Sem cycles — manter flat 'period' | Refactor mínimo, só escopar por company_id | |

**User's choice:** Cycle por empresa com janela start/end.
**Notes:** Reflete melhor "ciclo trimestral Q1", "anual 2026". RH controla janela; ciclo fecha sozinho.

### Templates onde vivem?

| Option | Description | Selected |
|--------|-------------|----------|
| Template global default + override por ciclo | Admin define 1 template global; RH customiza por ciclo (clone+edit) | |
| Template por empresa + override por ciclo | Cada empresa tem template padrão próprio; antecipa V2-05 | ✓ |
| Template hardcoded no código (só ciclo na DB) | Template fixo em src/lib; RH não customiza | |

**User's choice:** Template por empresa + override por ciclo.
**Notes:** Antecipa V2-05 do backlog pra v1. Cada empresa-cliente externo pode ter template próprio. Mais schema mas resolve flexibilidade real.

### Como migrar evaluations existentes (campo 'period: string') pra cycle_id?

| Option | Description | Selected |
|--------|-------------|----------|
| Criar 1 cycle histórico por (empresa, period) + backfill cycle_id | Preserva histórico no novo modelo | |
| Migrar só evaluations recentes (último ano), arquivar resto | Reduz volume; histórico antigo em arquivo separado | |
| Drop histórico (start fresh) | DROP TABLE evaluations; sem backfill | ✓ |

**User's choice:** Drop histórico (start fresh).
**Notes:** Owner pediu. Histórico atual sem valor estratégico no contexto refactor. Aceitou risco.

### Comportamento ao trocar empresa?

| Option | Description | Selected |
|--------|-------------|----------|
| Ver só ciclos da empresa atual (refiltra tudo) | useScopedQuery puxa cycles WHERE company_id = scope.id | ✓ |
| Ver ciclos de TODAS empresas visíveis com tag de empresa | Lista cross-empresa com coluna empresa | |

**User's choice:** Ver só ciclos da empresa atual.
**Notes:** Coerência com pattern Phase 1 (todo o app refiltra).

### Drop histórico — como rolar antes?

| Option | Description | Selected |
|--------|-------------|----------|
| Export CSV antes + drop limpo | COPY evaluations → CSV em storage, depois TRUNCATE | |
| Drop direto (backup só via Supabase point-in-time) | Confia em PIT recovery 7 dias | |
| Drop direto, owner toma responsabilidade | Sem backup explícito | ✓ |

**User's choice:** Drop direto, sem backup explícito.
**Notes:** Owner aceita responsabilidade total. Risco registrado em deferred do CONTEXT.

### Quando RH muda template no meio do caminho, ciclos abertos comportamento?

| Option | Description | Selected |
|--------|-------------|----------|
| Ciclo carrega snapshot imutável do template no momento de criar | template_snapshot JSONB freezed na criação; mudanças só valem pra ciclos novos | ✓ |
| Ciclo aberto puxa template live, atualiza retroativamente | template_id FK; mudou template = todos cycles ativos puxam novo schema | |
| RH não pode editar template enquanto há ciclos abertos | UI bloqueia edição se houver cycle status='active' | |

**User's choice:** Ciclo carrega snapshot imutável.
**Notes:** Evita inconsistência mid-cycle. Mudanças em template só valem para ciclos novos.

---

## 1:1 Plaud + RH visível + monólito 909 linhas

### Como o RH/líder anexa transcrição + resumo Plaud no 1:1?

| Option | Description | Selected |
|--------|-------------|----------|
| Paste de texto + resumo manual (textarea) | 2 textareas dedicadas, paste do clipboard, resumo escrito pelo líder | |
| Paste de texto + auto-resumo via OpenAI | Botão "Gerar resumo" chama OpenAI; resumo editável depois | |
| Upload de áudio + transcrição automática + resumo manual | Reusa useAudioTranscription, upload áudio, líder edita | |
| Other (free text) | "O rh vai colar a transcrição e o resumo, o resumo é feito no app do plaud" | ✓ |

**User's choice:** Paste manual de transcrição **e** resumo (ambos vêm prontos do app Plaud).
**Notes:** Importante diferença em relação à opção 1: resumo NÃO é escrito no Lever, é colado direto do Plaud. App Lever só recebe via paste; não tenta competir com Plaud em geração de resumo. Sem auto-AI nesta fase (mantém AF-09 lock).

### Como RH navega 1:1s da empresa?

| Option | Description | Selected |
|--------|-------------|----------|
| Lista flat de todos 1:1s da empresa, filtros por par+período+status | Página /1-on-1s pra RH mostra TODOS 1:1s; filtros e click em item | |
| Lista por par (líder, liderado), drill-down em histórico do par | Lista pares com métricas; clica em par → histórico | |
| Ambos — toggle Lista geral / Por par | Toggle no header da página entre as duas visões | ✓ |

**User's choice:** Toggle entre as duas visões.
**Notes:** Persistência por usuário. Reusar pattern Phase 2 (D-09 do CONTEXT 02 — toggle Kanban/Tabela).

### RH só lê 1:1s ou pode interagir?

| Option | Description | Selected |
|--------|-------------|----------|
| RH só lê — zero edit, zero comentário | Modo somente leitura; RH atua via 1:1 com líder se precisar levantar | |
| RH pode adicionar 'nota interna RH' (visível só pra RH) | Campo separado invisível pra líder/liderado | ✓ |
| RH pode editar/deletar action items se vir abuse | RH com permissão de moderação; audit log obrigatório | |

**User's choice:** Nota interna RH visível só pra RH.
**Notes:** Caso de uso: RH registra observações ('preparar PIP', etc). LGPD risco gerenciado pragmaticamente (vide próxima pergunta).

### Quebra do OneOnOneMeetingForm.tsx (909 linhas)?

| Option | Description | Selected |
|--------|-------------|----------|
| Por seção do form (Pauta / Notas+Transcrição / Action Items / PDI) | OneOnOneAgenda + OneOnOneNotes + OneOnOneActionItems + OneOnOnePDIPanel; pai vira orchestrator <300 linhas | |
| Por modo (Live recording / Edit aposterior / Read-only RH) | OneOnOneLiveMode + OneOnOneEditMode + OneOnOneReadOnly | |
| Manter monólito — só extrair custom hooks | Hook extraction sem quebrar componente | |
| Other | "Não sei, o que você achar melhor" | ✓ |

**User's choice:** Claude's Discretion → recomendação default = quebra por seção (opção 1).
**Notes:** Registrado em CONTEXT D-18 como decisão default. Atende QUAL-04 e mantém componentes <250 linhas.

### Nota interna RH — colaborador tem direito de acesso (LGPD)?

| Option | Description | Selected |
|--------|-------------|----------|
| Só RH vê, mas log auditado + colaborador pode pedir export via RH | data_access_log registra; RPC export se demandado | |
| Só RH vê, sem trilha formal de export pra colaborador | RH responde caso a caso fora do app; risco LGPD | |
| Notas RH ficam visíveis pro liderado também (transparência total) | Mata o caso de uso | |
| Other | "Somente para o RH, não se preocupe tanto com lgpd." | ✓ |

**User's choice:** Pragmático — só RH vê, sem trilha formal.
**Notes:** Owner explicitou pragmatismo sobre LGPD. Risco registrado em deferred do CONTEXT pra revisitar se ANPD demandar.

---

## Onboarding WhatsApp + force-change-password

### Quando RH cadastra uma pessoa nova, como o app entrega a mensagem pra ela enviar no WhatsApp?

| Option | Description | Selected |
|--------|-------------|----------|
| Mostra mensagem pronta + botão 'Copiar tudo' | Caixa com mensagem completa; botão Copy; RH abre WhatsApp pessoal e cola | ✓ |
| Botão 'Abrir no WhatsApp Web' já com mensagem dentro | Abre WhatsApp Web em aba nova com texto preenchido | |
| RH preenche número da pessoa + botão abre WhatsApp direto na conversa dela | Cadastro pede telefone obrigatório; botão wa.me com número | |

**User's choice:** Mensagem pronta + botão Copiar tudo.
**Notes:** Sem campo telefone obrigatório. Mínima fricção no cadastro; RH controla envio.

### Como funciona a senha temporária que vai junto na mensagem do WhatsApp?

| Option | Description | Selected |
|--------|-------------|----------|
| Senha curta gerada pelo app (8 caracteres fáceis de ler) | Sem ambíguos 0/O, 1/L; força troca no primeiro login | ✓ |
| Sem senha — link mágico que já loga a pessoa | Link válido por 24h; pessoa clica, entra, define senha | |
| Senha longa e mais segura (mistura números, letras, símbolos) | Mais segura; chata de digitar | |

**User's choice:** Senha curta 8 caracteres legíveis.
**Notes:** Equilíbrio segurança vs digitação no celular.

### Quando a pessoa entra no app pela primeira vez, como o app obriga ela a trocar a senha?

| Option | Description | Selected |
|--------|-------------|----------|
| Tela dedicada de troca de senha — nada mais aparece até trocar | Rota /first-login-change-password; ProtectedRoute redirect forçado | ✓ |
| App carrega normal mas com pop-up bloqueando tudo | Modal full-screen sobre o app | |

**User's choice:** Tela dedicada bloqueante.
**Notes:** Impossível pular. Sem risco de fechar pop-up por engano e ver dados.

### Se a pessoa demorou e a senha temporária expirou (passou das 24h), o que acontece?

| Option | Description | Selected |
|--------|-------------|----------|
| App bloqueia o login com mensagem 'Peça nova senha ao RH' | RH gera nova; mais seguro; mais fricção | |
| Conta da pessoa fica desativada — RH precisa reativar | Cron desativa após 24h; dois passos | |
| App deixa entrar mesmo vencida, mas obriga troca na hora | Flexibilidade max; risco de screenshot vazado meses depois | ✓ |

**User's choice:** Permite entrar, força troca na hora.
**Notes:** Owner aceitou tradeoff. Caso de uso: pessoa viajou e demorou 3 dias. Risco registrado em deferred.

---

## Continuation Decision

| Option | Description | Selected |
|--------|-------------|----------|
| Pronto pro contexto | Escrever 03-CONTEXT.md | ✓ |
| Discutir mais 1 área (clima anônimo) | Aprofundar k-anonymity e wipe de respondent_id | |
| Discutir mais 1 área (Backfill E) | Mapear empresas, teams legados, sócios | |
| Discutir mais 1 área (escolha minha) | Open | |

**User's choice:** Pronto pro contexto.

---

## Claude's Discretion (não discutidas, registradas em CONTEXT)

- Pesquisa de Clima 100% anônima + k-anonymity (PERF-05/06): drop de `climate_responses.user_id`, RPC com k-anonymity ≥3, label "100% anônima" persistente
- Backfill E: 7 empresas + Grupo Lever + teams→org_units 1:1 + user_roles socio→memberships (precisa input owner antes do execute)
- Migração mecânica de hooks de Performance pra useScopedQuery (~15 hooks)
- Toast positions, loading skeletons, animações, persistência de toggles
- Schedule do cron pra fechar ciclos expirados
- Quebra de OneOnOneMeetingForm.tsx (recomendação: por seção)

## Deferred Ideas (registradas em CONTEXT)

- LGPD risco: nota RH em 1:1 sem trilha formal de export pro colaborador — revisitar se ANPD demandar
- Risco operacional: drop histórico de evaluations sem backup explícito — point-in-time recovery 7 dias é janela apertada
- Risco segurança: senha temporária expirada ainda permite login — screenshot vazado meses depois ainda funciona
- UI completa de gestão de templates por empresa — pode ficar parcial se estourar escopo (default seedado + criar ciclo escolhendo template; CRUD em Phase 4)
- CSV export de avaliações antes do drop (rota de contingência se owner mudar de ideia)
