import { useScopedQuery } from '@/shared/data/useScopedQuery';
import { supabase } from '@/integrations/supabase/client';
import { handleSupabaseError } from '@/lib/supabaseError';

export type PayrollTotal = {
  total_cost: number;
  headcount: number;
  avg_cost: number | null;
};

const DEFAULT_PAYLOAD: PayrollTotal = {
  total_cost: 0,
  headcount: 0,
  avg_cost: null,
};

/**
 * Aggregate payroll for the current scope. Server-side RPC enforces
 * RLS via visible_companies(actor); never returns row-level salary.
 *
 * REQs: DASH-01, DASH-02, DASH-03
 * D-02 LOCK: payload contains ONLY {total_cost, headcount, avg_cost}.
 * queryKey: ['scope', scope.id, scope.kind, 'payroll-total']
 */
export function usePayrollTotal() {
  return useScopedQuery<PayrollTotal>(
    ['payroll-total'],
    async (companyIds) => {
      const { data, error } = await supabase.rpc(
        'read_payroll_total' as never,
        { p_company_ids: companyIds } as never,
      );
      if (error) {
        throw handleSupabaseError(error, 'Falha ao carregar folha total', { silent: true });
      }
      // RPC returns jsonb; supabase-js types it as Json. Coerce to PayrollTotal,
      // falling back to a zero payload when the call returned no rows.
      const payload = (data ?? DEFAULT_PAYLOAD) as PayrollTotal;
      return payload;
    },
    { staleTime: 5 * 60 * 1000 },
  );
}
