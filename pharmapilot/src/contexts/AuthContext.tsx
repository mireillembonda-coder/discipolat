import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

interface SignUpInput {
  email: string;
  password: string;
  fullName: string;
  pharmacyName: string;
}

interface AuthState {
  configured: boolean;
  loading: boolean;
  session: Session | null;
  user: User | null;
  signIn(email: string, password: string): Promise<void>;
  signUp(input: SignUpInput): Promise<{ needsConfirmation: boolean }>;
  signOut(): Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      configured: isSupabaseConfigured,
      loading,
      session,
      user: session?.user ?? null,
      async signIn(email, password) {
        if (!supabase) throw new Error("Supabase non configuré");
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      },
      async signUp({ email, password, fullName, pharmacyName }) {
        if (!supabase) throw new Error("Supabase non configuré");
        // Les métadonnées sont reprises par le trigger `handle_new_user` (voir migration SQL)
        // pour créer le profil, l'organisation et la première officine.
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName, pharmacy_name: pharmacyName } },
        });
        if (error) throw error;
        return { needsConfirmation: !data.session };
      },
      async signOut() {
        await supabase?.auth.signOut();
      },
    }),
    [loading, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit être utilisé dans <AuthProvider>");
  return ctx;
}
