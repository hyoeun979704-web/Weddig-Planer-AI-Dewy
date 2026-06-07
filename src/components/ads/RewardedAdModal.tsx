import { useEffect, useRef, useState } from "react";
import { ADSENSE_CLIENT, ADSENSE_REWARDED_SLOT } from "@/lib/ads/adService";

// 웹 '포인트 2배' 보상형 대체 모달.
// AdSense 엔 보상형(rewarded) 포맷이 없어, 디스플레이 광고(슬롯 1646713028)를
// 모달로 노출하고 카운트다운 후 '받기'로 보너스를 지급한다.
// ⚠️ AdSense 정책상 '광고 시청/클릭 대가 보상(incentivized)'은 민감 영역 —
//    네이티브는 AdMob 보상형이 정석. 웹은 광고를 '노출'할 뿐 클릭을 유도하지 않는다.
interface Props {
  open: boolean;
  /** rewarded=true: 카운트다운 후 받기 / false: 닫기(보너스 없음). */
  onComplete: (rewarded: boolean) => void;
  /** 상단 제목(용도별로 다름: '포인트 2배' / '한 판 더' 등). */
  title?: string;
  /** 카운트다운 완료 후 보상 버튼 라벨. */
  ctaLabel?: string;
  /** 닫기(보상 없음) 버튼 라벨. */
  closeLabel?: string;
  /** 받기 활성화까지 강제 시청 카운트다운(초). 2배=15, 한 판 더=5 등. */
  countdownSec?: number;
}

const RewardedAdModal = ({
  open,
  onComplete,
  title = "광고 보고 포인트 2배",
  ctaLabel = "포인트 2배 받기",
  closeLabel = "닫기 (보너스 없이)",
  countdownSec = 5,
}: Props) => {
  const [left, setLeft] = useState(countdownSec);
  const pushedRef = useRef(false);

  // 광고 1회 push (모달 열릴 때). 모달이 닫히면(open=false) 언마운트되어 ins 가
  // 사라지므로, 다음에 열릴 때 새 ins 로 다시 push 된다.
  useEffect(() => {
    if (!open) {
      pushedRef.current = false;
      return;
    }
    setLeft(countdownSec); // 열릴 때(또는 초가 바뀔 때) 카운트다운 리셋
    if (!pushedRef.current) {
      pushedRef.current = true;
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
      } catch {
        /* 스크립트 로드 전이면 무시 */
      }
    }
  }, [open, countdownSec]);

  // 카운트다운
  useEffect(() => {
    if (!open || left <= 0) return;
    const t = setTimeout(() => setLeft((l) => l - 1), 1000);
    return () => clearTimeout(t);
  }, [open, left]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[10000] bg-black/70 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl w-full max-w-[360px] p-4 shadow-xl border border-border">
        <p className="text-sm font-bold text-foreground mb-2 text-center">
          {title}
        </p>
        <div style={{ minHeight: 250 }} className="overflow-hidden rounded-lg bg-muted/30">
          <ins
            className="adsbygoogle"
            style={{ display: "block" }}
            data-ad-client={ADSENSE_CLIENT}
            data-ad-slot={ADSENSE_REWARDED_SLOT}
            data-ad-format="auto"
            data-full-width-responsive="true"
          />
        </div>
        <button
          disabled={left > 0}
          onClick={() => onComplete(true)}
          className="mt-3 w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-medium disabled:opacity-50"
        >
          {left > 0 ? `${left}초 후 ${ctaLabel}` : ctaLabel}
        </button>
        <button
          onClick={() => onComplete(false)}
          className="mt-2 w-full py-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          {closeLabel}
        </button>
      </div>
    </div>
  );
};

export default RewardedAdModal;
