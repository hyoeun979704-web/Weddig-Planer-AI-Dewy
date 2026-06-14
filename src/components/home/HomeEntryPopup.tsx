import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { useAuth } from "@/contexts/AuthContext";
import { useEntryPopup } from "@/hooks/useEntryPopup";

export const HOME_POPUP_DISMISS_KEY = "dewy.home_entry_popup_dismissed_until";

const tomorrowMidnightISO = (from: Date = new Date()) => {
  const next = new Date(from);
  next.setHours(24, 0, 0, 0);
  return next.toISOString();
};

// 오늘로부터 7일 뒤 자정 — "일주일 보지 않기".
const weekLaterMidnightISO = (from: Date = new Date()) => {
  const next = new Date(from);
  next.setDate(next.getDate() + 7);
  next.setHours(0, 0, 0, 0);
  return next.toISOString();
};

interface Props {
  /** 첫 실행 시퀀스가 제어 — 열림 여부 */
  open: boolean;
  /** 닫힘(건너뛰기 포함) 시 다음 단계로 진행 */
  onClose: () => void;
}

// 이벤트/혜택 안내 모달. 운영자가 어드민(promotional_events.show_as_popup)에서 지정한
// 팝업이 있으면 그 콘텐츠(배지·제목·본문·이미지·CTA)를 노출하고, 없으면 기본 팝업
// (비로그인=가입 혜택 / 로그인=진행 이벤트)으로 폴백한다. 노출 순서/타이밍은 홈 첫 실행
// 시퀀스가 제어하며, "오늘 하루/일주일 보지 않기"로 기간 단위 스킵을 기록한다.
const HomeEntryPopup = ({ open, onClose }: Props) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { popup } = useEntryPopup();

  const handleOpenChange = (next: boolean) => {
    if (!next) onClose();
  };

  const dismissUntil = (iso: string) => {
    try {
      localStorage.setItem(HOME_POPUP_DISMISS_KEY, iso);
    } catch {
      // best effort
    }
    onClose();
  };

  // 운영자 지정 팝업이 있으면 그 콘텐츠, 없으면 기존 기본 카피로 폴백.
  const badge = popup?.badgeLabel ?? (user ? "이벤트" : "신규 가입 한정");
  const title = popup?.title ?? (user ? "진행 중인 이벤트를\n확인해보세요" : "지금 가입하면\nPremium 1달 무료");
  const sub =
    popup?.subtitle ??
    (user
      ? "출석·초대·후기로 받는 포인트와 하트 혜택을 모아뒀어요"
      : "AI 플래너 무제한 · 예산 분석 PDF\n결혼 스타일별 맞춤 가이드까지");
  const ctaLabel = popup?.ctaLabel ?? (user ? "이벤트 보러가기" : "지금 시작하기");
  const ctaPath = popup?.ctaPath ?? (user ? "/events" : "/auth");
  const imageUrl = popup?.imageUrl ?? null;

  const handleCTA = () => {
    onClose();
    navigate(ctaPath);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="w-[92vw] max-w-[420px] p-0 overflow-hidden rounded-3xl gap-0 border-0 shadow-2xl"
        // Radix가 기본 X 버튼을 자동 렌더 — 우리 영역과 시각 충돌 없도록 유지
      >
        <VisuallyHidden asChild>
          <DialogTitle>{popup?.title ?? "Premium 1달 무료 가입 안내"}</DialogTitle>
        </VisuallyHidden>
        <VisuallyHidden asChild>
          <DialogDescription>
            {popup?.subtitle ?? "신규 가입 시 AI 플래너, 예산 분석 PDF, 맞춤 가이드 제공"}
          </DialogDescription>
        </VisuallyHidden>

        {/* Hero — 운영자가 이미지를 넣으면 큰 비주얼, 없으면 브랜드 그라데이션 */}
        {imageUrl ? (
          <div className="relative w-full aspect-[16/10] bg-muted overflow-hidden">
            <img
              src={imageUrl}
              alt={title}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
            <span className="absolute top-3 left-3 inline-flex items-center px-2.5 py-1 rounded-full bg-white/90 text-[11px] font-bold text-primary shadow-sm">
              {badge}
            </span>
          </div>
        ) : (
          <div
            className="px-6 pt-12 pb-8 flex flex-col items-center"
            style={{
              background: "linear-gradient(135deg, #FFD4DC 0%, #F69BAA 60%, #E04562 110%)",
            }}
          >
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-white/85 text-[12px] font-bold text-primary">
              {badge}
            </span>
          </div>
        )}

        {/* Body */}
        <div className="px-7 pt-6 pb-5 flex flex-col items-center text-center">
          <h2 className="text-[22px] font-extrabold text-foreground leading-snug whitespace-pre-line">
            {title}
          </h2>
          <p className="mt-2.5 text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
            {sub}
          </p>
          <button
            onClick={handleCTA}
            className="mt-6 w-full min-h-[52px] rounded-2xl bg-primary text-primary-foreground font-bold text-base active:scale-[0.98] transition-transform"
          >
            {ctaLabel}
          </button>
        </div>

        {/* Footer — 기간 단위 스킵 */}
        <div className="px-5 py-3 flex items-center justify-between border-t border-border/60 text-[12px]">
          <button
            onClick={() => dismissUntil(tomorrowMidnightISO())}
            className="font-medium text-muted-foreground hover:text-foreground"
          >
            오늘 하루 보지 않기
          </button>
          <button
            onClick={() => dismissUntil(weekLaterMidnightISO())}
            className="font-medium text-muted-foreground hover:text-foreground"
          >
            일주일 보지 않기
          </button>
          <button
            onClick={onClose}
            className="font-semibold text-muted-foreground"
          >
            닫기
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default HomeEntryPopup;
