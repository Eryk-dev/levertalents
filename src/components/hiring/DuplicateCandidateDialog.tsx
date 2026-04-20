import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useReuseCandidateForJob } from "@/hooks/hiring/useApplications";
import type { CandidateRow } from "@/integrations/supabase/hiring-types";

interface DuplicateCandidateDialogProps {
  open: boolean;
  candidate: CandidateRow;
  jobOpeningId: string | null;
  onReused: () => void;
  onCreateWithDifferentEmail: () => void;
  onCancel: () => void;
}

export function DuplicateCandidateDialog({
  open,
  candidate,
  jobOpeningId,
  onReused,
  onCreateWithDifferentEmail,
  onCancel,
}: DuplicateCandidateDialogProps) {
  const reuse = useReuseCandidateForJob();

  const { data: priorApps = [] } = useQuery({
    queryKey: ["duplicate-prior-apps", candidate.id],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("applications")
        .select("id, stage, job_opening_id, job:job_openings(title)")
        .eq("candidate_id", candidate.id)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data ?? [];
    },
  });

  const handleReuse = () => {
    if (!jobOpeningId) return;
    reuse.mutate(
      { candidateId: candidate.id, jobId: jobOpeningId },
      { onSuccess: () => onReused() },
    );
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => (!isOpen ? onCancel() : undefined)}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Candidato já cadastrado</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <p>
            <span className="font-medium">{candidate.full_name}</span> ({candidate.email}) já está no
            sistema.
          </p>
          {priorApps.length > 0 ? (
            <div className="rounded-md border border-border bg-muted/40 p-3">
              <p className="font-medium">Processos anteriores</p>
              <ul className="mt-2 space-y-1">
                {priorApps.map((a) => {
                  const job = (a as unknown as { job?: { title?: string } | null }).job;
                  return (
                    <li key={a.id} className="flex items-center justify-between">
                      <span>{job?.title ?? "Vaga anterior"}</span>
                      <span className="text-xs text-muted-foreground">{a.stage}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
          <p className="text-muted-foreground">
            Você pode reaproveitar este perfil para a vaga atual ou cadastrar com outro e-mail.
          </p>
        </div>
        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button variant="secondary" onClick={onCreateWithDifferentEmail}>
            Cadastrar com outro e-mail
          </Button>
          <Button onClick={handleReuse} disabled={!jobOpeningId || reuse.isPending}>
            Reaproveitar este perfil
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
