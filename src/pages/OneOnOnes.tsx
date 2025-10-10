import { useState, useEffect } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { useNavigate, useLocation } from "react-router-dom";
import { useOneOnOnes, OneOnOne } from "@/hooks/useOneOnOnes";
import { useUserProfile } from "@/hooks/useUserProfile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Calendar, Clock, Plus, User, FileText, AlertCircle, Download, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { OneOnOneMeetingForm } from "@/components/OneOnOneMeetingForm";
import { usePDIIntegrated } from "@/hooks/usePDIIntegrated";
import { LinkedPDIsSection } from "@/components/LinkedPDIsSection";
import { AudioPlayer } from "@/components/AudioPlayer";

export default function OneOnOnes() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showForm, setShowForm] = useState(false);
  const [selectedOneOnOne, setSelectedOneOnOne] = useState<OneOnOne | null>(null);
  const [showMeetingForm, setShowMeetingForm] = useState(false);
  const [meetingFormOneOnOne, setMeetingFormOneOnOne] = useState<OneOnOne | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<string | null>(null);
  const { oneOnOnes, isLoading, createOneOnOne, deleteOneOnOne } = useOneOnOnes();
  const { hasPDIForOneOnOne } = usePDIIntegrated();
  const { data: profile } = useUserProfile();

  // Auto-open 1:1 if navigated from PDI
  useEffect(() => {
    const state = location.state as { openOneOnOneId?: string };
    if (state?.openOneOnOneId && oneOnOnes) {
      const oneOnOne = oneOnOnes.find(o => o.id === state.openOneOnOneId);
      if (oneOnOne) {
        setSelectedOneOnOne(oneOnOne);
        // Clear the state to prevent reopening on refresh
        navigate(location.pathname, { replace: true, state: {} });
      }
    }
  }, [location, oneOnOnes, navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };
  const [formData, setFormData] = useState({
    collaborator_id: "",
    scheduled_date: "",
    duration_minutes: 60,
    agenda: "",
  });

  const { data: currentUser } = useQuery({
    queryKey: ["current-user-role"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      return { id: user.id, role: roleData?.role };
    },
  });

  const canDelete = currentUser?.role === 'lider' || currentUser?.role === 'rh' || currentUser?.role === 'socio';

  const { data: teamMembers } = useQuery({
    queryKey: ["team-members-for-oneonone"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Check user role
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      let userIds: string[] = [];

      // If RH or Socio, get all users except self
      if (roleData?.role === 'rh' || roleData?.role === 'socio') {
        const { data: allProfiles } = await supabase
          .from("profiles")
          .select("id")
          .neq("id", user.id);
        
        userIds = allProfiles?.map(p => p.id) || [];
      } else if (roleData?.role === 'lider') {
        // If leader, get only their team members
        const { data } = await supabase
          .from("team_members")
          .select("user_id")
          .eq("leader_id", user.id);

        userIds = data?.map(m => m.user_id) || [];
      }

      if (userIds.length === 0) return [];

      // Get profiles for those user IDs
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);

      return profiles?.map(p => ({
        user_id: p.id,
        profiles: p
      })) || [];
    },
  });

  const handleSubmit = () => {
    if (!formData.collaborator_id || !formData.scheduled_date) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    // Convert to ISO format
    const scheduledDate = new Date(formData.scheduled_date).toISOString();
    
    createOneOnOne({
      ...formData,
      scheduled_date: scheduledDate,
    });
    
    setShowForm(false);
    setFormData({ collaborator_id: "", scheduled_date: "", duration_minutes: 60, agenda: "" });
  };

  const handleDelete = (id: string) => {
    deleteOneOnOne(id);
    setDeleteDialog(null);
  };

  const statusMap = {
    scheduled: { label: "Agendada", variant: "default" as const },
    processing: { label: "Processando", variant: "secondary" as const },
    completed: { label: "Concluída", variant: "outline" as const },
    cancelled: { label: "Cancelada", variant: "destructive" as const },
    rescheduled: { label: "Reagendada", variant: "outline" as const },
  };

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header userName={profile?.full_name} onLogout={handleLogout} />
        <main className="flex-1 p-8 bg-background">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold">Reuniões 1:1</h1>
                <p className="text-muted-foreground mt-1">Agende e acompanhe suas reuniões individuais</p>
              </div>
              <Button onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Agendar 1:1
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {oneOnOnes.map((oneOnOne) => {
                const hasPDI = hasPDIForOneOnOne(oneOnOne.id);
                const needsCompletion = oneOnOne.status === 'scheduled' && 
                  new Date(oneOnOne.scheduled_date) < new Date() && 
                  !oneOnOne.meeting_structure;
                
                return (
                  <Card 
                    key={oneOnOne.id} 
                    className="hover:shadow-lg transition-shadow cursor-pointer relative" 
                    onClick={() => {
                      if (oneOnOne.status === 'scheduled' || needsCompletion) {
                        setMeetingFormOneOnOne(oneOnOne);
                        setShowMeetingForm(true);
                      } else {
                        setSelectedOneOnOne(oneOnOne);
                      }
                    }}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="space-y-1 flex-1">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <User className="h-4 w-4" />
                            {oneOnOne.collaborator?.full_name}
                          </CardTitle>
                          <CardDescription className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {format(new Date(oneOnOne.scheduled_date), "dd 'de' MMMM, HH:mm", { locale: ptBR })}
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex flex-col gap-2">
                            <Badge variant={statusMap[oneOnOne.status].variant}>
                              {statusMap[oneOnOne.status].label}
                            </Badge>
                            {needsCompletion && (
                              <Badge variant="destructive" className="text-xs">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Preencher
                              </Badge>
                            )}
                          </div>
                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteDialog(oneOnOne.id);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          {oneOnOne.duration_minutes} minutos
                        </div>
                        {oneOnOne.agenda && (
                          <p className="text-sm line-clamp-2">{oneOnOne.agenda}</p>
                        )}
                        {oneOnOne.status === 'completed' && !hasPDI && (
                          <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 pt-2">
                            <FileText className="h-3 w-3" />
                            Sem PDI vinculado
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          <Dialog open={showForm} onOpenChange={setShowForm}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Agendar Nova 1:1</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Colaborador</Label>
                  <Select value={formData.collaborator_id} onValueChange={(v) => setFormData({...formData, collaborator_id: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {teamMembers?.map((m: any) => (
                        <SelectItem key={m.user_id} value={m.user_id}>{m.profiles.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Data e Hora</Label>
                  <Input type="datetime-local" value={formData.scheduled_date} onChange={(e) => setFormData({...formData, scheduled_date: e.target.value})} />
                </div>
                <div>
                  <Label>Duração (minutos)</Label>
                  <Input type="number" value={formData.duration_minutes} onChange={(e) => setFormData({...formData, duration_minutes: Number(e.target.value)})} />
                </div>
                <div>
                  <Label>Pauta</Label>
                  <Textarea value={formData.agenda} onChange={(e) => setFormData({...formData, agenda: e.target.value})} placeholder="Tópicos a serem discutidos..." />
                </div>
                <Button onClick={handleSubmit} className="w-full">Agendar</Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Meeting Form Modal */}
          {meetingFormOneOnOne && (
            <OneOnOneMeetingForm
              oneOnOne={meetingFormOneOnOne}
              open={showMeetingForm}
              onOpenChange={(open) => {
                setShowMeetingForm(open);
                if (!open) setMeetingFormOneOnOne(null);
              }}
            />
          )}

          {/* Read-only Details Modal */}
          <Dialog open={!!selectedOneOnOne} onOpenChange={() => setSelectedOneOnOne(null)}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Detalhes da 1:1</DialogTitle>
              </DialogHeader>
              {selectedOneOnOne && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Colaborador</p>
                      <p className="font-semibold">{selectedOneOnOne.collaborator?.full_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Líder</p>
                      <p className="font-semibold">{selectedOneOnOne.leader?.full_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Data e Hora</p>
                      <p className="font-semibold">{format(new Date(selectedOneOnOne.scheduled_date), "dd/MM/yyyy 'às' HH:mm")}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Duração</p>
                      <p className="font-semibold">{selectedOneOnOne.duration_minutes} minutos</p>
                    </div>
                  </div>
                  
                  {/* PDIs Vinculados */}
                  <LinkedPDIsSection oneOnOneId={selectedOneOnOne.id} />
                  
                  {selectedOneOnOne.agenda && (
                    <div>
                      <h3 className="font-semibold mb-2">Pauta</h3>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedOneOnOne.agenda}</p>
                    </div>
                  )}
                  {selectedOneOnOne.notes && (
                    <div>
                      <h3 className="font-semibold mb-2">Notas</h3>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedOneOnOne.notes}</p>
                    </div>
                  )}
                  {selectedOneOnOne.meeting_structure && (
                    <>
                      {selectedOneOnOne.audio_url && (
                        <div>
                          <h3 className="font-semibold mb-2">Gravação</h3>
                          <AudioPlayer audioUrl={selectedOneOnOne.audio_url} />
                        </div>
                      )}
                      {selectedOneOnOne.meeting_structure.transcricao && (
                        <div>
                          <h3 className="font-semibold mb-2">Transcrição</h3>
                          <div className="bg-muted p-4 rounded-lg">
                            <p className="text-sm whitespace-pre-wrap">{selectedOneOnOne.meeting_structure.transcricao}</p>
                          </div>
                        </div>
                      )}
                      {selectedOneOnOne.meeting_structure.resumo && (
                        <div>
                          <h3 className="font-semibold mb-2">Resumo</h3>
                          <div className="bg-muted p-4 rounded-lg">
                            <p className="text-sm whitespace-pre-wrap">{selectedOneOnOne.meeting_structure.resumo}</p>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
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
        </main>
      </div>
    </div>
  );
}
