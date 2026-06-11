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

// ---------------------------------------------------------------------------
// 결제 타임라인 (Phase 2) — 마스터 리포트의 chronological_billing_timeline 대응.
// 납부완료분(item_date)과 미납 잔금(balance_due_date)을 한 시계열로 병합하고,
// 미납 건은 D-day 로 상태를 판정한다.
// ---------------------------------------------------------------------------

/** 임박(urgent) 판정 임계 — 잔금 예정일이 오늘로부터 이 일수 이내면 "임박". */
export const IMMINENT_DAYS = 7;

/** 타임라인 한 줄의 상태. paid=완료, imminent=임박, waiting=대기, cash=현금필수. */
export type PaymentStatus = "paid" | "imminent" | "waiting" | "cash";

/** 타임라인 계산에 필요한 budget_items 형태 (financials 입력 + 표시 메타). */
export interface TimelineLineItem extends ReportLineItem {
  title: string;
  item_date: string;                 // 납부일 (YYYY-MM-DD)
  balance_due_date: string | null;   // 잔금 예정일 (YYYY-MM-DD) | null
  payment_stage: string;             // "deposit" | "contract" | "midpayment" | "balance" | "full"
}

export interface TimelineEntry {
  date: string | null;   // 정렬·표시 기준일 (납부일 또는 잔금 예정일)
  title: string;
  amount: number;        // 만원
  payer: string;         // 원 paid_by 값 (라벨 매핑은 UI 담당)
  stage: string;         // 원 payment_stage 값
  method: string;        // 원 payment_method 값
  status: PaymentStatus;
  isPending: boolean;    // true=미납 잔금, false=납부완료
}

/** "YYYY-MM-DD" 를 로컬 자정 기준 days-from-today 로. 잘못된/빈 값은 null. */
const daysFromToday = (dateStr: string | null | undefined, nowMs: number): number | null => {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return null;
  const target = new Date(y, m - 1, d).getTime();
  const today = new Date(nowMs);
  today.setHours(0, 0, 0, 0);
  return Math.round((target - today.getTime()) / (1000 * 60 * 60 * 24));
};

/** 미납 잔금의 상태 판정. 현금이면 항상 현금필수, 아니면 D-day 로 임박/대기. */
const pendingStatus = (method: string, dueDate: string | null, nowMs: number): PaymentStatus => {
  if (method === "cash") return "cash";
  const dday = daysFromToday(dueDate, nowMs);
  return dday !== null && dday <= IMMINENT_DAYS ? "imminent" : "waiting";
};

/**
 * 항목 배열을 결제 시계열로 펼친다. 한 항목이 납부분(amount>0)과 미납분
 * (balance>0)을 동시에 가지면 두 줄로 분리된다. 날짜 오름차순 정렬하되
 * 날짜 없는 건(예정일 미정)은 맨 뒤로 보낸다.
 */
export function buildPaymentTimeline(
  items: TimelineLineItem[],
  nowMs: number = Date.now(),
): TimelineEntry[] {
  const entries: TimelineEntry[] = [];
  for (const item of items) {
    const paid = item.amount > 0 ? item.amount : 0;
    const pending = pendingOf(item);
    if (paid > 0) {
      entries.push({
        date: item.item_date || null,
        title: item.title,
        amount: paid,
        payer: item.paid_by,
        stage: item.payment_stage,
        method: item.payment_method,
        status: "paid",
        isPending: false,
      });
    }
    if (pending > 0) {
      entries.push({
        date: item.balance_due_date || null,
        title: item.title,
        amount: pending,
        payer: item.paid_by,
        stage: "balance",
        method: item.payment_method,
        status: pendingStatus(item.payment_method, item.balance_due_date, nowMs),
        isPending: true,
      });
    }
  }
  // 날짜 오름차순, null(미정)은 맨 뒤. 안정 정렬로 입력 순서 보존.
  return entries.sort((a, b) => {
    if (a.date === b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return a.date < b.date ? -1 : 1;
  });
}

// ---------------------------------------------------------------------------
// 식대 방어율 (Phase 3) — 마스터 리포트의 wedding_hall_defense_rate_analysis 대응.
// "예상 축의금 수입이 홀+식대 지출을 얼마나 방어하는가" 를 % 로 본다(100%↑ = 흑자).
// ---------------------------------------------------------------------------

/** 인당 평균 축의금 기본 가정값(만원). 마스터 리포트 80,000원 기준. 추후 설정값화 여지. */
export const DEFAULT_GIFT_PER_GUEST_MANWON = 8;

export interface MealDefenseResult {
  expectedGuests: number;
  giftPerGuest: number;        // 만원
  expectedGiftIncome: number;  // 만원 = guests × giftPerGuest
  hallExpense: number;         // 만원 = 홀+식대 (납부+미납)
  defenseRatePercent: number;  // gift/expense × 100. expense=0 이면 0.
}

export interface GuestCountSource {
  count: number;
  /** listed = 하객명단(RSVP 포함) 살아있는 집계, settings = 예산 설정의 수기값 */
  source: "listed" | "settings";
  /** 두 소스가 모두 존재하고 다를 때 차이 (listed - settings). 비교 불가면 null. */
  diffFromSettings: number | null;
}

/**
 * 리포트에 쓸 하객 수 결정 — 하객명단 집계(expectedHeads)가 있으면 우선,
 * 없으면 설정값 폴백. 기존 settings.guest_count 동작은 폴백으로 보존된다.
 */
export function resolveGuestCount(
  settingsCount: number,
  listedHeads: number,
): GuestCountSource {
  const settings = settingsCount > 0 ? settingsCount : 0;
  const listed = listedHeads > 0 ? listedHeads : 0;
  if (listed > 0) {
    return {
      count: listed,
      source: "listed",
      diffFromSettings: settings > 0 ? listed - settings : null,
    };
  }
  return { count: settings, source: "settings", diffFromSettings: null };
}

/**
 * 식대 방어율. 입력은 모두 호출부에서 집계해 넘긴다(홀 지출은 category 가
 * 필요해 컴포넌트가 합산). 순수 산식만 여기서 책임져 테스트로 고정한다.
 */
export function computeMealDefenseRate(
  guestCount: number,
  giftPerGuest: number,
  hallExpense: number,
): MealDefenseResult {
  const guests = guestCount > 0 ? guestCount : 0;
  const perGuest = giftPerGuest > 0 ? giftPerGuest : 0;
  const expectedGiftIncome = guests * perGuest;
  const expense = hallExpense > 0 ? hallExpense : 0;
  const defenseRatePercent = expense > 0 ? (expectedGiftIncome / expense) * 100 : 0;
  return {
    expectedGuests: guests,
    giftPerGuest: perGuest,
    expectedGiftIncome,
    hallExpense: expense,
    defenseRatePercent,
  };
}
