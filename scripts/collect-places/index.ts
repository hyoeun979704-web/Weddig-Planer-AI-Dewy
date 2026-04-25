#!/usr/bin/env tsx
import "dotenv/config";
import { CATEGORIES, CategoryLabel, seedQueries } from "./utils/categories";
import { searchAll, searchLocal, type LocalItem } from "./sources/naver";
import { extractPlace } from "./sources/gemini";
import { checkOfficialSite } from "./sources/officialSite";
import { dedupe } from "./dedupe";
import { scoreConfidence } from "./scoring";
import { upsertPlaces } from "./upsert";
import type { CollectedPlace, SourceRef } from "./types";

interface CliArgs {
  category: CategoryLabel | "all";
  region?: string;
  limit: number;
  dryRun: boolean;
  useLLM: boolean;
}

function parseArgs(): CliArgs {
  const args: CliArgs = { category: "all", limit: 10, dryRun: false, useLLM: false };
  for (const a of process.argv.slice(2)) {
    if (a === "--all") args.category = "all";
    else if (a === "--dry-run") args.dryRun = true;
    else if (a === "--llm") args.useLLM = true;
    else if (a.startsWith("--category=")) args.category = a.split("=")[1] as CategoryLabel;
    else if (a.startsWith("--region=")) args.region = a.split("=")[1];
    else if (a.startsWith("--limit=")) args.limit = +a.split("=")[1];
  }
  return args;
}

function postdateToIso(yyyymmdd?: string): string | null {
  if (!yyyymmdd || yyyymmdd.length !== 8) return null;
  return `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`;
}

const stripTags = (s: string) => s.replace(/<\/?[^>]+>/g, "").trim();

function localToCandidate(l: LocalItem, label: CategoryLabel): CollectedPlace {
  const cleanTitle = stripTags(l.title);
  const addr = l.roadAddress || l.address || "";
  const parts = addr.split(/\s+/);
  const city = parts[0] || null;
  const district = parts[1] || null;
  const lat = l.mapy ? +l.mapy / 1e7 : null;
  const lng = l.mapx ? +l.mapx / 1e7 : null;
  return {
    name: cleanTitle,
    category: CATEGORIES[label],
    city,
    district,
    description: l.category || null,
    main_image_url: null,
    tags: l.category ? l.category.split(">").map((t) => t.trim()).filter(Boolean) : [],
    lat,
    lng,
    data_source: "local",
    confidence: 0, // computed later
    last_source_date: null,
    source_refs: [
      { url: l.link || "", source_type: "local", published_at: null },
    ],
  };
}

