import { useNavigate, useSearchParams } from "react-router-dom";

const HeartChargeFail = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const reason = searchParams.get("reason");
  const message =
    reason === "cancel" ? "결제가 취소되었습니다" : "결제에 실패했습니다";

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto flex flex-col items-center justify-center px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
        <span className="text-3xl"></span>
      </div>
      <h2 className="text-lg font-bold text-foreground mb-2">충전 실패</h2>
      <p className="text-sm text-muted-foreground mb-6">{message}</p>
      <div className="flex gap-3">
        <button
          onClick={() => navigate("/points/charge")}
          className="px-5 py-3 bg-primary text-primary-foreground rounded-2xl font-medium"
        >
          다시 시도
        </button>
        <button
          onClick={() => navigate("/points")}
          className="px-5 py-3 border border-border rounded-2xl font-medium text-foreground"
        >
          포인트 페이지로
        </button>
      </div>
    </div>
  );
};

export default HeartChargeFail;
