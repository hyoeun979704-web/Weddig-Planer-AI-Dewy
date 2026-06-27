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
  // ── 도메인 경계(앱 분리 Phase 1) — 역의존·교차도메인 import 를 린트로 상시 차단 ──
  // 새 feature 추가 시 이 규칙도 같이 갱신한다. 단일 소스: AGENTS.md "작업 영역·경계".
  // flat config 는 같은 규칙을 여러 블록이 정의하면 "마지막 매칭이 덮어쓰기"(merge 아님)이므로,
  // 파일당 정확히 한 블록만 no-restricted-imports 를 설정하도록 구성한다(아래 셋은 files 가 상호배타).
  //
  // ① inbound 가드 — feature 가 아닌 코드(shared·아직 분리 전 consumer 페이지)는 어떤 feature 도
  //    직접 import 금지. 라우트 마운트(App.tsx)와 feature 내부(features/**)는 제외.
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/features/**", "src/App.tsx"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [{
          group: [
            "@/features/partners", "@/features/partners/*", "@/features/partners/**",
            "@/features/console", "@/features/console/*", "@/features/console/**",
            "@/features/consumer", "@/features/consumer/*", "@/features/consumer/**",
          ],
          message:
            "도메인 경계 위반: feature 외부에서 @/features/* 직접 import 금지. 공유 코드는 @/lib·@/components(·/ui)·@/hooks·@/types·@/contexts 로 올리고, 라우트 마운트는 App.tsx 만 허용.",
        }],
      }],
    },
  },
  // ② partners 는 다른 feature(console·consumer)를 직접 import 금지(공유는 shared 경유).
  {
    files: ["src/features/partners/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [{
          group: [
            "@/features/console", "@/features/console/*", "@/features/console/**",
            "@/features/consumer", "@/features/consumer/*", "@/features/consumer/**",
          ],
          message: "도메인 경계 위반: partners 가 다른 feature(console·consumer)를 직접 import 금지. 공유는 shared(@/lib 등) 경유.",
        }],
      }],
    },
  },
  // ③ console 은 다른 feature(partners·consumer)를 직접 import 금지(공유는 shared 경유).
  {
    files: ["src/features/console/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [{
          group: [
            "@/features/partners", "@/features/partners/*", "@/features/partners/**",
            "@/features/consumer", "@/features/consumer/*", "@/features/consumer/**",
          ],
          message: "도메인 경계 위반: console 이 다른 feature(partners·consumer)를 직접 import 금지. 공유는 shared(@/lib 등) 경유.",
        }],
      }],
    },
  },
  // ④ consumer 는 다른 feature(partners·console)를 직접 import 금지(공유는 shared 경유).
  {
    files: ["src/features/consumer/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [{
          group: [
            "@/features/partners", "@/features/partners/*", "@/features/partners/**",
            "@/features/console", "@/features/console/*", "@/features/console/**",
          ],
          message: "도메인 경계 위반: consumer 가 다른 feature(partners·console)를 직접 import 금지. 공유는 shared(@/lib 등) 경유.",
        }],
      }],
    },
  },
);
