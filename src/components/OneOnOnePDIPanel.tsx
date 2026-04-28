import { useState, useCallback } from 'react';
import { Card, SectionHeader } from '@/components/primitives/LinearKit';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { PDIFormIntegrated } from '@/components/PDIFormIntegrated';
import type { PDIFormData } from '@/hooks/usePDIIntegrated';
import { usePDIIntegrated } from '@/hooks/usePDIIntegrated';
import { toast } from 'sonner';

/**
 * OneOnOnePDIPanel — collapsible PDI integration panel.
 * D-18: extracted from OneOnOneMeetingForm monolith.
 * Default: collapsed (open=false). Reuses existing PDIFormIntegrated component.
 * Deviation [Rule 1 - Bug]: PDIFormIntegrated has no userId/meetingId props;
 * uses onSubmit/isSubmitting per its actual interface.
 */
export interface OneOnOnePDIPanelProps {
  collaboratorId: string;
  meetingId: string;
}

export function OneOnOnePDIPanel({
  collaboratorId: _collaboratorId,
  meetingId: _meetingId,
}: OneOnOnePDIPanelProps) {
  const [open, setOpen] = useState(false);
  const { createPDIFromOneOnOne, isCreating } = usePDIIntegrated();

  const handleSubmit = useCallback(
    (data: PDIFormData) => {
      createPDIFromOneOnOne({
        oneOnOneId: _meetingId,
        collaboratorId: _collaboratorId,
        data,
      });
      toast.success('PDI incluído nesta 1:1');
      setOpen(false);
    },
    [_meetingId, _collaboratorId, createPDIFromOneOnOne],
  );

  return (
    <Card>
      <button
        type="button"
        className="w-full flex items-center justify-between"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <SectionHeader>PDI</SectionHeader>
        {open ? (
          <ChevronUp className="size-4" />
        ) : (
          <ChevronDown className="size-4" />
        )}
      </button>
      {open && (
        <div className="mt-3">
          <PDIFormIntegrated onSubmit={handleSubmit} isSubmitting={isCreating} />
        </div>
      )}
    </Card>
  );
}
