import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { distanceKm } from "@/hooks/useWeddingVenue";

/**
 * 벤더 상세 페이지의 "필터 기반" 추천.
 *
 *  · similar : 같은 카테고리 + 같은 지역(시/도) — "비슷한 업체"
 *  · nearby  : 좌표 bounding box 안의 *다른* 카테고리, 카테고리 중복 없이 1곳씩
 *              — "이 근처 다른 준비". 좌표 없으면 같은 시/도로 폴백.
 *
 * 협업필터링(행동 로그) 대신 카테고리·지역·좌표 매칭만 쓰므로 추가 데이터 의존이
 * 없고, 무한스크롤 메인 쿼리를 건드리지 않는 소량 bounded 쿼리다.
 */

const COLS =
  "place_id,name,city,district,category,lat,lng,main_image_url,avg_rating,review_count,is_partner,min_price,tags";

export interface RecPlace {
  place_id: string;
  name: string;
  city: string | null;
  district: string | null;
  category: string;
  lat: number | null;
  lng: number | null;
  main_image_url: string | null;
  avg_rating: number | null;
  review_count: number | null;
  is_partner: boolean | null;
  min_price: number | null;
  tags: string[] | null;
  /** nearby 항목에만 채워짐 (km) */
  distance_km?: number | null;
}

export interface RecAnchor {
  id: string;
  category: string;
  city: string | null;
  district: string | null;
  latitude: number | null;
  longitude: number | null;
}

const SIMILAR_LIMIT = 12;
// pool 은 box 안에서 임의(PK) 순으로 받으므로, 밀집 지역에서 카테고리 누락이
// 없도록 넉넉히. 받은 뒤 거리순 정렬 → 카테고리당 1곳으로 줄인다.
const NEARBY_POOL = 150;
const NEARBY_LIMIT = 8;
/** 근처 bounding box 반경 ~9km (위도 1°≈111km). 너무 좁으면 지방은 0건. */
const BOX_DEG = 0.08;

async function fetchSimilar(a: RecAnchor): Promise<RecPlace[]> {
  let q = supabase
    .from("places")
    .select(COLS)
    .eq("is_active", true)
    .eq("category", a.category)
    .neq("place_id", a.id)
    .order("is_partner", { ascending: false })
    .order("avg_rating", { ascending: false, nullsFirst: false })
    .limit(SIMILAR_LIMIT);
  if (a.city) q = q.eq("city", a.city);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as RecPlace[];
}

async function fetchNearby(a: RecAnchor): Promise<RecPlace[]> {
  const hasCoords = a.latitude != null && a.longitude != null;
  let rows: RecPlace[] = [];

  if (hasCoords) {
    const lat = a.latitude as number;
    const lng = a.longitude as number;
    const { data, error } = await supabase
      .from("places")
      .select(COLS)
      .eq("is_active", true)
      .neq("category", a.category)
      .neq("place_id", a.id)
      .gte("lat", lat - BOX_DEG)
      .lte("lat", lat + BOX_DEG)
      .gte("lng", lng - BOX_DEG)
      .lte("lng", lng + BOX_DEG)
      .limit(NEARBY_POOL);
    if (error) throw error;
    rows = ((data ?? []) as RecPlace[])
      .map((r) => ({ ...r, distance_km: distanceKm(lat, lng, r.lat, r.lng) }))
      .filter((r) => r.distance_km != null)
      .sort((x, y) => (x.distance_km as number) - (y.distance_km as number));
  } else if (a.city) {
    // 좌표 없으면 같은 시/도의 다른 카테고리로 폴백 (거리 배지는 생략).
    const { data, error } = await supabase
      .from("places")
      .select(COLS)
      .eq("is_active", true)
      .neq("category", a.category)
      .neq("place_id", a.id)
      .eq("city", a.city)
      .order("is_partner", { ascending: false })
      .order("avg_rating", { ascending: false, nullsFirst: false })
      .limit(NEARBY_POOL);
    if (error) throw error;
    rows = (data ?? []) as RecPlace[];
  }

  // 카테고리 중복 없이 — 카테고리당 1곳(가장 가까운/상위)만. 다양성 확보.
  const seen = new Set<string>();
  const out: RecPlace[] = [];
  for (const r of rows) {
    if (seen.has(r.category)) continue;
    seen.add(r.category);
    out.push(r);
    if (out.length >= NEARBY_LIMIT) break;
  }
  return out;
}

export function usePlaceRecommendations(anchor: RecAnchor | null) {
  return useQuery({
    queryKey: [
      "place-recs",
      anchor?.id,
      anchor?.category,
      anchor?.city,
      anchor?.latitude,
      anchor?.longitude,
    ],
    enabled: !!anchor?.id,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const a = anchor as RecAnchor;
      const [similar, nearby] = await Promise.all([
        fetchSimilar(a),
        fetchNearby(a),
      ]);
      return { similar, nearby };
    },
  });
}
