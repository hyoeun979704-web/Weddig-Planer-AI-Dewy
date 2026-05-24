// 부드러운 확인 카드 — v2 §4.3 + §5 (Sensitive Info) 패턴 표준 컴포넌트.
//
// 행동 신호 누적이 임계값에 도달했을 때 사용자에게 "받기 / 지금은 괜찮아요"
// 2지선다를 부드러운 카피로 제시. 객체화 어조 금지 — "..분들을 위한" 어법.
//
// 트리거 가드는 호출 측에서 shouldPromptConfirm() 으로 처리. 본 컴포넌트는
// "노출 결정 후 어떻게 보일지" 만 책임. F#5 — 내부 hidden state 가 onConfirm
// 실패 시 카드를 강제 hide 해 retry 불가하던 회귀 회피: 가시성은 전적으로
// 부모(show prop·conditional 렌더)가 결정.

import { X, Sparkles } from "lucide-react";

export interface SoftConfirmCardProps {
  /** 카드 헤드라인 (1줄). 예: "임신 중에 결혼 준비하시는 분들을 위한 가이드가 있어요" */
  title: string;
  /** 부가 설명 (1~2줄). 받기 시 활성화될 가치 명시. 예: "본식 시점 차수에 맞춰 일정·드레스·신혼여행이 자동으로 맞춰져요" */
  description?: string;
  /** "받기" 버튼 라벨 (기본: "받기"). */
  confirmLabel?: string;
  /** "지금은 괜찮아요" 버튼 라벨 (기본: "지금은 괜찮아요"). */
  declineLabel?: string;
  /** 카드 색조 — 민감도/맥락별로 다르게. neutral/warm/cool 중 택1. */
  tone?: "neutral" | "warm" | "cool";
  /** "받기" 클릭. 호출 측에서 markConfirmed + 실제 flag 활성 처리. */
  onConfirm: () => void;
  /** "지금은 괜찮아요" 또는 X dismiss. 호출 측에서 markDismissed 처리. */
  onDecline: () => void;
}

const TONE_CLS: Record<"neutral" | "warm" | "cool", string> = {
  neutral: "bg-card border-border",
  warm: "bg-pink-50 border-pink-200",
  cool: "bg-sky-50 border-sky-200",
};

export default function SoftConfirmCard({
  title,
  description,
  confirmLabel = "받기",
  declineLabel = "지금은 괜찮아요",
  tone = "neutral",
  onConfirm,
  onDecline,
}: SoftConfirmCardProps) {
  // 내부 hidden state 제거 (F#5). 부모가 onConfirm/onDecline 결과를 보고
  // 가시성을 결정 — 실패 시 카드가 그대로 남아 retry 가능.
  const handleDecline = () => onDecline();
  const handleConfirm = () => onConfirm();

  return (
    <section className={`mx-4 my-3 rounded-2xl border p-3.5 ${TONE_CLS[tone]} relative`}>
      <button
        type="button"
        aria-label="닫기"
        onClick={handleDecline}
        className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center opacity-50 hover:opacity-100"
      >
        <X className="w-3.5 h-3.5" />
      </button>

      <div className="pr-6">
        <div className="flex items-center gap-1.5 mb-1">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <p className="text-[13px] font-bold text-foreground">{title}</p>
        </div>
        {description && (
          <p className="text-[11px] text-muted-foreground leading-snug mb-3">{description}</p>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleConfirm}
            className="flex-1 py-2 rounded-xl bg-primary text-primary-foreground text-[12px] font-bold active:scale-[0.98] transition-transform"
          >
            {confirmLabel}
          </button>
          <button
            type="button"
            onClick={handleDecline}
            className="flex-1 py-2 rounded-xl bg-transparent border border-border text-foreground text-[12px] font-semibold active:scale-[0.98] transition-transform"
          >
            {declineLabel}
          </button>
        </div>
      </div>
    </section>
  );
}
