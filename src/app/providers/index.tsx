import type { ReactNode } from 'react';
import { ScopeProvider } from './ScopeProvider';
import { AbilityProvider } from './AbilityProvider';

/**
 * Composes the Phase 1 providers in the canonical order:
 *   ScopeProvider → AbilityProvider → (children)
 *
 * IMPORTANT: this composition MUST be mounted INSIDE <BrowserRouter>
 * because ScopeProvider uses useSearchParams() (RESEARCH.md
 * Common Pitfalls #1). App.tsx is responsible for the BrowserRouter.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ScopeProvider>
      <AbilityProvider>{children}</AbilityProvider>
    </ScopeProvider>
  );
}

// Re-exports for convenience
export { ScopeProvider, useScope } from './ScopeProvider';
export { AbilityProvider } from './AbilityProvider';
