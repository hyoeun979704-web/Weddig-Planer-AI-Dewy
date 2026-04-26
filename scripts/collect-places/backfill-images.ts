#!/usr/bin/env tsx
// Backfill main_image_url for places missing one. Reads candidates from places,
// queries Naver Image Search per place (with throttle), and updates the row.
//
// Usage:
//   npm run backfill-images                  # all categories, no limit
//   npm run backfill-images -- --limit=200   # cap at 200 places
//   npm run backfill-images -- --category=한복
//   npm run backfill-images -- --dry-run     # don't write
//
// Throttle is shared with the live collector (150ms gap), so this also stays
// well under Naver's per-second cap.

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { searchImage } from "./sources/naver";
import { fetchOgImage, isCrawlableHomepage } from "./sources/og";
import { CATEGORIES, CategoryLabel } from "./utils/categories";

interface Args {
  limit: number;
  dryRun: boolean;
  category?: CategoryLabel;
}

function parseArgs(): Args {
  const args: Args = { limit: 5000, dryRun: false };
  for (const a of process.argv.slice(2)) {
    if (a === "--dry-run") args.dryRun = true;
    else if (a.startsWith("--limit=")) args.limit = +a.split("=")[1];
    else if (a.startsWith("--category=")) args.category = a.split("=")[1] as CategoryLabel;
  }
  return args;
}

async function main() {
  const args = parseArgs();

  if (!process.env.NAVER_CLIENT_ID || !process.env.NAVER_CLIENT_SECRET) {
    console.error("Missing NAVER_CLIENT_ID / NAVER_CLIENT_SECRET");
    process.exit(1);
  }
  if (!args.dryRun && (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY)) {
    console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (or use --dry-run)");
    process.exit(1);
  }

  const naverEnv = {
    clientId: process.env.NAVER_CLIENT_ID!,
    clientSecret: process.env.NAVER_CLIENT_SECRET!,
  };
  const supabase = createClient(
    process.env.SUPABASE_URL ?? "https://qabeywyzjsgyqpjqsvkd.supabase.co",
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
    { auth: { persistSession: false } }
  );

  const placeCategory = args.category ? CATEGORIES[args.category] : undefined;

  console.log(
    `\n[backfill-images] category=${args.category ?? "all"} limit=${args.limit} dry-run=${args.dryRun}`
  );

  // Pull source_refs too — we extract the official homepage URL from there
  // and try og:image first (the photo the business itself chose to represent
  // it). Naver Image Search is the fallback only.
  let q = supabase
    .from("places")
    .select("place_id, name, category, city, district, source_refs")
    .eq("is_active", true)
    .is("deleted_at", null)
    .is("main_image_url", null);
  if (placeCategory) q = q.eq("category", placeCategory);

  const { data: targets, error } = await q.limit(args.limit);
  if (error) {
    console.error("places query failed:", error.message);
    process.exit(1);
  }
  console.log(`[backfill-images] ${targets?.length ?? 0} candidates`);

  let filled = 0;
  let failed = 0;
  let viaOg = 0;
  let viaSearch = 0;
  for (let i = 0; i < (targets?.length ?? 0); i++) {
    const p = targets![i];
    const region = [p.city, p.district].filter(Boolean).join(" ");
    const fullQuery = `${p.name} ${region}`.trim();
    process.stdout.write(`  · [${i + 1}/${targets!.length}] ${p.name} ... `);

    let url: string | null = null;
    let source: "og" | "search" | null = null;

    // 1) Official homepage og:image — only when source_refs has a real
    //    homepage URL (not Instagram/Facebook/blog.naver). This is the
    //    business's own representative photo.
    const refs = (p.source_refs ?? []) as Array<{ url?: string }>;
    const homepage = refs.map((r) => r?.url).find((u) => isCrawlableHomepage(u ?? ""));
    if (homepage) {
      url = await fetchOgImage(homepage).catch(() => null);
      if (url) source = "og";
    }

    // 2) Fallback: keyword image search (name + region, then name only).
    if (!url) {
      url = await searchImage(fullQuery, naverEnv).catch(() => null);
      if (!url && p.name) {
        url = await searchImage(p.name, naverEnv).catch(() => null);
      }
      if (url) source = "search";
    }

    if (!url || !source) {
      console.log("no image");
      failed++;
      continue;
    }

    if (args.dryRun) {
      console.log(`would set [${source}]: ${url.slice(0, 60)}…`);
      filled++;
      if (source === "og") viaOg++;
      else viaSearch++;
      continue;
    }

    const { error: updateErr } = await supabase
      .from("places")
      .update({ main_image_url: url })
      .eq("place_id", p.place_id);

    if (updateErr) {
      console.log(`update failed: ${updateErr.message.slice(0, 60)}`);
      failed++;
    } else {
      console.log(`✓ [${source}] ${url.slice(0, 60)}…`);
      filled++;
      if (source === "og") viaOg++;
      else viaSearch++;
    }
  }

  console.log(
    `\n[backfill-images] filled=${filled} (og=${viaOg}, search=${viaSearch}) failed=${failed}`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
