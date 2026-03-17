import { useNavigate } from "react-router-dom";
import { LogIn, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LoginRequiredOverlayProps {
  /** "login" for login prompt, "signup" for signup-focused */
  variant?: "login" | "signup";
  message?: string;
}

const LoginRequiredOverlay = ({ variant = "login", message }: LoginRequiredOverlayProps) => {
  const navigate = useNavigate();

  const defaultMessage = variant === "signup"
    ? "회원가입 후 모든 기능을 이용해보세요"
    : "로그인 후 이용할 수 있어요";

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/70 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4 text-center px-8">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <Lock className="w-8 h-8 text-primary" />
        </div>
        <div>
          <p className="text-base font-bold text-foreground">
            {variant === "signup" ? "회원가입이 필요해요" : "로그인이 필요해요"}
          </p>
          <p className="text-sm text-muted-foreground mt-1">{message || defaultMessage}</p>
        </div>
        <Button
          onClick={() => navigate("/auth")}
          className="gap-2 px-6 rounded-xl"
        >
          <LogIn className="w-4 h-4" />
          {variant === "signup" ? "회원가입 / 로그인" : "로그인하기"}
        </Button>
      </div>
    </div>
  );
};

export default LoginRequiredOverlay;
