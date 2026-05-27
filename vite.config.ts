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
            return undefined;
          },
        },
      },
    },
  };
});
