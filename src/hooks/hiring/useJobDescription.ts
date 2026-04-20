import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import type { JobDescriptionRow } from "@/integrations/supabase/hiring-types";
import { useOptimisticVersion } from "./useOptimisticVersion";
import { jobOpeningsKeys } from "./useJobOpenings";
import "@/integrations/supabase/hiring-types";

function nextVersion(existing: JobDescriptionRow[]): number {
  if (!existing.length) return 1;
  return Math.max(...existing.map((d) => d.version)) + 1;
}

export type DescriptionDraftFields = {
  content_md?: string | null;
  daily_routine?: string | null;
  requirements?: string[];
  expectations?: string | null;
  work_schedule?: string | null;
  benefits_list?: string[];
};

export function useSaveDescriptionDraft() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (args: {
      jobOpeningId: string;
      existingVersions: JobDescriptionRow[];
      fields: DescriptionDraftFields;
    }): Promise<JobDescriptionRow> => {
      if (!user?.id) throw new Error("Usuário não autenticado");

      const latest = args.existingVersions[0];
      const nowIso = new Date().toISOString();

      const patch: Record<string, unknown> = {
        approval_state: "aprovado",
        approver_id: user.id,
      };
      if (args.fields.content_md !== undefined) patch.content_md = args.fields.content_md;
      if (args.fields.daily_routine !== undefined) patch.daily_routine = args.fields.daily_routine;
      if (args.fields.requirements !== undefined) patch.requirements = args.fields.requirements;
      if (args.fields.expectations !== undefined) patch.expectations = args.fields.expectations;
      if (args.fields.work_schedule !== undefined) patch.work_schedule = args.fields.work_schedule;
      if (args.fields.benefits_list !== undefined) patch.benefits_list = args.fields.benefits_list;

      if (latest && latest.author_id === user.id) {
        patch.approved_at = latest.approved_at ?? nowIso;
        patch.rejection_reason = null;

        const { data, error } = await supabase
          .from("job_descriptions")
          .update(patch as never)
          .eq("id", latest.id)
          .eq("updated_at", latest.updated_at)
          .select()
          .single();
        if (error) throw error;
        return data as JobDescriptionRow;
      }

      const insertPayload: Record<string, unknown> = {
        job_opening_id: args.jobOpeningId,
        version: nextVersion(args.existingVersions),
        author_id: user.id,
        approval_state: "aprovado",
        approver_id: user.id,
        approved_at: nowIso,
        content_md: args.fields.content_md ?? null,
        daily_routine: args.fields.daily_routine ?? null,
        requirements: args.fields.requirements ?? [],
        expectations: args.fields.expectations ?? null,
        work_schedule: args.fields.work_schedule ?? null,
        benefits_list: args.fields.benefits_list ?? [],
      };

      const { data, error } = await supabase
        .from("job_descriptions")
        .insert(insertPayload as never)
        .select()
        .single();
      if (error) throw error;
      return data as JobDescriptionRow;
    },
    onSuccess: async (row) => {
      await queryClient.invalidateQueries({ queryKey: jobOpeningsKeys.detail(row.job_opening_id) });
    },
    onError: (err: Error) => toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" }),
  });
}

export function useSubmitDescriptionForApproval() {
  const mutation = useOptimisticVersion<"job_descriptions">();

  return {
    ...mutation,
    mutate: (args: { descriptionId: string; expectedUpdatedAt: string; jobOpeningId: string; jobUpdatedAt: string }) =>
      mutation.mutate({
        tableName: "job_descriptions",
        id: args.descriptionId,
        expectedUpdatedAt: args.expectedUpdatedAt,
        patch: { approval_state: "enviado" },
        successMessage: "Descritivo enviado para aprovação",
        invalidateKeys: [[...jobOpeningsKeys.detail(args.jobOpeningId)]],
      }),
  };
}

export function useRequestDescriptionChanges() {
  const mutation = useOptimisticVersion<"job_descriptions">();

  return {
    ...mutation,
    mutate: (args: {
      descriptionId: string;
      expectedUpdatedAt: string;
      reason: string;
      jobOpeningId: string;
      jobUpdatedAt: string;
    }) =>
      mutation.mutate({
        tableName: "job_descriptions",
        id: args.descriptionId,
        expectedUpdatedAt: args.expectedUpdatedAt,
        patch: { approval_state: "rejeitado", rejection_reason: args.reason },
        successMessage: "Ajustes solicitados",
        invalidateKeys: [[...jobOpeningsKeys.detail(args.jobOpeningId)]],
      }),
  };
}

export function useApproveDescription() {
  const mutation = useOptimisticVersion<"job_descriptions">();
  const { user } = useAuth();

  return {
    ...mutation,
    mutate: (args: { descriptionId: string; expectedUpdatedAt: string; jobOpeningId: string; jobUpdatedAt: string }) => {
      if (!user?.id) return;
      mutation.mutate({
        tableName: "job_descriptions",
        id: args.descriptionId,
        expectedUpdatedAt: args.expectedUpdatedAt,
        patch: { approval_state: "aprovado", approver_id: user.id, approved_at: new Date().toISOString() },
        successMessage: "Descritivo aprovado",
        invalidateKeys: [[...jobOpeningsKeys.detail(args.jobOpeningId)]],
      });
    },
  };
}

export function useUploadDescriptionPdf() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (args: {
      jobOpeningId: string;
      descriptionId: string;
      companyId: string;
      version: number;
      file: File;
    }): Promise<string> => {
      const ext = args.file.name.split(".").pop() || "pdf";
      const path = `companies/${args.companyId}/jobs/${args.jobOpeningId}/descricao/v${args.version}.${ext}`;
      const { error: upErr } = await supabase.storage.from("hiring").upload(path, args.file, { upsert: true });
      if (upErr) throw upErr;
      const { error: dbErr } = await supabase
        .from("job_descriptions")
        .update({ pdf_path: path })
        .eq("id", args.descriptionId);
      if (dbErr) throw dbErr;
      return path;
    },
    onSuccess: async (_, args) => {
      await queryClient.invalidateQueries({ queryKey: jobOpeningsKeys.detail(args.jobOpeningId) });
      toast({ title: "PDF anexado" });
    },
    onError: (err: Error) =>
      toast({ title: "Erro ao enviar PDF", description: err.message, variant: "destructive" }),
  });
}
