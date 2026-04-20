import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SectionCard } from "@/components/primitives";
import { supabase } from "@/integrations/supabase/client";
import { useCreateInterview } from "@/hooks/hiring/useInterviews";
import type {
  InterviewKind,
  InterviewMode,
} from "@/integrations/supabase/hiring-types";

interface InterviewSchedulerProps {
  applicationId: string;
  defaultKind?: InterviewKind;
  onCreated: () => void;
  onCancel: () => void;
}

export function InterviewScheduler({
  applicationId,
  defaultKind = "rh",
  onCreated,
  onCancel,
}: InterviewSchedulerProps) {
  const create = useCreateInterview();
  const [kind, setKind] = useState<InterviewKind>(defaultKind);
  const [scheduledAt, setScheduledAt] = useState<string>("");
  const [duration, setDuration] = useState<number>(60);
  const [mode, setMode] = useState<InterviewMode>("remota");
  const [locationOrLink, setLocationOrLink] = useState("");
  const [participants, setParticipants] = useState<string[]>([]);

  const { data: people = [] } = useQuery({
    queryKey: ["scheduler-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name")
        .order("full_name")
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  const toggleParticipant = (id: string) => {
    setParticipants((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  };

  return (
    <SectionCard title={kind === "final" ? "Agendar entrevista final" : "Agendar entrevista RH"}>
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <Label>Tipo</Label>
            <Select value={kind} onValueChange={(v) => setKind(v as InterviewKind)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rh">RH</SelectItem>
                <SelectItem value="final">Final (com gestores)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Data e hora</Label>
            <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Duração (min)</Label>
            <Input type="number" min={15} max={240} value={duration} onChange={(e) => setDuration(Number(e.target.value))} />
          </div>
          <div className="space-y-1">
            <Label>Modalidade</Label>
            <Select value={mode} onValueChange={(v) => setMode(v as InterviewMode)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="remota">Remota</SelectItem>
                <SelectItem value="presencial">Presencial</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label>Local ou link</Label>
            <Input value={locationOrLink} onChange={(e) => setLocationOrLink(e.target.value)} placeholder="Meet / endereço" />
          </div>
        </div>

        <div>
          <Label className="mb-2 block">Participantes</Label>
          <div className="max-h-48 overflow-y-auto rounded-md border border-border">
            {people.map((p) => (
              <label
                key={p.id}
                className="flex items-center gap-2 border-b border-border px-3 py-2 text-sm last:border-b-0"
              >
                <input
                  type="checkbox"
                  checked={participants.includes(p.id)}
                  onChange={() => toggleParticipant(p.id)}
                />
                {p.full_name}
              </label>
            ))}
          </div>
          {kind === "final" && participants.length === 0 && (
            <p className="mt-1 text-xs text-destructive">Selecione ao menos um avaliador.</p>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button
            disabled={create.isPending || !scheduledAt || (kind === "final" && participants.length === 0)}
            onClick={() =>
              create.mutate(
                {
                  application_id: applicationId,
                  kind,
                  scheduled_at: new Date(scheduledAt).toISOString(),
                  duration_minutes: duration,
                  mode,
                  location_or_link: locationOrLink || null,
                  participants,
                },
                {
                  onSuccess: () => onCreated(),
                },
              )
            }
          >
            Agendar
          </Button>
        </div>
      </div>
    </SectionCard>
  );
}
