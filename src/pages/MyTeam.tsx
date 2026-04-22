import { useState, useMemo } from "react";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Users, Calendar, Filter, ChevronRight, Zap } from "lucide-react";
import { LoadingState } from "@/components/primitives/LoadingState";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Btn,
  Row,
  LinearEmpty,
  LinearAvatar,
  ProgressBar,
} from "@/components/primitives/LinearKit";

export default function MyTeam() {
  const navigate = useNavigate();
  const { data: profile } = useUserProfile();

  const { data: rawTeamMembers = [], isLoading: isLoadingTeam } = useQuery({
    queryKey: ["my-team-members", profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await supabase
        .from("team_members")
        .select("id, user_id, position, team_id")
        .eq("leader_id", user.id);
      return data || [];
    },
    refetchOnMount: true,
  });

  const userIds = rawTeamMembers.map((m: any) => m.user_id);
  const { data: memberProfiles = [] } = useQuery({
    queryKey: ["team-member-profiles", userIds],
    enabled: userIds.length > 0,
    queryFn: async () => {
      if (userIds.length === 0) return [];
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, phone, department, hire_date")
        .in("id", userIds);
      return data || [];
    },
  });

  const teamIds = [...new Set(rawTeamMembers.map((m: any) => m.team_id))];
  const { data: teams = [] } = useQuery({
    queryKey: ["teams-info", teamIds],
    enabled: teamIds.length > 0,
    queryFn: async () => {
      if (teamIds.length === 0) return [];
      const { data } = await supabase.from("teams").select("id, name").in("id", teamIds);
      return data || [];
    },
  });

  // Fetch PDI progress + last 1:1 + next 1:1 + climate score for each member
  const { data: memberMetrics = {} } = useQuery<
    Record<string, { pdi: number; last11?: string; next11?: string; perf?: number; clima?: number }>
  >({
    queryKey: ["my-team-metrics", userIds],
    enabled: userIds.length > 0,
    queryFn: async () => {
      if (userIds.length === 0) return {};
      const [pdiRes, oneOnOnes, evals, climate] = await Promise.all([
        supabase
          .from("development_plans")
          .select("user_id, progress_percentage, status")
          .in("user_id", userIds)
          .in("status", ["in_progress", "approved"]),
        supabase
          .from("one_on_ones")
          .select("collaborator_id, scheduled_date, status")
          .in("collaborator_id", userIds)
          .order("scheduled_date", { ascending: false }),
        supabase
          .from("evaluations")
          .select("evaluated_user_id, overall_score")
          .in("evaluated_user_id", userIds)
          .eq("status", "completed"),
        supabase
          .from("climate_responses")
          .select("user_id, score")
          .in("user_id", userIds),
      ]);

      const map: Record<string, any> = {};
      for (const id of userIds) {
        map[id] = { pdi: 0 };
      }
      (pdiRes.data || []).forEach((p: any) => {
        if (!map[p.user_id]) return;
        map[p.user_id].pdi = Math.max(map[p.user_id].pdi, p.progress_percentage || 0);
      });
      const now = Date.now();
      (oneOnOnes.data || []).forEach((o: any) => {
        if (!map[o.collaborator_id]) return;
        const entry = map[o.collaborator_id];
        const when = o.scheduled_date ? new Date(o.scheduled_date).getTime() : 0;
        if (o.status === "completed" && when <= now) {
          if (!entry.last11 || when > new Date(entry.last11).getTime()) entry.last11 = o.scheduled_date;
        } else if (o.status === "scheduled" && when >= now) {
          if (!entry.next11 || when < new Date(entry.next11).getTime()) entry.next11 = o.scheduled_date;
        }
      });
      (evals.data || []).forEach((e: any) => {
        if (!map[e.evaluated_user_id]) return;
        const list = map[e.evaluated_user_id]._scores || [];
        list.push(e.overall_score);
        map[e.evaluated_user_id]._scores = list;
      });
      (climate.data || []).forEach((c: any) => {
        if (!map[c.user_id]) return;
        const list = map[c.user_id]._clima || [];
        list.push(c.score);
        map[c.user_id]._clima = list;
      });
      for (const id in map) {
        const sc: number[] = map[id]._scores || [];
        if (sc.length) map[id].perf = sc.reduce((a, b) => a + b, 0) / sc.length;
        delete map[id]._scores;
        const cl: number[] = map[id]._clima || [];
        if (cl.length) map[id].clima = cl.reduce((a, b) => a + b, 0) / cl.length;
        delete map[id]._clima;
      }
      return map;
    },
  });

  const allTeamMembers = rawTeamMembers.map((tm: any) => ({
    ...tm,
    user: memberProfiles.find((p: any) => p.id === tm.user_id),
    team: teams.find((t: any) => t.id === tm.team_id),
    metrics: memberMetrics[tm.user_id] || { pdi: 0 },
  }));

  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [teamFilter, setTeamFilter] = useState<string[]>([]);

  const teamOptions = useMemo(() => {
    const map = new Map<string, string>();
    allTeamMembers.forEach((m) => {
      if (m.team?.id && m.team?.name) map.set(m.team.id, m.team.name);
    });
    return Array.from(map, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [allTeamMembers]);

  const memberAttn = (m: any) => {
    const last = m.metrics.last11 ? new Date(m.metrics.last11) : null;
    const daysSince = last ? Math.floor((Date.now() - last.getTime()) / 86_400_000) : 999;
    return daysSince > 14 || m.metrics.pdi < 30 || (m.metrics.perf && m.metrics.perf < 3.5);
  };

  const teamMembers = allTeamMembers.filter((m) => {
    if (teamFilter.length && (!m.team_id || !teamFilter.includes(m.team_id))) return false;
    if (statusFilter.length) {
      const isAttn = memberAttn(m);
      if (statusFilter.includes("attention") && !isAttn) return false;
      if (statusFilter.includes("ok") && isAttn) return false;
    }
    return true;
  });

  const activeFilterCount = statusFilter.length + teamFilter.length;
  const toggleIn = (arr: string[], v: string) =>
    arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];

  const attn = teamMembers.filter((m) => memberAttn(m));

  const daysAgo = (iso?: string) => {
    if (!iso) return "—";
    const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
    return d === 0 ? "hoje" : `há ${d} d`;
  };

  // Next 1:1 across the team (soonest scheduled)
  const upcomingNext11 = teamMembers
    .map((m) => m.metrics.next11)
    .filter((d): d is string => !!d)
    .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0];
  const upcomingLabel = upcomingNext11
    ? (() => {
        const d = new Date(upcomingNext11);
        const today = new Date();
        const sameDay =
          d.getFullYear() === today.getFullYear() &&
          d.getMonth() === today.getMonth() &&
          d.getDate() === today.getDate();
        const hh = d.getHours().toString().padStart(2, "0");
        const mm = d.getMinutes().toString().padStart(2, "0");
        if (sameDay) return `próxima 1:1 hoje ${hh}:${mm}`;
        const dd = d.getDate().toString().padStart(2, "0");
        const month = d.toLocaleString("pt-BR", { month: "short" }).replace(".", "");
        return `próxima 1:1 ${dd} ${month} ${hh}:${mm}`;
      })()
    : null;

  return (
    <div className="p-5 lg:p-7 font-sans text-text max-w-[1400px] mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="text-[20px] font-semibold tracking-[-0.02em] m-0">Meu time</h1>
          <div className="text-[13px] text-text-muted mt-0.5">
            {teamMembers.length} {teamMembers.length === 1 ? "pessoa" : "pessoas"} · {attn.length} pedem atenção
            {upcomingLabel && <> · {upcomingLabel}</>}
          </div>
        </div>
        <Row gap={6}>
          <Popover>
            <PopoverTrigger asChild>
              <Btn variant="ghost" size="sm" icon={<Filter className="w-3.5 h-3.5" />}>
                Filtros{activeFilterCount > 0 && ` · ${activeFilterCount}`}
              </Btn>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64 p-3">
              <div className="space-y-3">
                <div>
                  <div className="text-[10.5px] uppercase tracking-[0.05em] text-text-subtle font-semibold mb-1.5">
                    Situação
                  </div>
                  <div className="space-y-1.5">
                    {[
                      { value: "attention", label: "Pedem atenção" },
                      { value: "ok", label: "Em dia" },
                    ].map((s) => (
                      <label key={s.value} className="flex items-center gap-2 text-[12.5px] cursor-pointer">
                        <Checkbox
                          checked={statusFilter.includes(s.value)}
                          onCheckedChange={() => setStatusFilter((cur) => toggleIn(cur, s.value))}
                        />
                        {s.label}
                      </label>
                    ))}
                  </div>
                </div>
                {teamOptions.length > 1 && (
                  <div className="border-t border-border pt-3">
                    <div className="text-[10.5px] uppercase tracking-[0.05em] text-text-subtle font-semibold mb-1.5">
                      Time
                    </div>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                      {teamOptions.map((t) => (
                        <label key={t.id} className="flex items-center gap-2 text-[12.5px] cursor-pointer">
                          <Checkbox
                            checked={teamFilter.includes(t.id)}
                            onCheckedChange={() => setTeamFilter((cur) => toggleIn(cur, t.id))}
                          />
                          <span className="truncate">{t.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                {activeFilterCount > 0 && (
                  <button
                    type="button"
                    className="text-[11.5px] text-text-muted hover:text-text underline"
                    onClick={() => {
                      setStatusFilter([]);
                      setTeamFilter([]);
                    }}
                  >
                    Limpar filtros
                  </button>
                )}
              </div>
            </PopoverContent>
          </Popover>
          <Btn
            variant="secondary"
            size="sm"
            icon={<Calendar className="w-3.5 h-3.5" />}
            onClick={() => navigate("/11s")}
          >
            Agendar rodada de 1:1s
          </Btn>
        </Row>
      </div>

      {/* Attention row */}
      {attn.length > 0 && attn[0].user && (
        <div className="mt-4 p-2.5 bg-status-amber-soft border border-status-amber/30 rounded-md flex items-center gap-2.5">
          <Zap className="w-3.5 h-3.5 text-status-amber shrink-0" strokeWidth={2} />
          <div className="flex-1 text-[12.5px] text-text">
            <b className="font-semibold">{attn[0].user.full_name}</b>{" "}
            {attn[0].metrics.last11
              ? `sem 1:1 ${daysAgo(attn[0].metrics.last11)}`
              : "sem 1:1 registrada"}
            {", PDI em "}
            {attn[0].metrics.pdi}% {attn[0].metrics.perf && `· performance ${attn[0].metrics.perf.toFixed(1)}`}.
          </div>
          <Btn
            variant="primary"
            size="sm"
            onClick={() => navigate("/11s")}
          >
            Agendar 1:1
          </Btn>
        </div>
      )}

      {/* Members table */}
      {isLoadingTeam ? (
        <div className="mt-5">
          <LoadingState variant="skeleton" layout="cards" count={3} />
        </div>
      ) : teamMembers.length === 0 ? (
        <div className="mt-5">
          <LinearEmpty
            icon={<Users className="w-[18px] h-[18px]" strokeWidth={1.75} />}
            title="Sem colaboradores alocados"
            description="Peça ao RH para associar colaboradores ao seu time para começar a acompanhá-los aqui."
          />
        </div>
      ) : (
        <div className="mt-5 surface-paper overflow-hidden">
          <div className="cell-header grid grid-cols-[2.2fr_1fr_1.4fr_0.7fr_0.7fr_32px] gap-5">
            <div>Pessoa</div>
            <div>Última 1:1</div>
            <div>PDI</div>
            <div>Perf.</div>
            <div>Clima</div>
            <div></div>
          </div>
          {teamMembers.map((m, i) => {
            const name = m.user?.full_name || "Sem nome";
            const last = m.metrics.last11 ? new Date(m.metrics.last11) : null;
            const daysSince = last ? Math.floor((Date.now() - last.getTime()) / 86_400_000) : 999;
            const attnRow = daysSince > 14 || m.metrics.pdi < 30 || (m.metrics.perf && m.metrics.perf < 3.5);
            return (
              <div
                key={m.id}
                onClick={() => navigate(`/colaborador/${m.user_id}`)}
                className={`grid grid-cols-[2.2fr_1fr_1.4fr_0.7fr_0.7fr_32px] gap-5 items-center px-3.5 py-2.5 text-[13px] cursor-pointer hover:bg-bg-subtle transition-colors ${
                  i < teamMembers.length - 1 ? "border-b border-border" : ""
                }`}
              >
                <Row gap={10}>
                  <LinearAvatar name={name} size={28} />
                  <div className="min-w-0">
                    <div className="font-medium truncate">{name}</div>
                    <div className="text-[11.5px] text-text-subtle truncate">
                      {m.position || "sem cargo"}
                    </div>
                  </div>
                </Row>
                <div className={attnRow ? "text-status-red" : "text-text"}>{daysAgo(m.metrics.last11)}</div>
                <Row gap={10}>
                  <ProgressBar value={m.metrics.pdi} className="flex-1 min-w-0" />
                  <span className="text-[11.5px] text-text-muted tabular w-8 text-right">
                    {m.metrics.pdi}%
                  </span>
                </Row>
                <div
                  className={`tabular font-medium ${
                    m.metrics.perf && m.metrics.perf < 3.5
                      ? "text-status-red"
                      : m.metrics.perf && m.metrics.perf > 4.2
                      ? "text-status-green"
                      : "text-text"
                  }`}
                >
                  {m.metrics.perf ? m.metrics.perf.toFixed(1) : "—"}
                </div>
                <div
                  className={`tabular font-medium ${
                    m.metrics.clima && m.metrics.clima < 3
                      ? "text-status-red"
                      : m.metrics.clima && m.metrics.clima > 4.2
                      ? "text-status-green"
                      : "text-text"
                  }`}
                >
                  {m.metrics.clima ? m.metrics.clima.toFixed(1) : "—"}
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-text-subtle" />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
