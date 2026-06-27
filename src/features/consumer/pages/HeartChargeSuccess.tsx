import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { approveHeartCharge } from "@/features/consumer/data/payments";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { safeSessionStorage } from "@/lib/safeSessionStorage";

const SESSION_KEY = "heart_charge_session";

const HeartChargeSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [hearts, setHearts] = useState(0);
  const [pointsSpent, setPointsSpent] = useState(0);
  // 하트 충전 승인 중복발사 방지 (user 지연 + StrictMode → 이중 하트 적립 위험).
  const approvedRef = useRef(false);

  useEffect(() => {
    const run = async () => {
      const pgToken = searchParams.get("pg_token");
      const orderId = searchParams.get("order");
      const sessionRaw = safeSessionStorage.getItem(SESSION_KEY);

      if (!pgToken || !sessionRaw || !user) {
        setStatus("error");
        setErrorMessage("결제 정보가 올바르지 않습니다");
        return;
      }
      const session = JSON.parse(sessionRaw);
      if (orderId && session.partnerOrderId !== orderId) {
        setStatus("error");
        setErrorMessage("주문 정보가 일치하지 않습니다");
        return;
      }
      if (approvedRef.current) return;
      approvedRef.current = true;

      try {
        const { data, error } = await approveHeartCharge({
          tid: session.tid,
          partnerOrderId: session.partnerOrderId,
          partnerUserId: session.partnerUserId,
          pgToken,
          packageId: session.packageId,
          pointsToSpend: session.pointsToSpend,
        });

        if (error || !data?.success) {
          throw new Error(data?.error || error?.message || "결제 승인 실패");
        }

        setHearts(data.heartsGranted ?? session.hearts);
        setPointsSpent(data.pointsSpent ?? 0);
        safeSessionStorage.removeItem(SESSION_KEY);
        setStatus("success");
        toast.success(`하트 ${data.heartsGranted}개가 적립되었어요!`);
      } catch (err: any) {
        console.error("Heart charge approve failed:", err);
        setStatus("error");
        setErrorMessage(err.message || "결제 승인에 실패했습니다");
      }
    };

    run();
  }, [searchParams, user]);

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
        <button onClick={() => navigate("/points")} className="px-6 py-3 bg-primary text-primary-foreground rounded-2xl font-medium">
          돌아가기
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background app-col mx-auto flex flex-col items-center justify-center px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
        <CheckCircle className="w-9 h-9 text-primary" />
      </div>
      <h2 className="text-lg font-bold text-foreground mb-2">충전 완료!</h2>
      <p className="text-sm text-muted-foreground mb-3">
         하트 <span className="font-bold text-primary">{hearts}개</span>가 적립되었어요.
      </p>
      {pointsSpent > 0 && (
        <p className="text-xs text-muted-foreground mb-4">
          포인트 {pointsSpent.toLocaleString()}P 사용 완료
        </p>
      )}
      <div className="flex gap-3 mt-4">
        <button onClick={() => navigate("/ai-studio")} className="px-5 py-3 bg-primary text-primary-foreground rounded-2xl font-medium">
          AI 스튜디오로 이동
        </button>
        <button onClick={() => navigate("/points")} className="px-5 py-3 border border-border rounded-2xl font-medium text-foreground">
          포인트 보기
        </button>
      </div>
    </div>
  );
};

export default HeartChargeSuccess;
