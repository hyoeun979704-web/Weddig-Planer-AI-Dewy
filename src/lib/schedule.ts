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

export const TIMELINE_PHASES: TimelinePhase[] = [
  {
    id: "1",
    period: "D-365 ~ D-180",
    title: "웨딩 준비 시작",
    description: "예산 설정 및 웨딩홀 탐색",
    icon: Heart,
    defaultTasks: ["전체 예산 설정하기", "웨딩 스타일 결정하기", "웨딩홀 리스트업", "웨딩플래너 상담"],
    category: "phase-1",
    defaultDaysBeforeWedding: 270,
  },
  {
    id: "2",
    period: "D-180 ~ D-120",
    title: "웨딩홀 & 스드메 계약",
    description: "본격적인 업체 선정 및 계약",
    icon: Camera,
    defaultTasks: ["웨딩홀 계약하기", "스튜디오 선정", "드레스샵 예약", "메이크업샵 예약"],
    category: "phase-2",
    defaultDaysBeforeWedding: 150,
  },
  {
    id: "3",
    period: "D-120 ~ D-60",
    title: "혼수 및 예물 준비",
    description: "신혼집 준비와 예물 선택",
    icon: Gift,
    defaultTasks: ["신혼집 계약", "가전제품 구매", "예물 선택", "한복/예복 맞춤"],
    category: "phase-3",
    defaultDaysBeforeWedding: 90,
  },
  {
    id: "4",
    period: "D-60 ~ D-30",
    title: "허니문 & 청첩장",
    description: "신혼여행 예약 및 청첩장 발송",
    icon: Plane,
    defaultTasks: ["허니문 예약", "청첩장 제작", "모바일 청첩장 발송", "하객 리스트 정리"],
    category: "phase-4",
    defaultDaysBeforeWedding: 45,
  },
  {
    id: "5",
    period: "D-30 ~ D-Day",
    title: "최종 점검",
    description: "마지막 피팅과 리허설",
    icon: HomeIcon,
    defaultTasks: ["드레스 최종 피팅", "웨딩 리허설", "식순 확인", "답례품 준비"],
    category: "phase-5",
    defaultDaysBeforeWedding: 15,
  },
];

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
