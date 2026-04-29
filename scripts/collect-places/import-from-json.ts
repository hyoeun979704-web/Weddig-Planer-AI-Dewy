#!/usr/bin/env tsx
// Import enrichment data from a JSON file (typically pasted from a manual
// Gemini AI Studio chat session — bypasses API quota for free-tier projects).
//
// Usage:
//   npm run import-gemini-json -- path/to/data.json
//   npm run import-gemini-json -- path/to/data.json --dry-run
//
// JSON shape — array of objects, one per place:
//   [
//     {
//       "place_id": "uuid",                   // from the prompt template
//       "name": "롯데호텔서울 웨딩",            // for verification only
//       "tel": "02-771-1000",
//       "website_url": "https://...",
//       "instagram_url": "https://instagram.com/...",
//       "naver_place_url": "https://m.place.naver.com/...",
//       "hours": {"mon":"10:00-22:00","tue":...,"sun":null},
//       "closed_days": "월요일",
//       "advantage_1": {"title":"...","content":"..."},
//       "advantage_2": {"title":"...","content":"..."},
//       "advantage_3": {"title":"...","content":"..."},
//       "description": "한 줄 소개...",
//       "image_urls": ["https://..."],
//       "price_packages": [
//         {"name":"...","price_min":1500000,"price_max":null,
//          "currency":"KRW","unit":"per_person",
//          "includes":["식대 1인 7만원","..."],"notes":"주말 +20%"}
//       ],
//       "event_info": "현재 시즌 할인 ...",
//       "contract_policy": "예약금 환불은 ...",
//       "amenities": ["폐백실","신부대기실","주차"],
//       "basic_services": ["답례품 제공","사회자 매칭"],
//       "tags": ["호텔","프리미엄","강남","200명대"],
//       "category_extras": {                 // shape varies by category
//         "min_guarantee": 200,
//         "max_guarantee": 500,
//         "hall_styles": ["호텔","컨벤션"],
//         "meal_types": ["뷔페","코스"],
//         "food_tasting_available": true,
//         "outdoor_available": false,
//         "ceremony_only_available": false,
//         "hall_count": 3
//       }
//     },
//     ...
//   ]

import "dotenv/config";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

interface ImportRow {
  place_id: string;
  name?: string;
  tel?: string | null;
  website_url?: string | null;
  instagram_url?: string | null;
  naver_place_url?: string | null;
  hours?: Record<string, string | null> | null;
  closed_days?: string | null;
  advantage_1?: { title: string; content: string } | null;
  advantage_2?: { title: string; content: string } | null;
  advantage_3?: { title: string; content: string } | null;
  description?: string | null;
  image_urls?: string[] | null;
  price_packages?: unknown[] | null;
  event_info?: string | null;
  contract_policy?: string | null;
  amenities?: string[] | null;
  basic_services?: string[] | null;
  tags?: string[] | null;
  category_extras?: Record<string, unknown> | null;
}

