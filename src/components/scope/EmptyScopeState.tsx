import { Building2 } from 'lucide-react';
import { EmptyState } from '@/components/EmptyState';

/**
 * Full-page empty state when the user has no scope (sócio sem empresa
 * atribuída, OR liderado sem org_unit primário). D-09: this is NOT a
 * modal; it replaces the routed page content. RH/admin must assign
 * empresa via /empresas (existing CRUD).
 *
 * Copy and icon are locked by 01-UI-SPEC.md § 5.
 */
export function EmptyScopeState() {
  return (
    <EmptyState
      title="Sem empresa atribuída ainda"
      message="Você ainda não tem empresa atribuída. Fale com o admin para liberar seu acesso."
      icon={Building2}
    />
  );
}
