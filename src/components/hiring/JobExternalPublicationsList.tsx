import { useState } from "react";
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
import { SectionCard, EmptyState } from "@/components/primitives";
import { Link as LinkIcon, Trash2 } from "lucide-react";
import { useAddJobPublication, useDeleteJobPublication } from "@/hooks/hiring/useJobPublications";
import type {
  JobExternalPublicationRow,
  PublicationChannel,
} from "@/integrations/supabase/hiring-types";

interface JobExternalPublicationsListProps {
  jobOpeningId: string;
  publications: JobExternalPublicationRow[];
}

export function JobExternalPublicationsList({
  jobOpeningId,
  publications,
}: JobExternalPublicationsListProps) {
  const addPub = useAddJobPublication();
  const deletePub = useDeleteJobPublication();
  const [form, setForm] = useState({
    channel: "linkedin" as PublicationChannel,
    url: "",
    published_at: new Date().toISOString().slice(0, 10),
    note: "",
  });

  const handleAdd = () => {
    if (!form.url || !form.published_at) return;
    addPub.mutate(
      {
        job_opening_id: jobOpeningId,
        channel: form.channel,
        url: form.url,
        published_at: form.published_at,
        note: form.note || null,
      },
      { onSuccess: () => setForm({ ...form, url: "", note: "" }) },
    );
  };

  return (
    <SectionCard title="Publicações externas" description="Registre manualmente onde a vaga foi anunciada.">
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-5">
          <div className="space-y-1">
            <Label>Canal</Label>
            <Select value={form.channel} onValueChange={(v) => setForm({ ...form, channel: v as PublicationChannel })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="linkedin">LinkedIn</SelectItem>
                <SelectItem value="indeed">Indeed</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="outros">Outros</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label htmlFor="url">URL</Label>
            <Input
              id="url"
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
              placeholder="https://…"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="pub_date">Data</Label>
            <Input
              id="pub_date"
              type="date"
              value={form.published_at}
              onChange={(e) => setForm({ ...form, published_at: e.target.value })}
            />
          </div>
          <div className="flex items-end">
            <Button onClick={handleAdd} disabled={addPub.isPending}>
              Adicionar link
            </Button>
          </div>
          <div className="space-y-1 md:col-span-5">
            <Label htmlFor="note">Nota (opcional)</Label>
            <Input id="note" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </div>
        </div>

        {publications.length === 0 ? (
          <EmptyState
            icon={LinkIcon}
            title="Nenhuma publicação registrada"
            message="Adicione links manualmente conforme divulgar a vaga."
          />
        ) : (
          <ul className="divide-y divide-border rounded-md border border-border">
            {publications.map((p) => (
              <li key={p.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                <span className="w-24 shrink-0 text-xs uppercase text-muted-foreground">{p.channel}</span>
                <a href={p.url} target="_blank" rel="noreferrer" className="flex-1 truncate text-accent underline">
                  {p.url}
                </a>
                <span className="text-xs text-muted-foreground">
                  {new Date(p.published_at).toLocaleDateString("pt-BR")}
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Remover"
                  onClick={() => deletePub.mutate({ id: p.id, jobOpeningId })}
                  disabled={deletePub.isPending}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </SectionCard>
  );
}
