import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { toast } from "sonner";

const SubscriptionPaymentSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { startTrial, subscribe, refetch } = useSubscription();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const confirmAndActivate = async () => {
      const paymentKey = searchParams.get("paymentKey");
      const orderId = searchParams.get("orderId");
      const amount = searchParams.get("amount");
      const type = searchParams.get("type") || "trial";

      if (!paymentKey || !orderId || !amount || !user) {
        setStatus("error");
        setErrorMessage("결제 정보가 올바르지 않습니다");
        return;
      }

      try {
        // 1. Confirm payment with edge function
        const { data, error } = await supabase.functions.invoke("confirm-subscription-payment", {
          body: { paymentKey, orderId, amount: Number(amount), type },
        });

        if (error || !data?.success) {
          throw new Error(data?.error || error?.message || "결제 승인 실패");
        }

        // 2. Activate subscription
        if (type === "trial") {
          const ok = await startTrial();
          if (!ok) throw new Error("체험 활성화 실패");
        } else {
          const plan = type as "monthly" | "yearly";
          const ok = await subscribe(plan);
          if (!ok) throw new Error("구독 활성화 실패");
        }

        await refetch();
        setStatus("success");
        toast.success(type === "trial" ? "🎉 무료 체험이 시작되었습니다!" : "구독이 완료되었습니다!");
      } catch (err: any) {
        console.error("Subscription activation failed:", err);
        setStatus("error");
        setErrorMessage(err.message || "결제 승인에 실패했습니다");
      }
    };

    confirmAndActivate();
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
    <div className="min-h-screen bg-background max-w-[430px] mx-auto flex flex-col items-center justify-center px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
        <CheckCircle className="w-9 h-9 text-primary" />
      </div>
      <h2 className="text-lg font-bold text-foreground mb-2">
        {type === "trial" ? "무료 체험이 시작되었습니다!" : "구독이 완료되었습니다!"}
      </h2>
      <p className="text-sm text-muted-foreground mb-6">
        {type === "trial"
          ? "1개월간 모든 프리미엄 기능을 이용하실 수 있습니다."
          : "프리미엄 기능을 바로 이용해보세요."}
      </p>
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
