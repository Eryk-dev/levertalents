import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useScope } from "@/app/providers/ScopeProvider";
import { useScopedQuery } from "@/shared/data/useScopedQuery";
import type {
  ActiveConsent,
  Consent,
  ConsentLegalBasis,
  ConsentPurpose,
} from "@/integrations/supabase/hiring-types";

/**
 * Plan 02-06 — Hooks LGPD para consents granulares (TAL-03 / TAL-04 / TAL-08).
 *
 * useActiveConsents(candidateId): SELECT em `active_candidate_consents` view
 *   (revoked_at IS NULL AND (expires_at IS NULL OR expires_at > now())).
 *
 * useRevokeConsent: UPDATE candidate_consents SET revoked_at=NOW(),
 *   revoked_by=<auth.uid()>. Invalida talent-pool E candidate-consents
 *   (Banco de Talentos depende do consent ativo — TAL-04).
 *
 * useGrantConsent: INSERT em candidate_consents (RH em nome do candidato).
 *   Default legal_basis='consent'; granted_by=<auth.uid()>.
 *
 * Toast convention: import { toast } from "sonner" — Phase 2 standard
 * (UI-SPEC §"Toast positions and durations").
 */

export interface RevokeConsentArgs {
  consentId: string;
  candidateId: string;
}

export interface GrantConsentArgs {
  candidateId: string;
  purpose: ConsentPurpose;
  legalBasis?: ConsentLegalBasis;
  expiresAt?: string;
  documentUrl?: string;
}

/**
 * Lista consents ativos do candidato (vem da view `active_candidate_consents`,
 * que já exclui revoked + expired). queryKey scoped por candidate.
 *
 * Disabled quando candidateId é undefined.
 */
export function useActiveConsents(candidateId: string | undefined) {
  return useScopedQuery<ActiveConsent[], Error>(
    ["hiring", "candidate-consents", candidateId ?? "none"],
    async (): Promise<ActiveConsent[]> => {
      if (!candidateId) return [];
      const { data, error } = await supabase
        .from("active_candidate_consents")
        .select("*")
        .eq("candidate_id", candidateId)
        .order("granted_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ActiveConsent[];
    },
    { enabled: !!candidateId, staleTime: 30_000 },
  );
}

/**
 * Revoga consent (RH em nome do candidato OU candidato direto via UI futura).
 * Estado revoked é "soft": o row continua na tabela, apenas vira invisível
 * na view `active_candidate_consents` — preserva histórico para auditoria.
 *
 * onSuccess invalida 2 caches:
 *   - candidate-consents (drawer do candidato re-renderiza)
 *   - talent-pool (Banco de Talentos some o candidato se era o último consent ativo)
 */
export function useRevokeConsent() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { scope } = useScope();

  return useMutation({
    mutationFn: async (args: RevokeConsentArgs): Promise<void> => {
      const { error } = await supabase
        .from("candidate_consents")
        .update({
          revoked_at: new Date().toISOString(),
          revoked_by: user?.id ?? null,
        })
        .eq("id", args.consentId);
      if (error) throw error;
    },
    onSuccess: async (_data, args) => {
      await queryClient.invalidateQueries({
        queryKey: [
          "scope",
          scope?.id ?? "__none__",
          scope?.kind ?? "__none__",
          "hiring",
          "candidate-consents",
          args.candidateId,
        ],
      });
      await queryClient.invalidateQueries({
        queryKey: [
          "scope",
          scope?.id ?? "__none__",
          scope?.kind ?? "__none__",
          "hiring",
          "talent-pool",
        ],
      });
      toast.success("Consentimento revogado");
    },
    onError: (err: Error) =>
      toast.error("Erro ao revogar", { description: err.message }),
  });
}

/**
 * Concede consent em nome do candidato (RH explícito; granted_by=user.id).
 * Self-grant via PublicApplicationForm não passa por aqui — vai direto pela
 * Edge Function apply-to-job (granted_by=null).
 *
 * Default expires_at: 24 meses (alinhado com TAL-08).
 */
export function useGrantConsent() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { scope } = useScope();

  return useMutation({
    mutationFn: async (args: GrantConsentArgs): Promise<Consent> => {
      const { data, error } = await supabase
        .from("candidate_consents")
        .insert({
          candidate_id: args.candidateId,
          purpose: args.purpose,
          legal_basis: args.legalBasis ?? "consent",
          granted_by: user?.id ?? null,
          expires_at: args.expiresAt ?? null,
          document_url: args.documentUrl ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as Consent;
    },
    onSuccess: async (_data, args) => {
      await queryClient.invalidateQueries({
        queryKey: [
          "scope",
          scope?.id ?? "__none__",
          scope?.kind ?? "__none__",
          "hiring",
          "candidate-consents",
          args.candidateId,
        ],
      });
      await queryClient.invalidateQueries({
        queryKey: [
          "scope",
          scope?.id ?? "__none__",
          scope?.kind ?? "__none__",
          "hiring",
          "talent-pool",
        ],
      });
      toast.success("Consentimento registrado");
    },
    onError: (err: Error) =>
      toast.error("Erro ao registrar consent", { description: err.message }),
  });
}
