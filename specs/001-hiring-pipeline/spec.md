# Feature Specification: Hiring Pipeline

**Feature Branch**: `001-hiring-pipeline`
**Created**: 2026-04-16
**Status**: Draft
**Input**: User description: "preciso corrigir esse app para deixar tudo que ja tem utilizavel mas, principalmente, eu precis que o app permita ao rh monitorar toda a etapa de hiring. vou te mandar todos os processos que temos atualmente e preciso que voce me ajude a implelementar o backend e frontend para deixar tudo em uma unica plataforma de recrutamento e seleção. ... gostaria de colocar nossa etapa de hiring junto no app alem da gestão de talentos e performance"

**Source documents**: POP 001 (Abertura de Vaga e Publicação), POP 002 (Triagem e Seleção de Candidatos), POP 003 (Processo de Admissão — only headers/links available).

## Clarifications

### Session 2026-04-16

- Q: Quando mais de um gestor avalia a entrevista final, qual é o critério para aprovação? → A: Unanimidade — qualquer reprovação encerra o processo como "Reprovado pelo gestor".
- Q: Por quanto tempo os dados pessoais de candidatos são retidos após o encerramento do processo (LGPD)? → A: 5 anos após o fim do processo; antecipação da anonimização apenas sob solicitação explícita do candidato.
- Q: Qual é o prazo de expiração temporal do link do Fit Cultural não submetido? → A: 3 dias corridos; depois o link expira e o status do candidato muda para "Sem retorno" automaticamente.
- Q: Como o sistema deve tratar edições concorrentes no mesmo recurso (ex: dois RHs movendo o mesmo candidato, gestores decidindo simultaneamente)? → A: Optimistic locking — compara versão/`updated_at` ao salvar; se houve alteração externa, rejeita a escrita e a UI avisa "este registro mudou, recarregue e tente de novo".
- Q: Quais são os alvos de disponibilidade e continuidade (SLO/RPO/RTO) para a v1? → A: 99,5% de uptime mensal (~3,6h downtime/mês aceitáveis); backup diário automático com retenção de 30 dias; RPO 24h, RTO 4h.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Abrir vaga e gerir aprovação do descritivo (Priority: P1)

O Gestor de uma das empresas atendidas identifica necessidade de contratação e
formaliza a abertura preenchendo um formulário dentro da plataforma. O RH
recebe a solicitação, gera o descritivo (apoiado por IA), submete para
aprovação do Gestor, registra a aprovação e marca a vaga como pronta para
divulgação. Tudo acontece dentro da plataforma — sem WhatsApp, e-mail ou
Notion paralelo.

**Why this priority**: Sem este passo, o pipeline não começa. É o gatilho de
todo o processo e hoje é o ponto de maior fricção (aprovação demora até 3
dias) por estar fragmentado entre Notion, Monday e e-mail. Resolver aqui
destrava o resto.

**Independent Test**: Pode ser totalmente validado pedindo para um Gestor
abrir uma vaga, RH escrever o descritivo, Gestor aprovar e a vaga aparecer
listada como "pronta para publicar". Entrega valor mesmo sem o restante do
pipeline porque já elimina o fluxo de aprovação manual entre ferramentas.

**Acceptance Scenarios**:

1. **Given** Gestor autenticado com permissão sobre uma empresa-cliente,
   **When** ele preenche o formulário de abertura informando empresa, setor,
   cargo, modalidade, contratação (CLT/PJ), carga horária, competências,
   faixa salarial e benefícios, **Then** uma nova vaga é criada com status
   "Aguardando descritivo" e o RH é notificado.
2. **Given** vaga em "Aguardando descritivo", **When** RH gera/edita e envia
   o descritivo para aprovação, **Then** o status muda para "Aguardando
   aprovação do gestor" e o gestor recebe notificação no app.
3. **Given** vaga em "Aguardando aprovação", **When** o Gestor solicita
   ajustes informando o que precisa mudar, **Then** o status volta para
   "Em ajuste pelo RH" e o histórico de revisões fica registrado.
