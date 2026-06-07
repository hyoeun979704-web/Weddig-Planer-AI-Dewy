import { defineConfig, devices } from "@playwright/test";

// 출시 시 제거 대상: 이 파일 + e2e/ + .github/workflows/e2e.yml + @playwright/test devDep.
// 메인 빌드/배포 CI(ci.yml)와 독립 — 삭제해도 본 파이프라인 영향 0.
//
// 브라우저: CI 는 `npx playwright install chromium` 으로 받음. 로컬/샌드박스는
// 사전 설치된 chromium 경로를 PW_CHROME_PATH 로 주입(다운로드 불필요).
//   예) PW_CHROME_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome npm run test:e2e
const chromePath = process.env.PW_CHROME_PATH || undefined;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://127.0.0.1:4173",
    // PWA service worker 가 네트워크 인터셉트를 우회/캐시하지 않도록 차단(결정성).
    serviceWorkers: "block",
    trace: "on-first-retry",
    launchOptions: {
      executablePath: chromePath,
      args: ["--no-sandbox"],
    },
  },
  projects: [
    {
      name: "mobile-chromium",
      use: { ...devices["Pixel 5"] },
    },
  ],
  // dist 는 test:e2e 스크립트가 먼저 빌드. 여기선 preview 로 서빙만.
  webServer: {
    command: "npx vite preview --port 4173 --host 127.0.0.1 --strictPort",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
