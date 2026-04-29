import { useState } from "react";
import { useOneOnOnes, useDeleteOneOnOne } from "@/hooks/useOneOnOnes";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ManualOneOnOneForm } from "@/components/ManualOneOnOneForm";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RetryTranscriptionButton } from "@/components/RetryTranscriptionButton";
import {
  Btn,
  Col,
  LinearAvatar,
  LinearEmpty,
  Row,
} from "@/components/primitives/LinearKit";
import { StatusBadge } from "@/components/primitives/StatusBadge";
import { Icon } from "@/components/primitives/Icon";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface OneOnOnesTabProps {
  isLeader: boolean;
  isRHorSocio: boolean;
  isCollaborator: boolean;
  currentUserId?: string;
}

/**
 * Aba de listagem de 1:1s — padrão Linear denso sans.
 */
export function OneOnOnesTab({
  isLeader,
  isRHorSocio,
  isCollaborator,
  currentUserId,
}: OneOnOnesTabProps) {
  const { data: oneOnOnes = [], isLoading } = useOneOnOnes();
  const deleteOneOnOne = useDeleteOneOnOne();
  const [showManualForm, setShowManualForm] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<string | null>(null);

  const filtered = isCollaborator
    ? oneOnOnes.filter((o) => o.collaborator_id === currentUserId)
    : oneOnOnes;

  const handleDelete = (id: string) => {
    deleteOneOnOne.mutate(id, {
      onSuccess: () => toast.success("1:1 excluída"),
      onError: (err) => toast.error("Erro ao excluir: " + (err as Error).message),
    });
    setDeleteDialog(null);
  };

  const canDelete = isLeader || isRHorSocio;

  return (
    <>
      {/* Header */}
      <Row justify="between" align="end" className="mb-4">
        <div>
          <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-text">1:1s</h3>
          <p className="text-[12.5px] text-text-muted mt-0.5">
            Acompanhe e gerencie as reuniões individuais
          </p>
        </div>
        {isLeader && (
          <Btn
            variant="primary"
            size="sm"
            icon={<Icon name="calendar" size={13} />}
            onClick={() => setShowManualForm(true)}
          >
            Adicionar 1:1 manual
          </Btn>
        )}
      </Row>

      {isLoading ? (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="surface-paper h-48 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <LinearEmpty
          icon={<Icon name="users" size={18} />}
          title="Nenhuma 1:1 registrada"
          description="Quando houver reuniões, elas aparecem aqui com status e pauta."
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((meeting) => {
            const name = isCollaborator
              ? meeting.leader?.full_name
              : meeting.collaborator?.full_name;
            return (
              <div key={meeting.id} className="surface-paper p-3.5">
                <Row justify="between" align="start" className="gap-2">
                  <div className="min-w-0 flex-1">
                    <Row gap={6} className="text-[12.5px] text-text-muted">
                      <Icon name="calendar" size={12} />
                      <span className="tabular">
                        {format(new Date(meeting.scheduled_date), "d 'de' MMM", {
                          locale: ptBR,
                        })}
                      </span>
                      <span>·</span>
                      <span>{meeting.duration_minutes}min</span>
                    </Row>
                    {name && (
                      <Row gap={6} className="mt-1.5">
                        <LinearAvatar name={name} size={20} />
                        <span className="text-[13px] font-medium text-text truncate">
                          {name}
                        </span>
                      </Row>
                    )}
                  </div>
                  <Row gap={4}>
                    <StatusBadge kind="one-on-one" status={meeting.status} size="sm" />
                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => setDeleteDialog(meeting.id)}
                        className="w-6 h-6 inline-grid place-items-center text-text-subtle hover:text-status-red transition-colors"
                        aria-label="Excluir"
                      >
                        <Icon name="x" size={12} />
                      </button>
                    )}
                  </Row>
                </Row>

                {meeting.agenda && (
                  <Col gap={4} className="mt-2.5 pt-2.5 border-t border-border">
                    <div className="text-[10.5px] font-semibold uppercase tracking-[0.05em] text-text-subtle">
                      Pauta
                    </div>
                    <p className="text-[12.5px] text-text-muted line-clamp-2 leading-[1.5]">
                      {meeting.agenda}
                    </p>
                  </Col>
                )}

                {meeting.audio_url && !meeting.meeting_structure?.transcricao && (
                  <div className="pt-2.5 mt-2.5 border-t border-border">
                    <RetryTranscriptionButton
                      meetingId={meeting.id}
                      audioUrl={meeting.audio_url}
                      hasTranscription={!!meeting.meeting_structure?.transcricao}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={showManualForm} onOpenChange={setShowManualForm}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Adicionar 1:1 manual</DialogTitle>
            <DialogDescription>
              Cadastre uma 1:1 já realizada para manter o histórico completo.
            </DialogDescription>
          </DialogHeader>
          <ManualOneOnOneForm
            onSuccess={() => setShowManualForm(false)}
            onCancel={() => setShowManualForm(false)}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta 1:1? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteDialog && handleDelete(deleteDialog)}
              className="bg-status-red text-white hover:bg-status-red/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
