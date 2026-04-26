#!/usr/bin/env tsx
// Collects YouTube wedding tip videos per category and upserts into tip_videos.
//
// Pipeline:
//   for each category:
//     for each seed query:
//       searchVideos(query) → list of (videoId, snippet, thumbnail)
//   pool unique videoIds across categories
//   fetchVideoStats(allVideoIds) one batch (1 quota unit per 50 IDs)
//   upsert by video_id; categories array merged so the same video can serve
//   multiple tabs (e.g. 결혼 준비 일반 영상은 'general' + 'wedding_hall').
//
// Usage:
//   npm run collect-tips                          # all categories
//   npm run collect-tips -- --category=hanbok     # single
//   npm run collect-tips -- --per-query=5         # cap per query
//   npm run collect-tips -- --dry-run             # don't write

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { searchVideos, fetchVideoStats } from "./youtube";
import { TIP_QUERIES, TIP_CATEGORIES, type TipCategory } from "./queries";

interface Args {
  category?: TipCategory;
  perQuery: number;
  dryRun: boolean;
}

function parseArgs(): Args {
  const args: Args = { perQuery: 8, dryRun: false };
  for (const a of process.argv.slice(2)) {
    if (a === "--dry-run") args.dryRun = true;
    else if (a.startsWith("--category=")) args.category = a.split("=")[1] as TipCategory;
    else if (a.startsWith("--per-query=")) args.perQuery = +a.split("=")[1];
  }
  return args;
}

interface CollectedVideo {
  video_id: string;
  title: string;
  channel_name: string;
  channel_id: string;
  thumbnail_url: string;
  published_at: string;
  description: string;
  categories: Set<string>;
  search_query: string;
}

async function main() {
  const args = parseArgs();
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    console.error("Missing YOUTUBE_API_KEY");
    process.exit(1);
  }
  if (!args.dryRun && (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY)) {
    console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (use --dry-run to skip)");
    process.exit(1);
  }

  const cats = args.category ? [args.category] : TIP_CATEGORIES;
  console.log(`\n[collect-tips] categories=${cats.length}, per-query=${args.perQuery}, dry-run=${args.dryRun}`);

  // Pool by video_id; merge categories if found in multiple searches.
  const pool = new Map<string, CollectedVideo>();

  for (const cat of cats) {
    const queries = TIP_QUERIES[cat];
    console.log(`\n[${cat}] ${queries.length} queries`);
    for (const q of queries) {
      process.stdout.write(`  · "${q}" ... `);
      try {
        const items = await searchVideos(q, apiKey, args.perQuery);
        for (const it of items) {
          const existing = pool.get(it.videoId);
          if (existing) {
            existing.categories.add(cat);
            continue;
          }
          pool.set(it.videoId, {
            video_id: it.videoId,
            title: it.title,
            channel_name: it.channelTitle,
            channel_id: it.channelId,
            thumbnail_url: it.thumbnailUrl,
            published_at: it.publishedAt,
            description: it.description,
            categories: new Set([cat]),
            search_query: q,
          });
        }
        console.log(`+${items.length}`);
      } catch (e) {
        console.log(`error: ${(e as Error).message.slice(0, 100)}`);
      }
    }
  }

  console.log(`\n[collect-tips] pooled ${pool.size} unique videos`);
  if (pool.size === 0) return;

  // Enrich with stats (view/like/duration) — 1 batched call per 50 videos.
  const ids = Array.from(pool.keys());
  console.log(`[collect-tips] fetching stats for ${ids.length} videos…`);
  const stats = await fetchVideoStats(ids, apiKey);

  const rows = Array.from(pool.values()).map((v) => {
    const s = stats.get(v.video_id);
    return {
      video_id: v.video_id,
      title: v.title,
      channel_name: v.channel_name,
      channel_id: v.channel_id,
      thumbnail_url: v.thumbnail_url,
      duration_seconds: s?.durationSeconds ?? null,
      view_count: s?.viewCount ?? 0,
      like_count: s?.likeCount ?? 0,
      published_at: v.published_at,
      description: v.description,
      categories: Array.from(v.categories),
      search_query: v.search_query,
      collected_at: new Date().toISOString(),
      is_active: true,
    };
  });

  // Top-5 preview
  rows
    .sort((a, b) => b.view_count - a.view_count)
    .slice(0, 5)
    .forEach((r) =>
      console.log(`  · ${r.view_count.toLocaleString()}회 [${r.categories.join(",")}] ${r.title.slice(0, 50)}`)
    );

  if (args.dryRun) {
    console.log(`\n[dry-run] would upsert ${rows.length} rows`);
    return;
  }

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
  const { error } = await supabase
    .from("tip_videos")
    .upsert(rows, { onConflict: "video_id", ignoreDuplicates: false });
  if (error) {
    console.error("upsert failed:", error.message);
    process.exit(1);
  }
  console.log(`\nupserted: ${rows.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