4. **Given** vaga em "Aguardando aprovação", **When** o Gestor aprova,
   **Then** o status muda para "Pronta para publicar", a versão final do
   descritivo é congelada e gerada como PDF, e o RH recebe notificação.
5. **Given** vaga "Pronta para publicar", **When** RH registra os links das
   publicações externas (LinkedIn, Indeed, Instagram), **Then** a vaga muda
   para "Publicada" com data e links rastreáveis.

---

### User Story 2 - Receber candidatos e gerenciar triagem inicial (Priority: P2)

Currículos chegam por canais diversos (LinkedIn, Indeed, indicação, Instagram,
formulário público da vaga). RH cadastra cada candidato na plataforma — ou o
candidato preenche um formulário público que cria o registro automaticamente —
anexa o currículo, marca status inicial e move o candidato pelo pipeline
visual (Kanban) da vaga até a etapa "Convidado para Fit Cultural". O Fit
Cultural é enviado, preenchido e fica visível no perfil do candidato. RH
anexa também o resultado da checagem de antecedentes.

**Why this priority**: É a etapa mais cara de tempo (2-4h por vaga só na
triagem). Concentrar candidato + currículo + fit cultural + antecedentes em
um único perfil dentro do app elimina o vai-e-vem entre Notion, Drive,
WhatsApp e Jusbrasil.

**Independent Test**: Pode ser validado cadastrando 5 candidatos numa vaga
publicada, movendo-os pelo Kanban e confirmando que o RH consegue ver
currículo, fit cultural e antecedentes em uma única tela. Entrega valor
mesmo sem o módulo de entrevistas porque já consolida o "prontuário do
candidato".

**Acceptance Scenarios**:

1. **Given** vaga publicada, **When** RH cadastra um candidato (nome,
   contato, origem do CV) e anexa o arquivo do currículo, **Then** o
   candidato aparece na coluna "Recebido" do Kanban da vaga com link para
   download do CV.
2. **Given** candidato na coluna "Recebido", **When** RH o move para
   "Em interesse" e dispara a ação "Enviar Fit Cultural", **Then** o
   candidato recebe um link para preencher o questionário (sem precisar
   de login no app) e o RH vê status "Aguardando Fit Cultural".
3. **Given** candidato com Fit Cultural enviado, **When** o candidato
   preenche e submete o formulário, **Then** as respostas ficam visíveis
   no perfil do candidato dentro da vaga e o status passa para "Fit
   recebido".
4. **Given** candidato com Fit recebido, **When** RH anexa manualmente o
   resultado de checagem de antecedentes (PDF/anotações + flag
   limpo/com pendências), **Then** o resultado fica visível ao RH e ao
   Gestor da vaga, com flag visual destacando pendências.
5. **Given** candidato em qualquer coluna, **When** RH clica em "Recusar",
   **Then** uma mensagem padronizada (configurável) é registrada para envio
   ao candidato, o status final fica "Recusado" e o candidato sai do
   Kanban ativo mas permanece pesquisável.
6. **Given** mesmo CPF/e-mail aparece em outra vaga, **When** RH cadastra,
   **Then** o sistema avisa que candidato já existe e oferece reaproveitar
   o perfil (currículo, fit cultural prévio, histórico).

---

### User Story 3 - Conduzir entrevistas e registrar avaliações (Priority: P3)

RH agenda entrevistas (primeiro consigo, depois com o Gestor) usando a
plataforma como calendário. Após cada entrevista, RH anexa transcrição (vinda
de ferramenta externa) e/ou um resumo. O Gestor consulta tudo (CV, fit,
antecedentes, transcrição da entrevista do RH) antes da entrevista final e
registra sua decisão (aprovar/reprovar) com comentários.

**Why this priority**: É a etapa onde a decisão de contratar nasce. Hoje o
Gestor recebe os artefatos por mensagens, não tem visão consolidada e
frequentemente atrasa o feedback. Centralizar elimina retrabalho do RH e
acelera a decisão final.

