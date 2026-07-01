import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Ticket, ChevronRight } from "lucide-react";
import { usePartnerDeals } from "@/hooks/usePartnerDeals";
import { useWeddingProfile } from "@/hooks/useWeddingProfile";
import { PERSONA_REC_CATEGORIES } from "@/lib/personaRecommendations";

// 페르소나 추천 카테고리(place 카테고리) → 혜택 카테고리 키(usePartnerDeals 의 category).
// usePartnerDeals 내부 PLACE_TO_DEAL_CAT 과 동일 규칙(그쪽이 비공개라 최소 매핑만 재현).
const REC_TO_DEAL_CAT: Record<string, string> = {
  wedding_hall: "venue",
  studio: "studio",
  dress_shop: "studio",
  makeup_shop: "studio",
  honeymoon: "honeymoon",
};

/**
 * 홈 "나에게 맞는 웨딩 혜택·박람회" 행 — 온라인 박람회(상시 혜택) 진입점.
 * 새 메뉴를 만들지 않고 홈 피드에 페르소나 매칭 큐레이션 행으로 얹는다(IA 결정 260701).
 * - 재사용: usePartnerDeals(이벤트·쿠폰·딜 병합, 승인·활성 게이트) → 전체는 기존 /events.
 * - 개인화: 내 페르소나 추천 카테고리에 해당하는 혜택 + featured/제휴 를 앞으로 정렬.
 * - 빈 신호 폴백: 노출할 혜택이 0건이면 행 자체를 렌더하지 않는다(dead-end·빈 박스 방지).
 */
const HomeExpoDealsRow = () => {
  const navigate = useNavigate();
  const { deals, isLoading } = usePartnerDeals();
  const { personaMode } = useWeddingProfile();

  const ranked = useMemo(() => {
    if (!deals.length) return [];
    // 내 페르소나가 우선하는 혜택 카테고리 집합.
    const personaDealCats = new Set(
      (personaMode ? PERSONA_REC_CATEGORIES[personaMode] ?? [] : []).map(
        (c) => REC_TO_DEAL_CAT[c] ?? c,
      ),
    );
    const score = (d: (typeof deals)[number]): number =>
      (personaDealCats.has(d.category) ? 2 : 0) + (d.is_featured || d.is_partner ? 1 : 0);
    // 원본 불변 — 복사 후 정렬(안정 정렬: score 동률이면 기존 순서 유지).
    return [...deals].sort((a, b) => score(b) - score(a)).slice(0, 8);
  }, [deals, personaMode]);

  if (isLoading || ranked.length === 0) return null; // 빈 신호 → 숨김

  return (
    <section className="px-4 mt-4" aria-label="웨딩 혜택·박람회">
      <button
        type="button"
        onClick={() => navigate("/events")}
        className="flex items-center gap-1 w-full text-left mb-2 min-h-[36px]"
      >
        <Ticket className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-bold text-foreground">나에게 맞는 웨딩 혜택·박람회</h2>
        <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto" />
      </button>
      <div className="flex gap-2.5 overflow-x-auto pb-1 -mx-1 px-1 snap-x">
        {ranked.map((d) => (
          <button
            key={d.id}
            type="button"
            onClick={() => navigate("/events")}
            className="snap-start shrink-0 w-40 text-left rounded-xl border border-border bg-card overflow-hidden"
            aria-label={`${d.partner_name} ${d.title} 혜택 보기`}
          >
            <div className="h-24 bg-muted">
              {d.banner_image_url ? (
                <img
                  src={d.banner_image_url}
                  alt=""
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  <Ticket className="w-6 h-6" />
                </div>
              )}
            </div>
            <div className="p-2.5">
              <p className="text-[11px] text-muted-foreground truncate">{d.partner_name}</p>
              <p className="text-[12px] font-semibold text-foreground line-clamp-2">{d.title}</p>
              {d.discount_info && (
                <p className="text-[11px] text-primary font-bold mt-0.5 truncate">{d.discount_info}</p>
              )}
            </div>
          </button>
        ))}
      </div>
    </section>
  );
};

export default HomeExpoDealsRow;
