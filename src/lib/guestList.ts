// 하객 리스트 v0 도메인 타입·헬퍼. DB 컬럼/CHECK와 동기화 — 변경 시
// supabase/migrations/20260516140000_guest_list_items.sql 도 함께 본다.

export type GuestSide = "groom" | "bride" | "shared";
export type GuestRsvpStatus = "pending" | "attending" | "declined" | "maybe";

export interface GuestItem {
  id: string;
  user_id: string;
  name: string;
  side: GuestSide;
  relationship: string | null;
  rsvp_status: GuestRsvpStatus;
  attending_count: number;
  contact: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const GUEST_SIDE_LABEL: Record<GuestSide, string> = {
  groom: "신랑측",
  bride: "신부측",
  shared: "공통",
};

export const GUEST_RSVP_LABEL: Record<GuestRsvpStatus, string> = {
  pending: "미응답",
  attending: "참석",
  declined: "불참",
  maybe: "미정",
};

export const GUEST_RSVP_ORDER: GuestRsvpStatus[] = [
  "attending",
  "maybe",
  "pending",
  "declined",
];

export interface GuestStats {
  total: number;
  totalHeads: number;
  byStatus: Record<GuestRsvpStatus, number>;
  /** 참석/미정 RSVP만 합산 — 식대·좌석 추정용. declined는 제외, pending은 보수적으로 포함. */
  expectedHeads: { groom: number; bride: number; shared: number; all: number };
}

const EMPTY_STATUS: Record<GuestRsvpStatus, number> = {
  pending: 0,
  attending: 0,
  declined: 0,
  maybe: 0,
};

/**
 * RSVP·측별 인원 집계. declined는 expectedHeads에서 제외, pending은 일단
 * 포함(아직 응답 없는 사람을 보수적으로 잡음). 컴포넌트 쪽에서 매번
 * reduce 하는 대신 한 곳에서 계산해 캐싱.
 */
export const computeGuestStats = (items: readonly GuestItem[]): GuestStats => {
  const byStatus = { ...EMPTY_STATUS };
  let totalHeads = 0;
  const expected = { groom: 0, bride: 0, shared: 0, all: 0 };

  for (const g of items) {
    byStatus[g.rsvp_status] = (byStatus[g.rsvp_status] ?? 0) + 1;
    totalHeads += g.attending_count;
    if (g.rsvp_status !== "declined") {
      expected[g.side] += g.attending_count;
      expected.all += g.attending_count;
    }
  }

  return {
    total: items.length,
    totalHeads,
    byStatus,
    expectedHeads: expected,
  };
};
