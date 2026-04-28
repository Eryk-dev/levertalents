import { useState, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Card, SectionHeader, Btn, Chip } from '@/components/primitives/LinearKit';
import { useAbility } from '@/features/tenancy/lib/abilityContext';
import {
  useOneOnOneRhNotes,
  useUpsertOneOnOneRhNote,
} from '@/hooks/useOneOnOneRhNotes';

interface Props {
  meetingId: string;
}

/**
 * OneOnOneRHNote — RH-only notes section for 1:1 meetings.
 * D-17: persisted in one_on_one_rh_notes (separate table); RLS blocks liderado/líder.
 * T-3-01: defense-in-depth — component absent from DOM (not display:none) when no access.
 * INV-3-14: RLS server-side + CASL UI-layer double gate.
 */
export function OneOnOneRHNote({ meetingId }: Props) {
  const ability = useAbility();

  // Anti-spoof: remove from DOM entirely if user cannot read RhNote.
  // RLS is the real security boundary; this is UI-layer defense-in-depth.
  if (!ability.can('read', 'RhNote')) return null;

  return <RHNoteInner meetingId={meetingId} />;
}

/** Inner component — only mounted when user has access (avoids hook ordering issues). */
function RHNoteInner({ meetingId }: Props) {
  const { data, isLoading } = useOneOnOneRhNotes(meetingId);
  const upsert = useUpsertOneOnOneRhNote();
  const [notes, setNotes] = useState(data?.notes ?? '');

  useEffect(() => {
    if (data) setNotes(data.notes ?? '');
  }, [data]);

  if (isLoading) return null;

  return (
    <Card className="border-l-4 border-l-status-purple">
      <SectionHeader
        title={
          <span className="flex items-center gap-2">
            Notas RH
            <Chip color="purple" size="sm">RH-only</Chip>
          </span>
        }
      />
      <p className="text-xs text-text-subtle mb-2">Visível apenas para RH.</p>
      <Textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={5}
        placeholder="Notas internas — não vão para líder/liderado"
      />
      <Btn
        variant="primary"
        size="sm"
        className="mt-2"
        disabled={upsert.isPending}
        onClick={() => upsert.mutate({ meeting_id: meetingId, notes })}
      >
        {upsert.isPending ? 'Salvando…' : 'Salvar nota RH'}
      </Btn>
    </Card>
  );
}
