// L2 업체 근거주입(supabase/functions/ai-planner/grounding.ts) 회귀 테스트.
// 의도 감지·지역 정규화(약자→ILIKE-safe substring)·근거 블록 생성 분기를 고정.
import { describe, it, expect, vi } from "vitest";
import {
  isVendorQuery,
  buildVendorGrounding,
} from "../../supabase/functions/ai-planner/grounding";

interface FakeResult {
  data: unknown;
  error: unknown;
}

// places 쿼리 빌더(체이너블 + thenable)를 현실적으로 흉내 — 호출 인자를 기록해
// 필터/정렬이 의도대로 걸리는지 검증한다.
const makeFakeSupabase = (result: FakeResult) => {
  const calls: Record<string, unknown[][]> = {};
  // deno-lint 무관 클라 테스트 — any 체이너블이 가장 단순.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const builder: any = {};
  for (const m of ["select", "eq", "order", "limit", "or"]) {
    builder[m] = vi.fn((...args: unknown[]) => {
      (calls[m] ??= []).push(args);
      return builder;
    });
  }
  builder.then = (resolve: (r: FakeResult) => void) => Promise.resolve(result).then(resolve);
  return { supabase: { from: vi.fn(() => builder) }, calls };
};

describe("isVendorQuery", () => {
  it("모호한 추천 표현 + 카테고리 → 업체 의도", () => {
    expect(isVendorQuery("괜찮은 메이크업샵 어디 없을까")).toBe(true);
    expect(isVendorQuery("강남에 좋은 곳 있으면 웨딩홀 알려줘")).toBe(true);
  });

  it("카테고리 없는 일반 질문은 비대상", () => {
    expect(isVendorQuery("예산 분배 어떻게 해?")).toBe(false);
    expect(isVendorQuery("뭐부터 해야 할지 알려줘")).toBe(false);
  });

  it("카테고리는 있지만 추천 의도가 없으면 비대상", () => {
    expect(isVendorQuery("드레스 입을 때 주의할 점은?")).toBe(false);
  });
});

describe("buildVendorGrounding", () => {
  const rows = [
    { name: "라포레웨딩", city: "충청남도 천안시", district: "서북구", avg_rating: 4.7, min_price: 3_500_000, is_partner: true },
    { name: "더베일홀", city: "충청남도 아산시", district: null, avg_rating: 4.2, min_price: null, is_partner: false },
  ];

  it("매칭 업체를 근거 블록으로 — 목록 밖 실명 생성 금지 지침 포함", async () => {
    const { supabase, calls } = makeFakeSupabase({ data: rows, error: null });
    const g = await buildVendorGrounding(supabase, "충남에서 괜찮은 웨딩홀 알려줘", null);
    expect(g.names).toEqual(["라포레웨딩", "더베일홀"]);
    expect(g.block).toContain("이 목록의 업체만 실명 언급 가능");
    expect(g.block).toContain("라포레웨딩");
    expect(g.block).toContain("최저 350만원~");
    expect(g.block).toContain("듀이 파트너");
    // 회귀 방지: 약자 "충남"은 풀네임 연속 substring "충청남"으로 정규화돼야
    // ILIKE 가 매칭된다("충남" 그대로면 0건).
    expect(calls.or?.[0]?.[0]).toContain("%충청남%");
    expect(calls.eq).toContainEqual(["category", "wedding_hall"]);
    expect(calls.eq).toContainEqual(["is_active", true]);
  });

  it("질문에 지역이 없으면 사용자 예식 지역(officialLabel)으로 폴백", async () => {
    const { supabase, calls } = makeFakeSupabase({ data: rows, error: null });
    await buildVendorGrounding(supabase, "괜찮은 스튜디오 추천해줘", "서울특별시");
    expect(calls.or?.[0]?.[0]).toContain("%서울%");
    expect(calls.eq).toContainEqual(["category", "studio"]);
  });

  it("0건이면 지어내기 금지 + 앱 탐색 안내 지침 블록", async () => {
    const { supabase } = makeFakeSupabase({ data: [], error: null });
    const g = await buildVendorGrounding(supabase, "세종 한복 어디가 좋아?", null);
    expect(g.names).toEqual([]);
    expect(g.block).toContain("임의의 업체명을 지어내");
    expect(g.block).toContain("업체 탐색");
  });

  it("업체 의도가 아니면 빈 그라운딩(쿼리 자체를 안 함)", async () => {
    const { supabase } = makeFakeSupabase({ data: rows, error: null });
    const g = await buildVendorGrounding(supabase, "축의금 답례 매너 알려줘", "서울특별시");
    expect(g.block).toBe("");
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("쿼리 실패는 답변을 막지 않는다 — 빈 그라운딩으로 우아한 실패", async () => {
    const { supabase } = makeFakeSupabase({ data: null, error: new Error("db down") });
    const g = await buildVendorGrounding(supabase, "부산 웨딩홀 추천해줘", null);
    expect(g).toEqual({ block: "", names: [] });
  });
});
