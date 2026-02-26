import { useEffect, useState } from "react";
import { getUserProfile, UserProfile } from "@/lib/auth";
import { supabase } from "@/lib/supabase/client";
import { User, Session } from "@supabase/supabase-js";

interface UseAuthOptions {
  loadProfile?: boolean;
}

export function useAuth(options: UseAuthOptions = {}) {
  const { loadProfile = true } = options;
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // 1. Define the logic to fetch profile based on user
    const fetchProfile = async (currentUser: User) => {
      try {
        const userProfile = await getUserProfile(currentUser.id, currentUser);
        if (mounted) setProfile(userProfile);
      } catch (error) {
        console.error("Profile fetch error:", error);
      }
    };

    // 2. Define the logic to handle session updates
    const handleSession = async (session: Session | null) => {
      const currentUser = session?.user ?? null;

      if (mounted) {
        setUser(currentUser);
        setIsAuthenticated(!!currentUser);
      }

      if (currentUser && loadProfile) {
        await fetchProfile(currentUser);
      } else {
        if (mounted) setProfile(null);
      }

      if (mounted) setLoading(false);
    };

    // 3. Initial Session Check (Get current state)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted) handleSession(session);
    });

    // 4. Listen for Auth Changes (Sign in, Sign out, etc.)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (mounted) handleSession(session);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  return { user, profile, isAuthenticated, loading };
}
