import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);

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
        setUserRole(data?.role || fallbackRole || null);
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
          setUserRole(null);
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

  return { user, loading, userRole };
}