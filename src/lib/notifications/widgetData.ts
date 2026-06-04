// 위젯 표시용 데이터 변환 — 순수 함수(테스트 대상).
// 훅 데이터(예식일/일정/예산 요약) → WidgetPayload.

import { parseLocalDate } from "@/lib/schedule";
import type {
  WidgetPayload,
  WidgetScheduleEntry,
} from "@/lib/native/widgetSync";

export function ddayLabel(days: number | null): string | null {
  if (days === null) return null;
  if (days === 0) return "D-DAY";
  return days > 0 ? `D-${days}` : `D+${-days}`;
}

/** `now`(로컬 자정 기준)에서 대상 날짜까지 남은 일수. 위젯 계산을 now 에 맞춰 결정적으로. */
function daysFrom(now: Date, dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const target = parseLocalDate(dateStr);
  if (Number.isNaN(target.getTime())) return null;
  const base = new Date(now);
  base.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - base.getTime()) / 86_400_000);
}

function formatKoreanDate(dateStr: string): string {
  const d = parseLocalDate(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

export interface WidgetSourceItem {
  title: string;
  scheduled_date: string;
  completed: boolean;
}

export function buildWidgetPayload(
  weddingDate: string | null | undefined,
  items: WidgetSourceItem[],
  budget: { spent: number; total: number; remaining: number } | null,
  now: Date = new Date(),
  maxSchedule = 3,
): WidgetPayload {
  const days = daysFrom(now, weddingDate);
  const dday =
    weddingDate && days !== null
      ? { label: ddayLabel(days)!, dateText: formatKoreanDate(weddingDate) }
      : null;

  const schedule: WidgetScheduleEntry[] = items
    .filter((it) => !it.completed && !!it.scheduled_date)
    .map((it) => ({ it, d: daysFrom(now, it.scheduled_date) }))
    .filter(({ d }) => d !== null && d >= 0)
    .sort((a, b) => (a.d! - b.d!))
    .slice(0, maxSchedule)
    .map(({ it, d }) => ({
      title: it.title,
      dateLabel: d === 0 ? "오늘" : `D-${d}`,
    }));

  return {
    dday,
    schedule,
    budget: budget && budget.total > 0 ? budget : null,
  };
}
