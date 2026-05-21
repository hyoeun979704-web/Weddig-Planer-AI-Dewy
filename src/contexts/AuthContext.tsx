import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { isNativeApp } from "@/lib/platform";
import { signInWithOAuthNative } from "@/lib/native/oauth";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signUp: (email: string, password: string, metadata?: Record<string, string>) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signInWithKakao: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const MARKETING_CONSENT_TYPE = "marketing_v1";

// 가입 시 user_metadata 에 남긴 마케팅 수신 동의를 user_consents 로 1회 backfill.
// 같은 user + marketing_v1 row 가 이미 있으면 건너뛴다 (이력 보존, 중복 INSERT 방지).
const backfillMarketingConsent = async (user: User) => {
  const consent = user.user_metadata?.marketing_consent;
  if (typeof consent !== "boolean") return;

  try {
    const { data, error } = await (supabase as any)
      .from("user_consents")
      .select("id")
      .eq("user_id", user.id)
      .eq("consent_type", MARKETING_CONSENT_TYPE)
      .limit(1);
    if (error || (data && data.length > 0)) return;

    const agreedAt = user.user_metadata?.marketing_consent_at ?? null;
    await (supabase as any).from("user_consents").insert({
      user_id: user.id,
      consent_type: MARKETING_CONSENT_TYPE,
      agreed: consent,
      agreed_at: agreedAt ?? undefined,
      user_agent:
        typeof navigator !== "undefined"
          ? navigator.userAgent?.slice(0, 500)
          : null,
    });
  } catch {
    // backfill 실패는 무시 — 다음 로그인 때 재시도된다.
  }
};

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

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);

        if (event === "SIGNED_IN" && session?.user) {
          // 동기 콜백 안에서 await 하지 않도록 분리 (Supabase 권장).
          void backfillMarketingConsent(session.user);
        }

        // 푸시 알림은 1차 출시에서 제외 (Firebase 미설정).
        // 활성화 시: SIGNED_IN 분기에서 isNativeApp() 가드 후 push 모듈을 동적 import.
        // 참고: supabase/functions/send-push, supabase/migrations/...device_tokens.sql 미배포 상태.
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, metadata?: Record<string, string>) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: metadata,
      }
    });
    
    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    return { error: error as Error | null };
  };

  const signInWithGoogle = async () => {
    // 네이티브에선 Custom Tabs + 딥링크 콜백, 웹에선 기존 origin 리다이렉트.
    if (isNativeApp()) return signInWithOAuthNative('google');

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    });

    return { error: error as Error | null };
  };

  const signInWithKakao = async () => {
    if (isNativeApp()) return signInWithOAuthNative('kakao');

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    });

    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, isLoading, signUp, signIn, signInWithGoogle, signInWithKakao, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
