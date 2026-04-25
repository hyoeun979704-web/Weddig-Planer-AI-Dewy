#!/usr/bin/env tsx
import "dotenv/config";
import { CATEGORIES, CategoryLabel, seedQueries } from "./utils/categories";
import {
  searchLocal,
  searchBlog,
  searchCafe,
  searchWeb,
  searchNews,
  type LocalItem,
  type BlogItem,
} from "./sources/naver";
import { analyzeBusiness } from "./sources/analyzer";
import { dedupe } from "./dedupe";
import { scoreConfidence } from "./scoring";
import { upsertPlaces } from "./upsert";
import { saveSnapshot, loadSnapshot } from "./cache";
import type { CollectedPlace, SourceRef } from "./types";

interface CliArgs {
  category: CategoryLabel | "all";
  region?: string;
  limit: number;
  dryRun: boolean;
  noAnalyze: boolean; // skip Stage 3 LLM analysis
  reviewSnippets: number; // per-business snippet target
  fromSnapshot?: string; // path to a prior run's JSON snapshot — skip Stage 1-3
}

function parseArgs(): CliArgs {
  const args: CliArgs = {
    category: "all",
    limit: 50,
    dryRun: false,
    noAnalyze: false,
    reviewSnippets: 30,
  };
  for (const a of process.argv.slice(2)) {
    if (a === "--all") args.category = "all";
    else if (a === "--dry-run") args.dryRun = true;
    else if (a === "--no-analyze") args.noAnalyze = true;
    else if (a.startsWith("--category=")) args.category = a.split("=")[1] as CategoryLabel;
    else if (a.startsWith("--region=")) args.region = a.split("=")[1];
    else if (a.startsWith("--limit=")) args.limit = +a.split("=")[1];
    else if (a.startsWith("--snippets=")) args.reviewSnippets = +a.split("=")[1];
    else if (a.startsWith("--from-snapshot=")) args.fromSnapshot = a.split("=")[1];
  }
  return args;
}

const stripTags = (s: string) => s.replace(/<\/?[^>]+>/g, "").trim();

// Pre-filter: known tourist hanbok experience brands & venue keywords.
// Saves Gemini calls on obvious non-wedding listings.
const HANBOK_EXPERIENCE_BLOCKLIST = [
  "한복남",
  "한복살롱",
  "한복마법",
  "한복마을",
  "한복여행",
  "한복충",
  "오늘하루한복",
  "다온재",
  "한복애",
  "한복여기",
];
const HANBOK_EXPERIENCE_KEYWORDS = ["체험", "관광", "고궁", "경복궁점", "북촌점", "인사동점"];

function isHanbokExperienceShop(name: string, naverCategory: string): boolean {
  const lname = name.toLowerCase();
  if (HANBOK_EXPERIENCE_BLOCKLIST.some((b) => name.includes(b))) return true;
  if (HANBOK_EXPERIENCE_KEYWORDS.some((k) => name.includes(k) || naverCategory.includes(k)))
    return true;
  return false;
}

// Naver Local API's `link` field is the shop's primary external URL (could be
// Instagram, official site, kakao channel, etc.). Route it into the right
// place_details column based on hostname so the UI's SNS section labels them
// correctly.
function classifyLink(url: string | null | undefined): {
  naver_place_url?: string;
  naver_blog_url?: string;
  instagram_url?: string;
  facebook_url?: string;
  youtube_url?: string;
  website_url?: string;
} {
  if (!url) return {};
  const u = url.toLowerCase();
  if (u.includes("place.naver.com") || u.includes("map.naver.com") || u.includes("naver.me"))
    return { naver_place_url: url };
  if (u.includes("blog.naver.com")) return { naver_blog_url: url };
  if (u.includes("instagram.com")) return { instagram_url: url };
  if (u.includes("facebook.com") || u.includes("fb.com")) return { facebook_url: url };
  if (u.includes("youtube.com") || u.includes("youtu.be")) return { youtube_url: url };
  return { website_url: url };
}

