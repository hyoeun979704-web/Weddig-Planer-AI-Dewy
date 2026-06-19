// 가이드 슬라이드용 캡처 가공기 — 각 단계의 "할 일" 영역을 줌-크롭(3:4 통일)하고
// 하이라이트 박스 + 안내 라벨을 이미지에 구워서 src/assets/business/guide/ 로 출력.
// 레퍼런스(온보딩 코치마크)처럼 "여기를 누르세요"가 한눈에 보이게 한다.
// 실행: node scripts/build-guide-shots.cjs   (sharp + 한글 폰트 fonts-nanum 필요)
//
// 좌표(hi)는 원본 PNG 픽셀 기준 타깃 사각형. 크롭창은 가로=원본폭, 세로=폭*4/3 을
// 타깃 중심에 맞춰 세로 클램프. 출력은 폭 770 으로 리사이즈 → 전 슬라이드 동일 크기(3:4).

const sharp = require("sharp");
const { mkdirSync } = require("node:fs");
const path = require("node:path");

const SRC = path.resolve(__dirname, "../src/assets/business");
const OUT = path.resolve(__dirname, "../src/assets/business/guide");
mkdirSync(OUT, { recursive: true });

const PINK = "#ec4899";
const OUT_W = 770;

// 각 슬라이드: 원본 파일, 원본 폭/높이, 타깃 사각형(hi), 안내 라벨.
const SHOTS = [
  { file: "business-landing.png",        w: 824,  h: 3256, hi: { x: 40,  y: 1655, w: 745, h: 105 }, label: "여기를 눌러 시작" },
  { file: "auth-business.png",           w: 824,  h: 2506, hi: { x: 425, y: 455,  w: 375, h: 280 }, label: "이 카드를 선택" },
  { file: "business-onboard.png",        w: 824,  h: 2274, hi: { x: 30,  y: 1060, w: 770, h: 600 }, label: "등록증과 똑같이 입력" },
  { file: "business-onboard-step2.png",  w: 824,  h: 1830, hi: { x: 40,  y: 1450, w: 745, h: 120 }, label: "카테고리 → 등록 신청" },
  { file: "business-pending.png",        w: 824,  h: 1830, hi: { x: 40,  y: 680,  w: 745, h: 420 }, label: "진행 단계 확인" },
  { file: "business-dashboard.png",      w: 824,  h: 2348, hi: { x: 20,  y: 940,  w: 785, h: 760 }, label: "관리 메뉴 = 모든 기능" },
  { file: "business-edit.png",           w: 824,  h: 3496, hi: { x: 20,  y: 1710, w: 785, h: 165 }, label: "최소가·시작가 입력" },
  { file: "business-detail-redesign.png", w: 1081, h: 1999, hi: { x: 20,  y: 1330, w: 700, h: 150 }, label: "가격·신뢰 배지 노출", below: true },
  { file: "business-gallery.png",        w: 824,  h: 2046, hi: { x: 40,  y: 440,  w: 745, h: 720 }, label: "업로드 = 즉시 노출" },
  { file: "business-products.png",       w: 824,  h: 1830, hi: { x: 415, y: 290,  w: 350, h: 120 }, label: "가격 입력 필수" },
  { file: "business-coupons.png",        w: 824,  h: 1830, hi: { x: 60,  y: 860,  w: 705, h: 100 }, label: "입력하고 쿠폰 발행" },
];

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

