// 소비자(예비부부) 사용 가이드 슬라이드 캡처 — 기업 가이드(capture-guide-shots.cjs)와
// **동일한 방식**: 3:4 라이브 뷰포트 + SUITE 폰트 주입 + 타깃 하이라이트(핑크 박스+라벨) →
// src/assets/consumer/guide/*.png. ConsumerGuideDetail/Index 가 import.
//
// 사전조건(기업 캡처와 동일):
//   1) MOCK_BUSINESS=1 node scripts/visual-review/mock-supabase.cjs
//   2) VITE_SUPABASE_URL=http://127.0.0.1:9999 VITE_SUPABASE_ANON_KEY=mock npm run dev -- --port 5199
//   3) node scripts/capture-consumer-shots.cjs            # 전체
//      node scripts/capture-consumer-shots.cjs --only=c-home-tabs,c-budget
//      DISCOVER=1 node scripts/capture-consumer-shots.cjs # 오버레이 없이 풀페이지 덤프

const { chromium } = require("playwright");
const path = require("node:path");
const { readdirSync, existsSync, mkdirSync, readFileSync, writeFileSync } = require("node:fs");

const BASE = process.env.BASE || "http://127.0.0.1:5199";
const OUT = path.resolve(__dirname, "../src/assets/consumer/guide");
const DISCOVER = process.env.DISCOVER === "1";
const ONLY = (process.argv.find((a) => a.startsWith("--only=")) || "").replace("--only=", "").split(",").filter(Boolean);
const PID = "00000000-0000-0000-0000-0000000000b1"; // mock-supabase.cjs 와 일치
mkdirSync(OUT, { recursive: true });

const VW = 390, VH = Math.round((VW * 4) / 3), DPR = 2; // 3:4 (390x520 → 780x1040)
const PINK = "#ec4899";
const FONT_FAMILY = "'SUITE Variable','Noto Sans KR',sans-serif";
const FONT_CACHE = path.join(require("node:os").tmpdir(), "SUITE-Variable.woff2");
const FONT_URLS = [
  "https://cdn.jsdelivr.net/gh/sunn-us/SUITE/fonts/variable/woff2/SUITE-Variable.woff2",
  "https://raw.githubusercontent.com/sunn-us/SUITE/master/fonts/variable/woff2/SUITE-Variable.woff2",
];

// 소비자 여정 슬라이드. target: 하이라이트/스크롤 기준 요소(없으면 상단 그대로).
const SHOTS = [
  // ── 시작하기 (start) ──
  { id: "c-auth", route: "/auth", auth: false, label: "카카오·구글로 1초 시작", target: { sel: 'button:has-text("카카오로 계속하기")' }, pad: 10 },
  { id: "c-home-tabs", route: "/", auth: false, label: "분야별 상단 탭", target: { sel: 'text=AI 플래너에게 물어보기' }, pad: 10 },
  { id: "c-home-tools", route: "/", auth: false, label: "빠른 도구", target: { sel: 'text=업체보드' }, pad: 12 },
  { id: "c-home-nav", route: "/", auth: false, label: "하단 메뉴", below: true, target: { pick: (p) => p.getByText("커뮤니티").last() }, pad: 10 },
  // ── 업체 찾기·비교 (find) ──
  { id: "c-category", route: "/venues", auth: false, label: "지역·가격·평점 필터", target: { sel: 'text=가격대' }, pad: 10 },
  { id: "c-vendor", route: `/vendor/${PID}`, auth: false, label: "가격·핵심스펙·혜택 한눈에", target: { sel: 'text=기본정보' }, pad: 10 },
  { id: "c-board", route: "/board", auth: true, label: "보드로 진행 현황 정리", target: { sel: 'text=한눈에 정리' }, pad: 12 },
  { id: "c-compare", route: "/compare", auth: false, label: "찜한 업체 비교", target: { sel: 'text=업체 비교' }, pad: 12 },
  // ── 상담·견적·문의 (inquiry) ──
  { id: "c-quote", route: "/quote/new", auth: true, label: "조건 넣고 한 번에 견적", target: { sel: 'text=어떤 업체' }, pad: 10 },
  { id: "c-inquiry", route: `/vendor/${PID}`, auth: false, label: "전화·앱 채팅 문의", below: true, target: { sel: 'button:has-text("문의")' }, pad: 10 },
  { id: "c-contact", route: "/contact", auth: true, label: "고객센터 1:1 문의·챗봇", target: { sel: 'text=1:1 문의' }, pad: 12 },
  // ── 준비 관리 (manage) ──
  { id: "c-schedule", route: "/schedule", auth: true, label: "일정·D-Day 관리", target: { sel: 'text=일정 관리' }, pad: 10 },
  { id: "c-budget", route: "/budget", auth: true, label: "항목별 예산·지출 관리", target: { sel: 'button:has-text("예산 설정하기")' }, pad: 12 },
  // ── AI 도구 (ai) ──
  { id: "c-ai-planner", route: "/ai-planner", auth: true, label: "맞춤 준비 추천", target: { sel: 'text=결혼식 정보를' }, pad: 12 },
  { id: "c-ai-studio", route: "/ai-studio", auth: true, label: "드레스·메이크업·헤어 체험", target: { sel: 'text=웨딩컨설팅' }, pad: 10 },
  // ── 혜택·쇼핑·꿀팁 (benefits) ──
  { id: "c-deals", route: "/deals", auth: false, label: "쿠폰·이벤트·포인트", target: { sel: 'text=진행 중인 이벤트' }, pad: 12 },
  { id: "c-store", route: "/store", auth: false, label: "웨딩 소품·셀프웨딩", target: { sel: 'text=촬영소품' }, pad: 10 },
  { id: "c-tips", route: "/tips", auth: false, label: "카테고리별 준비 꿀팁", target: { pick: (p) => p.getByText("상견례").first() }, pad: 10 },
  // ── 커뮤니티·마이페이지 (community-mypage) ──
  { id: "c-community", route: "/community", auth: false, label: "후기·꿀팁·업체추천", target: { sel: 'text=실시간 후기' }, pad: 10 },
  { id: "c-mypage", route: "/mypage", auth: true, label: "찜·포인트·주문·견적", target: { sel: 'text=주문내역' }, pad: 12 },
];

