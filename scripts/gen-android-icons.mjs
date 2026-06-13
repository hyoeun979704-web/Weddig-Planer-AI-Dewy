#!/usr/bin/env node
/**
 * 안드로이드 런처 아이콘 재생성 — 단일 소스(public/icon-512.png, 하트 로고)에서
 * 레거시(ic_launcher/_round)·적응형 전경(ic_launcher_foreground) webp 를 밀도별로 생성.
 *
 * 배경(values/ic_launcher_background.xml)은 흰색 유지. 적응형 전경은 safe-zone 에 맞춰
 * 하트를 캔버스의 ~66% 로 키워(이전엔 너무 작아 여백 과다) 중앙 배치.
 * 레거시는 흰 배경 + 하트 ~80% 중앙.
 *
 * 실행: node scripts/gen-android-icons.mjs
 */
import sharp from "sharp";
import { mkdirSync } from "node:fs";

const SRC = "public/icon-512.png";
const RES = "android/app/src/main/res";

// density → 레거시 한 변(px), 적응형 전경 한 변(px)
const DENSITIES = {
  mdpi: { legacy: 48, fg: 108 },
  hdpi: { legacy: 72, fg: 162 },
  xhdpi: { legacy: 96, fg: 216 },
  xxhdpi: { legacy: 144, fg: 324 },
  xxxhdpi: { legacy: 192, fg: 432 },
};

const LEGACY_RATIO = 0.80; // 레거시: 흰 배경 위 하트 비율
const FG_RATIO = 0.66;     // 적응형 전경: safe-zone(중앙 ~66%) 에 하트

async function heartOn(canvas, inner, background) {
  const heart = await sharp(SRC)
    .resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();
  return sharp({
    create: { width: canvas, height: canvas, channels: 4, background },
  })
    .composite([{ input: heart, gravity: "center" }])
    .webp({ quality: 100 })
    .toBuffer();
}

const WHITE = { r: 255, g: 255, b: 255, alpha: 1 };
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

for (const [dpi, { legacy, fg }] of Object.entries(DENSITIES)) {
  const dir = `${RES}/mipmap-${dpi}`;
  mkdirSync(dir, { recursive: true });

  // 레거시 사각/라운드 — 흰 배경 + 하트
  const legacyBuf = await heartOn(legacy, Math.round(legacy * LEGACY_RATIO), WHITE);
  await sharp(legacyBuf).toFile(`${dir}/ic_launcher.webp`);
  await sharp(legacyBuf).toFile(`${dir}/ic_launcher_round.webp`);

  // 적응형 전경 — 투명 + 하트(safe-zone)
  const fgBuf = await heartOn(fg, Math.round(fg * FG_RATIO), TRANSPARENT);
  await sharp(fgBuf).toFile(`${dir}/ic_launcher_foreground.webp`);

  console.log(`✓ ${dpi}: legacy ${legacy}px (heart ${Math.round(legacy * LEGACY_RATIO)}), fg ${fg}px (heart ${Math.round(fg * FG_RATIO)})`);
}
console.log("완료 — 안드로이드 아이콘 재생성됨.");
