import { useState } from "react";
import { useOneOnOnes } from "@/hooks/useOneOnOnes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, FileText, Users, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ManualOneOnOneForm } from "@/components/ManualOneOnOneForm";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { RetryTranscriptionButton } from "@/components/RetryTranscriptionButton";

interface OneOnOnesTabProps {
  isLeader: boolean;
  isRHorSocio: boolean;
  isCollaborator: boolean;
  currentUserId?: string;
}

export function OneOnOnesTab({ isLeader, isRHorSocio, isCollaborator, currentUserId }: OneOnOnesTabProps) {
  const { oneOnOnes, isLoading, deleteOneOnOne } = useOneOnOnes();
  const [showManualForm, setShowManualForm] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<string | null>(null);

  const filteredOneOnOnes = isCollaborator
    ? oneOnOnes.filter(o => o.collaborator_id === currentUserId)
    : oneOnOnes;

  const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    scheduled: { label: "Agendada", variant: "secondary" },
    processing: { label: "Processando", variant: "default" },
    completed: { label: "Concluída", variant: "outline" },
    cancelled: { label: "Cancelada", variant: "destructive" },
    rescheduled: { label: "Reagendada", variant: "outline" },
  };

  const handleDelete = (id: string) => {
    deleteOneOnOne(id);
    setDeleteDialog(null);
  };

  const canDelete = isLeader || isRHorSocio;

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-semibold">1:1s</h3>
          <p className="text-sm text-muted-foreground">
            Acompanhe e gerencie as reuniões individuais
          </p>
        </div>
        {isLeader && (
          <Button onClick={() => setShowManualForm(true)}>
            <Calendar className="h-4 w-4 mr-2" />
            Adicionar 1:1 Manual
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="h-48" />
            </Card>
          ))}
        </div>
      ) : filteredOneOnOnes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              Nenhum 1:1 registrado
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredOneOnOnes.map((meeting) => (
            <Card key={meeting.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {new Date(meeting.scheduled_date).toLocaleDateString('pt-BR')}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {meeting.duration_minutes} minutos
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant={statusMap[meeting.status]?.variant || "outline"}>
                      {statusMap[meeting.status]?.label || meeting.status}
                    </Badge>
                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleteDialog(meeting.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {!isCollaborator && meeting.collaborator && (
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      <span className="text-muted-foreground">Colaborador: </span>
                      {meeting.collaborator.full_name}
                    </span>
                  </div>
                )}
                {isCollaborator && meeting.leader && (
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      <span className="text-muted-foreground">Líder: </span>
                      {meeting.leader.full_name}
                    </span>
                  </div>
                )}
                {meeting.agenda && (
                  <div className="flex items-start gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {meeting.agenda}
                    </p>
                  </div>
                )}
                
                {/* Botão para re-transcrever se houver áudio mas sem transcrição */}
                {meeting.audio_url && !meeting.meeting_structure?.transcricao && (
                  <div className="pt-2 border-t">
                    <RetryTranscriptionButton
                      meetingId={meeting.id}
                      audioUrl={meeting.audio_url}
                      hasTranscription={!!meeting.meeting_structure?.transcricao}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showManualForm} onOpenChange={setShowManualForm}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Adicionar 1:1 Manual</DialogTitle>
            <DialogDescription>
              Cadastre uma 1:1 já realizada para manter o histórico completo
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
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este 1:1? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteDialog && handleDelete(deleteDialog)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}