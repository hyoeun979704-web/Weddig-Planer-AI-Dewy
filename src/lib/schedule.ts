import type { ElementType } from "react";
import { Heart, Camera, Gift, Plane, Home as HomeIcon } from "lucide-react";

export interface TimelinePhase {
  id: string;
  period: string;
  title: string;
  description: string;
  icon: ElementType;
  defaultTasks: string[];
  category: string;
  // Days-before-wedding used as a default scheduled_date when the user
  // adopts one of `defaultTasks` from the empty-phase recommendations.
  defaultDaysBeforeWedding: number;
}

// 표준(365일+) phase 윈도우. 압축 모드(4·6·8개월)는 buildTimelinePhases() 에서
// 비율에 맞춰 동적 계산. 이 표는 "12개월 이상" 기준의 anchor.
const STANDARD_PHASES: Array<Omit<TimelinePhase, "period" | "defaultDaysBeforeWedding"> & {
  startRatio: number;  // wedding_date 까지 남은 기간 대비. 0=오늘, 1=본식일.
  endRatio: number;
  defaultRatio: number;
}> = [
  {
    id: "1",
    title: "웨딩 준비 시작",
    description: "예산 설정 및 웨딩홀 탐색",
    icon: Heart,
    defaultTasks: ["전체 예산 설정하기", "웨딩 스타일 결정하기", "웨딩홀 리스트업", "웨딩플래너 상담"],
    category: "phase-1",
    startRatio: 0,
    endRatio: 0.5,
    defaultRatio: 0.26,
  },
  {
    id: "2",
    title: "웨딩홀 & 스드메 계약",
    description: "본격적인 업체 선정 및 계약",
    icon: Camera,
    defaultTasks: ["웨딩홀 계약하기", "스튜디오 선정", "드레스샵 예약", "메이크업샵 예약"],
    category: "phase-2",
    startRatio: 0.5,
    endRatio: 0.67,
    defaultRatio: 0.59,
  },
  {
    id: "3",
    title: "혼수 및 예물 준비",
    description: "신혼집 준비와 예물 선택",
    icon: Gift,
    defaultTasks: ["신혼집 계약", "가전제품 구매", "예물 선택", "한복/예복 맞춤"],
    category: "phase-3",
    startRatio: 0.67,
    endRatio: 0.84,
    defaultRatio: 0.75,
  },
  {
    id: "4",
    title: "허니문 & 청첩장",
    description: "신혼여행 예약 및 청첩장 발송",
    icon: Plane,
    defaultTasks: ["허니문 예약", "청첩장 제작", "모바일 청첩장 발송", "하객 리스트 정리"],
    category: "phase-4",
    startRatio: 0.84,
    endRatio: 0.92,
    defaultRatio: 0.88,
  },
  {
    id: "5",
    title: "최종 점검",
    description: "마지막 피팅과 리허설",
    icon: HomeIcon,
    defaultTasks: ["드레스 최종 피팅", "웨딩 리허설", "식순 확인", "답례품 준비"],
    category: "phase-5",
    startRatio: 0.92,
    endRatio: 1.0,
    defaultRatio: 0.96,
  },
];

const formatPeriod = (totalDays: number, startRatio: number, endRatio: number): string => {
  // D-N 표기로 phase 구간을 보여준다. 표준에선 "D-365 ~ D-180", 압축 모드에선 "D-120 ~ D-60" 식.
  const startD = Math.round(totalDays * (1 - startRatio));
  const endD = Math.round(totalDays * (1 - endRatio));
  if (endD <= 0) return `D-${startD} ~ D-Day`;
  return `D-${startD} ~ D-${endD}`;
};

/**
 * Wedding date까지의 남은 일수에 따라 phase 윈도우를 동적으로 계산.
 * - totalDays NULL / >= 360: 표준 5단계(D-365 ~ D-Day).
 * - 120 ~ 360: 압축 비율 — 비율은 그대로, 절대일수는 단축.
 * - < 120: P18 시나리오. phase 1~2를 더 짧게, phase 3~5는 거의 동일 비율 유지.
 *
 * Returns a copy of TimelinePhase[] with `period` / `defaultDaysBeforeWedding` filled.
 */
export const buildTimelinePhases = (daysUntil: number | null): TimelinePhase[] => {
  const total = daysUntil && daysUntil > 0 ? daysUntil : 365;
  return STANDARD_PHASES.map((p) => ({
    id: p.id,
    title: p.title,
    description: p.description,
    icon: p.icon,
    defaultTasks: p.defaultTasks,
    category: p.category,
    period: formatPeriod(total, p.startRatio, p.endRatio),
    // defaultRatio 는 "phase 중간 정도" — 추천 task scheduled_date 시드 시 사용.
    defaultDaysBeforeWedding: Math.max(1, Math.round(total * (1 - p.defaultRatio))),
  }));
};

// 호환용 익스포트 — 호출자가 정적 import 한 곳에 영향 없도록 기본(표준 365일)을 노출.
// 새 코드/임신/임박 사용자는 buildTimelinePhases(daysUntil) 사용 권장.
export const TIMELINE_PHASES: TimelinePhase[] = buildTimelinePhases(null);

export const CATEGORY_OPTIONS: { value: string; label: string }[] = [
  { value: "general", label: "일반" },
  ...TIMELINE_PHASES.map(p => ({
    value: p.category,
    label: `${p.period.replace(/\s/g, "")}: ${p.title}`,
  })),
];

// Parses a "YYYY-MM-DD" date string as local midnight. The default
// `new Date("YYYY-MM-DD")` treats the value as UTC midnight, which drifts
// by one day for users in negative-UTC timezones and produces fractional
// day diffs against a local-midnight "today".
export const parseLocalDate = (dateStr: string): Date => {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
};

export const daysUntilWedding = (weddingDate: string | null | undefined): number | null => {
  if (!weddingDate) return null;
  const wedding = parseLocalDate(weddingDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((wedding.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};

export type TaskUrgency = "past_due" | "urgent" | "this_month" | "later";

// Classifies a "YYYY-MM-DD" task date relative to today into a coarse urgency
// bucket. `today` is normalized to local midnight so the boundaries line up
// with the user's wall calendar regardless of the time of day.
export const getTaskUrgency = (dateStr: string, today: Date = new Date()): TaskUrgency => {
  const target = parseLocalDate(dateStr);
  const base = new Date(today);
  base.setHours(0, 0, 0, 0);
  const daysLeft = Math.round((target.getTime() - base.getTime()) / (1000 * 60 * 60 * 24));
  if (daysLeft < 0) return "past_due";
  if (daysLeft <= 7) return "urgent";
  if (daysLeft <= 30) return "this_month";
  return "later";
};
