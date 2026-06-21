import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { useWeddingSchedule } from "@/hooks/useWeddingSchedule";
import { usePersonaInsights } from "@/hooks/usePersonaInsights";
import { usePersonaRows } from "@/hooks/usePersonaRows";
import { Skeleton } from "@/components/ui/skeleton";
import VendorMediaCard, { CARD_W, CARD_H, vendorToCardData } from "./VendorMediaCard";

const CardSkeleton = () => (
  <Skeleton className="flex-shrink-0 rounded-[10px]" style={{ width: CARD_W, height: CARD_H }} />
);

// 홈 "맞춤 추천" — 페르소나별 카테고리 순서로 쌓는 가로 스크롤 행 스택(Netflix식).
// 기존 단일 추천 행(RecommendedSection)을 대체한다. 카드/지역 큐레이션/제외 카테고리
// 로직은 그대로 재사용하고, 카테고리별 행으로 쪼개 관련성을 높였다.
const PersonaRecommendationRows = () => {
  const navigate = useNavigate();
  const { weddingSettings } = useWeddingSchedule();
  const { personaMode, personaLabel } = usePersonaInsights();
  // 큐레이션: 예식 지역 우선 정렬 + 사용자가 숨긴 카테고리 제외(설정값 재사용).
  const region = weddingSettings.wedding_region;
  const excluded = new Set(weddingSettings.excluded_categories ?? []);
  const { rows, isLoading } = usePersonaRows(personaMode, region, excluded);

  // 로딩이 끝났는데 보여줄 행이 하나도 없으면 섹션 전체를 숨긴다(빈 영역 방지).
  if (!isLoading && rows.length === 0) return null;

  return (
    <section className="pt-[10px] pb-[20px] bg-[hsl(var(--pink-100))]">
      <div className="px-[20px] mb-[10px]">
        <h2 className="text-[16px] font-bold text-black">{personaLabel} 맞춤 추천</h2>
        <p className="text-[11px] text-black/55 mt-0.5">
          {region ? `${region} 지역을 우선해 골랐어요` : "예식 지역을 설정하면 내 지역 업체로 좁혀드려요"}
        </p>
      </div>

      {isLoading ? (
        <div className="flex gap-[8px] overflow-x-auto scrollbar-hide px-[20px]">
          {Array.from({ length: 4 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="space-y-[16px]">
          {rows.map((row) => (
            <div key={row.slug}>
              <button
                type="button"
                onClick={() => navigate(row.listPath)}
                className="w-full px-[20px] mb-[8px] flex items-center justify-between"
              >
                <span className="text-[14px] font-bold text-black">{row.title}</span>
                <span className="flex items-center text-[11px] font-medium text-black/45">
                  더보기
                  <ChevronRight className="w-3 h-3" />
                </span>
              </button>
              <div className="flex gap-[8px] overflow-x-auto scrollbar-hide px-[20px]">
                {row.vendors.map((vendor) => (
                  <VendorMediaCard
                    key={vendor.vendor_id}
                    data={vendorToCardData(vendor)}
                    onClick={() => navigate(`/vendor/${vendor.vendor_id}`)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default PersonaRecommendationRows;
