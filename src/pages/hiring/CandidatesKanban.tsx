import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Plus, ArrowLeft } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LoadingState, EmptyState } from "@/components/primitives";
import { Btn, Row } from "@/components/primitives/LinearKit";
import { CandidatesKanban } from "@/components/hiring/CandidatesKanban";
import { CandidateForm } from "@/components/hiring/CandidateForm";
import { CandidateDrawer } from "@/components/hiring/CandidateDrawer";
import type { KanbanApplication } from "@/components/hiring/CandidateCard";
import { useJobOpening } from "@/hooks/hiring/useJobOpening";
import { useReuseCandidateForJob } from "@/hooks/hiring/useApplications";

export default function CandidatesKanbanPage() {
  const { id: jobId } = useParams<{ id: string }>();
  const { data: job, isLoading } = useJobOpening(jobId);
  const [formOpen, setFormOpen] = useState(false);
  const [candidateDrawer, setCandidateDrawer] = useState<{
    candidateId: string;
    applicationId: string;
  } | null>(null);
  const reuse = useReuseCandidateForJob();

  if (isLoading) return <LoadingState layout="cards" count={3} />;
  if (!job) {
    return (
      <div className="p-6 lg:p-10">
        <EmptyState
          title="Vaga não encontrada"
          action={
            <Btn variant="secondary" size="sm" icon={<ArrowLeft className="h-3.5 w-3.5" />}>
              <Link to="/hiring/jobs">Voltar</Link>
            </Btn>
          }
        />
      </div>
    );
  }

  const handleOpenCandidate = (app: KanbanApplication) => {
    setCandidateDrawer({ candidateId: app.candidate_id, applicationId: app.id });
  };

  return (
    <div className="grid h-full min-h-0 grid-cols-1 lg:grid-cols-[1fr_420px] overflow-hidden font-sans text-text animate-fade-in">
      {/* Pipeline */}
      <div className="flex flex-col min-w-0 min-h-0 overflow-hidden">
        <div className="px-5 lg:px-7 pt-5 pb-3">
          <Row justify="between" align="start" gap={12}>
            <div className="min-w-0">
              <div className="text-[11px] text-text-subtle uppercase tracking-[0.06em] font-semibold">
                Candidatos da vaga
              </div>
              <h1 className="text-[20px] font-semibold tracking-[-0.02em] m-0 truncate mt-0.5">
                {job.title}
              </h1>
              <div className="text-[12.5px] text-text-muted mt-0.5">
                Arraste os cards para mover os candidatos pelas etapas. Clique para abrir.
              </div>
            </div>
            <Row gap={6}>
              <Btn variant="secondary" size="sm" icon={<ArrowLeft className="h-3.5 w-3.5" />}>
                <Link to={`/hiring/jobs/${job.id}`}>Voltar</Link>
              </Btn>
              <Btn
                variant="primary"
                size="sm"
                icon={<Plus className="h-3.5 w-3.5" />}
                onClick={() => setFormOpen(true)}
              >
                Novo candidato
              </Btn>
            </Row>
          </Row>
        </div>
        <div className="flex-1 min-h-0 overflow-auto scrollbar-linear px-5 lg:px-7 pb-5">
          <CandidatesKanban
            jobId={job.id}
            onOpenCandidate={handleOpenCandidate}
            selectedApplicationId={candidateDrawer?.applicationId ?? null}
          />
        </div>
      </div>

      {/* Drawer inline (desktop) */}
      <div className="hidden lg:flex min-h-0 overflow-hidden">
        <div className="flex-1 min-w-0 flex flex-col">
          <CandidateDrawer
            candidateId={candidateDrawer?.candidateId ?? null}
            applicationId={candidateDrawer?.applicationId ?? null}
            onClose={() => setCandidateDrawer(null)}
          />
        </div>
      </div>

      {/* Drawer mobile (overlay) */}
      {candidateDrawer ? (
        <div className="lg:hidden fixed inset-0 z-50 flex bg-black/30" onClick={() => setCandidateDrawer(null)}>
          <div
            className="ml-auto h-full w-full max-w-[420px] bg-surface shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <CandidateDrawer
              candidateId={candidateDrawer.candidateId}
              applicationId={candidateDrawer.applicationId}
              onClose={() => setCandidateDrawer(null)}
            />
          </div>
        </div>
      ) : null}

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
    </div>
  );
}
