#!/usr/bin/env tsx
// Re-fetch source_refs for places where the array is empty/null. The seed
// import populated places.* but not source_refs, so trust-signal queries
// (homepage / Instagram present?) returned false negatives for famous
// venues like 더베뉴지서울. Hits Naver Local once per place with the exact
// name + region; takes the first matching item's link as the canonical
// homepage URL.
//
// Usage:
//   npm run enrich-source-refs                       # all categories
//   npm run enrich-source-refs -- --category=웨딩홀  # one category
//   npm run enrich-source-refs -- --limit=50         # cap
//   npm run enrich-source-refs -- --dry-run          # don't write

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { searchLocal, type LocalItem } from "./sources/naver";
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

const stripTags = (s: string) => s.replace(/<\/?[^>]+>/g, "").trim();

// "베어트리파크 블리스가든" matches "베어트리파크블리스가든" — Naver's title
// often differs in spacing/punctuation, so compare with whitespace stripped.
function nameMatches(a: string, b: string): boolean {
  const norm = (s: string) => s.replace(/\s+/g, "").toLowerCase();
  return norm(a) === norm(b) || norm(a).includes(norm(b)) || norm(b).includes(norm(a));
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
    `\n[enrich-source-refs] category=${args.category ?? "all"} limit=${args.limit} dry-run=${args.dryRun}`
  );

  // Targets: rows where source_refs is null or an empty array.
  let q = supabase
    .from("places")
    .select("place_id, name, category, city, district, source_refs")
    .eq("is_active", true)
    .is("deleted_at", null);
  if (placeCategory) q = q.eq("category", placeCategory);

  const { data: rows, error } = await q.limit(args.limit);
  if (error) {
    console.error("places query failed:", error.message);
    process.exit(1);
  }
  const targets = (rows ?? []).filter(
    (r) => !Array.isArray(r.source_refs) || (r.source_refs as unknown[]).length === 0
  );
  console.log(`[enrich-source-refs] ${targets.length} places with empty source_refs`);

  let enriched = 0;
  let stillEmpty = 0;
  for (let i = 0; i < targets.length; i++) {
    const p = targets[i];
    const region = [p.city, p.district].filter(Boolean).join(" ");
    const query = `${p.name} ${region}`.trim();
    process.stdout.write(`  · [${i + 1}/${targets.length}] ${p.name} ... `);

    const local: LocalItem[] = await searchLocal(query, naverEnv, 5).catch(() => []);
    const match =
      local.find((l) => nameMatches(stripTags(l.title), p.name)) ?? local[0] ?? null;

    if (!match || !match.link) {
      console.log("no match");
      stillEmpty++;
      continue;
    }

    const newRefs = [
      {
        url: match.link,
        source_type: "local",
        published_at: null,
      },
    ];

    if (args.dryRun) {
      console.log(`would set: ${match.link.slice(0, 60)}…`);
      enriched++;
      continue;
    }

    const { error: updateErr } = await supabase
      .from("places")
      .update({ source_refs: newRefs })
      .eq("place_id", p.place_id);

    if (updateErr) {
      console.log(`update failed: ${updateErr.message.slice(0, 60)}`);
      stillEmpty++;
    } else {
      console.log(`✓ ${match.link.slice(0, 60)}…`);
      enriched++;
    }
  }

  console.log(`\n[enrich-source-refs] enriched=${enriched} stillEmpty=${stillEmpty}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
