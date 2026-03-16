import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type UserType = 'personal' | 'business';

export interface BusinessProfile {
  id: string;
  user_id: string;
  vendor_id: number | null;
  business_number: string;
  business_name: string;
  ceo_name: string;
  category_type: string;
  verification_status: 'pending' | 'approved' | 'rejected';
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  userType: UserType | null;
  businessProfile: BusinessProfile | null;
  isBusinessUser: boolean;
  isApprovedBusiness: boolean;
  signUp: (email: string, password: string, userType?: UserType) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshBusinessProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userType, setUserType] = useState<UserType | null>(null);
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(null);

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_type')
        .eq('id', userId)
        .single();

      const type = (profile?.user_type as UserType) ?? 'personal';
      setUserType(type);

      if (type === 'business') {
        const { data: bp } = await supabase
          .from('business_profiles')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();
        setBusinessProfile(bp as BusinessProfile | null);
      } else {
        setBusinessProfile(null);
      }
    } catch {
      setUserType('personal');
      setBusinessProfile(null);
    }
  };

  const refreshBusinessProfile = async () => {
    if (!user) return;
    const { data: bp } = await supabase
      .from('business_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    setBusinessProfile(bp as BusinessProfile | null);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // defer to avoid deadlock with Supabase client
          setTimeout(() => fetchUserProfile(session.user.id), 0);
        } else {
          setUserType(null);
          setBusinessProfile(null);
        }
        setIsLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserProfile(session.user.id);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, selectedUserType: UserType = 'personal') => {
    const redirectUrl = `${window.location.origin}/`;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { user_type: selectedUserType },
      }
    });

    if (!error && data.user) {
      // profiles 행이 트리거로 생성된 후 user_type 반영
      setTimeout(async () => {
        await supabase
          .from('profiles')
          .upsert({ id: data.user!.id, user_type: selectedUserType }, { onConflict: 'id' });
        await fetchUserProfile(data.user!.id);
      }, 500);
    }

    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/` },
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUserType(null);
    setBusinessProfile(null);
  };

  const isBusinessUser = userType === 'business';
  const isApprovedBusiness = isBusinessUser && businessProfile?.verification_status === 'approved';

  return (
    <AuthContext.Provider value={{
      user, session, isLoading,
      userType, businessProfile,
      isBusinessUser, isApprovedBusiness,
      signUp, signIn, signInWithGoogle, signOut,
      refreshBusinessProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
