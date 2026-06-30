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
  const { user, isLoading, signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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
