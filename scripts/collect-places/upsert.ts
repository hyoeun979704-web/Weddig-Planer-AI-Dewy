import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { CollectedPlace } from "./types";
import type { CategorySlug } from "./utils/categories";

interface SupabaseEnv {
  url: string;
  serviceRoleKey: string;
}

interface UpsertResult {
  inserted: number;
  failed: number;
}

// Tables that hold category-specific card columns (1:1 with places).
const CATEGORY_TABLE: Record<CategorySlug, string> = {
  wedding_hall: "place_wedding_halls",
  studio: "place_studios",
  dress_shop: "place_dress_shops",
  makeup_shop: "place_makeup_shops",
  hanbok: "place_hanboks",
  tailor_shop: "place_tailor_shops",
  honeymoon: "place_honeymoons",
  appliance: "place_appliances",
  invitation_venue: "place_invitation_venues",
  planner: "place_planners",
};

// Keyword bank for category-specific array columns.
// We match against tags + atmosphere; output is a deduped subset.
const STYLE_KEYWORDS: Record<CategorySlug, Record<string, string[]>> = {
  wedding_hall: {
    hall_styles: ["호텔", "컨벤션", "하우스", "채플", "야외", "가든", "클래식", "모던", "한옥"],
    meal_types: ["뷔페", "코스", "한식", "양식", "중식", "일식"],
  },
  studio: {
    shoot_styles: ["야외", "한옥", "실내", "본식", "리허설", "스냅", "스튜디오", "빈티지", "내추럴"],
  },
  dress_shop: {
    dress_styles: ["머메이드", "미니", "볼가운", "에이라인", "프린세스", "로맨틱", "빈티지", "모던", "심플"],
  },
  makeup_shop: {
    makeup_styles: ["내추럴", "글램", "로맨틱", "모던", "청순", "리허설"],
  },
  hanbok: {
    hanbok_types: ["혼주", "신부", "신랑", "폐백", "어머님", "아버님", "맞춤", "대여"],
  },
  tailor_shop: {
    suit_styles: ["턱시도", "정장", "모닝", "클래식", "모던", "슬림핏", "쓰리피스"],
  },
  honeymoon: {
    destinations: [
      "유럽", "발리", "몰디브", "하와이", "태국", "베트남", "일본", "괌", "사이판", "스위스", "이탈리아", "프랑스",
    ],
  },
  appliance: {
    product_categories: ["TV", "냉장고", "세탁기", "에어컨", "가구", "침대", "소파", "건조기"],
  },
  invitation_venue: {
    venue_types: ["한식", "일식", "중식", "양식", "룸", "프라이빗", "이탈리안", "코스"],
  },
  planner: {
    service_packages: ["종합", "부분", "데이오브", "컨설팅", "하드캐리"],
  },
};

function pickKeywords(haystack: string[], needles: string[]): string[] {
  const found = new Set<string>();
  for (const h of haystack) {
    for (const n of needles) {
      if (h.includes(n)) found.add(n);
    }
  }
  return Array.from(found);
}

function pricePerPerson(p: CollectedPlace): number | null {
  return p.avg_price_estimate?.min ?? p.min_price ?? null;
}

function placeRow(p: CollectedPlace) {
  return {
    name: p.name,
    category: p.category,
    city: p.city,
    district: p.district,
    description: p.description,
    main_image_url: p.main_image_url,
    tags: p.tags,
    lat: p.lat,
    lng: p.lng,
    data_source: p.data_source,
    confidence: p.confidence,
    last_source_date: p.last_source_date,
    source_refs: p.source_refs,
    min_price: pricePerPerson(p),
    is_active: true,
  };
}

function detailsRow(placeId: string, p: CollectedPlace) {
  // Skip the row entirely only when the analyzer produced nothing AND there is
  // no Naver Local metadata to record either — otherwise we still want a stub
  // with tel/address/naver_place_url so detail pages have something to show.
  const hasAnalysis =
    p.summary ||
    (p.atmosphere && p.atmosphere.length > 0) ||
    (p.pros && p.pros.length > 0) ||
    (p.cons && p.cons.length > 0);
  const hasMeta = !!(p.tel || p.road_address || p.naver_place_url);
  if (!hasAnalysis && !hasMeta) return null;

  // Top 3 pros become Special Point cards (VenueInfoTab carousel).
  // We don't have separate copy for content, so each card uses the pro phrase
  // as the title and leaves content null until a follow-up enrichment step.
  const pros = p.pros ?? [];
  const advantages: Record<string, string | null> = {};
  for (let i = 0; i < 3; i++) {
    advantages[`advantage_${i + 1}_title`] = pros[i] ?? null;
    advantages[`advantage_${i + 1}_content`] = null;
  }

  // place_details has separate parking_capacity (number) and parking_location
  // (string) columns but no boolean flag. Synthesize a human-readable string
  // from the analyzer's parking_available + valet_parking + capacity so the
  // detail page has something to render.
  const parkingParts: string[] = [];
  if (p.parking_capacity != null) parkingParts.push(`${p.parking_capacity}대`);
  if (p.parking_available === true) parkingParts.push("주차 가능");
  if (p.valet_parking === true) parkingParts.push("발레파킹");
  const parkingLocation = parkingParts.length > 0 ? parkingParts.join(" · ") : null;

  return {
    place_id: placeId,
    summary: p.summary ?? null,
    atmosphere: p.atmosphere ?? [],
    pros: p.pros ?? [],
    cons: p.cons ?? [],
    hidden_costs: p.hidden_costs ?? [],
    recommended_for: p.recommended_for ?? [],
    analyzed_at: p.analyzed_at ?? null,
    tel: p.tel ?? null,
    address: p.road_address ?? null,
    naver_place_url: p.naver_place_url ?? null,
    parking_capacity: p.parking_capacity ?? null,
    parking_location: parkingLocation,
    subway_station: p.subway_station ?? null,
    subway_line: p.subway_line ?? null,
    walk_minutes: p.walk_minutes ?? null,
    shuttle_bus_available: p.shuttle_bus_available ?? null,
    ...advantages,
  };
}

