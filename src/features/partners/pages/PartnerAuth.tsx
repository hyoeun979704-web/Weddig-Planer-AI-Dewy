import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Mail, Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { mapAuthError } from "@/lib/authErrors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

// 사장님 앱 전용 로그인/가입 — 소비자 Auth 와 분리된 독립 동선(4-B).
// 인증 자체는 공유 Supabase(AuthContext) 를 쓰되, UI·문구·진입 후 경로는 사장님 맥락.
// 로그인/가입 모두 성공 후 /business/dashboard 로 — 대시보드가 미가입→온보딩,
// 검토중→상태화면, 승인→관리 로 알아서 분기한다(단일 진입점).
const PartnerAuth = () => {
  const navigate = useNavigate();
  const { user, isLoading, signIn, signUp, signInWithGoogle, signInWithKakao, signInWithApple } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // 소셜 로그인(계정연동) — 진행 중 provider. OAuth 성공 시 origin/ 로 리다이렉트되며
  // 돌아오면 useEffect(user) 가 대시보드로 보낸다(이메일 로그인과 동일 동선).
  const [social, setSocial] = useState<null | "kakao" | "google" | "apple">(null);

  const handleSocial = async (
    provider: "kakao" | "google" | "apple",
    fn: () => Promise<{ error: Error | null }>,
  ) => {
    setSocial(provider);
    try {
      const { error } = await fn();
      if (error) {
        toast.error(`${provider === "kakao" ? "카카오" : provider === "google" ? "Google" : "Apple"} 로그인에 실패했어요`);
        setSocial(null);
      }
      // 성공 시 외부 OAuth 페이지로 이동(언마운트) — setSocial 복구 불필요.
    } catch {
      toast.error("로그인 중 오류가 발생했어요");
      setSocial(null);
    }
  };

  // 이미 로그인된 사용자가 이 페이지에 오면 대시보드로(상태별 분기는 대시보드가 담당).
  useEffect(() => {
    if (!isLoading && user) navigate("/business/dashboard", { replace: true });
  }, [isLoading, user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.error("이메일과 비밀번호를 입력해 주세요");
      return;
    }
    setSubmitting(true);
    try {
      if (mode === "login") {
        const { error } = await signIn(email.trim(), password);
        if (error) {
          toast.error(mapAuthError(error));
          return;
        }
        // 성공 시 useEffect(user) 가 대시보드로 이동.
      } else {
        // 가입은 기업회원으로 표시(account_type=business) → 첫 로그인 후 온보딩 분기.
        const { error, needsEmailConfirm } = await signUp(email.trim(), password, {
          account_type: "business",
        });
        if (error) {
          toast.error(mapAuthError(error));
          return;
        }
        if (needsEmailConfirm) {
          toast.success("가입 메일을 보냈어요. 메일 인증 후 로그인해 주세요");
          setMode("login");
        }
        // 인증 불필요 환경이면 useEffect(user) 가 대시보드로 이동.
      }
    } catch (err) {
      toast.error(mapAuthError(err instanceof Error ? err : new Error("알 수 없는 오류")));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background app-col mx-auto flex flex-col">
      <main className="flex-1 flex flex-col justify-center px-6 py-10">
        {/* 사장님 브랜딩 — 소비자와 구분되는 진입 정체성 */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Dewy 파트너</h1>
          <p className="text-sm text-muted-foreground mt-1">사장님 업체 관리 센터</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">이메일</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="business@example.com"
                className="pl-10"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">비밀번호</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type={showPw ? "text" : "password"}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호"
                className="pl-10 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                aria-label={showPw ? "비밀번호 숨기기" : "비밀번호 보기"}
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <Button type="submit" disabled={submitting} className="w-full h-12 text-base font-medium">
            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : mode === "login" ? "로그인" : "기업회원 가입"}
          </Button>
        </form>

        {/* 구분선 */}
        <div className="flex items-center gap-4 my-6">
          <div className="flex-1 h-px bg-border" />
          <span className="text-sm text-muted-foreground">또는</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* 소셜 로그인(계정연동) — 공유 AuthContext, 사장님 앱 origin 으로 콜백 */}
        <div className="space-y-3">
          <Button
            type="button"
            className="w-full h-12 text-base font-medium gap-3 bg-[#FEE500] text-[#191919] hover:bg-[#FEE500]/90"
            onClick={() => handleSocial("kakao", signInWithKakao)}
            disabled={social !== null}
          >
            <svg className="w-5 h-5" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path
                fill="#191919"
                d="M9 1.5C4.58 1.5 1 4.31 1 7.78c0 2.27 1.54 4.26 3.85 5.36-.17.6-.61 2.18-.7 2.52-.11.42.16.41.33.3.13-.09 2.13-1.45 2.99-2.04.5.07 1.02.11 1.53.11 4.42 0 8-2.81 8-6.27S13.42 1.5 9 1.5Z"
              />
            </svg>
            {social === "kakao" ? "처리 중..." : "카카오로 계속하기"}
          </Button>

          <Button
            type="button"
            variant="outline"
            className="w-full h-12 text-base font-medium gap-3"
            onClick={() => handleSocial("google", signInWithGoogle)}
            disabled={social !== null}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            {social === "google" ? "처리 중..." : "Google로 계속하기"}
          </Button>

          <Button
            type="button"
            className="w-full h-12 text-base font-medium gap-3 bg-black text-white hover:bg-black/90"
            onClick={() => handleSocial("apple", signInWithApple)}
            disabled={social !== null}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M17.05 12.54c-.03-2.6 2.12-3.85 2.22-3.91-1.21-1.77-3.1-2.01-3.77-2.04-1.6-.16-3.13.94-3.94.94-.81 0-2.07-.92-3.4-.9-1.75.03-3.36 1.02-4.26 2.58-1.82 3.15-.46 7.82 1.3 10.38.86 1.25 1.89 2.66 3.23 2.61 1.3-.05 1.79-.84 3.36-.84 1.57 0 2.01.84 3.39.81 1.4-.02 2.29-1.28 3.14-2.54.99-1.45 1.4-2.86 1.42-2.93-.03-.01-2.72-1.04-2.75-4.13M14.5 4.97c.71-.86 1.19-2.06 1.06-3.25-1.02.04-2.26.68-2.99 1.54-.66.76-1.23 1.98-1.08 3.15 1.14.09 2.3-.58 3.01-1.44" />
            </svg>
            {social === "apple" ? "처리 중..." : "Apple로 계속하기"}
          </Button>
        </div>

        {/* 로그인 ↔ 가입 전환 */}
        <div className="text-center mt-5">
          <button
            type="button"
            onClick={() => setMode((m) => (m === "login" ? "signup" : "login"))}
            className="text-sm text-muted-foreground"
          >
            {mode === "login" ? (
              <>아직 기업회원이 아니신가요? <span className="text-primary font-medium">가입하기</span></>
            ) : (
              <>이미 계정이 있으신가요? <span className="text-primary font-medium">로그인</span></>
            )}
          </button>
        </div>

        {/* 입점 안내(가드 없는 공개 랜딩) — 가입 전 둘러보기 */}
        <div className="text-center mt-8 pt-6 border-t border-border">
          <button
            type="button"
            onClick={() => navigate("/business")}
            className="text-[13px] text-muted-foreground"
          >
            Dewy 입점이 처음이신가요? <span className="text-primary font-medium">입점 안내 보기</span>
          </button>
        </div>
      </main>
    </div>
  );
};

export default PartnerAuth;
