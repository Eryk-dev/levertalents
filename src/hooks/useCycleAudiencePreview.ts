import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type AudienceKind = 'company' | 'org_unit' | 'manual';
export type EvaluationDirection = 'self' | 'leader_to_member' | 'member_to_leader' | 'peer';

export interface AudiencePreviewInput {
  companyId: string;
  audienceKind: AudienceKind;
  audienceIds: string[];
  includeDescendants: boolean;
  directions: EvaluationDirection[];
}

export interface AudiencePreview {
  participants_count: number;
  by_direction: Record<EvaluationDirection, number>;
  missing_leader: number;
  missing_team: number;
}

/**
 * Calls preview_cycle_audience RPC; debounced naturally by react-query
 * keying on the full input. Disabled until directions and (when needed)
 * audienceIds are populated to avoid noisy calls.
 */
export function useCycleAudiencePreview(input: AudiencePreviewInput | null) {
  return useQuery<AudiencePreview>({
    queryKey: ['cycle-audience-preview', input],
    enabled: !!input && input.directions.length > 0,
    queryFn: async () => {
      if (!input) {
        return {
          participants_count: 0,
          by_direction: { self: 0, leader_to_member: 0, member_to_leader: 0, peer: 0 },
          missing_leader: 0,
          missing_team: 0,
        };
      }
      const { data, error } = await supabase.rpc('preview_cycle_audience', {
        p_company_id: input.companyId,
        p_audience_kind: input.audienceKind,
        p_audience_ids: input.audienceIds,
        p_include_descendants: input.includeDescendants,
        p_directions: input.directions,
      });
      if (error) throw error;
      return (data ?? {
        participants_count: 0,
        by_direction: { self: 0, leader_to_member: 0, member_to_leader: 0, peer: 0 },
        missing_leader: 0,
        missing_team: 0,
      }) as AudiencePreview;
    },
  });
}
