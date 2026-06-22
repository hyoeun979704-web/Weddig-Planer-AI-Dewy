// 개인화 e2e 시뮬레이션 — 실제 코드 경로를 그대로 태워 "사용자 시점" 결과를 검증한다.
// 브라우저 e2e 는 이 환경에서 불가(Playwright Chromium 다운로드 네트워크 차단)라, 데이터→분류→
// 추천일정 / 예산입력→환불→전 합산 일관성을 **실 함수**로 통합 검증한다(로직 e2e).
import { describe, it, expect } from "vitest";
import { derivePersonaMode, type PersonaInputs } from "@/lib/weddingPersona";
import { buildTimelinePhases, daysUntilWedding } from "@/lib/schedule";
import { applyPersonaSchedule } from "@/lib/personaPlanProfile";
import { computePregnancyContext } from "@/lib/pregnancy";
import { netManwon } from "@/lib/budgetFormat";
import { computeBudgetFinancials, type ReportLineItem } from "@/lib/budgetReportModel";

// 기본 입력(표준 신부) — 시나리오별로 일부만 덮어쓴다.
const baseInputs = (over: Partial<PersonaInputs>): PersonaInputs => ({
  wedding_style: null, ceremony_type: null, marital_history: null, pregnant: false,
  role: "bride", country: "KR", wedding_country: "KR", wedding_region: "서울특별시",
  has_parents_bride: true, has_parents_groom: true, ...over,
});

/** 사용자 시점: 설정 → 페르소나 분류 → 추천일정의 단계별 추천 할 일. */
function simulateSchedule(over: Partial<PersonaInputs>, opts: { weddingDate?: string; dueDate?: string; guestCount?: number } = {}) {
  const inputs = baseInputs(over);
  const mode = derivePersonaMode(inputs);
  const days = opts.weddingDate ? daysUntilWedding(opts.weddingDate) : 200;
  const preg = computePregnancyContext(inputs.pregnant, opts.dueDate ?? null, opts.weddingDate ?? null);
  const phases = applyPersonaSchedule(buildTimelinePhases(days), mode, {
    trimester: preg.trimesterAtWedding,
    ceremonyType: inputs.ceremony_type,
    guestCount: opts.guestCount ?? null,
  });
  const tasksByPhase: Record<string, string[]> = {};
  for (const p of phases) tasksByPhase[p.id] = p.defaultTasks;
  return { mode, tasksByPhase, all: phases.flatMap((p) => p.defaultTasks) };
}

