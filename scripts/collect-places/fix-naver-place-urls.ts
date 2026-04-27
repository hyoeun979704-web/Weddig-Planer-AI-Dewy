#!/usr/bin/env tsx
// Bulk-fix place_details.naver_place_url for places that have either:
//   - no naver_place_url at all
//   - a search-style URL (https://map.naver.com/v5/search/...) — these are
//     useless because clicking just dumps the user back into Naver search.
//
// We want canonical entry-page URLs like:
//   https://m.place.naver.com/place/{id}
//   https://map.naver.com/p/entry/place/{id}
//
// Strategy: scrape Naver desktop search HTML. The first ranked place result
// is almost always the right business, and search.naver.com responses
// embed the place ID in m.place.naver.com hyperlinks.
//
// Usage:
//   npm run fix-naver-urls -- --category=wedding_hall --dry-run
//   npm run fix-naver-urls -- --category=wedding_hall --limit=5
//   npm run fix-naver-urls -- --all
//
// Rate limit: 1.2s between requests (Naver tolerates this for low-volume
// research scraping; do not run at higher rate).

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

interface Args {
  category: string | "all";
  limit: number;
  dryRun: boolean;
  force: boolean;
}

function parseArgs(): Args {
  const args: Args = { category: "all", limit: Infinity, dryRun: false, force: false };
  for (const a of process.argv.slice(2)) {
    if (a === "--dry-run") args.dryRun = true;
    else if (a === "--force") args.force = true;
    else if (a === "--all") args.category = "all";
    else if (a.startsWith("--category=")) args.category = a.split("=")[1];
    else if (a.startsWith("--limit=")) args.limit = parseInt(a.split("=")[1], 10);
  }
  return args;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// The Naver mobile search HTML embeds m.place.naver.com/place/{id} links
// in the local-search section. Capture the first one — it is the top-ranked
// match for the query, which for full business name + region queries is
// reliably the right business.
const PLACE_ID_RE = /m\.place\.naver\.com\/(?:place|restaurant|hairshop|beauty|hospital|accommodation)\/(\d+)/g;
// Fallback: map.naver.com entry pages.
const ENTRY_ID_RE = /map\.naver\.com\/(?:v5\/)?(?:p\/)?entry\/place\/(\d+)/g;

async function fetchPlaceId(query: string): Promise<string | null> {
  const url = `https://search.naver.com/search.naver?where=nexearch&query=${encodeURIComponent(query)}`;
  let html: string;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
          "(KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
        "Accept-Language": "ko-KR,ko;q=0.9",
      },
    });
    if (!res.ok) {
      console.warn(`  fetch ${res.status} for ${query.slice(0, 40)}`);
      return null;
    }
    html = await res.text();
  } catch (e) {
    console.warn(`  fetch error: ${(e as Error).message.slice(0, 80)}`);
    return null;
  }

  // Try m.place first (the canonical entry page). Then map entry as fallback.
  PLACE_ID_RE.lastIndex = 0;
  const m1 = PLACE_ID_RE.exec(html);
  if (m1) return m1[1];
  ENTRY_ID_RE.lastIndex = 0;
  const m2 = ENTRY_ID_RE.exec(html);
  if (m2) return m2[1];
  return null;
}

async function main() {
  const args = parseArgs();
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } },
  );

  // Pull candidates: places where naver_place_url is null OR is a search URL
  // (which we treat as broken).
  let q = supabase
    .from("places")
    .select("place_id, name, city, district, category, place_details(naver_place_url)")
    .eq("is_active", true);
  if (args.category !== "all") q = q.eq("category", args.category);

  const { data: rows, error } = await q;
  if (error) {
    console.error("query failed:", error);
    process.exit(1);
  }

  const candidates = (rows ?? []).filter((r) => {
    const detail = (r as { place_details: { naver_place_url: string | null } | null }).place_details;
    const url = detail?.naver_place_url;
    if (args.force) return true;
    if (!url) return true;
    // Treat search URLs as broken — they don't deep-link to a place.
    if (/map\.naver\.com\/v5\/search/.test(url)) return true;
    if (/search\.naver\.com/.test(url)) return true;
    // Already canonical — leave it.
    return false;
  }).slice(0, args.limit);

  console.log(`[fix-naver] ${candidates.length} candidates to process${args.dryRun ? " (dry-run)" : ""}`);

  let ok = 0;
  let miss = 0;
  for (let i = 0; i < candidates.length; i++) {
    const p = candidates[i] as { place_id: string; name: string; city: string | null; district: string | null };
    const region = [p.city, p.district].filter(Boolean).join(" ");
    const query = `${p.name} ${region} 웨딩`;
    process.stdout.write(`  [${i + 1}/${candidates.length}] ${p.name} ... `);
    const placeId = await fetchPlaceId(query);
    if (!placeId) {
      console.log("✗ no match");
      miss++;
      await sleep(1200);
      continue;
    }
    const url = `https://m.place.naver.com/place/${placeId}`;
    if (args.dryRun) {
      console.log(`would set ${url}`);
    } else {
      const { error: upErr } = await supabase
        .from("place_details")
        .upsert({ place_id: p.place_id, naver_place_url: url }, { onConflict: "place_id" });
      if (upErr) {
        console.log(`❌ ${upErr.message.slice(0, 80)}`);
        miss++;
      } else {
        console.log(`✓ ${placeId}`);
        ok++;
      }
    }
    await sleep(1200);
  }

  console.log(`\n[fix-naver] ok=${ok} miss=${miss}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
