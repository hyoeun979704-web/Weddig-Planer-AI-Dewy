/**
 * 청첩장 폰트 일괄 등록 (중복 방지 / 멱등).
 *
 * 사용:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *     npm run seed:invitation-fonts
 *
 *   # 이미 등록된 family 도 다시 받아 덮어쓰기
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *     npm run seed:invitation-fonts -- --force
 *
 * 동작:
 *   1. invitation_fonts 의 기존 family 목록을 읽는다.
 *   2. SEED_INVITATION_FONTS 순회 —
 *      - 이미 등록된 family 면 skip (--force 시 갱신)
 *      - 원본 TTF 다운로드 → woff2 변환(용량 ↓, 웹로딩 ↑)
 *      - Storage(invitation-fonts)에 결정적 파일명으로 업로드(upsert)
 *      - invitation_fonts 에 upsert(onConflict: family)
 *   3. family UNIQUE 제약(20260531130000) 덕분에 어떤 경로로도 중복 행이 생기지 않는다.
 *
 * 멱등: 몇 번을 실행해도 family 당 1행만 유지된다.
 */

import { createClient } from "@supabase/supabase-js";
import { compress } from "wawoff2";
import {
  SEED_INVITATION_FONTS,
  type SeedInvitationFont,
} from "../packages/shared/src/data/seedInvitationFonts";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const STORAGE_BUCKET = "invitation-fonts";
const MAX_BYTES = 10 * 1024 * 1024; // 버킷 제한과 동일
const FORCE = process.argv.includes("--force");

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 환경변수가 필요합니다.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const mb = (n: number) => `${(n / 1048576).toFixed(2)}MB`;

async function downloadTtf(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`다운로드 실패 ${res.status} ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

async function processFont(
  font: SeedInvitationFont,
  existing: Set<string>,
): Promise<"inserted" | "updated" | "skipped" | "failed"> {
  const exists = existing.has(font.family);
  if (exists && !FORCE) {
    console.log(`  · skip (이미 등록됨): ${font.family}`);
    return "skipped";
  }

  try {
    const ttf = await downloadTtf(font.source_url);
    const woff2 = Buffer.from(await compress(ttf));
    console.log(
      `    ${font.family}: TTF ${mb(ttf.length)} → woff2 ${mb(woff2.length)}`,
    );
    if (woff2.length > MAX_BYTES) {
      console.error(
        `  ✗ ${font.family}: woff2 변환 후에도 ${mb(woff2.length)} > 10MB 제한 — skip`,
      );
      return "failed";
    }

    const weight = font.weight ?? "400";
    const storageKey = `${slugify(font.family)}-${weight}.woff2`;

    const { error: upErr } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storageKey, woff2, {
        contentType: "font/woff2",
        upsert: true,
        cacheControl: "31536000", // 1년
      });
    if (upErr) throw new Error(`storage upload: ${upErr.message}`);

    const { data: pub } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(storageKey);

    const payload = {
      name: font.name,
      family: font.family,
      file_url: pub.publicUrl,
      category: font.category,
      weight,
      style: font.style ?? "normal",
      supports_korean: font.supports_korean ?? true,
      license: font.license,
      display_order: font.display_order ?? 0,
      is_active: true,
    };

    const { error: dbErr } = await supabase
      .from("invitation_fonts")
      .upsert(payload, { onConflict: "family" });
    if (dbErr) throw new Error(`db upsert: ${dbErr.message}`);

    console.log(`  ✓ ${exists ? "갱신" : "등록"}: ${font.name} (${font.family})`);
    return exists ? "updated" : "inserted";
  } catch (e) {
    console.error(`  ✗ ${font.family}:`, (e as Error).message);
    return "failed";
  }
}

async function main() {
  console.log(
    `청첩장 폰트 일괄 등록 — ${SEED_INVITATION_FONTS.length}개${FORCE ? " (--force)" : ""}`,
  );

  const { data: rows, error } = await supabase
    .from("invitation_fonts")
    .select("family");
  if (error) {
    console.error("기존 폰트 조회 실패:", error.message);
    process.exit(1);
  }
  const existing = new Set((rows ?? []).map((r: { family: string }) => r.family));
  console.log(`기존 등록: ${existing.size}개\n`);

  const tally = { inserted: 0, updated: 0, skipped: 0, failed: 0 };
  for (const font of SEED_INVITATION_FONTS) {
    const r = await processFont(font, existing);
    tally[r]++;
  }

  console.log(
    `\n완료 — 신규 ${tally.inserted} / 갱신 ${tally.updated} / skip ${tally.skipped} / 실패 ${tally.failed}`,
  );
  if (tally.failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