**Independent Test**: Pode ser validado agendando uma entrevista,
registrando seu resultado (aprovado/reprovado/comentários), e verificando
que o histórico do candidato mostra todas as etapas com responsáveis,
datas e resumos. Entrega valor mesmo sem trigger automático para admissão.

**Acceptance Scenarios**:

1. **Given** candidato na coluna "Apto para entrevista RH", **When** RH
   agenda uma entrevista RH (data, hora, link da reunião remota ou local),
   **Then** o candidato aparece na coluna "Entrevista RH agendada" com a
   data e o RH/Gestor recebe notificação 24h antes.
2. **Given** entrevista RH realizada, **When** RH anexa transcrição (texto
   colado ou arquivo) e/ou resumo, **Then** o conteúdo fica salvo na timeline
   do candidato e o status pode mudar para "Apto para entrevista final".
3. **Given** candidato apto para entrevista final, **When** RH agenda a
   entrevista final marcando o(s) Gestor(es) avaliador(es), **Then** o
   Gestor é notificado e ganha acesso de leitura ao prontuário completo
   do candidato (CV, fit, antecedentes, transcrição RH).
4. **Given** entrevista final realizada, **When** Gestor registra decisão
   (aprovar/reprovar) com comentários, **Then** o status do candidato muda
   para "Aprovado" ou "Reprovado pelo gestor" e o RH é notificado.
5. **Given** Gestor reprova, **When** RH escolhe a mensagem de retorno,
   **Then** o registro indica que a comunicação foi feita (mesmo que o envio
   da mensagem em si seja externo).

---

### User Story 4 - Visão consolidada do pipeline e métricas para o RH (Priority: P3)

RH precisa ver, num único dashboard, todas as vagas em andamento, quantos
candidatos estão em cada etapa, gargalos (vagas paradas há X dias na mesma
etapa, gestor com aprovações pendentes) e métricas mensais (tempo médio
por vaga, taxa de conversão por etapa, vagas por empresa).

**Why this priority**: É o que justifica "tirar o RH da operação repetitiva"
— ter visão de pipeline em tempo real. Sem isso, a plataforma só substitui
ferramentas; com isso, ela vira um instrumento de gestão.

**Independent Test**: Pode ser validado abrindo o dashboard com pelo menos
3 vagas e 10 candidatos distribuídos em estágios diferentes e confirmando
que os números batem com o que está no Kanban e que filtros por empresa,
gestor e período funcionam.

**Acceptance Scenarios**:

1. **Given** múltiplas vagas ativas, **When** RH abre o dashboard de hiring,
   **Then** vê total de vagas por status, total de candidatos por etapa
   atual, e top vagas por idade (vagas mais antigas em aberto).
2. **Given** vagas com gargalos (mais de 3 dias parada na mesma etapa),
   **When** RH abre o dashboard, **Then** essas vagas aparecem destacadas
   com motivo aparente (ex: "Aguardando aprovação do gestor há 5 dias").
3. **Given** período fechado (ex: mês passado), **When** RH consulta as
   métricas, **Then** vê tempo médio do processo, taxa de conversão por
   etapa, taxa final de aprovação, número de vagas fechadas e ainda em
   aberto.
4. **Given** Gestor com permissão sobre uma empresa, **When** ele abre o
   dashboard, **Then** vê apenas vagas da(s) empresa(s) sob sua
   responsabilidade.

---

### User Story 5 - Aprovação dispara criação do colaborador (Priority: P4)

Quando o candidato é aprovado pelo Gestor, o RH inicia o processo de
admissão. No mínimo, a aprovação cria automaticamente um pré-cadastro do
futuro colaborador no módulo existente do app (perfil + atribuição a time
+ líder), de modo que, no primeiro dia, ele já entra no fluxo de gestão de
talentos (avaliações, 1:1s, PDIs).

**Why this priority**: É o que conecta o módulo novo (hiring) ao módulo
existente (gestão de talentos), evitando redigitação. Mas pode esperar até
P1-P3 estarem entregues.

