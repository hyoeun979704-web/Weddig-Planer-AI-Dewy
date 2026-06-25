// 사용법 가이드(BusinessGuide) 슬라이드용 스크린샷 생성기 — 실제 표시 프레임과 동일한
// 3:4 모바일 뷰포트로 앱을 라이브 렌더해 "한 화면"을 깔끔히 캡처하고, 타깃 요소에
// 하이라이트 박스 + 안내 라벨을 DOM 오버레이로 얹어 src/assets/business/guide/ 로 출력한다.
//
// 기존 방식(scripts/build-guide-shots.cjs)은 풀페이지(예: 824x3256)를 3:4 로 욱여넣어
// 여러 섹션이 뭉치고 글자가 뭉개졌다. 이 스크립트는 처음부터 3:4 뷰포트로 찍어 그 문제를
// 근본 제거한다(프레임 = src/features/partners/pages/BusinessGuide.tsx 의 aspect-[3/4]).
//
// 폰트 충실도: 앱 본폰트 SUITE Variable 은 cdn.jsdelivr.net 에서 로드되는데 일부 캡처
// 환경(샌드박스)은 이를 막아 폴백(Noto Sans KR)으로 찍힌다 → 실제 앱과 다른 폰트.
// 그래서 SUITE woff2 를 받아 @font-face 로 주입하고, 오버레이 라벨도 같은 SUITE 로 그린다.
//
// 사전 준비(별 터미널):
//   1) 목 Supabase(기업 데이터):  MOCK_BUSINESS=1 node scripts/visual-review/mock-supabase.cjs
//   2) dev 서버를 목으로:
//      VITE_SUPABASE_URL=http://127.0.0.1:9999 VITE_SUPABASE_ANON_KEY=mock \
//        npm run dev:vite -- --host 127.0.0.1 --port 5199
//
// 실행:
//   node scripts/capture-guide-shots.cjs              # 전체(승인 상태)
//   node scripts/capture-guide-shots.cjs --only=business-coupons,business-edit
//   DISCOVER=1 node scripts/capture-guide-shots.cjs   # 오버레이 없이 풀페이지 덤프(타깃 설계용)
//   업체 "승인 대기" 화면은 목을 MOCK_APPROVAL=pending 으로 띄운 뒤
//     node scripts/capture-guide-shots.cjs --only=business-pending

const { chromium } = require("playwright");
const path = require("node:path");
const { readdirSync, existsSync, mkdirSync, readFileSync, writeFileSync } = require("node:fs");

const BASE = process.env.BASE || "http://127.0.0.1:5199";
const OUT = path.resolve(__dirname, "../src/assets/business/guide");
const DISCOVER = process.env.DISCOVER === "1";
const ONLY = (process.argv.find((a) => a.startsWith("--only=")) || "").replace("--only=", "").split(",").filter(Boolean);
const PLACE_ID = "00000000-0000-0000-0000-0000000000b1"; // mock-supabase.cjs 와 일치
mkdirSync(OUT, { recursive: true });

const VW = 390, VH = Math.round((VW * 4) / 3), DPR = 2; // 3:4 프레임 (390x520 → 780x1040)
const PINK = "#ec4899";
const FONT_FAMILY = "'SUITE Variable','Noto Sans KR',sans-serif";
const FONT_CACHE = path.join(require("node:os").tmpdir(), "SUITE-Variable.woff2");
const FONT_URLS = [
  "https://cdn.jsdelivr.net/gh/sunn-us/SUITE/fonts/variable/woff2/SUITE-Variable.woff2",
  "https://raw.githubusercontent.com/sunn-us/SUITE/master/fonts/variable/woff2/SUITE-Variable.woff2",
];

