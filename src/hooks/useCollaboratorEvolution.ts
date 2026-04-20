import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type EvolutionPoint = {
  date: string;
  progress: number;
};

export function useCollaboratorEvolution(userId: string | null | undefined) {
  return useQuery<EvolutionPoint[]>({
    queryKey: ["collaborator-evolution", userId],
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) return [];

      const { data: plans } = await supabase
        .from("development_plans")
        .select("id, created_at, progress_percentage, status, completed_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: true });

      const planList = plans || [];
      if (planList.length === 0) return [];

      const planIds = planList.map((p) => p.id);
      const { data: updates } = await supabase
        .from("development_plan_updates")
        .select("plan_id, progress_change, created_at")
        .in("plan_id", planIds)
        .order("created_at", { ascending: true });

      type Timeline = { date: Date; progressByPlan: Record<string, number> };
      const events: Timeline[] = [];

      const current: Record<string, number> = {};
      planList.forEach((p) => {
        current[p.id] = 0;
      });

      planList.forEach((p) => {
        const d = new Date(p.created_at);
        events.push({ date: d, progressByPlan: { ...current } });
      });

      (updates || []).forEach((u: any) => {
        if (!u.plan_id) return;
        const prev = current[u.plan_id] || 0;
        current[u.plan_id] = Math.max(0, Math.min(100, prev + Number(u.progress_change || 0)));
        events.push({ date: new Date(u.created_at), progressByPlan: { ...current } });
      });

      planList.forEach((p) => {
        if (p.completed_at && p.progress_percentage === 100) {
          current[p.id] = 100;
          events.push({ date: new Date(p.completed_at), progressByPlan: { ...current } });
        } else {
          const progressNow = Math.max(0, Math.min(100, Number(p.progress_percentage || 0)));
          current[p.id] = progressNow;
        }
      });

      events.sort((a, b) => a.date.getTime() - b.date.getTime());

      const points: EvolutionPoint[] = events.map((ev) => {
        const values = Object.values(ev.progressByPlan);
        const avg = values.length ? values.reduce((s, v) => s + v, 0) / values.length : 0;
        return {
          date: ev.date.toISOString(),
          progress: Math.round(avg),
        };
      });

      const nowPoint: EvolutionPoint = {
        date: new Date().toISOString(),
        progress: Math.round(
          planList.reduce((s, p) => s + Number(p.progress_percentage || 0), 0) / planList.length,
        ),
      };
      points.push(nowPoint);

      const deduped: EvolutionPoint[] = [];
      points.forEach((p) => {
        const last = deduped[deduped.length - 1];
        if (!last || last.date.slice(0, 10) !== p.date.slice(0, 10)) {
          deduped.push(p);
        } else {
          deduped[deduped.length - 1] = p;
        }
      });

      return deduped;
    },
    staleTime: 60 * 1000,
  });
}