function categoryRow(placeId: string, p: CollectedPlace) {
  const price = pricePerPerson(p);
  const haystack = [...(p.tags ?? []), ...(p.atmosphere ?? [])];
  const styles = STYLE_KEYWORDS[p.category] ?? {};

  const base: Record<string, unknown> = { place_id: placeId, price_per_person: price };
  for (const [col, keywords] of Object.entries(styles)) {
    const found = pickKeywords(haystack, keywords);
    base[col] = found.length > 0 ? found : null;
  }

  // Prefer analyzer's direct extraction; fall back to keyword inference for
  // booleans when the analyzer didn't commit a value.
  switch (p.category) {
    case "wedding_hall":
      base.min_guarantee = p.min_guarantee ?? null;
      base.max_guarantee = p.max_guarantee ?? null;
      break;
    case "hanbok":
    case "tailor_shop":
      base.custom_available =
        p.custom_available ??
        (haystack.some((t) => t.includes("맞춤")) ? true : null);
      break;
    case "makeup_shop":
      base.includes_rehearsal =
        p.includes_rehearsal ??
        (haystack.some((t) => t.includes("리허설")) ? true : null);
      break;
    case "studio":
      base.includes_originals =
        p.includes_originals ??
        (haystack.some((t) => t.includes("원본")) ? true : null);
      break;
    case "dress_shop":
      base.rental_only = p.rental_only ?? null;
      break;
    case "honeymoon":
      base.duration_days = p.duration_days ?? null;
      // analyzer.destinations are concrete trip names ("발리"); keyword inference
      // produces generic regions ("유럽"). Prefer concrete when available.
      if (p.destinations && p.destinations.length > 0) base.destinations = p.destinations;
      break;
    case "appliance":
      if (p.brand_options && p.brand_options.length > 0) {
        base.brand_options = p.brand_options;
      } else {
        base.brand_options = null;
      }
      break;
    case "invitation_venue":
      base.capacity_min = p.capacity_min ?? null;
      base.capacity_max = p.capacity_max ?? null;
      break;
  }
  return base;
}

async function insertOne(
  supabase: SupabaseClient,
  p: CollectedPlace
): Promise<{ ok: boolean; placeId?: string; reason?: string }> {
  const { data, error } = await supabase
    .from("places")
    .insert(placeRow(p))
    .select("place_id")
    .single();

  if (error || !data) {
    return { ok: false, reason: `places: ${error?.message ?? "no row"}` };
  }
  const placeId = data.place_id;

  // place_details + place_<category> can fail independently; we log but keep the place row
  // so that re-run scripts can backfill them later.
  const detailsPayload = detailsRow(placeId, p);
  const categoryPayload = categoryRow(placeId, p);
  const tableName = CATEGORY_TABLE[p.category];

  const tasks: Array<Promise<{ table: string; error: string | null }>> = [];
  if (detailsPayload) {
    tasks.push(
      Promise.resolve(supabase.from("place_details").insert(detailsPayload)).then((r) => ({
        table: "place_details",
        error: r.error ? r.error.message : null,
      }))
    );
  }
  if (tableName) {
    tasks.push(
      Promise.resolve(supabase.from(tableName).insert(categoryPayload)).then((r) => ({
        table: tableName,
        error: r.error ? r.error.message : null,
      }))
    );
  }

  const results = await Promise.all(tasks);
  for (const r of results) {
    if (r.error) console.warn(`  ⚠ ${r.table} insert (${p.name}): ${r.error}`);
  }
  return { ok: true, placeId };
}

export async function upsertPlaces(
  items: CollectedPlace[],
  env: SupabaseEnv
): Promise<UpsertResult> {
  if (items.length === 0) return { inserted: 0, failed: 0 };
  const supabase = createClient(env.url, env.serviceRoleKey, {
    auth: { persistSession: false },
  });

  let inserted = 0;
  let failed = 0;
  for (const p of items) {
    const res = await insertOne(supabase, p);
    if (res.ok) inserted++;
    else {
      failed++;
      console.error(`  ✗ ${p.name}: ${res.reason}`);
    }
  }
  return { inserted, failed };
}
