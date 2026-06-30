// 견적 답변 템플릿 — 반복 입력 제거(1인 운영 레버, 경쟁사 §E). 자동 발송이 아니라
// "자주 쓰는 문구를 저장해 한 번에 채우기"(안전 버전). 기기별 localStorage 영속.
// 안전 가드(throw 환경 무시) — iOS 프라이빗 모드 등.

const KEY = "dewy_quote_templates";
const MAX = 8;

/** 첫 사용자용 기본 제안(저장본이 없을 때만 노출). */
export const DEFAULT_QUOTE_TEMPLATES: string[] = [
  "안녕하세요! 문의 주셔서 감사합니다. 요청하신 일정 예약 가능하며 견적 안내드릴게요.",
  "안녕하세요, 견적 문의 감사합니다. 패키지 구성과 가격 아래로 안내드려요. 추가 문의 편히 남겨주세요.",
];

export function loadQuoteTemplates(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string" && x.trim()).slice(0, MAX) : [];
  } catch {
    return [];
  }
}

/** 텍스트를 템플릿으로 저장(중복 제거·맨 앞, 최대 MAX). 갱신된 목록 반환. */
export function saveQuoteTemplate(text: string): string[] {
  const t = text.trim();
  if (!t) return loadQuoteTemplates();
  const next = [t, ...loadQuoteTemplates().filter((x) => x !== t)].slice(0, MAX);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage 불가 환경 무시 */
  }
  return next;
}

/** 템플릿 삭제. 갱신된 목록 반환. */
export function removeQuoteTemplate(text: string): string[] {
  const next = loadQuoteTemplates().filter((x) => x !== text);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* 무시 */
  }
  return next;
}
