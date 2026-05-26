#!/usr/bin/env tsx
// 기존 tip_videos 전체를 현재 classifier 패턴으로 재분류.
//
// 사용 시점: tipClassify.ts 패턴 변경 후 1회. 같은 video_id 에 대해 새 categories
// 와 is_active 만 갱신 — 다른 컬럼은 그대로 유지.
//
// Round 21 — 분류 입력 강화:
//   ① --enrich 옵션 — videos.list 로 full description + creator tags 재취득
//      (search.list snippet 의 200자 cap 한계 극복, quota 16 units 만).
//   ② --transcripts 옵션 — youtube-transcript 로 자막 fetch (quota 0).
//   ③ 둘 다 켜면 분류 입력 토큰량 ~10배, 정확도 큰 폭 향상.
//
// 사용:
//   npm run reclassify-tips                              # 단순 재분류 (기존 데이터만)
//   npm run reclassify-tips -- --enrich                  # videos.list 재취득
//   npm run reclassify-tips -- --enrich --transcripts    # 풀 강화 (권장)
//   npm run reclassify-tips -- --dry-run                 # 변경 행 수만 보기
//   npm run reclassify-tips -- --limit=100               # 일부만

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { fetchVideoStats } from "./youtube";
import { fetchTranscript } from "./transcript";
import { TIP_CATEGORIES } from "./queries";
import { normalizeTipCategories } from "../../src/lib/tipNormalize";
import { classifyTipCategories, buildClassifyText } from "../../src/lib/tipClassify";

interface Args {
  dryRun: boolean;
  limit: number | null;
  enrich: boolean;
  transcripts: boolean;
}

function parseArgs(): Args {
  const args: Args = { dryRun: false, limit: null, enrich: false, transcripts: false };
  for (const a of process.argv.slice(2)) {
    if (a === "--dry-run") args.dryRun = true;
    else if (a === "--enrich") args.enrich = true;
    else if (a === "--transcripts") args.transcripts = true;
    else if (a.startsWith("--limit=")) args.limit = +a.split("=")[1];
  }
  return args;
}

interface VideoRow {
  video_id: string;
  title: string | null;
  description: string | null;
  channel_name: string | null;
  categories: string[] | null;
  is_active: boolean | null;
  tags: string[] | null;
}

function arraysEqual(a: string[] | null, b: string[] | null): boolean {
  const aa = a ?? [];
  const bb = b ?? [];
  if (aa.length !== bb.length) return false;
  for (let i = 0; i < aa.length; i++) if (aa[i] !== bb[i]) return false;
  return true;
}

