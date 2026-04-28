import { useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, SectionHeader, Chip } from '@/components/primitives/LinearKit';
import { usePlaudInput } from '@/hooks/usePlaudInput';

/**
 * OneOnOneNotes — notes section with two dedicated Plaud textareas.
 * D-12/D-14: transcricao_plaud + resumo_plaud persisted in meeting_structure JSONB.
 * INV-3-11: Plaud paste warning shown when text < 50 chars.
 * D-18: extracted from OneOnOneMeetingForm monolith.
 */
export interface OneOnOneNotesProps {
  notes: string;
  onNotesChange: (v: string) => void;
  transcricaoPlaud: string;
  onTranscricaoPlaudChange: (v: string) => void;
  resumoPlaud: string;
  onResumoPlaudChange: (v: string) => void;
}

export function OneOnOneNotes(props: OneOnOneNotesProps) {
  const transcricao = usePlaudInput(props.transcricaoPlaud);
  const resumo = usePlaudInput(props.resumoPlaud);

  // Propagate internal state changes to parent
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { props.onTranscricaoPlaudChange(transcricao.value); }, [transcricao.value]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { props.onResumoPlaudChange(resumo.value); }, [resumo.value]);

  return (
    <Card>
      <SectionHeader title="Notas" />
      <div className="space-y-4">

        {/* Free-form notes */}
        <div>
          <Label htmlFor="notes-textarea">Notas livres</Label>
          <Textarea
            id="notes-textarea"
            value={props.notes}
            onChange={(e) => props.onNotesChange(e.target.value)}
            placeholder="Notas durante o 1:1…"
            rows={5}
          />
        </div>

        {/* Transcrição (Plaud) */}
        <div>
          <Label htmlFor="plaud-transcript">Transcrição (Plaud)</Label>
          <p className="text-xs text-text-subtle mb-1">
            Cole a transcrição que o app Plaud gerou.
          </p>
          <Textarea
            id="plaud-transcript"
            value={transcricao.value}
            onChange={(e) => transcricao.setValue(e.target.value)}
            onPaste={transcricao.handlePaste}
            rows={8}
          />
          {transcricao.warning === 'short' && (
            <span className="inline-flex mt-1">
              <Chip color="amber" size="sm">
                Texto curto demais — confira se colou a transcrição inteira.
              </Chip>
            </span>
          )}
        </div>

        {/* Resumo (Plaud) */}
        <div>
          <Label htmlFor="plaud-summary">Resumo (Plaud)</Label>
          <p className="text-xs text-text-subtle mb-1">
            Cole o resumo já pronto do app Plaud.
          </p>
          <Textarea
            id="plaud-summary"
            value={resumo.value}
            onChange={(e) => resumo.setValue(e.target.value)}
            onPaste={resumo.handlePaste}
            rows={4}
          />
        </div>

      </div>
    </Card>
  );
}
