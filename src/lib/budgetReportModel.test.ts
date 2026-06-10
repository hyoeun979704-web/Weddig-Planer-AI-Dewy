import { describe, it, expect } from "vitest";
import { computeBudgetFinancials, type ReportLineItem } from "./budgetReportModel";

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
