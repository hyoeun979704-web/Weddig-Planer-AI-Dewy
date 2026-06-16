// 디자인 구매 결제 금액 계산 — 가격(KRW)에서 포인트 할인을 차감하되, 카카오페이 최소
// 결제액(100원)은 남긴다(작가에게 실제 재화가 정산돼야 하므로 0원 결제 금지).
// 순수 함수(서버·클라 공용 규칙). 실제 차감/결제는 서버(edge function)에서만(클라 불신).
// 설계: docs/260616_invitation_design_marketplace.md §6.

export const MIN_CHARGE = 100; // 카카오페이 최소 결제액

export interface DesignCharge {
  /** 실제 차감될 포인트(= 할인액, 원=1포인트 가정). */
  discount: number;
  /** 최종 결제액(KRW). */
  final: number;
  /** 요청 포인트가 한도(잔액/최대할인)에 의해 깎였는지. */
  capped: boolean;
}

/**
 * @param price 디자인 가격(KRW)
 * @param requestedPoints 사용 요청 포인트
 * @param balance 보유 포인트
 */
export function computeDesignCharge(price: number, requestedPoints: number, balance: number): DesignCharge {
  const p = Math.max(0, Math.floor(price || 0));
  const req = Math.max(0, Math.floor(requestedPoints || 0));
  const bal = Math.max(0, Math.floor(balance || 0));
  // 최종액이 최소 결제액 이상 남도록 최대 할인 제한(가격이 최소액 이하면 할인 불가).
  const maxDiscount = p > MIN_CHARGE ? p - MIN_CHARGE : 0;
  const discount = Math.min(req, bal, maxDiscount);
  return {
    discount,
    final: p - discount,
    capped: discount < req,
  };
}
