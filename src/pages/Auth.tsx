import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { ArrowLeft, Mail, Lock, Eye, EyeOff, User, Building2, Calendar } from "lucide-react";
import DewyLogo from "@/components/home/DewyLogo";

const emailSchema = z.string().email("올바른 이메일 형식을 입력해주세요");
// 최소 8자 — 6자는 사전공격에 취약(NIST/정보통신망법 권장 미달). 복합 문자
// 클래스 강제는 가입 전환율을 떨어뜨려 길이 기준만 상향(권장 균형).
const passwordSchema = z.string().min(8, "비밀번호는 최소 8자 이상이어야 합니다");

const MIN_AGE = 14;

// 한국 나이 셈법이 아닌 "만 나이" — Play Store / GDPR 등 글로벌 기준.
function calculateAge(birth: Date, today: Date = new Date()): number {
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

type AccountType = "individual" | "business";

// 생년월일 기본값 — 현 시점 기준 22년 전(주 사용층 연령대)으로 달력이 열리게 한다.
// (값을 비워두면 달력이 올해로 열려 수십 년을 거슬러 올라가야 함)
const defaultBirthDate = () => `${new Date().getFullYear() - 22}-01-01`;

const Auth = () => {
  const navigate = useNavigate();
  const { user, isLoading, signUp, signIn, signInWithGoogle, signInWithKakao, signInWithApple } = useAuth();
  // 입점 랜딩(/business)에서 ?type=business 로 진입 — 기업 가입을 바로 시작
  const [searchParams] = useSearchParams();
  const startAsBusiness = searchParams.get("type") === "business";
  const [isSignUp, setIsSignUp] = useState(startAsBusiness);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [birthDate, setBirthDate] = useState(defaultBirthDate());
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [accountType, setAccountType] = useState<AccountType>(
    startAsBusiness ? "business" : "individual",
  );
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    confirmPassword?: string;
    birthDate?: string;
    ageConfirmed?: string;
  }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isKakaoLoading, setIsKakaoLoading] = useState(false);
  const [isAppleLoading, setIsAppleLoading] = useState(false);

  useEffect(() => {
    if (user && !isLoading) {
      // Check if user needs business onboarding
      if (user.user_metadata?.account_type === "business") {
        navigate("/business/onboard");
      } else if (startAsBusiness) {
        // 이미 로그인된 일반회원이 기업 가입 링크(?type=business)로 들어온 경우 =
        // "기업회원 전환" 의도 — 홈으로 돌려보내면 전환이 불가능하다(버그 260613).
        // 가입 메타데이터와 무관하게 등록 폼으로 바로 보낸다.
        navigate("/business/onboard");
      } else {
        navigate("/");
      }
    }
  }, [user, isLoading, startAsBusiness, navigate]);

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};

    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      newErrors.email = emailResult.error.errors[0].message;
    }

    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) {
      newErrors.password = passwordResult.error.errors[0].message;
    }

    if (isSignUp && password !== confirmPassword) {
      newErrors.confirmPassword = "비밀번호가 일치하지 않습니다";
    }

    if (isSignUp) {
      if (!birthDate) {
        newErrors.birthDate = "생년월일을 입력해주세요";
      } else {
        const parsed = new Date(birthDate);
        if (Number.isNaN(parsed.getTime()) || parsed > new Date()) {
          newErrors.birthDate = "올바른 생년월일을 입력해주세요";
        } else if (calculateAge(parsed) < MIN_AGE) {
          newErrors.birthDate = `만 ${MIN_AGE}세 이상만 가입할 수 있습니다`;
        }
      }

      if (!ageConfirmed) {
        newErrors.ageConfirmed = `만 ${MIN_AGE}세 이상이며 이용약관에 동의해야 가입할 수 있습니다`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      if (isSignUp) {
        // user_metadata 에 14세 이상 확인 흔적 + 생년월일 보관.
        // 외부 감사 시 "가입 시점에 만 나이 확인했다" 는 증거가 되며,
        // 추후 profiles 테이블로 이관할 때도 그대로 옮길 수 있다.
        const metadata: Record<string, unknown> = {
          birth_date: birthDate,
          age_confirmed_at: new Date().toISOString(),
          age_confirmed_min: MIN_AGE,
          // 마케팅 정보 수신 동의 (정보통신망법 — 선택). 가입 시점 증거로
          // user_metadata 에 보관. 첫 로그인 후 user_consents(marketing_v1)
          // 로 backfill 하는 것은 후속 작업.
          marketing_consent: marketingConsent,
          marketing_consent_at: marketingConsent
            ? new Date().toISOString()
            : null,
        };
        if (accountType === "business") metadata.account_type = "business";
        const { error, needsEmailConfirm } = await signUp(email, password, metadata);
        if (error) {
          // 원문(영문 raw) Supabase 에러는 내부 구현 노출 위험 → 알려진 케이스만
          // 친화 문구, 그 외엔 제네릭. (상세는 콘솔에만)
          if (error.message.includes("already registered")) {
            toast.error("이미 가입된 이메일입니다");
          } else {
            console.warn("signUp error:", error.message);
            toast.error("가입 처리 중 오류가 발생했어요. 잠시 후 다시 시도해주세요.");
          }
        } else if (needsEmailConfirm) {
          // 이메일 확인이 필요한 설정 — 아직 로그인 상태가 아니므로 홈으로
          // 보내지 않고 메일 확인을 안내한다.
          toast.success("인증 메일을 보냈어요. 메일의 링크를 눌러 가입을 완료해주세요", {
            duration: 6000,
          });
          setIsSignUp(false);
        } else {
          toast.success("회원가입이 완료되었습니다!");
          if (accountType === "business") {
            navigate("/business/onboard");
          } else {
            navigate("/");
          }
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes("Invalid login")) {
            toast.error("이메일 또는 비밀번호가 올바르지 않습니다");
          } else if (error.message.toLowerCase().includes("email not confirmed")) {
            toast.error("이메일 인증이 아직 안 됐어요. 메일의 링크를 눌러 인증해주세요.");
          } else {
            console.warn("signIn error:", error.message);
            toast.error("로그인 중 오류가 발생했어요. 잠시 후 다시 시도해주세요.");
          }
        } else {
          toast.success("로그인되었습니다!");
          navigate("/");
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // 소셜 로그인 + 신규 가입을 외부 OAuth 콜백으로 처리하다 보니
  // 가입 시점에 생년월일을 입력받을 수 없다. 대신 회원가입 모드일 땐
  // 약관·만 나이 체크박스 동의를 클라이언트에서 강제하고,
  // 그 외 연령 검증은 외부 provider 정책(카카오 14세+ 정책 등) 에 위임.
  const guardSocialSignUp = (): boolean => {
    if (isSignUp && !ageConfirmed) {
      toast.error(`만 ${MIN_AGE}세 이상이며 약관에 동의해야 가입할 수 있습니다`);
      return false;
    }
    // OAuth 콜백엔 가입 폼 metadata 를 실어보낼 수 없어, 마케팅 수신 동의를
    // localStorage 에 잠시 보관한다. 첫 로그인 후 AuthContext 가 이를 읽어
    // user_consents(marketing_v1) 로 기록한다.
    // Round 22 — JSON + timestamp 로 강화. 같은 키 stale 값이 다른 탭/다른
    // 가입 시도에서 잘못 적용되는 것 방지. 24시간 후 만료 (backfill 안에서 체크).
    if (isSignUp) {
      try {
        localStorage.setItem(
          "dewy:pending-marketing-consent",
          JSON.stringify({ value: marketingConsent ? "1" : "0", ts: Date.now() }),
        );
      } catch {
        // best effort
      }
    }
    return true;
  };

  const handleGoogleSignIn = async () => {
    if (!guardSocialSignUp()) return;
    setIsGoogleLoading(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        toast.error("Google 로그인에 실패했습니다");
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleKakaoSignIn = async () => {
    if (!guardSocialSignUp()) return;
    setIsKakaoLoading(true);
    try {
      const { error } = await signInWithKakao();
      if (error) {
        toast.error("카카오 로그인에 실패했습니다");
      }
    } finally {
      setIsKakaoLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    if (!guardSocialSignUp()) return;
    setIsAppleLoading(true);
    try {
      const { error } = await signInWithApple();
      if (error) {
        toast.error("Apple 로그인에 실패했습니다");
      }
    } finally {
      setIsAppleLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background app-col mx-auto flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background app-col mx-auto">
      {/* Header */}
      <header className="sticky safe-sticky-header z-50 bg-card/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center h-14 px-4">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 flex items-center justify-center -ml-2"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="flex-1 text-center font-semibold text-lg pr-10">
            {isSignUp ? "회원가입" : "로그인"}
          </h1>
        </div>
      </header>

      {/* Content */}
      <div className="p-6">
        {/* Logo / Title */}
        <div className="text-center mb-6">
          <DewyLogo size={64} className="mx-auto" />
          <h2 className="text-2xl font-bold mt-4 text-foreground">웨딩 플래너</h2>
          <p className="text-muted-foreground mt-2">
            {isSignUp ? "새 계정을 만들어주세요" : "계정에 로그인하세요"}
          </p>
        </div>

        {/* Account Type Selector (signup only) */}
        {isSignUp && (
          <div className="flex gap-3 mb-6">
            <button
              type="button"
              onClick={() => setAccountType("individual")}
              className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all active:scale-[0.97] ${
                accountType === "individual"
                  ? "border-primary bg-primary/5"
                  : "border-border bg-card"
              }`}
            >
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                accountType === "individual" ? "bg-primary/10" : "bg-muted"
              }`}>
                <User className={`w-5 h-5 ${accountType === "individual" ? "text-primary" : "text-muted-foreground"}`} />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">개인회원</p>
                <p className="text-[11px] text-muted-foreground">예비부부</p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setAccountType("business")}
              className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all active:scale-[0.97] ${
                accountType === "business"
                  ? "border-primary bg-primary/5"
                  : "border-border bg-card"
              }`}
            >
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                accountType === "business" ? "bg-primary/10" : "bg-muted"
              }`}>
                <Building2 className={`w-5 h-5 ${accountType === "business" ? "text-primary" : "text-muted-foreground"}`} />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">기업회원</p>
                <p className="text-[11px] text-muted-foreground">웨딩 업체</p>
              </div>
            </button>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">이메일</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="example@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
              />
            </div>
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">비밀번호</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="비밀번호를 입력하세요"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <Eye className="w-5 h-5 text-muted-foreground" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password}</p>
            )}
          </div>

          {isSignUp && (
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">비밀번호 확인</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="비밀번호를 다시 입력하세요"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10"
                />
              </div>
              {errors.confirmPassword && (
                <p className="text-sm text-destructive">{errors.confirmPassword}</p>
              )}
            </div>
          )}

          {isSignUp && (
            <div className="space-y-2">
              <Label htmlFor="birthDate">생년월일</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
                <Input
                  id="birthDate"
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  max={new Date().toISOString().split("T")[0]}
                  className="pl-10"
                />
              </div>
              {errors.birthDate && (
                <p className="text-sm text-destructive">{errors.birthDate}</p>
              )}
              <p className="text-xs text-muted-foreground">
                만 {MIN_AGE}세 이상만 가입하실 수 있습니다.
              </p>
            </div>
          )}

          {isSignUp && (
            <div className="space-y-2 pt-2">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="ageConfirmed"
                  checked={ageConfirmed}
                  onCheckedChange={(checked) => setAgeConfirmed(checked === true)}
                  className="mt-0.5"
                />
                <Label
                  htmlFor="ageConfirmed"
                  className="text-sm leading-relaxed font-normal cursor-pointer"
                >
                  본인은 만 {MIN_AGE}세 이상이며,{" "}
                  <a href="/terms" target="_blank" rel="noopener" className="text-primary underline">
                    이용약관
                  </a>{" "}
                  및{" "}
                  <a href="/privacy" target="_blank" rel="noopener" className="text-primary underline">
                    개인정보처리방침
                  </a>
                  에 동의합니다.
                </Label>
              </div>
              {errors.ageConfirmed && (
                <p className="text-sm text-destructive">{errors.ageConfirmed}</p>
              )}

              <div className="flex items-start gap-3">
                <Checkbox
                  id="marketingConsent"
                  checked={marketingConsent}
                  onCheckedChange={(checked) => setMarketingConsent(checked === true)}
                  className="mt-0.5"
                />
                <Label
                  htmlFor="marketingConsent"
                  className="text-sm leading-relaxed font-normal cursor-pointer text-muted-foreground"
                >
                  <span className="text-muted-foreground">[선택]</span> 할인·이벤트·웨딩 꿀팁 등 마케팅 정보 수신에 동의합니다. (이메일·앱 알림, 언제든 해지 가능)
                </Label>
              </div>
            </div>
          )}

          <Button
            type="submit"
            className="w-full h-12 text-base font-medium mt-6"
            disabled={isSubmitting}
          >
            {isSubmitting
              ? "처리 중..."
              : isSignUp
              ? accountType === "business"
                ? "기업회원 가입"
                : "회원가입"
              : "로그인"}
          </Button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-4 my-6">
          <div className="flex-1 h-px bg-border" />
          <span className="text-sm text-muted-foreground">또는</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Social Login */}
        <div className="space-y-3">
          <Button
            type="button"
            className="w-full h-12 text-base font-medium gap-3 bg-[#FEE500] text-[#191919] hover:bg-[#FEE500]/90"
            onClick={handleKakaoSignIn}
            disabled={isKakaoLoading}
          >
            <svg className="w-5 h-5" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path
                fill="#191919"
                d="M9 1.5C4.58 1.5 1 4.31 1 7.78c0 2.27 1.54 4.26 3.85 5.36-.17.6-.61 2.18-.7 2.52-.11.42.16.41.33.3.13-.09 2.13-1.45 2.99-2.04.5.07 1.02.11 1.53.11 4.42 0 8-2.81 8-6.27S13.42 1.5 9 1.5Z"
              />
            </svg>
            {isKakaoLoading ? "처리 중..." : "카카오로 계속하기"}
          </Button>

          <Button
            type="button"
            variant="outline"
            className="w-full h-12 text-base font-medium gap-3"
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            {isGoogleLoading ? "처리 중..." : "Google로 계속하기"}
          </Button>

          <Button
            type="button"
            className="w-full h-12 text-base font-medium gap-3 bg-black text-white hover:bg-black/90"
            onClick={handleAppleSignIn}
            disabled={isAppleLoading}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M17.05 12.54c-.03-2.6 2.12-3.85 2.22-3.91-1.21-1.77-3.1-2.01-3.77-2.04-1.6-.16-3.13.94-3.94.94-.81 0-2.07-.92-3.4-.9-1.75.03-3.36 1.02-4.26 2.58-1.82 3.15-.46 7.82 1.3 10.38.86 1.25 1.89 2.66 3.23 2.61 1.3-.05 1.79-.84 3.36-.84 1.57 0 2.01.84 3.39.81 1.4-.02 2.29-1.28 3.14-2.54.99-1.45 1.4-2.86 1.42-2.93-.03-.01-2.72-1.04-2.75-4.13M14.5 4.97c.71-.86 1.19-2.06 1.06-3.25-1.02.04-2.26.68-2.99 1.54-.66.76-1.23 1.98-1.08 3.15 1.14.09 2.3-.58 3.01-1.44" />
            </svg>
            {isAppleLoading ? "처리 중..." : "Apple로 계속하기"}
          </Button>
        </div>

        {/* Toggle */}
        <div className="mt-6 text-center">
          <p className="text-muted-foreground">
            {isSignUp ? "이미 계정이 있으신가요?" : "아직 계정이 없으신가요?"}{" "}
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setErrors({});
                // 기업 가입 링크(?type=business)로 온 사용자는 토글을 오가도
                // 기업 의도를 유지한다(전환 깔때기 이탈 방지).
                setAccountType(startAsBusiness ? "business" : "individual");
                setBirthDate(defaultBirthDate());
                setAgeConfirmed(false);
              }}
              className="text-primary font-medium"
            >
              {isSignUp ? "로그인" : "회원가입"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