function localToCandidate(l: LocalItem, label: CategoryLabel): CollectedPlace {
  const cleanTitle = stripTags(l.title);
  const addr = l.roadAddress || l.address || "";
  const parts = addr.split(/\s+/);
  const city = parts[0] || null;
  const district = parts[1] || null;
  return {
    name: cleanTitle,
    category: CATEGORIES[label],
    city,
    district,
    description: null,
    main_image_url: null,
    tags: l.category ? l.category.split(">").map((t) => t.trim()).filter(Boolean) : [],
    lat: l.mapy ? +l.mapy / 1e7 : null,
    lng: l.mapx ? +l.mapx / 1e7 : null,
    data_source: "local",
    confidence: 0,
    last_source_date: null,
    source_refs: [{ url: l.link || "", source_type: "local", published_at: null }],
    tel: l.telephone || null,
    address: addr || null,
    ...classifyLink(l.link),
  };
}

function postdateToIso(yyyymmdd?: string): string | null {
  if (!yyyymmdd || yyyymmdd.length !== 8) return null;
  return `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`;
}

interface NaverEnv {
  clientId: string;
  clientSecret: string;
}

// Stage 1: Discover candidates via Naver Local API across all seed queries.
async function discover(label: CategoryLabel, region: string | undefined, env: NaverEnv) {
  const queries = seedQueries(label, region);
  console.log(`\n[${label}] Stage 1 발견 — ${queries.length} 시드 쿼리`);
  const candidates: CollectedPlace[] = [];
  for (let qi = 0; qi < queries.length; qi++) {
    const q = queries[qi];
    process.stdout.write(`  · [${qi + 1}/${queries.length}] ${q} ... `);
    try {
      const local = await searchLocal(q, env, 5);
      // Hanbok pre-filter: drop obvious tourist experience shops before Gemini analysis
      const filtered =
        label === "한복"
          ? local.filter((l) => !isHanbokExperienceShop(stripTags(l.title), l.category || ""))
          : local;
      const dropped = local.length - filtered.length;
      const items = filtered.map((l) => localToCandidate(l, label));
      candidates.push(...items);
      console.log(`+${items.length}${dropped > 0 ? ` (-${dropped} 체험)` : ""}`);
    } catch (e) {
      console.log(`error: ${(e as Error).message.slice(0, 80)}`);
    }
  }
  return dedupe(candidates);
}

// Stage 2: For each candidate, gather snippets from 4 Naver sources (blog, cafe,
// web, news). Web/news catch info that blog/cafe miss — official venue pages
// listing all halls, directory entries with prices, openings/ownership news.
async function gatherSnippets(
  c: CollectedPlace,
  env: NaverEnv,
  target: number
): Promise<BlogItem[]> {
  const reviewQueries = [
    `${c.name} 후기`,
    `${c.name} 추천`,
    `${c.name} 가격`,
  ];
  const directoryQueries = [
    `${c.name} 홀`,
    `${c.name} 패키지`,
    `${c.name}`,
  ];
  const snippets: BlogItem[] = [];
  const seen = new Set<string>();

  const add = (items: BlogItem[]) => {
    for (const it of items) {
      if (snippets.length >= target) break;
      if (!it.link || seen.has(it.link)) continue;
      seen.add(it.link);
      snippets.push(it);
    }
  };

  // Pass 1: review queries against blog + cafe (subjective opinion)
  for (const q of reviewQueries) {
    if (snippets.length >= target) break;
    const need = Math.min(15, target - snippets.length);
    const [blog, cafe] = await Promise.all([
      searchBlog(q, env, { months: 24, limit: need }).catch(() => []),
      searchCafe(q, env, { months: 24, limit: need }).catch(() => []),
    ]);
    add([...blog, ...cafe]);
  }

  // Pass 2: directory/factual queries against web + news (objective info —
  // official sites, industry directories, news about openings/changes).
  for (const q of directoryQueries) {
    if (snippets.length >= target) break;
    const need = Math.min(10, target - snippets.length);
    const [web, news] = await Promise.all([
      searchWeb(q, env, need).catch(() => []),
      searchNews(q, env, { months: 36, limit: need }).catch(() => []),
    ]);
    add([...web, ...news]);
  }

  return snippets;
}