// place_<category> table allow-list per category — same as the live
// Gemini orchestrator's category-prompts.ts cardColumns list.
const CARD_TABLE: Record<string, string> = {
  wedding_hall: "place_wedding_halls",
  studio: "place_studios",
  dress_shop: "place_dress_shops",
  makeup_shop: "place_makeup_shops",
  hanbok: "place_hanboks",
  tailor_shop: "place_tailor_shops",
  honeymoon: "place_honeymoons",
  appliance: "place_appliances",
  jewelry: "place_jewelry",
  invitation_venue: "place_invitation_venues",
};
const ALLOWED_CARD_COLUMNS: Record<string, string[]> = {
  wedding_hall: ["min_guarantee", "max_guarantee", "hall_styles", "meal_types",
    "food_tasting_available", "outdoor_available", "ceremony_only_available",
    "hall_count", "dress_code"],
  studio: ["shoot_styles", "shoot_locations", "total_photos", "original_count",
    "retouching_included", "includes_originals", "dress_provided",
    "frame_included", "photobook_pages", "editing_days"],
  dress_shop: ["dress_styles", "rental_only", "fitting_count",
    "rental_includes_alterations", "designer_brands",
    "helper_included", "inner_included", "dress_count_included"],
  makeup_shop: ["makeup_styles", "includes_rehearsal", "hair_makeup_separate",
    "rehearsal_count", "travel_fee_included", "director_level", "early_morning_fee"],
  hanbok: ["hanbok_types", "custom_available", "accessories_included", "delivery_available"],
  tailor_shop: ["suit_styles", "custom_available", "fitting_count", "designer_brands",
    "accessories_included"],
  honeymoon: ["agency_name", "agency_product_url", "product_type",
    "countries", "cities", "representative_city", "region_group",
    "nights", "days", "itinerary_summary", "itinerary_highlights",
    "price_per_person", "avg_budget", "price_includes", "price_excludes",
    "airline", "direct_flight", "departure_airport",
    "hotel_grade", "meal_plan",
    "themes", "shopping_required", "guide_included", "visa_required"],
  appliance: ["product_categories", "brand_options", "installment_months", "warranty_years",
    "free_delivery", "free_installation", "old_appliance_pickup", "card_discount_available"],
  jewelry: ["metals", "product_categories", "diamond_certified", "engraving_available",
    "size_resize_free", "lifetime_warranty", "couple_set_available"],
  invitation_venue: ["venue_types", "capacity_min", "capacity_max",
    "room_charge_separate", "drinks_included",
    "atmosphere", "valet_parking", "signature_dishes", "corkage_fee_won", "private_room_count"],
};

