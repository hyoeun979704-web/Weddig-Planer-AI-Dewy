// 개인화 스타일 선호(퍼스널컬러·실루엣·립톤 등) → 프롬프트 애드덤 — 서버측 단일 소스.
//
// 배경: 기존엔 클라이언트가 buildDressPromptAddendum/buildMakeupPromptAddendum
// (packages/lib/src/weddingContext.ts)으로 만든 문자열을 전체 프롬프트에 붙여 보냈다.
// 프롬프트 조립이 서버로 이관되면서, 개인화 신호는 "경계 지어진 구조화 슬롯"으로만
// 받는다: 항목별 길이 제한 + 단일라인 강제 + 허용문자 필터 → 임의 지시문 주입 차단.
// 렌더 문구는 weddingContext.ts 애드덤과 동일한 골격(STYLE PREFERENCE, secondary)을 유지.

export interface StylePreferenceInput {
  season?: unknown;      // 퍼스널컬러 시즌 라벨 (예: "여름 뮤트")
  tone?: unknown;        // warm | cool | neutral
  dress_white?: unknown; // 어울리는 드레스 화이트 톤 이름
  silhouettes?: unknown; // 추천 실루엣 목록
  necklines?: unknown;   // 추천 넥라인 목록
  metal?: unknown;       // 주얼리 메탈
  style_tags?: unknown;  // 선호 무드 태그
  lip?: unknown; cheek?: unknown; eye?: unknown; // 메이크업 컬러 이름
}

const TONE_LABEL: Record<string, string> = {
  warm: "웜톤",
  cool: "쿨톤",
  neutral: "뉴트럴톤",
};

// 한 항목: 단일 라인, 40자 제한, 문자·숫자·공백·한글·쉼표·하이픈·괄호·#(hex)만 허용.
const TOKEN_MAX = 40;
const LIST_MAX = 4;

function cleanToken(v: unknown): string {
  if (typeof v !== "string") return "";
  return v
    .replace(/[\r\n\t]+/g, " ")
    .replace(/[^\p{L}\p{N} ,\-()#·/]/gu, "")
    .trim()
    .slice(0, TOKEN_MAX);
}

function cleanList(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map(cleanToken).filter(Boolean).slice(0, LIST_MAX);
}

/** 드레스 추천 애드덤(서버 렌더). 신호 없으면 "" — 프롬프트 무변경. */
export function buildDressStyleAddendum(input: StylePreferenceInput | null | undefined): string {
  if (!input || typeof input !== "object") return "";
  const lines: string[] = [];
  const season = cleanToken(input.season);
  const tone = typeof input.tone === "string" ? TONE_LABEL[input.tone] ?? "" : "";
  if (season || tone) lines.push(`- Personal color season: ${season} ${tone}`.trim());
  const dressWhite = cleanToken(input.dress_white);
  if (dressWhite) lines.push(`- Favor dress white tone: ${dressWhite}`);
  const silhouettes = cleanList(input.silhouettes);
  if (silhouettes.length) lines.push(`- Favor silhouettes: ${silhouettes.join(", ")}`);
  const necklines = cleanList(input.necklines);
  if (necklines.length) lines.push(`- Favor necklines: ${necklines.join(", ")}`);
  const metal = cleanToken(input.metal);
  if (metal) lines.push(`- Jewelry metal: ${metal}`);
  const tags = cleanList(input.style_tags);
  if (tags.length) lines.push(`- Overall mood: ${tags.join(", ")}`);
  if (!lines.length) return "";
  return (
    "\n\nSTYLE PREFERENCE (secondary — never override the identity rules above; " +
    "apply only to wardrobe & styling choices):\n" +
    lines.join("\n")
  );
}

/** 메이크업 추천 애드덤(서버 렌더). 신호 없으면 "". */
export function buildMakeupStyleAddendum(input: StylePreferenceInput | null | undefined): string {
  if (!input || typeof input !== "object") return "";
  const lines: string[] = [];
  const season = cleanToken(input.season);
  const tone = typeof input.tone === "string" ? TONE_LABEL[input.tone] ?? "" : "";
  if (season || tone) lines.push(`- Personal color season: ${season} ${tone}`.trim());
  const lip = cleanToken(input.lip);
  if (lip) lines.push(`- Lip tone: ${lip}`);
  const cheek = cleanToken(input.cheek);
  if (cheek) lines.push(`- Cheek tone: ${cheek}`);
  const eye = cleanToken(input.eye);
  if (eye) lines.push(`- Eye tone: ${eye}`);
  const tags = cleanList(input.style_tags);
  if (tags.length) lines.push(`- Overall mood: ${tags.join(", ")}`);
  if (!lines.length) return "";
  return (
    "\n\nSTYLE PREFERENCE (secondary — never override the identity rules above; " +
    "apply only to makeup color choices):\n" +
    lines.join("\n")
  );
}

/** 신랑 예복 자유 텍스트(수트 설명) 살균 — 여러 줄 허용하되 300자 제한 + 제어문자 제거. */
export function cleanSuitText(v: unknown): string {
  if (typeof v !== "string") return "";
  return v
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim()
    .slice(0, 300);
}
