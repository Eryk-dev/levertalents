import React from 'react';
import { describe, it } from 'vitest';

void React;

// Wave 0 skeleton — Plan 02-08 implementa CandidateCard refactor (D-07/D-08/D-10).

describe.skip('CandidateCard', () => {
  it.todo('renderiza mínimo D-07: nome + cargo + dias-na-etapa + vaga');
  it.todo('oculta avatar quando prefs.showAvatar=false');
  it.todo('mostra avatar quando prefs.showAvatar=true');
  it.todo('aplica border-l-status-amber para SLA warning (≥2d)');
  it.todo('aplica border-l-status-red para SLA critical (≥5d)');
  it.todo('não aplica stripe (border-l-transparent) para SLA ok');
  it.todo('exibe próxima entrevista quando prefs.showNextInterview=true');
  it.todo('formata dias com tabular-nums');
  it.todo('clique chama onOpen com application id');
});

// TODO Plan 02-08: remover .skip e implementar
