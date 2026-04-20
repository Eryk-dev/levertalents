import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/primitives";
import {
  Briefcase,
  Users,
  FileText,
  ExternalLink,
  Plus,
  XCircle,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useJobOpening, useCloseJobOpening } from "@/hooks/hiring/useJobOpening";
import { useReuseCandidateForJob } from "@/hooks/hiring/useApplications";
import { JobDescriptionEditor } from "./JobDescriptionEditor";
import { JobExternalPublicationsList } from "./JobExternalPublicationsList";
import { CandidatesKanban } from "./CandidatesKanban";
import { CandidateForm } from "./CandidateForm";
import { CandidateDrawer } from "./CandidateDrawer";
import type { KanbanApplication } from "./CandidateCard";
import type { JobCloseReason } from "@/integrations/supabase/hiring-types";

interface JobDrawerProps {
  jobId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Tab inicial (default: candidatos — onde o valor está). */
  defaultTab?: "candidatos" | "descritivo" | "publicacoes";
}

export function JobDrawer({
  jobId,
  open,
  onOpenChange,
  defaultTab = "candidatos",
}: JobDrawerProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[calc(100vw-48px)] max-w-[1200px] h-[calc(100vh-80px)] max-h-[860px] p-0 gap-0 overflow-hidden flex flex-col rounded-lg"
      >
        {jobId ? (
          <JobDrawerBody jobId={jobId} defaultTab={defaultTab} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function JobDrawerBody({
  jobId,
  defaultTab,
}: {
  jobId: string;
  defaultTab: "candidatos" | "descritivo" | "publicacoes";
}) {
  const { data: job, isLoading } = useJobOpening(jobId);
  const [formOpen, setFormOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const [closeReason, setCloseReason] = useState<JobCloseReason>("contratado");
  const [candidateDrawer, setCandidateDrawer] = useState<{
    candidateId: string;
    applicationId: string;
  } | null>(null);

  const reuse = useReuseCandidateForJob();
  const closeJob = useCloseJobOpening();

  if (isLoading || !job) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        Carregando vaga...
      </div>
    );
  }

  const latest = job.job_descriptions[0];
  const daysOpen = Math.max(
    0,
    Math.floor((Date.now() - new Date(job.opened_at).getTime()) / 86_400_000),
  );

  const handleOpenCandidate = (app: KanbanApplication) => {
    setCandidateDrawer({ candidateId: app.candidate_id, applicationId: app.id });
  };

  return (
    <>
      <DialogHeader className="border-b border-border bg-surface px-5 py-4 pr-12 space-y-2">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-bg-subtle border border-border">
            <Briefcase className="h-4 w-4 text-text-muted" aria-hidden strokeWidth={1.75} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <DialogTitle className="truncate text-[16px] font-semibold tracking-[-0.01em] text-text">
                {job.title}
              </DialogTitle>
              {job.confidential ? (
                <span
                  className="inline-flex items-center gap-1 rounded bg-bg-subtle px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.05em] text-text-muted border border-border"
                  title="Vaga confidencial"
                >
                  <Lock className="h-3 w-3" aria-hidden /> Confidencial
                </span>
              ) : null}
            </div>
            <DialogDescription className="mt-1 flex items-center gap-1.5 text-[11.5px] text-text-muted">
              <span>{daysOpen}d aberta</span>
              <span className="text-text-subtle">·</span>
              <span>{job.work_mode ?? "—"}</span>
              <span className="text-text-subtle">·</span>
              <span>{job.contract_type?.toUpperCase() ?? "—"}</span>
              {job.sector ? (
                <>
                  <span className="text-text-subtle">·</span>
                  <span>{job.sector}</span>
                </>
              ) : null}
            </DialogDescription>
          </div>
          <div className="shrink-0 flex items-center gap-2">
            <StatusBadge kind="job" status={job.status} showIcon size="sm" />
          </div>
        </div>
      </DialogHeader>

      <div
        className={cn(
          "flex-1 min-h-0 overflow-hidden",
          candidateDrawer
            ? "grid grid-cols-[1fr_420px]"
            : "flex flex-col",
        )}
      >
        <div className="min-w-0 min-h-0 overflow-y-auto scrollbar-linear px-5 py-4">
          <Tabs defaultValue={defaultTab}>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <TabsList>
                <TabsTrigger value="candidatos">
                  <Users className="h-3.5 w-3.5" /> Candidatos
                </TabsTrigger>
                <TabsTrigger value="descritivo">
                  <FileText className="h-3.5 w-3.5" /> Descritivo
                </TabsTrigger>
                <TabsTrigger value="publicacoes">
                  <ExternalLink className="h-3.5 w-3.5" /> Publicações
                </TabsTrigger>
              </TabsList>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="accent" className="h-[26px] text-[12.5px]" onClick={() => setFormOpen(true)}>
                  <Plus className="mr-1 h-3.5 w-3.5" /> Novo candidato
                </Button>
                {job.status !== "encerrada" ? (
                  <Button size="sm" variant="outline" className="h-[26px] text-[12.5px]" onClick={() => setCloseOpen(true)}>
                    <XCircle className="mr-1 h-3.5 w-3.5" /> Encerrar
                  </Button>
                ) : null}
              </div>
            </div>

            <TabsContent value="candidatos">
              <p className="mb-3 text-[12.5px] text-text-muted">
                Arraste os cards para mover o candidato pelas etapas. Clique para abrir.
              </p>
              <CandidatesKanban
                jobId={job.id}
                onOpenCandidate={handleOpenCandidate}
                selectedApplicationId={candidateDrawer?.applicationId ?? null}
              />
            </TabsContent>

            <TabsContent value="descritivo" className="space-y-4">
              <JobDescriptionEditor job={job} descriptions={job.job_descriptions} />
            </TabsContent>

            <TabsContent value="publicacoes">
              <JobExternalPublicationsList
                jobOpeningId={job.id}
                publications={job.job_external_publications}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Split-view: drawer do candidato aninhado como painel inline (não overlay) */}
        {candidateDrawer ? (
          <div className="h-full min-h-0 w-[420px] shrink-0 overflow-hidden border-l border-border bg-surface">
            <CandidateDrawer
              candidateId={candidateDrawer.candidateId}
              applicationId={candidateDrawer.applicationId}
              onClose={() => setCandidateDrawer(null)}
            />
          </div>
        ) : null}
      </div>

      {/* Novo candidato */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Novo candidato</DialogTitle>
          </DialogHeader>
          <CandidateForm
            jobOpeningId={job.id}
            companyId={job.company_id}
            onCancel={() => setFormOpen(false)}
            onCreated={async (candidateId) => {
              reuse.mutate({ candidateId, jobId: job.id });
              setFormOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Encerrar vaga */}
      <Dialog open={closeOpen} onOpenChange={setCloseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Encerrar vaga</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <label className="space-y-1 block text-sm">
              Motivo do encerramento
              <Select
                value={closeReason}
                onValueChange={(v) => setCloseReason(v as JobCloseReason)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="contratado">Contratado</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                  <SelectItem value="congelado">Congelado</SelectItem>
                </SelectContent>
              </Select>
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setCloseOpen(false)}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                disabled={closeJob.isPending}
                onClick={() => {
                  closeJob.mutate({
                    id: job.id,
                    currentStatus: job.status,
                    expectedUpdatedAt: job.updated_at,
                    reason: closeReason,
                  });
                  setCloseOpen(false);
                }}
              >
                Encerrar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