**Independent Test**: Validado aprovando um candidato e confirmando que ele
aparece como pré-cadastro de colaborador, vinculado à empresa/time/líder
corretos, com o histórico do processo seletivo arquivado e referenciado.

**Acceptance Scenarios**:

1. **Given** candidato aprovado pelo Gestor, **When** RH confirma "Iniciar
   admissão", **Then** um pré-cadastro de colaborador é criado, o histórico
   do processo seletivo fica linkado ao perfil, e o candidato sai do Kanban
   ativo entrando no estado "Em admissão".
2. **Given** pré-cadastro criado, **When** RH preenche dados de
   contratação (data de início, cargo final, regime CLT/PJ, custo,
   líder direto, time), **Then** ao confirmar, o registro vira um
   colaborador efetivo no módulo de gestão de talentos.

---

### Edge Cases

- **Candidato em múltiplas vagas simultaneamente**: o sistema deve manter
  um único perfil de candidato (chaveado por CPF ou e-mail) e mostrar em
  quais processos ele está/esteve.
- **Vaga cancelada antes de publicar**: deve ser possível cancelar com
  motivo registrado; candidatos já cadastrados ficam arquivados junto à
  vaga, não somem.
- **Vaga reaberta**: criar nova vaga reaproveitando o descritivo da
  anterior em um clique.
- **Gestor não aprova nem rejeita o descritivo em prazo configurado**:
  vaga aparece em "atrasada" no dashboard e o RH é alertado para
  cobrar.
- **Candidato não preenche Fit Cultural após 3 dias**: o link expira
  automaticamente, o status da candidatura muda para "Sem retorno" e
  o RH é notificado com a opção de gerar e reenviar um novo link.
- **Candidato externo sem CPF (ex: estrangeiro, freelancer PJ)**:
  cadastro permite identificador alternativo (passaporte, e-mail) e a
  checagem de antecedentes pode ser marcada como "não aplicável" com
  justificativa.
- **Múltiplos gestores avaliadores na entrevista final**: cada um
  registra sua decisão individualmente; a aprovação só é final quando
  **todos** os gestores designados aprovam (unanimidade). Qualquer
  reprovação individual encerra o processo como "Reprovado pelo gestor",
  independentemente das decisões dos demais. Enquanto ainda faltar
  algum gestor decidir, o status permanece "Aguardando decisão dos
  gestores" e o candidato fica visível para todos os avaliadores
  pendentes.
- **Vaga confidencial**: marcada como "restrita", visível apenas a RH
  e Gestor explicitamente designados; não aparece para outros gestores
  da mesma empresa.
- **Candidato pede para ser removido (LGPD)**: RH consegue anonimizar
  o perfil mantendo dados estatísticos agregados. Independentemente
  desse pedido, todos os candidatos com processo encerrado há mais de
  5 anos são anonimizados automaticamente por rotina agendada.

## Requirements *(mandatory)*

### Functional Requirements

**Vaga (Job Opening)**

- **FR-001**: Sistema MUST permitir ao Gestor abrir uma vaga preenchendo
  formulário com pelo menos: empresa-cliente, setor, cargo, função
  resumida, modalidade (presencial/remoto/híbrido), tipo de contratação
  (CLT/PJ/Estágio/PJ-Equity), carga horária, competências exigidas,
  faixa salarial e benefícios.
- **FR-002**: Sistema MUST manter um ciclo de vida de vaga com pelo menos
  os estados: Aguardando descritivo → Em ajuste pelo RH → Aguardando
  aprovação do gestor → Pronta para publicar → Publicada → Em triagem
  → Encerrada (com motivo: contratado, cancelado, congelado).
- **FR-003**: Sistema MUST registrar histórico de alterações no descritivo
  com versionamento (ver versões anteriores e quem alterou).
- **FR-004**: Sistema MUST permitir ao RH gerar PDF do descritivo final
  aprovado.
