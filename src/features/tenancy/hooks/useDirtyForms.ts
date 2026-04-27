import { create } from 'zustand';

/**
 * Global registry of currently-dirty react-hook-form instances.
 * Each form opts in by calling `register(formId)` when its
 * `formState.isDirty` becomes true, and `unregister(formId)` on
 * successful save or unmount. ScopeProvider's setScope consults
 * `hasAnyDirty()` to decide whether to open the confirmation dialog
 * (D-05).
 *
 * RESEARCH.md Common Pitfalls #7: forms must call form.reset(values)
 * after a successful submit to clear isDirty — otherwise this
 * registry stays "dirty" forever.
 */
interface DirtyFormsState {
  dirtyForms: Set<string>;
  register: (id: string) => void;
  unregister: (id: string) => void;
  hasAnyDirty: () => boolean;
  // Test helper — internal use only
  _reset: () => void;
}

export const useDirtyForms = create<DirtyFormsState>((set, get) => ({
  dirtyForms: new Set(),
  register: (id) =>
    set((s) => {
      const next = new Set(s.dirtyForms);
      next.add(id);
      return { dirtyForms: next };
    }),
  unregister: (id) =>
    set((s) => {
      const next = new Set(s.dirtyForms);
      next.delete(id);
      return { dirtyForms: next };
    }),
  hasAnyDirty: () => get().dirtyForms.size > 0,
  _reset: () => set({ dirtyForms: new Set() }),
}));
