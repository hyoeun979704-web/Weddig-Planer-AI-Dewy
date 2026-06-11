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
// ---------------------------------------------------------------------------
// 모바일 청첩장 RSVP — invitation_rsvp 행을 하객명단/대시보드 도메인으로 매핑.
// DB 컬럼/CHECK 동기화: supabase/migrations/20260608210000_invitation_rsvp.sql,
// 20260611120000_invitation_rsvp_side_child_guest_link.sql
// ---------------------------------------------------------------------------

export type RsvpSide = "undecided" | "groom" | "bride";
export type RsvpMealPreference = "undecided" | "yes" | "no";

export interface InvitationRsvpRow {
  id: string;
  invitation_id: string;
  name: string;
  is_attending: boolean;
  meal_preference: RsvpMealPreference;
  companion_count: number;
  child_count: number;
  side: RsvpSide;
  message: string | null;
  created_at: string;
}

export const RSVP_SIDE_LABEL: Record<RsvpSide, string> = {
  undecided: "미선택",
  groom: "신랑측",
  bride: "신부측",
};

export const RSVP_MEAL_LABEL: Record<RsvpMealPreference, string> = {
  undecided: "미정",
  yes: "식사함",
  no: "식사안함",
};

export interface RsvpStats {
  total: number;
  attending: number;
  declined: number;
  /** 참석 응답의 본인+동행 합계 (식수·좌석 추정 모수) */
  attendingHeads: number;
  /** attendingHeads 중 아동 수 */
  attendingChildren: number;
  /** 참석 응답 중 식사 yes 의 인원 합 */
  mealHeads: number;
  headsBySide: Record<RsvpSide, number>;
}

/** RSVP 응답 집계 — 불참은 인원 합계에서 제외. */
export const computeRsvpStats = (rows: readonly InvitationRsvpRow[]): RsvpStats => {
  const stats: RsvpStats = {
    total: rows.length,
    attending: 0,
    declined: 0,
    attendingHeads: 0,
    attendingChildren: 0,
    mealHeads: 0,
    headsBySide: { undecided: 0, groom: 0, bride: 0 },
  };
  for (const r of rows) {
    if (!r.is_attending) {
      stats.declined += 1;
      continue;
    }
    const heads = 1 + Math.max(0, r.companion_count);
    stats.attending += 1;
    stats.attendingHeads += heads;
    stats.attendingChildren += Math.max(0, r.child_count);
    if (r.meal_preference === "yes") stats.mealHeads += heads;
    stats.headsBySide[r.side] += heads;
  }
  return stats;
};

/**
 * RSVP 응답 → 하객명단 행 초안. 식사·아동 정보는 명단 스키마에 없어 notes 에
 * 보존한다. side 'undecided' 는 명단의 'shared' 로 매핑.
 */
export const rsvpToGuestDraft = (
  rsvp: InvitationRsvpRow,
): Pick<
  GuestItem,
  "name" | "side" | "relationship" | "rsvp_status" | "attending_count" | "contact" | "notes"
> => {
  const noteParts = [
    "모바일 청첩장 RSVP",
    `식사 ${RSVP_MEAL_LABEL[rsvp.meal_preference]}`,
  ];
  if (rsvp.child_count > 0) noteParts.push(`아동 ${rsvp.child_count}명 포함`);
  if (rsvp.message) noteParts.push(rsvp.message);
  return {
    name: rsvp.name,
    side: rsvp.side === "undecided" ? "shared" : rsvp.side,
    relationship: null,
    rsvp_status: rsvp.is_attending ? "attending" : "declined",
    // 명단 CHECK 는 1~20 — 본인 1 + 동행
    attending_count: Math.min(20, Math.max(1, 1 + rsvp.companion_count)),
    contact: null,
    notes: noteParts.join(" · "),
  };
};

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