- **FR-005**: Sistema MUST permitir ao RH registrar manualmente as URLs
  das publicações externas (LinkedIn, Indeed, Instagram, outros) por
  vaga.
- **FR-006**: Sistema MUST emitir notificações in-app para Gestor (quando
  descritivo aguarda aprovação ou candidato aguarda decisão) e para RH
  (quando vaga é solicitada, descritivo é aprovado/rejeitado, candidato
  preenche Fit Cultural).
- **FR-007**: Sistema MUST permitir ao RH registrar manualmente as URLs
  das publicações externas em LinkedIn, Indeed, Instagram e outros canais
  por vaga, com data de publicação e responsável. Publicação automática
  via API nesses canais é explicitamente fora do escopo desta v1
  (preserva o limite de "1 vaga grátis por conta" do LinkedIn já
  utilizado pelas contas pessoais de Laura, Eryk e Leonardo).

**Candidato e Candidatura (Application)**

- **FR-008**: Sistema MUST permitir cadastrar candidato com dados de
  contato (nome, e-mail, telefone), origem do CV, vínculo a uma vaga e
  upload do currículo (PDF/DOC).
- **FR-009**: Sistema MUST identificar candidato duplicado por e-mail
  (primário) ou CPF e oferecer reaproveitamento do perfil em nova vaga.
- **FR-010**: Sistema MUST organizar os candidatos de cada vaga em um
  Kanban com colunas correspondendo às etapas do processo: Recebido →
  Em interesse → Aguardando Fit Cultural → Fit recebido → Antecedentes
  ok → Apto para entrevista RH → Entrevista RH agendada → Entrevista RH
  feita → Apto para entrevista final → Entrevista final agendada →
  Aprovado / Reprovado / Recusado.
- **FR-011**: Sistema MUST permitir mover candidato entre colunas (drag
  and drop ou ação explícita) e registrar quem moveu, quando, e
  comentário opcional.
- **FR-012**: Sistema MUST manter timeline cronológica do candidato com
  todos os eventos (cadastro, mudanças de status, fit cultural recebido,
  antecedentes anexados, entrevistas, decisões).

**Fit Cultural**

- **FR-013**: Sistema MUST permitir ao RH/Sócio criar e editar
  questionários de Fit Cultural reutilizáveis (templates por tipo de
  vaga ou cliente).
- **FR-014**: Sistema MUST permitir disparar envio de questionário a um
  candidato gerando um link único.
- **FR-015**: Sistema MUST oferecer um formulário web público (sem
  necessidade de login do candidato) acessível por link único e
  intransferível, no qual o candidato preenche e submete o Fit Cultural
  diretamente na plataforma. As respostas ficam armazenadas no banco
  vinculadas à candidatura. O link MUST expirar/invalidar após submissão
  e também **MUST expirar automaticamente 3 dias corridos após o
  envio** caso o candidato não submeta; nessa expiração por tempo, o
  status da candidatura transita automaticamente para "Sem retorno" e
  o RH é notificado com opção de reenvio (novo link). O link MUST ter
  proteção mínima contra spam/abuso (p.ex., rate limiting e campos
  honeypot). Esta v1 NÃO oferece portal autenticado para o candidato
  (nada além do formulário público).
- **FR-016**: Sistema MUST exibir respostas do Fit Cultural lado a lado
  com a referência da empresa (cultura/valores) para facilitar análise.

**Checagem de Antecedentes**

- **FR-017**: Sistema MUST permitir ao RH anexar o resultado da checagem
  de antecedentes (arquivo PDF + flag: limpo, pendência leve, pendência
  grave, não aplicável + nota livre).
- **FR-018**: Sistema MUST destacar visualmente candidatos com pendências
  em qualquer tela (Kanban, perfil, dashboard).

**Entrevistas**

- **FR-019**: Sistema MUST permitir agendar entrevista (RH ou Final)
  com data, hora, duração, modalidade (presencial/remota), link/local
  e participantes (RH e/ou Gestores).
