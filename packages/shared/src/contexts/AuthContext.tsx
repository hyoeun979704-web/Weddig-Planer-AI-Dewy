import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { isNativeApp } from "@/lib/platform";
import { signInWithOAuthNative } from "@/lib/native/oauth";
import { resetAllSignals } from "@/lib/behavioralSignals";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signUp: (email: string, password: string, metadata?: Record<string, string>) => Promise<{ error: Error | null; needsEmailConfirm: boolean }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signInWithKakao: () => Promise<{ error: Error | null }>;
  signInWithApple: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const MARKETING_CONSENT_TYPE = "marketing_v1";
const PENDING_MARKETING_KEY = "dewy:pending-marketing-consent";
// 추천 링크(/auth?ref=code)로 들어온 사용자의 추천코드 보관 키. Auth 화면이 쓰고
// (OAuth 콜백은 쿼리 유실 → localStorage 경유), 세션 확립 후 여기서 redeem.
// ⚠️ 같은 리터럴이 Auth.tsx 에도 있음(마케팅 키와 동일 관례) — 바꾸면 양쪽 동기화.
const PENDING_REFERRAL_KEY = "dewy:pending-referral";

// 가입 시 남긴 마케팅 수신 동의를 user_consents 로 1회 backfill.
// 이메일 가입은 user_metadata 에서, 소셜 가입은 OAuth 콜백에 metadata 를 실을
// 수 없어 localStorage(pending) 에서 읽는다. 같은 user + marketing_v1 row 가
// 이미 있으면 건너뛴다 (이력 보존, 중복 INSERT 방지).
const backfillMarketingConsent = async (user: User) => {
  let consent = user.user_metadata?.marketing_consent;
  let agreedAt = user.user_metadata?.marketing_consent_at ?? null;

  if (typeof consent !== "boolean") {
    // 소셜 가입 fallback — Auth 화면이 보관한 pending 값.
    // Round 22 — JSON + timestamp 형식 (Auth.tsx 의 write 강화 호환). 24시간 후
    // stale 값은 무시 — 잠재적으로 다른 탭/다른 가입 시도의 잔재가 적용되는 것 방지.
    // 구 형식 ("1"/"0" raw string) backward compat 도 함께 처리.
    try {
      const raw = localStorage.getItem(PENDING_MARKETING_KEY);
      if (raw) {
        let pendingValue: string | null = null;
        let pendingTs: number | null = null;
        if (raw === "1" || raw === "0") {
          // 구 형식 (Round 21 이전). timestamp 없음 → 그대로 신뢰.
          pendingValue = raw;
        } else {
          try {
            const parsed = JSON.parse(raw) as { value?: string; ts?: number };
            if (parsed && typeof parsed.value === "string") {
              pendingValue = parsed.value;
              pendingTs = typeof parsed.ts === "number" ? parsed.ts : null;
            }
          } catch {
            // malformed — 무한 재시도되지 않도록 즉시 정리.
            try { localStorage.removeItem(PENDING_MARKETING_KEY); } catch { /* noop */ }
          }
        }
        const STALE_MS = 24 * 60 * 60 * 1000;
        const isFresh =
          pendingTs === null || Date.now() - pendingTs < STALE_MS;
        if (isFresh && (pendingValue === "1" || pendingValue === "0")) {
          consent = pendingValue === "1";
          agreedAt = new Date().toISOString();
        } else if (!isFresh) {
          // stale — 정리만 하고 패스.
          try { localStorage.removeItem(PENDING_MARKETING_KEY); } catch { /* noop */ }
        }
      }
    } catch {
      // ignore
    }
  }
  if (typeof consent !== "boolean") return;

  try {
    // Round 10 — canonical view 로 reads 통일. (marketing_v1 은 backfill 대상 아니라
    // 동일 결과지만 reader 규약 일관성.)
    const { data, error } = await (supabase as any)
      .from("user_consents_canonical")
      .select("id")
      .eq("user_id", user.id)
      .eq("consent_type", MARKETING_CONSENT_TYPE)
      .limit(1);
    if (error) return;
    if (data && data.length > 0) {
      // 이미 기록됨 — pending 값만 정리.
      try { localStorage.removeItem(PENDING_MARKETING_KEY); } catch { /* noop */ }
      return;
    }

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
    try { localStorage.removeItem(PENDING_MARKETING_KEY); } catch { /* noop */ }
  } catch {
    // backfill 실패는 무시 — 다음 로그인 때 재시도된다.
  }
};

