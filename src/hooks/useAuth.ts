import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

export type AppRole = 'admin' | 'socio' | 'lider' | 'rh' | 'colaborador';

const VIEW_AS_STORAGE_KEY = 'lt:viewAsRole';
const VIEW_AS_EVENT = 'lt:view-as-role-changed';
const VALID_ROLES: AppRole[] = ['admin', 'socio', 'lider', 'rh', 'colaborador'];

function readStoredViewAs(): AppRole | null {
  if (typeof window === 'undefined') return null;
  const stored = window.localStorage.getItem(VIEW_AS_STORAGE_KEY);
  return stored && (VALID_ROLES as string[]).includes(stored) ? (stored as AppRole) : null;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [realRole, setRealRole] = useState<string | null>(null);
  const [viewAsRole, setViewAsRoleState] = useState<AppRole | null>(() => readStoredViewAs());

  useEffect(() => {
    let mounted = true;

    const loadUserRole = async (userId: string, metaRole?: string) => {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      if (mounted) {
        // Fallback em DEV: se a trigger handle_new_user não rodou (ex.
        // migration T2 ainda não aplicada), usa o role do raw_user_meta_data
        // que foi passado no signUp. Em prod, user_roles já tem o row.
        const fallbackRole = import.meta.env.DEV ? metaRole ?? null : null;
        setRealRole(data?.role || fallbackRole || null);
        setLoading(false);
      }
    };

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!mounted) return;

        setUser(session?.user ?? null);

        if (session?.user) {
          loadUserRole(session.user.id, session.user.user_metadata?.role as string | undefined);
        } else {
          setRealRole(null);
          setLoading(false);
        }
      }
    );

    // THEN check for existing session
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!mounted) return;

      setUser(session?.user ?? null);

      if (session?.user) {
        await loadUserRole(session.user.id, session.user.user_metadata?.role as string | undefined);
      } else {
        setLoading(false);
      }
    };

    initAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Sync viewAsRole between hook instances and across tabs.
  useEffect(() => {
    const handleCustom = (e: Event) => {
      const next = (e as CustomEvent<AppRole | null>).detail ?? null;
      setViewAsRoleState(next);
    };
    const handleStorage = (e: StorageEvent) => {
      if (e.key !== VIEW_AS_STORAGE_KEY) return;
      setViewAsRoleState(
        e.newValue && (VALID_ROLES as string[]).includes(e.newValue)
          ? (e.newValue as AppRole)
          : null,
      );
    };
    window.addEventListener(VIEW_AS_EVENT, handleCustom);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener(VIEW_AS_EVENT, handleCustom);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const setViewAsRole = useCallback((role: AppRole | null) => {
    if (typeof window === 'undefined') return;
    if (role) {
      window.localStorage.setItem(VIEW_AS_STORAGE_KEY, role);
    } else {
      window.localStorage.removeItem(VIEW_AS_STORAGE_KEY);
    }
    window.dispatchEvent(new CustomEvent<AppRole | null>(VIEW_AS_EVENT, { detail: role }));
  }, []);

  // Only admins can effectively view-as. If real role isn't admin (or hasn't
  // loaded yet), the override is ignored — the UI always reflects the real role.
  const effectiveViewAs = realRole === 'admin' ? viewAsRole : null;
  const userRole = effectiveViewAs ?? realRole;
  const isViewingAs = effectiveViewAs !== null && effectiveViewAs !== realRole;

  return {
    user,
    loading,
    userRole,
    realRole,
    viewAsRole: effectiveViewAs,
    setViewAsRole,
    isViewingAs,
  };
}
