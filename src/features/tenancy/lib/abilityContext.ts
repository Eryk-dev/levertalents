import { createContext } from 'react';
import { createContextualCan, useAbility as useCASLAbility } from '@casl/react';
import type { AppAbility } from './abilities';

// Initial value is a no-op ability — replaced by AbilityProvider on mount.
export const AbilityContext = createContext<AppAbility>(null as unknown as AppAbility);

export const Can = createContextualCan(AbilityContext.Consumer);

export const useAbility = () => useCASLAbility(AbilityContext);
