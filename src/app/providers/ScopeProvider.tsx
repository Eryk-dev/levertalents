import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import * as Sentry from '@sentry/react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import {
  parseScopeToken,
  serializeScope,
} from '@/features/tenancy/lib/scopeKey';
import { useScopeStore } from '@/features/tenancy/lib/store';
import { fetchDefaultScope } from '@/features/tenancy/lib/resolveDefaultScope';
import { useVisibleScopes } from '@/features/tenancy/hooks/useVisibleScopes';
import { useScopeBroadcast } from '@/features/tenancy/hooks/useScopeBroadcast';
import { useDirtyForms } from '@/features/tenancy/hooks/useDirtyForms';
import type {
  Scope,
  ScopeKind,
  VisibleCompanySummary,
  VisibleGroupSummary,
} from '@/features/tenancy/types';

interface ScopeContextValue {
  scope: Scope | null;
  setScope: (
    next: { kind: ScopeKind; id: string },
    opts?: { skipDirtyCheck?: boolean },
  ) => boolean; // returns true if accepted, false if blocked by dirty-form
  pendingScope: { kind: ScopeKind; id: string } | null; // when dirty-form blocks; consumer renders confirmation
  cancelPendingScope: () => void;
  confirmPendingScope: () => void;
  isFixed: boolean;
  visibleCompanies: VisibleCompanySummary[];
  visibleGroups: VisibleGroupSummary[];
  isResolving: boolean;
}

const ScopeContext = createContext<ScopeContextValue | null>(null);

function resolveScope(
  hint: { kind: ScopeKind; id: string },
  companies: VisibleCompanySummary[],
  groups: VisibleGroupSummary[],
): Scope | null {
  if (hint.kind === 'company') {
    const c = companies.find((x) => x.id === hint.id);
    if (!c) return null;
    return { kind: 'company', id: c.id, companyIds: [c.id], name: c.name };
  }
  const g = groups.find((x) => x.id === hint.id);
  if (!g || !g.companyIds.length) return null;
  return { kind: 'group', id: g.id, companyIds: g.companyIds, name: g.name };
}

export function ScopeProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const persistedToken = useScopeStore((s) => s.scopeToken);
  const setPersistedToken = useScopeStore((s) => s.setScopeToken);
  const { companies, groups, isLoading: scopesLoading } = useVisibleScopes();

  const [scope, setScopeState] = useState<Scope | null>(null);
  const [pendingScope, setPendingScope] = useState<
    { kind: ScopeKind; id: string } | null
  >(null);
  const [isResolving, setIsResolving] = useState(true);

  const lastFallbackToastAt = useRef(0);

  const showFallbackToast = useCallback((scopeName: string) => {
    // Throttle to 1 toast per second (UI-SPEC.md § 6)
    const now = Date.now();
    if (now - lastFallbackToastAt.current < 1000) return;
    lastFallbackToastAt.current = now;
    toast(`Você não tem acesso àquele escopo. Abrindo ${scopeName}.`);
  }, []);

  // Resolve scope on first render (URL > Zustand persist > server RPC default)
  useEffect(() => {
    if (authLoading || !user?.id || scopesLoading) {
      setIsResolving(true);
      return;
    }
    let aborted = false;
    setIsResolving(true);

    (async () => {
      try {
        const urlToken = searchParams.get('scope');
        const fromUrl = parseScopeToken(urlToken);
        const fromPersist = parseScopeToken(persistedToken);

        let resolved: Scope | null = null;
        let usedFallback = false;

        if (fromUrl) {
          resolved = resolveScope(fromUrl, companies, groups);
          if (!resolved) {
            // D-08 fallback path
            usedFallback = true;
            const fallbackHint =
              fromPersist ?? (await fetchDefaultScope(user.id));
            resolved = fallbackHint
              ? resolveScope(fallbackHint, companies, groups)
              : null;
          }
        } else if (fromPersist) {
          resolved = resolveScope(fromPersist, companies, groups);
          if (!resolved) {
            const def = await fetchDefaultScope(user.id);
            resolved = def ? resolveScope(def, companies, groups) : null;
          }
        } else {
          const def = await fetchDefaultScope(user.id);
          resolved = def ? resolveScope(def, companies, groups) : null;
        }

        if (aborted) return;

        if (resolved) {
          setScopeState(resolved);
          const token = serializeScope(resolved);
          setSearchParams(
            (prev) => {
              prev.set('scope', token);
              return prev;
            },
            { replace: true },
          );
          setPersistedToken(token);
          if (usedFallback) showFallbackToast(resolved.name);
        } else {
          // D-09 empty state
          setScopeState(null);
        }
      } finally {
        if (!aborted) setIsResolving(false);
      }
    })();

    return () => {
      aborted = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, authLoading, scopesLoading, companies.length, groups.length]);

  // Cross-tab sync — when another tab broadcasts, adopt its scope
  const { broadcast } = useScopeBroadcast(
    useCallback(
      (token: string) => {
        const hint = parseScopeToken(token);
        if (!hint) return;
        const resolved = resolveScope(hint, companies, groups);
        if (resolved) setScopeState(resolved);
      },
      [companies, groups],
    ),
  );

  const applyScope = useCallback(
    (next: { kind: ScopeKind; id: string }) => {
      const resolved = resolveScope(next, companies, groups);
      if (!resolved) return;
      setScopeState(resolved);
      const token = serializeScope(resolved);
      setSearchParams((prev) => {
        prev.set('scope', token);
        return prev;
      });
      setPersistedToken(token);
      broadcast(token);
    },
    [companies, groups, setSearchParams, setPersistedToken, broadcast],
  );

  const setScope = useCallback<ScopeContextValue['setScope']>(
    (next, opts) => {
      // D-05: dirty-form confirmation gate
      if (!opts?.skipDirtyCheck && useDirtyForms.getState().hasAnyDirty()) {
        setPendingScope(next);
        return false;
      }
      applyScope(next);
      return true;
    },
    [applyScope],
  );

  const confirmPendingScope = useCallback(() => {
    if (pendingScope) {
      applyScope(pendingScope);
      setPendingScope(null);
    }
  }, [pendingScope, applyScope]);

  const cancelPendingScope = useCallback(() => {
    setPendingScope(null);
  }, []);

  // QUAL-06 — propagate scope identifiers as Sentry tags so events filter per
  // company/group. scope_id and scope_kind are non-PII (UUIDs + 'company'/'group').
  // Reactive on scope id/kind changes only; companyIds/name changes don't need
  // to re-emit the same tags. No-op until scope resolves.
  useEffect(() => {
    if (!scope) return;
    Sentry.setTag('scope_id', scope.id);
    Sentry.setTag('scope_kind', scope.kind);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope?.id, scope?.kind]);

  const isFixed = useMemo(() => {
    if (!companies.length) return true;
    if (companies.length === 1 && !groups.length) return true;
    return false;
  }, [companies, groups]);

  const value: ScopeContextValue = {
    scope,
    setScope,
    pendingScope,
    confirmPendingScope,
    cancelPendingScope,
    isFixed,
    visibleCompanies: companies,
    visibleGroups: groups,
    isResolving,
  };

  return (
    <ScopeContext.Provider value={value}>{children}</ScopeContext.Provider>
  );
}

export function useScope() {
  const ctx = useContext(ScopeContext);
  if (!ctx) {
    throw new Error('useScope must be used inside <ScopeProvider>');
  }
  return ctx;
}
