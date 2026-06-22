import { describe, it, expect } from "vitest";
import {
  computeBudgetFinancials,
  buildPaymentTimeline,
  computeMealDefenseRate,
  IMMINENT_DAYS,
  type ReportLineItem,
  type TimelineLineItem,
} from "./budgetReportModel";

const item = (over: Partial<ReportLineItem>): ReportLineItem => ({
  amount: 0,
  paid_by: "shared",
  has_balance: false,
  balance_amount: null,
  payment_method: "card",
  ...over,
});

describe("computeBudgetFinancials", () => {
  it("빈 배열은 모두 0 으로 떨어진다", () => {
    const r = computeBudgetFinancials([]);
    expect(r.grandTotal).toBe(0);
    expect(r.totalPaid).toBe(0);
    expect(r.totalPending).toBe(0);
    expect(r.cashNeeded).toBe(0);
    expect(r.payers.shared.shareRatio).toBe(0);
  });

  it("납부완료와 미납 잔금을 분리 집계한다", () => {
    const r = computeBudgetFinancials([
      item({ amount: 1000, has_balance: true, balance_amount: 500 }),
      item({ amount: 300, has_balance: false }),
    ]);
    expect(r.totalPaid).toBe(1300);
    expect(r.totalPending).toBe(500);
    expect(r.grandTotal).toBe(1800);
  });

  it("환불 항목은 납부액에서 차감하고 미납은 0 으로 본다", () => {
    const r = computeBudgetFinancials([
      item({ amount: 1000 }),
      item({ amount: 200, is_refund: true, paid_by: "bride" }),
    ]);
    expect(r.totalPaid).toBe(800); // 1000 - 200
    expect(r.totalPending).toBe(0);
    expect(r.payers.bride.paid).toBe(-200);
  });

  it("has_balance=false 또는 balance_amount<=0/null 은 미납에서 제외", () => {
    const r = computeBudgetFinancials([
      item({ amount: 100, has_balance: true, balance_amount: null }),
      item({ amount: 100, has_balance: true, balance_amount: 0 }),
      item({ amount: 100, has_balance: false, balance_amount: 999 }),
    ]);
    expect(r.totalPending).toBe(0);
    expect(r.totalPaid).toBe(300);
  });

  it("cashNeeded 는 결제수단이 현금인 미납 잔금만 합산", () => {
    const r = computeBudgetFinancials([
      item({ amount: 0, has_balance: true, balance_amount: 200, payment_method: "cash" }),
      item({ amount: 0, has_balance: true, balance_amount: 300, payment_method: "card" }),
      item({ amount: 500, has_balance: false, payment_method: "cash" }), // 이미 납부분은 제외
    ]);
    expect(r.cashNeeded).toBe(200);
  });

  it("주체별 paid/pending/total/shareRatio 를 계산한다", () => {
    const r = computeBudgetFinancials([
      item({ paid_by: "groom", amount: 600, has_balance: true, balance_amount: 400 }),
      item({ paid_by: "bride", amount: 200 }),
      item({ paid_by: "shared", amount: 800 }),
    ]);
    expect(r.payers.groom.total).toBe(1000);
    expect(r.payers.bride.total).toBe(200);
    expect(r.payers.shared.total).toBe(800);
    expect(r.grandTotal).toBe(2000);
    expect(r.payers.groom.shareRatio).toBe(50);
    expect(r.payers.bride.shareRatio).toBe(10);
    expect(r.payers.shared.shareRatio).toBe(40);
  });

  it("미상/빈 paid_by 는 shared 로 귀속한다", () => {
    const r = computeBudgetFinancials([
      item({ paid_by: "", amount: 100 }),
      item({ paid_by: "unknown_legacy", amount: 100 }),
    ]);
    expect(r.payers.shared.paid).toBe(200);
  });

  it("음수 amount 는 0 으로 방어한다", () => {
    const r = computeBudgetFinancials([item({ amount: -500 })]);
    expect(r.totalPaid).toBe(0);
  });
});

const NOW = new Date(2026, 5, 10).getTime(); // 2026-06-10 (로컬)

const tItem = (over: Partial<TimelineLineItem>): TimelineLineItem => ({
  amount: 0,
  paid_by: "shared",
  has_balance: false,
  balance_amount: null,
  payment_method: "card",
  title: "항목",
  item_date: "2026-01-01",
  balance_due_date: null,
  payment_stage: "full",
  ...over,
});

