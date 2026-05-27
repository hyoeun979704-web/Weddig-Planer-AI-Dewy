#!/usr/bin/env tsx
// 깨진 places.main_image_url 일괄 보강.
//
// 우선순위 fallback 체인:
//   1. place_details.website_url   ← 가장 풍부 (wedding_hall 의 74%)
//   2. place_details.naver_place_url
//   3. place_details.instagram_url ← 인스타는 차단 가능성 ↑ (보너스)
//
// 각 URL 에서 og:image 메타 태그 추출 → places.main_image_url 에 저장.
// 외부 이미지를 우리 storage 에 복사하지 않고 URL 만 참조 — 앱 용량 영향 0.
//
// 사용:
//   npm run refresh-place-images
//   npm run refresh-place-images -- --dry-run
//   npm run refresh-place-images -- --category=wedding_hall --limit=10

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

interface Args {
  dryRun: boolean;
  category: string | null;
  limit: number | null;
}

function parseArgs(): Args {
  const args: Args = { dryRun: false, category: null, limit: null };
  for (const a of process.argv.slice(2)) {
    if (a === "--dry-run") args.dryRun = true;
    else if (a.startsWith("--category=")) args.category = a.split("=")[1];
    else if (a.startsWith("--limit=")) args.limit = +a.split("=")[1];
  }
  return args;
}

// 일부 사이트는 봇 User-Agent 차단 — 일반 브라우저로 위장.
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";

const FETCH_TIMEOUT_MS = 8000;
const MIN_GAP_MS = 300; // 같은 도메인이 아닌 한 비교적 안전한 간격

let lastCallAt = 0;
const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
async function throttle(): Promise<void> {
  const elapsed = Date.now() - lastCallAt;
  if (elapsed < MIN_GAP_MS) await sleep(MIN_GAP_MS - elapsed);
  lastCallAt = Date.now();
}

interface ExtractResult {
  imageUrl: string | null;
  source: "og:image" | "twitter:image" | "link-image_src" | "first-img" | null;
}

// HTML 에서 대표 이미지 URL 추출. 우선순위:
//   og:image > twitter:image > link rel=image_src > 첫 번째 큰 <img src>
function extractImage(html: string, baseUrl: string): ExtractResult {
  const tryMatch = (re: RegExp): string | null => {
    const m = html.match(re);
    return m ? m[1].trim() : null;
  };
  const resolve = (raw: string): string | null => {
    try {
      const u = new URL(raw, baseUrl);
      return u.toString();
    } catch {
      return null;
    }
  };

  const og = tryMatch(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
    || tryMatch(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
  if (og) {
    const url = resolve(og);
    if (url) return { imageUrl: url, source: "og:image" };
  }

  const tw = tryMatch(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i)
    || tryMatch(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i);
  if (tw) {
    const url = resolve(tw);
    if (url) return { imageUrl: url, source: "twitter:image" };
  }

  const linkImg = tryMatch(/<link[^>]+rel=["']image_src["'][^>]+href=["']([^"']+)["']/i);
  if (linkImg) {
    const url = resolve(linkImg);
    if (url) return { imageUrl: url, source: "link-image_src" };
  }

  // 마지막 fallback — 첫 번째 <img src=...> (광고 배너 등 위험)
  const firstImg = tryMatch(/<img[^>]+src=["']([^"']+\.(?:jpg|jpeg|png|webp))["']/i);
  if (firstImg) {
    const url = resolve(firstImg);
    if (url) return { imageUrl: url, source: "first-img" };
  }

  return { imageUrl: null, source: null };
}

async function fetchPageImage(url: string): Promise<ExtractResult> {
  await throttle();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": UA,
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "ko,en;q=0.9",
      },
      redirect: "follow",
      signal: controller.signal,
    });
    if (!res.ok) {
      return { imageUrl: null, source: null };
    }
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("text/html") && !ct.includes("application/xhtml")) {
      return { imageUrl: null, source: null };
    }
    // 너무 큰 HTML 은 메모리 절약 — 첫 64KB 만 (head 메타는 보통 상단).
    const reader = res.body?.getReader();
    if (!reader) {
      const html = await res.text();
      return extractImage(html.slice(0, 65536), url);
    }
    let bytes = 0;
    let chunks: Uint8Array[] = [];
    while (bytes < 65536) {
      const { value, done } = await reader.read();
      if (done) break;
      chunks.push(value);
      bytes += value.length;
    }
    reader.releaseLock();
    const decoder = new TextDecoder("utf-8", { fatal: false });
    const html = chunks.map((c) => decoder.decode(c, { stream: true })).join("");
    return extractImage(html, url);
  } catch (e) {
    return { imageUrl: null, source: null };
  } finally {
    clearTimeout(timer);
  }
}

