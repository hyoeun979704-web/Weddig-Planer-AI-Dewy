import { describe, it, expect } from "vitest";
import { scoreQuoteResponse, rankQuoteResponses } from "./quoteMatch";
import type { QuoteRequest, QuoteResponse } from "@/hooks/useQuotes";

const req = (over: Partial<QuoteRequest> = {}): QuoteRequest => ({
  id: "req1",
  category: "venue",
  region_city: "서울특별시",
  region_district: "강남구",
  budget_min: 1000,
  budget_max: 2000,
  wedding_date: null,
  style: null,
  note: null,
  status: "open",
  created_at: "2026-06-01T00:00:00Z",
  ...over,
});

const resp = (over: Partial<QuoteResponse> = {}): QuoteResponse => ({
  id: Math.random().toString(36).slice(2),
  request_id: "req1",
  place_id: "p" + Math.random().toString(36).slice(2),
  message: "안녕하세요",
  price_min: null,
  price_max: null,
  status: "sent",
  created_at: "2026-06-02T00:00:00Z",
  ...over,
});

describe("scoreQuoteResponse", () => {
  it("returns zero/unknown when no request", () => {
    const fit = scoreQuoteResponse(null, resp());
    expect(fit).toEqual({ score: 0, budgetFit: "unknown", regionMatch: false });
  });

  it("marks region match on exact city equality only (no substring)", () => {
    // 정식 명칭 정확 일치만 — '충남' vs '충청남도' 비연속 매칭 회귀 방지.
    expect(scoreQuoteResponse(req({ region_city: "충청남도" }), resp({ place_city: "충남" })).regionMatch).toBe(false);
    expect(scoreQuoteResponse(req({ region_city: "서울특별시" }), resp({ place_city: "서울특별시" })).regionMatch).toBe(true);
  });

  it("classifies budget fit in three tiers", () => {
    expect(scoreQuoteResponse(req(), resp({ price_min: 1200, price_max: 1800 })).budgetFit).toBe("within");
    expect(scoreQuoteResponse(req(), resp({ price_min: 1500, price_max: 2500 })).budgetFit).toBe("near");
    expect(scoreQuoteResponse(req(), resp({ price_min: 3000, price_max: 4000 })).budgetFit).toBe("over");
    expect(scoreQuoteResponse(req({ budget_max: null }), resp({ price_min: 1200 })).budgetFit).toBe("unknown");
  });

  it("region match outweighs budget fit", () => {
    const regionOnly = scoreQuoteResponse(req(), resp({ place_city: "서울특별시", price_min: 9999, price_max: 9999 }));
    const budgetOnly = scoreQuoteResponse(req(), resp({ place_city: "부산광역시", price_min: 1200, price_max: 1800 }));
    expect(regionOnly.score).toBeGreaterThan(budgetOnly.score);
  });
});

describe("rankQuoteResponses", () => {
  it("orders by fit score, keeping arrival order on ties", () => {
    const best = resp({ id: "best", place_city: "서울특별시", price_min: 1200, price_max: 1800 });
    const mid = resp({ id: "mid", place_city: "부산광역시", price_min: 1200, price_max: 1800 });
    const worst = resp({ id: "worst", place_city: "부산광역시", price_min: 5000, price_max: 6000 });
    const ranked = rankQuoteResponses(req(), [worst, mid, best]);
    expect(ranked.map((r) => r.id)).toEqual(["best", "mid", "worst"]);
    expect(ranked[0].regionMatch).toBe(true);
    expect(ranked[0].budgetFit).toBe("within");
  });

  it("with no request conditions, preserves input (arrival) order", () => {
    const a = resp({ id: "a" });
    const b = resp({ id: "b" });
    const ranked = rankQuoteResponses(req({ region_city: null, budget_max: null }), [a, b]);
    expect(ranked.map((r) => r.id)).toEqual(["a", "b"]);
  });
});
