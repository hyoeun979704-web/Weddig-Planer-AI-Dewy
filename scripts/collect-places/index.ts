#!/usr/bin/env tsx
import "dotenv/config";
import { CATEGORIES, CategoryLabel, seedQueries } from "./utils/categories";
import { searchAll } from "./sources/naver";
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
}

function parseArgs(): CliArgs {
  const args: CliArgs = { category: "all", limit: 10, dryRun: false };
  for (const a of process.argv.slice(2)) {
    if (a === "--all") args.category = "all";
    else if (a === "--dry-run") args.dryRun = true;
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

async function processCategory(label: CategoryLabel, args: CliArgs): Promise<CollectedPlace[]> {
  const env = {
    naver: {
      clientId: process.env.NAVER_CLIENT_ID!,
      clientSecret: process.env.NAVER_CLIENT_SECRET!,
    },
    geminiKey: process.env.GEMINI_API_KEY!,
  };

  const queries = seedQueries(label, args.region);
  console.log(`\n[${label}] ${queries.length} seed queries`);

  // Group up to 5 snippets per business candidate. Heuristic: first searchAll snippets
  // are aggregated into LLM prompts in batches.
  const candidates: CollectedPlace[] = [];

  for (const query of queries) {
    if (candidates.length >= args.limit * 4) break; // collect 4x raw, dedupe to limit
    const { blog, cafe, local } = await searchAll(query, env.naver, {
      months: 24,
      perSource: 5,
    });
    const allSnippets = [...blog, ...cafe];
    if (allSnippets.length === 0 && local.length === 0) continue;

    // Use Gemini on top 3 snippets
    const top = allSnippets.slice(0, 3);
    if (top.length === 0) continue;

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

    if (!extracted || !extracted.is_business_listing || !extracted.name) continue;

    const refs: SourceRef[] = top.map((s) => ({
      url: s.link,
      source_type: s.source,
      published_at: postdateToIso(s.postdate),
    }));

    // Match against local results for this query
    const localMatch = local.find((l) =>
      l.title.toLowerCase().includes((extracted.name ?? "").toLowerCase()) ||
      (extracted.name ?? "").toLowerCase().includes(l.title.toLowerCase())
    );
    if (localMatch) {
      refs.push({
        url: localMatch.link || "",
        source_type: "local",
        published_at: null,
      });
    }

    // Optional: validate official site
    let officialOk = false;
    let officialImage: string | null = null;
    if (extracted.official_url) {
      try {
        const info = await checkOfficialSite(extracted.official_url, extracted.name);
        if (info.ok && info.hasNameMatch) {
          officialOk = true;
          officialImage = info.ogImage;
          refs.push({
            url: extracted.official_url,
            source_type: "official",
            published_at: null,
          });
        }
      } catch {
        // ignore
      }
    }

    const lastSourceDate = refs
      .map((r) => r.published_at)
      .filter((x): x is string => !!x)
      .sort()
      .reverse()[0] ?? null;

    const dataSource =
      officialOk && (refs.some((r) => r.source_type === "blog" || r.source_type === "cafe"))
        ? "mixed"
        : officialOk
          ? "official"
          : refs[0]?.source_type ?? "blog";

    const place: CollectedPlace = {
      name: extracted.name,
      category: CATEGORIES[label],
      city:
        extracted.city ??
        (localMatch ? (localMatch.address || "").split(" ")[0] : null),
      district:
        extracted.district ??
        (localMatch ? (localMatch.address || "").split(" ")[1] ?? null : null),
      description: extracted.description,
      main_image_url: officialImage,
      tags: extracted.tags ?? [],
      lat: localMatch ? +localMatch.mapy / 1e7 : null,
      lng: localMatch ? +localMatch.mapx / 1e7 : null,
      data_source: dataSource,
      confidence: 0,
      last_source_date: lastSourceDate,
      source_refs: refs,
    };

    candidates.push(place);
  }

  const merged = dedupe(candidates).map((p) => ({
    ...p,
    confidence: scoreConfidence(p),
  }));

  // Sort by confidence desc, take top N
  merged.sort((a, b) => b.confidence - a.confidence);
  return merged.slice(0, args.limit);
}

async function main() {
  const args = parseArgs();

  if (!process.env.NAVER_CLIENT_ID || !process.env.NAVER_CLIENT_SECRET) {
    console.error("Missing NAVER_CLIENT_ID or NAVER_CLIENT_SECRET in env");
    process.exit(1);
  }
  if (!process.env.GEMINI_API_KEY) {
    console.error("Missing GEMINI_API_KEY");
    process.exit(1);
  }
  if (!args.dryRun && (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY)) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (use --dry-run to skip)");
    process.exit(1);
  }

  const cats: CategoryLabel[] =
    args.category === "all"
      ? (Object.keys(CATEGORIES) as CategoryLabel[])
      : [args.category];

  const all: CollectedPlace[] = [];
  for (const c of cats) {
    const items = await processCategory(c, args);
    console.log(`[${c}] collected ${items.length} (avg conf ${(items.reduce((s, x) => s + x.confidence, 0) / Math.max(1, items.length)).toFixed(0)})`);
    items.forEach((it) => console.log(`  · ${it.name} (${it.city ?? "?"} ${it.district ?? ""}) conf=${it.confidence}`));
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
