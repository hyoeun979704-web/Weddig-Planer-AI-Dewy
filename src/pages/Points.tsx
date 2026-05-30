import { useNavigate } from "react-router-dom";
import { Coins, Clock, ChevronRight, Loader2, Check, Flame } from "lucide-react";
import Seo from "@/components/Seo";
import BottomNav from "@/components/BottomNav";
import PageHeader from "@/components/PageHeader";
import { useAuth } from "@/contexts/AuthContext";
import { usePoints, labelForReason } from "@/hooks/usePoints";
import { useAttendance } from "@/hooks/useAttendance";
import { toast } from "sonner";

const formatDate = (iso: string): string => {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
};

const Points = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { balance, transactions, isLoading, refetch: refetchPoints } = usePoints();
  const attendance = useAttendance();

  const cashValue = Math.floor(balance * 0.2); // 1P = 0.2원

  const handleAttendance = async () => {
    if (attendance.alreadyClaimedToday) return;
    const result = await attendance.claim();
    if (!result) {
      toast.error("출석 처리에 실패했어요. 다시 시도해주세요.");
      return;
    }
    if (!result.claimed) {
      toast.info("오늘은 이미 출석을 완료했어요.");
      return;
    }
    await refetchPoints();
    const bonusText = result.bonusAmount > 0 ? ` + 연속 ${result.currentStreak}일 보너스 ${result.bonusAmount}P!` : "";
    toast.success(`출석 완료! ${result.baseAmount}P 적립${bonusText}`);
  };

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto relative">
      <Seo title="포인트·하트 적립 | Dewy" description="출석·미션·체크리스트 완료로 하트 적립. AI 드레스·메이크업 시뮬레이션에 사용 가능." path="/points" />
      <PageHeader title="포인트" />

      <main className="pb-20">
        {/* Point Summary */}
        <div className="p-6 bg-gradient-to-br from-primary/20 to-primary/5">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">보유 포인트</p>
            {isLoading ? (
              <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
            ) : (
              <>
                <p className="text-4xl font-bold text-primary">{balance.toLocaleString()}P</p>
                <p className="text-xs text-muted-foreground mt-1">≈ {cashValue.toLocaleString()}원 상당</p>
              </>
            )}
          </div>
          <div className="flex gap-3 mt-6">
            <button
              onClick={() => navigate("/merge-game")}
              className="flex-1 py-3 bg-card border border-border text-foreground rounded-xl font-medium text-sm flex items-center justify-center gap-2"
            >
              <Coins className="w-4 h-4" />
              게임으로 적립
            </button>
            <button
              onClick={() => navigate("/points/charge")}
              className="flex-1 py-3 bg-primary text-primary-foreground rounded-xl font-medium text-sm flex items-center justify-center gap-2"
            >
               하트 충전
            </button>
          </div>
        </div>

        {/* 출석 체크 카드 */}
        {user && (
          <div className="px-4 pt-4">
            <button
              onClick={handleAttendance}
              disabled={attendance.alreadyClaimedToday || attendance.isClaiming}
              className={`w-full p-4 rounded-2xl border flex items-center gap-4 text-left transition-shadow ${
                attendance.alreadyClaimedToday
                  ? "bg-muted border-border"
                  : "bg-gradient-to-r from-primary/15 to-primary/5 border-primary/30 hover:shadow-md"
              }`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                attendance.alreadyClaimedToday ? "bg-muted-foreground/20" : "bg-primary/20"
              }`}>
                {attendance.alreadyClaimedToday ? (
                  <Check className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <Flame className="w-5 h-5 text-primary" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-foreground text-sm">
                  {attendance.alreadyClaimedToday ? "오늘 출석 완료" : "오늘 출석하고 50P 받기"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {attendance.currentStreak > 0
                    ? ` ${attendance.currentStreak}일 연속 출석 중 · 7일마다 +200P / 30일마다 +1,000P`
                    : "매일 들어와서 포인트 받기"}
                </p>
              </div>
              {!attendance.alreadyClaimedToday && (
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              )}
            </button>
          </div>
        )}

        {/* 포인트 더 모으기 섹션 — 출석체크 외 추가 적립 경로 일괄 안내. */}
        <div className="px-4 pt-5">
          <h2 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
            <Coins className="w-4 h-4 text-primary" />
            포인트 더 모으기
          </h2>
          <div className="space-y-2">
            {/* 미니게임 */}
            <button
              onClick={() => navigate('/merge-game')}
              className="w-full p-4 bg-gradient-to-r from-secondary to-accent rounded-2xl border border-border flex items-center gap-4 text-left hover:shadow-md transition-shadow"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                <span className="text-xl">🌸</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-foreground text-sm">꽃 머지 미니게임</p>
                <p className="text-xs text-muted-foreground mt-0.5">게임하고 포인트 받기 · 광고 시청 시 2배</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </button>

            {/* 커뮤니티 글 작성 */}
            <button
              onClick={() => navigate('/community/write')}
              className="w-full p-4 bg-card border border-border rounded-2xl flex items-center gap-4 text-left hover:shadow-md transition-shadow"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                <span className="text-xl">✍️</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-foreground text-sm">커뮤니티 글 작성</p>
                <p className="text-xs text-muted-foreground mt-0.5">첫 게시물·첫 댓글·첫 좋아요 보너스</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </button>

            {/* 친구 초대 */}
            <button
              onClick={() => navigate('/referral')}
              className="w-full p-4 bg-card border border-border rounded-2xl flex items-center gap-4 text-left hover:shadow-md transition-shadow"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                <span className="text-xl">🎁</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-foreground text-sm">친구 초대하기</p>
                <p className="text-xs text-muted-foreground mt-0.5">친구 가입 시 1,000P · 코드 입력자 500P</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </button>
          </div>
        </div>

        {/* Point History */}
        <div className="p-4">
          <h2 className="font-bold text-foreground mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            포인트 내역
          </h2>
          {!user ? (
            <p className="text-sm text-muted-foreground text-center py-8">로그인 후 이용 가능합니다.</p>
          ) : isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            </div>
          ) : transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">아직 적립 내역이 없어요. 게임으로 시작해보세요!</p>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-4 bg-card rounded-xl border border-border">
                  <div>
                    <p className="font-medium text-foreground text-sm">{labelForReason(tx.reason)}</p>
                    <p className="text-xs text-muted-foreground mt-1">{formatDate(tx.created_at)}</p>
                  </div>
                  <p className={`font-bold ${tx.amount > 0 ? "text-primary" : "text-destructive"}`}>
                    {tx.amount > 0 ? "+" : ""}{tx.amount.toLocaleString()}P
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <BottomNav activeTab="/mypage" onTabChange={(href) => navigate(href)} />
    </div>
  );
};

export default Points;
