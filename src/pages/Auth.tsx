import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { useAuth } from "@/contexts/AuthContext";
import type { UserType } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, Mail, Lock, Eye, EyeOff, User, Building2, ChevronRight } from "lucide-react";

const emailSchema = z.string().email("올바른 이메일 형식을 입력해주세요");
const passwordSchema = z.string().min(6, "비밀번호는 최소 6자 이상이어야 합니다");

type SignUpStep = 'type-select' | 'credentials';

const Auth = () => {
  const navigate = useNavigate();
  const { user, isLoading, signUp, signIn, signInWithGoogle } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [signUpStep, setSignUpStep] = useState<SignUpStep>('type-select');
  const [selectedUserType, setSelectedUserType] = useState<UserType>('personal');
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; confirmPassword?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  useEffect(() => {
    if (user && !isLoading) {
      navigate("/");
    }
  }, [user, isLoading, navigate]);

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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      if (isSignUp) {
        const { error } = await signUp(email, password, selectedUserType);
        if (error) {
          if (error.message.includes("already registered")) {
            toast.error("이미 가입된 이메일입니다");
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success("회원가입이 완료되었습니다!");
          // 기업회원은 업체 등록 페이지로 이동
          navigate(selectedUserType === 'business' ? "/vendor/setup" : "/");
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes("Invalid login")) {
            toast.error("이메일 또는 비밀번호가 올바르지 않습니다");
          } else {
            toast.error(error.message);
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

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) toast.error("Google 로그인에 실패했습니다");
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleModeToggle = () => {
    setIsSignUp(!isSignUp);
    setSignUpStep('type-select');
    setErrors({});
    setEmail("");
    setPassword("");
    setConfirmPassword("");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background max-w-[430px] mx-auto flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center h-14 px-4">
          <button
            onClick={() => {
              if (isSignUp && signUpStep === 'credentials') {
                setSignUpStep('type-select');
              } else {
                navigate(-1);
              }
            }}
            className="w-10 h-10 flex items-center justify-center -ml-2"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="flex-1 text-center font-semibold text-lg pr-10">
            {isSignUp
              ? signUpStep === 'type-select' ? "회원 유형 선택" : "회원가입"
              : "로그인"}
          </h1>
        </div>
      </header>

      <div className="p-6">
        {/* Logo */}
        <div className="text-center mb-8">
          <span className="text-6xl">💍</span>
          <h2 className="text-2xl font-bold mt-4 text-foreground">웨딩 플래너</h2>
          <p className="text-muted-foreground mt-2">
            {isSignUp
              ? signUpStep === 'type-select' ? "회원 유형을 선택해주세요" : "새 계정을 만들어주세요"
              : "계정에 로그인하세요"}
          </p>
        </div>

        {/* ── 회원가입: 유형 선택 스텝 ── */}
        {isSignUp && signUpStep === 'type-select' && (
          <div className="space-y-4">
            {/* 개인회원 카드 */}
            <button
              type="button"
              onClick={() => { setSelectedUserType('personal'); setSignUpStep('credentials'); }}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left
                ${selectedUserType === 'personal'
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-card hover:border-primary/40'}`}
            >
              <div className="w-12 h-12 rounded-xl bg-pink-100 flex items-center justify-center flex-shrink-0">
                <User className="w-6 h-6 text-pink-500" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-foreground">개인 회원</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  결혼을 준비하는 예비 신랑·신부
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>

            {/* 기업회원 카드 */}
            <button
              type="button"
              onClick={() => { setSelectedUserType('business'); setSignUpStep('credentials'); }}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left
                ${selectedUserType === 'business'
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-card hover:border-primary/40'}`}
            >
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                <Building2 className="w-6 h-6 text-blue-500" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-foreground">기업 회원</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  웨딩홀, 스튜디오 등 업체 관계자
                </p>
                <span className="inline-block mt-1 text-xs font-medium px-2 py-0.5 bg-blue-100 text-blue-600 rounded-full">
                  사업자 인증 필요
                </span>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>

            <div className="mt-6 text-center">
              <p className="text-muted-foreground text-sm">
                이미 계정이 있으신가요?{" "}
                <button type="button" onClick={handleModeToggle} className="text-primary font-medium">
                  로그인
                </button>
              </p>
            </div>
          </div>
        )}

        {/* ── 로그인 / 회원가입 자격증명 스텝 ── */}
        {(!isSignUp || signUpStep === 'credentials') && (
          <>
            {/* 기업회원 선택 표시 */}
            {isSignUp && selectedUserType === 'business' && (
              <div className="mb-4 flex items-center gap-2 px-4 py-3 bg-blue-50 rounded-xl border border-blue-100">
                <Building2 className="w-4 h-4 text-blue-500 flex-shrink-0" />
                <p className="text-sm text-blue-700">
                  기업 회원으로 가입합니다. 가입 후 사업자 인증을 진행해주세요.
                </p>
              </div>
            )}

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
                {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
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
                    {showPassword ? <EyeOff className="w-5 h-5 text-muted-foreground" /> : <Eye className="w-5 h-5 text-muted-foreground" />}
                  </button>
                </div>
                {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
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
                  {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword}</p>}
                </div>
              )}

              <Button type="submit" className="w-full h-12 text-base font-medium mt-6" disabled={isSubmitting}>
                {isSubmitting ? "처리 중..." : isSignUp ? "회원가입" : "로그인"}
              </Button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-4 my-6">
              <div className="flex-1 h-px bg-border" />
              <span className="text-sm text-muted-foreground">또는</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Google 로그인 (로그인 전용) */}
            {!isSignUp && (
              <Button
                type="button"
                variant="outline"
                className="w-full h-12 text-base font-medium gap-3"
                onClick={handleGoogleSignIn}
                disabled={isGoogleLoading}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                {isGoogleLoading ? "처리 중..." : "Google로 계속하기"}
              </Button>
            )}

            <div className="mt-6 text-center">
              <p className="text-muted-foreground">
                {isSignUp ? "이미 계정이 있으신가요?" : "아직 계정이 없으신가요?"}{" "}
                <button type="button" onClick={handleModeToggle} className="text-primary font-medium">
                  {isSignUp ? "로그인" : "회원가입"}
                </button>
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Auth;
