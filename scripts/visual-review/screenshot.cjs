// 비주얼 UX 검토 harness — Playwright 로 실행 중인 앱을 모바일 뷰포트로 캡처.
//
// 용도: UX 변경(특히 페르소나·온보딩·모달)을 실제 화면으로 검토. 단위/통합 테스트가
// 못 잡는 레이아웃·시각 회귀를 사람이 눈으로 확인.
//
// 사전 준비(1회):
//   npm i -D playwright            # 또는 전역
//   npx playwright install chromium
//   npm run dev:vite -- --host 127.0.0.1 --port 5199   # 별 터미널에서 dev 서버
//
// 사용:
//   node scripts/visual-review/screenshot.cjs /              out/home.png
//   node scripts/visual-review/screenshot.cjs /schedule      out/schedule.png --login
//   BASE=http://127.0.0.1:5199 E2E_EMAIL=... E2E_PASSWORD=... node ... --login
//
// 주의:
//  - 로그인·데이터가 필요한 화면(페르소나 모달 등)은 **Supabase 가 네트워크에서
//    닿는 환경**에서만 동작한다. 일부 샌드박스는 supabase.co 를 allowlist 로 막아
//    백엔드 의존 플로우(auth/consent/데이터) 캡처가 불가하다(셸 UI 만 렌더됨).
//  - 프록시 self-signed cert 환경을 위해 --ignore-certificate-errors 를 켠다.

const { chromium } = require("playwright");
const { existsSync, readdirSync } = require("node:fs");

const BASE = process.env.BASE || "http://127.0.0.1:5199";
const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const flags = new Set(process.argv.slice(2).filter((a) => a.startsWith("--")));
const route = args[0] || "/";
const out = args[1] || "screenshot.png";

// 설치된 playwright 브라우저가 없을 때(다운로드 차단 등) 사전설치 경로 fallback.
function resolveExecutable() {
  const dir = process.env.PLAYWRIGHT_BROWSERS_PATH || "/opt/pw-browsers";
  try {
    const hit = readdirSync(dir).find((d) => d.startsWith("chromium-") && !d.includes("headless"));
    const ep = hit && `${dir}/${hit}/chrome-linux/chrome`;
    if (ep && existsSync(ep)) return ep;
  } catch { /* ignore */ }
  return undefined; // playwright 기본 사용
}

async function maybeLogin(page) {
  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;
  if (!email || !password) {
    console.warn("--login 인데 E2E_EMAIL/E2E_PASSWORD 미설정 — 로그인 건너뜀");
    return;
  }
  await page.goto(`${BASE}/auth`, { waitUntil: "networkidle", timeout: 30000 });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button:has-text("로그인")');
  await page.waitForTimeout(4500);
}

// TLS 검증 무력화는 **명시적 opt-in** (INSECURE_TLS=1) 일 때만. 프록시가 self-signed
// cert 로 가로채는 샌드박스 전용. 실네트워크에서 켜면 MITM 에 노출되므로 기본은 보안 유지.
const INSECURE_TLS = process.env.INSECURE_TLS === "1";

(async () => {
  if (INSECURE_TLS) console.warn("⚠️  INSECURE_TLS=1 — 인증서 검증 끔(프록시 환경 전용, 실네트워크 금지)");
  const executablePath = resolveExecutable();
  const browser = await chromium.launch({
    ...(executablePath ? { executablePath } : {}),
    headless: true,
    // --no-sandbox: 컨테이너/root 실행 필수(크롬 자체 샌드박스). cert 무력화는 opt-in.
    args: ["--no-sandbox", ...(INSECURE_TLS ? ["--ignore-certificate-errors"] : [])],
  });
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    ignoreHTTPSErrors: INSECURE_TLS,
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message.split("\n")[0].slice(0, 160)));

  if (flags.has("--login")) await maybeLogin(page);

  try {
    await page.goto(`${BASE}${route}`, { waitUntil: "networkidle", timeout: 35000 });
  } catch (e) {
    console.warn("goto warn:", e.message.split("\n")[0]);
  }
  await page.waitForTimeout(Number(process.env.SETTLE_MS || 3000));
  await page.screenshot({ path: out, fullPage: flags.has("--full") });
  console.log(`✓ ${BASE}${route} → ${out}  (url=${page.url()})`);
  if (errors.length) console.log("page errors:", errors.slice(0, 5));
  await browser.close();
})();
