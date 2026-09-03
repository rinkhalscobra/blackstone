import { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";

type AppRole = Database["public"]["Enums"]["app_role"];
type SignUpResult = { error: Error | null; session: Session | null };
type SignInResult = { error: Error | null };

interface AuthContextType {
  user: User | null;
  session: Session | null;
  signUp: (email: string, password: string, firstName: string, lastName: string, promocode?: string) => Promise<SignUpResult>;
  signIn: (email: string, password: string) => Promise<SignInResult>;
  signOut: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    let isMounted = true;

    // Set up auth state listener FIRST (for ongoing changes)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!isMounted) return;
        setSession(session);
        setUser(session?.user ?? null);

        // Update last_login on sign in (defer to avoid deadlocks)
        if (event === 'SIGNED_IN' && session?.user) {
          setTimeout(() => {
            supabase.from('profiles')
              .update({ last_login: new Date().toISOString() })
              .eq('id', session.user.id)
              .then();
          }, 0);
        }
      }
    );

    // THEN check for existing session (controls initial loading state)
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!isMounted) return;
        setSession(session);
        setUser(session?.user ?? null);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, firstName: string, lastName: string, promocode?: string) => {
    try {
      let groupId: string | null = null;
      let roleType: AppRole | null = null;
      let promocodeId: string | null = null;

      // Validate promocode if provided
      if (promocode && promocode.trim()) {
        const { data: codeData, error: codeError } = await supabase
          .from('promocodes')
          .select('*')
          .eq('code', promocode.trim().toUpperCase())
          .eq('is_active', true)
          .maybeSingle();

        if (codeError) throw codeError;

        if (!codeData) {
          toast({
            title: "Invalid Promocode",
            description: "The promocode you entered is invalid or inactive.",
            variant: "destructive",
          });
          return { error: new Error("Invalid promocode"), session: null };
        }

        // Check if code is expired
        if (codeData.expires_at && new Date(codeData.expires_at) < new Date()) {
          toast({
            title: "Promocode Expired",
            description: "This promocode has expired.",
            variant: "destructive",
          });
          return { error: new Error("Promocode expired"), session: null };
        }

        // Check usage limit
        if (codeData.usage_limit && codeData.times_used >= codeData.usage_limit) {
          toast({
            title: "Promocode Limit Reached",
            description: "This promocode has reached its usage limit.",
            variant: "destructive",
          });
          return { error: new Error("Promocode limit reached"), session: null };
        }

        groupId = codeData.group_id;
        roleType = codeData.role_type;
        promocodeId = codeData.id;
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            group_id: groupId,
            platform: 'blackstone',
            display_email: email,
          }
        }
      });

      if (error) {
        toast({
          title: "Sign up failed",
          description: error.message,
          variant: "destructive",
        });
        return { error, session: null };
      }

      // If signup successful and we have a promocode, update the profile and increment usage
      if (data.user && promocodeId) {
        // Update profile with group_id
        await supabase
          .from('profiles')
          .update({ group_id: groupId })
          .eq('id', data.user.id);

        // Create user role if not 'user'
        if (roleType && roleType !== 'user') {
          await supabase
            .from('user_roles')
            .insert({ user_id: data.user.id, role: roleType });
        }

        // Increment promocode usage
        const { data: currentCode } = await supabase
          .from('promocodes')
          .select('times_used')
          .eq('id', promocodeId)
          .single();
        
        if (currentCode) {
          await supabase
            .from('promocodes')
            .update({ times_used: (currentCode.times_used || 0) + 1 })
            .eq('id', promocodeId);
        }
      }

      toast({
        title: "Success!",
        description: data.session
          ? "Your account is ready to use."
          : "Your account was created. Sign in after email confirmation is disabled in Supabase.",
      });

      return { error: null, session: data.session };
    } catch (error: unknown) {
      const normalizedError = error instanceof Error ? error : new Error("An unexpected error occurred");
      toast({
        title: "Sign up failed",
        description: normalizedError.message,
        variant: "destructive",
      });
      return { error: normalizedError, session: null };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        toast({
          title: "Sign in failed",
          description: error.message,
          variant: "destructive",
        });
        return { error };
      }

      // IP whitelist enforcement disabled - all staff logins are accepted

      toast({
        title: "Welcome back!",
        description: "You have successfully signed in.",
      });

      return { error: null };
    } catch (error: unknown) {
      return { error: error instanceof Error ? error : new Error("An unexpected error occurred") };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Signed out",
      description: "You have been signed out successfully.",
    });
  };

  return (
    <AuthContext.Provider value={{ user, session, signUp, signIn, signOut, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