async function processCategory(label: CategoryLabel, args: CliArgs): Promise<CollectedPlace[]> {
  const env = {
    naver: {
      clientId: process.env.NAVER_CLIENT_ID!,
      clientSecret: process.env.NAVER_CLIENT_SECRET!,
    },
    geminiKey: process.env.GEMINI_API_KEY!,
  };

  const queries = seedQueries(label, args.region);
  console.log(`\n[${label}] ${queries.length} seed queries  (LLM ${args.useLLM ? "ON" : "OFF"})`);

  const candidates: CollectedPlace[] = [];

  for (let qi = 0; qi < queries.length; qi++) {
    const query = queries[qi];
    if (candidates.length >= args.limit * 5) break;
    process.stdout.write(`  · [${qi + 1}/${queries.length}] ${query} ... `);

    if (!args.useLLM) {
      // Local-only path: cheap, no LLM, no daily quota worries
      try {
        const local = await searchLocal(query, env.naver, 5);
        const items = local.map((l) => localToCandidate(l, label));
        candidates.push(...items);
        console.log(`+${items.length} local`);
      } catch (e) {
        console.log(`error: ${(e as Error).message}`);
      }
      continue;
    }

    // LLM-enriched path (kept for future when quota allows)
    const { blog, cafe, local } = await searchAll(query, env.naver, {
      months: 24,
      perSource: 5,
    });
    const allSnippets = [...blog, ...cafe];
    if (allSnippets.length === 0 && local.length === 0) {
      console.log("no results");
      continue;
    }

    const top = allSnippets.slice(0, 3);
    if (top.length === 0) {
      // fall back to local-only for this query
      const items = local.map((l) => localToCandidate(l, label));
      candidates.push(...items);
      console.log(`+${items.length} local (no blog)`);
      continue;
    }

    const extracted = await extractPlace(
      {
        category_label: label,
        snippets: top.map((s) => ({
          source: s.source,
          title: s.title,
          description: s.description,
          link: s.link,
          postdate: s.postdate,
        })),
      },
      env.geminiKey
    );

    if (!extracted || !extracted.is_business_listing || !extracted.name) {
      console.log("skip (no business)");
      // still keep local results
      const items = local.map((l) => localToCandidate(l, label));
      candidates.push(...items);
      continue;
    }
    console.log(`→ ${extracted.name}`);

    const refs: SourceRef[] = top.map((s) => ({
      url: s.link,
      source_type: s.source,
      published_at: postdateToIso(s.postdate),
    }));

    const localMatch = local.find(
      (l) =>
        stripTags(l.title).toLowerCase().includes(extracted.name!.toLowerCase()) ||
        extracted.name!.toLowerCase().includes(stripTags(l.title).toLowerCase())
    );
    if (localMatch) refs.push({ url: localMatch.link || "", source_type: "local", published_at: null });

    let officialOk = false;
    let officialImage: string | null = null;
    if (extracted.official_url) {
      try {
        const info = await checkOfficialSite(extracted.official_url, extracted.name);
        if (info.ok && info.hasNameMatch) {
          officialOk = true;
          officialImage = info.ogImage;
          refs.push({ url: extracted.official_url, source_type: "official", published_at: null });
        }
      } catch {}
    }

    const lastSourceDate =
      refs.map((r) => r.published_at).filter((x): x is string => !!x).sort().reverse()[0] ?? null;

    const dataSource =
      officialOk && refs.some((r) => r.source_type === "blog" || r.source_type === "cafe")
        ? "mixed"
        : officialOk
          ? "official"
          : refs[0]?.source_type ?? "blog";

    candidates.push({
      name: extracted.name,
      category: CATEGORIES[label],
      city: extracted.city ?? (localMatch ? (localMatch.address || "").split(" ")[0] : null),
      district:
        extracted.district ?? (localMatch ? (localMatch.address || "").split(" ")[1] ?? null : null),
      description: extracted.description,
      main_image_url: officialImage,
      tags: extracted.tags ?? [],
      lat: localMatch ? +localMatch.mapy / 1e7 : null,
      lng: localMatch ? +localMatch.mapx / 1e7 : null,
      data_source: dataSource,
      confidence: 0,
      last_source_date: lastSourceDate,
      source_refs: refs,
    });
  }

  const merged = dedupe(candidates).map((p) => ({ ...p, confidence: scoreConfidence(p) }));
  merged.sort((a, b) => b.confidence - a.confidence);
  return merged.slice(0, args.limit);
}

async function main() {
  const args = parseArgs();

  if (!process.env.NAVER_CLIENT_ID || !process.env.NAVER_CLIENT_SECRET) {
    console.error("Missing NAVER_CLIENT_ID or NAVER_CLIENT_SECRET in env");
    process.exit(1);
  }
  if (args.useLLM && !process.env.GEMINI_API_KEY) {
    console.error("Missing GEMINI_API_KEY (--llm requires it)");
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
    console.log(`[${c}] collected ${items.length} (avg conf ${avg.toFixed(0)})`);
    items.forEach((it) =>
      console.log(`  · ${it.name} (${it.city ?? "?"} ${it.district ?? ""}) conf=${it.confidence}`)
    );
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
