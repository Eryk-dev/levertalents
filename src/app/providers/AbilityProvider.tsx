import { useMemo, type ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useScope } from '@/app/providers/ScopeProvider';
import {
  defineAppAbility,
  type AppRoleForAbility,
} from '@/features/tenancy/lib/abilities';
import { AbilityContext } from '@/features/tenancy/lib/abilityContext';

export function AbilityProvider({ children }: { children: ReactNode }) {
  const { user, userRole } = useAuth();
  const { visibleCompanies } = useScope();

  const ability = useMemo(() => {
    const role = (userRole ?? 'colaborador') as AppRoleForAbility;
    return defineAppAbility({
      role,
      userId: user?.id ?? '',
      visibleCompanyIds: visibleCompanies.map((c) => c.id),
      // Phase 2-3 wires these via dedicated queries; Phase 1 ships
      // empty arrays — guard `<Can>` checks against expectation that
      // org_unit-level abilities aren't fully accurate yet.
      visibleOrgUnitIds: [],
      ledOrgUnitIds: [],
      ownOrgUnitIds: [],
    });
  }, [user?.id, userRole, visibleCompanies]);

  return (
    <AbilityContext.Provider value={ability}>{children}</AbilityContext.Provider>
  );
}
