import React from 'react';
import { describe, it } from 'vitest';

void React;

// Wave 0 skeleton — Plan 02-09 quebra src/components/hiring/CandidateDrawer.tsx
// (867 linhas) em Header/Tabs/Content. Tests aqui validam o comportamento
// preservado pós-refactor.

describe.skip('CandidateDrawer', () => {
  it.todo('ESC fecha drawer e chama onClose');
  it.todo('click-outside fecha drawer');
  it.todo('activeTab vem de useSearchParams ?tab=');
  it.todo('trocar tab atualiza URL (?tab=interviews)');
  it.todo('preserva scrollTop do board parent');
  it.todo('exibe sub-componentes Header/Tabs/Content');
  it.todo('Audit log tab oculta quando role !== rh|admin');
  it.todo('Audit log tab visível para is_people_manager');
  it.todo('largura 480px desktop / full-width mobile');
});

// TODO Plan 02-09: remover .skip e implementar