- **FR-020**: Sistema MUST permitir anexar à entrevista a transcrição
  (texto colado ou arquivo importado) e/ou um resumo, e exibir esse
  conteúdo no perfil do candidato.
- **FR-021**: Sistema MUST notificar participantes 24h antes da
  entrevista agendada.
- **FR-022**: Sistema MUST registrar resultado da entrevista (apto/não
  apto/aguardando + comentários do entrevistador).

**Decisão final e admissão**

- **FR-023**: Sistema MUST permitir ao Gestor registrar decisão final
  (aprovar/reprovar) com comentário obrigatório no caso de reprovação.
  Quando a entrevista final tiver múltiplos gestores avaliadores, cada
  um registra sua decisão de forma independente e a aprovação do
  candidato só é consolidada sob **unanimidade** (todos aprovam); a
  primeira reprovação individual encerra o processo como "Reprovado
  pelo gestor", mesmo que os demais ainda não tenham decidido.
- **FR-024**: Sistema MUST manter mensagens padronizadas de retorno
  (recusa, aprovação para próxima etapa, oferta), editáveis por RH.
- **FR-025**: Sistema MUST disparar, ao aprovar candidato, a criação
  de um pré-cadastro de colaborador vinculado à empresa/time/líder
  apropriados, com referência ao histórico do processo seletivo.
- **FR-026**: Sistema MUST marcar o status do candidato aprovado como
  "Em admissão" e, ao concluir, "Admitido", disparando a criação do
  pré-cadastro de colaborador conforme FR-025. O processo de admissão
  formal (contratos CLT/PJ, coleta de documentos, exame admissional,
  assinatura de contrato) é explicitamente fora do escopo desta v1 e
  continua sendo conduzido em ferramentas/processos externos. Uma
  especificação separada cobrirá o POP 003 quando ele estiver detalhado.

**Permissões e visibilidade**

- **FR-027**: Sistema MUST restringir visibilidade de vagas e candidatos
  por empresa: Gestor vê apenas vagas das empresas em que tem permissão;
  RH/Sócio veem todas; vagas marcadas como confidenciais só são visíveis
  a participantes designados.
- **FR-028**: Sistema MUST registrar log de quem visualizou e alterou
  cada candidato para fins de auditoria.
- **FR-029**: Sistema MUST permitir anonimização de candidato a pedido
  (LGPD), preservando dados estatísticos agregados. O sistema MUST
  reter dados pessoais identificáveis de candidatos (nome, contato,
  CV, respostas de Fit Cultural, antecedentes) por até **5 anos após
  o encerramento do processo seletivo** (reprovado/contratado/cancelado)
  e, passado esse período, anonimizar automaticamente mantendo apenas
  dados agregados para métricas históricas. A antecipação da
  anonimização ocorre **apenas sob solicitação explícita do
  candidato**, registrada com data, canal e responsável pelo
  atendimento.

**Dashboard e métricas**

- **FR-030**: Sistema MUST oferecer um dashboard de pipeline mostrando,
  no mínimo: vagas por status, candidatos por etapa, vagas em gargalo
  (>3 dias parada na mesma etapa), tempo médio por vaga, taxa de
  conversão por etapa, taxa final de aprovação. Tudo filtrável por
  empresa, gestor e período.
- **FR-031**: Sistema MUST exportar dados de pipeline e candidatos em
  CSV para uso externo (relatórios para clientes).

**Concorrência e integridade**

- **FR-032**: Sistema MUST aplicar **optimistic locking** em todos os
  recursos mutáveis críticos (vaga, descritivo, candidato, candidatura,
  decisão final, entrevista). Toda escrita MUST incluir o identificador
  de versão (`updated_at` ou equivalente) carregado no momento da
  leitura; se esse identificador divergir do valor atual no banco no
  momento do commit, a escrita MUST ser rejeitada e a UI MUST exibir
  uma mensagem explícita pedindo para o usuário recarregar o registro
  e reaplicar sua mudança. Edições que passem apenas pelo último-
  vencedor (silencioso) NÃO são aceitáveis.
