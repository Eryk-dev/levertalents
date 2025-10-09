import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface ManualPDIFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function ManualPDIForm({ onSuccess, onCancel }: ManualPDIFormProps) {
  const { register, handleSubmit, setValue } = useForm();
  const [selectedCollaborator, setSelectedCollaborator] = useState<string>("");
  const [startDate, setStartDate] = useState<Date>();
  const [deadline, setDeadline] = useState<Date>();
  const [completedDate, setCompletedDate] = useState<Date>();
  const { userRole } = useAuth();
  const isLeader = userRole === "lider";

  const { data: teamMembers } = useQuery({
    queryKey: ["team-members-for-pdi"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !isLeader) return [];

      const { data } = await supabase
        .from("team_members")
        .select(`
          user_id,
          user:profiles!team_members_user_id_fkey(id, full_name)
        `)
        .eq("leader_id", user.id);

      return data || [];
    },
    enabled: isLeader,
  });

  const onSubmit = async (formData: any) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const pdiData = {
      user_id: isLeader ? selectedCollaborator : user.id,
      title: formData.title,
      description: formData.description || null,
      development_area: formData.development_area,
      goals: formData.goals,
      action_items: formData.action_items,
      timeline: formData.timeline || null,
      status: formData.status,
      progress_percentage: parseInt(formData.progress_percentage) || 0,
      deadline: deadline ? format(deadline, "yyyy-MM-dd") : null,
      created_at: startDate ? startDate.toISOString() : new Date().toISOString(),
      completed_at: completedDate ? completedDate.toISOString() : null,
    };

    const { error } = await supabase
      .from("development_plans")
      .insert([pdiData]);

    if (error) {
      console.error("Error creating PDI:", error);
      return;
    }

    onSuccess();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {isLeader && (
        <div className="space-y-2">
          <Label>Colaborador *</Label>
          <Select value={selectedCollaborator} onValueChange={setSelectedCollaborator} required>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o colaborador" />
            </SelectTrigger>
            <SelectContent>
              {teamMembers?.map((member: any) => (
                <SelectItem key={member.user_id} value={member.user_id}>
                  {member.user.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-2">
        <Label>Título *</Label>
        <Input {...register("title")} placeholder="Ex: Desenvolvimento em Liderança" required />
      </div>

      <div className="space-y-2">
        <Label>Área de Desenvolvimento *</Label>
        <Input {...register("development_area")} placeholder="Ex: Liderança, Técnico, Comunicação" required />
      </div>

      <div className="space-y-2">
        <Label>Descrição</Label>
        <Textarea {...register("description")} placeholder="Descreva o contexto e objetivo..." rows={3} />
      </div>

      <div className="space-y-2">
        <Label>Objetivos *</Label>
        <Textarea {...register("goals")} placeholder="Liste os objetivos específicos..." rows={3} required />
      </div>

      <div className="space-y-2">
        <Label>Plano de Ação *</Label>
        <Textarea {...register("action_items")} placeholder="Descreva as ações necessárias..." rows={3} required />
      </div>

      <div className="space-y-2">
        <Label>Prazo Descritivo</Label>
        <Input {...register("timeline")} placeholder="Ex: 3 meses, Q2 2024" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Data de Início</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !startDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDate ? format(startDate, "PPP", { locale: ptBR }) : "Selecione a data"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={setStartDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Label>Prazo Final</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !deadline && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {deadline ? format(deadline, "PPP", { locale: ptBR }) : "Selecione a data"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={deadline}
                onSelect={setDeadline}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Status Inicial *</Label>
        <Select onValueChange={(value) => setValue("status", value)} required>
          <SelectTrigger>
            <SelectValue placeholder="Selecione o status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending_approval">Aguardando Aprovação</SelectItem>
            <SelectItem value="approved">Aprovado</SelectItem>
            <SelectItem value="in_progress">Em Andamento</SelectItem>
            <SelectItem value="completed">Concluído</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Progresso Inicial (%)</Label>
        <Input
          type="number"
          min="0"
          max="100"
          defaultValue="0"
          {...register("progress_percentage")}
          placeholder="0-100"
        />
      </div>

      <div className="space-y-2">
        <Label>Data de Conclusão (se já concluído)</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !completedDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {completedDate ? format(completedDate, "PPP", { locale: ptBR }) : "Selecione a data"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={completedDate}
              onSelect={setCompletedDate}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit">
          Salvar PDI
        </Button>
      </div>
    </form>
  );
}
