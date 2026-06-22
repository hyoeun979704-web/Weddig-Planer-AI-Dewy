import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, ChevronRight, X } from "lucide-react";
import { usePersonaInsights } from "@/hooks/usePersonaInsights";
import { useWeddingRecap } from "@/hooks/useWeddingRecap";
import { safeLocalStorage } from "@/lib/safeLocalStorage";

interface Milestone {
  key: string;
  match: (days: number) => boolean;
  body: string;
}

// 마일스톤 윈도우(겹치지 않게). 헤드라인은 실제 D-day 로 동적 생성하므로(아래) 부정확한
// "100일" 표기가 생기지 않는다. 각 윈도우는 한 번 닫으면 그 구간 동안 다시 뜨지 않고,
// 다음 구간으로 넘어가면 새 카드가 다시 등장(D-100 → D-30 → D-7 → 결혼 후).
const MILESTONES: Milestone[] = [
  { key: "post", match: (d) => d <= 0 && d >= -60, body: "결혼을 축하해요! 우리 준비 여정을 한 번 돌아볼까요?" },
  { key: "d7", match: (d) => d >= 1 && d <= 7, body: "마지막 일주일이에요. 지금까지의 준비를 돌아보세요." },
  { key: "d30", match: (d) => d >= 8 && d <= 30, body: "결혼식이 한 달 앞으로! 지금까지 준비한 것들을 돌아볼까요?" },
  { key: "d100", match: (d) => d >= 31 && d <= 100, body: "100일 즈음이에요. 지금까지의 준비를 돌아볼까요?" },
];

const dismissKey = (k: string) => `dewy.recapMilestone.dismissed.${k}`;

/**
 * I9 — "결혼 준비 돌아보기" 마일스톤 자동노출. 온보딩을 마치고 돌아볼 실데이터가 있는
 * 사용자에게, 결혼식 D-100/D-30/D-7·결혼 후 시점에 회고 진입 카드를 홈에 띄운다.
 * 구간별로 닫을 수 있고(닫으면 그 구간 재노출 안 함), 데이터가 없으면 뜨지 않는다(빈 회고 방지).
 */
const RecapMilestoneCard = () => {
  const navigate = useNavigate();
  const { daysUntilWedding, hasOnboarded } = usePersonaInsights();
  const recap = useWeddingRecap();
  // 닫기 후 재렌더 트리거용(닫힘 상태는 safeLocalStorage 가 진짜 소스 — 로드 타이밍 무관하게 정확).
  const [, force] = useState(0);

  const milestone =
    daysUntilWedding === null ? null : MILESTONES.find((m) => m.match(daysUntilWedding)) ?? null;
  const isDismissed = milestone ? safeLocalStorage.getItem(dismissKey(milestone.key)) === "1" : false;

  // 온보딩 전 · 마일스톤 구간 밖 · 데이터 부족(빈 회고) · 닫음 → 숨김.
  if (!hasOnboarded || !milestone || !recap.isLoaded || !recap.hasAny || isDismissed) return null;

  const dismiss = () => {
    safeLocalStorage.setItem(dismissKey(milestone.key), "1");
    force((n) => n + 1);
  };

  const headline =
    daysUntilWedding !== null && daysUntilWedding < 0
      ? "결혼을 진심으로 축하해요"
      : `결혼식이 ${daysUntilWedding}일 남았어요`;

  return (
    <section className="px-5 pt-3">
      <div
        className="relative rounded-2xl p-4 text-white overflow-hidden"
        style={{ background: "linear-gradient(135deg,#7c3aed 0%,#db2777 100%)" }}
      >
        <button onClick={dismiss} aria-label="닫기" className="absolute top-2.5 right-2.5 p-1 text-white/70">
          <X className="w-4 h-4" />
        </button>
        <div className="flex items-start gap-3 pr-5">
          <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-[18px] h-[18px]" />
          </div>
          <div className="min-w-0">
            <h3 className="text-[15px] font-bold">{headline}</h3>
            <p className="text-[12px] text-white/85 mt-0.5">{milestone.body}</p>
            <button
              onClick={() => navigate("/wrapped")}
              className="mt-2.5 inline-flex items-center gap-0.5 text-[13px] font-bold bg-white/95 text-[#7c2d8f] rounded-full px-3.5 py-1.5 active:scale-95 transition"
            >
              결혼 준비 돌아보기
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default RecapMilestoneCard;
