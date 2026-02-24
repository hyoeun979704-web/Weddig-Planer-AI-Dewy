import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/hooks/useCart";
import { toast } from "sonner";

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { clearCart } = useCart();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const confirmPayment = async () => {
      const paymentKey = searchParams.get("paymentKey");
      const orderId = searchParams.get("orderId");
      const amount = searchParams.get("amount");

      if (!paymentKey || !orderId || !amount || !user) {
        setStatus("error");
        setErrorMessage("결제 정보가 올바르지 않습니다");
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke("confirm-payment", {
          body: { paymentKey, orderId, amount: Number(amount) },
        });

        if (error || !data?.success) {
          throw new Error(data?.error || error?.message || "결제 승인 실패");
        }

        await clearCart();
        setStatus("success");
        toast.success("결제가 완료되었습니다! 🎉");
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
      <div className="min-h-screen bg-background max-w-[430px] mx-auto flex flex-col items-center justify-center px-4">
        <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
        <p className="text-foreground font-medium">결제를 확인하고 있습니다...</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen bg-background max-w-[430px] mx-auto flex flex-col items-center justify-center px-4 text-center">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
          <span className="text-3xl">❌</span>
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
    <div className="min-h-screen bg-background max-w-[430px] mx-auto flex flex-col items-center justify-center px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
        <CheckCircle className="w-9 h-9 text-primary" />
      </div>
      <h2 className="text-lg font-bold text-foreground mb-2">결제가 완료되었습니다!</h2>
      <p className="text-sm text-muted-foreground mb-1">
        주문번호: {searchParams.get("orderId")}
      </p>
      <p className="text-sm text-muted-foreground mb-6">
        결제 금액: {Number(searchParams.get("amount") || 0).toLocaleString()}원
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
