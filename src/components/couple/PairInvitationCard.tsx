import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCoupleLink } from "@/hooks/useCoupleLink";
import chevronRightIcon from "@/assets/icons/chevron-right.svg";

/**
 * Pair-onboarding nudge for users who don't have a couple link yet.
 *
 * Lives in the same Schedule slot as <PairedDecisionsWidget> — they're
 * mutually exclusive (linked → decisions widget; unlinked → invitation
 * card). The card pitches the concrete value the user unlocks the
 * moment they connect, not generic "함께해요" copy:
 *   - 둘 다 좋아한 항목 자동 표시
 *   - 의견 갈리는 결정 한눈에
 *   - 일정·예산을 함께 관리
 *
 * Tap → MyPage where the existing CoupleInvite flow lives. Logged-out
 * users get nothing (the page already has its own LoginRequiredOverlay).
 */
const PairInvitationCard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isLinked, isLoading } = useCoupleLink();

  if (!user || isLoading || isLinked) return null;

  return (
    <button
      onClick={() => navigate("/mypage")}
      className="w-full flex items-center gap-3 px-4 py-3.5 bg-white rounded-2xl border border-primary/20 text-left active:scale-[0.99] transition-transform"
      aria-label="파트너 연결하고 페어 기능 사용하기"
    >
      <div className="w-10 h-10 rounded-xl bg-[hsl(var(--pink-100))] flex items-center justify-center shrink-0 relative">
        <span className="text-base">💕</span>
        {/* Two-dot motif echoing the couple-favorited indicator. */}
        <span
          aria-hidden
          className="absolute -bottom-0.5 -right-0.5 flex -space-x-1"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-primary ring-2 ring-white" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#7BB6E0] ring-2 ring-white" />
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-bold text-foreground">파트너 연결하고 함께 준비하기</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          둘 다 찜한 항목 · 의견 갈리는 결정 · 일정 동기화가 자동으로
        </p>
      </div>

      <img src={chevronRightIcon} alt="" className="w-1.5 h-[9px] shrink-0" />
    </button>
  );
};

export default PairInvitationCard;
