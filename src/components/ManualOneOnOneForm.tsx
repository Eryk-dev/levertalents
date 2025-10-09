import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ManualOneOnOneFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function ManualOneOnOneForm({ onSuccess, onCancel }: ManualOneOnOneFormProps) {
  const [selectedCollaborator, setSelectedCollaborator] = useState("");
  const { register, handleSubmit, setValue, formState: { errors } } = useForm();

  const { data: teamMembers } = useQuery({
    queryKey: ["team-members"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data } = await supabase
        .from("team_members")
        .select("*, user:profiles!team_members_user_id_fkey(id, full_name)")
        .eq("leader_id", user.id);

      return data || [];
    },
  });

  const onSubmit = async (data: any) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("one_on_ones")
      .insert([{
        leader_id: user.id,
        collaborator_id: selectedCollaborator,
        scheduled_date: data.scheduled_date,
        duration_minutes: parseInt(data.duration_minutes),
        status: 'completed',
        agenda: data.agenda,
        notes: data.notes,
        leader_feedback: data.leader_feedback,
        collaborator_feedback: data.collaborator_feedback,
      }]);

    if (error) {
      console.error("Erro ao criar 1:1:", error);
      return;
    }

    onSuccess();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label>Colaborador</Label>
        <Select value={selectedCollaborator} onValueChange={setSelectedCollaborator}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione o colaborador" />
          </SelectTrigger>
          <SelectContent>
            {teamMembers?.map((member: any) => (
              <SelectItem key={member.user_id} value={member.user_id}>
                {member.user?.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Data da Reunião</Label>
        <Input type="datetime-local" {...register("scheduled_date", { required: true })} />
      </div>

      <div>
        <Label>Duração (minutos)</Label>
        <Input type="number" defaultValue={60} {...register("duration_minutes")} />
      </div>

      <div>
        <Label>Agenda</Label>
        <Textarea {...register("agenda")} />
      </div>

      <div>
        <Label>Notas da Reunião</Label>
        <Textarea {...register("notes")} rows={5} />
      </div>

      <div>
        <Label>Feedback do Líder</Label>
        <Textarea {...register("leader_feedback")} />
      </div>

      <div>
        <Label>Feedback do Colaborador</Label>
        <Textarea {...register("collaborator_feedback")} />
      </div>

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={!selectedCollaborator}>
          Salvar 1:1
        </Button>
      </div>
    </form>
  );
}