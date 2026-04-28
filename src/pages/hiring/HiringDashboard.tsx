import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Briefcase, CheckCircle2, Download, Timer, Users } from "lucide-react";
import { LoadingState, StatusBadge } from "@/components/primitives";
import { Btn, Card, Row, SectionHeader, LinearEmpty } from "@/components/primitives/LinearKit";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useVisibleCompanies } from "@/lib/hiring/rlsScope";
import { useHiringMetrics } from "@/hooks/hiring/useHiringMetrics";
import { BottleneckAlert } from "@/components/hiring/BottleneckAlert";
import { ConversionFunnel } from "@/components/hiring/ConversionFunnel";

/**
 * Dashboard analytics filters: date-range + companyId + managerId.
 * Inlined em Plan 02-08 quando `PipelineFilters` foi rewritten para inline
 * URL-based filters do kanban (RS-09) — domínio diferente.
 */
interface DashboardFiltersState {
  companyId: string;
  managerId: string;
  preset: "7d" | "30d" | "90d" | "custom";
  start: string;
  end: string;
}

function DashboardFilters({
  value,
  onChange,
}: {
  value: DashboardFiltersState;
  onChange: (next: DashboardFiltersState) => void;
}) {
  const { companyIds, canSeeAll } = useVisibleCompanies();
  const { data: companies = [] } = useQuery({
    queryKey: ["dashboard-filter-companies", canSeeAll, companyIds.join(",")],
    queryFn: async () => {
      let q = supabase.from("companies").select("id,name").order("name");
      if (!canSeeAll)
        q = q.in("id", companyIds.length ? companyIds : ["00000000-0000-0000-0000-000000000000"]);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: managers = [] } = useQuery({
    queryKey: ["dashboard-filter-managers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name")
        .order("full_name")
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  const onPreset = (preset: DashboardFiltersState["preset"]) => {
    const now = new Date();
    const end = now.toISOString().slice(0, 10);
    let start = end;
    if (preset === "7d") start = new Date(now.getTime() - 7 * 86_400_000).toISOString().slice(0, 10);
    if (preset === "30d") start = new Date(now.getTime() - 30 * 86_400_000).toISOString().slice(0, 10);
    if (preset === "90d") start = new Date(now.getTime() - 90 * 86_400_000).toISOString().slice(0, 10);
    onChange({
      ...value,
      preset,
      start: preset === "custom" ? value.start : start,
      end: preset === "custom" ? value.end : end,
    });
  };

  return (
    <div className="grid gap-3 md:grid-cols-4">
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Empresa</label>
        <Select value={value.companyId} onValueChange={(v) => onChange({ ...value, companyId: v })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {companies.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Gestor</label>
        <Select value={value.managerId} onValueChange={(v) => onChange({ ...value, managerId: v })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {managers.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Período</label>
        <Select value={value.preset} onValueChange={(v) => onPreset(v as DashboardFiltersState["preset"])}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Últimos 7 dias</SelectItem>
            <SelectItem value="30d">Últimos 30 dias</SelectItem>
            <SelectItem value="90d">Últimos 90 dias</SelectItem>
            <SelectItem value="custom">Personalizado</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {value.preset === "custom" ? (
        <div className="grid grid-cols-2 gap-2">
          <Input type="date" value={value.start} onChange={(e) => onChange({ ...value, start: e.target.value })} />
          <Input type="date" value={value.end} onChange={(e) => onChange({ ...value, end: e.target.value })} />
        </div>
      ) : null}
    </div>
  );
}

export default function HiringDashboard() {
  const [filters, setFilters] = useState<DashboardFiltersState>({
    companyId: "all",
    managerId: "all",
    preset: "30d",
    start: new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10),
    end: new Date().toISOString().slice(0, 10),
  });

  const { data, isLoading } = useHiringMetrics({
    companyId: filters.companyId === "all" ? null : filters.companyId,
    managerId: filters.managerId === "all" ? null : filters.managerId,
    start: filters.start,
    end: filters.end,
  });

  const totalActiveJobs = useMemo(() => {
    if (!data) return 0;
    return data.jobsByStatus
      .filter((r) => r.status !== "fechada")
      .reduce((acc, row) => acc + row.count, 0);
  }, [data]);

  const totalCandidatesInPipeline = useMemo(() => {
    if (!data) return 0;
    return data.applicationsByStage
      .filter((r) => !["admitido", "recusado", "reprovado_pelo_gestor"].includes(r.stage))
      .reduce((acc, row) => acc + row.count, 0);
  }, [data]);

  const exportCsv = useMutation({
    mutationFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      const accessToken = session.session?.access_token;
      const url = `${(import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? ""}/functions/v1/hiring-export-pipeline-csv?` +
        new URLSearchParams({
          from_date: filters.start,
          to_date: filters.end,
          ...(filters.companyId !== "all" ? { company_id: filters.companyId } : {}),
        }).toString();
      const res = await fetch(url, {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });
      if (!res.ok) {
        const msg = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error((msg as { error?: string }).error ?? `HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = `hiring-export-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(href);
    },
    onSuccess: () => toast({ title: "CSV exportado" }),
    onError: (err: Error) =>
      toast({ title: "Falha ao exportar", description: err.message, variant: "destructive" }),
  });

  return (
    <div className="p-5 lg:p-7 font-sans text-text max-w-[1400px] mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="text-[20px] font-semibold tracking-[-0.02em] m-0">
            Dashboard de Recrutamento
          </h1>
          <div className="text-[13px] text-text-muted mt-0.5">
            Pipeline · gargalos · conversão — tudo a partir do banco
          </div>
        </div>
        <Row gap={6}>
          <Btn
            variant="primary"
            size="sm"
            icon={<Download className="w-3.5 h-3.5" />}
            onClick={() => exportCsv.mutate()}
            disabled={exportCsv.isPending}
          >
            Exportar CSV
          </Btn>
        </Row>
      </div>

      {/* Filters */}
      <div className="mt-5">
        <DashboardFilters value={filters} onChange={setFilters} />
      </div>

      {isLoading ? (
        <div className="mt-5">
          <LoadingState layout="stats" count={4} />
        </div>
      ) : data ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
            <KpiTile label="Vagas ativas" value={String(totalActiveJobs)} icon={<Briefcase className="w-4 h-4" />} />
            <KpiTile
              label="Tempo médio"
              value={data.avgDaysPerJob ? data.avgDaysPerJob.toFixed(1) + "d" : "—"}
              icon={<Timer className="w-4 h-4" />}
            />
            <KpiTile
              label="Taxa de aprovação"
              value={data.finalApprovalRate !== null ? `${Math.round(data.finalApprovalRate * 100)}%` : "—"}
              icon={<CheckCircle2 className="w-4 h-4" />}
              delta={data.finalApprovalRate && data.finalApprovalRate > 0.2 ? "good" : undefined}
            />
            <KpiTile label="Em pipeline" value={String(totalCandidatesInPipeline)} icon={<Users className="w-4 h-4" />} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-5">
            <div>
              <SectionHeader title="Vagas por status" />
              <Card contentClassName="p-3.5">
                {data.jobsByStatus.length === 0 ? (
                  <LinearEmpty
                    icon={<Briefcase className="w-[18px] h-[18px]" />}
                    title="Sem vagas"
                    dashed={false}
                  />
                ) : (
                  <ul className="space-y-1.5">
                    {data.jobsByStatus.map((row) => (
                      <li key={row.status} className="flex items-center justify-between text-[13px]">
                        <StatusBadge kind="job" status={row.status} size="sm" />
                        <span className="tabular text-text-muted">{row.count}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>

            <div>
              <SectionHeader title="Funil de conversão" />
              <ConversionFunnel data={data.conversionByStage} />
            </div>
          </div>

          <SectionHeader title="Gargalos · candidatos parados há 3+ dias" />
          <Card contentClassName="p-3.5">
            {data.bottlenecks.length === 0 ? (
              <LinearEmpty
                icon={<Timer className="w-[18px] h-[18px]" />}
                title="Sem gargalos"
                description="Todos os candidatos foram movimentados nos últimos 3 dias."
                dashed={false}
              />
            ) : (
              <ul className="space-y-2">
                {data.bottlenecks.map((b) => (
                  <BottleneckAlert key={b.application_id} bottleneck={b} />
                ))}
              </ul>
            )}
          </Card>
        </>
      ) : null}
    </div>
  );
}

function KpiTile({
  label,
  value,
  icon,
  delta,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  delta?: "good" | "bad";
}) {
  return (
    <div className="surface-paper p-3.5">
      <div className="flex items-center justify-between">
        <div className="text-[11px] uppercase tracking-[0.05em] text-text-subtle font-semibold">
          {label}
        </div>
        <span className="text-text-muted">{icon}</span>
      </div>
      <div className="text-[26px] font-semibold tabular tracking-[-0.02em] mt-2 leading-[1.05]">
        {value}
      </div>
      {delta && (
        <div className={`text-[11.5px] mt-1 ${delta === "good" ? "text-status-green" : "text-status-red"}`}>
          {delta === "good" ? "no alvo" : "abaixo"}
        </div>
      )}
    </div>
  );
}
