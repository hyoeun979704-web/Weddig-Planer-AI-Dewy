// 좌석배치 "자동 초안"(B2 안전 1차) — 순수 로직. 관계(side·relationship) 기반으로 참석 확정
// 하객을 테이블에 묶는 초안을 만든다. 저장(seating_assignments 테이블)·드래그 편집은 데이터가
// 쌓인 뒤로 이월(로드맵). 여기선 계산만 — 빈 캔버스 대신 "관계 기반 초안"을 보여주는 게 목적.
//
// 설계: 같은 side+relationship 이 인접하도록 정렬 후 테이블 용량(seatsPerTable)만큼 순차 배치.
// 정렬로 같은 그룹이 한 테이블에 모이고, 용량 경계에서만 테이블이 갈린다(O(n), 결정적·테스트 용이).

import type { GuestItem, GuestSide } from "./guestList";
import { GUEST_SIDE_LABEL } from "./guestList";

export interface SeatingTable {
  index: number; // 1-based 테이블 번호
  label: string; // "1번 테이블"
  groupLabel: string; // 대표 그룹 "신랑측 친구"
  guests: GuestItem[];
  heads: number;
}

export interface SeatingDraft {
  tables: SeatingTable[];
  seatsPerTable: number;
  /** 식장 테이블 정보(seats_per_table)가 없어 기본값을 가정했는지. */
  seatsAssumed: boolean;
  totalHeads: number;
  seatedHeads: number;
  /** 식장 테이블 수(table_count) 한도를 넘겨 배치 못 한 인원. */
  unseatedHeads: number;
  tableCountCapped: boolean;
}

/** 한국 예식장 원형 테이블 표준 좌석 수(식장 정보 없을 때 가정값). */
export const DEFAULT_SEATS_PER_TABLE = 10;

const SIDE_ORDER: Record<GuestSide, number> = { groom: 0, shared: 1, bride: 2 };

const headsOf = (g: GuestItem): number => Math.max(1, g.attending_count || 1);

/** side+relationship → 사람이 읽는 라벨. relationship 없으면 side 만. */
const groupLabelOf = (side: GuestSide, rel: string | null): string => {
  const sideLabel = GUEST_SIDE_LABEL[side] ?? "";
  const r = rel?.trim();
  return r ? `${sideLabel} ${r}` : sideLabel || (r ?? "기타");
};

/**
 * 참석 확정(rsvp_status='attending') 하객만 관계 기반으로 테이블에 배치한 초안 반환.
 * @param opts.seatsPerTable 식장 테이블당 좌석(없으면 기본 10 가정) · opts.tableCount 테이블 수 상한(초과분은 unseated)
 */
export function computeSeatingDraft(
  guests: readonly GuestItem[],
  opts: { tableCount?: number | null; seatsPerTable?: number | null } = {},
): SeatingDraft {
  const seatsValid = !!(opts.seatsPerTable && opts.seatsPerTable > 0);
  const seatsPerTable = seatsValid ? (opts.seatsPerTable as number) : DEFAULT_SEATS_PER_TABLE;
  const maxTables = opts.tableCount && opts.tableCount > 0 ? opts.tableCount : null;

  const attending = guests.filter((g) => g.rsvp_status === "attending");
  const totalHeads = attending.reduce((s, g) => s + headsOf(g), 0);

  // 같은 그룹(side+relationship)이 인접하도록 정렬 — 정렬 경계가 자연스러운 테이블 경계가 된다.
  const ordered = [...attending].sort((a, b) => {
    const s = (SIDE_ORDER[a.side] ?? 9) - (SIDE_ORDER[b.side] ?? 9);
    if (s !== 0) return s;
    const ra = a.relationship?.trim() || "";
    const rb = b.relationship?.trim() || "";
    if (ra !== rb) return ra.localeCompare(rb, "ko");
    return (a.name || "").localeCompare(b.name || "", "ko");
  });

  const tables: SeatingTable[] = [];
  let unseatedHeads = 0;
  let tableCountCapped = false;
  let current: SeatingTable | null = null;

  const openTable = (): boolean => {
    if (maxTables != null && tables.length >= maxTables) return false;
    current = { index: tables.length + 1, label: `${tables.length + 1}번 테이블`, groupLabel: "", guests: [], heads: 0 };
    tables.push(current);
    return true;
  };

  for (const g of ordered) {
    const h = headsOf(g);
    // 현재 테이블이 없거나, 넣으면 용량 초과(단 빈 테이블엔 무조건 넣어 단일 대인원도 자리 보장)면 새 테이블.
    if (!current || (current.heads > 0 && current.heads + h > seatsPerTable)) {
      if (!openTable()) {
        // 테이블 수 상한 도달 — 남는 인원은 미배치로 집계(초안이라 강제 압축 안 함).
        unseatedHeads += h;
        tableCountCapped = true;
        continue;
      }
    }
    current!.guests.push(g);
    current!.heads += h;
  }

  // 각 테이블 대표 그룹 라벨 = 인원(heads) 최다 그룹.
  for (const t of tables) {
    const byGroup = new Map<string, number>();
    for (const g of t.guests) {
      const key = groupLabelOf(g.side, g.relationship);
      byGroup.set(key, (byGroup.get(key) ?? 0) + headsOf(g));
    }
    let best = "";
    let bestHeads = -1;
    for (const [k, v] of byGroup) if (v > bestHeads) { best = k; bestHeads = v; }
    const mixed = byGroup.size > 1 ? " 외" : "";
    t.groupLabel = best + mixed;
  }

  const seatedHeads = tables.reduce((s, t) => s + t.heads, 0);
  return {
    tables,
    seatsPerTable,
    seatsAssumed: !seatsValid,
    totalHeads,
    seatedHeads,
    unseatedHeads,
    tableCountCapped,
  };
}
