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
// Note: script slugs don't always match DB slugs (e.g. "suit" ≠ "tailor_shop"),
// but the card table is identified by the script slug here for self-consistency.
const CATEGORY_CARD_TABLE: Partial<Record<CategorySlug, string>> = {
  wedding_hall: "place_wedding_halls",
  studio: "place_studios",
  hanbok: "place_hanboks",
  suit: "place_tailor_shops",
  honeymoon: "place_honeymoons",
  appliance: "place_appliances",
  invitation: "place_invitation_venues",
  planner: "place_planners",
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
  });
}

function categoryCardRow(p: CollectedPlace, placeId: string) {
  if (p.category === "wedding_hall") {
    return compact({
      place_id: placeId,
      min_guarantee: p.min_guarantee ?? null,
      max_guarantee: p.max_guarantee ?? null,
      price_per_person: p.min_price ?? null,
    });
  }
  return compact({
    place_id: placeId,
    price_per_person: p.min_price ?? null,
  });
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
