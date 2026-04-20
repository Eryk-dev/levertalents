import { useQuery } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useVisibleCompanies } from "@/lib/hiring/rlsScope";

export interface PipelineFiltersState {
  companyId: string;
  managerId: string;
  preset: "7d" | "30d" | "90d" | "custom";
  start: string;
  end: string;
}

interface PipelineFiltersProps {
  value: PipelineFiltersState;
  onChange: (next: PipelineFiltersState) => void;
}

export function PipelineFilters({ value, onChange }: PipelineFiltersProps) {
  const { companyIds, canSeeAll } = useVisibleCompanies();
  const { data: companies = [] } = useQuery({
    queryKey: ["pipeline-filter-companies", canSeeAll, companyIds.join(",")],
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
    queryKey: ["pipeline-filter-managers"],
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

  const onPreset = (preset: PipelineFiltersState["preset"]) => {
    const now = new Date();
    const end = now.toISOString().slice(0, 10);
    let start = end;
    if (preset === "7d") start = new Date(now.getTime() - 7 * 86_400_000).toISOString().slice(0, 10);
    if (preset === "30d") start = new Date(now.getTime() - 30 * 86_400_000).toISOString().slice(0, 10);
    if (preset === "90d") start = new Date(now.getTime() - 90 * 86_400_000).toISOString().slice(0, 10);
    onChange({ ...value, preset, start: preset === "custom" ? value.start : start, end: preset === "custom" ? value.end : end });
  };

  return (
    <div className="grid gap-3 md:grid-cols-4">
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Empresa</label>
        <Select
          value={value.companyId}
          onValueChange={(v) => onChange({ ...value, companyId: v })}
        >
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
        <Select
          value={value.managerId}
          onValueChange={(v) => onChange({ ...value, managerId: v })}
        >
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
        <Select value={value.preset} onValueChange={(v) => onPreset(v as PipelineFiltersState["preset"])}>
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
