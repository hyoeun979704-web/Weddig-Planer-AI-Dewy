// LLM 모델 식별자 단일 소스.
//
// 모델 문자열이 13개 함수에 흩어져 있어 모델 교체 시 다수 파일을 고쳐야 했다.
// 여기서 한 번만 바꾸면 전체에 반영된다.
export const MODELS = {
  /** OpenAI 이미지 생성·편집 (images/edits). */
  image: "gpt-image-2",
  /** Gemini 텍스트 생성 — 빠른 tier(generateContent / streamGenerateContent). */
  geminiFlash: "gemini-2.5-flash",
} as const;
