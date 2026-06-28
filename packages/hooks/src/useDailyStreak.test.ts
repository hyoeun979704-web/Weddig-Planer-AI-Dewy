import { describe, it, expect } from "vitest";
import { applyCheckIn, FREEZE_CAP, type StreakState } from "@/hooks/useDailyStreak";

const base = (over: Partial<StreakState> = {}): StreakState => ({
  last_checkin_date: "2026-06-20",
  current_streak: 3,
  longest_streak: 5,
  total_days: 10,
  freezes_available: 2,
  ...over,
});

describe("applyCheckIn", () => {
  it("첫 체크인(prev 없음) → 연속 1", () => {
    const { next, changed } = applyCheckIn(null, "2026-06-22");
    expect(changed).toBe(true);
    expect(next.current_streak).toBe(1);
    expect(next.total_days).toBe(1);
    expect(next.longest_streak).toBe(1);
    expect(next.freezes_available).toBe(FREEZE_CAP);
  });

  it("같은 날 재호출 → 변화 없음", () => {
    const prev = base({ last_checkin_date: "2026-06-22" });
    const { next, changed } = applyCheckIn(prev, "2026-06-22");
    expect(changed).toBe(false);
    expect(next).toBe(prev);
  });

  it("어제 체크인 → 연속 +1, 총일수 +1", () => {
    const prev = base({ last_checkin_date: "2026-06-21", current_streak: 3, total_days: 10 });
    const { next } = applyCheckIn(prev, "2026-06-22");
    expect(next.current_streak).toBe(4);
    expect(next.total_days).toBe(11);
  });

  it("하루 빠짐 + 프리즈 보유 → 프리즈 소모하고 연속 유지", () => {
    const prev = base({ last_checkin_date: "2026-06-20", current_streak: 3, freezes_available: 2 });
    const { next } = applyCheckIn(prev, "2026-06-22"); // 06-21 빠짐(gap 2)
    expect(next.current_streak).toBe(4);
    expect(next.freezes_available).toBe(1);
  });

  it("하루 빠짐 + 프리즈 없음 → 리셋", () => {
    const prev = base({ last_checkin_date: "2026-06-20", current_streak: 3, freezes_available: 0 });
    const { next } = applyCheckIn(prev, "2026-06-22");
    expect(next.current_streak).toBe(1);
    expect(next.freezes_available).toBe(0);
  });

  it("2일 이상 공백 → 프리즈 있어도 리셋(프리즈는 하루만 보호)", () => {
    const prev = base({ last_checkin_date: "2026-06-18", current_streak: 5, freezes_available: 2 });
    const { next } = applyCheckIn(prev, "2026-06-22"); // gap 4
    expect(next.current_streak).toBe(1);
    expect(next.freezes_available).toBe(2); // 미소모
  });

  it("7일 연속 도달 시 프리즈 +1(상한 준수)", () => {
    const prev = base({ last_checkin_date: "2026-06-21", current_streak: 6, freezes_available: 0 });
    const { next } = applyCheckIn(prev, "2026-06-22"); // → 7
    expect(next.current_streak).toBe(7);
    expect(next.freezes_available).toBe(1);
  });

  it("프리즈 상한 초과 충전 안 함", () => {
    const prev = base({ last_checkin_date: "2026-06-21", current_streak: 13, freezes_available: FREEZE_CAP });
    const { next } = applyCheckIn(prev, "2026-06-22"); // → 14 (7의 배수)
    expect(next.current_streak).toBe(14);
    expect(next.freezes_available).toBe(FREEZE_CAP);
  });

  it("longest 는 최댓값 유지", () => {
    const prev = base({ last_checkin_date: "2026-06-21", current_streak: 9, longest_streak: 9 });
    const { next } = applyCheckIn(prev, "2026-06-22");
    expect(next.current_streak).toBe(10);
    expect(next.longest_streak).toBe(10);
  });
});
