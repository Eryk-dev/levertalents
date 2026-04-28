// Fixture for one_on_ones table (Wave 2 one1 migration adds company_id + Plaud fields)
// INV-3-14: rh_notes are in a separate table (one_on_one_rh_notes), not inline
// Plaud integration: transcricao_plaud + resumo_plaud stored in meeting_structure JSONB
export type OneOnOneFixture = {
  id: string;
  company_id: string;
  leader_id: string;
  collaborator_id: string;
  scheduled_at: string;
  status: 'scheduled' | 'in-progress' | 'completed';
  meeting_structure: {
    agenda_items?: Array<{ id: string; text: string; checked: boolean }>;
    action_items?: Array<{
      id: string;
      text: string;
      assignee_id: string;
      due_date: string | null;
      checked: boolean;
    }>;
    transcricao_plaud?: string;
    resumo_plaud?: string;
  };
  rh_notes?: string | null;
};

export function buildOneOnOne(overrides?: Partial<OneOnOneFixture>): OneOnOneFixture {
  return {
    id: 'meet-0001',
    company_id: 'company-0001',
    leader_id: 'user-leader-0001',
    collaborator_id: 'user-member-0001',
    scheduled_at: new Date().toISOString(),
    status: 'scheduled',
    meeting_structure: {
      agenda_items: [],
      action_items: [],
      transcricao_plaud: '',
      resumo_plaud: '',
    },
    rh_notes: null,
    ...overrides,
  };
}
