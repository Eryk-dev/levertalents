import { useState } from "react";
import { useForm } from "react-hook-form";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Btn, Col, Row } from "@/components/primitives/LinearKit";
import { Icon } from "@/components/primitives/Icon";

interface ManualPDIFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

/**
 * Formulário manual/retroativo de PDI.
 * Migrado para padrão Linear (labels uppercase, inputs densos).
 * Mantém Popover/Calendar shadcn para date-picking (útil em múltiplas datas).
 *
 * TODO: Unificar com PDIFormIntegrated — hoje existem dois modelos
 * (legacy: title/description/goals/action_items e novo: main_objective/…).
 * Este form ainda gera dados no schema legacy para preencher histórico retroativo
 * com datas arbitrárias; merge exigirá ajuste em pipelines de listagem.
 */
export function ManualPDIForm({ onSuccess, onCancel }: ManualPDIFormProps) {
  const { register, handleSubmit, setValue } = useForm();
  const [selectedCollaborator, setSelectedCollaborator] = useState<string>("");
  const [startDate, setStartDate] = useState<Date>();
  const [deadline, setDeadline] = useState<Date>();
  const [completedDate, setCompletedDate] = useState<Date>();
  const [status, setStatus] = useState<string>("in_progress");
  const { userRole } = useAuth();
  const isLeader = userRole === "lider";

  const { data: teamMembers } = useQuery({
    queryKey: ["team-members-for-pdi"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || !isLeader) return [];

      const { data } = await supabase
        .from("team_members")
        .select(
          `
          user_id,
          user:profiles!team_members_user_id_fkey(id, full_name)
        `,
        )
        .eq("leader_id", user.id);

      return data || [];
    },
    enabled: isLeader,
  });

  const onSubmit = async (formData: any) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const pdiData = {
      user_id: isLeader ? selectedCollaborator : user.id,
      title: formData.title,
      description: formData.description || null,
      development_area: formData.development_area,
      goals: formData.goals,
      action_items: formData.action_items,
      timeline: formData.timeline || null,
      status,
      progress_percentage: parseInt(formData.progress_percentage) || 0,
      deadline: deadline ? format(deadline, "yyyy-MM-dd") : null,
      created_at: startDate ? startDate.toISOString() : new Date().toISOString(),
      completed_at: completedDate ? completedDate.toISOString() : null,
    };

    const { error } = await supabase.from("development_plans").insert([pdiData]);
    if (error) {
      console.error("Error creating PDI:", error);
      return;
    }
    onSuccess();
  };

  const inputBase =
    "w-full h-[34px] px-2.5 text-[13px] text-text bg-surface border border-border rounded-md outline-none focus:border-border-focus transition-colors font-sans";
  const textareaBase =
    "w-full min-h-[70px] p-2.5 text-[13px] text-text bg-surface border border-border rounded-md resize-y outline-none focus:border-border-focus transition-colors font-sans leading-[1.55]";

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Col gap={14}>
        {isLeader && (
          <FieldLabel label="Colaborador" required>
            <select
              value={selectedCollaborator}
              onChange={(e) => setSelectedCollaborator(e.target.value)}
              className={`${inputBase} appearance-none cursor-pointer`}
              required
            >
              <option value="">Selecione o colaborador</option>
              {teamMembers?.map((member: any) => (
                <option key={member.user_id} value={member.user_id}>
                  {member.user.full_name}
                </option>
              ))}
            </select>
          </FieldLabel>
        )}

        <FieldLabel label="Título" required>
          <input
            {...register("title")}
            placeholder="Ex: Desenvolvimento em Liderança"
            required
            className={inputBase}
          />
        </FieldLabel>

        <FieldLabel label="Área de desenvolvimento" required>
          <input
            {...register("development_area")}
            placeholder="Ex: Liderança, Técnico, Comunicação"
            required
            className={inputBase}
          />
        </FieldLabel>

        <FieldLabel label="Descrição" optional>
          <textarea
            {...register("description")}
            placeholder="Descreva o contexto e objetivo…"
            rows={3}
            className={textareaBase}
          />
        </FieldLabel>

        <FieldLabel label="Objetivos" required>
          <textarea
            {...register("goals")}
            placeholder="Liste os objetivos específicos…"
            rows={3}
            required
            className={textareaBase}
          />
        </FieldLabel>

        <FieldLabel label="Plano de ação" required>
          <textarea
            {...register("action_items")}
            placeholder="Descreva as ações necessárias…"
            rows={3}
            required
            className={textareaBase}
          />
        </FieldLabel>

        <FieldLabel label="Prazo descritivo" optional>
          <input
            {...register("timeline")}
            placeholder="Ex: 3 meses, Q2 2026"
            className={inputBase}
          />
        </FieldLabel>

        <Row gap={10} align="start">
          <FieldLabel label="Data de início" className="flex-1" optional>
            <DateTrigger
              value={startDate}
              onChange={setStartDate}
              placeholder="Selecione"
            />
          </FieldLabel>
          <FieldLabel label="Prazo final" className="flex-1" optional>
            <DateTrigger
              value={deadline}
              onChange={setDeadline}
              placeholder="Selecione"
            />
          </FieldLabel>
        </Row>

        <FieldLabel label="Status inicial" required>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setValue("status", e.target.value);
            }}
            className={`${inputBase} appearance-none cursor-pointer`}
            required
          >
            <option value="pending_approval">Aguardando aprovação</option>
            <option value="approved">Aprovado</option>
            <option value="in_progress">Em andamento</option>
            <option value="completed">Concluído</option>
          </select>
        </FieldLabel>

        <Row gap={10} align="start">
          <FieldLabel label="Progresso inicial (%)" className="flex-1" optional>
            <input
              type="number"
              min="0"
              max="100"
              defaultValue="0"
              {...register("progress_percentage")}
              placeholder="0-100"
              className={inputBase}
            />
          </FieldLabel>
          <FieldLabel
            label="Data de conclusão"
            className="flex-1"
            optional
          >
            <DateTrigger
              value={completedDate}
              onChange={setCompletedDate}
              placeholder="Se já concluído"
            />
          </FieldLabel>
        </Row>

        <Row justify="end" gap={8} className="pt-3 border-t border-border">
          <Btn variant="secondary" size="md" type="button" onClick={onCancel}>
            Cancelar
          </Btn>
          <Btn variant="primary" size="md" type="submit">
            Salvar PDI
          </Btn>
        </Row>
      </Col>
    </form>
  );
}

/* ─── Helpers ──────────────────────────────────────────────── */

function FieldLabel({
  label,
  required,
  optional,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  optional?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-[10.5px] font-semibold uppercase tracking-[0.05em] text-text">
          {label}
          {required && <span className="text-status-red ml-0.5">*</span>}
        </label>
        {optional && <span className="text-[11px] text-text-subtle">Opcional</span>}
      </div>
      {children}
    </div>
  );
}

function DateTrigger({
  value,
  onChange,
  placeholder,
}: {
  value?: Date;
  onChange: (v?: Date) => void;
  placeholder: string;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "w-full h-[34px] px-2.5 text-[13px] bg-surface border border-border rounded-md outline-none font-sans inline-flex items-center gap-2 transition-colors hover:border-border-strong",
            !value && "text-text-subtle",
            value && "text-text",
          )}
        >
          <Icon name="calendar" size={12} className="text-text-muted" />
          <span className="flex-1 text-left truncate">
            {value ? format(value, "PPP", { locale: ptBR }) : placeholder}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="single" selected={value} onSelect={onChange} initialFocus />
      </PopoverContent>
    </Popover>
  );
}
