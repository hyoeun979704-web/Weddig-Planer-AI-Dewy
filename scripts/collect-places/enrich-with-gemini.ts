#!/usr/bin/env tsx
// Enrich place_details with Gemini 2.5 Flash + Google Search grounding.
// Per place: search → strict-prompt JSON extraction → validation → upsert.
//
// Usage:
//   npm run enrich-with-gemini -- --pilot=50            # test on 50 rows first
//   npm run enrich-with-gemini -- --category=웨딩홀
//   npm run enrich-with-gemini -- --limit=1500          # full backfill
//   npm run enrich-with-gemini -- --dry-run             # show what would be set
//
// Cost: ~$0.035/grounded query (Google Search) + minimal token cost. 1.5K
// places ≈ $50 one-time. Skips rows already enriched (where is_verified
// metadata stored in place_details).
//
// Throttle: gemini-enrich.ts handles RPM gap; each call also takes
// 5-15s due to grounding, so wall time is dominated by latency.

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { enrichPlaceWithSearch, validateEnriched } from "./sources/gemini-enrich";
import { CATEGORIES, CategoryLabel } from "./utils/categories";

// Reverse map for the prompt (slug → Korean label).
const SLUG_TO_LABEL: Record<string, string> = Object.entries(CATEGORIES).reduce(
  (acc, [label, slug]) => ({ ...acc, [slug]: label }),
  {}
);

interface Args {
  limit: number;
  pilot?: number;
  dryRun: boolean;
  category?: CategoryLabel;
}

function parseArgs(): Args {
  const args: Args = { limit: 5000, dryRun: false };
  for (const a of process.argv.slice(2)) {
    if (a === "--dry-run") args.dryRun = true;
    else if (a.startsWith("--limit=")) args.limit = +a.split("=")[1];
    else if (a.startsWith("--pilot=")) args.pilot = +a.split("=")[1];
    else if (a.startsWith("--category=")) args.category = a.split("=")[1] as CategoryLabel;
  }
  return args;
}

