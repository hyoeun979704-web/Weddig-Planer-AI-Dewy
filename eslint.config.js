import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "android", "ios", "node_modules", "supabase/functions"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-empty-object-type": "warn",
      "@typescript-eslint/no-require-imports": "off",
      "no-useless-escape": "warn",
      "prefer-const": "warn",
    },
  },
  // ── 도메인 경계(앱 분리 Phase 1-d) — 역의존·교차도메인 import 를 린트로 상시 차단 ──
  // 새 feature(consumer·console) 추가 시 이 규칙도 같이 갱신한다. 단일 소스: AGENTS.md "작업 영역·경계".
  // ① partners 외부(shared·consumer 등)는 @/features/partners 직접 import 금지. 라우트 마운트는 App.tsx 만 예외.
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/features/partners/**", "src/App.tsx"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [{
          group: ["@/features/partners", "@/features/partners/*", "@/features/partners/**"],
          message:
            "도메인 경계 위반: partners 외부에서 @/features/partners 직접 import 금지. 공유 코드는 @/lib·@/components/ui·@/hooks·@/types·@/contexts 로 올리고, 라우트 마운트는 App.tsx 만 허용.",
        }],
      }],
    },
  },
  // ② partners 는 다른 feature(consumer·console)를 직접 import 금지(도메인끼리 직접 의존 차단 — 공유는 shared 경유).
  {
    files: ["src/features/partners/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [{
          group: [
            "@/features/consumer", "@/features/consumer/*", "@/features/consumer/**",
            "@/features/console", "@/features/console/*", "@/features/console/**",
          ],
          message:
            "도메인 경계 위반: partners 가 다른 feature(consumer·console)를 직접 import 금지. 공유는 shared(@/lib 등) 경유.",
        }],
      }],
    },
  },
);
