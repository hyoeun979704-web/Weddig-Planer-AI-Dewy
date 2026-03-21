import { useNavigate } from "react-router-dom";
import { LogIn, UserPlus, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LoginRequiredOverlayProps {
  /** "login" for login prompt, "signup" for signup-focused */
  variant?: "login" | "signup";
  message?: string;
  /** Feature highlights shown as chips */
  features?: string[];
}

const LoginRequiredOverlay = ({ variant = "login", message, features }: LoginRequiredOverlayProps) => {
  const navigate = useNavigate();

  const defaultMessage = variant === "signup"
    ? "회원가입하고 나만의 웨딩 준비를 시작하세요"
    : "무료 가입하고 모든 기능을 이용해보세요";

  return (
    <>
      {/* Blur overlay excluding header (56px) and bottom nav (64px) */}
      <div className="fixed left-0 right-0 z-[100] bg-background/25 backdrop-blur-sm" style={{ top: 56, bottom: 64 }} />

      {/* Centered CTA card */}
      <div className="fixed inset-0 z-[101] flex items-center justify-center pointer-events-none px-4">
        <div className="pointer-events-auto w-full max-w-[380px] rounded-2xl bg-card border border-primary/20 shadow-xl overflow-hidden">
          <div className="p-5">
            {features && features.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {features.map((f) => (
                  <span key={f} className="text-[11px] px-2.5 py-1 rounded-full bg-primary/10 text-primary font-medium">
                    {f}
                  </span>
                ))}
              </div>
            )}
            <p className="text-sm font-bold text-foreground mb-0.5">
              {variant === "signup" ? "지금 무료로 시작하세요 ✨" : "로그인하고 시작하세요 ✨"}
            </p>
            <p className="text-xs text-muted-foreground mb-3">{message || defaultMessage}</p>
            <div className="flex gap-2">
              <Button
                onClick={() => navigate("/auth")}
                size="sm"
                className="flex-1 gap-1.5 rounded-xl text-sm h-10"
              >
                <UserPlus className="w-4 h-4" />
                무료 회원가입
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/auth")}
                className="gap-1 rounded-xl text-sm h-10 text-muted-foreground"
              >
                로그인
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default LoginRequiredOverlay;
