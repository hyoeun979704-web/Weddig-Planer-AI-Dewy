/**
 * 청첩장 템플릿 시드 동기화.
 *
 * 사용:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *     npx tsx scripts/seedInvitationTemplates.ts
 *
 * 동작:
 *   1. SEED_INVITATION_TEMPLATES 순회
 *   2. seed/invitation-templates/<slug>-thumb.png / -bg.png 가 존재하면 Storage 에 업로드
 *      파일이 없으면 placeholder URL 사용 (사용자 측 UI 에서 fallback 처리)
 *   3. default_font_family 가 있으면 invitation_fonts 에서 family 로 조회해 id 매핑
 *   4. invitation_templates 에 slug 기준 upsert
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { SEED_INVITATION_TEMPLATES } from "../src/data/seedInvitationTemplates";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SEED_DIR = path.resolve(process.cwd(), "seed/invitation-templates");
const STORAGE_BUCKET = "invitation-templates";
const STORAGE_PREFIX = "seed/";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 환경변수가 필요합니다.",
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function fileExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function uploadIfExists(
  filename: string | undefined,
  storageKey: string,
): Promise<string | null> {
  if (!filename) return null;
  const localPath = path.join(SEED_DIR, filename);
  if (!(await fileExists(localPath))) {
    console.warn(`  ⚠ 파일 없음 — skip: ${filename}`);
    return null;
  }
  const buf = await fs.readFile(localPath);
  const contentType = filename.endsWith(".png")
    ? "image/png"
    : filename.endsWith(".jpg") || filename.endsWith(".jpeg")
      ? "image/jpeg"
      : filename.endsWith(".webp")
        ? "image/webp"
        : "application/octet-stream";

  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(`${STORAGE_PREFIX}${storageKey}`, buf, {
      contentType,
      upsert: true,
      cacheControl: "3600",
    });
  if (error) {
    console.error(`  ✗ 업로드 실패 ${filename}:`, error.message);
    return null;
  }
  const { data } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(`${STORAGE_PREFIX}${storageKey}`);
  return data.publicUrl;
}

async function resolveFontId(
  family: string | undefined,
): Promise<string | null> {
  if (!family) return null;
  const { data, error } = await supabase
    .from("invitation_fonts")
    .select("id")
    .eq("family", family)
    .eq("is_active", true)
    .maybeSingle();
  if (error || !data) {
    console.warn(`  ⚠ 폰트 family="${family}" 못 찾음 — null 로 저장`);
    return null;
  }
  return (data as { id: string }).id;
}

async function main() {
  console.log(`청첩장 시드 시작 — ${SEED_INVITATION_TEMPLATES.length} 개`);
  let upsertedCount = 0;
  let skippedAssetCount = 0;

  for (const t of SEED_INVITATION_TEMPLATES) {
    console.log(`\n→ ${t.slug} (${t.name})`);

    const thumbExt = t.thumbnail_file?.split(".").pop() ?? "png";
    const bgExt = t.background_file?.split(".").pop() ?? "png";

    const thumbnailUrl = await uploadIfExists(
      t.thumbnail_file,
      `${t.slug}-thumb.${thumbExt}`,
    );
    const backgroundUrl = await uploadIfExists(
      t.background_file,
      `${t.slug}-bg.${bgExt}`,
    );
    if (!thumbnailUrl) skippedAssetCount++;
    if (!backgroundUrl) skippedAssetCount++;

    const fontId = await resolveFontId(t.default_font_family);

    // layout 에 background_url 주입 (있으면)
    const layout = {
      ...t.layout,
      canvas: {
        ...t.layout.canvas,
        ...(backgroundUrl ? { background_url: backgroundUrl } : {}),
      },
    };

    const payload = {
      slug: t.slug,
      name: t.name,
      thumbnail_url: thumbnailUrl ?? "",
      format: t.format,
      tone: t.tone,
      price_hearts: t.price_hearts,
      layout,
      default_font_id: fontId,
      text_prompt_hint: t.text_prompt_hint ?? null,
      display_order: t.display_order ?? 0,
      is_active: t.is_active ?? true,
    };

    const { error } = await supabase
      .from("invitation_templates")
      .upsert(payload, { onConflict: "slug" });

    if (error) {
      console.error(`  ✗ upsert 실패:`, error.message);
    } else {
      upsertedCount++;
      console.log(`  ✓ upsert 완료`);
    }
  }

  console.log(
    `\n완료 — ${upsertedCount} upsert / ${skippedAssetCount} asset 누락`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
