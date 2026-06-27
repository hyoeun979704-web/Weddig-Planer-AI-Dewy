import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { approveOrderPayment } from "@/features/consumer/data/orders";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/hooks/useCart";
import { ORDER_SESSION_KEY } from "./Checkout";
import { toast } from "sonner";
import { safeSessionStorage } from "@/lib/safeSessionStorage";

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { clearCart } = useCart();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [paidAmount, setPaidAmount] = useState(0);
  // 결제 승인 중복발사 방지 — user 가 null→값으로 늦게 채워지며 effect 가 재실행되고
  // (StrictMode 이중마운트 포함) sessionStorage 는 승인 await 이후에야 지워지므로,
  // 가드 없이는 같은 tid 로 승인이 2번 호출될 수 있다. 검증 통과 후에만 가드를 소비.
  const approvedRef = useRef(false);

  useEffect(() => {
    const confirmPayment = async () => {
      const pgToken = searchParams.get("pg_token");
      const orderParam = searchParams.get("order");
      const sessionRaw = safeSessionStorage.getItem(ORDER_SESSION_KEY);

      if (!pgToken || !sessionRaw || !user) {
        setStatus("error");
        setErrorMessage("결제 정보가 올바르지 않습니다");
        return;
      }
      const session = JSON.parse(sessionRaw);
      if (orderParam && session.partnerOrderId !== orderParam) {
        setStatus("error");
        setErrorMessage("주문 정보가 일치하지 않습니다");
        return;
      }
      if (approvedRef.current) return;
      approvedRef.current = true;

      // 디자인 마켓 구매는 별도 승인 함수(포인트 차감·라이선스 grant). 세션 type/URL 로 분기.
      const isDesign = session.type === "design" || searchParams.get("type") === "design";

      try {
        const { data, error } = await approveOrderPayment(isDesign, {
          tid: session.tid,
          partnerOrderId: session.partnerOrderId,
          partnerUserId: session.partnerUserId,
          pgToken,
        });

        if (error || !data?.success) {
          throw new Error(data?.error || error?.message || "결제 승인 실패");
        }

        if (!isDesign) await clearCart(); // 디자인은 장바구니 무관
        safeSessionStorage.removeItem(ORDER_SESSION_KEY);
        setOrderNumber(data.order_number ?? session.partnerOrderId);
        setPaidAmount(data.amount ?? 0);
        setStatus("success");
        toast.success("결제가 완료되었습니다!");
      } catch (err: any) {
        console.error("Payment confirmation failed:", err);
        setStatus("error");
        setErrorMessage(err.message || "결제 승인에 실패했습니다");
      }
    };

    confirmPayment();
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
        <h2 className="text-lg font-bold text-foreground mb-2">결제 승인 실패</h2>
        <p className="text-sm text-muted-foreground mb-6">{errorMessage}</p>
        <button
          onClick={() => navigate("/checkout")}
          className="px-6 py-3 bg-primary text-primary-foreground rounded-2xl font-medium"
        >
          다시 시도하기
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background app-col mx-auto flex flex-col items-center justify-center px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
        <CheckCircle className="w-9 h-9 text-primary" />
      </div>
      <h2 className="text-lg font-bold text-foreground mb-2">결제가 완료되었습니다!</h2>
      <p className="text-sm text-muted-foreground mb-1">주문번호: {orderNumber}</p>
      <p className="text-sm text-muted-foreground mb-6">
        결제 금액: {paidAmount.toLocaleString()}원
      </p>
      <div className="flex gap-3">
        <button
          onClick={() => navigate("/orders")}
          className="px-5 py-3 bg-primary text-primary-foreground rounded-2xl font-medium"
        >
          주문 내역 보기
        </button>
        <button
          onClick={() => navigate("/")}
          className="px-5 py-3 border border-border rounded-2xl font-medium text-foreground"
        >
          홈으로
        </button>
      </div>
    </div>
  );
};

export default PaymentSuccess;
