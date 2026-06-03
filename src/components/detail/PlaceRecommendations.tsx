import { useNavigate } from "react-router-dom";
import VendorMediaCard, {
  CARD_W,
  CARD_H,
  type VendorMediaCardData,
} from "@/components/home/VendorMediaCard";
import { PLACE_CATEGORY_TO_ITEM_TYPE } from "@/lib/placeMappers";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceKm } from "@/hooks/useWeddingVenue";
import { useWeddingSchedule } from "@/hooks/useWeddingSchedule";
import { recommendationCopy } from "@/lib/recommendationCopy";
import {
  usePlaceRecommendations,
  type RecAnchor,
  type RecPlace,
} from "@/hooks/usePlaceRecommendations";

// DB category(단수) → 한글 라벨. weddingStyle.CATEGORY_LABELS 가 jewelry 를
// 안 갖고 있어 추천 표시용으로 전 카테고리를 덮는 로컬 맵을 둔다.
const CATEGORY_LABEL: Record<string, string> = {
  wedding_hall: "웨딩홀",
  studio: "스튜디오",
  dress_shop: "드레스",
  makeup_shop: "메이크업",
  hanbok: "한복",
  tailor_shop: "예복",
  honeymoon: "허니문",
  appliance: "혼수가전",
  jewelry: "주얼리",
  invitation_venue: "청첩장",
};
const labelOf = (c: string) => CATEGORY_LABEL[c] ?? c;

function toCard(
  r: RecPlace,
  opts: { showCategory: boolean; showDistance: boolean },
): VendorMediaCardData {
  const region = [r.city, r.district].filter(Boolean).join(" ") || null;
  return {
    id: r.place_id,
    thumbnail_url: r.main_image_url,
    region,
    name: r.name,
    category: opts.showCategory ? labelOf(r.category) : null,
    distanceLabel:
      opts.showDistance && r.distance_km != null
        ? formatDistanceKm(r.distance_km)
        : null,
    is_partner: r.is_partner ?? false,
    info_lines: [],
    item_type: PLACE_CATEGORY_TO_ITEM_TYPE[r.category],
  };
}

interface RowProps {
  title: string;
  hint: string;
  items: RecPlace[];
  loading: boolean;
  showCategory: boolean;
  showDistance: boolean;
  onOpen: (id: string) => void;
}

const Row = ({
  title,
  hint,
  items,
  loading,
  showCategory,
  showDistance,
  onOpen,
}: RowProps) => (
  <section className="pt-4 pb-1">
    <div className="px-4 mb-2">
      <h2 className="text-[15px] font-bold text-foreground">{title}</h2>
      <p className="text-[11px] text-muted-foreground mt-0.5">{hint}</p>
    </div>
    <div className="flex gap-2 overflow-x-auto scrollbar-hide px-4">
      {loading
        ? Array.from({ length: 4 }).map((_, i) => (
            <Skeleton
              key={i}
              className="flex-shrink-0 rounded-[10px]"
              style={{ width: CARD_W, height: CARD_H }}
            />
          ))
        : items.map((r) => (
            <VendorMediaCard
              key={r.place_id}
              data={toCard(r, { showCategory, showDistance })}
              onClick={() => onOpen(r.place_id)}
            />
          ))}
    </div>
  </section>
);

export default function PlaceRecommendations({ place }: { place: RecAnchor }) {
  const navigate = useNavigate();
  const { weddingSettings } = useWeddingSchedule();
  const copy = recommendationCopy(weddingSettings.persona_mode);
  const { data, isLoading } = usePlaceRecommendations(place);
  const similar = data?.similar ?? [];
  const nearby = data?.nearby ?? [];

  // 둘 다 비면 섹션 자체를 숨김(빈 영역 방지).
  if (!isLoading && similar.length === 0 && nearby.length === 0) return null;

  // 상세 화면에서 같은 업체로 다시 들어가면 추천도 새 앵커로 갱신되도록 스크롤 상단.
  const open = (id: string) => {
    navigate(`/vendor/${id}`);
    window.scrollTo({ top: 0 });
  };

  return (
    <div className="border-t border-border mt-2">
      {(isLoading || similar.length > 0) && (
        <Row
          title={`비슷한 ${labelOf(place.category)}`}
          hint={copy.similarHint}
          items={similar}
          loading={isLoading}
          showCategory={false}
          showDistance={false}
          onOpen={open}
        />
      )}
      {(isLoading || nearby.length > 0) && (
        <Row
          title="이 근처 다른 준비"
          hint={copy.nearbyHint}
          items={nearby}
          loading={isLoading}
          showCategory
          showDistance
          onOpen={open}
        />
      )}
    </div>
  );
}