interface PlaceRow {
  place_id: string;
  name: string;
  category: string;
  website_url: string | null;
  naver_place_url: string | null;
  instagram_url: string | null;
}

async function main(): Promise<void> {
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

  // 깨진 places + 외부 URL 보유한 것만 추출
  let query = (supabase as any)
    .from("places")
    .select(
      "place_id, name, category, place_details!inner(website_url, naver_place_url, instagram_url)",
    )
    .is("main_image_url", null)
    .eq("is_active", true);
  if (args.category) query = query.eq("category", args.category);
  if (args.limit) query = query.limit(args.limit);
  const { data, error } = await query;
  if (error) {
    console.error("load failed:", error.message);
    process.exit(1);
  }

  const rows: PlaceRow[] = (data ?? []).map((r: any) => ({
    place_id: r.place_id,
    name: r.name,
    category: r.category,
    website_url: r.place_details?.website_url ?? null,
    naver_place_url: r.place_details?.naver_place_url ?? null,
    instagram_url: r.place_details?.instagram_url ?? null,
  }));

  const targets = rows.filter(
    (r) => r.website_url || r.naver_place_url || r.instagram_url,
  );
  console.log(`\n[refresh-place-images] candidates: ${targets.length} / total: ${rows.length}`);

  const stats = {
    succeeded: 0,
    failed: 0,
    by_source: {} as Record<string, number>,
  };
  const updates: Array<{ place_id: string; main_image_url: string }> = [];

  for (let i = 0; i < targets.length; i++) {
    const p = targets[i];
    const urls: Array<{ url: string; type: string }> = [];
    if (p.website_url) urls.push({ url: p.website_url, type: "website" });
    if (p.naver_place_url) urls.push({ url: p.naver_place_url, type: "naver" });
    if (p.instagram_url) urls.push({ url: p.instagram_url, type: "instagram" });

    let found: ExtractResult | null = null;
    let usedType = "";
    for (const { url, type } of urls) {
      const r = await fetchPageImage(url);
      if (r.imageUrl) {
        found = r;
        usedType = type;
        break;
      }
    }

    if (found?.imageUrl) {
      stats.succeeded++;
      stats.by_source[`${usedType}:${found.source}`] =
        (stats.by_source[`${usedType}:${found.source}`] ?? 0) + 1;
      updates.push({ place_id: p.place_id, main_image_url: found.imageUrl });
      process.stdout.write(`  ✓ [${i + 1}/${targets.length}] ${p.name}\n`);
    } else {
      stats.failed++;
      process.stdout.write(`  ✗ [${i + 1}/${targets.length}] ${p.name}\n`);
    }
  }

  console.log(`\n[summary]`);
  console.log(`  succeeded: ${stats.succeeded} / ${targets.length}`);
  console.log(`  failed:    ${stats.failed}`);
  console.log(`  by source:`);
  for (const [k, v] of Object.entries(stats.by_source).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${k}: ${v}`);
  }

  if (args.dryRun) {
    console.log(`\n[dry-run] no DB update`);
    return;
  }
  if (updates.length === 0) return;

  // bulk update — 1 row 씩 update (places.place_id 기반).
  let applied = 0;
  for (const u of updates) {
    const { error: upErr } = await (supabase as any)
      .from("places")
      .update({ main_image_url: u.main_image_url })
      .eq("place_id", u.place_id);
    if (upErr) {
      console.error(`  update failed ${u.place_id}: ${upErr.message}`);
      continue;
    }
    applied++;
  }
  console.log(`\napplied: ${applied} / ${updates.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