- **FR-033**: Sistema MUST registrar no log de auditoria (FR-028)
  tanto as escritas bem-sucedidas quanto as tentativas rejeitadas por
  conflito, incluindo usuário, recurso, timestamp e a versão esperada
  vs. encontrada, para diagnóstico e suporte.

### Key Entities

- **Job Opening (Vaga)**: a posição em aberto. Atributos: empresa-cliente,
  cargo, status no ciclo de vida, gestor solicitante, prazo desejado,
  modalidade, contratação, faixa salarial, vaga confidencial sim/não,
  links das publicações externas, data de abertura, data de
  encerramento.
- **Job Description (Descritivo)**: documento associado a uma vaga, com
  versionamento; estado de aprovação (rascunho, enviado, aprovado,
  rejeitado); autor; aprovador; PDF gerado quando aprovado.
- **Candidate (Candidato)**: pessoa cadastrada (única por e-mail/CPF),
  com dados de contato, currículo, origem; pode estar associada a várias
  Applications.
- **Application (Candidatura)**: relacionamento entre Candidate e Job
  Opening, com etapa atual no Kanban, data de entrada na etapa, motivo
  de saída se aplicável.
- **Cultural Fit Survey (Questionário de Fit Cultural)**: template
  reutilizável de perguntas, ligado opcionalmente a uma empresa-cliente
  ou tipo de vaga; coleção de perguntas com tipos (escala, texto,
  múltipla escolha).
- **Cultural Fit Response (Resposta)**: respostas de um candidato a um
  questionário enviado, com timestamp, resposta por pergunta e
  consolidação.
- **Background Check (Checagem de Antecedentes)**: registro associado a
  uma Application, com flag de status, arquivo anexado, observações,
  responsável pela conferência.
- **Interview (Entrevista)**: agendamento associado a uma Application,
  com tipo (RH ou Final), participantes (RH/Gestores), data/hora,
  modalidade, link, status (agendada/realizada/cancelada), transcrição
  e/ou resumo, decisão do entrevistador.
- **Hiring Decision (Decisão Final)**: registro do Gestor após entrevista
  final, com aprovado/reprovado, comentários, data; aprovação dispara
  pré-cadastro de colaborador.
- **Recruitment Document (Documento)**: anexos avulsos do processo
  (descritivos PDF, currículos, fit cultural exportado, transcrições),
  organizados por vaga e por candidato.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: O tempo total de um processo de hiring (da abertura da vaga
  até a decisão final do gestor) cai de 5-10 dias para no máximo 7 dias
  em pelo menos 70% dos processos, dentro de 3 meses após o lançamento.
- **SC-002**: O esforço humano do RH em tarefas de rastreamento (mover
  cards, atualizar planilhas, recopiar dados entre ferramentas) por
  vaga cai de 6-8 horas-pessoa para no máximo 3 horas-pessoa.
- **SC-003**: 100% dos candidatos ativos têm seu prontuário completo
  (CV + fit cultural + antecedentes + histórico de entrevistas) acessível
  numa única tela dentro do app — fim do uso paralelo de Notion + Drive
  + WhatsApp para tracking de candidatos.
- **SC-004**: Aprovação do descritivo pelo Gestor acontece em até 24h em
  pelo menos 80% das vagas (vs. até 3 dias atualmente).
- **SC-005**: 100% das vagas aprovadas resultam em pré-cadastro de
  colaborador criado dentro do app sem redigitação manual de dados
  básicos (nome, e-mail, empresa, time, líder).
- **SC-006**: O Gestor consegue, antes da entrevista final, abrir o
  prontuário do candidato em menos de 30 segundos a partir da
  notificação recebida.
- **SC-007**: O dashboard de pipeline mostra dados em tempo real (no
  máximo 1 minuto de defasagem em relação à última ação).
- **SC-008**: Pelo menos 90% dos usuários (RH e Gestores) classificam a
  experiência como "melhor que a anterior" em pesquisa qualitativa após
  60 dias de uso.
