import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Copy, Check, Gift, Users, Loader2, Heart } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { useAuth } from "@/contexts/AuthContext";
import { useReferral } from "@/hooks/useReferral";
import { checkReferralMilestones, type ReferralProgress } from "@/lib/referralEvent";
import { toast } from "sonner";

const Referral = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const ref = useReferral();
  const [inputCode, setInputCode] = useState("");
  const [copied, setCopied] = useState(false);
  // 친구추천 하트 이벤트 진행도(초대로 가입한 사용자만). 진입 시 1회 조회 —
  // RPC 가 미션 완료 시 양쪽 하트를 자동 지급하므로 보상 누락도 여기서 복구된다.
  const [progress, setProgress] = useState<ReferralProgress | null>(null);

  useEffect(() => {
    if (!user) navigate("/auth");
  }, [user, navigate]);

  useEffect(() => {
    if (!user) return;
    void checkReferralMilestones().then(setProgress);
  }, [user]);

  const ensureCode = async () => {
    if (ref.myCode) return ref.myCode;
    return await ref.generateMyCode();
  };

  const handleCopy = async () => {
    const code = await ensureCode();
    if (!code) {
      toast.error("코드 생성에 실패했어요");
      return;
    }
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("코드가 복사되었어요");
  };

  const handleShare = async () => {
    const code = await ensureCode();
    if (!code) {
      toast.error("코드 생성에 실패했어요");
      return;
    }
    const url = `https://dewy-wedding.com/auth?ref=${code}`;
    const shareText = `Dewy 웨딩플래너에서 같이 결혼 준비해요!\n\n가입 후 마이페이지에서 제 초대코드 ${code}를 입력하면 500P를 받을 수 있어요.\n\n${url}`;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: "Dewy 친구 초대",
          text: shareText,
          url,
        });
        return;
      } catch (err: any) {
        if (err?.name !== "AbortError") {
          console.error("share failed:", err);
        }
        // 공유 실패 또는 취소 시 폴백
      }
    }
    try {
      await navigator.clipboard.writeText(shareText);
      toast.success("초대 메시지를 복사했어요. 카톡에 붙여넣기 해주세요.", {
        duration: 4000,
      });
    } catch {
      toast.error("복사에 실패했어요. 코드를 길게 눌러 직접 복사해주세요.");
    }
  };

  const handleRedeem = async () => {
    const trimmed = inputCode.trim().toUpperCase();
    if (trimmed.length !== 8) {
      toast.error("8자리 코드를 입력해주세요");
      return;
    }
    const result = await ref.redeemCode(trimmed);
    if (!result) {
      toast.error("처리 중 오류가 발생했어요");
      return;
    }
    if (result.redeemed) {
      toast.success(` ${result.refereeAmount}P 적립! ${result.message}`);
      setInputCode("");
    } else {
      toast.error(result.message);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto relative pb-20">
      <PageHeader title="친구 초대" />

      <main className="px-4 py-4 space-y-4">
        {/* 안내 카드 */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
          <div className="flex items-center gap-2 mb-3">
            <Gift className="w-5 h-5 text-primary" />
            <p className="font-bold text-foreground">친구 초대하고 함께 받기</p>
          </div>
          <ul className="text-sm text-foreground space-y-1.5">
            <li>• 초대 코드를 친구에게 공유하세요</li>
            <li>• 친구가 가입 후 내 코드를 입력하면</li>
            <li>
              <span className="font-bold text-primary">나에게 1,000P</span>,
              <span className="font-bold text-primary"> 친구에게 500P</span> 적립
            </li>
            <li>• 초대 인원은 무제한이에요</li>
          </ul>
        </div>

        {/* 하트 100개 이벤트 안내 */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-rose-100 to-rose-50 border border-rose-200">
          <div className="flex items-center gap-2 mb-2">
            <Heart className="w-5 h-5 fill-rose-500 text-rose-500" />
            <p className="font-bold text-foreground">하트 100개 추가 이벤트</p>
          </div>
          <p className="text-sm text-foreground leading-relaxed">
            초대로 가입한 친구가 <b>① 결혼정보 입력 · ② 커뮤니티 글 1개 · ③ 업체 후기 1개</b>를
            모두 완료하면 <span className="font-bold text-rose-600">초대한 분과 친구 모두에게 하트 100개</span>를 드려요.
          </p>
        </div>

        {/* 초대로 가입한 사용자 — 내 미션 진행도 */}
        {progress?.has_referral && (
          <div className="p-5 rounded-2xl border border-rose-200 bg-card">
            <p className="text-sm font-semibold text-foreground mb-3">
              내 미션 진행 {progress.rewarded && "· 완료 🎉"}
            </p>
            <ul className="space-y-2">
              {([
                ["결혼 정보 입력", progress.wedding_info_done, "/mypage"],
                ["커뮤니티 글 1개 작성", progress.community_done, "/community/write"],
                ["업체 후기 1개 작성", progress.review_done, "/venues"],
              ] as const).map(([label, done, to]) => (
                <li key={label} className="flex items-center justify-between gap-2">
                  <span className={`flex items-center gap-2 text-sm ${done ? "text-foreground" : "text-muted-foreground"}`}>
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${done ? "bg-rose-500 text-white" : "bg-muted text-muted-foreground"}`}>
                      {done ? "✓" : "·"}
                    </span>
                    {label}
                  </span>
                  {!done && (
                    <button onClick={() => navigate(to)} className="text-[12px] font-semibold text-primary">
                      하러 가기 →
                    </button>
                  )}
                </li>
              ))}
            </ul>
            {progress.rewarded ? (
              <p className="text-[12px] text-rose-600 font-semibold mt-3">
                미션 완료! 하트 100개가 지급됐어요 💛
              </p>
            ) : (
              <p className="text-[11px] text-muted-foreground mt-3">
                3가지를 모두 완료하면 초대한 분과 함께 하트 100개씩 받아요.
              </p>
            )}
          </div>
        )}

        {/* 내 코드 카드 */}
        <div className="p-5 rounded-2xl border border-border bg-card">
          <p className="text-sm font-semibold text-foreground mb-3">내 초대 코드</p>
          {ref.isLoading ? (
            <Loader2 className="w-6 h-6 text-primary animate-spin mx-auto" />
          ) : ref.myCode ? (
            <div className="flex items-center gap-2">
              <div className="flex-1 px-4 py-3 rounded-xl bg-muted text-center text-2xl font-bold tracking-widest text-foreground">
                {ref.myCode}
              </div>
              <button
                onClick={handleCopy}
                className="px-4 py-3 bg-primary/10 text-primary rounded-xl text-sm font-medium flex items-center gap-1"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? "복사됨" : "복사"}
              </button>
            </div>
          ) : (
            <button
              onClick={() => ref.generateMyCode()}
              disabled={ref.isWorking}
              className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium text-sm disabled:opacity-50"
            >
              {ref.isWorking ? "생성 중..." : "내 초대 코드 만들기"}
            </button>
          )}

          {ref.myCode && (
            <button
              onClick={handleShare}
              className="w-full mt-3 py-3 bg-card border border-primary/30 text-primary rounded-xl font-medium text-sm"
            >
              초대 메시지 공유하기
            </button>
          )}

          <div className="flex items-center gap-2 mt-4 p-3 rounded-xl bg-muted/50">
            <Users className="w-4 h-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              지금까지 <span className="font-bold text-primary">{ref.invitedCount}명</span> 초대했어요
            </p>
          </div>
        </div>

        {/* 코드 입력 카드 */}
        <div className="p-5 rounded-2xl border border-border bg-card">
          <p className="text-sm font-semibold text-foreground mb-1">친구 초대 코드 입력</p>
          <p className="text-xs text-muted-foreground mb-3">
            {ref.hasRedeemed
              ? "이미 코드를 사용하셨어요. (한 번만 입력 가능)"
              : "친구에게 받은 8자리 코드를 입력하면 500P가 즉시 적립돼요."}
          </p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value.toUpperCase().slice(0, 8))}
              placeholder="ABCD1234"
              maxLength={8}
              disabled={ref.hasRedeemed}
              className="flex-1 px-4 py-3 rounded-xl border border-border bg-background text-center text-lg font-bold tracking-widest text-foreground disabled:opacity-50"
            />
            <button
              onClick={handleRedeem}
              disabled={ref.hasRedeemed || ref.isWorking || inputCode.length !== 8}
              className="px-5 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-medium disabled:opacity-50"
            >
              {ref.isWorking ? <Loader2 className="w-4 h-4 animate-spin" /> : "적용"}
            </button>
          </div>
          {ref.hasRedeemed && ref.redeemedCode && (
            <p className="text-[11px] text-muted-foreground mt-2">
              사용한 코드: {ref.redeemedCode}
            </p>
          )}
        </div>
      </main>
    </div>
  );
};

export default Referral;
