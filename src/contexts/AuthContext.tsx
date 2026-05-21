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
const MARKETING_CONSENT_VERSION = 1;

/**
 * 가입 시 user_metadata 에만 기록된 마케팅 수신 동의를
 * user_consents(marketing_v1) 로 1회 이관한다. 동의·거부 모두 이력으로
 * 남긴다(정보통신망법 — 동의 시점·내용 보관). 실패해도 흐름을 막지 않는다.
 */
async function backfillMarketingConsent(user: User) {
  const meta = user.user_metadata ?? {};
  if (!("marketing_consent" in meta)) return; // 마케팅 필드 자체가 없는 구 계정은 대상 아님

  const guardKey = `marketing_consent_migrated_${user.id}`;
  try {
    if (typeof localStorage !== "undefined" && localStorage.getItem(guardKey)) {
      return;
    }

    const { data: existing } = await (supabase as any)
      .from("user_consents")
      .select("id")
      .eq("user_id", user.id)
      .eq("consent_type", MARKETING_CONSENT_TYPE)
      .limit(1)
      .maybeSingle();

    if (!existing) {
      const agreed = !!meta.marketing_consent;
      const agreedAt =
        typeof meta.marketing_consent_at === "string"
          ? meta.marketing_consent_at
          : undefined;
      await (supabase as any).from("user_consents").insert({
        user_id: user.id,
        consent_type: MARKETING_CONSENT_TYPE,
        consent_version: MARKETING_CONSENT_VERSION,
        agreed,
        ...(agreedAt ? { agreed_at: agreedAt } : {}),
        notes: JSON.stringify({ source: "signup_metadata_backfill" }),
      });
    }

    if (typeof localStorage !== "undefined") {
      localStorage.setItem(guardKey, "1");
    }
  } catch (e) {
    console.error("marketing consent backfill failed", e);
  }
}

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

  // 가입 시 user_metadata.marketing_consent 에만 남던 마케팅 동의를
  // user_consents(marketing_v1) 이력 테이블로 1회 이관(backfill).
  // 이미 동의 row 가 있으면 건너뛰고, 단말 가드로 로그인마다 재조회하지 않는다.
  useEffect(() => {
    if (!user) return;
    void backfillMarketingConsent(user);
  }, [user]);

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