// 추천 링크(?ref=code)로 가입/로그인한 사용자에게 추천 보상을 1회 적용.
// 코드는 Auth 화면이 localStorage(PENDING_REFERRAL_KEY)에 보관(OAuth·이메일 공용).
// 자기추천·중복은 redeem_referral_code RPC 가 막는다(referrals unique, 양쪽 1회 보상).
// 성공(또는 RPC 비즈룰 거절) 시 키 제거, 일시 실패(네트워크 등)면 키 유지해 다음 로그인 재시도.
const redeemPendingReferral = async (_user: User) => {
  let code: string | null = null;
  try {
    const raw = localStorage.getItem(PENDING_REFERRAL_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as { code?: string; ts?: number };
      code = typeof parsed.code === "string" ? parsed.code.trim() : null;
      const ts = typeof parsed.ts === "number" ? parsed.ts : null;
      const STALE_MS = 24 * 60 * 60 * 1000;
      if (ts !== null && Date.now() - ts >= STALE_MS) {
        // 만료된 잔재 — 정리만.
        try { localStorage.removeItem(PENDING_REFERRAL_KEY); } catch { /* noop */ }
        return;
      }
    } catch {
      // malformed — 무한 재시도 방지 위해 정리.
      try { localStorage.removeItem(PENDING_REFERRAL_KEY); } catch { /* noop */ }
      return;
    }
  } catch {
    return; // localStorage 접근 불가(프라이빗 모드 등) — 조용히 패스.
  }
  if (!code) {
    try { localStorage.removeItem(PENDING_REFERRAL_KEY); } catch { /* noop */ }
    return;
  }

  try {
    const { error } = await (supabase as any).rpc("redeem_referral_code", { p_code: code });
    if (error) return; // 일시 실패 — 키 유지, 다음 로그인 재시도.
  } catch {
    return; // 네트워크 예외 — 키 유지.
  }
  // 적립 성공 또는 자기추천/중복(비즈룰 거절) — 어느 쪽이든 1회로 종료.
  try { localStorage.removeItem(PENDING_REFERRAL_KEY); } catch { /* noop */ }
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
          // 추천 링크(?ref) 가입자 보상 1회 적용 — 세션 확립 후.
          void redeemPendingReferral(session.user);
        }

        // 푸시 알림은 1차 출시에서 제외 (Firebase 미설정).
        // 활성화 시: SIGNED_IN 분기에서 isNativeApp() 가드 후 push 모듈을 동적 import.
        // 참고: supabase/functions/send-push, device_tokens 테이블은 배포됨(20260519050000) — 남은 게이트는 Firebase 설정뿐.
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
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: metadata,
      }
    });

    // 이메일 확인이 켜져 있으면 user 는 생성되지만 session 은 비어 있다.
    // 이 경우 즉시 로그인된 게 아니므로 호출부가 "메일 확인" 안내를 띄운다.
    const needsEmailConfirm = !error && !!data?.user && !data?.session;

    return { error: error as Error | null, needsEmailConfirm };
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

  const signInWithApple = async () => {
    // Apple 로그인 (App Store 4.8 — 제3자 소셜 로그인 제공 시 필수).
    // Supabase Apple 공급자 + Apple Developer Service ID/Key 설정 필요.
    if (isNativeApp()) return signInWithOAuthNative('apple');

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    });

    return { error: error as Error | null };
  };

  const signOut = async () => {
    // Round 15 P1 fix — behavioral signals 공유 device cross-account leak 방지.
    // 이전 사용자가 dress/community/suit 본 신호가 다음 로그인 사용자에게 sensitive
    // confirm card false positive 트리거되던 회귀. signOut 시 일괄 wipe.
    resetAllSignals();
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, isLoading, signUp, signIn, signInWithGoogle, signInWithKakao, signInWithApple, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