describe("buildPaymentTimeline", () => {
  it("납부분과 미납분을 각각 한 줄로 펼친다", () => {
    const t = buildPaymentTimeline(
      [tItem({ amount: 1000, item_date: "2026-01-01", has_balance: true, balance_amount: 500, balance_due_date: "2026-07-01" })],
      NOW,
    );
    expect(t).toHaveLength(2);
    const paid = t.find((e) => !e.isPending)!;
    const pending = t.find((e) => e.isPending)!;
    expect(paid.amount).toBe(1000);
    expect(paid.status).toBe("paid");
    expect(pending.amount).toBe(500);
    expect(pending.stage).toBe("balance");
  });

  it("날짜 오름차순 정렬, 날짜 없는 건은 맨 뒤", () => {
    const t = buildPaymentTimeline(
      [
        tItem({ amount: 100, item_date: "2026-03-01" }),
        tItem({ amount: 100, item_date: "2026-01-01" }),
        tItem({ amount: 0, has_balance: true, balance_amount: 50, balance_due_date: null }),
      ],
      NOW,
    );
    expect(t.map((e) => e.date)).toEqual(["2026-01-01", "2026-03-01", null]);
  });

  it("현금 미납은 항상 현금필수", () => {
    const t = buildPaymentTimeline(
      [tItem({ amount: 0, has_balance: true, balance_amount: 50, balance_due_date: "2026-12-31", payment_method: "cash" })],
      NOW,
    );
    expect(t[0].status).toBe("cash");
  });

  it("비현금 미납은 D-day 임계로 임박/대기를 가른다", () => {
    const due = (days: number) => {
      const d = new Date(NOW);
      d.setDate(d.getDate() + days);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    };
    const imminent = buildPaymentTimeline(
      [tItem({ has_balance: true, balance_amount: 50, balance_due_date: due(IMMINENT_DAYS), payment_method: "transfer" })],
      NOW,
    );
    const waiting = buildPaymentTimeline(
      [tItem({ has_balance: true, balance_amount: 50, balance_due_date: due(IMMINENT_DAYS + 1), payment_method: "transfer" })],
      NOW,
    );
    expect(imminent[0].status).toBe("imminent");
    expect(waiting[0].status).toBe("waiting");
  });

  it("amount=0 이고 미납만 있으면 한 줄만 나온다", () => {
    const t = buildPaymentTimeline(
      [tItem({ amount: 0, has_balance: true, balance_amount: 300, balance_due_date: "2026-08-01" })],
      NOW,
    );
    expect(t).toHaveLength(1);
    expect(t[0].isPending).toBe(true);
  });

  it("빈 입력은 빈 배열", () => {
    expect(buildPaymentTimeline([], NOW)).toEqual([]);
  });
});

describe("computeMealDefenseRate", () => {
  it("마스터 리포트 예시(300명×8만원 ÷ 1600만원 = 150%)를 재현한다", () => {
    const r = computeMealDefenseRate(300, 8, 1600);
    expect(r.expectedGiftIncome).toBe(2400);
    expect(r.defenseRatePercent).toBe(150);
  });

  it("홀 지출이 0 이면 방어율 0 (0 나눗셈 방어)", () => {
    const r = computeMealDefenseRate(200, 8, 0);
    expect(r.defenseRatePercent).toBe(0);
    expect(r.expectedGiftIncome).toBe(1600);
  });

  it("음수/0 입력은 0 으로 방어한다", () => {
    const r = computeMealDefenseRate(-10, -5, -100);
    expect(r.expectedGuests).toBe(0);
    expect(r.giftPerGuest).toBe(0);
    expect(r.hallExpense).toBe(0);
    expect(r.defenseRatePercent).toBe(0);
  });
});

// ── 하객 수 소스 결정 (명단 집계 vs 설정값) ─────────────────────
import { resolveGuestCount } from "./budgetReportModel";

describe("resolveGuestCount", () => {
  it("명단 집계가 있으면 우선, 설정값과의 차이 계산", () => {
    const r = resolveGuestCount(200, 180);
    expect(r).toEqual({ count: 180, source: "listed", diffFromSettings: -20 });
  });

  it("명단이 비면 설정값 폴백", () => {
    expect(resolveGuestCount(200, 0)).toEqual({ count: 200, source: "settings", diffFromSettings: null });
  });

  it("둘 다 없으면 0/settings", () => {
    expect(resolveGuestCount(0, 0)).toEqual({ count: 0, source: "settings", diffFromSettings: null });
  });

  it("설정값 없이 명단만 있으면 diff null", () => {
    expect(resolveGuestCount(0, 150)).toEqual({ count: 150, source: "listed", diffFromSettings: null });
  });
});
