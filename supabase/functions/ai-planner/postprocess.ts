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

export const VENDOR_DISCLAIMER =
  "\n\n_⚠️ 위에 특정 업체·사이트명이 있다면 정확하지 않을 수 있어요(AI가 없는 곳을 잘못 떠올릴 수 있어요). 실제 이용 전에 네이버·구글 검색이나 Dewy 업체 탐색으로 꼭 확인해 주세요._";

// 외부 업체를 실명으로 추천하는 환각 신호(스트리밍이라 이미 나간 텍스트는 못 지우므로
// 경고 면책을 덧붙인다). 근거주입(grounding) 없이 나타나면 위험:
//  - URL 이 아닌데 "웹사이트: ○○" 처럼 상호를 링크처럼 단 경우(거의 확실한 환각)
const FABRICATED_LINK_RE = /웹\s*사이트\s*[:：]\s*(?!https?:\/\/|www\.)\S/;
//  - "브랜드:/업체:/상호:" 항목 나열(없는 업체 카탈로그를 지어낸 패턴) — 2개 이상이면 위험
const VENDOR_CATALOG_RE = /(^|\n)\s*(브랜드|업체|상호)\s*[:：]/g;

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

  // 업체 추천 환각 방어 — 입력 기반(isVendorQuery)뿐 아니라 출력 기반 신호도 본다.
  // 인쇄소 등 Dewy 카테고리 밖 질문은 isVendorQuery=false 라 입력만으로는 못 잡으므로,
  // 출력에 가짜 링크/지어낸 업체 카탈로그가 보이면 면책을 덧붙인다.
  const hasGrounding = ctx.groundedVendorNames.length > 0;
  const fabricatedLink = FABRICATED_LINK_RE.test(text);
  const catalogCount = (text.match(VENDOR_CATALOG_RE) ?? []).length;
  const ungroundedVendorIntent = ctx.isVendorQuery && !hasGrounding;

  if (!hasGrounding && (fabricatedLink || catalogCount >= 2 || ungroundedVendorIntent)) {
    appendix += VENDOR_DISCLAIMER;
    warnings.push(
      `L4 audit: external-vendor hallucination risk (link=${fabricatedLink}, catalog=${catalogCount}, ungroundedIntent=${ungroundedVendorIntent}) — disclaimer appended`,
    );
  } else if (ctx.isVendorQuery && hasGrounding) {
    const used = ctx.groundedVendorNames.filter((n) => text.includes(n)).length;
    warnings.push(`L4 audit: vendor grounding used ${used}/${ctx.groundedVendorNames.length}`);
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
