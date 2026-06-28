import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// Partners(사장님) 앱 — 신규 네이티브+웹 앱(Phase 4-B). 소비자 앱(root)과 별도 빌드.
// 공유 코드는 @dewy/* 패키지 + 기존 src/{features/partners,components} 를 alias 로 참조.
// 소비자 admob·IAP·위젯·PWA 는 포함하지 않는다(기업회원 전용 — 광고/디지털결제 없음).
const ROOT = path.resolve(__dirname, "../..");

export default defineConfig({
  root: __dirname,
  // PostCSS(tailwind) 설정은 레포 루트의 postcss.config.js 를 쓴다.
  css: { postcss: ROOT },
  plugins: [react()],
  resolve: {
    alias: {
      // 더 구체적인 "@/..." 를 "@" 보다 먼저(첫 매칭 우선) — 분리된 패키지로 리다이렉트.
      "@/integrations": path.resolve(ROOT, "packages/db/src"),
      "@/components/ui": path.resolve(ROOT, "packages/ui/src"),
      "@/lib": path.resolve(ROOT, "packages/lib/src"),
      "@/hooks": path.resolve(ROOT, "packages/hooks/src"),
      "@/contexts": path.resolve(ROOT, "packages/shared/src/contexts"),
      "@/types": path.resolve(ROOT, "packages/shared/src/types"),
      "@/data": path.resolve(ROOT, "packages/shared/src/data"),
      "@dewy/lib": path.resolve(ROOT, "packages/lib/src/index.ts"),
      // 나머지 "@/..."(features/partners·components 비-ui 등)는 소비자 root src 를 가리킨다.
      // (4-A3 에서 consumer 를 apps/consumer 로 옮기면 features/partners 도 분리 — 그때 정리)
      "@": path.resolve(ROOT, "src"),
    },
  },
  build: {
    outDir: path.resolve(__dirname, "dist"),
    emptyOutDir: true,
  },
});
