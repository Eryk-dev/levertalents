import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { handleSupabaseError } from "@/lib/supabaseError";

export type ClimateOverview = {
  survey: {
    id: string;
    title: string;
    status: string;
    start_date: string;
    end_date: string;
  } | null;
  totalQuestions: number;
  totalResponses: number;
  distinctRespondents: number;
  avgScore: number | null;
  participationRate: number | null;
  totalEligible: number;
  trend: { title: string; avgScore: number | null }[];
};

export function useClimateOverview() {
  return useQuery<ClimateOverview>({
    queryKey: ["climate-overview"],
    queryFn: async () => {
      const { data: surveys, error: surveysError } = await supabase
        .from("climate_surveys")
        .select("id, title, status, start_date, end_date")
        .in("status", ["active", "closed"])
        .order("start_date", { ascending: false })
        .limit(5);
      if (surveysError) throw handleSupabaseError(surveysError, "Falha ao carregar pesquisas de clima", { silent: true });

      const list = surveys || [];
      const current = list[0] || null;

      const { count: eligibleCount, error: eligibleError } = await supabase
        .from("team_members")
        .select("user_id", { count: "exact", head: true });
      if (eligibleError) throw handleSupabaseError(eligibleError, "Falha ao carregar elegíveis", { silent: true });

      const totalEligible = eligibleCount || 0;

      let totalQuestions = 0;
      let totalResponses = 0;
      let distinctRespondents = 0;
      let avgScore: number | null = null;

      if (current) {
        const [questionsRes, responsesRes] = await Promise.all([
          supabase
            .from("climate_questions")
            .select("id", { count: "exact", head: true })
            .eq("survey_id", current.id),
          supabase
            .from("climate_responses")
            .select("score, user_id")
            .eq("survey_id", current.id),
        ]);

        if (questionsRes.error) throw handleSupabaseError(questionsRes.error, "Falha ao carregar perguntas de clima", { silent: true });
        if (responsesRes.error) throw handleSupabaseError(responsesRes.error, "Falha ao carregar respostas de clima", { silent: true });

        totalQuestions = questionsRes.count || 0;
        const responses = responsesRes.data || [];
        totalResponses = responses.length;
        distinctRespondents = new Set(responses.map((r) => r.user_id)).size;
        avgScore = totalResponses
          ? responses.reduce((s, r) => s + Number(r.score || 0), 0) / totalResponses
          : null;
      }

      const participationRate = current && totalEligible > 0
        ? distinctRespondents / totalEligible
        : null;

      const trendRaw = await Promise.all(
        list.map(async (s) => {
          const { data, error } = await supabase
            .from("climate_responses")
            .select("score")
            .eq("survey_id", s.id);
          if (error) throw handleSupabaseError(error, "Falha ao carregar tendência de clima", { silent: true });
          const rows = data || [];
          const avg = rows.length
            ? rows.reduce((sum, r) => sum + Number(r.score || 0), 0) / rows.length
            : null;
          return { title: s.title, avgScore: avg };
        }),
      );

      return {
        survey: current,
        totalQuestions,
        totalResponses,
        distinctRespondents,
        avgScore,
        participationRate,
        totalEligible,
        trend: trendRaw.reverse(),
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}
