import React from 'react';
import { describe, it } from 'vitest';

void React;

// Wave 0 skeleton — Plan 02-07 modifica PublicApplicationForm.tsx para
// 3 LGPD checkboxes não pré-marcados (TAL-04 + TAL-06).

describe.skip('PublicApplicationForm — LGPD opt-in', () => {
  it.todo('3 LGPD checkboxes não pré-marcados (defaultChecked=false)');
  it.todo(
    'checkbox visíveis: incluir_no_banco_de_talentos_global, compartilhar_com_cliente_externo, manter_cv_pos_recusa'
  );
  it.todo('submit bloqueia sem consent_aplicacao_vaga (literal true)');
  it.todo('submit envia formData.consents JSON.stringify({ ... })');
  it.todo('microcopy LGPD aparece sob cada checkbox (UI-SPEC §"LGPD opt-in copy")');
  it.todo('sem nenhum opt-in marcado, application ainda submete (apenas vaga atual)');
  it.todo('formata erro de consent_aplicacao_vaga via Zod errorMap em PT-BR');
});

// TODO Plan 02-07: remover .skip e implementar
