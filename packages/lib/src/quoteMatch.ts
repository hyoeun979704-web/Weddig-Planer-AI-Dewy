// 견적 응답 큐레이션 — 도착순(created_at)이 아니라 "소비자가 적은 요청 조건"
// (지역·예산) 적합도로 결정적으로 순위화한다. 매칭 RPC 는 카테고리+지역으로 업체를
// 추려 응답을 받지만, 소비자 화면은 그 응답을 도착 순서대로만 보여줘 "내 조건에 맞는
// 업체"가 묻히던 문제(개인화 공백)를 해소한다. 점수는 순수 함수 — 같은 입력이면 항상
// 같은 순서(엣지케이스: 조건 미입력이면 모두 0점 → 도착순 유지, 회귀 없음).

import type { QuoteRequest, QuoteResponse } from "@/hooks/useQuotes";

export type BudgetFit = "within" | "near" | "over" | "unknown";

export interface QuoteFit {
  /** 정렬 키(클수록 요청 조건에 적합). */
  score: number;
  /** 응답 견적가가 요청 예산 범위에 드는지. */
  budgetFit: BudgetFit;
  /** 요청 지역(시·도)과 업체 지역이 일치하는지. */
  regionMatch: boolean;
}

const norm = (s: string | null | undefined) => (s ?? "").trim();

// 응답 견적가(만원, 요청 예산과 동일 단위)가 요청 예산 범위에 드는지 3단계로 평가.
function evalBudget(req: QuoteRequest, r: QuoteResponse): BudgetFit {
  const cap = req.budget_max;
  const low = r.price_min ?? r.price_max;
  const high = r.price_max ?? r.price_min;
  if (cap == null || low == null) return "unknown";
  if (high != null && high <= cap) return "within"; // 견적 상한까지 예산 안
  if (low <= cap) return "near"; // 일부만 예산 안(상한 초과)
  return "over"; // 최저가도 예산 초과
}

// 요청 지역(시) 일치 여부. CLAUDE.md 의 라벨/매칭 분리 교훈대로 부분문자열 매칭이 아니라
// 정식 명칭 정확 일치로 본다("충남" vs "충청남도" 비연속 매칭 오류 방지).
function evalRegion(req: QuoteRequest, r: QuoteResponse): boolean {
  const reqCity = norm(req.region_city);
  const placeCity = norm(r.place_city);
  return reqCity !== "" && placeCity !== "" && reqCity === placeCity;
}

export function scoreQuoteResponse(req: QuoteRequest | null, r: QuoteResponse): QuoteFit {
  if (!req) return { score: 0, budgetFit: "unknown", regionMatch: false };

  const budgetFit = evalBudget(req, r);
  const regionMatch = evalRegion(req, r);
  const districtMatch =
    regionMatch && norm(req.region_district) !== "" && norm(req.region_district) === norm(r.place_district);

  let score = 0;
  if (regionMatch) score += 1000; // 1순위: 요청 지역 일치
  if (districtMatch) score += 200; // 같은 시·구까지 일치하면 가점
  if (budgetFit === "within") score += 600; // 2순위: 예산 적합
  else if (budgetFit === "near") score += 300;
  if (r.place_partner) score += 50; // 파트너 가점(기존 추천 컨벤션과 일관)
  score += Math.min(r.place_rating ?? 0, 5) * 5; // 평점 타이브레이크(0~25)
  score += Math.min(r.place_reviews ?? 0, 100) * 0.1; // 리뷰 수 미세 타이브레이크

  return { score, budgetFit, regionMatch };
}

// 응답 배열을 요청 적합도 내림차순으로 정렬(동점은 입력 순서 = 도착순 유지).
export function rankQuoteResponses(req: QuoteRequest | null, responses: QuoteResponse[]): QuoteResponse[] {
  return responses
    .map((r, i) => ({ r, i, fit: scoreQuoteResponse(req, r) }))
    .sort((a, b) => (b.fit.score - a.fit.score) || (a.i - b.i))
    .map(({ r, fit }) => ({ ...r, matchScore: fit.score, budgetFit: fit.budgetFit, regionMatch: fit.regionMatch }));
}
