import { describe, it, expect } from "vitest";
import { computeSeatingDraft, DEFAULT_SEATS_PER_TABLE } from "./seatingDraft";
import type { GuestItem, GuestSide, GuestRsvpStatus } from "./guestList";

let seq = 0;
const g = (
  side: GuestSide,
  relationship: string | null,
  opts: { rsvp?: GuestRsvpStatus; heads?: number; name?: string } = {},
): GuestItem => ({
  id: `g${seq++}`,
  user_id: "u1",
  name: opts.name ?? `guest${seq}`,
  side,
  relationship,
  rsvp_status: opts.rsvp ?? "attending",
  attending_count: opts.heads ?? 1,
  contact: null,
  notes: null,
  created_at: "2026-01-01",
  updated_at: "2026-01-01",
});

describe("computeSeatingDraft", () => {
  it("빈 명단 → 테이블 0, 인원 0(빈 데이터 폴백)", () => {
    const d = computeSeatingDraft([]);
    expect(d.tables).toEqual([]);
    expect(d.totalHeads).toBe(0);
    expect(d.seatedHeads).toBe(0);
  });

  it("참석 확정만 배치 — pending/declined/maybe 제외", () => {
    const d = computeSeatingDraft([
      g("groom", "친구", { rsvp: "attending" }),
      g("groom", "친구", { rsvp: "pending" }),
      g("bride", "가족", { rsvp: "declined" }),
      g("bride", "가족", { rsvp: "maybe" }),
    ]);
    expect(d.totalHeads).toBe(1);
    expect(d.seatedHeads).toBe(1);
  });

  it("식장 좌석수 없으면 기본 10 가정(seatsAssumed=true)", () => {
    const d = computeSeatingDraft([g("groom", "친구")]);
    expect(d.seatsPerTable).toBe(DEFAULT_SEATS_PER_TABLE);
    expect(d.seatsAssumed).toBe(true);
  });

  it("좌석수 주면 그 용량으로 테이블 분할(seatsAssumed=false)", () => {
    const guests = Array.from({ length: 5 }, () => g("groom", "친구"));
    const d = computeSeatingDraft(guests, { seatsPerTable: 2 });
    expect(d.seatsAssumed).toBe(false);
    expect(d.seatsPerTable).toBe(2);
    // 5명 / 2인 = 3테이블(2,2,1)
    expect(d.tables.length).toBe(3);
    expect(d.tables.every((t) => t.heads <= 2)).toBe(true);
    expect(d.seatedHeads).toBe(5);
  });

  it("attending_count(동반)으로 인원 계산 — 용량 초과 방지", () => {
    const d = computeSeatingDraft(
      [g("bride", "가족", { heads: 3 }), g("bride", "가족", { heads: 2 })],
      { seatsPerTable: 4 },
    );
    // 3 + 2 = 5 > 4 → 두 테이블로 분리
    expect(d.tables.length).toBe(2);
    expect(d.totalHeads).toBe(5);
  });

  it("같은 side+relationship 은 한 테이블에 모인다(대표 라벨)", () => {
    const d = computeSeatingDraft(
      [g("groom", "친구"), g("groom", "친구"), g("bride", "회사")],
      { seatsPerTable: 10 },
    );
    expect(d.tables.length).toBe(1); // 3명 ≤ 10 → 한 테이블
    expect(d.tables[0].groupLabel).toContain("신랑");
  });

  it("테이블 수 상한 초과분은 미배치로 집계(tableCountCapped)", () => {
    const guests = Array.from({ length: 6 }, () => g("groom", "친구"));
    const d = computeSeatingDraft(guests, { seatsPerTable: 2, tableCount: 2 });
    // 2테이블 × 2인 = 4석만 → 나머지 2명 미배치
    expect(d.tables.length).toBe(2);
    expect(d.tableCountCapped).toBe(true);
    expect(d.unseatedHeads).toBe(2);
    expect(d.seatedHeads).toBe(4);
  });

  it("단일 대인원(용량 초과)도 빈 테이블엔 자리 보장", () => {
    const d = computeSeatingDraft([g("bride", "가족", { heads: 12 })], { seatsPerTable: 10 });
    expect(d.tables.length).toBe(1);
    expect(d.tables[0].heads).toBe(12);
  });
});
