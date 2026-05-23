// P18 임신 페르소나용 허니문 안전 가이드 배너.
// 본식 시점 임신 차수에 따라 추천 거리·항공 시간·의료 인프라 가이드를 보여준다.
// 차수별 권장(보수적): 1차 ~ 적당 / 2차 sweet spot / 3차 항공·이동 최소화.
//
// 데이터 출처: 산부인과 권고 — 임신 16~28주(중기) 가 가장 안정. 28주 이후는
// 항공사 동의서·임신 진단서 필요. 36주 이후는 대부분 항공 거부.

import { Plane, Heart, AlertCircle } from "lucide-react";
import { usePersonaInsights } from "@/hooks/usePersonaInsights";

interface SafetyOption {
  label: string;
  flight: string;
  tone: string;
}

const TRIMESTER_GUIDE: Record<string, { headline: string; tone: string; flightLimit: string; options: SafetyOption[]; warnings: string[] }> = {
  first: {
    headline: "임신 초기 — 컨디션 보수적으로",
    tone: "bg-amber-50 border-amber-200 text-amber-900",
    flightLimit: "단거리 권장 (4시간 이내)",
    options: [
      { label: "제주", flight: "1시간", tone: "단거리" },
      { label: "일본 (오사카·후쿠오카)", flight: "1.5~2시간", tone: "단거리" },
      { label: "강원/지방 럭셔리 리조트", flight: "0", tone: "국내 단거리" },
    ],
    warnings: [
      "입덧 시기 — 식사 옵션 다양한 곳",
      "장거리·고지대·풍토병 지역(중동·아프리카) 피해주세요",
      "산부인과 출발 전 진단서 확인",
    ],
  },
  second: {
    headline: "임신 중기 — 가장 안정적 (Sweet Spot)",
    tone: "bg-emerald-50 border-emerald-200 text-emerald-900",
    flightLimit: "중거리까지 (6~8시간)",
    options: [
      { label: "동남아 (발리·푸켓·다낭)", flight: "5~7시간", tone: "중거리" },
      { label: "일본·홍콩·대만", flight: "1.5~3시간", tone: "단거리" },
      { label: "괌·사이판", flight: "4~5시간", tone: "중거리" },
    ],
    warnings: [
      "지카바이러스 위험 지역 회피 (중남미·아프리카 일부)",
      "28주 이후 비행 시 항공사 동의서 필요",
      "여행자 보험에 임신 합병증 포함 확인",
    ],
  },
  third: {
    headline: "임신 후기 — 항공·이동 최소화",
    tone: "bg-rose-50 border-rose-200 text-rose-900",
    flightLimit: "단거리만 (2시간 이내) 또는 본식 후 연기",
    options: [
      { label: "본식 후 연기 (산후 6개월~1년)", flight: "—", tone: "강력 권장" },
      { label: "제주·강원 리조트 (국내)", flight: "0~1시간", tone: "이동 최소" },
      { label: "근거리 일본 (당일치기 가능권)", flight: "1.5~2시간", tone: "단거리" },
    ],
    warnings: [
      "36주 이후 대부분 항공 거부",
      "막달 산부인과 권고 우선",
      "여행 보험 임신 후기 적용 가능 여부 사전 확인",
    ],
  },
};

export default function PregnancyHoneymoonBanner() {
  const insights = usePersonaInsights();
  if (!insights.isLoaded) return null;
  // pregnant 아니면 표시 안 함.
  const trimester = insights.pregnancy.trimesterAtWedding;
  if (!trimester) return null;

  const guide = TRIMESTER_GUIDE[trimester];

  return (
    <section className={`mx-4 mt-3 rounded-2xl border p-4 ${guide.tone}`}>
      <div className="flex items-center gap-1.5 mb-1.5">
        <Heart className="w-4 h-4" />
        <p className="text-[13px] font-bold">{guide.headline}</p>
      </div>
      <div className="flex items-center gap-1.5 text-[12px] mb-2.5">
        <Plane className="w-3 h-3" />
        <span>비행시간: <strong>{guide.flightLimit}</strong></span>
      </div>

      <p className="text-[11px] font-bold mb-1.5 opacity-80">추천 옵션</p>
      <ul className="space-y-1 mb-3">
        {guide.options.map((opt, i) => (
          <li key={i} className="flex items-center justify-between text-[12px]">
            <span>{opt.label}</span>
            <span className="text-[10px] opacity-70">{opt.flight} · {opt.tone}</span>
          </li>
        ))}
      </ul>

      <div className="flex items-start gap-1.5 text-[11px] border-t border-current/15 pt-2 opacity-90">
        <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
        <div>
          <p className="font-bold mb-0.5">주의</p>
          <ul className="space-y-0.5">
            {guide.warnings.map((w, i) => <li key={i}>· {w}</li>)}
          </ul>
        </div>
      </div>
    </section>
  );
}
