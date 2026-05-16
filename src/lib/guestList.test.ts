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
