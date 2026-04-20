import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SectionCard, StatusBadge } from "@/components/primitives";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  useInterviewDecisions,
  useMyInterviewDecision,
  useSubmitInterviewDecision,
} from "@/hooks/hiring/useInterviewDecision";
import type { InterviewRow } from "@/integrations/supabase/hiring-types";

interface HiringDecisionPanelProps {
  interview: InterviewRow;
}

export function HiringDecisionPanel({ interview }: HiringDecisionPanelProps) {
  const { user } = useAuth();
  const { data: decisions = [] } = useInterviewDecisions(interview.id);
  const { data: mine } = useMyInterviewDecision(interview.id);
  const submit = useSubmitInterviewDecision();

  const [comments, setComments] = useState(mine?.comments ?? "");

  const participantIds = interview.participants;
  const { data: participants = [] } = useQuery({
    queryKey: ["decision-panel-participants", participantIds.join(",")],
    enabled: participantIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", participantIds);
      if (error) throw error;
      return data ?? [];
    },
  });

  const participantsById = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of participants) map.set(p.id, p.full_name);
    return map;
  }, [participants]);

  const decisionByEvaluator = useMemo(() => {
    const map = new Map<string, string>();
    for (const d of decisions) map.set(d.evaluator_id, d.decision);
    return map;
  }, [decisions]);

  const isMyTurn = user?.id && interview.participants.includes(user.id);

  return (
    <SectionCard
      title="Decisão final"
      description="Registre sua decisão individual. Unanimidade = aprovação; qualquer reprovação encerra."
    >
      <div className="space-y-4">
        <ul className="space-y-2">
          {interview.participants.map((pid) => {
            const decision = decisionByEvaluator.get(pid) ?? "pendente";
            return (
              <li key={pid} className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">
                <span>{participantsById.get(pid) ?? pid}</span>
                <span>
                  <StatusBadge
                    kind="task"
                    status={decision === "pendente" ? "pending" : decision === "aprovado" ? "completed" : "cancelled"}
                  />
                </span>
              </li>
            );
          })}
        </ul>

        {isMyTurn ? (
          <div className="space-y-3 rounded-md border border-border bg-card p-3">
            <p className="text-sm font-medium">Sua decisão</p>
            <Textarea
              rows={3}
              placeholder="Justificativa (obrigatória em caso de reprovação)"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="destructive"
                disabled={submit.isPending}
                onClick={() =>
                  submit.mutate({
                    interviewId: interview.id,
                    decision: "reprovado",
                    comments,
                  })
                }
              >
                Reprovar
              </Button>
              <Button
                disabled={submit.isPending}
                onClick={() =>
                  submit.mutate({
                    interviewId: interview.id,
                    decision: "aprovado",
                    comments,
                  })
                }
              >
                Aprovar
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Você não é avaliador desta entrevista.</p>
        )}
      </div>
    </SectionCard>
  );
}
