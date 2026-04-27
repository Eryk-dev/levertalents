import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * Zustand persisted store for the active scope token.
 * Namespace 'leverup:scope' is intentionally distinct from existing
 * 'lt:*' keys (used by useAuth) and Supabase auth UUID-prefixed keys.
 * TEN-08.
 */
interface ScopeStoreState {
  scopeToken: string | null;
  setScopeToken: (t: string | null) => void;
}

export const useScopeStore = create<ScopeStoreState>()(
  persist(
    (set) => ({
      scopeToken: null,
      setScopeToken: (scopeToken) => set({ scopeToken }),
    }),
    {
      name: 'leverup:scope',
      storage: createJSONStorage(() => localStorage),
      version: 1,
      partialize: (state) => ({ scopeToken: state.scopeToken }),
    },
  ),
);
