// 로컬 알림 스케줄 계산 — 순수 함수만. Capacitor 호출은 localNotifications.ts.
//
// 여기서 만든 PlannedNotification[] 을 localNotifications.rescheduleAll() 이
// 기기에 예약한다. 순수 함수로 분리해 단위 테스트로 경계(조용한 시간, 과거 제외,
// 마일스톤 계산)를 고정한다.

import { parseLocalDate } from "@/lib/schedule";

export type NotificationCategory = "dday" | "schedule" | "budget";

export interface PlannedNotification {
  /** 안정적인 정수 id — 재스케줄 시 같은 알림을 교체(중복 방지)하는 키. */
  id: number;
  title: string;
  body: string;
  /** 로컬 발화 시각. */
  at: Date;
  /** 탭 시 이동할 라우트. */
  route: string;
  category: NotificationCategory;
  /** 반복 주기(예산 주간 리마인더). 미지정이면 1회성. */
  repeatEvery?: "week";
}

// 카테고리별 고정 ID 레인지 — 재스케줄 시 해당 레인지만 취소 후 다시 예약.
export const ID_RANGES: Record<NotificationCategory, { base: number; size: number }> = {
  dday: { base: 1_000, size: 100 },
  schedule: { base: 2_000, size: 500 },
  budget: { base: 3_000, size: 100 },
};

export function isInRange(id: number, category: NotificationCategory): boolean {
  const { base, size } = ID_RANGES[category];
  return id >= base && id < base + size;
}

const QUIET_START_HOUR = 21; // 21:00 부터
const QUIET_END_HOUR = 8; // 08:00 까지 (조용한 시간)
const MORNING_HOUR = 9; // 알림 기본 발송 시각 09:00

/**
 * 조용한 시간(21:00~08:00) 가드. 해당 구간 발화는 다음 가능한 오전 09:00 로 이동.
 * - 21시 이후: 익일 09:00
 * - 08시 이전: 같은 날 09:00
 */
export function applyQuietHours(date: Date): Date {
  const h = date.getHours();
  if (h >= QUIET_END_HOUR && h < QUIET_START_HOUR) return date;
  const shifted = new Date(date);
  if (h >= QUIET_START_HOUR) {
    shifted.setDate(shifted.getDate() + 1);
  }
  shifted.setHours(MORNING_HOUR, 0, 0, 0);
  return shifted;
}

/** 특정 날짜의 오전 09:00 Date. */
function morningOf(d: Date): Date {
  const m = new Date(d);
  m.setHours(MORNING_HOUR, 0, 0, 0);
  return m;
}

// D-day 리마인더 마일스톤(예식 N일 전). 0 = 당일.
export const DDAY_MILESTONES = [180, 90, 30, 7, 1, 0] as const;

/**
 * 예식일 기준 마일스톤 로컬 알림 계획. 과거 시각은 제외.
 */
export function buildDdayPlan(
  weddingDate: string | null | undefined,
  now: Date = new Date(),
): PlannedNotification[] {
  if (!weddingDate) return [];
  const wedding = parseLocalDate(weddingDate);
  if (Number.isNaN(wedding.getTime())) return [];

  const { base } = ID_RANGES.dday;
  const out: PlannedNotification[] = [];
  DDAY_MILESTONES.forEach((n, idx) => {
    const fire = morningOf(wedding);
    fire.setDate(fire.getDate() - n);
    const at = applyQuietHours(fire);
    if (at.getTime() <= now.getTime()) return; // 이미 지난 마일스톤 제외
    out.push({
      id: base + idx,
      title: n === 0 ? "오늘은 결혼식 날이에요 💍" : `결혼식 D-${n}`,
      body:
        n === 0
          ? "행복한 하루 되세요!"
          : `예식까지 ${n}일 남았어요. 준비 상황을 점검해 볼까요?`,
      at,
      route: "/schedule",
      category: "dday",
    });
  });
  return out;
}

export interface SchedulePlanItem {
  id: string;
  title: string;
  scheduled_date: string;
  completed: boolean;
}

/**
 * 미완료 일정 항목 리마인더. 일정 당일 오전 09:00(조용한 시간 가드 적용).
 * 과거 항목 제외. 너무 많은 알림을 막기 위해 가까운 순으로 상한(maxItems).
 */
export function buildSchedulePlan(
  items: SchedulePlanItem[],
  now: Date = new Date(),
  maxItems = 30,
): PlannedNotification[] {
  const { base } = ID_RANGES.schedule;
  const upcoming = items
    .filter((it) => !it.completed && !!it.scheduled_date)
    .map((it) => ({ it, at: applyQuietHours(morningOf(parseLocalDate(it.scheduled_date))) }))
    .filter(({ at }) => !Number.isNaN(at.getTime()) && at.getTime() > now.getTime())
    .sort((a, b) => a.at.getTime() - b.at.getTime())
    .slice(0, maxItems);

  return upcoming.map(({ it, at }, idx) => ({
    id: base + idx,
    title: "오늘의 웨딩 준비 일정",
    body: it.title,
    at,
    route: "/schedule",
    category: "schedule" as const,
  }));
}

/**
 * 예산 리마인더. 주 1회 지출 기록 유도(다음 일요일 오전 10시부터 매주 반복).
 * remaining < 0 (예산 초과)이면 즉시성 경고도 추가.
 */
export function buildBudgetPlan(
  opts: { remaining?: number | null } = {},
  now: Date = new Date(),
): PlannedNotification[] {
  const { base } = ID_RANGES.budget;
  const out: PlannedNotification[] = [];

  // 다음 일요일 10:00 — 매주 반복.
  const next = new Date(now);
  const daysUntilSunday = (7 - next.getDay()) % 7 || 7;
  next.setDate(next.getDate() + daysUntilSunday);
  next.setHours(10, 0, 0, 0);
  out.push({
    id: base,
    title: "이번 주 예산 점검",
    body: "지출 내역을 기록하고 남은 예산을 확인해 보세요.",
    at: next,
    route: "/budget",
    category: "budget",
    repeatEvery: "week",
  });

  if (typeof opts.remaining === "number" && opts.remaining < 0) {
    const at = applyQuietHours(new Date(now.getTime() + 60_000));
    out.push({
      id: base + 1,
      title: "예산을 초과했어요",
      body: `현재 ${Math.abs(Math.round(opts.remaining)).toLocaleString()}원 초과 상태예요. 예산을 점검해 보세요.`,
      at,
      route: "/budget",
      category: "budget",
    });
  }
  return out;
}