async function main() {
  const args = process.argv.slice(2);
  const file = args.find((a) => !a.startsWith("--"));
  const dryRun = args.includes("--dry-run");

  if (!file) {
    console.error("Usage: npm run import-gemini-json -- <file.json> [--dry-run]");
    process.exit(1);
  }

  if (!dryRun && (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY)) {
    console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (or pass --dry-run)");
    process.exit(1);
  }

  const supabase = createClient(
    process.env.SUPABASE_URL ?? "https://qabeywyzjsgyqpjqsvkd.supabase.co",
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
    { auth: { persistSession: false } },
  );

  const raw = readFileSync(file, "utf8");
  const rows: ImportRow[] = JSON.parse(raw);
  if (!Array.isArray(rows)) {
    console.error("Top-level JSON must be an array");
    process.exit(1);
  }
  console.log(`[import] ${rows.length} rows to process from ${file} ${dryRun ? "(dry-run)" : ""}`);

  let detailsOk = 0;
  let cardOk = 0;
  let placesOk = 0;
  let skipped = 0;

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (!r.place_id) {
      console.warn(`  · [${i + 1}] no place_id — skipping`);
      skipped++;
      continue;
    }

    // Look up the existing place to get its category — needed for the
    // card-table writeback.
    const { data: place } = await supabase
      .from("places")
      .select("place_id, category, name")
      .eq("place_id", r.place_id)
      .maybeSingle();
    if (!place) {
      console.warn(`  · [${i + 1}] place_id ${r.place_id} not found — skipping`);
      skipped++;
      continue;
    }

    process.stdout.write(`  · [${i + 1}/${rows.length}] ${place.name} ... `);

    // 1) place_details upsert
    const detailsUpdate: Record<string, unknown> = { place_id: r.place_id };
    if (r.tel) detailsUpdate.tel = r.tel;
    if (r.website_url) detailsUpdate.website_url = r.website_url;
    if (r.instagram_url) detailsUpdate.instagram_url = r.instagram_url;
    if (r.naver_place_url) detailsUpdate.naver_place_url = r.naver_place_url;
    if (r.hours) {
      // Gemini Pro web sometimes returns hours as {"mon-sun": "10:00-19:30"}
      // (single value for the whole week) instead of per-day keys. Handle
      // that shorthand by spreading the value across all seven days.
      const h = r.hours as Record<string, string | null>;
      const allDays = h["mon-sun"] ?? h["all"] ?? null;
      detailsUpdate.hours_mon = h.mon ?? allDays ?? null;
      detailsUpdate.hours_tue = h.tue ?? allDays ?? null;
      detailsUpdate.hours_wed = h.wed ?? allDays ?? null;
      detailsUpdate.hours_thu = h.thu ?? allDays ?? null;
      detailsUpdate.hours_fri = h.fri ?? allDays ?? null;
      detailsUpdate.hours_sat = h.sat ?? allDays ?? null;
      detailsUpdate.hours_sun = h.sun ?? allDays ?? null;
    }
    if (r.closed_days) detailsUpdate.closed_days = r.closed_days;
    if (r.advantage_1?.title) {
      detailsUpdate.advantage_1_title = r.advantage_1.title;
      detailsUpdate.advantage_1_content = r.advantage_1.content;
    }
    if (r.advantage_2?.title) {
      detailsUpdate.advantage_2_title = r.advantage_2.title;
      detailsUpdate.advantage_2_content = r.advantage_2.content;
    }
    if (r.advantage_3?.title) {
      detailsUpdate.advantage_3_title = r.advantage_3.title;
      detailsUpdate.advantage_3_content = r.advantage_3.content;
    }
    if (r.image_urls && r.image_urls.length > 0) detailsUpdate.image_urls = r.image_urls;
    if (r.price_packages && r.price_packages.length > 0) detailsUpdate.price_packages = r.price_packages;
    if (r.event_info) detailsUpdate.event_info = r.event_info;
    if (r.contract_policy) detailsUpdate.contract_policy = r.contract_policy;
    if (r.amenities && r.amenities.length > 0) detailsUpdate.amenities = r.amenities;
    if (r.basic_services && r.basic_services.length > 0) detailsUpdate.basic_services = r.basic_services;

    const detailsKeys = Object.keys(detailsUpdate).filter((k) => k !== "place_id");
    if (dryRun) {
      console.log(`would set place_details: ${detailsKeys.length} fields`);
    } else if (detailsKeys.length > 0) {
      const { error } = await supabase.from("place_details").upsert(detailsUpdate, { onConflict: "place_id" });
      if (error) {
        console.log(`  ❌ details: ${error.message.slice(0, 80)}`);
        continue;
      }
      detailsOk++;
    }

    // 2) places.tags + places.description
    const placesUpdate: Record<string, unknown> = {};
    if (r.tags && r.tags.length > 0) {
      const { data: existingPlace } = await supabase
        .from("places")
        .select("tags")
        .eq("place_id", r.place_id)
        .maybeSingle();
      const existing = (existingPlace?.tags as string[] | null) ?? [];
      const isBreadcrumb = (t: string) => /,/.test(t);
      const merged = Array.from(new Set([
        ...existing.filter((t) => !isBreadcrumb(t)),
        ...r.tags,
      ])).slice(0, 16);
      placesUpdate.tags = merged;
    }
    if (r.description) {
      // Don't overwrite curator-edited descriptions — only fill when null.
      const { data: existingPlace } = await supabase
        .from("places")
        .select("description")
        .eq("place_id", r.place_id)
        .maybeSingle();
      if (!existingPlace?.description) {
        placesUpdate.description = r.description;
      }
    }
    if (Object.keys(placesUpdate).length > 0) {
      if (dryRun) {
        console.log(`  + places: ${Object.keys(placesUpdate).join(",")}`);
      } else {
        const { error } = await supabase.from("places").update(placesUpdate).eq("place_id", r.place_id);
        if (!error) placesOk++;
      }
    }

    // 3) place_<category> card extras
    if (r.category_extras && typeof r.category_extras === "object") {
      const tableName = CARD_TABLE[place.category];
      const allowed = ALLOWED_CARD_COLUMNS[place.category];
      if (tableName && allowed) {
        const cardUpdate: Record<string, unknown> = { place_id: r.place_id };
        for (const [k, v] of Object.entries(r.category_extras)) {
          if (allowed.includes(k) && v != null) cardUpdate[k] = v;
        }
        const cardKeyCount = Object.keys(cardUpdate).length - 1;
        if (cardKeyCount > 0) {
          if (dryRun) {
            console.log(`  + card(${cardKeyCount}): ${Object.keys(cardUpdate).filter((k) => k !== "place_id").join(",")}`);
          } else {
            const { error } = await supabase.from(tableName).upsert(cardUpdate, { onConflict: "place_id" });
            if (!error) cardOk++;
          }
        }
      }
    }

    if (!dryRun) console.log("✓");
  }

  console.log(`\n[import] details=${detailsOk} card=${cardOk} places=${placesOk} skipped=${skipped}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
