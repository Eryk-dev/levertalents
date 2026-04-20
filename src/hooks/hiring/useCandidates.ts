import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type {
  ApplicationStage,
  CandidateInsert,
  CandidateRow,
} from "@/integrations/supabase/hiring-types";
import "@/integrations/supabase/hiring-types";

export const candidatesKeys = {
  all: ["hiring", "candidates"] as const,
  list: (search: string) => ["hiring", "candidates", "list", search] as const,
  listWithApps: (search: string) => ["hiring", "candidates", "list-with-apps", search] as const,
  detail: (id: string) => ["hiring", "candidates", "detail", id] as const,
  byEmail: (email: string) => ["hiring", "candidates", "by-email", email] as const,
};

export interface CandidateListItem extends CandidateRow {
  /** Vaga + stage da application mais recente deste candidato. */
  latest_application: {
    id: string;
    stage: ApplicationStage;
    job_id: string | null;
    job_title: string | null;
    owner_id: string | null;
    stage_entered_at: string;
  } | null;
  /** Número de applications além da mais recente (0 = só essa). */
  other_applications_count: number;
}

export function useCandidatesList(search: string) {
  return useQuery({
    queryKey: candidatesKeys.list(search),
    queryFn: async (): Promise<CandidateRow[]> => {
      let q = supabase.from("candidates").select("*").order("full_name").limit(100);
      if (search.trim().length > 1) {
        const pattern = `%${search.trim()}%`;
        q = q.or(`full_name.ilike.${pattern},email.ilike.${pattern}`);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as CandidateRow[];
    },
  });
}

/**
 * Lista candidatos já com metadata da application mais recente (vaga + stage +
 * owner) para uso na visão global. Útil para mostrar a vaga no card da lista.
 */
export function useCandidatesListWithApplications(search: string) {
  return useQuery({
    queryKey: candidatesKeys.listWithApps(search),
    queryFn: async (): Promise<CandidateListItem[]> => {
      let q = supabase
        .from("candidates")
        .select(
          "*, applications:applications(id, stage, stage_entered_at, created_at, job:job_openings!applications_job_opening_id_fkey(id, title, requested_by))",
        )
        .order("full_name")
        .limit(200);
      if (search.trim().length > 1) {
        const pattern = `%${search.trim()}%`;
        q = q.or(`full_name.ilike.${pattern},email.ilike.${pattern}`);
      }
      const { data, error } = await q;
      if (error) throw error;

      type AppRow = {
        id: string;
        stage: ApplicationStage;
        stage_entered_at: string;
        created_at: string;
        job: { id: string; title: string; requested_by: string | null } | null;
      };
      type Raw = CandidateRow & { applications?: AppRow[] | null };

      return ((data ?? []) as Raw[]).map((c) => {
        const apps = [...(c.applications ?? [])].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );
        const latest = apps[0];
        return {
          ...c,
          applications: undefined,
          latest_application: latest
            ? {
                id: latest.id,
                stage: latest.stage,
                job_id: latest.job?.id ?? null,
                job_title: latest.job?.title ?? null,
                owner_id: latest.job?.requested_by ?? null,
                stage_entered_at: latest.stage_entered_at,
              }
            : null,
          other_applications_count: Math.max(0, apps.length - 1),
        } as CandidateListItem;
      });
    },
  });
}

export function useCandidate(id: string | undefined) {
  return useQuery({
    queryKey: candidatesKeys.detail(id ?? "none"),
    enabled: !!id,
    queryFn: async (): Promise<CandidateRow | null> => {
      if (!id) return null;
      const { data, error } = await supabase.from("candidates").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return (data as CandidateRow) ?? null;
    },
  });
}

export function useCandidateByEmail(email: string) {
  return useQuery({
    queryKey: candidatesKeys.byEmail(email),
    enabled: email.trim().length > 3,
    queryFn: async (): Promise<CandidateRow | null> => {
      const { data, error } = await supabase.from("candidates").select("*").eq("email", email.trim()).maybeSingle();
      if (error) throw error;
      return (data as CandidateRow) ?? null;
    },
  });
}

export function useCreateCandidate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CandidateInsert): Promise<CandidateRow> => {
      const { data, error } = await supabase.from("candidates").insert(payload).select().single();
      if (error) throw error;
      return data as CandidateRow;
    },
    onSuccess: async (row) => {
      await queryClient.invalidateQueries({ queryKey: candidatesKeys.all });
      await queryClient.invalidateQueries({ queryKey: candidatesKeys.byEmail(row.email) });
      toast({ title: "Candidato cadastrado" });
    },
    onError: (err: Error) => toast({ title: "Erro ao cadastrar", description: err.message, variant: "destructive" }),
  });
}

export function useUploadCv() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (args: {
      candidateId: string;
      companyId: string;
      jobOpeningId: string;
      file: File;
    }): Promise<string> => {
      const ext = args.file.name.split(".").pop() || "pdf";
      const path = `companies/${args.companyId}/jobs/${args.jobOpeningId}/candidates/${args.candidateId}/cv.${ext}`;
      const { error } = await supabase.storage.from("hiring").upload(path, args.file, { upsert: true });
      if (error) throw error;
      const { error: dbErr } = await supabase
        .from("candidates")
        .update({ cv_storage_path: path })
        .eq("id", args.candidateId);
      if (dbErr) throw dbErr;
      return path;
    },
    onSuccess: async (_, args) => {
      await queryClient.invalidateQueries({ queryKey: candidatesKeys.detail(args.candidateId) });
      toast({ title: "CV enviado" });
    },
    onError: (err: Error) => toast({ title: "Erro ao enviar CV", description: err.message, variant: "destructive" }),
  });
}

export function useAnonymizeCandidate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (candidateId: string): Promise<void> => {
      const { error } = await supabase.functions.invoke("hiring-anonymize-candidate", {
        body: { candidate_id: candidateId },
      });
      if (error) throw error;
    },
    onSuccess: async (_, candidateId) => {
      await queryClient.invalidateQueries({ queryKey: candidatesKeys.detail(candidateId) });
      toast({ title: "Candidato anonimizado" });
    },
    onError: (err: Error) =>
      toast({ title: "Falha ao anonimizar", description: err.message, variant: "destructive" }),
  });
}