- **SC-009**: O app mantém disponibilidade mensal de **pelo menos
  99,5%** (~3,6h de downtime aceitáveis por mês), medida sobre a
  janela de horário comercial do cliente (segunda a sexta, 08h–20h
  BRT) e reportada em dashboard operacional.
- **SC-010**: Backups automáticos são executados **diariamente**,
  retidos por **30 dias**, e validados mensalmente por restore de
  teste. Em caso de desastre, o **RPO máximo é de 24h** (perda máxima
  tolerada) e o **RTO máximo é de 4h** (tempo máximo para restaurar
  operação).

## Assumptions

- **Plataforma única**: a plataforma alvo é o app existente Lever Talents
  Hub. O módulo de hiring é adicionado, não substitui um sistema externo
  separado.
- **Pré-requisito de fundação**: as quebras conhecidas das fundações
  (papéis/roles fora de sincronia, autenticação de admin via browser,
  edge functions abertas) são corrigidas antes ou em paralelo, conforme
  Princípios I, II e IV da constituição. Esta spec assume autenticação
  funcional, RLS habilitada e edge functions seguras.
- **Empresas-cliente já modeladas**: a entidade `companies` já existe no
  app e é reutilizada; vagas pertencem a uma empresa-cliente existente.
- **Roles**: papéis usados são os já definidos na constituição
  (`socio`, `rh`, `lider`/Gestor, `colaborador`, `admin`). Não é
  introduzido um papel "Recrutador" separado; RH e Sócio cobrem essa
  função.
- **Comunicação com candidato**: o envio das mensagens em si (recusa,
  convite para fit cultural) pode acontecer fora do app (e-mail,
  WhatsApp), mas o registro do envio (data + responsável + texto)
  fica na plataforma. Integrações nativas com canais de comunicação
  são fora do escopo desta v1.
- **Storage**: arquivos (CV, descritivo PDF, transcrições) são
  armazenados nos buckets de storage da plataforma (já provisionada),
  com políticas de acesso espelhando as regras de visibilidade.
- **Métricas de tempo**: a contagem do tempo do processo começa na
  abertura da vaga e termina na decisão final do gestor (não inclui
  admissão).
- **Cobertura geográfica**: a plataforma opera em português do Brasil,
  para empresas brasileiras, com referências de antecedentes
  brasileiras (Jusbrasil/Escavador) — a checagem em si continua
  externa e seu resultado é anexado.
- **Captação automática de currículos**: integrações automáticas com
  LinkedIn/Indeed/Instagram (importar candidatos sem digitação) são
  fora do escopo desta v1; entrada de candidato é por cadastro manual
  do RH ou por formulário público da vaga preenchido pelo candidato.
- **Publicação de vagas**: a publicação em LinkedIn/Indeed/Instagram
  continua manual nesta v1, executada fora da plataforma; o app
  apenas registra os links resultantes (decisão Q1 — preserva o limite
  de "1 vaga grátis por conta" do LinkedIn).
- **Fit Cultural**: o candidato preenche em formulário web público da
  plataforma (sem login). A v1 não oferece portal autenticado para
  candidatos — qualquer outra interação acontece por canal externo
  (e-mail/WhatsApp), com registro do envio guardado no app
  (decisão Q2).
- **Admissão (POP 003) fora do escopo**: a admissão formal continua
  sendo conduzida fora desta plataforma. A v1 só marca status
  "Em admissão" e "Admitido", e dispara o pré-cadastro de colaborador
  no módulo existente. Detalhamento do POP 003 fica para
  especificação separada (decisão Q3).
- **Compatibilidade com módulo existente**: o trigger de criação de
  colaborador reutiliza a estrutura existente (`profiles`,
  `team_members`, `companies`, `teams`); não cria modelo paralelo.
- **Volume de referência**: a plataforma é dimensionada para o volume
  atual do RH (5-10 vagas/mês, ~200 candidatos/mês) com folga para
  3x esse volume nos próximos 12 meses.
