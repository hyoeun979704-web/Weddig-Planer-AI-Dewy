import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { approveSubscription } from "@/features/consumer/data/payments";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { toast } from "sonner";
import { safeSessionStorage } from "@/lib/safeSessionStorage";

const KAKAO_PAY_SESSION_KEY = "kakao_pay_session";

const SubscriptionPaymentSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { refetch } = useSubscription();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [heartsGranted, setHeartsGranted] = useState(0);
  // 구독 승인 중복발사 방지 — deps 의 user·refetch 가 늦게/재생성되며 effect 재실행
  // (StrictMode 포함). 검증 통과 후에만 가드 소비.
  const approvedRef = useRef(false);

  useEffect(() => {
    const confirmAndActivate = async () => {
      const pgToken = searchParams.get("pg_token");
      const type = searchParams.get("type") || "trial";
      const orderId = searchParams.get("order");

      const sessionRaw = safeSessionStorage.getItem(KAKAO_PAY_SESSION_KEY);
      if (!pgToken || !sessionRaw || !user) {
        setStatus("error");
        setErrorMessage("결제 정보가 올바르지 않습니다");
        return;
      }

      const session = JSON.parse(sessionRaw) as {
        tid: string;
        partnerOrderId: string;
        partnerUserId: string;
        type: string;
        amount: number;
      };

      if (orderId && session.partnerOrderId !== orderId) {
        setStatus("error");
        setErrorMessage("주문 정보가 일치하지 않습니다");
        return;
      }

      // 검증 통과 후 1회만 승인 — effect 재실행/StrictMode 이중마운트로 인한
      // approveSubscription 중복호출(구독 이중활성·하트 이중지급) 차단.
      if (approvedRef.current) return;
      approvedRef.current = true;

      try {
        const { data, error } = await approveSubscription({
          tid: session.tid,
          partnerOrderId: session.partnerOrderId,
          partnerUserId: session.partnerUserId,
          pgToken,
          type,
          amount: session.amount,
        });

        if (error || !data?.success) {
          throw new Error(data?.error || error?.message || "결제 승인 실패");
        }

        if (data.heartsGranted) {
          setHeartsGranted(data.heartsGranted);
        }

        safeSessionStorage.removeItem(KAKAO_PAY_SESSION_KEY);
        await refetch();
        setStatus("success");
        toast.success(type === "trial" ? " 무료 체험이 시작되었습니다!" : "구독이 완료되었습니다!");
      } catch (err: any) {
        console.error("Subscription activation failed:", err);
        setStatus("error");
        setErrorMessage(err.message || "결제 승인에 실패했습니다");
      }
    };

    confirmAndActivate();
  }, [searchParams, user, refetch]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background app-col mx-auto flex flex-col items-center justify-center px-4">
        <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
        <p className="text-foreground font-medium">결제를 확인하고 있습니다...</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen bg-background app-col mx-auto flex flex-col items-center justify-center px-4 text-center">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
          <XCircle className="w-9 h-9 text-destructive" />
        </div>
        <h2 className="text-lg font-bold text-foreground mb-2">처리에 실패했습니다</h2>
        <p className="text-sm text-muted-foreground mb-6">{errorMessage}</p>
        <button onClick={() => navigate("/premium")} className="px-6 py-3 bg-primary text-primary-foreground rounded-2xl font-medium">
          돌아가기
        </button>
      </div>
    );
  }

  const type = searchParams.get("type") || "trial";

  return (
    <div className="min-h-screen bg-background app-col mx-auto flex flex-col items-center justify-center px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
        <CheckCircle className="w-9 h-9 text-primary" />
      </div>
      <h2 className="text-lg font-bold text-foreground mb-2">
        {type === "trial" ? "무료 체험이 시작되었습니다!" : "구독이 완료되었습니다!"}
      </h2>
      <p className="text-sm text-muted-foreground mb-3">
        {type === "trial"
          ? "1개월간 모든 프리미엄 기능을 이용하실 수 있습니다."
          : "프리미엄 기능을 바로 이용해보세요."}
      </p>
      {heartsGranted > 0 && (
        <div className="mb-6 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold">
           초기 이용자 특전 하트 {heartsGranted}개 지급 완료
        </div>
      )}
      <div className="flex gap-3">
        <button onClick={() => navigate("/premium/content")} className="px-5 py-3 bg-primary text-primary-foreground rounded-2xl font-medium">
          프리미엄 콘텐츠 보기
        </button>
        <button onClick={() => navigate("/premium")} className="px-5 py-3 border border-border rounded-2xl font-medium text-foreground">
          구독 관리
        </button>
      </div>
    </div>
  );
};

export default SubscriptionPaymentSuccess;
