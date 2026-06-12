// L4 출력 후처리(supabase/functions/ai-planner/postprocess.ts) 회귀 테스트.
// 엣지 함수는 esbuild 번들 검증만 거치므로, SSE 라인 버퍼링·면책 주입 같은
// 분기 로직은 여기서 고정한다(순수 TS — Deno API 미사용이라 vitest 로 직접 실행).
import { describe, it, expect } from "vitest";
import {
  auditFullText,
  createSseAuditTransform,
  PRICE_DISCLAIMER,
  type AuditContext,
} from "../../supabase/functions/ai-planner/postprocess";

const baseCtx: AuditContext = {
  hasPriceGrounding: false,
  groundedVendorNames: [],
  isVendorQuery: false,
};

describe("auditFullText", () => {
  it("근거주입 없이 단서 없는 구체 금액 → 면책 덧붙임", () => {
    const r = auditFullText("스드메는 보통 300만원이에요.", baseCtx);
    expect(r.appendix).toBe(PRICE_DISCLAIMER);
    expect(r.warnings.some((w) => w.includes("disclaimer"))).toBe(true);
  });

  it("이미 한계 단서(업체별 상이/견적)가 있으면 면책 중복 금지", () => {
    const r = auditFullText("평균 300만원이지만 업체별로 상이해요.", baseCtx);
    expect(r.appendix).toBe("");
  });

  it("가격 근거주입이 있었으면 면책 불필요", () => {
    const r = auditFullText("서울 평균은 약 280만원이에요.", { ...baseCtx, hasPriceGrounding: true });
    expect(r.appendix).toBe("");
  });

  it("금액이 없으면 아무것도 안 함", () => {
    const r = auditFullText("청첩장 디자인부터 정해볼까요?", baseCtx);
    expect(r.appendix).toBe("");
    expect(r.warnings).toEqual([]);
  });

  it("업체 의도인데 근거 0건 → 환각 위험 경고(차단은 안 함)", () => {
    const r = auditFullText("이 근처 스튜디오 중에서는...", { ...baseCtx, isVendorQuery: true });
    expect(r.appendix).toBe("");
    expect(r.warnings.some((w) => w.includes("hallucination risk"))).toBe(true);
  });

  it("업체 근거가 주입됐으면 사용률을 로깅", () => {
    const r = auditFullText("아펠가모와 더채플 중에서 골라보세요.", {
      ...baseCtx,
      isVendorQuery: true,
      groundedVendorNames: ["아펠가모", "더채플", "루이비스"],
    });
    expect(r.warnings.some((w) => w.includes("2/3"))).toBe(true);
  });
});

// 클라이언트(useAIPlanner)와 동일한 방식으로 SSE 본문에서 delta.content 만 모은다.
const parseSseContent = (raw: string): string => {
  let out = "";
  for (const line of raw.split("\n")) {
    if (!line.startsWith("data: ")) continue;
    const payload = line.slice(6).trim();
    if (payload === "[DONE]") break;
    try {
      const content = JSON.parse(payload)?.choices?.[0]?.delta?.content;
      if (typeof content === "string") out += content;
    } catch { /* ignore */ }
  }
  return out;
};

const pipe = async (chunks: string[], ctx: AuditContext): Promise<string> => {
  const encoder = new TextEncoder();
  const source = new ReadableStream<Uint8Array>({
    start(c) {
      for (const s of chunks) c.enqueue(encoder.encode(s));
      c.close();
    },
  });
  const out = source.pipeThrough(createSseAuditTransform(ctx, () => {}));
  return await new Response(out).text();
};

describe("createSseAuditTransform", () => {
  const delta = (content: string) =>
    `data: ${JSON.stringify({ choices: [{ index: 0, delta: { content } }] })}\n\n`;

  it("면책 대상이면 [DONE] 앞에 면책 델타를 주입하고 원본은 보존", async () => {
    const raw = await pipe([delta("스드메는 보통 "), delta("300만원이에요."), "data: [DONE]\n\n"], baseCtx);
    expect(parseSseContent(raw)).toBe(`스드메는 보통 300만원이에요.${PRICE_DISCLAIMER}`);
    // 주입 위치가 [DONE] 보다 앞이어야 클라가 렌더한다.
    expect(raw.indexOf("시세 추정")).toBeLessThan(raw.indexOf("data: [DONE]"));
  });

  it("면책 비대상이면 바이트 단위로 그대로 통과(무손상)", async () => {
    const input = [delta("청첩장 디자인부터 "), delta("정해볼까요?"), "data: [DONE]\n\n"];
    const raw = await pipe(input, baseCtx);
    expect(raw).toBe(input.join(""));
  });

  it("청크가 라인 중간에서 끊겨도 누적·통과가 깨지지 않음", async () => {
    const whole = delta("총 1억 정도 잡으세요.") + "data: [DONE]\n\n";
    // 일부러 어색한 위치(JSON 중간·data: 접두 중간)에서 분할
    const chunks = [whole.slice(0, 17), whole.slice(17, 41), whole.slice(41)];
    const raw = await pipe(chunks, baseCtx);
    expect(parseSseContent(raw)).toBe(`총 1억 정도 잡으세요.${PRICE_DISCLAIMER}`);
  });

  it("[DONE] 이 개행 없이 끝나도 flush 에서 처리", async () => {
    const raw = await pipe([delta("드레스 200만원."), "data: [DONE]"], baseCtx);
    expect(raw).toContain("시세 추정");
    expect(raw).toContain("data: [DONE]");
  });

  it("파싱 불가/비표준 라인도 응답을 깨지 않고 통과", async () => {
    const input = [": keep-alive 주석\n", "data: {broken json\n", delta("안녕하세요!"), "data: [DONE]\n\n"];
    const raw = await pipe(input, baseCtx);
    expect(raw).toContain(": keep-alive 주석");
    expect(raw).toContain("data: {broken json");
    expect(parseSseContent(raw)).toBe("안녕하세요!");
  });
});
