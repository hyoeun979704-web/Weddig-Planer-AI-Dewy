#!/usr/bin/env tsx
// Fetches the og:image meta tag from each honeymoon product's agency page
// and writes the URL into places.main_image_url. Travel agency listings
// have a destination/package hero image as og:image, which is the most
// accurate visual representation we can get without manual curation.
//
// Usage:
//   npm run fetch-honeymoon-og-images
//   npm run fetch-honeymoon-og-images -- --dry-run
//
// Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (.env).
//
// Notes:
//   - Some agency CDNs use Referer-based hotlink protection. If a fetched
//     og:image fails to render in the app, we'll need to mirror it through
//     Supabase Storage. For now we just store the URL as-is.
//   - JS-only SPA pages (rare for these agencies) will have no og:image in
//     the initial HTML. Those products keep their existing fallback URL.

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

interface ProductRow {
  place_id: string;
  name: string;
  agency_product_url: string | null;
  current_image: string | null;
}

function extractOgImage(html: string): string | null {
  // Tolerate single/double quotes and either property-first or content-first attribute order.
  const patterns: RegExp[] = [
    /<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i,
    /<meta\s+content=["']([^"']+)["']\s+property=["']og:image["']/i,
    /<meta\s+name=["']og:image["']\s+content=["']([^"']+)["']/i,
    /<meta\s+property=["']twitter:image["']\s+content=["']([^"']+)["']/i,
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m && m[1]) return m[1];
  }
  return null;
}

function absolutize(imgUrl: string, pageUrl: string): string {
  if (/^https?:\/\//i.test(imgUrl)) return imgUrl;
  if (imgUrl.startsWith("//")) return "https:" + imgUrl;
  try {
    return new URL(imgUrl, pageUrl).toString();
  } catch {
    return imgUrl;
  }
}

async function fetchOg(url: string): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15000);
    const res = await fetch(url, {
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "ko,en;q=0.8",
      },
      redirect: "follow",
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("html")) return null;
    const html = await res.text();
    const og = extractOgImage(html);
    return og ? absolutize(og, url) : null;
  } catch {
    return null;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const { data, error } = await supabase
    .from("places")
    .select("place_id, name, main_image_url, place_honeymoons(agency_product_url)")
    .eq("category", "honeymoon")
    .eq("is_active", true);
  if (error) {
    console.error(error);
    process.exit(1);
  }

  const rows: ProductRow[] = (data ?? []).map((r: any) => ({
    place_id: r.place_id,
    name: r.name,
    current_image: r.main_image_url,
    agency_product_url: r.place_honeymoons?.agency_product_url ?? null,
  }));

  console.log(`[og-image] ${rows.length} honeymoon products ${dryRun ? "(dry-run)" : ""}`);

  let ok = 0;
  let skip = 0;
  let fail = 0;

  // Sequential to be polite to agency servers; bump to a small concurrency
  // pool if this proves too slow.
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const tag = `[${i + 1}/${rows.length}]`;
    if (!r.agency_product_url) {
      console.log(`${tag} ${r.name} — no agency_product_url, skipping`);
      skip++;
      continue;
    }
    process.stdout.write(`${tag} ${r.name.slice(0, 50)} ... `);
    const og = await fetchOg(r.agency_product_url);
    if (!og) {
      console.log("✗ no og:image");
      fail++;
      continue;
    }
    if (dryRun) {
      console.log(`would set → ${og.slice(0, 80)}`);
      ok++;
      continue;
    }
    const { error: upErr } = await supabase
      .from("places")
      .update({ main_image_url: og })
      .eq("place_id", r.place_id);
    if (upErr) {
      console.log(`✗ db: ${upErr.message.slice(0, 60)}`);
      fail++;
      continue;
    }
    console.log("✓");
    ok++;
  }

  console.log(`\n[og-image] ok=${ok} fail=${fail} skip=${skip}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