// 캡처 시나리오. target: 하이라이트/스크롤 기준 요소(없으면 상단 그대로).
//  - sel: CSS/텍스트 셀렉터, pick(page): 직접 Locator 반환(복잡한 경우)
//  - pad: 박스 여백(px, 뷰포트 기준), below: 라벨을 박스 아래에 강제
//  - pre(page): 캡처 전 상호작용(폼 채우기·다음 단계 등)
const SHOTS = [
  { id: "business-landing", route: "/business", auth: false, label: "여기를 눌러 시작",
    target: { sel: 'a:has-text("기업회원 가입하고 입점하기"), button:has-text("기업회원 가입하고 입점하기")' } },
  { id: "auth-business", route: "/auth?type=business", auth: false, label: "이 카드를 선택",
    target: { pick: (p) => p.getByText("기업회원", { exact: true }).locator("xpath=ancestor::button[1]") } },
  { id: "business-onboard", route: "/business/onboard", auth: false, label: "등록증과 똑같이 입력",
    target: { sel: 'label:has-text("사업자등록번호")' }, pad: 10 },
  { id: "business-onboard-step2", route: "/business/onboard", auth: false, label: "카테고리 → 등록 신청",
    pre: fillOnboardToStep1, target: { sel: 'h2:has-text("서비스 카테고리")' }, pad: 10 },
  { id: "business-pending", route: "/business/dashboard", auth: true, label: "진행 단계 확인",
    target: { sel: 'text=검토' }, pad: 14 },
  { id: "business-dashboard", route: "/business/dashboard", auth: true, label: "관리 메뉴 = 모든 기능",
    target: { sel: 'text=관리 메뉴' }, pad: 10 },
  { id: "business-edit", route: "/business/edit", auth: true, label: "최소가·시작가 입력",
    target: { sel: 'text=최소가' }, pad: 10 },
  { id: "business-detail-redesign", route: `/vendor/${PLACE_ID}`, auth: false, label: "신뢰 배지 노출",
    below: true, target: { sel: 'text=파트너' }, pad: 8 },
  { id: "business-gallery", route: "/business/gallery", auth: true, label: "업로드 = 즉시 노출",
    target: { sel: 'button:has-text("사진 추가")' }, pad: 10 },
  { id: "business-products", route: "/business/products", auth: true, label: "가격 입력 필수",
    target: { sel: 'text=가격(원)' }, pad: 10 },
  { id: "business-coupons", route: "/business/coupons", auth: true, label: "입력하고 쿠폰 발행",
    target: { sel: 'button:has-text("쿠폰 발행")' }, pad: 10 },

  // ══ 주제별 상세 가이드 슬라이드 (src/features/partners/data/businessGuides.ts 가 import) ══════════
  // 1) 업체정보 수정
  { id: "g1-basic", route: "/business/edit", auth: true, label: "이름·소개·지역", target: { sel: 'text=업체명' }, pad: 10 },
  { id: "g1-inquiry", route: "/business/edit", auth: true, label: "문의 받을 방법", target: { sel: 'button:has-text("앱 채팅")' }, pad: 12 },
  { id: "g1-save", route: "/business/edit", auth: true, label: "저장 = 검토 후 노출", below: true, target: { sel: 'button:has-text("검토 요청")' }, pad: 10 },
  // 2) 상품등록/수정
  { id: "g2-form", route: "/business/products", auth: true, label: "상품명·가격 입력", target: { sel: 'text=상품명' }, pad: 10 },
  { id: "g2-submit", route: "/business/products", auth: true, label: "등록 = 검토 후 노출", below: true, target: { sel: 'button:has-text("상품 등록")' }, pad: 10 },
  { id: "g2-list", route: "/business/products", auth: true, label: "검토 → 노출 상태", target: { sel: 'text=노출중' }, pad: 10 },
  // 3) 포트폴리오 등록/수정
  { id: "g3-album", route: "/business/gallery", auth: true, label: "앨범으로 묶기", target: { sel: 'text=앨범 제목' }, pad: 10 },
  { id: "g3-add", route: "/business/gallery", auth: true, label: "업로드 = 즉시 노출", below: true, target: { sel: 'button:has-text("사진 추가")' }, pad: 10 },
  { id: "g3-list", route: "/business/gallery", auth: true, label: "앨범별로 정리",
    target: { pick: (p) => p.getByText("그랜드웨딩홀 강남").first() }, pad: 12 },
  // 4) 쿠폰·이벤트
  { id: "g4-coupon-form", route: "/business/coupons", auth: true, label: "입력하고 발행", below: true, target: { sel: 'button:has-text("쿠폰 발행")' }, pad: 10 },
  { id: "g4-coupon-list", route: "/business/coupons", auth: true, label: "검토 후 노출", target: { sel: 'text=노출중' }, pad: 10 },
  { id: "g4-event-form", route: "/business/events", auth: true, label: "이벤트 등록", target: { sel: 'h2:has-text("이벤트 등록")' }, pad: 10 },
  { id: "g4-event-banner", route: "/business/events", auth: true, label: "이미지로 구성(선택)", target: { sel: 'text=상세 이미지' }, pad: 10 },
  // 5) 견적 제안/수락/채팅 — 소비자 소통
  { id: "g5-leads", route: "/business/leads", auth: true, label: "받은 견적 한눈에", target: { sel: 'text=받은 리드' }, pad: 12 },
  { id: "g5-reply", route: "/business/leads", auth: true, label: "가격·메시지로 답변", target: { sel: 'button:has-text("견적 답변하기")' }, pad: 10 },
  { id: "g5-chat", route: "/quote/qr2/thread/00000000-0000-0000-0000-0000000000b1", auth: true, label: "수락 후 실시간 채팅", below: true, target: { sel: 'input[placeholder="메시지 보내기"]' }, pad: 10 },
  { id: "g5-inquiry", route: "/business/inquiries", auth: true, label: "문의엔 답변 등록", below: true, pre: expandFirstInquiry, target: { sel: 'button:has-text("답변 등록")' }, pad: 10 },
  { id: "g5-delivery", route: "/business/deliveries", auth: true, label: "결과물 파일 전달", below: true, pre: expandFirstInquiry, target: { sel: 'button:has-text("결과물 보내기")' }, pad: 10 },
];

