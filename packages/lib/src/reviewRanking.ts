// 후기 정렬·인증 배지 — 신뢰(실거래 인증)와 개인화(같은 지역)를 함께 반영.
// 경쟁사는 미인증 후기를 시간순으로만 나열 → 변별력 0. Dewy 는 행동로그 기반
// verification_tier(상담/계약 인증)를 위로 올리고, 같은 지역(author_region) 후기를
// 그다음 우선해 "나에게 신뢰되고 관련된" 후기를 먼저 보여준다.
//
// 정렬 우선순위: ① 인증 등급(계약>상담>없음) ② 뷰어와 같은 지역 ③ 최신순.
// source_type(광고/협찬)은 정렬이 아니라 경고 배지로 처리(REVIEW_SOURCE_META, hooks).

export type VerificationTier = "contract" | "consult" | null | undefined;

export const VERIFICATION_TIER_META: Record<
  "contract" | "consult",
  { label: string; tone: string; rank: number; hint: string }
> = {
  contract: {
    label: "계약 인증",
    tone: "bg-emerald-100 text-emerald-700 border-emerald-200",
    rank: 0,
    hint: "이 업체를 예식장으로 등록하고 준비 중인 사용자의 후기예요.",
  },
  consult: {
    label: "상담 인증",
    tone: "bg-sky-100 text-sky-700 border-sky-200",
    rank: 1,
    hint: "Dewy에서 이 업체에 문의·견적한 사용자의 후기예요.",
  },
};

/** 인증 등급 정렬 가중치(낮을수록 위). 계약 0 · 상담 1 · 없음 2. */
export function tierRank(tier: VerificationTier): number {
  if (tier === "contract") return 0;
  if (tier === "consult") return 1;
  return 2;
}

/**
 * 같은 지역 여부. author_region·viewerRegion 은 같은 컬럼(user_wedding_settings.
 * wedding_region) 출처라 형식이 동일 → trim 후 동등 비교. 한쪽이라도 비면 false.
 */
export function regionMatches(
  authorRegion: string | null | undefined,
  viewerRegion: string | null | undefined,
): boolean {
  if (!authorRegion || !viewerRegion) return false;
  return authorRegion.trim() === viewerRegion.trim();
}

export interface RankableReview {
  verification_tier?: VerificationTier;
  author_region?: string | null;
  review_date?: string | null;
}

const dateMs = (d: string | null | undefined): number => {
  if (!d) return 0;
  const t = new Date(d).getTime();
  return Number.isNaN(t) ? 0 : t;
};

/** 두 후기 비교 — 인증 → 같은 지역 → 최신. 안정 정렬 가정. */
export function compareReviews<T extends RankableReview>(
  a: T,
  b: T,
  viewerRegion: string | null | undefined,
): number {
  const tr = tierRank(a.verification_tier) - tierRank(b.verification_tier);
  if (tr !== 0) return tr;

  const am = regionMatches(a.author_region, viewerRegion) ? 0 : 1;
  const bm = regionMatches(b.author_region, viewerRegion) ? 0 : 1;
  if (am !== bm) return am - bm;

  return dateMs(b.review_date) - dateMs(a.review_date);
}

/** 정렬된 사본 반환(원본 불변). */
export function rankReviews<T extends RankableReview>(
  reviews: readonly T[],
  viewerRegion: string | null | undefined,
): T[] {
  return [...reviews].sort((a, b) => compareReviews(a, b, viewerRegion));
}
