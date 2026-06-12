// L4 출력 후처리 — 스트리밍 SSE 를 그대로 통과시키며 전문(full text)을 모으고,
// [DONE] 직전에 값싼 휴리스틱으로 점검한다(비용 0, 정규식만):
//  - 근거주입 없이 구체 금액이 단서 없이 등장 → 면책 한 줄을 델타로 덧붙임
//  - 업체 추천 의도인데 근거주입 0건 → 환각 위험 경고 로깅(초기엔 차단 대신 모니터링)
// 계획: docs/260612_ai_planner_caching_grounding_plan.md L4.

export interface AuditContext {
  /** L2 가격 근거 블록이 주입됐는지 */
  hasPriceGrounding: boolean;
  /** L2 업체 근거로 주입한 업체명(사용률 모니터링) */
  groundedVendorNames: string[];
  /** 업체 추천 의도 질문이었는지 */
  isVendorQuery: boolean;
}

// "300만원", "1,500 만원", "1억" 등 구체 금액. 환각 위험이 큰 단정 수치만 보면 되므로
// %·명 수 등은 제외.
const AMOUNT_RE = /\d[\d,.]*\s*(만\s*원|억)/;
// 이미 한계 단서가 있으면(프롬프트 L3 계약 준수) 면책 중복 금지.
const HEDGE_RE = /(업체|시즌|지역|시기)\s*(별|마다)|견적|상이|다를\s*수|달라/;

export const PRICE_DISCLAIMER =
  "\n\n_위 금액은 일반적인 시세 추정이라 업체·시즌별로 달라질 수 있어요. 정확한 비용은 견적으로 확인해 주세요._";

export interface AuditResult {
  /** 응답 끝에 덧붙일 텍스트(없으면 "") */
  appendix: string;
  /** 서버 로그용 경고(클라 미노출) */
  warnings: string[];
}

export function auditFullText(text: string, ctx: AuditContext): AuditResult {
  const warnings: string[] = [];
  let appendix = "";

  if (!ctx.hasPriceGrounding && AMOUNT_RE.test(text) && !HEDGE_RE.test(text)) {
    appendix = PRICE_DISCLAIMER;
    warnings.push("L4 audit: ungrounded amount without hedge — disclaimer appended");
  }

  if (ctx.isVendorQuery) {
    if (ctx.groundedVendorNames.length === 0) {
      warnings.push("L4 audit: vendor-intent reply without grounding rows (hallucination risk)");
    } else {
      const used = ctx.groundedVendorNames.filter((n) => text.includes(n)).length;
      warnings.push(`L4 audit: vendor grounding used ${used}/${ctx.groundedVendorNames.length}`);
    }
  }

  return { appendix, warnings };
}

/**
 * OpenAI SSE(chat.completions stream) 바이트 스트림용 패스스루 변환.
 * 라인 단위로 버퍼링해 delta.content 를 누적하고, `data: [DONE]` 직전에
 * 감사 결과(면책 문구)를 동일 SSE 포맷의 델타로 주입한다. 파싱 불가 라인은
 * 그대로 통과 — 변환 실패가 응답을 깨지 않게 한다.
 */
export function createSseAuditTransform(
  ctx: AuditContext,
  log: (msg: string) => void = console.warn,
): TransformStream<Uint8Array, Uint8Array> {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let lineBuf = "";
  let fullText = "";
  let audited = false;

  const handleLine = (line: string, controller: TransformStreamDefaultController<Uint8Array>) => {
    const trimmed = line.endsWith("\r") ? line.slice(0, -1) : line;
    if (trimmed.startsWith("data: ")) {
      const payload = trimmed.slice(6).trim();
      if (payload === "[DONE]") {
        if (!audited) {
          audited = true;
          const { appendix, warnings } = auditFullText(fullText, ctx);
          for (const w of warnings) log(w);
          if (appendix) {
            controller.enqueue(encoder.encode(
              `data: ${JSON.stringify({ choices: [{ index: 0, delta: { content: appendix } }] })}\n\n`,
            ));
          }
        }
      } else {
        try {
          const content = JSON.parse(payload)?.choices?.[0]?.delta?.content;
          if (typeof content === "string") fullText += content;
        } catch {
          /* 부분/비표준 라인은 누적 없이 통과 */
        }
      }
    }
    controller.enqueue(encoder.encode(line + "\n"));
  };

  return new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      lineBuf += decoder.decode(chunk, { stream: true });
      let idx: number;
      while ((idx = lineBuf.indexOf("\n")) !== -1) {
        const line = lineBuf.slice(0, idx);
        lineBuf = lineBuf.slice(idx + 1);
        handleLine(line, controller);
      }
    },
    flush(controller) {
      // 개행 없이 끝난 잔여 라인(보통 [DONE])도 동일 처리.
      if (lineBuf) handleLine(lineBuf, controller);
    },
  });
}
