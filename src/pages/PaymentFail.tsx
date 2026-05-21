import { useNavigate, useSearchParams } from "react-router-dom";
import { XCircle } from "lucide-react";

const PaymentFail = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const errorCode = searchParams.get("code") || "";
  const errorMessage = searchParams.get("message") || "결제에 실패했습니다";

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto flex flex-col items-center justify-center px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
        <XCircle className="w-9 h-9 text-destructive" />
      </div>
      <h2 className="text-lg font-bold text-foreground mb-2">결제에 실패했습니다</h2>
      <p className="text-sm text-muted-foreground mb-1">{errorMessage}</p>
      {errorCode && (
        <p className="text-xs text-muted-foreground mb-6">에러 코드: {errorCode}</p>
      )}
      <div className="flex gap-3 mt-4">
        <button
          onClick={() => navigate("/checkout")}
          className="px-5 py-3 bg-primary text-primary-foreground rounded-2xl font-medium"
        >
          다시 시도하기
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

export default PaymentFail;
