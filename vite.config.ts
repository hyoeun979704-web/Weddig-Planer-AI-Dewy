import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => ({
  define: {
    // Fallback values when .env is not auto-generated
    ...(!process.env.VITE_SUPABASE_URL && {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify('https://bkbdoswqkemctcrcevxz.supabase.co'),
    }),
    ...(!process.env.VITE_SUPABASE_PUBLISHABLE_KEY && {
      'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': JSON.stringify('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrYmRvc3dxa2VtY3RjcmNldnh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2MDUzMjcsImV4cCI6MjA4NDE4MTMyN30.D9wbjryQv13A_Te4LBdJ851eWvwZSSSgAGL5JgY0E5k'),
    }),
    ...(!process.env.VITE_SUPABASE_PROJECT_ID && {
      'import.meta.env.VITE_SUPABASE_PROJECT_ID': JSON.stringify('bkbdoswqkemctcrcevxz'),
    }),
  },
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
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
          { src: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "/icon-512x512.png", sizes: "512x512", type: "image/png" },
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
    },
  },
}));
