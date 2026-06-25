import type { ReactNode } from "react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, ShieldOff, AlertCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";

interface BusinessGuardProps {
  children: ReactNode;
  /**
   * 승인(approval_status='approved')된 업체만 허용. 쿠폰·이벤트·상품·갤러리·
   * 정보수정 등 *콘텐츠 관리* 페이지에 적용 — 승인 전 업체가 URL 직접 진입해
   * 노출 안 되는 초안을 만드는 갭 차단. 미승인이면 대시보드(상태 화면)로 보낸다.
   * 대시보드 자체는 pending/rejected 상태를 보여줘야 하므로 이 옵션을 쓰지 않는다.
   */
  requireApproved?: boolean;
}

/**
 * 사업자(business 역할) 전용 관리 영역 보호.
 * - 비로그인 → /auth
 * - 역할 조회 실패 → "권한 없음"과 구분해 재시도 안내 (승인된 사업자가 일시
 *   오류로 튕기지 않도록)
 * - 일반 사용자 → 안내 + 홈
 * - requireApproved 인데 미승인 → 대시보드로 (상태 확인)
 * - 사업자 → children
 *
 * 온보딩(/business/onboard)은 가입 전 진입이 정상이라 가드를 적용하지 않는다.
 */
const BusinessGuard = ({ children, requireApproved = false }: BusinessGuardProps) => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { isBusiness, isError, isLoading: roleLoading, businessProfile } = useUserRole();

  const isLoading = authLoading || roleLoading;
  const needsApproval =
    requireApproved && isBusiness && businessProfile?.approval_status !== "approved";

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      navigate("/auth", { replace: true });
      return;
    }
    // 미승인 업체가 관리 페이지 URL 직접 진입 → 대시보드(상태 화면)로.
    if (needsApproval) navigate("/business/dashboard", { replace: true });
  }, [isLoading, user, needsApproval, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  // 미승인 → useEffect 가 대시보드로 보내는 동안 스피너(콘텐츠 깜빡임 방지).
  if (needsApproval) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-lg font-bold text-foreground mb-2">정보를 불러오지 못했어요</h1>
          <p className="text-sm text-muted-foreground mb-6">
            잠시 후 다시 시도해주세요.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium text-sm"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  if (!isBusiness) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <ShieldOff className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-lg font-bold text-foreground mb-2">기업회원 전용입니다</h1>
          <p className="text-sm text-muted-foreground mb-6">
            업체 관리는 기업회원 가입 후 이용할 수 있어요.
          </p>
          <div className="flex gap-2 justify-center">
            <button
              type="button"
              onClick={() => navigate("/business/onboard", { replace: true })}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium text-sm"
            >
              기업회원 가입
            </button>
            <button
              type="button"
              onClick={() => navigate("/", { replace: true })}
              className="px-4 py-2 bg-muted text-foreground rounded-lg font-medium text-sm"
            >
              홈으로
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default BusinessGuard;
