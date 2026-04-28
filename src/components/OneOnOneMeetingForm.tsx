import { useState } from 'react';
import type { Database } from '@/integrations/supabase/types';
import { Btn, Chip } from '@/components/primitives/LinearKit';
import { OneOnOneRHVisibleBadge } from './OneOnOneRHVisibleBadge';
import { OneOnOneAgenda } from './OneOnOneAgenda';
import { OneOnOneNotes } from './OneOnOneNotes';
import { OneOnOneActionItems } from './OneOnOneActionItems';
import { OneOnOnePDIPanel } from './OneOnOnePDIPanel';
import { OneOnOneRHNote } from './OneOnOneRHNote';
import { useUpdateOneOnOne } from '@/hooks/useOneOnOnes';
import { toast } from 'sonner';
import type { AgendaItem } from '@/hooks/useAgendaState';
import type { ActionItem } from '@/hooks/useActionItemsState';

/**
 * OneOnOneMeetingForm — orchestrator for 1:1 meeting detail view.
 * D-18: Monolith split; this orchestrator is < 300 ln.
 * D-19: State managed via 4 extracted hooks + 6 sub-components.
 * Layout (UI-SPEC §"1:1 form layout"):
 *   sticky header: title + RHVisibleBadge + status chip + Save button
 *   sections: Pauta → Notas → Action items → PDI → Notas RH (admin/rh only)
 */

type OneOnOneRow = Database['public']['Tables']['one_on_ones']['Row'];

/** Shape of the meeting_structure JSONB column (D-14). */
interface MeetingStructure {
  agenda_items?: AgendaItem[];
  action_items?: ActionItem[];
  transcricao_plaud?: string;
  resumo_plaud?: string;
  notes?: string;
  // Legacy fields from audio-recording flow — preserved for backward compat
  pdi_review?: string;
  roteiro?: string;
  transcricao?: string;
  resumo?: string;
  audio_duration?: number;
}

export interface OneOnOneMeetingFormProps {
  meeting: OneOnOneRow;
}

export function OneOnOneMeetingForm({ meeting }: OneOnOneMeetingFormProps) {
  const ms = (meeting.meeting_structure ?? {}) as MeetingStructure;

  const [agendaItems, setAgendaItems] = useState<AgendaItem[]>(
    ms.agenda_items ?? [],
  );
  const [actionItems, setActionItems] = useState<ActionItem[]>(
    ms.action_items ?? [],
  );
  const [notes, setNotes] = useState(ms.notes ?? '');
  const [transcricaoPlaud, setTranscricaoPlaud] = useState(
    ms.transcricao_plaud ?? '',
  );
  const [resumoPlaud, setResumoPlaud] = useState(ms.resumo_plaud ?? '');

  const update = useUpdateOneOnOne();

  const handleSave = () => {
    update.mutate(
      {
        id: meeting.id,
        meeting_structure: {
          ...ms,
          agenda_items: agendaItems,
          action_items: actionItems,
          notes,
          transcricao_plaud: transcricaoPlaud,
          resumo_plaud: resumoPlaud,
        },
      },
      {
        onSuccess: () => toast.success('1:1 salva'),
        onError: (e) =>
          toast.error('Não foi possível salvar', { description: e.message }),
      },
    );
  };

  const statusColor: 'green' | 'amber' | 'blue' =
    meeting.status === 'completed'
      ? 'green'
      : meeting.status === 'in-progress'
        ? 'amber'
        : 'blue';

  const scheduledLabel = meeting.scheduled_date
    ? new Date(meeting.scheduled_date).toLocaleDateString('pt-BR')
    : meeting.scheduled_at
      ? new Date(meeting.scheduled_at as string).toLocaleDateString('pt-BR')
      : '—';

  return (
    <div className="space-y-4">
      {/* Sticky header */}
      <header className="sticky top-0 bg-bg z-10 flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <h1 className="text-display-md">1:1 — {scheduledLabel}</h1>
          <OneOnOneRHVisibleBadge />
          <Chip color={statusColor} size="sm">
            {meeting.status}
          </Chip>
        </div>
        <Btn
          variant="accent"
          onClick={handleSave}
          disabled={update.isPending}
        >
          {update.isPending ? 'Salvando…' : 'Salvar 1:1'}
        </Btn>
      </header>

      {/* Sections in fixed order (UI-SPEC §"1:1 form layout") */}
      <main className="space-y-6 px-4 pb-12">
        <OneOnOneAgenda items={agendaItems} onChange={setAgendaItems} />

        <OneOnOneNotes
          notes={notes}
          onNotesChange={setNotes}
          transcricaoPlaud={transcricaoPlaud}
          onTranscricaoPlaudChange={setTranscricaoPlaud}
          resumoPlaud={resumoPlaud}
          onResumoPlaudChange={setResumoPlaud}
        />

        <OneOnOneActionItems items={actionItems} onChange={setActionItems} />

        <OneOnOnePDIPanel
          collaboratorId={meeting.collaborator_id}
          meetingId={meeting.id}
        />

        {/* D-17/T-3-01: RHNote renders null internally when user lacks RhNote ability */}
        <OneOnOneRHNote meetingId={meeting.id} />
      </main>
    </div>
  );
}
