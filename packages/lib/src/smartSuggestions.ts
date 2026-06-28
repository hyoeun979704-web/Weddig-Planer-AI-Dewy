// 크로스-피처 스마트 제안 엔진 — 유기성 배선 D2(다음 액션) + C1(하객→식대 추정).
//
// 배경: 홈 "다음 액션"은 일정 항목만 보여주고 전부 /my-schedule 로만 보낸다(섬 안에서만
// 순환). 이 모듈은 **기능 간 빈틈**(예산 미설정·컨설팅 미실시·예산 초과·임박한 체크리스트)을
// 감지해 각 기능으로 **딥링크**하는 제안을 만든다 — 자율 에이전트("다음에 뭘 하면 되나")의 씨앗.
//
// 순수 함수만 둔다(React·supabase 무의존). I/O 는 useSmartSuggestions 훅이 담당.

import type { WeddingPersonaMode } from "./weddingPersona";

/** 1인 식대(원) 보수적 추정 구간 — 한국 평균 4~6.5만/인. */
const PER_HEAD_LOW = 40000;
const PER_HEAD_MID = 50000;
const PER_HEAD_HIGH = 65000;

export interface CateringEstimate {
  low: number;
  mid: number;
  high: number;
}

/** 하객수 → 식대 추정(원). 0/미설정이면 null. (C1) */
export function estimateCateringCost(guestCount: number | null): CateringEstimate | null {
  if (!guestCount || guestCount <= 0) return null;
  return {
    low: guestCount * PER_HEAD_LOW,
    mid: guestCount * PER_HEAD_MID,
    high: guestCount * PER_HEAD_HIGH,
  };
}

/** 원 → "약 N,NNN만원" 표시(반올림). */
export function formatManwon(won: number): string {
  const manwon = Math.round(won / 10000);
  return `약 ${manwon.toLocaleString("ko-KR")}만원`;
}

export interface SmartSuggestionInput {
  daysUntilWedding: number | null;
  hasBudgetSettings: boolean;
  /** 총예산 − 지출(원). 예산 미설정이면 null. */
  budgetRemaining: number | null;
  hasConsulting: boolean;
  /** 미완료 일정 항목 수. */
  openScheduleCount: number;
  progressPercent: number;
  guestCount: number | null;
  personaMode: WeddingPersonaMode | null;
}

export interface SmartSuggestion {
  id: string;
  label: string;
  reason: string;
  href: string;
  /** 높을수록 위(긴급/중요). */
  priority: number;
}

/**
 * 빈틈 기반 제안을 우선순위 내림차순으로 반환. 각 제안은 해당 기능으로 딥링크한다.
 * 빈틈이 없으면 빈 배열(카드 미렌더).
 */
export function deriveSmartSuggestions(
  input: SmartSuggestionInput,
  limit = 3,
): SmartSuggestion[] {
  const out: SmartSuggestion[] = [];
  const d = input.daysUntilWedding;

  // 예산 초과 — 가장 긴급(이미 지출이 총예산 넘음).
  if (input.hasBudgetSettings && input.budgetRemaining != null && input.budgetRemaining < 0) {
    out.push({
      id: "over-budget",
      label: "예산 초과 점검하기",
      reason: `지출이 총예산을 ${formatManwon(Math.abs(input.budgetRemaining))} 넘었어요`,
      href: "/budget",
      priority: 95,
    });
  }

  // 임박 + 진척 저조 — 체크리스트 점검.
  if (d != null && d >= 0 && d <= 90 && input.progressPercent < 70 && input.openScheduleCount > 0) {
    out.push({
      id: "checklist-urgent",
      label: "남은 체크리스트 점검",
      reason: `D-${d}, 준비 ${input.progressPercent}% — 지금이 마무리 타이밍`,
      href: "/my-schedule",
      priority: 85,
    });
  }

  // 예산 미설정 — 식대 추정으로 동기 부여(C1).
  if (!input.hasBudgetSettings) {
    const est = estimateCateringCost(input.guestCount);
    const reason = est
      ? `하객 ${input.guestCount}명 기준 식대만 ${formatManwon(est.mid)} 예상돼요`
      : "총예산부터 잡으면 추천이 정확해져요";
    out.push({
      id: "set-budget",
      label: "예산 설정하기",
      reason,
      href: "/budget",
      priority: 80,
    });
  }

  // 퍼스널컬러 컨설팅 미실시 — 드레스·메이크업 추천 정확도 연결(Wave 0 과 시너지).
  if (!input.hasConsulting) {
    out.push({
      id: "consulting",
      label: "퍼스널컬러 컨설팅 받기",
      reason: "드레스·메이크업 AI 추천이 내 톤에 맞춰져요",
      href: "/wedding-consulting",
      priority: 55,
    });
  }

  return out.sort((a, b) => b.priority - a.priority).slice(0, limit);
}
