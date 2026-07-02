// AI 스튜디오 엣지 함수 에러 → 코드 추출·한국어 안내 매핑 — 단일 소스.
//
// 배경: supabase.functions.invoke 는 non-2xx 에서 FunctionsHttpError 를 던지는데
// .message 가 "Edge Function returned a non-2xx status code" 라 페이지의
// msg.includes("insufficient_hearts") 분기가 서버 402 를 못 잡았다(photoFix 만
// context.json() 파싱). 여기로 추출·매핑을 모아 전 플로우 UX 를 통일한다.
// 새 코드(결제 전 품질 게이트·이중 제출 가드)도 여기에만 추가하면 된다.

/** FunctionsHttpError 의 response body 에서 구조화 에러 코드를 추출. 실패 시 null. */
export async function edgeErrorCode(error: unknown): Promise<string | null> {
  try {
    const ctx = (error as { context?: { json?: () => Promise<{ error?: string }> } }).context;
    if (ctx?.json) {
      const code = (await ctx.json())?.error;
      if (typeof code === "string" && code) return code;
    }
  } catch {
    /* body 미파싱 — null 폴백 */
  }
  return null;
}

/**
 * invoke 결과의 error 를 "코드를 담은 Error" 로 정규화해 throw.
 * 데이터 레이어 generate* 공용 idiom: `if (error) throw await toStudioError(error);`
 */
export async function toStudioError(error: unknown): Promise<Error> {
  const code = await edgeErrorCode(error);
  if (code) return new Error(code);
  const msg = (error as { message?: string })?.message;
  return error instanceof Error ? error : new Error(msg ?? "생성 요청 실패");
}

export interface StudioErrorMessage {
  title: string;
  description?: string;
}

// 코드 → 사용자 안내(한국어). 하트 미차감 케이스는 그 사실을 명시해 불안을 줄인다.
const MESSAGES: Record<string, StudioErrorMessage> = {
  no_face_detected: {
    title: "얼굴을 찾지 못했어요",
    description: "얼굴이 잘 보이는 본인 사진으로 다시 올려주세요. 하트는 차감되지 않았어요.",
  },
  multiple_faces: {
    title: "사진에 여러 명이 있어요",
    description: "본인 혼자 나온 사진으로 다시 올려주세요. 하트는 차감되지 않았어요.",
  },
  face_fully_covered: {
    title: "얼굴이 가려져 있어요",
    description:
      "마스크·선글라스 없이 이목구비가 보이는 사진으로 다시 올려주세요. 하트는 차감되지 않았어요.",
  },
  duplicate_request: {
    title: "이미 생성 중이에요",
    description: "직전 요청을 처리하고 있어요. 하트는 추가로 차감되지 않았어요.",
  },
  insufficient_hearts: { title: "하트가 부족해요" },
  generation_failed: {
    title: "생성에 실패했어요",
    description: "하트는 환불됐어요. 다시 시도해주세요.",
  },
  source_download_failed: {
    title: "사진을 불러오지 못했어요",
    description: "사진을 다시 업로드해주세요. 하트는 차감되지 않았어요.",
  },
};

/** 에러 메시지(코드 포함 문자열)에서 알려진 코드를 찾아 안내 반환. 미상이면 null. */
export function studioErrorMessage(msg: string): StudioErrorMessage | null {
  for (const [code, m] of Object.entries(MESSAGES)) {
    if (msg.includes(code)) return m;
  }
  return null;
}
