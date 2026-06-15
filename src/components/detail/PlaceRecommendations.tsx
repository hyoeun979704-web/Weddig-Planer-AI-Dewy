import { useNavigate } from "react-router-dom";
import VendorMediaCard, {
  CARD_W,
  CARD_H,
  type VendorMediaCardData,
} from "@/components/home/VendorMediaCard";
import { PLACE_CATEGORY_TO_ITEM_TYPE, joinRegion } from "@/lib/placeMappers";
import { PLACE_CATEGORY_LABEL } from "@/lib/categoryLabels";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceKm } from "@/hooks/useWeddingVenue";
import {
  usePlaceRecommendations,
  type RecAnchor,
  type RecPlace,
} from "@/hooks/usePlaceRecommendations";

// DB category(단수) → 한글 라벨. 추천·태그 검색 공용 단일 소스(categoryLabels).
const labelOf = (c: string) => PLACE_CATEGORY_LABEL[c] ?? c;

function toCard(
  r: RecPlace,
  opts: { showCategory: boolean; showDistance: boolean },
): VendorMediaCardData {
  const region = joinRegion(r.city, r.district);
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
  items: RecPlace[];
  loading: boolean;
  showCategory: boolean;
  showDistance: boolean;
  onOpen: (id: string) => void;
}

const Row = ({
  title,
  items,
  loading,
  showCategory,
  showDistance,
  onOpen,
}: RowProps) => (
  <section className="pt-4 pb-1">
    <h2 className="px-4 mb-2 text-[15px] font-bold text-foreground">{title}</h2>
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
  const { data, isLoading } = usePlaceRecommendations(place);
  // 파트너 등급 최우선 노출(이달의 베프 2 > 프렌즈 1 > 일반 0) — 초기 파트너
  // 약속(혜택 4). stable sort 라 같은 등급 내부의 기존 순서(거리/평점)는 유지된다.
  const partnerFirst = (arr: RecPlace[]) =>
    [...arr].sort((a, b) => (b.partner_rank ?? 0) - (a.partner_rank ?? 0));
  const similar = partnerFirst(data?.similar ?? []);
  const nearby = partnerFirst(data?.nearby ?? []);

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
          title="여기도 마음에 드실 거예요"
          items={similar}
          loading={isLoading}
          showCategory={false}
          showDistance={false}
          onOpen={open}
        />
      )}
      {(isLoading || nearby.length > 0) && (
        <Row
          title="추천 업체"
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