function overlaySvg(winW, winH, hi, label, forceBelow) {
  const r = 18;                                   // 하이라이트 박스 라운드
  const sw = Math.round(winW * 0.013);            // 테두리 두께(폭 비례)
  const bx = hi.x, by = hi.y, bw = hi.w, bh = hi.h;
  // 라벨 pill 크기
  const fs = Math.round(winW * 0.036);            // 라벨 폰트
  const padX = Math.round(fs * 0.7), padY = Math.round(fs * 0.45);
  const pillW = Math.round(label.length * fs * 0.98) + padX * 2;
  const pillH = fs + padY * 2;
  const pillX = clamp(bx + bw / 2 - pillW / 2, 12, winW - pillW - 12);
  // 라벨은 타깃을 절대 가리지 않게 박스와 간격(gap)+삼각형(tri) 두고 배치.
  // 위에 공간이 있으면 위, 없으면 아래. (예전엔 간격이 모자라 버튼 글자를 덮었음.)
  const gap = Math.round(winW * 0.018);
  const tri = 14;
  const fitsAbove = !forceBelow && by - (pillH + tri + gap) >= 8;
  let pillY, triPts;
  if (fitsAbove) {
    pillY = by - gap - tri - pillH;               // pill → (간격) → 삼각형 → 박스 top
    const triBase = pillY + pillH, triTip = by - gap;
    const triCx = clamp(bx + bw / 2, pillX + 20, pillX + pillW - 20);
    triPts = `${triCx - 11},${triBase} ${triCx + 11},${triBase} ${triCx},${triTip}`;
  } else {
    pillY = Math.min(by + bh + gap + tri, winH - pillH - 10);
    const triBase = pillY, triTip = by + bh + gap;
    const triCx = clamp(bx + bw / 2, pillX + 20, pillX + pillW - 20);
    triPts = `${triCx - 11},${triBase} ${triCx + 11},${triBase} ${triCx},${triTip}`;
  }
  // 글로우(드롭섀도) 는 박스 내부를 번지게 해 타깃 글자를 흐리므로 사용 안 함.
  // 대신 흰색 외곽선 + 핑크 본선 2겹으로 어떤 배경에서도 또렷한 테두리(내부는 그대로).
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${winW}" height="${winH}">
      <rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="${r}" ry="${r}"
        fill="none" stroke="#ffffff" stroke-width="${sw + 6}"/>
      <rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="${r}" ry="${r}"
        fill="none" stroke="${PINK}" stroke-width="${sw}"/>
      <polygon points="${triPts}" fill="${PINK}"/>
      <rect x="${pillX}" y="${pillY}" width="${pillW}" height="${pillH}" rx="${pillH / 2}" ry="${pillH / 2}" fill="${PINK}"/>
      <text x="${pillX + pillW / 2}" y="${pillY + pillH / 2}" font-family="NanumGothic, 'Noto Sans CJK KR', sans-serif"
        font-size="${fs}" font-weight="700" fill="#ffffff" text-anchor="middle" dominant-baseline="central">${esc(label)}</text>
    </svg>`,
  );
}

(async () => {
  for (const s of SHOTS) {
    const winW = s.w;
    const winH = Math.round(s.w * 4 / 3);
    const winY = clamp(Math.round(s.hi.y + s.hi.h / 2 - winH / 2), 0, Math.max(0, s.h - winH));
    const cropH = Math.min(winH, s.h - winY);
    // 1패스: 베이스를 출력 크기(OUT_W)로 크롭+리사이즈.
    const base = await sharp(path.join(SRC, s.file))
      .extract({ left: 0, top: winY, width: winW, height: cropH })
      .resize({ width: OUT_W })
      .png()
      .toBuffer();
    const outH = (await sharp(base).metadata()).height;
    // 2패스: 오버레이를 처음부터 출력 해상도로 그려(리사이즈 색번짐 방지) 좌표를 k배 스케일.
    const k = OUT_W / winW;
    const hiOut = { x: s.hi.x * k, y: (s.hi.y - winY) * k, w: s.hi.w * k, h: s.hi.h * k };
    const svg = overlaySvg(OUT_W, outH, hiOut, s.label, s.below);
    const overlay = await sharp(svg).png().toBuffer();
    const outFile = path.join(OUT, s.file);
    await sharp(base).composite([{ input: overlay, top: 0, left: 0 }]).png().toFile(outFile);
    console.log("✓", s.file);
  }
  console.log("done →", OUT);
})();