// 문의/결과물 페이지의 첫 문의 카드를 펼쳐 답변·전달 폼을 노출시킨다.
async function expandFirstInquiry(page) {
  for (const sel of ['text=6월 마지막 주 촬영', 'text=한복 화보 패키지']) {
    try { await page.locator(sel).first().click({ timeout: 1500 }); await page.waitForTimeout(700); return; } catch { /* 다음 */ }
  }
}

async function fillOnboardToStep1(page) {
  // step0: 사업자등록번호/상호명/대표자명/개업일자 → 다음
  const fills = [["사업자등록번호", "1234567890"], ["상호명", "더위드 웨딩스튜디오"], ["대표자", "김디지"]];
  for (const [lab, val] of fills) {
    const inp = page.locator(`xpath=//label[contains(.,'${lab}')]/following::input[1]`).first();
    try { await inp.fill(val, { timeout: 1500 }); } catch { /* 라벨 변형 무시 */ }
  }
  try { await page.locator('input[type="date"]').first().fill("2020-01-01", { timeout: 1500 }); } catch { /* */ }
  try { await page.locator('button:has-text("다음")').first().click({ timeout: 2000 }); } catch { /* */ }
  await page.waitForTimeout(900);
}

async function ensureFontB64() {
  if (existsSync(FONT_CACHE)) return readFileSync(FONT_CACHE).toString("base64");
  for (const u of FONT_URLS) {
    try {
      const r = await fetch(u);
      if (r.ok) { const b = Buffer.from(await r.arrayBuffer()); writeFileSync(FONT_CACHE, b); return b.toString("base64"); }
    } catch { /* 다음 미러 */ }
  }
  console.warn("⚠ SUITE 폰트를 받지 못함 — 폴백 폰트로 캡처됩니다(앱과 다를 수 있음).");
  return null;
}

async function injectFont(page, b64) {
  if (!b64) return;
  await page.addStyleTag({
    content: `@font-face{font-family:'SUITE Variable';src:url(data:font/woff2;base64,${b64}) format('woff2');font-weight:100 900;font-style:normal;font-display:block;}`,
  });
  try { await page.evaluate(() => document.fonts.ready); } catch { /* */ }
  await page.waitForTimeout(300); // 리플로우 대기
}

// 타깃 위(또는 아래)에 하이라이트 박스 + 핑크 라벨 pill + 삼각형을 DOM 으로 얹는다.
// 앱과 동일한 SUITE 폰트로 라벨이 렌더되도록 페이지 안에서 그린다.
async function drawOverlay(page, rect, label, below) {
  await page.evaluate(({ rect, label, below, pink, font }) => {
    document.getElementById("__guide_ov__")?.remove();
    const root = document.createElement("div");
    root.id = "__guide_ov__";
    root.style.cssText = "position:fixed;inset:0;z-index:2147483647;pointer-events:none;";
    const box = document.createElement("div");
    box.style.cssText = `position:fixed;left:${rect.x}px;top:${rect.y}px;width:${rect.w}px;height:${rect.h}px;`
      + `border:3px solid ${pink};border-radius:14px;box-shadow:0 0 0 5px rgba(255,255,255,.92);box-sizing:border-box;`;
    root.appendChild(box);
    const pill = document.createElement("div");
    pill.textContent = label;
    pill.style.cssText = `position:fixed;font-family:${font};font-weight:800;font-size:15px;color:#fff;background:${pink};`
      + `padding:7px 13px;border-radius:999px;white-space:nowrap;box-shadow:0 4px 12px rgba(190,24,93,.35);`;
    root.appendChild(pill);
    const tri = document.createElement("div");
    tri.style.cssText = "position:fixed;width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;";
    root.appendChild(tri);
    document.body.appendChild(root);

    const cx = rect.x + rect.w / 2;
    const pw = pill.offsetWidth, ph = pill.offsetHeight;
    let px = cx - pw / 2;
    px = Math.max(10, Math.min(px, window.innerWidth - pw - 10));
    const gap = 9, triH = 8;
    const fitsAbove = !below && rect.y - (ph + triH + gap) >= 6;
    pill.style.left = `${px}px`;
    tri.style.left = `${Math.max(px + 12, Math.min(cx - 8, px + pw - 28))}px`;
    if (fitsAbove) {
      pill.style.top = `${rect.y - gap - triH - ph}px`;
      tri.style.top = `${rect.y - gap - triH}px`;
      tri.style.borderTop = `${triH}px solid ${pink}`;
    } else {
      pill.style.top = `${rect.y + rect.h + gap + triH}px`;
      tri.style.top = `${rect.y + rect.h + gap}px`;
      tri.style.borderBottom = `${triH}px solid ${pink}`;
    }
  }, { rect, label, below: !!below, pink: PINK, font: FONT_FAMILY });
}

