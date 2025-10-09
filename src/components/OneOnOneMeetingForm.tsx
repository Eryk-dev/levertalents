import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useOneOnOnes, OneOnOne } from "@/hooks/useOneOnOnes";
import { usePDIIntegrated, PDIFormData } from "@/hooks/usePDIIntegrated";
import { useActionItems } from "@/hooks/useActionItems";
import { PDIFormIntegrated } from "./PDIFormIntegrated";
import { PDIReviewCard } from "./PDIReviewCard";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface OneOnOneMeetingFormProps {
  oneOnOne: OneOnOne;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface MeetingData {
  aquecimento: {
    feeling: string;
    satisfactions: string;
    external_factors: string;
  };
  desenvolvimento: {
    achievements: string;
    team_success: string;
    challenges: string;
    skills_to_improve: string;
    culture_alignment: string;
  };
  projecao: {
    next_month_goals: string;
    learning: string;
    impact_areas: string;
    desired_changes: string;
  };
  encerramento: {
    support_needed: string;
  };
}

export const OneOnOneMeetingForm = ({ oneOnOne, open, onOpenChange }: OneOnOneMeetingFormProps) => {
  const { updateOneOnOne } = useOneOnOnes();
  const { getPDIFromOneOnOne, getLatestPDIForCollaborator, createPDIFromOneOnOne, isCreating } = usePDIIntegrated();
  const { actionItems, createActionItem, updateActionItem, isCreating: isCreatingAction } = useActionItems(oneOnOne.id);
  
  const { data: existingPDI } = getPDIFromOneOnOne(oneOnOne.id);
  const { data: latestPDI } = getLatestPDIForCollaborator(oneOnOne.collaborator_id);

  const [meetingData, setMeetingData] = useState<MeetingData>({
    aquecimento: {
      feeling: (oneOnOne.meeting_structure as any)?.aquecimento?.feeling || "",
      satisfactions: (oneOnOne.meeting_structure as any)?.aquecimento?.satisfactions || "",
      external_factors: (oneOnOne.meeting_structure as any)?.aquecimento?.external_factors || "",
    },
    desenvolvimento: {
      achievements: (oneOnOne.meeting_structure as any)?.desenvolvimento?.achievements || "",
      team_success: (oneOnOne.meeting_structure as any)?.desenvolvimento?.team_success || "",
      challenges: (oneOnOne.meeting_structure as any)?.desenvolvimento?.challenges || "",
      skills_to_improve: (oneOnOne.meeting_structure as any)?.desenvolvimento?.skills_to_improve || "",
      culture_alignment: (oneOnOne.meeting_structure as any)?.desenvolvimento?.culture_alignment || "",
    },
    projecao: {
      next_month_goals: (oneOnOne.meeting_structure as any)?.projecao?.next_month_goals || "",
      learning: (oneOnOne.meeting_structure as any)?.projecao?.learning || "",
      impact_areas: (oneOnOne.meeting_structure as any)?.projecao?.impact_areas || "",
      desired_changes: (oneOnOne.meeting_structure as any)?.projecao?.desired_changes || "",
    },
    encerramento: {
      support_needed: (oneOnOne.meeting_structure as any)?.encerramento?.support_needed || "",
    },
  });

  const [newActionItem, setNewActionItem] = useState({
    description: "",
    assigned_to: oneOnOne.collaborator_id,
    due_date: "",
  });

  const handleSaveMeetingData = () => {
    updateOneOnOne({
      id: oneOnOne.id,
      input: {
        meeting_structure: meetingData,
        status: "completed",
      },
    });
  };

  const handlePDISubmit = (data: PDIFormData) => {
    createPDIFromOneOnOne({
      oneOnOneId: oneOnOne.id,
      collaboratorId: oneOnOne.collaborator_id,
      data,
    });
  };

  const handleAddActionItem = () => {
    if (newActionItem.description.trim()) {
      createActionItem({
        one_on_one_id: oneOnOne.id,
        ...newActionItem,
      });
      setNewActionItem({
        description: "",
        assigned_to: oneOnOne.collaborator_id,
        due_date: "",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Reunião 1:1 - {oneOnOne.collaborator?.full_name}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="revisao" className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="revisao">Revisão PDI</TabsTrigger>
            <TabsTrigger value="aquecimento">Aquecimento</TabsTrigger>
            <TabsTrigger value="desenvolvimento">Desenvolvimento</TabsTrigger>
            <TabsTrigger value="projecao">Projeção</TabsTrigger>
            <TabsTrigger value="pdi">PDI Mensal</TabsTrigger>
            <TabsTrigger value="action_items">Action Items</TabsTrigger>
          </TabsList>

          {/* Tab: Revisão PDI Anterior */}
          <TabsContent value="revisao" className="space-y-4">
            {latestPDI && latestPDI.id !== existingPDI?.id ? (
              <PDIReviewCard 
                pdi={latestPDI}
                onViewDetails={() => {
                  // TODO: Open PDI details modal
                }}
              />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>Nenhum PDI anterior encontrado para revisar.</p>
              </div>
            )}
          </TabsContent>

          {/* Tab: Aquecimento */}
          <TabsContent value="aquecimento" className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Como você está se sentindo neste mês?</Label>
                <Textarea
                  value={meetingData.aquecimento.feeling}
                  onChange={(e) => setMeetingData({
                    ...meetingData,
                    aquecimento: { ...meetingData.aquecimento, feeling: e.target.value }
                  })}
                  placeholder="Tanto no trabalho quanto pessoalmente..."
                  className="min-h-[80px]"
                />
              </div>

              <div className="space-y-2">
                <Label>Satisfações ou insatisfações recentes</Label>
                <Textarea
                  value={meetingData.aquecimento.satisfactions}
                  onChange={(e) => setMeetingData({
                    ...meetingData,
                    aquecimento: { ...meetingData.aquecimento, satisfactions: e.target.value }
                  })}
                  placeholder="Algo que te deixou especialmente satisfeito ou insatisfeito..."
                  className="min-h-[80px]"
                />
              </div>

              <div className="space-y-2">
                <Label>Fatores externos impactando motivação</Label>
                <Textarea
                  value={meetingData.aquecimento.external_factors}
                  onChange={(e) => setMeetingData({
                    ...meetingData,
                    aquecimento: { ...meetingData.aquecimento, external_factors: e.target.value }
                  })}
                  placeholder="Carga, ambiente, processos..."
                  className="min-h-[80px]"
                />
              </div>
            </div>
          </TabsContent>

          {/* Tab: Desenvolvimento */}
          <TabsContent value="desenvolvimento" className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Principais conquistas neste mês</Label>
                <Textarea
                  value={meetingData.desenvolvimento.achievements}
                  onChange={(e) => setMeetingData({
                    ...meetingData,
                    desenvolvimento: { ...meetingData.desenvolvimento, achievements: e.target.value }
                  })}
                  className="min-h-[80px]"
                />
              </div>

              <div className="space-y-2">
                <Label>O que funcionou bem no time/projetos</Label>
                <Textarea
                  value={meetingData.desenvolvimento.team_success}
                  onChange={(e) => setMeetingData({
                    ...meetingData,
                    desenvolvimento: { ...meetingData.desenvolvimento, team_success: e.target.value }
                  })}
                  className="min-h-[80px]"
                />
              </div>

              <div className="space-y-2">
                <Label>Desafios enfrentados e apoio necessário</Label>
                <Textarea
                  value={meetingData.desenvolvimento.challenges}
                  onChange={(e) => setMeetingData({
                    ...meetingData,
                    desenvolvimento: { ...meetingData.desenvolvimento, challenges: e.target.value }
                  })}
                  className="min-h-[80px]"
                />
              </div>

              <div className="space-y-2">
                <Label>Habilidades que precisa reforçar</Label>
                <Textarea
                  value={meetingData.desenvolvimento.skills_to_improve}
                  onChange={(e) => setMeetingData({
                    ...meetingData,
                    desenvolvimento: { ...meetingData.desenvolvimento, skills_to_improve: e.target.value }
                  })}
                  className="min-h-[80px]"
                />
              </div>

              <div className="space-y-2">
                <Label>Alinhamento com cultura e valores da empresa</Label>
                <Textarea
                  value={meetingData.desenvolvimento.culture_alignment}
                  onChange={(e) => setMeetingData({
                    ...meetingData,
                    desenvolvimento: { ...meetingData.desenvolvimento, culture_alignment: e.target.value }
                  })}
                  className="min-h-[80px]"
                />
              </div>
            </div>
          </TabsContent>

          {/* Tab: Projeção */}
          <TabsContent value="projecao" className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>O que gostaria de alcançar no próximo mês</Label>
                <Textarea
                  value={meetingData.projecao.next_month_goals}
                  onChange={(e) => setMeetingData({
                    ...meetingData,
                    projecao: { ...meetingData.projecao, next_month_goals: e.target.value }
                  })}
                  className="min-h-[80px]"
                />
              </div>

              <div className="space-y-2">
                <Label>Aprendizado ou habilidade nova a desenvolver</Label>
                <Textarea
                  value={meetingData.projecao.learning}
                  onChange={(e) => setMeetingData({
                    ...meetingData,
                    projecao: { ...meetingData.projecao, learning: e.target.value }
                  })}
                  className="min-h-[80px]"
                />
              </div>

              <div className="space-y-2">
                <Label>Onde pode gerar mais impacto no time/projetos</Label>
                <Textarea
                  value={meetingData.projecao.impact_areas}
                  onChange={(e) => setMeetingData({
                    ...meetingData,
                    projecao: { ...meetingData.projecao, impact_areas: e.target.value }
                  })}
                  className="min-h-[80px]"
                />
              </div>

              <div className="space-y-2">
                <Label>Mudanças desejadas na rotina ou processos</Label>
                <Textarea
                  value={meetingData.projecao.desired_changes}
                  onChange={(e) => setMeetingData({
                    ...meetingData,
                    projecao: { ...meetingData.projecao, desired_changes: e.target.value }
                  })}
                  className="min-h-[80px]"
                />
              </div>
            </div>
          </TabsContent>

          {/* Tab: PDI Mensal */}
          <TabsContent value="pdi" className="space-y-4">
            {existingPDI ? (
              <div className="text-center py-8">
                <Badge variant="default" className="mb-4">PDI já criado para esta 1:1</Badge>
                <p className="text-sm text-muted-foreground">
                  Um PDI já foi criado para esta reunião.
                </p>
              </div>
            ) : (
              <PDIFormIntegrated 
                onSubmit={handlePDISubmit}
                isSubmitting={isCreating}
              />
            )}
          </TabsContent>

          {/* Tab: Action Items */}
          <TabsContent value="action_items" className="space-y-4">
            <div className="space-y-4">
              {/* Add new action item */}
              <div className="border rounded-lg p-4 space-y-3">
                <h3 className="font-semibold">Adicionar Action Item</h3>
                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Input
                    value={newActionItem.description}
                    onChange={(e) => setNewActionItem({ ...newActionItem, description: e.target.value })}
                    placeholder="Descreva o action item..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Responsável</Label>
                    <Select
                      value={newActionItem.assigned_to}
                      onValueChange={(value) => setNewActionItem({ ...newActionItem, assigned_to: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={oneOnOne.leader_id}>
                          {oneOnOne.leader?.full_name || "Líder"}
                        </SelectItem>
                        <SelectItem value={oneOnOne.collaborator_id}>
                          {oneOnOne.collaborator?.full_name || "Colaborador"}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Data de vencimento</Label>
                    <Input
                      type="date"
                      value={newActionItem.due_date}
                      onChange={(e) => setNewActionItem({ ...newActionItem, due_date: e.target.value })}
                    />
                  </div>
                </div>
                <Button onClick={handleAddActionItem} disabled={isCreatingAction} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Action Item
                </Button>
              </div>

              {/* List action items */}
              <div className="space-y-2">
                <h3 className="font-semibold">Action Items</h3>
                {actionItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum action item criado ainda.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {actionItems.map((item) => (
                      <div key={item.id} className="border rounded-lg p-3 space-y-2">
                        <div className="flex items-start justify-between">
                          <p className="text-sm font-medium flex-1">{item.description}</p>
                          <Badge variant={
                            item.status === 'completed' ? 'default' : 
                            item.status === 'in_progress' ? 'secondary' : 
                            'outline'
                          }>
                            {item.status === 'completed' ? 'Concluído' : 
                             item.status === 'in_progress' ? 'Em Progresso' : 
                             'Pendente'}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{item.assignee?.full_name}</span>
                          {item.due_date && <span>Prazo: {new Date(item.due_date).toLocaleDateString()}</span>}
                        </div>
                        <Select
                          value={item.status}
                          onValueChange={(value) => updateActionItem({
                            id: item.id,
                            input: { status: value as any }
                          })}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pendente</SelectItem>
                            <SelectItem value="in_progress">Em Progresso</SelectItem>
                            <SelectItem value="completed">Concluído</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSaveMeetingData}>
            Salvar e Finalizar Reunião
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
