// 보정 강도(리터치 레벨) — AI 스튜디오 이미지 프롬프트 공용 빌딩 블록(단일 소스).
//
// 배경: 실제 웨딩촬영·본식 당일은 전문 헤어·메이크업·조명·작가 후보정이 들어간
// "외모 최고점"이다. 기존 프롬프트는 정체성 보존을 위해 보정을 일괄 금지해
// "당일 모습 미리보기"라는 목적과 어긋났다. 이 모듈은 보정 강도를 사용자가
// 선택하게 하되, 어느 레벨에서도 얼굴 기하(이목구비·비율·나이·정체성)는
// 절대 변경하지 않는다 — 보정은 피부 마감·조명·폴리시에만 적용.
//
// 레벨:
//   natural — 무보정(기존 동작 그대로, 서버 기본값 = 회귀 0)
//   studio  — 화보 보정: 한국 웨딩 스튜디오 납품본 수준의 중간 보정(추천 기본 UI 선택)
//   glam    — 풀 보정: 매거진 화보급 하이엔드 보정
//
// Deno(엣지 함수)·Vite(웹) 겸용 순수 모듈 — 플랫폼 API 사용 금지.

export type RetouchLevel = "natural" | "studio" | "glam";

export const RETOUCH_LEVELS: { value: RetouchLevel; ko: string; desc: string }[] = [
  { value: "natural", ko: "자연 그대로", desc: "보정 없이 지금 모습 그대로" },
  { value: "studio", ko: "화보 보정", desc: "웨딩 스튜디오 납품본 수준의 보정 (추천)" },
  { value: "glam", ko: "풀 보정", desc: "매거진 화보급 하이엔드 보정" },
];

export const retouchLevelKo = (v: RetouchLevel): string =>
  RETOUCH_LEVELS.find((r) => r.value === v)?.ko ?? v;

/** 요청 body 의 retouch_level 안전 파싱. 미상/미지정은 natural(기존 동작). */
export function parseRetouchLevel(v: unknown): RetouchLevel {
  return v === "studio" || v === "glam" ? v : "natural";
}

/**
 * 프롬프트에 주입할 RETOUCH 섹션. natural 은 빈 문자열(프롬프트 무변경 = 회귀 0).
 * 모든 레벨에서 얼굴 기하·정체성 불변을 명시해 identity lock 과 충돌하지 않게 한다.
 */
export function retouchBlock(level: RetouchLevel, gender: "bride" | "groom" = "bride"): string {
  if (level === "natural") return "";
  const [poss, pron] = gender === "groom" ? ["his", "He"] : ["her", "She"];
  if (level === "studio") {
    return `RETOUCH — professional wedding-photo retouching (moderate)
This portrait represents ${poss} actual wedding day — professionally styled, lit
and retouched, the way a Korean wedding studio delivers its final photos. Apply
moderate professional retouching: smooth the skin gently WITHOUT losing natural
texture and pores, even out the skin tone, clear temporary blemishes and lightly
brighten under-eyes, subtly brighten the eyes, a healthy well-rested glow, and a
flattering professional color grade (soft contrast, warm highlights — protect skin
undertones and keep white garments neutral). Retouching applies ONLY to skin
finish, lighting and polish — NEVER alter facial geometry, feature shapes, face
proportions, facial asymmetry, age, body shape, or identity. ${pron} must remain
instantly recognizable.`;
  }
  return `RETOUCH — editorial magazine-level retouching (high)
This portrait represents ${poss} absolute peak — a premium wedding-magazine cover
finish. Apply high-end editorial retouching: flawless luminous skin with a polished
studio glow (this intentionally relaxes any "keep natural skin texture" guidance —
refined editorial skin is desired here), tamed hair flyaways, immaculate styling,
radiant eyes, glossy magazine-cover finish, and a premium cinematic color grade
(protect skin undertones and keep white garments neutral). Even at this level,
NEVER alter facial geometry, feature shapes, face proportions, facial asymmetry,
ethnic features, age, or body shape — the output must be the same person,
unmistakably, on ${poss} best day.`;
}
