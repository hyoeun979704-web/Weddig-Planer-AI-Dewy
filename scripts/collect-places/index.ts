#!/usr/bin/env tsx
import "dotenv/config";
import { CATEGORIES, CategoryLabel, seedQueries } from "./utils/categories";
import {
  searchLocal,
  searchBlog,
  searchCafe,
  type LocalItem,
  type BlogItem,
} from "./sources/naver";
import { analyzeBusiness } from "./sources/analyzer";
import { dedupe } from "./dedupe";
import { scoreConfidence } from "./scoring";
import { upsertPlaces } from "./upsert";
import type { CollectedPlace, SourceRef } from "./types";

interface CliArgs {
  category: CategoryLabel | "all";
  region?: string;
  limit: number;
  dryRun: boolean;
  noAnalyze: boolean; // skip Stage 3 LLM analysis
  reviewSnippets: number; // per-business snippet target
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
  }
  return args;
}

const stripTags = (s: string) => s.replace(/<\/?[^>]+>/g, "").trim();

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
      const items = local.map((l) => localToCandidate(l, label));
      candidates.push(...items);
      console.log(`+${items.length}`);
    } catch (e) {
      console.log(`error: ${(e as Error).message.slice(0, 80)}`);
    }
  }
  return dedupe(candidates);
}

// Stage 2: For each candidate, gather review snippets from blog/cafe.
async function gatherSnippets(
  c: CollectedPlace,
  env: NaverEnv,
  target: number
): Promise<BlogItem[]> {
  const queries = [
    `${c.name} 후기`,
    `${c.name} 추천`,
    `${c.name} 가격`,
  ];
  const snippets: BlogItem[] = [];
  const seen = new Set<string>();
  for (const q of queries) {
    if (snippets.length >= target) break;
    const need = Math.min(20, target - snippets.length);
    const [blog, cafe] = await Promise.all([
      searchBlog(q, env, { months: 24, limit: need }).catch(() => []),
      searchCafe(q, env, { months: 24, limit: need }).catch(() => []),
    ]);
    for (const it of [...blog, ...cafe]) {
      if (seen.has(it.link)) continue;
      seen.add(it.link);
      snippets.push(it);
      if (snippets.length >= target) break;
    }
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
      console.log("스니펫 0개, 분석 스킵");
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

    // Derive native columns: min_price from per_person estimate, guarantees for wedding_hall
    const isWeddingHall = c.category === "wedding_hall";
    const minPrice =
      analysis.avg_price_estimate?.unit === "per_person"
        ? analysis.avg_price_estimate.min
        : null;

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
      min_guarantee: isWeddingHall ? analysis.min_guarantee ?? null : null,
      max_guarantee: isWeddingHall ? analysis.max_guarantee ?? null : null,
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
  const result = await upsertPlaces(all, {
    url: process.env.SUPABASE_URL!,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  });
  console.log(`\nupserted: ${result.inserted}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
