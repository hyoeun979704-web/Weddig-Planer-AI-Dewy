// 예산 리포트 PDF 의 "정산" 계층 — 순수 계산 로직.
//
// 왜 별도 lib 인가:
//  - BudgetReportSheet(컴포넌트)에 섞여 있던 합산 로직은 테스트가 불가능했고,
//    "전부 지출(spent)로 합산" 하는 한계가 있었다. 첨부 마스터 정산 리포트처럼
//    납부완료(paid) vs 미납(pending) 을 분리하려면 계산을 도메인 계층으로 끌어내
//    단위 테스트로 고정해야 한다(AGENTS.md: 도메인↔UI 분리, DRY, 분기 테스트).
//  - 입력 타입은 budget_items 의 최소 부분집합만 받는다(컴포넌트/훅과 느슨하게 결합).

/** 정산 계산에 필요한 budget_items 최소 형태. (useBudget 의 BudgetItem 부분집합) */
export interface ReportLineItem {
  amount: number;                       // 이미 납부(기록)된 금액 (만원)
  paid_by: string;                      // "shared" | "groom" | "bride" | 기타
  has_balance: boolean;
  balance_amount: number | null;        // 미납 잔금 (만원)
  payment_method: string;               // "cash" | "card" | "transfer" | "check"
}

/** 결제 주체 3분류 — paidByOptions(budgetData) 와 동일 키. */
export type PayerKey = "shared" | "groom" | "bride";
export const PAYER_KEYS: PayerKey[] = ["shared", "groom", "bride"];

export interface PayerStat {
  paid: number;
  pending: number;
  total: number;        // paid + pending (마스터 리포트의 allocated 대응)
  shareRatio: number;   // 0~100, grandTotal 대비 이 주체의 total 비중
}

export interface BudgetFinancials {
  totalPaid: number;     // 납부완료 합계
  totalPending: number;  // 미납 잔금 합계
  grandTotal: number;    // 총액 = 납부 + 미납
  /**
   * 당일/현금 필수 예상액. 미납 잔금 중 원 항목의 결제수단이 현금인 건의 합.
   * 잔금 자체는 결제수단을 따로 들고 있지 않으므로(원 항목 payment_method 를 승계),
   * "현금봉투로 나갈 미래 지출"의 근사치다. (마스터 리포트의 total_cash_needed_day 대응)
   */
  cashNeeded: number;
  payers: Record<PayerKey, PayerStat>;
}

/** 잔금이 살아있는(미납) 항목의 잔액. null/0/false 는 0 으로 우아하게 처리. */
const pendingOf = (item: ReportLineItem): number =>
  item.has_balance && item.balance_amount && item.balance_amount > 0 ? item.balance_amount : 0;

/**
 * budget_items 배열을 납부/미납으로 분리 집계한다.
 * 빈 배열·미상 paid_by·null balance 모두 안전하게 0 으로 떨어진다.
 */
export function computeBudgetFinancials(items: ReportLineItem[]): BudgetFinancials {
  const payers: Record<PayerKey, PayerStat> = {
    shared: { paid: 0, pending: 0, total: 0, shareRatio: 0 },
    groom: { paid: 0, pending: 0, total: 0, shareRatio: 0 },
    bride: { paid: 0, pending: 0, total: 0, shareRatio: 0 },
  };

  let totalPaid = 0;
  let totalPending = 0;
  let cashNeeded = 0;

  for (const item of items) {
    const paid = item.amount > 0 ? item.amount : 0;
    const pending = pendingOf(item);
    totalPaid += paid;
    totalPending += pending;
    if (pending > 0 && item.payment_method === "cash") cashNeeded += pending;

    // 알 수 없는 paid_by(레거시·빈값)는 "shared" 로 귀속 — 합계 누락 방지.
    const key: PayerKey = (PAYER_KEYS as string[]).includes(item.paid_by)
      ? (item.paid_by as PayerKey)
      : "shared";
    payers[key].paid += paid;
    payers[key].pending += pending;
  }

  const grandTotal = totalPaid + totalPending;
  for (const key of PAYER_KEYS) {
    const p = payers[key];
    p.total = p.paid + p.pending;
    p.shareRatio = grandTotal > 0 ? (p.total / grandTotal) * 100 : 0;
  }

  return { totalPaid, totalPending, grandTotal, cashNeeded, payers };
}
