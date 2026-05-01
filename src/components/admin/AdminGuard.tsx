import type { ReactNode } from "react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, ShieldOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";

interface AdminGuardProps {
  children: ReactNode;
}

/**
 * 관리자(admin 역할) 전용 영역 보호.
 * - 비로그인 → /auth 로 리다이렉트
 * - 일반 사용자 → 안내 + /로 리다이렉트
 * - 로딩 중 → 스피너
 * - 관리자 → children 렌더
 *
 * 권한은 user_roles 테이블의 'admin' 역할로 판단.
 * 업체용(business) 권한과 명확히 분리됨.
 */
const AdminGuard = ({ children }: AdminGuardProps) => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { isAdmin, isLoading: roleLoading } = useUserRole();

  const isLoading = authLoading || roleLoading;

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      navigate("/auth", { replace: true });
    }
  }, [isLoading, user, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <ShieldOff className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-lg font-bold text-foreground mb-2">접근 권한이 없습니다</h1>
          <p className="text-sm text-muted-foreground mb-6">
            이 페이지는 운영자 전용입니다.
          </p>
          <button
            type="button"
            onClick={() => navigate("/", { replace: true })}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium text-sm"
          >
            홈으로
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default AdminGuard;