function exe() {
  const d = process.env.PLAYWRIGHT_BROWSERS_PATH || "/opt/pw-browsers";
  try { const h = readdirSync(d).find((x) => x.startsWith("chromium-") && !x.includes("headless")); const ep = h && `${d}/${h}/chrome-linux/chrome`; if (ep && existsSync(ep)) return ep; } catch { /* */ }
  return undefined;
}

async function dismissOverlays(page) {
  // 잔존 모달/시트(있다면) 닫기 — 튜토리얼은 코드에서 비활성화됨.
  for (const sel of ['button:has-text("나중에")', 'button:has-text("건너뛰기")', 'button[aria-label="닫기"]']) {
    try { const b = page.locator(sel).first(); if (await b.isVisible({ timeout: 250 })) { await b.click({ timeout: 700 }); await page.waitForTimeout(200); } } catch { /* */ }
  }
  await page.waitForTimeout(150);
}

async function login(page, b64) {
  await page.goto(`${BASE}/auth`, { waitUntil: "networkidle", timeout: 30000 });
  await injectFont(page, b64);
  await page.fill('input[type="email"]', "preview@mock.local");
  await page.fill('input[type="password"]', "mockpass123");
  await page.click('button:has-text("로그인")');
  await page.waitForTimeout(3000);
}

(async () => {
  const b64 = await ensureFontB64();
  const browser = await chromium.launch({ ...(exe() ? { executablePath: exe() } : {}), headless: true, args: ["--no-sandbox"] });
  const ctx = await browser.newContext({ viewport: { width: VW, height: VH }, deviceScaleFactor: DPR });
  const page = await ctx.newPage();
  // 비-auth(공개) 샷을 먼저 — auth-business 는 로그아웃 상태여야 회원가입 화면이 뜬다.
  // 그 뒤 첫 auth 샷 직전에 1회 로그인한다.
  const shots = SHOTS.filter((s) => ONLY.length === 0 || ONLY.includes(s.id))
    .sort((a, b) => Number(a.auth) - Number(b.auth));
  let loggedIn = false;

  for (const s of shots) {
    try {
      if (s.auth && !loggedIn) { await login(page, b64); loggedIn = true; }
      await page.goto(`${BASE}${s.route}`, { waitUntil: "networkidle", timeout: 30000 });
      await injectFont(page, b64);
      await page.waitForTimeout(1200);
      await dismissOverlays(page);
      if (s.pre) await s.pre(page);
      await page.waitForTimeout(500);

      if (DISCOVER) {
        await page.screenshot({ path: path.join("/tmp/shots", `disc-${s.id}.png`), fullPage: true });
        console.log("· discover", s.id, "url=" + page.url());
        continue;
      }

      // 타깃을 3:4 창 상단 ~40% 로 스크롤 후, 뷰포트 기준 rect 로 오버레이.
      let rect = null;
      if (s.target) {
        const loc = s.target.pick ? s.target.pick(page) : page.locator(s.target.sel).first();
        try { await loc.scrollIntoViewIfNeeded({ timeout: 2500 }); } catch { /* */ }
        try {
          const want = await loc.boundingBox();
          if (want) {
            await page.evaluate((y) => window.scrollBy(0, y), Math.max(0, want.y - VH * 0.40));
            await page.waitForTimeout(350);
            const b = await loc.boundingBox();
            const pad = s.pad ?? 6;
            if (b) rect = { x: Math.max(2, b.x - pad), y: Math.max(2, b.y - pad), w: b.width + pad * 2, h: b.height + pad * 2 };
          }
        } catch { /* */ }
      }
      if (rect) await drawOverlay(page, rect, s.label, s.below);
      else console.warn("  ⚠ target 미발견 — 오버레이 없이 저장:", s.id);

      await page.screenshot({ path: path.join(OUT, `${s.id}.png`) }); // 뷰포트만(3:4)
      console.log("✓", s.id, rect ? `(hi @ ${Math.round(rect.x)},${Math.round(rect.y)})` : "(no hi)");
    } catch (e) {
      console.error("✗", s.id, e.message.split("\n")[0]);
    }
  }
  await browser.close();
})();
