import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: [
      "src/**/*.{test,spec}.{ts,tsx}",
      "scripts/**/*.{test,spec}.{ts,tsx}",
      "packages/**/*.{test,spec}.{ts,tsx}",
    ],
  },
  resolve: {
    alias: {
      // "@/integrations" 를 "@" 보다 먼저(첫 매칭 우선) — packages/db 로 리다이렉트.
      "@/integrations": path.resolve(__dirname, "./packages/db/src"),
      "@/components/ui": path.resolve(__dirname, "./packages/ui/src"),
      "@/lib": path.resolve(__dirname, "./packages/lib/src"),
      "@/hooks": path.resolve(__dirname, "./packages/hooks/src"),
      "@dewy/lib": path.resolve(__dirname, "./packages/lib/src/index.ts"),
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
 
