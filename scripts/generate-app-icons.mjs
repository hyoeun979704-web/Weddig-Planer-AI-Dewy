// 네이티브(iOS/Android) 앱 아이콘 소스 생성 — App Store 2.3.8(빈 아이콘) 재발 방지.
//
// 출력: assets/ 폴더의 @capacitor/assets 규약 소스(아래). 이 소스를 커밋해 두면
// Mac 에서 `npx cap add ios` 후 `npm run assets:generate` 한 번으로 iOS/Android 아이콘이
// 빠짐없이 채워진다. iOS 마케팅 아이콘은 **알파(투명) 금지** → 흰 배경으로 평탄화한다.
//
// 실행: node scripts/generate-app-icons.mjs (sharp 필요 — 이미 트랜지티브 설치됨)
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = resolve(root, "public/icon-512.png");          // 풀블리드 로고(알파 포함)
const SRC_MASKABLE = resolve(root, "public/icon-maskable-512.png"); // 세이프존 패딩 로고
const OUT = resolve(root, "assets");
const BG = "#FFFFFF"; // 브랜드 배경(Android ic_launcher_background 와 동일)

async function main() {
  await mkdir(OUT, { recursive: true });

  // 1) icon-only.png — iOS AppIcon + Android 레거시. 불투명 필수(알파 → 흰 배경 평탄화).
  await sharp(SRC)
    .resize(1024, 1024, { fit: "contain", background: BG })
    .flatten({ background: BG })
    .png()
    .toFile(resolve(OUT, "icon-only.png"));

  // 2) icon-foreground.png — Android 어댑티브 전경(알파 유지, 세이프존 패딩 버전).
  await sharp(SRC_MASKABLE)
    .resize(1024, 1024, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(resolve(OUT, "icon-foreground.png"));

  // 3) icon-background.png — Android 어댑티브 배경(단색 흰색 1024).
  await sharp({
    create: { width: 1024, height: 1024, channels: 4, background: BG },
  })
    .png()
    .toFile(resolve(OUT, "icon-background.png"));

  // 검증: 생성물 알파/크기 출력(icon-only 는 hasAlpha=false 여야 App Store 통과).
  for (const f of ["icon-only.png", "icon-foreground.png", "icon-background.png"]) {
    const m = await sharp(resolve(OUT, f)).metadata();
    console.log(`assets/${f}: ${m.width}x${m.height} alpha=${m.hasAlpha}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