async function ensureFontB64() {
  if (existsSync(FONT_CACHE)) return readFileSync(FONT_CACHE).toString("base64");
  for (const u of FONT_URLS) {
    try { const r = await fetch(u); if (r.ok) { const b = Buffer.from(await r.arrayBuffer()); writeFileSync(FONT_CACHE, b); return b.toString("base64"); } } catch { /* 다음 */ }
  }
  console.warn("⚠ SUITE 폰트 미수신 — 폴백 폰트로 캡처");
  return null;
}
async function injectFont(page, b64) {
  if (!b64) return;
  await page.addStyleTag({ content: `@font-face{font-family:'SUITE Variable';src:url(data:font/woff2;base64,${b64}) format('woff2');font-weight:100 900;font-style:normal;font-display:block;}` });
  try { await page.evaluate(() => document.fonts.ready); } catch { /* */ }
  await page.waitForTimeout(300);
}
async function dismissOverlays(page) {
  const sels = [
    'button:has-text("오늘 하루 보지 않기")', 'button:has-text("일주일 보지 않기")',
    'button:has-text("나중에")', 'button:has-text("건너뛰기")', 'button:has-text("닫기")',
    'button[aria-label="닫기"]', 'button[aria-label="Close"]',
  ];
  for (let pass = 0; pass < 2; pass++) {
    for (const sel of sels) {
      try { const b = page.locator(sel).first(); if (await b.isVisible({ timeout: 200 })) { await b.click({ timeout: 700 }); await page.waitForTimeout(220); } } catch { /* */ }
    }
  }
  try { await page.keyboard.press("Escape"); } catch { /* */ }
  await page.waitForTimeout(200);
}
async function login(page, b64) {
  await page.goto(`${BASE}/auth`, { waitUntil: "networkidle", timeout: 30000 });
  await injectFont(page, b64);
  await page.fill('input[type="email"]', "preview@mock.local");
  await page.fill('input[type="password"]', "mockpass123");
  await page.click('button:has-text("로그인")');
  await page.waitForTimeout(3000);
}
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

(async () => {
  const b64 = await ensureFontB64();
  const browser = await chromium.launch({ ...(exe() ? { executablePath: exe() } : {}), headless: true, args: ["--no-sandbox"] });
  const page = await (await browser.newContext({ viewport: { width: VW, height: VH }, deviceScaleFactor: DPR })).newPage();
  const shots = SHOTS.filter((s) => ONLY.length === 0 || ONLY.includes(s.id)).sort((a, b) => Number(a.auth) - Number(b.auth));
  let loggedIn = false;
  for (const s of shots) {
    try {
      if (s.auth && !loggedIn) { await login(page, b64); loggedIn = true; }
      await page.goto(`${BASE}${s.route}`, { waitUntil: "networkidle", timeout: 30000 });
      await injectFont(page, b64);
      await page.waitForTimeout(1300);
      await dismissOverlays(page);
      if (DISCOVER) { await page.screenshot({ path: path.join("/tmp/disc", `c-${s.id}.png`), fullPage: true }); console.log("· disc", s.id); continue; }
      let rect = null;
      if (s.target) {
        const loc = s.target.pick ? s.target.pick(page) : page.locator(s.target.sel).first();
        try { await loc.scrollIntoViewIfNeeded({ timeout: 2500 }); } catch { /* */ }
        try {
          const want = await loc.boundingBox();
          if (want) {
            await page.evaluate((y) => window.scrollBy(0, y), Math.max(0, want.y - VH * 0.40));
            await page.waitForTimeout(350);
            const bb = await loc.boundingBox();
            const pad = s.pad ?? 6;
            if (bb) rect = { x: Math.max(2, bb.x - pad), y: Math.max(2, bb.y - pad), w: bb.width + pad * 2, h: bb.height + pad * 2 };
          }
        } catch { /* */ }
      }
      if (rect) await drawOverlay(page, rect, s.label, s.below);
      else console.warn("  ⚠ target 미발견 — 오버레이 없이:", s.id);
      await page.screenshot({ path: path.join(OUT, `${s.id}.png`) });
      console.log("✓", s.id, rect ? "(hi)" : "(no hi)");
    } catch (e) { console.error("✗", s.id, e.message.split("\n")[0]); }
  }
  await browser.close();
})();
