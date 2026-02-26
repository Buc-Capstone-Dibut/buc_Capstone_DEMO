import { useEffect, useState } from "react";
import { getUserProfile, UserProfile } from "@/lib/auth";
import { supabase } from "@/lib/supabase/client";
import { User, Session } from "@supabase/supabase-js";

let initialSessionPromise: Promise<Session | null> | null = null;
let initialSessionCache: { value: Session | null; at: number } | null = null;
const inflightProfileByUser = new Map<string, Promise<UserProfile | null>>();
const SESSION_CACHE_TTL_MS = 15_000;

function getInitialSessionOnce(): Promise<Session | null> {
  const now = Date.now();
  if (initialSessionCache && now - initialSessionCache.at < SESSION_CACHE_TTL_MS) {
    return Promise.resolve(initialSessionCache.value);
  }

  if (!initialSessionPromise) {
    initialSessionPromise = supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        const value = session ?? null;
        initialSessionCache = { value, at: Date.now() };
        return value;
      })
      .finally(() => {
        initialSessionPromise = null;
      });
  }
  return initialSessionPromise;
}

function getUserProfileOnce(user: User): Promise<UserProfile | null> {
  const key = user.id;
  const cached = inflightProfileByUser.get(key);
  if (cached) return cached;

  const request = getUserProfile(user.id, user).finally(() => {
    inflightProfileByUser.delete(key);
  });
  inflightProfileByUser.set(key, request);
  return request;
}

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
        const userProfile = await getUserProfileOnce(currentUser);
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
    getInitialSessionOnce()
      .then((session) => {
        if (mounted) handleSession(session);
      })
      .catch((error) => {
        if (mounted) setLoading(false);
        console.error("Session fetch error:", error);
      });

    // 4. Listen for Auth Changes (Sign in, Sign out, etc.)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      initialSessionCache = { value: session ?? null, at: Date.now() };
      if (mounted) handleSession(session);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  return { user, profile, isAuthenticated, loading };
}
