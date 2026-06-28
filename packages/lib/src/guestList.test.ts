import { describe, it, expect } from "vitest";
import { computeGuestStats, type GuestItem } from "./guestList";

const mk = (over: Partial<GuestItem>): GuestItem => ({
  id: over.id ?? crypto.randomUUID(),
  user_id: "u",
  name: "guest",
  side: "shared",
  relationship: null,
  rsvp_status: "pending",
  attending_count: 1,
  contact: null,
  notes: null,
  created_at: "2026-05-16",
  updated_at: "2026-05-16",
  ...over,
});

describe("computeGuestStats", () => {
  it("returns zeros for empty list", () => {
    const s = computeGuestStats([]);
    expect(s.total).toBe(0);
    expect(s.totalHeads).toBe(0);
    expect(s.byStatus.pending).toBe(0);
    expect(s.expectedHeads.all).toBe(0);
  });

  it("counts heads across all statuses for totalHeads", () => {
    const s = computeGuestStats([
      mk({ attending_count: 2, rsvp_status: "attending" }),
      mk({ attending_count: 3, rsvp_status: "declined" }),
      mk({ attending_count: 1, rsvp_status: "pending" }),
    ]);
    expect(s.totalHeads).toBe(6);
  });

  it("excludes declined from expectedHeads", () => {
    const s = computeGuestStats([
      mk({ attending_count: 2, side: "groom", rsvp_status: "attending" }),
      mk({ attending_count: 3, side: "bride", rsvp_status: "declined" }),
      mk({ attending_count: 1, side: "shared", rsvp_status: "maybe" }),
    ]);
    expect(s.expectedHeads).toEqual({ groom: 2, bride: 0, shared: 1, all: 3 });
  });

  it("counts pending guests toward expectedHeads (conservative)", () => {
    const s = computeGuestStats([
      mk({ attending_count: 5, rsvp_status: "pending", side: "bride" }),
    ]);
    expect(s.expectedHeads.bride).toBe(5);
    expect(s.expectedHeads.all).toBe(5);
  });

  it("aggregates status counts", () => {
    const s = computeGuestStats([
      mk({ rsvp_status: "attending" }),
      mk({ rsvp_status: "attending" }),
      mk({ rsvp_status: "declined" }),
      mk({ rsvp_status: "maybe" }),
    ]);
    expect(s.byStatus.attending).toBe(2);
    expect(s.byStatus.declined).toBe(1);
    expect(s.byStatus.maybe).toBe(1);
    expect(s.byStatus.pending).toBe(0);
  });
});

// ── 모바일 청첩장 RSVP 매핑/집계 ──────────────────────────────
import {
  computeRsvpStats,
  rsvpToGuestDraft,
  type InvitationRsvpRow,
} from "./guestList";

const mkRsvp = (over: Partial<InvitationRsvpRow>): InvitationRsvpRow => ({
  id: over.id ?? crypto.randomUUID(),
  invitation_id: "inv",
  name: "하객",
  is_attending: true,
  meal_preference: "undecided",
  companion_count: 0,
  child_count: 0,
  side: "undecided",
  message: null,
  created_at: "2026-06-11",
  ...over,
});

describe("computeRsvpStats", () => {
  it("빈 목록은 0", () => {
    const s = computeRsvpStats([]);
    expect(s.total).toBe(0);
    expect(s.attendingHeads).toBe(0);
    expect(s.headsBySide.groom).toBe(0);
  });

  it("불참은 인원 합계에서 제외", () => {
    const s = computeRsvpStats([
      mkRsvp({ is_attending: true, companion_count: 2, side: "groom" }),
      mkRsvp({ is_attending: false, companion_count: 5, side: "bride" }),
    ]);
    expect(s.attending).toBe(1);
    expect(s.declined).toBe(1);
    expect(s.attendingHeads).toBe(3); // 본인 1 + 동행 2
    expect(s.headsBySide.groom).toBe(3);
    expect(s.headsBySide.bride).toBe(0);
  });

  it("식사 yes 만 mealHeads, 아동 합산", () => {
    const s = computeRsvpStats([
      mkRsvp({ meal_preference: "yes", companion_count: 1, child_count: 1 }),
      mkRsvp({ meal_preference: "no", companion_count: 3, child_count: 2 }),
    ]);
    expect(s.mealHeads).toBe(2);
    expect(s.attendingHeads).toBe(6);
    expect(s.attendingChildren).toBe(3);
  });
});

describe("rsvpToGuestDraft", () => {
  it("undecided side 는 shared 로, 인원은 1+동행", () => {
    const d = rsvpToGuestDraft(mkRsvp({ companion_count: 2 }));
    expect(d.side).toBe("shared");
    expect(d.attending_count).toBe(3);
    expect(d.rsvp_status).toBe("attending");
  });

  it("불참은 declined, 메시지·아동 정보는 notes 보존", () => {
    const d = rsvpToGuestDraft(
      mkRsvp({ is_attending: false, side: "bride", child_count: 0, companion_count: 1, message: "축하해요", meal_preference: "yes" }),
    );
    expect(d.rsvp_status).toBe("declined");
    expect(d.side).toBe("bride");
    expect(d.notes).toContain("축하해요");
    expect(d.notes).toContain("식사함");
  });

  it("동행 20 초과 방어 (명단 CHECK 1~20)", () => {
    const d = rsvpToGuestDraft(mkRsvp({ companion_count: 20 }));
    expect(d.attending_count).toBe(20);
  });
});