async function processCategory(label: CategoryLabel, args: CliArgs): Promise<CollectedPlace[]> {
  const naverEnv: NaverEnv = {
    clientId: process.env.NAVER_CLIENT_ID!,
    clientSecret: process.env.NAVER_CLIENT_SECRET!,
  };
  const geminiKey = process.env.GEMINI_API_KEY!;

  // Stage 1
  const discovered = await discover(label, args.region, naverEnv);
  console.log(`[${label}] 발견 후보 ${discovered.length}개 (중복제거 후)`);

  // Truncate to limit upfront so we don't waste analysis budget
  const targets = discovered.slice(0, args.limit);

  if (args.noAnalyze) {
    return targets.map((p) => ({ ...p, confidence: scoreConfidence(p) }));
  }

  // Stage 2 + 3
  console.log(`\n[${label}] Stage 2-3 자료수집 + 분석 (${targets.length}개)`);
  const enriched: CollectedPlace[] = [];
  for (let i = 0; i < targets.length; i++) {
    const c = targets[i];
    process.stdout.write(`  · [${i + 1}/${targets.length}] ${c.name} ... `);

    const snippets = await gatherSnippets(c, naverEnv, args.reviewSnippets);
    if (snippets.length === 0) {
      // Skip the shop entirely if Naver didn't give us an address either —
      // the listing card would have neither summary nor location, so it's
      // worse than not appearing.
      if (!c.address) {
        console.log("스니펫 0 + 주소 없음, 제외");
        continue;
      }
      console.log("스니펫 0, 분석 스킵 (주소만 보존)");
      enriched.push({ ...c, confidence: scoreConfidence(c) });
      continue;
    }

    const lastDate =
      snippets.map((s) => postdateToIso(s.postdate)).filter((x): x is string => !!x).sort().reverse()[0] ?? null;

    const refs: SourceRef[] = [
      ...c.source_refs,
      ...snippets.slice(0, 5).map((s) => ({
        url: s.link,
        source_type: s.source as "blog" | "cafe",
        published_at: postdateToIso(s.postdate),
      })),
    ];

    const analysis = await analyzeBusiness(
      {
        business_name: c.name,
        category: label,
        region: [c.city, c.district].filter(Boolean).join(" "),
        snippets: snippets.map((s) => ({
          source: s.source,
          title: s.title,
          description: s.description,
          postdate: s.postdate,
        })),
      },
      geminiKey
    );

    if (!analysis || !analysis.is_relevant) {
      console.log(`스킵 (관련성 낮음, snippet=${snippets.length})`);
      enriched.push({ ...c, confidence: scoreConfidence(c) });
      continue;
    }

    const minPrice = analysis.avg_price_estimate?.min ?? null;
    const cat = c.category;
    const only = <T>(slugs: CollectedPlace["category"][], v: T): T | null =>
      slugs.includes(cat) ? v : null;

    const enhanced: CollectedPlace = {
      ...c,
      description: analysis.summary ?? c.description,
      tags: Array.from(new Set([...c.tags, ...(analysis.tags ?? [])])),
      data_source: "mixed",
      last_source_date: lastDate,
      source_refs: refs,
      price_tier: analysis.price_tier ?? null,
      atmosphere: analysis.atmosphere ?? [],
      pros: analysis.pros ?? [],
      cons: analysis.cons ?? [],
      hidden_costs: analysis.hidden_costs ?? [],
      recommended_for: analysis.recommended_for ?? [],
      avg_price_estimate: analysis.avg_price_estimate ?? null,
      summary: analysis.summary ?? null,
      analyzed_at: new Date().toISOString(),
      min_price: minPrice,
      subway_station: analysis.subway_station ?? null,
      subway_line: analysis.subway_line ?? null,
      walk_minutes: analysis.walk_minutes ?? null,
      parking_capacity: analysis.parking_capacity ?? null,
      parking_location: analysis.parking_location ?? null,
      // differentiation (all categories)
      avg_total_estimate: analysis.avg_total_estimate ?? null,
      hidden_cost_tags:
        analysis.hidden_cost_tags && analysis.hidden_cost_tags.length > 0
          ? analysis.hidden_cost_tags
          : null,
      refund_warning: analysis.refund_warning ?? null,
      ownership_change_recent: analysis.ownership_change_recent ?? null,
      weekend_premium_pct: analysis.weekend_premium_pct ?? null,
      peak_season_months:
        analysis.peak_season_months && analysis.peak_season_months.length > 0
          ? analysis.peak_season_months
          : null,
      closed_days: analysis.closed_days ?? null,
      // wedding_hall (venue-level)
      hall_styles: only(["wedding_hall"], analysis.hall_styles ?? null),
      meal_types: only(["wedding_hall"], analysis.meal_types ?? null),
      min_guarantee: only(["wedding_hall"], analysis.min_guarantee ?? null),
      max_guarantee: only(["wedding_hall"], analysis.max_guarantee ?? null),
      // wedding_hall (per-hall 1:N) — guarantee at least 1 hall row by
      // synthesizing a default from the venue itself when Gemini found none.
      // The default uses the venue name + venue-level guarantees so the venue
      // still appears in place_halls queries; vendor input can refine later.
      halls:
        cat === "wedding_hall"
          ? analysis.halls && analysis.halls.length > 0
            ? analysis.halls
            : [
                {
                  hall_name: c.name,
                  hall_type: "홀",
                  capacity_seated: null,
                  capacity_standing: null,
                  min_guarantee: analysis.min_guarantee ?? null,
                  max_guarantee: analysis.max_guarantee ?? null,
                  meal_price: analysis.avg_price_estimate?.min ?? null,
                  meal_type:
                    analysis.meal_types && analysis.meal_types.length > 0
                      ? analysis.meal_types[0]
                      : null,
                  floor: null,
                },
              ]
          : null,
      // studio
      shoot_styles: only(["studio"], analysis.shoot_styles ?? null),
      includes_originals: only(["studio"], analysis.includes_originals ?? null),
      raw_file_extra_cost: only(["studio"], analysis.raw_file_extra_cost ?? null),
      per_retouch_cost: only(["studio"], analysis.per_retouch_cost ?? null),
      album_extra_cost: only(["studio"], analysis.album_extra_cost ?? null),
      base_shoot_hours: only(["studio"], analysis.base_shoot_hours ?? null),
      base_retouch_count: only(["studio"], analysis.base_retouch_count ?? null),
      author_tiers: only(["studio"], analysis.author_tiers ?? null),
      // dress_shop
      dress_styles: only(["dress_shop"], analysis.dress_styles ?? null),
      rental_only: only(["dress_shop"], analysis.rental_only ?? null),
      // makeup_shop
      makeup_styles: only(["makeup_shop"], analysis.makeup_styles ?? null),
      includes_rehearsal: only(["makeup_shop"], analysis.includes_rehearsal ?? null),
      // hanbok
      hanbok_types: only(["hanbok"], analysis.hanbok_types ?? null),
      // tailor_shop also uses suit_styles
      suit_styles: only(["tailor_shop"], analysis.suit_styles ?? null),
      // hanbok + tailor_shop both use custom_available
      custom_available: only(["hanbok", "tailor_shop"], analysis.custom_available ?? null),
      // honeymoon
      destinations: only(["honeymoon"], analysis.destinations ?? null),
      duration_days: only(["honeymoon"], analysis.duration_days ?? null),
      // appliance
      brand_options: only(["appliance"], analysis.brand_options ?? null),
      product_categories: only(["appliance"], analysis.product_categories ?? null),
      // invitation_venue
      venue_types: only(["invitation_venue"], analysis.venue_types ?? null),
      capacity_min: only(["invitation_venue"], analysis.capacity_min ?? null),
      capacity_max: only(["invitation_venue"], analysis.capacity_max ?? null),
    };
    enhanced.confidence = scoreConfidence(enhanced);
    enriched.push(enhanced);
    console.log(
      `${analysis.price_tier ?? "?"} | conf=${enhanced.confidence} | snippet=${snippets.length}`
    );
  }

  return enriched;
}