async function main() {
  const args = parseArgs();
  if (!process.env.GEMINI_API_KEY && !process.env.GOOGLE_API_KEY) {
    console.error("Missing GEMINI_API_KEY (or GOOGLE_API_KEY).");
    process.exit(1);
  }
  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY!;
  if (!args.dryRun && (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY)) {
    console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (or use --dry-run)");
    process.exit(1);
  }

  const supabase = createClient(
    process.env.SUPABASE_URL ?? "https://qabeywyzjsgyqpjqsvkd.supabase.co",
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
    { auth: { persistSession: false } }
  );

  const placeCategory = args.category ? CATEGORIES[args.category] : undefined;
  const effectiveLimit = args.pilot ?? args.limit;

  console.log(
    `\n[enrich-with-gemini] category=${args.category ?? "all"} limit=${effectiveLimit} dry-run=${args.dryRun}${args.pilot ? ` PILOT` : ""}`
  );

  let q = supabase
    .from("places")
    .select("place_id, name, category, city, district")
    .eq("is_active", true)
    .is("deleted_at", null);
  if (placeCategory) q = q.eq("category", placeCategory);

  const { data: places, error } = await q.limit(effectiveLimit);
  if (error) {
    console.error("places query failed:", error.message);
    process.exit(1);
  }

  // Skip rows already enriched (place_details.tel non-empty AND has any advantage).
  const placeIds = (places ?? []).map((p) => p.place_id);
  const { data: existing } = await supabase
    .from("place_details")
    .select("place_id, tel, advantage_1_title")
    .in("place_id", placeIds);
  const alreadyEnriched = new Set(
    (existing ?? [])
      .filter((d) => d.tel && d.tel !== "" && d.advantage_1_title)
      .map((d) => d.place_id)
  );
  const targets = (places ?? []).filter((p) => !alreadyEnriched.has(p.place_id));
  console.log(`[enrich-with-gemini] ${targets.length} candidates (skipped ${alreadyEnriched.size} already enriched)`);

  let verified = 0;
  let rejected = 0;
  let errored = 0;
  for (let i = 0; i < targets.length; i++) {
    const p = targets[i];
    const region = [p.city, p.district].filter(Boolean).join(" ");
    const categoryLabel = SLUG_TO_LABEL[p.category] ?? p.category;
    process.stdout.write(`  · [${i + 1}/${targets.length}] ${p.name} (${categoryLabel}) ... `);

    const data = await enrichPlaceWithSearch(
      { name: p.name, category: categoryLabel, region },
      apiKey
    );
    if (!data) {
      console.log("API error");
      errored++;
      continue;
    }

    const v = validateEnriched(data);
    if (!v.ok || !v.cleaned) {
      console.log(`rejected: ${v.reason}`);
      rejected++;
      continue;
    }
    const c = v.cleaned;

    if (args.dryRun) {
      const preview = [
        c.tel ? `tel=${c.tel}` : null,
        c.website_url ? `web` : null,
        c.instagram_url ? `ig` : null,
        c.advantage_1 ? `adv1` : null,
        c.advantage_2 ? `adv2` : null,
        c.advantage_3 ? `adv3` : null,
        c.hours ? `hrs` : null,
      ]
        .filter(Boolean)
        .join(" ");
      console.log(`✓ would set: ${preview} [${c.source_urls?.length ?? 0} src]`);
      verified++;
      continue;
    }

    // Build place_details upsert payload from cleaned fields.
    const detailsUpdate: Record<string, unknown> = { place_id: p.place_id };
    if (c.tel) detailsUpdate.tel = c.tel;
    if (c.website_url) detailsUpdate.website_url = c.website_url;
    if (c.instagram_url) detailsUpdate.instagram_url = c.instagram_url;
    if (c.naver_place_url) detailsUpdate.naver_place_url = c.naver_place_url;
    if (c.hours) {
      detailsUpdate.hours_mon = c.hours.mon ?? null;
      detailsUpdate.hours_tue = c.hours.tue ?? null;
      detailsUpdate.hours_wed = c.hours.wed ?? null;
      detailsUpdate.hours_thu = c.hours.thu ?? null;
      detailsUpdate.hours_fri = c.hours.fri ?? null;
      detailsUpdate.hours_sat = c.hours.sat ?? null;
      detailsUpdate.hours_sun = c.hours.sun ?? null;
    }
    if (c.closed_days) detailsUpdate.closed_days = c.closed_days;
    if (c.advantage_1) {
      detailsUpdate.advantage_1_title = c.advantage_1.title;
      detailsUpdate.advantage_1_content = c.advantage_1.content;
    }
    if (c.advantage_2) {
      detailsUpdate.advantage_2_title = c.advantage_2.title;
      detailsUpdate.advantage_2_content = c.advantage_2.content;
    }
    if (c.advantage_3) {
      detailsUpdate.advantage_3_title = c.advantage_3.title;
      detailsUpdate.advantage_3_content = c.advantage_3.content;
    }
    // Rich UX fields
    if (c.image_urls && c.image_urls.length > 0) detailsUpdate.image_urls = c.image_urls;
    if (c.price_packages && c.price_packages.length > 0) {
      detailsUpdate.price_packages = c.price_packages;
    }
    if (c.event_info) detailsUpdate.event_info = c.event_info;
    if (c.contract_policy) detailsUpdate.contract_policy = c.contract_policy;
    if (c.amenities && c.amenities.length > 0) detailsUpdate.amenities = c.amenities;

    const { error: detailsErr } = await supabase
      .from("place_details")
      .upsert(detailsUpdate, { onConflict: "place_id" });

    // Description goes on places (only if currently null — preserve curator edits).
    let descMsg = "";
    if (c.description) {
      const { error: descErr } = await supabase
        .from("places")
        .update({ description: c.description })
        .eq("place_id", p.place_id)
        .is("description", null);
      if (descErr) descMsg = ` desc-fail`;
      else descMsg = ` +desc`;
    }

    if (detailsErr) {
      console.log(`upsert failed: ${detailsErr.message.slice(0, 60)}`);
      errored++;
    } else {
      const fields = Object.keys(detailsUpdate).filter((k) => k !== "place_id").length;
      console.log(`✓ ${fields} fields${descMsg} [${c.source_urls?.length ?? 0} src]`);
      verified++;
    }
  }

  console.log(
    `\n[enrich-with-gemini] verified=${verified} rejected=${rejected} errored=${errored}`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
