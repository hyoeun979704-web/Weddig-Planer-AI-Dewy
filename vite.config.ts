import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => {
  // Capacitor 빌드(`vite build --mode capacitor`)는 file:// 로 자산을 로드하므로
  // 상대경로 base가 필요하고, 네이티브 푸시/세션 갱신과 충돌하는 PWA SW는 끈다.
  const isCapacitor = mode === "capacitor";

  return {
    base: isCapacitor ? "./" : "/",
    server: {
      host: "::",
      port: 8080,
    },
    plugins: [
      react(),
      !isCapacitor &&
        VitePWA({
          registerType: "autoUpdate",
          manifest: {
            name: "Dewy - AI 웨딩플래너와 함께하는 결혼준비",
            short_name: "Dewy",
            description: "둘이니까, 쉬워지니까.",
            theme_color: "#F4A7B9",
            background_color: "#FDF8F6",
            display: "standalone",
            start_url: "/",
            icons: [
              {
                src: "/dewy-logo.png",
                sizes: "192x192",
                type: "image/png",
              },
              {
                src: "/dewy-logo.png",
                sizes: "500x500",
                type: "image/png",
                purpose: "any maskable",
              },
            ],
          },
          workbox: {
            globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
            // 오래된 precache 정리(배포 시 구 캐시 제거).
            cleanupOutdatedCaches: true,
            // 네비게이션(HTML)은 '네트워크 우선' → 배포 즉시 최신 index.html(=최신 JS 번들)을
            // 받는다. precache 된 옛 index.html 이 서빙돼 '구버전이 번갈아 뜨던' 현상 제거.
            // 오프라인은 NetworkFirst 의 캐시 폴백(+precache)으로 유지.
            runtimeCaching: [
              {
                urlPattern: ({ request }: { request: Request }) => request.mode === "navigate",
                handler: "NetworkFirst",
                options: {
                  cacheName: "html-network-first",
                  networkTimeoutSeconds: 3,
                  expiration: { maxEntries: 10 },
                },
              },
            ],
          },
        }),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        // Capacitor 빌드에서는 PWA 플러그인이 꺼져 가상 모듈이 없으므로 no-op shim 으로 대체.
        ...(isCapacitor
          ? {
              "virtual:pwa-register/react": path.resolve(
                __dirname,
                "./src/shims/pwa-register-react.ts",
              ),
            }
          : {}),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes("node_modules")) return undefined;
            if (id.includes("@supabase")) return "vendor-supabase";
            if (id.includes("jspdf")) return "vendor-pdf";
            if (id.includes("html2canvas")) return "vendor-canvas";
            // 무거운 기능 라이브러리를 분리해 메인(index) 청크 축소 → 초기 로딩 단축.
            // ("konva" 는 react-konva 까지 포함. 청첩장 에디터에서만 쓰여 분리 효과 큼)
            if (id.includes("konva")) return "vendor-konva";
            if (id.includes("recharts")) return "vendor-charts";
            if (id.includes("framer-motion")) return "vendor-motion";
            if (id.includes("@tanstack")) return "vendor-query";
            if (id.includes("react-router")) return "vendor-router";
            if (id.includes("lucide-react")) return "vendor-icons";
            return undefined;
          },
        },
      },
    },
  };
});
