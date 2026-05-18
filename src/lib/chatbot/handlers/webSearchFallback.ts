/**
 * DB에 매칭 업체가 없거나 부족할 때 호출되는 Gemini Search Grounding
 * 폴백. 안전 설계:
 * - 함수 호출 자체가 실패해도 (edge function 미배포·키 누락·네트워크
 *   오류) 빈 결과를 반환 → 호출부가 기존 "데이터 없음" 메시지로 graceful
 *   degradation
 * - 출처는 Gemini grounding metadata에서 받은 URL만 노출 (환각 차단)
 * - 일 5회 한도는 ai-planner와 합산 (별도 카운터 없음)
 */

import { supabase } from "@/integrations/supabase/client";

export interface WebSearchResult {
  reply: string;
  sources: { title: string; uri: string }[];
  grounded: boolean;
  /** edge function이 응답을 못 줬을 때 true — 호출부가 fallback 메시지 출력 */
  failed?: boolean;
  /** 일 한도 소진 등으로 거부된 경우 메시지 */
  limitMessage?: string;
}

export const callWebSearch = async (
  queryType: "search" | "price" | "popular",
  originalMessage: string,
  context?: { category?: string; region?: string },
): Promise<WebSearchResult> => {
  try {
    const { data, error } = await supabase.functions.invoke("vendor-web-search", {
      body: {
        queryType,
        originalMessage,
        category: context?.category,
        region: context?.region,
      },
    });

    if (error) {
      // 일 한도 초과는 별도 메시지로 노출
      const msg = (error as any)?.context?.body?.message ?? error.message;
      if (msg?.includes("daily_limit") || msg?.includes("5회를 모두")) {
        return {
          reply: "",
          sources: [],
          grounded: false,
          failed: true,
          limitMessage: "오늘의 무료 질문 5회를 모두 사용했어요. 내일 다시 시도하시거나 프리미엄으로 무제한 가능해요.",
        };
      }
      console.warn("vendor-web-search failed:", error);
      return { reply: "", sources: [], grounded: false, failed: true };
    }

    if (!data?.reply) {
      return { reply: "", sources: [], grounded: false, failed: true };
    }

    return {
      reply: data.reply,
      sources: data.sources ?? [],
      grounded: !!data.grounded,
    };
  } catch (e) {
    console.warn("vendor-web-search invoke error:", e);
    return { reply: "", sources: [], grounded: false, failed: true };
  }
};

/**
 * 응답 본문 + sources를 사용자에게 보여줄 마크다운으로 조립.
 * sources가 비어있으면 출처 섹션 생략.
 */
export const formatWebSearchReply = (result: WebSearchResult): string => {
  if (!result.reply) return "";

  if (result.sources.length === 0) return result.reply;

  const sourceLines = result.sources
    .map((s) => `- [${s.title}](${s.uri})`)
    .join("\n");

  return `${result.reply}\n\n---\n **출처** (웹 검색 결과)\n${sourceLines}`;
};