describe("e2e: 페르소나 추천일정", () => {
  it("표준 신부 — 리서치 보강 공통 태스크가 노출(상견례·본식영상·하객인원)", () => {
    const r = simulateSchedule({});
    expect(r.mode).toBe("standard_bride");
    expect(r.tasksByPhase["1"]).toContain("상견례 — 양가 첫 인사·방향 합의");
    expect(r.tasksByPhase["2"]).toContain("본식 사진·영상(DVD) 예약");
    expect(r.tasksByPhase["4"]).toContain("하객 인원 확정(식대·답례품 수량)");
  });

  it("임신 후기 — 만삭 배려(휴식공간·식순 간소화)가 본식 직전 단계에 노출", () => {
    // 오늘(2026-06-22) 기준 본식 8/15, 출산예정 9/1 → 본식 시점 ≈ 38주(후기).
    const r = simulateSchedule({ pregnant: true }, { weddingDate: "2026-08-15", dueDate: "2026-09-01" });
    expect(r.mode).toBe("pregnancy");
    expect(r.tasksByPhase["1"]).toContain("산부인과에 본식 컨디션·일정 상의");
    expect(r.tasksByPhase["5"]).toContain("본식 당일 휴식 공간 미리 확보");
    expect(r.tasksByPhase["5"]).toContain("식순 최대한 간소화");
    // 초기 전용(입덧 관리)은 후기엔 안 나옴.
    expect(r.all).not.toContain("초기 안정·입덧 관리 — 무리한 일정 줄이기");
  });

  it("가족 스몰 + 식당 대관 40명 — 식당 보증인원/대관 추천", () => {
    const r = simulateSchedule(
      { wedding_style: "small", ceremony_type: "restaurant" },
      { guestCount: 40 },
    );
    expect(r.mode).toBe("small_intimate");
    expect(r.tasksByPhase["2"]).toContain("식당 대관 — 단독홀 여부·최소 보증인원 확인");
    expect(r.tasksByPhase["4"]).toContain("하객 40명 — 식당 보증인원·답례품 수량 확정");
  });

  it("셀프웨딩 — 본식 영상/하객 식대 제거 + 혼인신고 행정 추가", () => {
    const r = simulateSchedule({ ceremony_type: "self_only" });
    expect(r.mode).toBe("self_no_ceremony");
    expect(r.tasksByPhase["2"]).toContain("혼인신고 서류 준비(증인 2인·가족관계증명서)");
    expect(r.tasksByPhase["2"]).not.toContain("본식 사진·영상(DVD) 예약");
    expect(r.tasksByPhase["4"]).not.toContain("하객 인원 확정(식대·답례품 수량)");
    expect(r.tasksByPhase["5"]).toContain("혼인신고 접수(평일·시군구청)");
  });

  it("노웨딩 — 식 관련 제거, 허니문/신혼집 중심", () => {
    const r = simulateSchedule({ ceremony_type: "none" });
    expect(r.mode).toBe("no_wedding_travel");
    expect(r.tasksByPhase["2"]).not.toContain("웨딩홀 계약하기");
    expect(r.tasksByPhase["2"]).not.toContain("본식 사진·영상(DVD) 예약");
    expect(r.tasksByPhase["5"]).toContain("신혼집 셋업 마무리");
  });

  it("재혼 — 예물 제거 + 혼인신고", () => {
    const r = simulateSchedule({ marital_history: "remarriage" });
    expect(r.mode).toBe("remarriage");
    expect(r.tasksByPhase["3"]).not.toContain("예물 선택");
    expect(r.tasksByPhase["3"]).toContain("혼인신고 서류 준비");
  });

  it("국제/해외는 일정 개인화 제외 — 표준 흐름 유지", () => {
    const intl = simulateSchedule({ wedding_country: "US" });
    expect(intl.mode).toBe("international");
    // 표준 보강 태스크는 그대로, 국제 전용 일정 델타는 없음.
    expect(intl.tasksByPhase["1"]).toContain("상견례 — 양가 첫 인사·방향 합의");
  });
});

describe("e2e: 예산 환불 — 전 합산 지점 일관성", () => {
  // 사용자 시나리오: 웨딩홀 계약금 300 + 스드메 290 기록 후, 계약 일부 취소로 50 환불.
  const items: ReportLineItem[] = [
    { amount: 300, paid_by: "shared", has_balance: true, balance_amount: 700, payment_method: "card" }, // 웨딩홀(잔금 700)
    { amount: 290, paid_by: "bride", has_balance: false, balance_amount: null, payment_method: "transfer" }, // 스드메
    { amount: 50, paid_by: "shared", has_balance: false, balance_amount: null, payment_method: "transfer", is_refund: true }, // 환불
  ];
  const EXPECTED_NET = 300 + 290 - 50; // 540 (순지출)

  it("요약/내역/위젯 방식(netManwon 합) = 순지출 540", () => {
    const summaryStyle = items.reduce((s, i) => s + netManwon(i), 0);
    const widgetStyle = items.reduce((s, i) => s + netManwon(i), 0);
    expect(summaryStyle).toBe(EXPECTED_NET);
    expect(widgetStyle).toBe(EXPECTED_NET);
  });

  it("PDF 리포트(computeBudgetFinancials) totalPaid 도 540 + 환불은 미납 0", () => {
    const fin = computeBudgetFinancials(items);
    expect(fin.totalPaid).toBe(EXPECTED_NET); // 환불 차감 반영
    expect(fin.totalPending).toBe(700); // 웨딩홀 잔금만, 환불은 미납 0
    expect(fin.payers.shared.paid).toBe(300 - 50); // 공동: 계약금 - 환불
    expect(fin.payers.bride.paid).toBe(290);
  });

  it("세 방식이 서로 일치(화면 간 합계 불일치 없음)", () => {
    const summaryStyle = items.reduce((s, i) => s + netManwon(i), 0);
    const fin = computeBudgetFinancials(items);
    expect(fin.totalPaid).toBe(summaryStyle);
  });

  it("환불 없는 경우와의 차이가 정확히 환불액(50)", () => {
    const withRefund = items.reduce((s, i) => s + netManwon(i), 0);
    const withoutRefund = items.filter((i) => !i.is_refund).reduce((s, i) => s + netManwon(i), 0);
    expect(withoutRefund - withRefund).toBe(50);
  });
});
