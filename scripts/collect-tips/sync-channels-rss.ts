#!/usr/bin/env tsx
// 일일 RSS 기반 채널 sync — quota 거의 0 (videos.list batch 만 1-5 units).
//
// 흐름:
//   tip_channels (is_active) 전체 로드
//   for each: fetchChannelRss → 후보 영상 ~15개
//   기존 tip_videos.video_id 와 dedup → 신규 ID 만 남김
//   videos.list batch 으로 duration / view / like enrich (50 IDs / 1 unit)
//   classify (title+description+channel) → tip_videos upsert
//   tip_channels.last_synced_at / last_sync_new_videos / video_count 갱신
//
// 사용:
//   npm run sync-channels                 # 전체 active 채널
//   npm run sync-channels -- --limit=20   # 일부만 (테스트용)
//   npm run sync-channels -- --dry-run    # 쓰기 없음

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { fetchChannelRss, type RssVideo } from "./rss";
import { fetchVideoStats } from "./youtube";
import { fetchTranscript } from "./transcript";
import { TIP_CATEGORIES } from "./queries";
import { normalizeTipCategories } from "../../src/lib/tipNormalize";
import { classifyTipCategories, buildClassifyText } from "../../src/lib/tipClassify";

interface Args {
  limit: number | null;
  dryRun: boolean;
}

function parseArgs(): Args {
  const args: Args = { limit: null, dryRun: false };
  for (const a of process.argv.slice(2)) {
    if (a === "--dry-run") args.dryRun = true;
    else if (a.startsWith("--limit=")) args.limit = +a.split("=")[1];
  }
  return args;
}

interface ChannelRow {
  channel_id: string;
  channel_name: string;
  video_count: number;
}

