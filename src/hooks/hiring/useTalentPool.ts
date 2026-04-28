import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type {
  ApplicationStage,
  CandidateRow,
  DiscardReason,
} from "@/integrations/supabase/hiring-types";
import "@/integrations/supabase/hiring-types";

export const talentPoolKeys = {
  list: (filters: TalentPoolFilters) =>
    ["hiring", "talent-pool", "list", filters] as const,
};

export interface TalentPoolFilters {
  search: string;
  discardReasons: DiscardReason[];
  jobIds: string[];
  onlyTalentPool: boolean;
}

export interface TalentPoolApplication {
  id: string;
  stage: ApplicationStage;
  job_id: string | null;
  job_title: string | null;
  discard_reason: DiscardReason | null;
  added_to_talent_pool: boolean;
  closed_at: string | null;
  created_at: string;
}

/**
 * TAL-02 — Tag por empresa/vaga em que o candidato participou (histórico
 * cross-empresa). Surface também via `useCandidateTags` (Plan 02-06 Task 5);
 * aqui é o campo derivado que vem agregado por candidato no Banco de Talentos.
 */
export interface CandidateTag {
  company_id: string;
  company_name: string;
  job_title: string;
  last_applied_at: string;
}

export interface TalentPoolCandidate extends CandidateRow {
  applications: TalentPoolApplication[];
  /** TAL-02 — agregado por empresa (1 tag por company_id, last_applied_at DESC). */
  tags: CandidateTag[];
  last_conversation_at: string | null;
  last_conversation_summary: string | null;
  conversation_count: number;
}

/**
 * Agrupa applications por company_id, escolhendo a application mais recente
 * (last_applied_at + job_title MAIS RECENTE por empresa). Sort: last_applied_at DESC.
 *
 * Usado por useTalentPool e mirrored por useCandidateTags (TAL-02).
 */
function deriveTags(
  applications: ReadonlyArray<{
    created_at: string;
    job_opening: {
      title: string | null;
      company: { id: string; name: string } | null;
    } | null;
  }>,
): CandidateTag[] {
  const byCompany = new Map<string, CandidateTag>();
  for (const app of applications ?? []) {
    const co = app.job_opening?.company;
    const jt = app.job_opening?.title;
    if (!co || !jt) continue;
    const existing = byCompany.get(co.id);
    if (!existing || app.created_at > existing.last_applied_at) {
      byCompany.set(co.id, {
        company_id: co.id,
        company_name: co.name,
        job_title: jt,
        last_applied_at: app.created_at,
      });
    }
  }
  return Array.from(byCompany.values()).sort((a, b) =>
    b.last_applied_at.localeCompare(a.last_applied_at),
  );
}

/**
 * Lista candidatos do Banco de Talentos — todos que têm consent ATIVO de
 * `incluir_no_banco_de_talentos_global` (TAL-04 / TAL-08). O filtro
 * `onlyTalentPool=true` restringe aos que ALÉM disso têm ao menos uma
 * application com `added_to_talent_pool = true` (marcada explicitamente
 * pelo RH ao recusar).
 *
 * Filtro LGPD aplicado via PostgREST embed `!inner` na view
 * `active_candidate_consents` (revoked_at IS NULL AND não-expirado) +
 * `.eq("consents.purpose", "incluir_no_banco_de_talentos_global")`.
 * Candidatos sem consent ativo NÃO aparecem.
 */
export function useTalentPool(filters: TalentPoolFilters) {
  return useQuery({
    queryKey: talentPoolKeys.list(filters),
    queryFn: async (): Promise<TalentPoolCandidate[]> => {
      let q = supabase
        .from("candidates")
        .select(
          `*,
           consents:active_candidate_consents!inner(purpose, granted_at, expires_at),
           applications:applications(
             id, stage, discard_reason, added_to_talent_pool, closed_at, created_at,
             job:job_openings!applications_job_opening_id_fkey(
               id, title, company_id,
               company:companies(id, name)
             )
           ),
           conversations:candidate_conversations(
             id, summary, occurred_at
           )`,
        )
        .eq("consents.purpose", "incluir_no_banco_de_talentos_global")
        .is("anonymized_at", null)
        .order("full_name")
        .limit(300);

      if (filters.search.trim().length > 1) {
        const pattern = `%${filters.search.trim()}%`;
        q = q.or(`full_name.ilike.${pattern},email.ilike.${pattern}`);
      }

      const { data, error } = await q;
      if (error) throw error;

      type AppRaw = {
        id: string;
        stage: ApplicationStage;
        discard_reason: DiscardReason | null;
        added_to_talent_pool: boolean;
        closed_at: string | null;
        created_at: string;
        job: {
          id: string;
          title: string;
          company_id: string | null;
          company: { id: string; name: string } | null;
        } | null;
      };
      type ConvRaw = { id: string; summary: string | null; occurred_at: string };
      type Raw = CandidateRow & {
        applications?: AppRaw[] | null;
        conversations?: ConvRaw[] | null;
      };

      const mapped: TalentPoolCandidate[] = ((data ?? []) as Raw[]).map((c) => {
        const apps = (c.applications ?? []).map<TalentPoolApplication>((a) => ({
          id: a.id,
          stage: a.stage,
          job_id: a.job?.id ?? null,
          job_title: a.job?.title ?? null,
          discard_reason: a.discard_reason,
          added_to_talent_pool: a.added_to_talent_pool,
          closed_at: a.closed_at,
          created_at: a.created_at,
        }));
        // TAL-02: derivar tags por empresa via job_opening.company embed
        const tags = deriveTags(
          (c.applications ?? []).map((a) => ({
            created_at: a.created_at,
            job_opening: a.job
              ? {
                  title: a.job.title,
                  company: a.job.company,
                }
              : null,
          })),
        );
        const convs = [...(c.conversations ?? [])].sort(
          (a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime(),
        );
        const last = convs[0];
        return {
          ...c,
          applications: apps,
          tags,
          last_conversation_at: last?.occurred_at ?? null,
          last_conversation_summary: last?.summary ?? null,
          conversation_count: convs.length,
        };
      });

      return mapped.filter((c) => {
        // Precisa ter pelo menos 1 aplicação — é o critério de estar no banco.
        if (c.applications.length === 0) return false;

        if (filters.onlyTalentPool) {
          if (!c.applications.some((a) => a.added_to_talent_pool)) return false;
        }

        if (filters.discardReasons.length > 0) {
          const match = c.applications.some(
            (a) => a.discard_reason && filters.discardReasons.includes(a.discard_reason),
          );
          if (!match) return false;
        }

        if (filters.jobIds.length > 0) {
          const match = c.applications.some(
            (a) => a.job_id && filters.jobIds.includes(a.job_id),
          );
          if (!match) return false;
        }

        return true;
      });
    },
  });
}
