import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SectionCard } from "@/components/primitives";
import { supabase } from "@/integrations/supabase/client";
import type {
  ApplicationRow,
  ContractType,
} from "@/integrations/supabase/hiring-types";
import { useStartAdmission } from "@/hooks/hiring/useOnboardingHandoff";

interface AdmissionFormProps {
  application: ApplicationRow;
  companyId: string;
  onStarted: () => void;
  onCancel: () => void;
}

export function AdmissionForm({ application, companyId, onStarted, onCancel }: AdmissionFormProps) {
  const [teamId, setTeamId] = useState<string | null>(null);
  const [leaderId, setLeaderId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState("");
  const [contractType, setContractType] = useState<ContractType>("clt");
  const [costCents, setCostCents] = useState<string>("");
  const [finalTitle, setFinalTitle] = useState("");

  const startAdmission = useStartAdmission();

  const { data: teams = [] } = useQuery({
    queryKey: ["admission-teams", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teams")
        .select("id, name")
        .eq("company_id", companyId)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: leaderCandidates = [] } = useQuery({
    queryKey: ["admission-leaders", teamId],
    enabled: !!teamId,
    queryFn: async () => {
      if (!teamId) return [];
      const { data, error } = await supabase
        .from("team_members")
        .select("leader:profiles!team_members_leader_id_fkey(id, full_name)")
        .eq("team_id", teamId)
        .not("leader_id", "is", null);
      if (error) throw error;
      const seen = new Set<string>();
      const out: { id: string; full_name: string }[] = [];
      for (const row of data ?? []) {
        const l = (row as { leader?: { id?: string; full_name?: string } | null }).leader;
        if (l?.id && !seen.has(l.id)) {
          seen.add(l.id);
          out.push({ id: l.id, full_name: l.full_name ?? l.id });
        }
      }
      return out;
    },
  });

  const canSubmit = useMemo(() => {
    return teamId && leaderId && startDate && contractType;
  }, [teamId, leaderId, startDate, contractType]);

  return (
    <SectionCard title="Iniciar admissão" description="Crie o pré-cadastro do colaborador a partir da aplicação aprovada.">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1">
          <Label>Time</Label>
          <Select value={teamId ?? undefined} onValueChange={(v) => setTeamId(v)}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {teams.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Líder</Label>
          <Select value={leaderId ?? undefined} onValueChange={(v) => setLeaderId(v)}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {leaderCandidates.map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Data de início</Label>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Tipo de contratação</Label>
          <Select value={contractType} onValueChange={(v) => setContractType(v as ContractType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="clt">CLT</SelectItem>
              <SelectItem value="pj">PJ</SelectItem>
              <SelectItem value="estagio">Estágio</SelectItem>
              <SelectItem value="pj_equity">PJ + equity</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Custo (em centavos de R$)</Label>
          <Input type="number" min={0} value={costCents} onChange={(e) => setCostCents(e.target.value)} />
        </div>
        <div className="space-y-1 md:col-span-2">
          <Label>Cargo final</Label>
          <Input value={finalTitle} onChange={(e) => setFinalTitle(e.target.value)} />
        </div>
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button
          disabled={!canSubmit || startAdmission.isPending}
          onClick={() =>
            startAdmission.mutate(
              {
                applicationId: application.id,
                expectedUpdatedAt: application.updated_at,
                teamId,
                leaderId,
                startDate: startDate || null,
                contractType,
                costCents: costCents ? Number(costCents) : null,
                finalTitle: finalTitle || null,
              },
              { onSuccess: () => onStarted() },
            )
          }
        >
          {startAdmission.isPending ? "Iniciando…" : "Iniciar admissão"}
        </Button>
      </div>
    </SectionCard>
  );
}