async function main(): Promise<void> {
  const args = parseArgs();
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    console.error(
      "Missing YOUTUBE_API_KEY (stats enrich 에 필요 — RSS 자체는 무료지만 view/like/duration 은 videos.list 필요)",
    );
    process.exit(1);
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } },
  );

  // last_synced_at 오래된 채널 우선 (NULLS FIRST = 한 번도 sync 안 된 채널 최우선).
  let q = supabase
    .from("tip_channels")
    .select("channel_id, channel_name, video_count")
    .eq("is_active", true)
    .order("last_synced_at", { ascending: true, nullsFirst: true });
  if (args.limit) q = q.limit(args.limit);
  const { data: channels, error: chErr } = await q;
  if (chErr) {
    console.error("tip_channels load failed:", chErr.message);
    process.exit(1);
  }
  const targets = (channels ?? []) as ChannelRow[];
  console.log(`\n[sync-channels-rss] channels=${targets.length}, dry-run=${args.dryRun}`);
  if (targets.length === 0) return;

  // 기존 video_id set — dedup 용. tip_videos 가 커지면 단순 LIMIT 없는 SELECT 가
  // 무거워질 수 있으나, 현재 800 행 수준이고 RSS 가 채널당 15 ID 만 주므로 충분.
  // 1만 행 넘어가면 server-side anti-join 으로 전환.
  const { data: existing, error: exErr } = await supabase
    .from("tip_videos")
    .select("video_id");
  if (exErr) {
    console.error("tip_videos load failed:", exErr.message);
    process.exit(1);
  }
  const seen = new Set<string>((existing ?? []).map((r: { video_id: string }) => r.video_id));
  console.log(`[sync-channels-rss] existing video_ids: ${seen.size}`);

  // 채널별 RSS 수집 — 모든 후보 풀에 모음.
  const pool = new Map<string, RssVideo>();
  const channelStats = new Map<
    string,
    { name: string; fetched: number; novel: number; error?: string }
  >();

  for (const ch of targets) {
    try {
      const entries = await fetchChannelRss(ch.channel_id);
      const novel = entries.filter((e) => !seen.has(e.videoId));
      for (const v of novel) pool.set(v.videoId, v);
      channelStats.set(ch.channel_id, {
        name: ch.channel_name,
        fetched: entries.length,
        novel: novel.length,
      });
      process.stdout.write(`  · ${ch.channel_name} +${novel.length}/${entries.length}\n`);
    } catch (e) {
      const msg = (e as Error).message.slice(0, 100);
      channelStats.set(ch.channel_id, {
        name: ch.channel_name,
        fetched: 0,
        novel: 0,
        error: msg,
      });
      process.stdout.write(`  · ${ch.channel_name} error: ${msg}\n`);
    }
  }

  console.log(`\n[sync-channels-rss] novel candidates: ${pool.size}`);

  let rows: Array<Record<string, unknown>> = [];
  let uncategorized = 0;

  if (pool.size > 0) {
    // Stats enrich: video.list 는 50 IDs / 1 unit. snippet 추가는 무료.
    const ids = Array.from(pool.keys());
    console.log(`[sync-channels-rss] fetching stats for ${ids.length} videos…`);
    const stats = await fetchVideoStats(ids, apiKey);

    // Round 21 — 자막 fetch (quota 0). 자막 있는 영상에서만 분류 입력 강화.
    console.log(`[sync-channels-rss] fetching transcripts…`);
    const transcripts = new Map<string, string>();
    let withTranscript = 0;
    for (const id of ids) {
      const t = await fetchTranscript(id);
      transcripts.set(id, t);
      if (t) withTranscript++;
    }
    console.log(`[sync-channels-rss] transcripts: ${withTranscript}/${ids.length}`);

    rows = Array.from(pool.values()).map((v) => {
      const s = stats.get(v.videoId);
      const transcript = transcripts.get(v.videoId) ?? "";
      // 분류 입력: 표준 helper 사용 — index/reclassify 와 순서·구성 동일.
      const fullDesc = s?.fullDescription || v.description || "";
      const classifyText = buildClassifyText({
        title: v.title,
        description: fullDesc,
        tags: s?.tags,
        transcript,
        channelName: v.channelTitle,
      });
      const categories = normalizeTipCategories(
        classifyTipCategories(classifyText, TIP_CATEGORIES),
      );
      if (categories.length === 0) uncategorized++;
      return {
        video_id: v.videoId,
        title: v.title,
        channel_name: v.channelTitle,
        channel_id: v.channelId,
        thumbnail_url: v.thumbnailUrl,
        duration_seconds: s?.durationSeconds ?? null,
        view_count: s?.viewCount ?? v.viewCountFromFeed ?? 0,
        like_count: s?.likeCount ?? 0,
        published_at: v.publishedAt,
        description: fullDesc,
        categories,
        tags: s?.tags ?? [],
        search_query: "rss-sync",
        collected_at: new Date().toISOString(),
        // Round 21 — 분류 0개 = off-topic 으로 간주, is_active=false 로 저장하여
        // UI 에서 자동 차단. video_id PK 충돌이 idempotent 가드.
        is_active: categories.length > 0,
      };
    });

    console.log(
      `[sync-channels-rss] classified ${rows.length - uncategorized}/${rows.length}` +
        ` (${uncategorized} uncategorized)`,
    );

    rows
      .sort((a, b) => (b.view_count as number) - (a.view_count as number))
      .slice(0, 5)
      .forEach((r) =>
        console.log(
          `  · ${(r.view_count as number).toLocaleString()}회 [${
            (r.categories as string[]).join(",")
          }] ${(r.title as string).slice(0, 50)}`,
        ),
      );
  }

  if (args.dryRun) {
    console.log(`\n[dry-run] would upsert ${rows.length} videos, ${targets.length} channel rows`);
    return;
  }

  // 1) 신규 video upsert
  if (rows.length > 0) {
    const { error: upErr } = await supabase
      .from("tip_videos")
      .upsert(rows, { onConflict: "video_id", ignoreDuplicates: false });
    if (upErr) {
      console.error("tip_videos upsert failed:", upErr.message);
      process.exit(1);
    }
    console.log(`upserted videos: ${rows.length}`);
  }

  // 2) tip_channels 메타 갱신 — last_synced_at / last_sync_new_videos / error + video_count 증분.
  //    NOT NULL 컬럼(channel_name) 누락 회피 위해 한 번의 upsert 로 모든 필드 묶음.
  //    video_count 는 기존 값 + 이번 sync 의 신규 분류 영상 수로 계산.
  const now = new Date().toISOString();
  const inc = new Map<string, number>();
  for (const r of rows) {
    const cid = r.channel_id as string | null;
    if (cid) inc.set(cid, (inc.get(cid) ?? 0) + 1);
  }
  const channelUpdates = Array.from(channelStats.entries()).map(([channel_id, st]) => ({
    channel_id,
    channel_name: st.name,
    last_synced_at: now,
    last_sync_new_videos: st.novel,
    last_sync_error: st.error ?? null,
    // 채널 기존 video_count (targets 에서 조회한 값) + 이번 신규 분.
    video_count:
      (targets.find((t) => t.channel_id === channel_id)?.video_count ?? 0) +
      (inc.get(channel_id) ?? 0),
  }));

  const { error: chUpErr } = await supabase
    .from("tip_channels")
    .upsert(channelUpdates, { onConflict: "channel_id", ignoreDuplicates: false });
  if (chUpErr) {
    console.error("tip_channels upsert failed:", chUpErr.message);
  } else {
    console.log(`updated channels: ${channelUpdates.length}`);
  }

  console.log(`\n[sync-channels-rss] done — ${rows.length} new videos from ${targets.length} channels`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
