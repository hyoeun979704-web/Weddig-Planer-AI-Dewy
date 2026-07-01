// 홀 예약 가능일 — 상태 메타 + 달력 그리드 헬퍼(순수). 파트너 입력·소비자 표시 공유.
// 실시간 예약 거래가 아니라 "가능/마감" 표시용(3-B 첫 조각).

export type AvailabilityStatus = "available" | "booked" | "limited";

export const AVAILABILITY_META: Record<
  AvailabilityStatus,
  { label: string; short: string; tone: string; dot: string }
> = {
  available: { label: "예약 가능", short: "가능", tone: "text-emerald-600", dot: "bg-emerald-500" },
  limited: { label: "잔여 적음·문의", short: "문의", tone: "text-amber-600", dot: "bg-amber-500" },
  booked: { label: "예약 마감", short: "마감", tone: "text-rose-500", dot: "bg-rose-400" },
};

/** 파트너가 날짜를 탭할 때 순환할 상태(null = 미표시로 되돌림). */
export const AVAILABILITY_CYCLE: (AvailabilityStatus | null)[] = ["available", "booked", "limited", null];

export function nextStatus(cur: AvailabilityStatus | null): AvailabilityStatus | null {
  const i = AVAILABILITY_CYCLE.indexOf(cur ?? null);
  return AVAILABILITY_CYCLE[(i + 1) % AVAILABILITY_CYCLE.length];
}

/** ISO(YYYY-MM-DD) 로컬 날짜 문자열. 타임존 시프트 없이 연·월·일로 조립. */
export function isoDate(year: number, month0: number, day: number): string {
  const m = String(month0 + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

/**
 * 월 달력 6주(42칸) 그리드. 앞뒤 패딩은 null. month0 은 0-based(0=1월).
 * 일요일 시작. 순수 — (year, month0) 입력만 사용.
 */
export function buildMonthGrid(year: number, month0: number): (string | null)[] {
  const first = new Date(year, month0, 1);
  const startDow = first.getDay(); // 0=일
  const daysInMonth = new Date(year, month0 + 1, 0).getDate();
  const cells: (string | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(isoDate(year, month0, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

/** 다음 달로(year, month0) 이동. 12월→다음해 1월. */
export function shiftMonth(year: number, month0: number, delta: number): { year: number; month0: number } {
  const total = year * 12 + month0 + delta;
  return { year: Math.floor(total / 12), month0: ((total % 12) + 12) % 12 };
}

export function statusForDate(
  map: Record<string, AvailabilityStatus>,
  dateIso: string | null | undefined,
): AvailabilityStatus | null {
  if (!dateIso) return null;
  return map[dateIso] ?? null;
}