async function main() {
  const args = parseArgs();

  // --from-snapshot bypasses Stage 1-3 entirely. It just reads a previously
  // saved JSON dump and replays the upsert. Useful when a prior run analyzed
  // hundreds of shops via Gemini but the upsert failed (e.g. DB constraint).
  if (args.fromSnapshot) {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
      process.exit(1);
    }
    const items = loadSnapshot(args.fromSnapshot);
    console.log(`[snapshot] loaded ${items.length} items from ${args.fromSnapshot}`);
    const result = await upsertPlaces(items, {
      url: process.env.SUPABASE_URL!,
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    });
    console.log(
      `\nupserted: ${result.inserted} new + ${result.updated} updated (failed: ${result.failed})`
    );
    return;
  }

  if (!process.env.NAVER_CLIENT_ID || !process.env.NAVER_CLIENT_SECRET) {
    console.error("Missing NAVER_CLIENT_ID or NAVER_CLIENT_SECRET");
    process.exit(1);
  }
  if (!args.noAnalyze && !process.env.GEMINI_API_KEY) {
    console.error("Missing GEMINI_API_KEY (use --no-analyze to skip)");
    process.exit(1);
  }
  if (!args.dryRun && (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY)) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (use --dry-run to skip)");
    process.exit(1);
  }

  const cats: CategoryLabel[] =
    args.category === "all" ? (Object.keys(CATEGORIES) as CategoryLabel[]) : [args.category];

  const all: CollectedPlace[] = [];
  for (const c of cats) {
    const items = await processCategory(c, args);
    const avg = items.reduce((s, x) => s + x.confidence, 0) / Math.max(1, items.length);
    console.log(`\n[${c}] 완료: ${items.length}개 (avg conf ${avg.toFixed(0)})`);
    items.forEach((it) => {
      const price = it.price_tier ? ` ${it.price_tier}` : "";
      const atmos = it.atmosphere && it.atmosphere.length > 0 ? ` [${it.atmosphere.slice(0, 2).join(",")}]` : "";
      console.log(
        `  · ${it.name} (${it.city ?? "?"} ${it.district ?? ""}) conf=${it.confidence}${price}${atmos}`
      );
    });
    all.push(...items);
  }

  if (args.dryRun) {
    console.log(`\n[dry-run] would upsert ${all.length} rows`);
    return;
  }

  // Snapshot before upsert so a DB failure (e.g. CHECK constraint, RLS, network)
  // doesn't waste the Gemini analysis cost. Replay later with --from-snapshot=<path>.
  const snapshotLabel = args.category === "all" ? "all" : args.category;
  const snapshotPath = saveSnapshot(snapshotLabel, all);
  console.log(`\n[snapshot] saved ${all.length} items → ${snapshotPath}`);

  const result = await upsertPlaces(all, {
    url: process.env.SUPABASE_URL!,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  });
  console.log(
    `\nupserted: ${result.inserted} new + ${result.updated} updated (failed: ${result.failed})`
  );
  if (result.failed > 0) {
    console.log(`[recovery] retry the failed upsert with: --from-snapshot=${snapshotPath}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