async function main(): Promise<void> {
  const args = parseArgs();
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }
  if ((args.enrich || args.transcripts) && !process.env.YOUTUBE_API_KEY) {
    console.error("Missing YOUTUBE_API_KEY (--enrich/--transcripts 에 필요)");
    process.exit(1);
  }
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } },
  );

  console.log(
    `\n[reclassify-tips] dry-run=${args.dryRun}, limit=${args.limit ?? "all"}, ` +
      `enrich=${args.enrich}, transcripts=${args.transcripts}`,
  );

  // 전체 영상 (is_active 무관) 로드 — 비활성 영상도 새 패턴이면 살아날 수 있음.
  let q = supabase
    .from("tip_videos")
    .select("video_id, title, description, channel_name, categories, is_active, tags");
  if (args.limit) q = q.limit(args.limit);
  const { data, error } = await q;
  if (error) {
    console.error("load failed:", error.message);
    process.exit(1);
  }
  const rows = (data ?? []) as VideoRow[];
  console.log(`loaded ${rows.length} videos`);

  // 옵션: videos.list 재취득 — full description + creator tags. 50 IDs/1 unit.
  const enrichMap = new Map<string, { description: string; tags: string[] }>();
  if (args.enrich) {
    const apiKey = process.env.YOUTUBE_API_KEY!;
    const ids = rows.map((r) => r.video_id);
    console.log(`[enrich] videos.list for ${ids.length} videos (~${Math.ceil(ids.length / 50)} units)…`);
    const stats = await fetchVideoStats(ids, apiKey);
    for (const v of rows) {
      const s = stats.get(v.video_id);
      enrichMap.set(v.video_id, {
        description: s?.fullDescription || v.description || "",
        tags: s?.tags ?? v.tags ?? [],
      });
    }
  }

  // 옵션: 자막 fetch (quota 0). 영상당 1-2초.
  const transcriptMap = new Map<string, string>();
  if (args.transcripts) {
    let withT = 0;
    let idx = 0;
    for (const v of rows) {
      idx++;
      if (idx % 50 === 0) console.log(`  transcript ${idx}/${rows.length} (有 ${withT})`);
      const t = await fetchTranscript(v.video_id);
      transcriptMap.set(v.video_id, t);
      if (t) withT++;
    }
    console.log(`[transcript] ${withT}/${rows.length} 영상에서 자막 수집`);
  }

  let changedCats = 0;
  let activated = 0;
  let deactivated = 0;
  const updates: Array<{
    video_id: string;
    categories: string[];
    is_active: boolean;
    description?: string;
    tags?: string[];
  }> = [];

  for (const v of rows) {
    const en = enrichMap.get(v.video_id);
    const desc = en?.description ?? v.description ?? "";
    const tags = en?.tags ?? v.tags ?? [];
    const transcript = transcriptMap.get(v.video_id) ?? "";
    // 표준 helper — index/sync 와 분류 입력 구성 동일.
    const text = buildClassifyText({
      title: v.title,
      description: desc,
      tags,
      transcript,
      channelName: v.channel_name,
    });
    const newCats = normalizeTipCategories(
      classifyTipCategories(text, TIP_CATEGORIES),
    );
    const newActive = newCats.length > 0;
    const catsChanged = !arraysEqual(newCats, v.categories);
    const activeChanged = newActive !== (v.is_active ?? false);
    const descChanged = args.enrich && desc !== (v.description ?? "");
    const tagsChanged = args.enrich && !arraysEqual(tags, v.tags);
    if (!catsChanged && !activeChanged && !descChanged && !tagsChanged) continue;
    if (catsChanged) changedCats++;
    if (activeChanged) {
      if (newActive) activated++;
      else deactivated++;
    }
    const update: typeof updates[number] = {
      video_id: v.video_id,
      categories: newCats,
      is_active: newActive,
    };
    if (args.enrich) {
      update.description = desc;
      update.tags = tags;
    }
    updates.push(update);
  }

  console.log(
    `\nchanges: cats=${changedCats}, activated=${activated}, deactivated=${deactivated}`,
  );
  if (updates.length === 0) {
    console.log("nothing to update.");
    return;
  }
  console.log(`will update ${updates.length} rows.`);

  if (args.dryRun) {
    updates.slice(0, 10).forEach((u) => {
      const orig = rows.find((r) => r.video_id === u.video_id);
      console.log(
        `  · ${u.video_id} [${orig?.categories?.join(",") ?? ""}] → [${u.categories.join(",")}] active=${u.is_active}`,
      );
    });
    return;
  }

  // PostgREST 의 upsert 는 INSERT 실패 시 NOT NULL 위반 — 같은 행을 UPDATE 하려면
  // 1 row 씩 .update() 호출. 778 rows × ~30ms ≈ 25초.
  let done = 0;
  let failed = 0;
  const failures: Array<{ video_id: string; error: string }> = [];
  for (const u of updates) {
    const patch: Record<string, unknown> = {
      categories: u.categories,
      is_active: u.is_active,
    };
    if (u.description !== undefined) patch.description = u.description;
    if (u.tags !== undefined) patch.tags = u.tags;
    const { error: upErr } = await supabase
      .from("tip_videos")
      .update(patch)
      .eq("video_id", u.video_id);
    if (upErr) {
      failed++;
      failures.push({ video_id: u.video_id, error: upErr.message });
      console.error(`failed ${u.video_id}:`, upErr.message);
      continue;
    }
    done++;
    if (done % 100 === 0) console.log(`  updated ${done}/${updates.length}`);
  }
  console.log(
    `\ndone — ${done}/${updates.length} updated, ${failed} failed.`,
  );
  if (failed > 0) {
    // 부분 실패 시 운영자가 잡을 수 있게 마지막 10개 실패 video_id 와 사유 출력.
    console.warn(`\nfirst ${Math.min(10, failures.length)} failures:`);
    for (const f of failures.slice(0, 10)) {
      console.warn(`  · ${f.video_id}: ${f.error}`);
    }
    // 부분 실패는 exit code 0 으로 끝내 cron 같은 자동화에서 silent fail 안 되도록.
    process.exitCode = 2;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
