import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

/**
 * 안전영역 회귀 가드 — 컴포넌트/페이지(.tsx)에서 raw `env(safe-area-*)` 직접 사용 금지.
 *
 * 안드로이드 WebView 는 env(safe-area-inset-*) 가 0/유령값이라(#286), 반드시
 * var(--safe-top/--safe-bottom) (= iOS:env / Android:MainActivity 실측 주입) 를 거쳐야
 * 한다. 직접 env() 를 쓰면 하단 CTA 가 하단탭·홈인디케이터에 가리는 회귀가 반복됐다.
 * 정의는 src/index.css 단일 소스에만 둔다(이 테스트는 .css 를 스캔하지 않음).
 */
const SRC = join(process.cwd(), "src");

function tsxFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...tsxFiles(p));
    else if (name.endsWith(".tsx")) out.push(p);
  }
  return out;
}

// 주석(// ... , /* ... */)을 제거해 설명문 속 env() 언급은 오탐하지 않는다.
function stripComments(code: string): string {
  return code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
}

describe("safe-area regression guard", () => {
  it("no .tsx uses raw env(safe-area-*) — use var(--safe-top/--safe-bottom) instead", () => {
    const offenders = tsxFiles(SRC)
      .filter((f) => /env\(\s*safe-area/.test(stripComments(readFileSync(f, "utf8"))))
      .map((f) => f.replace(SRC, "src"));
    expect(offenders, `raw env(safe-area-*) 사용 — var(--safe-*) 또는 .safe-bottom-cta 로 교체:\n${offenders.join("\n")}`).toEqual([]);
  });
});
