// 식장 anchor 컨텍스트 배너 — 다른 카테고리(스튜디오/드레스/메이크업/한복) 페이지에서
// "이 식장 기준으로 추천중" 가시화. v2 §6 위치 전략: 사용자가 명시 등록한 anchor 를
// 매번 인지하게 해 추천 결과에 대한 신뢰·맥락 확보.
//
// 노출 조건: venue.isSet=true. 미등록 사용자에겐 다른 가이드(JIT 위치 카드 등) 표시.

import { MapPin, X } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWeddingVenue } from "@/hooks/useWeddingVenue";

const DISMISS_KEY = "dewy:venue-anchor-banner-dismissed";

export default function VenueAnchorBanner() {
  const navigate = useNavigate();
  const venue = useWeddingVenue();
  // 사용자가 X 누르면 페이지 단위로 숨김 — 같은 정보 N회 노출 피로 회피.
  // 7일 cooldown — 그 후 자연스럽게 다시 노출.
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try {
      const at = localStorage.getItem(DISMISS_KEY);
      if (!at) return false;
      const ms = Number(at);
      if (Number.isFinite(ms) && Date.now() - ms < 7 * 24 * 60 * 60 * 1000) return true;
    } catch {
      /* ignore */
    }
    return false;
  });

  if (!venue.isSet || dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
  };

  return (
    <section className="mx-4 mt-3 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2.5 flex items-center gap-2 relative">
      <MapPin className="w-4 h-4 text-emerald-700 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-bold text-emerald-900 truncate">
          {venue.shortLabel} 기준 추천중
        </p>
        <p className="text-[10px] text-emerald-700 leading-snug">
          같은 시·시군구 업체를 우선 보여드려요.
        </p>
      </div>
      <button
        type="button"
        onClick={() => navigate("/venues")}
        className="shrink-0 px-2 py-1 rounded-full bg-white/80 border border-emerald-200 text-[10px] font-bold text-emerald-800"
      >
        바꾸기
      </button>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="배너 닫기"
        className="shrink-0 w-5 h-5 flex items-center justify-center opacity-50 hover:opacity-100"
      >
        <X className="w-3 h-3" />
      </button>
    </section>
  );
}
