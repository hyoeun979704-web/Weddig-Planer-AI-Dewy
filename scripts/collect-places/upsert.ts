import { createClient } from "@supabase/supabase-js";
import type { CollectedPlace } from "./types";
import type { CategorySlug } from "./utils/categories";

interface SupabaseEnv {
  url: string;
  serviceRoleKey: string;
}

export interface UpsertResult {
  inserted: number;
  updated: number;
  failed: number;
}

// Maps script category slug → category-specific card table.
// `planner` is intentionally absent: the app's own AI handles wedding planning,
// so we do not collect external planner listings.
const CATEGORY_CARD_TABLE: Partial<Record<CategorySlug, string>> = {
  wedding_hall: "place_wedding_halls",
  studio: "place_studios",
  dress_shop: "place_dress_shops",
  makeup_shop: "place_makeup_shops",
  hanbok: "place_hanboks",
  tailor_shop: "place_tailor_shops",
  honeymoon: "place_honeymoons",
  appliance: "place_appliances",
  invitation_venue: "place_invitation_venues",
};

// Drop keys whose value is null or undefined so we never overwrite existing
// non-null data with NULL during upsert.
function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== null && v !== undefined) (out as Record<string, unknown>)[k] = v;
  }
  return out;
}

function placesRow(p: CollectedPlace) {
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
    min_price: p.min_price ?? null,
    is_active: true,
  };
}

function detailsRow(p: CollectedPlace, placeId: string) {
  return compact({
    place_id: placeId,
    summary: p.summary ?? null,
    atmosphere: p.atmosphere && p.atmosphere.length > 0 ? p.atmosphere : null,
    pros: p.pros && p.pros.length > 0 ? p.pros : null,
    cons: p.cons && p.cons.length > 0 ? p.cons : null,
    hidden_costs: p.hidden_costs && p.hidden_costs.length > 0 ? p.hidden_costs : null,
    recommended_for:
      p.recommended_for && p.recommended_for.length > 0 ? p.recommended_for : null,
    analyzed_at: p.analyzed_at ?? null,
    tel: p.tel ?? null,
    address: p.address ?? null,
    naver_place_url: p.naver_place_url ?? null,
    naver_blog_url: p.naver_blog_url ?? null,
    instagram_url: p.instagram_url ?? null,
    facebook_url: p.facebook_url ?? null,
    youtube_url: p.youtube_url ?? null,
    website_url: p.website_url ?? null,
    subway_station: p.subway_station ?? null,
    subway_line: p.subway_line ?? null,
    walk_minutes: p.walk_minutes ?? null,
    parking_capacity: p.parking_capacity ?? null,
    parking_location: p.parking_location ?? null,
  });
}

const arr = (a: string[] | null | undefined) => (a && a.length > 0 ? a : null);

function categoryCardRow(p: CollectedPlace, placeId: string) {
  const base = { place_id: placeId, price_per_person: p.min_price ?? null };
  switch (p.category) {
    case "wedding_hall":
      return compact({
        ...base,
        hall_styles: arr(p.hall_styles),
        meal_types: arr(p.meal_types),
        min_guarantee: p.min_guarantee ?? null,
        max_guarantee: p.max_guarantee ?? null,
      });
    case "studio":
      return compact({
        ...base,
        shoot_styles: arr(p.shoot_styles),
        includes_originals: p.includes_originals ?? null,
      });
    case "dress_shop":
      return compact({
        ...base,
        dress_styles: arr(p.dress_styles),
        rental_only: p.rental_only ?? null,
      });
    case "makeup_shop":
      return compact({
        ...base,
        makeup_styles: arr(p.makeup_styles),
        includes_rehearsal: p.includes_rehearsal ?? null,
      });
    case "hanbok":
      return compact({
        ...base,
        hanbok_types: arr(p.hanbok_types),
        custom_available: p.custom_available ?? null,
      });
    case "tailor_shop":
      return compact({
        ...base,
        suit_styles: arr(p.suit_styles),
        custom_available: p.custom_available ?? null,
      });
    case "honeymoon":
      return compact({
        ...base,
        destinations: arr(p.destinations),
        duration_days: p.duration_days ?? null,
      });
    case "appliance":
      return compact({
        ...base,
        brand_options: arr(p.brand_options),
        product_categories: arr(p.product_categories),
      });
    case "invitation_venue":
      return compact({
        ...base,
        venue_types: arr(p.venue_types),
        capacity_min: p.capacity_min ?? null,
        capacity_max: p.capacity_max ?? null,
      });
    default:
      return compact(base);
  }
}

export async function upsertPlaces(
  items: CollectedPlace[],
  env: SupabaseEnv
): Promise<UpsertResult> {
  if (items.length === 0) return { inserted: 0, updated: 0, failed: 0 };
  const supabase = createClient(env.url, env.serviceRoleKey, {
    auth: { persistSession: false },
  });

  let inserted = 0;
  let updated = 0;
  let failed = 0;

  for (const p of items) {
    try {
      // Lookup pre-existing row by (name, category). Pick the oldest match if
      // multiple exist — duplicates can linger from earlier non-idempotent runs,
      // and we want every re-run to converge on the same canonical row.
      const { data: existingRows, error: lookupErr } = await supabase
        .from("places")
        .select("place_id")
        .eq("name", p.name)
        .eq("category", p.category)
        .order("created_at", { ascending: true })
        .limit(1);
      if (lookupErr) throw lookupErr;
      const existing = existingRows?.[0];

      let placeId: string;
      if (existing?.place_id) {
        const { data, error } = await supabase
          .from("places")
          .update(placesRow(p))
          .eq("place_id", existing.place_id)
          .select("place_id")
          .single();
        if (error) throw error;
        placeId = data.place_id;
        updated++;
      } else {
        const { data, error } = await supabase
          .from("places")
          .insert(placesRow(p))
          .select("place_id")
          .single();
        if (error) throw error;
        placeId = data.place_id;
        inserted++;
      }

      const dRow = detailsRow(p, placeId);
      const { error: detailsErr } = await supabase
        .from("place_details")
        .upsert(dRow, { onConflict: "place_id" });
      if (detailsErr) throw detailsErr;

      const cardTable = CATEGORY_CARD_TABLE[p.category];
      if (cardTable) {
        const { error: cardErr } = await supabase
          .from(cardTable)
          .upsert(categoryCardRow(p, placeId), { onConflict: "place_id" });
        if (cardErr) throw cardErr;
      }
    } catch (e) {
      console.error(`upsert failed for "${p.name}" (${p.category}):`, (e as Error).message);
      failed++;
    }
  }

  return { inserted, updated, failed };
}
