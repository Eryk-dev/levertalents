import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { SectionCard } from "@/components/primitives";
import {
  useAttachInterviewTranscript,
  useUpdateInterviewStatus,
} from "@/hooks/hiring/useInterviews";
import type { InterviewRow } from "@/integrations/supabase/hiring-types";

interface InterviewNotesEditorProps {
  interview: InterviewRow;
  candidateId: string;
  companyId: string;
  jobOpeningId: string;
}

export function InterviewNotesEditor({
  interview,
  candidateId,
  companyId,
  jobOpeningId,
}: InterviewNotesEditorProps) {
  const [transcript, setTranscript] = useState<string>(interview.transcript_text ?? "");
  const [summary, setSummary] = useState<string>(interview.summary ?? "");
  const [file, setFile] = useState<File | null>(null);

  const attach = useAttachInterviewTranscript();
  const statusMutation = useUpdateInterviewStatus();

  return (
    <SectionCard
      title="Notas da entrevista"
      description={new Date(interview.scheduled_at).toLocaleString("pt-BR")}
    >
      <Tabs defaultValue="transcript" className="space-y-4">
        <TabsList>
          <TabsTrigger value="transcript">Transcrição</TabsTrigger>
          <TabsTrigger value="summary">Resumo</TabsTrigger>
        </TabsList>
        <TabsContent value="transcript" className="space-y-3">
          <Textarea
            rows={10}
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="Cole ou digite a transcrição"
          />
          <div className="space-y-1">
            <Label htmlFor="transcript-file">Ou faça upload de um arquivo</Label>
            <Input
              id="transcript-file"
              type="file"
              accept=".txt,.vtt,.pdf,.docx"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
        </TabsContent>
        <TabsContent value="summary">
          <Textarea
            rows={10}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Resumo em markdown"
          />
        </TabsContent>
      </Tabs>

      <div className="mt-4 flex justify-end gap-2">
        {interview.status === "agendada" ? (
          <Button
            variant="secondary"
            onClick={() =>
              statusMutation.mutate({
                id: interview.id,
                expectedUpdatedAt: interview.updated_at,
                status: "realizada",
                applicationId: interview.application_id,
              })
            }
          >
            Marcar como realizada
          </Button>
        ) : null}
        <Button
          disabled={attach.isPending}
          onClick={() =>
            attach.mutate({
              id: interview.id,
              applicationId: interview.application_id,
              candidateId,
              companyId,
              jobOpeningId,
              transcript: { text: transcript, file: file ?? undefined },
              summary,
            })
          }
        >
          Salvar notas
        </Button>
      </div>
    </SectionCard>
  );
}
