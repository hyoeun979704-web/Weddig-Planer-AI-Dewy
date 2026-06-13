#!/usr/bin/env node
/**
 * FE↔BE 값 정합성 가드 (CI).
 *
 * "컬럼/RPC 가 존재하는가"는 타입체크가 잡지만, 코드가 (supabase as any) 로 타입을
 * 우회하면 "프론트가 읽는 값의 *의미*가 백엔드가 쓰는 값과 같은가"는 아무도 안 잡는다.
 * 이 스크립트는 한 번 고친 회귀가 다시 기어들어오는 걸 PR 단계에서 빨갛게 만든다.
 *
 * 규칙은 데이터로 관리한다(아래 RULES). 새 회귀를 잡았으면 여기에 한 줄 추가.
 * 실행: `node scripts/check-integrity.mjs` (CI verify 잡에서 호출).
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const ROOTS = ["src", "supabase/functions"];
const EXTS = new Set([".ts", ".tsx"]);

/** @typedef {{id:string, pattern:RegExp, message:string, level:"error"|"warn", exclude?:string[]}} Rule */
/** @type {Rule[]} */
const RULES = [
  {
    id: "legacy-total-points",
    pattern: /\btotal_points\b/,
    message:
      "user_points.total_points 는 spend 시 차감되지 않는 레거시 컬럼. 사용 가능 잔액은 balance 를 읽으세요.",
    level: "error",
    exclude: ["integrations/supabase/types.ts"],
  },
  {
    id: "inline-won-format",
    pattern: /toLocaleString\(\)\s*\+\s*["']원["']/,
    message:
      '인라인 `toLocaleString() + "원"` 금지 — 드리프트 방지를 위해 @/lib/priceFormat 의 formatWon 을 쓰세요.',
    level: "error",
    exclude: ["lib/priceFormat.ts"],
  },
  {
    id: "category-suit-slug",
    pattern: /["']category["']\s*,\s*["']suit["']/,
    message:
      'places.category 에는 "suit" 가 아니라 "tailor_shop" 이 저장됩니다(예복). user-facing slug 를 쿼리에 쓰면 0건이 됩니다 — toDbCategory 로 변환하세요.',
    level: "error",
  },
  {
    id: "dropped-legacy-table",
    pattern: /from\(\s*["'`](venues|studios|suits|hanbok|honeymoon|honeymoon_gifts|appliances)["'`]/,
    message:
      "드롭된 레거시 테이블 참조. 현 구조는 places + place_* 서브타입입니다(예: 웨딩홀=places category=wedding_hall).",
    level: "error",
  },
  {
    id: "window-confirm",
    pattern: /window\.confirm\s*\(/,
    message:
      "raw window.confirm 대신 @/components/ui/confirm-dialog 의 confirm() 을 쓰세요(스타일·접근성 일관).",
    level: "warn",
    exclude: ["ui/confirm-dialog.tsx"],
  },
];

/** 주석(라인 //, 블록 /* *​/)을 제거하되 줄 번호는 보존한다(공백으로 치환). */
function stripComments(src) {
  let out = "";
  let i = 0;
  let state = "code"; // code | line | block | str | tmpl
  let quote = "";
  while (i < src.length) {
    const c = src[i];
    const n = src[i + 1];
    if (state === "code") {
      if (c === "/" && n === "/") { state = "line"; out += "  "; i += 2; continue; }
      if (c === "/" && n === "*") { state = "block"; out += "  "; i += 2; continue; }
      if (c === '"' || c === "'") { state = "str"; quote = c; out += c; i++; continue; }
      if (c === "`") { state = "tmpl"; out += c; i++; continue; }
      out += c; i++; continue;
    }
    if (state === "line") {
      if (c === "\n") { state = "code"; out += "\n"; i++; continue; }
      out += c === "\t" ? "\t" : " "; i++; continue;
    }
    if (state === "block") {
      if (c === "*" && n === "/") { state = "code"; out += "  "; i += 2; continue; }
      out += c === "\n" ? "\n" : " "; i++; continue;
    }
    if (state === "str") {
      out += c;
      if (c === "\\") { out += src[i + 1] ?? ""; i += 2; continue; }
      if (c === quote) state = "code";
      i++; continue;
    }
    if (state === "tmpl") {
      out += c;
      if (c === "\\") { out += src[i + 1] ?? ""; i += 2; continue; }
      if (c === "`") state = "code";
      i++; continue;
    }
  }
  return out;
}

function* walk(dir) {
  let entries;
  try { entries = readdirSync(dir); } catch { return; }
  for (const name of entries) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) { yield* walk(p); continue; }
    if (EXTS.has(extname(p))) yield p;
  }
}

let errors = 0;
let warnings = 0;
for (const root of ROOTS) {
  for (const file of walk(root)) {
    const rel = file.replace(/\\/g, "/");
    const raw = readFileSync(file, "utf8");
    const code = stripComments(raw);
    const lines = code.split("\n");
    for (const rule of RULES) {
      if (rule.exclude?.some((e) => rel.includes(e))) continue;
      lines.forEach((line, idx) => {
        if (rule.pattern.test(line)) {
          const tag = rule.level === "error" ? "ERROR" : "warn";
          console[rule.level === "error" ? "error" : "log"](
            `[${tag}] ${rel}:${idx + 1} (${rule.id}) ${rule.message}`,
          );
          if (rule.level === "error") errors++; else warnings++;
        }
      });
    }
  }
}

console.log(`\n정합성 검사 완료 — error ${errors}건, warning ${warnings}건`);
if (errors > 0) {
  console.error("\n❌ 정합성 위반(error)이 있어 실패합니다. 위 항목을 고치세요.");
  process.exit(1);
}
