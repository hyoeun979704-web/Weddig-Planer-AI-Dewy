#!/usr/bin/env tsx
// 기존 tip_videos 전체를 현재 classifier 패턴으로 재분류.
//
// 사용 시점: tipClassify.ts 패턴 변경 후 1회. 같은 video_id 에 대해 새 categories
// 와 is_active 만 갱신 — 다른 컬럼은 그대로 유지.
//
// 사용:
//   npm run reclassify-tips                 # 전체
//   npm run reclassify-tips -- --dry-run    # 변경 행 수만 보기
//   npm run reclassify-tips -- --limit=100  # 일부만

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { TIP_CATEGORIES } from "./queries";
import { normalizeTipCategories } from "../../src/lib/tipNormalize";
import { classifyTipCategories } from "../../src/lib/tipClassify";

interface Args {
  dryRun: boolean;
  limit: number | null;
}

function parseArgs(): Args {
  const args: Args = { dryRun: false, limit: null };
  for (const a of process.argv.slice(2)) {
    if (a === "--dry-run") args.dryRun = true;
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
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } },
  );

  console.log(`\n[reclassify-tips] dry-run=${args.dryRun}, limit=${args.limit ?? "all"}`);

  // 전체 영상 (is_active 무관) 로드 — 비활성 영상도 새 패턴이면 살아날 수 있음.
  let q = supabase
    .from("tip_videos")
    .select("video_id, title, description, channel_name, categories, is_active");
  if (args.limit) q = q.limit(args.limit);
  const { data, error } = await q;
  if (error) {
    console.error("load failed:", error.message);
    process.exit(1);
  }
  const rows = (data ?? []) as VideoRow[];
  console.log(`loaded ${rows.length} videos`);

  let changedCats = 0;
  let activated = 0;
  let deactivated = 0;
  const updates: Array<{ video_id: string; categories: string[]; is_active: boolean }> = [];

  for (const v of rows) {
    const text = `${v.title ?? ""} ${v.description ?? ""} ${v.channel_name ?? ""}`;
    const newCats = normalizeTipCategories(
      classifyTipCategories(text, TIP_CATEGORIES),
    );
    const newActive = newCats.length > 0;
    const catsChanged = !arraysEqual(newCats, v.categories);
    const activeChanged = newActive !== (v.is_active ?? false);
    if (!catsChanged && !activeChanged) continue;
    if (catsChanged) changedCats++;
    if (activeChanged) {
      if (newActive) activated++;
      else deactivated++;
    }
    updates.push({
      video_id: v.video_id,
      categories: newCats,
      is_active: newActive,
    });
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
  for (const u of updates) {
    const { error: upErr } = await supabase
      .from("tip_videos")
      .update({ categories: u.categories, is_active: u.is_active })
      .eq("video_id", u.video_id);
    if (upErr) {
      console.error(`failed ${u.video_id}:`, upErr.message);
      continue;
    }
    done++;
    if (done % 100 === 0) console.log(`  updated ${done}/${updates.length}`);
  }
  console.log(`\ndone — ${done}/${updates.length} updated.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
